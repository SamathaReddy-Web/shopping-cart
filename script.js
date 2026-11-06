/* =========================================================
   Shopping Cart System
   Concepts shown:
   - Closures: createCart() keeps items / discount / listeners PRIVATE
   - Callbacks: subscribe(callback) notifies the UI on every change
   - Higher-order functions: map / filter / reduce / find, and
     withNotify() which takes a function and returns a new one
   - localStorage: cart persists across sessions
   - Event delegation: one listener per container, not per button
   - Template literals: all HTML is generated with them
   ========================================================= */

// ---------- Product catalogue ----------
const PRODUCTS = [
  { id: 1, name: "Wireless Headphones", price: 59.99, category: "Electronics", emoji: "🎧" },
  { id: 2, name: "Smart Watch",         price: 129.0, category: "Electronics", emoji: "⌚" },
  { id: 3, name: "Bluetooth Speaker",   price: 39.5,  category: "Electronics", emoji: "🔊" },
  { id: 4, name: "Running Shoes",       price: 74.99, category: "Fashion",     emoji: "👟" },
  { id: 5, name: "Denim Jacket",        price: 49.0,  category: "Fashion",     emoji: "🧥" },
  { id: 6, name: "Sunglasses",          price: 19.99, category: "Fashion",     emoji: "🕶️" },
  { id: 7, name: "Coffee Mug",          price: 9.99,  category: "Home",        emoji: "☕" },
  { id: 8, name: "Desk Plant",          price: 14.5,  category: "Home",        emoji: "🪴" },
  { id: 9, name: "Scented Candle",      price: 12.0,  category: "Home",        emoji: "🕯️" },
  { id: 10, name: "Notebook Set",       price: 8.75,  category: "Stationery",  emoji: "📓" },
  { id: 11, name: "Fountain Pen",       price: 24.0,  category: "Stationery",  emoji: "🖋️" },
  { id: 12, name: "Backpack",           price: 44.99, category: "Fashion",     emoji: "🎒" },
];

// ---------- Discount codes ----------
// type "percent" -> value is a %, type "flat" -> value is a currency amount
const DISCOUNT_CODES = {
  SAVE10:  { type: "percent", value: 10, label: "10% off" },
  SAVE20:  { type: "percent", value: 20, label: "20% off", minSubtotal: 100 },
  FLAT5:   { type: "flat",    value: 5,  label: "$5 off" },
  WELCOME: { type: "percent", value: 15, label: "15% off" },
};

const TAX_RATE = 0.08; // 8%

/* =========================================================
   CART FACTORY (closure)
   Everything declared inside createCart is private. The only
   way to read or change it is through the returned methods.
   ========================================================= */
function createCart({ storageKey = "shopcart", taxRate = 0.08, codes = {} } = {}) {
  // ---- private state ----
  let items = [];          // [{ id, name, price, emoji, qty }]
  let discountCode = null; // e.g. "SAVE10"
  const listeners = [];    // callbacks to run when the cart changes

  // ---- private helpers ----
  const round = (n) => Math.round(n * 100) / 100;

  const save = () => {
    try {
      localStorage.setItem(storageKey, JSON.stringify({ items, discountCode }));
    } catch (e) {
      console.warn("Could not save cart:", e);
    }
  };

  const load = () => {
    try {
      const data = JSON.parse(localStorage.getItem(storageKey));
      if (data && Array.isArray(data.items)) {
        items = data.items;
        discountCode = data.discountCode && codes[data.discountCode] ? data.discountCode : null;
      }
    } catch (e) {
      console.warn("Could not load cart:", e);
    }
  };

  const notify = () => {
    const snapshot = getState();
    listeners.forEach((cb) => cb(snapshot));
  };

  // Higher-order function: takes a mutating function and returns a new
  // function that also saves to localStorage and notifies listeners.
  const withNotify = (fn) => (...args) => {
    const result = fn(...args);
    save();
    notify();
    return result;
  };

  // ---- calculations (use reduce / find) ----
  const getSubtotal = () => round(items.reduce((sum, item) => sum + item.price * item.qty, 0));

  const getItemCount = () => items.reduce((count, item) => count + item.qty, 0);

  const getDiscountAmount = () => {
    const code = discountCode && codes[discountCode];
    if (!code) return 0;
    const subtotal = getSubtotal();
    if (code.minSubtotal && subtotal < code.minSubtotal) return 0;
    const amount = code.type === "percent" ? subtotal * (code.value / 100) : code.value;
    return round(Math.min(amount, subtotal)); // never go below 0
  };

  const getTax = () => round((getSubtotal() - getDiscountAmount()) * taxRate);

  const getTotal = () => round(getSubtotal() - getDiscountAmount() + getTax());

  // A read-only copy so outside code can't mutate private state
  const getState = () => ({
    items: items.map((item) => ({ ...item })),
    itemCount: getItemCount(),
    subtotal: getSubtotal(),
    discountCode,
    discountLabel: discountCode ? codes[discountCode].label : null,
    discount: getDiscountAmount(),
    tax: getTax(),
    taxRate,
    total: getTotal(),
  });

  // ---- public mutators (wrapped with the HOF) ----
  const addItem = withNotify((product, qty = 1) => {
    const existing = items.find((i) => i.id === product.id);
    if (existing) {
      existing.qty += qty;
    } else {
      const { id, name, price, emoji } = product;
      items.push({ id, name, price, emoji, qty });
    }
  });

  const removeItem = withNotify((id) => {
    items = items.filter((i) => i.id !== id);
  });

  const updateQuantity = withNotify((id, qty) => {
    qty = Math.floor(Number(qty));
    if (!Number.isFinite(qty) || qty <= 0) {
      items = items.filter((i) => i.id !== id);
      return;
    }
    const item = items.find((i) => i.id === id);
    if (item) item.qty = Math.min(qty, 99);
  });

  const clear = withNotify(() => {
    items = [];
    discountCode = null;
  });

  const removeDiscount = withNotify(() => {
    discountCode = null;
  });

  // Not wrapped directly because it returns a validation result first
  const applyDiscount = (rawCode) => {
    const code = String(rawCode || "").trim().toUpperCase();
    const info = codes[code];
    if (!info) return { ok: false, message: "Invalid discount code." };
    if (info.minSubtotal && getSubtotal() < info.minSubtotal) {
      return { ok: false, message: `${code} needs a subtotal of at least $${info.minSubtotal}.` };
    }
    discountCode = code;
    save();
    notify();
    return { ok: true, message: `Code ${code} applied — ${info.label}!` };
  };

  // Callback registration. Returns an "unsubscribe" function (another closure).
  const subscribe = (callback) => {
    listeners.push(callback);
    callback(getState()); // run once immediately with current state
    return () => {
      const idx = listeners.indexOf(callback);
      if (idx > -1) listeners.splice(idx, 1);
    };
  };

  load();

  // Only these are exposed — items, discountCode, listeners stay private
  return {
    addItem,
    removeItem,
    updateQuantity,
    clear,
    applyDiscount,
    removeDiscount,
    getState,
    subscribe,
  };
}

/* =========================================================
   UI
   ========================================================= */
const cart = createCart({ storageKey: "shopcart-v1", taxRate: TAX_RATE, codes: DISCOUNT_CODES });

// DOM references
const $ = (sel) => document.querySelector(sel);
const productGrid = $("#productGrid");
const categoryFilter = $("#categoryFilter");
const cartItemsEl = $("#cartItems");
const cartSummaryEl = $("#cartSummary");
const cartCountEl = $("#cartCount");
const discountForm = $("#discountForm");
const discountInput = $("#discountInput");
const discountMsg = $("#discountMsg");
const checkoutBtn = $("#checkoutBtn");
const clearBtn = $("#clearCart");
const cartPanel = $("#cartPanel");
const cartToggle = $("#cartToggle");
const toastEl = $("#toast");

const money = (n) => `$${n.toFixed(2)}`;

// Toast uses a closure to remember its timer between calls
const toast = (() => {
  let timer;
  return (message) => {
    toastEl.textContent = message;
    toastEl.classList.add("show");
    clearTimeout(timer);
    timer = setTimeout(() => toastEl.classList.remove("show"), 1800);
  };
})();

// ---------- Products ----------
const categories = [...new Set(PRODUCTS.map((p) => p.category))];
categoryFilter.innerHTML += categories
  .map((c) => `<option value="${c}">${c}</option>`)
  .join("");

const productCard = (p) => `
  <article class="product-card">
    <div class="product-emoji">${p.emoji}</div>
    <div class="product-body">
      <span class="product-category">${p.category}</span>
      <h3>${p.name}</h3>
      <span class="product-price">${money(p.price)}</span>
      <button class="add-btn" data-action="add" data-id="${p.id}">Add to cart</button>
    </div>
  </article>`;

function renderProducts(category = "all") {
  const list = category === "all" ? PRODUCTS : PRODUCTS.filter((p) => p.category === category);
  productGrid.innerHTML = list.map(productCard).join("");
}

// ---------- Cart ----------
const cartItemRow = (item) => `
  <li class="cart-item" data-id="${item.id}">
    <span class="cart-item-emoji">${item.emoji}</span>
    <div>
      <div class="cart-item-name">${item.name}</div>
      <div class="cart-item-price">${money(item.price)} each</div>
      <div class="qty">
        <button data-action="decrease" aria-label="Decrease quantity">−</button>
        <input type="number" min="1" max="99" value="${item.qty}" data-action="set-qty" aria-label="Quantity" />
        <button data-action="increase" aria-label="Increase quantity">+</button>
      </div>
    </div>
    <div class="cart-item-right">
      <div class="line-total">${money(item.price * item.qty)}</div>
      <button class="remove-btn" data-action="remove">Remove</button>
    </div>
  </li>`;

const summaryView = (s) => `
  <div class="summary-row"><span>Subtotal (${s.itemCount} item${s.itemCount === 1 ? "" : "s"})</span><span>${money(s.subtotal)}</span></div>
  ${
    s.discountCode
      ? `<div class="summary-row discount-row">
           <span>Discount (${s.discountCode})<button class="remove-code" data-action="remove-code">✕</button></span>
           <span>−${money(s.discount)}</span>
         </div>`
      : ""
  }
  <div class="summary-row"><span>Tax (${(s.taxRate * 100).toFixed(0)}%)</span><span>${money(s.tax)}</span></div>
  <div class="summary-row total"><span>Total</span><span>${money(s.total)}</span></div>`;

// This callback is called by the cart every time its state changes
function renderCart(state) {
  cartItemsEl.innerHTML = state.items.length
    ? state.items.map(cartItemRow).join("")
    : `<li class="empty">Your cart is empty 🛒</li>`;

  cartSummaryEl.innerHTML = summaryView(state);
  cartCountEl.textContent = state.itemCount;
  checkoutBtn.disabled = state.items.length === 0;
}

/* =========================================================
   EVENTS (delegation: one listener per container)
   ========================================================= */

// Products: a single listener handles every "Add to cart" button
productGrid.addEventListener("click", (e) => {
  const btn = e.target.closest('[data-action="add"]');
  if (!btn) return;
  const product = PRODUCTS.find((p) => p.id === Number(btn.dataset.id));
  cart.addItem(product);
  toast(`${product.emoji} ${product.name} added`);
});

categoryFilter.addEventListener("change", (e) => renderProducts(e.target.value));

// Cart items: a single listener handles +, −, remove for every row
const getItemQty = (id) => cart.getState().items.find((i) => i.id === id)?.qty ?? 0;

const cartActions = {
  increase: (id) => cart.updateQuantity(id, getItemQty(id) + 1),
  decrease: (id) => cart.updateQuantity(id, getItemQty(id) - 1),
  remove: (id) => cart.removeItem(id),
};

cartItemsEl.addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-action]");
  if (!btn) return;
  const id = Number(btn.closest(".cart-item").dataset.id);
  cartActions[btn.dataset.action]?.(id);
});

// Typed quantity changes (delegated "change" event)
cartItemsEl.addEventListener("change", (e) => {
  if (e.target.dataset.action !== "set-qty") return;
  const id = Number(e.target.closest(".cart-item").dataset.id);
  cart.updateQuantity(id, e.target.value);
});

// Summary: remove applied discount code
cartSummaryEl.addEventListener("click", (e) => {
  if (e.target.closest('[data-action="remove-code"]')) {
    cart.removeDiscount();
    discountMsg.textContent = "";
  }
});

discountForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const result = cart.applyDiscount(discountInput.value);
  discountMsg.textContent = result.message;
  discountMsg.className = `discount-msg ${result.ok ? "ok" : "err"}`;
  if (result.ok) discountInput.value = "";
});

clearBtn.addEventListener("click", () => {
  if (cart.getState().items.length && confirm("Remove all items from the cart?")) {
    cart.clear();
    discountMsg.textContent = "";
  }
});

checkoutBtn.addEventListener("click", () => {
  const { total, itemCount } = cart.getState();
  alert(`Thank you for your order!\n\n${itemCount} item(s) — Total paid: ${money(total)}`);
  cart.clear();
  discountMsg.textContent = "";
  cartPanel.classList.remove("open");
});

// Mobile: slide-in cart
cartToggle.addEventListener("click", () => cartPanel.classList.toggle("open"));

// Keep multiple open tabs in sync via the storage event
window.addEventListener("storage", (e) => {
  if (e.key === "shopcart-v1") location.reload();
});

// ---------- Init ----------
renderProducts();
cart.subscribe(renderCart); // register the render callback
