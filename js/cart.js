/* =========================================================
   CART MODULE (closure)
   - items, discountCode and listeners are PRIVATE: they live
     inside createCart() and can only be reached through the
     methods it returns.
   - subscribe(callback) registers callbacks run on every change.
   - withNotify(fn) is a higher-order function: it takes a
     function and returns a new one that also saves + notifies.
   - State is persisted with localStorage.
   ========================================================= */
function createCart({ storageKey = "cart", taxRate = 0, codes = {} } = {}) {
  // ---- private state ----
  let items = [];          // [{ id, title, author, price, isbn, color, qty }]
  let discountCode = null;
  const listeners = [];

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
      items = data && Array.isArray(data.items) ? data.items : [];
      discountCode = data && codes[data.discountCode] ? data.discountCode : null;
    } catch (e) {
      items = [];
      discountCode = null;
    }
  };

  const notify = () => {
    const snapshot = getState();
    listeners.forEach((cb) => cb(snapshot));
  };

  const withNotify = (fn) => (...args) => {
    const result = fn(...args);
    save();
    notify();
    return result;
  };

  // ---- calculations ----
  const getSubtotal = () => round(items.reduce((sum, i) => sum + i.price * i.qty, 0));
  const getItemCount = () => items.reduce((n, i) => n + i.qty, 0);

  const getDiscountAmount = () => {
    const code = discountCode && codes[discountCode];
    if (!code) return 0;
    const subtotal = getSubtotal();
    if (code.minSubtotal && subtotal < code.minSubtotal) return 0;
    const amount = code.type === "percent" ? subtotal * (code.value / 100) : code.value;
    return round(Math.min(amount, subtotal));
  };

  const getTax = () => round((getSubtotal() - getDiscountAmount()) * taxRate);
  const getTotal = () => round(getSubtotal() - getDiscountAmount() + getTax());

  // Read-only snapshot: outside code gets copies, never the private array
  const getState = () => ({
    items: items.map((i) => ({ ...i })),
    itemCount: getItemCount(),
    subtotal: getSubtotal(),
    discountCode,
    discountLabel: discountCode ? codes[discountCode].label : null,
    discountPending: !!discountCode && getDiscountAmount() === 0 && getSubtotal() > 0,
    discount: getDiscountAmount(),
    tax: getTax(),
    taxRate,
    total: getTotal(),
  });

  const getQty = (id) => items.find((i) => i.id === id)?.qty ?? 0;

  // ---- public mutators ----
  const addItem = withNotify((product, qty = 1) => {
    const existing = items.find((i) => i.id === product.id);
    if (existing) {
      existing.qty = Math.min(existing.qty + qty, 99);
    } else {
      const { id, title, author, price, isbn, color } = product;
      items.push({ id, title, author, price, isbn, color, qty });
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

  const applyDiscount = (rawCode) => {
    const code = String(rawCode || "").trim().toUpperCase();
    const info = codes[code];
    if (!info) return { ok: false, message: "Invalid discount code." };
    if (info.minSubtotal && getSubtotal() < info.minSubtotal) {
      return { ok: false, message: `${code} needs a subtotal of at least ₹${info.minSubtotal}.` };
    }
    discountCode = code;
    save();
    notify();
    return { ok: true, message: `Code ${code} applied — ${info.label}!` };
  };

  // Register a callback; returns an unsubscribe function (another closure)
  const subscribe = (callback) => {
    listeners.push(callback);
    callback(getState());
    return () => {
      const idx = listeners.indexOf(callback);
      if (idx > -1) listeners.splice(idx, 1);
    };
  };

  // Keep other open tabs in sync
  window.addEventListener("storage", (e) => {
    if (e.key === storageKey) {
      load();
      notify();
    }
  });

  load();

  return { addItem, removeItem, updateQuantity, clear, applyDiscount, removeDiscount, getState, getQty, subscribe };
}

// One shared cart instance for every page
const cart = createCart({ storageKey: "chapters-cart", taxRate: TAX_RATE, codes: DISCOUNT_CODES });
