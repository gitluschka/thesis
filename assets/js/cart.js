function parsePrice(value) {
  const digits = String(value || "").replace(/[^\d]/g, "");
  return digits ? Number(digits) : 0;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getLang() {
  return localStorage.getItem("lang") || "ru";
}

function tr(key) {
  return window.t ? window.t(key) : key;
}

function formatPrice(num) {
  const lang = getLang() === "en" ? "en-US" : "ru-RU";
  return `${num.toLocaleString(lang)} ₽`;
}

let currentMode = "guest";
let stockByProductId = {};

function parseStock(value) {
  const stock = Number(value);
  return Number.isFinite(stock) && stock >= 0 ? Math.floor(stock) : null;
}

async function preloadStockMap() {
  try {
    const res = await fetch(`data/services.json?v=${Date.now()}`, { cache: "no-store" });
    if (!res.ok) return;
    const data = await res.json();
    const map = {};
    (data.services || []).forEach((item) => {
      map[String(item.id)] = parseStock(item.in_stock);
    });
    stockByProductId = map;
  } catch {
    stockByProductId = {};
  }
}

async function renderCart() {
  const list = document.getElementById("cart-list");
  const totalEl = document.getElementById("cart-total");
  const totalNoteEl = document.getElementById("cart-total-note");
  if (!list || !totalEl) return;

  try {
    const cart = await loadCartAny();
    currentMode = cart.mode;
    const items = cart.items || [];

    if (!items.length) {
      list.innerHTML = `<p>${escapeHtml(tr("cart_empty"))}</p>`;
      totalEl.textContent = "0 ₽";
      if (totalNoteEl) totalNoteEl.textContent = "";
      document.querySelectorAll("#cart-badge").forEach((b) => (b.textContent = "0"));
      return;
    }

    let total = 0;
    list.innerHTML = items
      .map((item, idx) => {
        const price = parsePrice(item.price);
        const qty = Math.max(0, Number(item.qty || 0));
        const title = escapeHtml(item.title || "");
        const priceLabel = escapeHtml(item.price || "");
        total += price * qty;
        return `
          <div class="cart-item">
            <div>
              <strong>${title}</strong>
              <div class="muted">${priceLabel}</div>
            </div>
            <div class="cart-qty">
              <button data-dec="${idx}">-</button>
              <span>${qty}</span>
              <button data-inc="${idx}">+</button>
            </div>
            <div>${formatPrice(price * qty)}</div>
          </div>
        `;
      })
      .join("");

    let hasFirstOrderDiscount = false;
    if (cart.mode === "server") {
      try {
        const orders = await api("api/orders.php");
        hasFirstOrderDiscount = (orders.orders || []).length === 0;
      } catch {
        hasFirstOrderDiscount = false;
      }
    }

    if (hasFirstOrderDiscount) {
      const finalTotal = Math.max(0, Math.round(total * 0.9));
      totalEl.innerHTML = `
        <span class="cart-total-old">${formatPrice(total)}</span>
        <span class="cart-total-new">${formatPrice(finalTotal)}</span>
      `;
      if (totalNoteEl) totalNoteEl.textContent = tr("cart_first_order_discount_note");
    } else {
      totalEl.textContent = formatPrice(total);
      if (totalNoteEl) totalNoteEl.textContent = "";
    }

    document.querySelectorAll("#cart-badge").forEach((b) => (b.textContent = cartCount(items)));

    list.querySelectorAll("[data-inc]").forEach((btn) =>
      btn.addEventListener("click", () => changeQty(btn.dataset.inc, 1))
    );
    list.querySelectorAll("[data-dec]").forEach((btn) =>
      btn.addEventListener("click", () => changeQty(btn.dataset.dec, -1))
    );
  } catch {
    list.innerHTML = `<p>${escapeHtml(tr("cart_login_required"))}</p>`;
    totalEl.textContent = formatPrice(0);
    if (totalNoteEl) totalNoteEl.textContent = "";
  }
}

async function changeQty(index, delta) {
  const cart = await loadCartAny();
  const items = cart.items || [];
  const item = items[index];
  if (!item) return;

  if (delta > 0) {
    const stock = stockByProductId[String(item.product_id)];
    const currentQty = Number(item.qty || 0);
    if (Number.isFinite(stock) && currentQty >= stock) {
      if (typeof showCenterNotice === "function") {
        showCenterNotice(tr("out_of_stock"));
      }
      return;
    }
  }

  item.qty += delta;
  if (item.qty <= 0) items.splice(index, 1);

  await saveCartAny(items);
  await renderCart();
}

document.addEventListener("DOMContentLoaded", async () => {
  await preloadStockMap();
  await renderCart();
  const clearBtn = document.getElementById("clear-cart-btn");
  if (clearBtn) {
    clearBtn.addEventListener("click", async () => {
      await saveCartAny([]);
      await renderCart();
    });
  }
  const checkoutBtn = document.getElementById("checkout-btn");
  if (!checkoutBtn) return;

  checkoutBtn.addEventListener("click", async () => {
    let cart;
    try {
      cart = await loadCartAny();
    } catch {
      alert(tr("cart_order_login"));
      return;
    }
    if (!(cart.items || []).length) {
      alert(tr("cart_empty"));
      return;
    }
    if (cart.mode === "guest") {
      const goLogin = confirm(tr("cart_guest_checkout_prompt"));
      if (goLogin) location.href = "account.html";
      return;
    }
    try {
      const result = await api("api/order_create.php", { method: "POST", body: JSON.stringify({}) });
      clearGuestCart();
      await renderCart();
      if (result && Number(result.discount_percent || 0) > 0) {
        alert(`${tr("cart_order_success")} ${tr("cart_discount_applied_success")}`);
      } else {
        alert(tr("cart_order_success"));
      }
    } catch (err) {
      alert(extractApiError(err, tr("cart_order_login")));
    }
  });
  document.addEventListener("languageChanged", renderCart);
});
