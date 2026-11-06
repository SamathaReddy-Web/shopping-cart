/* Shared UI helpers: header/nav, user session, toast, book cards */

// ---------- Formatting ----------
const money = (n) => `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

const escapeHTML = (str) =>
  String(str).replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));

// ---------- Accounts + session (closure keeps storage keys private) ----------
// Accounts live in this browser's localStorage. Passwords are never stored
// as plain text: they are salted and hashed (SHA-256) before saving.
// NOTE: this is a front-end demo — real apps must do auth on a server.
const auth = (() => {
  const ACCOUNTS_KEY = "chapters-accounts";
  const SESSION_KEY = "chapters-user";

  const read = (key, fallback) => {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
  };
  const getAccounts = () => read(ACCOUNTS_KEY, []);
  const saveAccounts = (list) => localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(list));
  const normEmail = (email) => String(email).trim().toLowerCase();

  const toHex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");

  const hashPassword = async (password, salt) => {
    const data = new TextEncoder().encode(`${salt}:${password}`);
    if (window.crypto?.subtle) return toHex(await crypto.subtle.digest("SHA-256", data));
    // Fallback for browsers without SubtleCrypto (simple non-cryptographic hash)
    let h = 5381;
    data.forEach((b) => (h = ((h << 5) + h + b) >>> 0));
    return `fallback-${h.toString(16)}`;
  };

  const makeSalt = () =>
    window.crypto?.getRandomValues
      ? toHex(crypto.getRandomValues(new Uint8Array(16)))
      : Math.random().toString(36).slice(2);

  const startSession = ({ name, email, joined }) =>
    localStorage.setItem(SESSION_KEY, JSON.stringify({ name, email, joined }));

  return {
    current: () => read(SESSION_KEY, null),

    async signup({ name, email, password }) {
      email = normEmail(email);
      const accounts = getAccounts();
      if (accounts.some((a) => a.email === email)) {
        return { ok: false, message: "An account with this email already exists. Please log in." };
      }
      const salt = makeSalt();
      const account = { name: name.trim(), email, salt, passwordHash: await hashPassword(password, salt), joined: new Date().toISOString() };
      saveAccounts([...accounts, account]);
      startSession(account);
      return { ok: true };
    },

    async login({ email, password }) {
      email = normEmail(email);
      const account = getAccounts().find((a) => a.email === email);
      if (!account) return { ok: false, message: "No account found with this email. Please sign up first." };
      if ((await hashPassword(password, account.salt)) !== account.passwordHash) {
        return { ok: false, message: "Incorrect password. Please try again." };
      }
      startSession(account);
      return { ok: true };
    },

    logout: () => localStorage.removeItem(SESSION_KEY),
  };
})();

// Backwards-compatible alias used by the pages
const session = { get: auth.current, logout: auth.logout };

// Only allow redirects back to our own pages after login/sign up
const safeNextPage = () => {
  const next = new URLSearchParams(location.search).get("next");
  return ["cart.html", "profile.html", "catalog.html"].includes(next) ? next : "index.html";
};

// ---------- Orders (saved on checkout, shown on Profile) ----------
const orders = (() => {
  const KEY = "chapters-orders";
  const all = () => {
    try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch { return []; }
  };
  return {
    forUser: (email) => all().filter((o) => o.email === email),
    add(order) {
      localStorage.setItem(KEY, JSON.stringify([order, ...all()]));
    },
  };
})();

// ---------- Toast (closure remembers its timer) ----------
const toast = (() => {
  let timer;
  let el;
  return (message) => {
    if (!el) {
      el = document.createElement("div");
      el.className = "toast";
      el.setAttribute("role", "status");
      document.body.appendChild(el);
    }
    el.textContent = message;
    el.classList.add("show");
    clearTimeout(timer);
    timer = setTimeout(() => el.classList.remove("show"), 1800);
  };
})();

// ---------- Book cover + card templates ----------
const coverHTML = (book, size = "") => `
  <div class="cover ${size}" style="--cover:${book.color}">
    <span class="cover-fallback">${book.title}<small>${book.author}</small></span>
    <img src="https://covers.openlibrary.org/b/isbn/${book.isbn}-L.jpg?default=false"
         alt="${book.title} cover" loading="lazy" onerror="this.remove()" />
  </div>`;

const bookCard = (book) => `
  <article class="book-card">
    ${coverHTML(book)}
    <h3 class="book-title">${book.title}</h3>
    <p class="book-author">${book.author}</p>
    <p class="book-category">${book.category}</p>
    <div class="book-footer">
      <span class="book-price">${money(book.price)}</span>
      <button class="btn btn-dark btn-sm" data-action="add-to-cart" data-id="${book.id}">Add to Cart</button>
    </div>
  </article>`;

// ---------- Header / navigation ----------
function renderHeader() {
  const page = document.body.dataset.page;
  const user = session.get();
  const link = (href, label, key) =>
    `<a href="${href}" class="${page === key ? "active" : ""}">${label}</a>`;

  document.getElementById("siteHeader").innerHTML = `
    <div class="header-inner">
      <a class="brand" href="index.html">📚 Chapters and co.</a>
      <button class="menu-toggle" id="menuToggle" aria-label="Toggle menu">☰</button>
      <nav class="nav" id="mainNav">
        ${link("index.html", "Home", "home")}
        ${link("catalog.html", "Books", "books")}
        ${link("profile.html", "Profile", "profile")}
        <a href="cart.html" class="${page === "cart" ? "active" : ""}">Cart <span class="badge" id="cartBadge">0</span></a>
        ${user
          ? `<a href="#" data-action="logout">Logout</a>`
          : `${link("login.html", "Login", "login")}${link("signup.html", "Sign Up", "signup")}`}
      </nav>
    </div>`;
}

// ---------- Global event delegation ----------
// One document-level listener handles every "Add to Cart" button on
// any page, plus the logout link and mobile menu toggle.
document.addEventListener("click", (e) => {
  const addBtn = e.target.closest('[data-action="add-to-cart"]');
  if (addBtn) {
    const book = BOOKS.find((b) => b.id === Number(addBtn.dataset.id));
    cart.addItem(book);
    toast(`“${book.title}” added to cart`);
    addBtn.textContent = "Added ✓";
    addBtn.classList.add("added");
    setTimeout(() => {
      addBtn.textContent = "Add to Cart";
      addBtn.classList.remove("added");
    }, 1000);
    return;
  }

  if (e.target.closest('[data-action="logout"]')) {
    e.preventDefault();
    session.logout();
    window.location.href = "login.html";
    return;
  }

  if (e.target.closest("#menuToggle")) {
    document.getElementById("mainNav").classList.toggle("open");
  }
});

// ---------- Init (runs on every page) ----------
renderHeader();
cart.subscribe((state) => {
  const badge = document.getElementById("cartBadge");
  if (badge) badge.textContent = state.itemCount;
});
