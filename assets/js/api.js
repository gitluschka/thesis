async function api(url, options = {}) {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    credentials: "include",
    ...options
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "API error");
  }
  return res.json();
}

function extractApiError(err, fallback = "API error") {
  try {
    const payload = JSON.parse(err?.message || "");
    if (payload && typeof payload.error === "string" && payload.error.trim()) {
      return payload.error;
    }
  } catch {}
  return fallback;
}

async function getMe() {
  try {
    return await api("api/me.php");
  } catch {
    return null;
  }
}

const GUEST_CART_KEY = "guest_cart_items";

function readGuestCart() {
  try {
    const raw = localStorage.getItem(GUEST_CART_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeGuestCart(items) {
  localStorage.setItem(GUEST_CART_KEY, JSON.stringify(items || []));
}

function clearGuestCart() {
  localStorage.removeItem(GUEST_CART_KEY);
}

function cartCount(items) {
  return (items || []).reduce((sum, i) => sum + Number(i.qty || 0), 0);
}

async function loadCartAny() {
  try {
    const cart = await api("api/cart_get.php");
    return { mode: "server", items: cart.items || [] };
  } catch {
    return { mode: "guest", items: readGuestCart() };
  }
}

async function saveCartAny(items) {
  try {
    await api("api/cart_set.php", { method: "POST", body: JSON.stringify({ items }) });
    return { mode: "server" };
  } catch {
    writeGuestCart(items || []);
    return { mode: "guest" };
  }
}

async function migrateGuestCartToServer() {
  const guest = readGuestCart();
  if (!guest.length) return;

  const server = await api("api/cart_get.php");
  const current = server.items || [];
  const merged = [...current];

  for (const g of guest) {
    const ex = merged.find((i) => String(i.product_id) === String(g.product_id));
    if (ex) {
      ex.qty = Number(ex.qty || 0) + Number(g.qty || 0);
    } else {
      merged.push(g);
    }
  }

  await api("api/cart_set.php", { method: "POST", body: JSON.stringify({ items: merged }) });
  clearGuestCart();
}

window.readGuestCart = readGuestCart;
window.writeGuestCart = writeGuestCart;
window.clearGuestCart = clearGuestCart;
window.cartCount = cartCount;
window.loadCartAny = loadCartAny;
window.saveCartAny = saveCartAny;
window.extractApiError = extractApiError;
window.migrateGuestCartToServer = migrateGuestCartToServer;

function showCenterNotice(text) {
  const old = document.getElementById("center-notice");
  if (old) old.remove();

  const notice = document.createElement("div");
  notice.id = "center-notice";
  notice.className = "center-notice";
  notice.textContent = text;
  document.body.appendChild(notice);

  setTimeout(() => {
    notice.remove();
  }, 2000);
}

window.showCenterNotice = showCenterNotice;
