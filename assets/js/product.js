let catalog = [];
let currentItem = null;
let loadFailed = false;
let selectedQty = 1;

function getLang() {
  return localStorage.getItem("lang") || "ru";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function isSafeImageSource(value) {
  const src = String(value || "").trim();
  if (!src) return false;
  return !/^javascript:/i.test(src) && !/^data:/i.test(src);
}

function isDisplayableItem(item) {
  if (!item || typeof item !== "object") return false;
  const hasTitle = String(item.title_ru || "").trim() || String(item.title_en || "").trim();
  const hasPrice = parsePriceNumber(item.price) > 0;
  return Boolean(hasTitle && hasPrice);
}

function normalizeExtraImages(value) {
  if (Array.isArray(value)) {
    return value.map((v) => String(v || "").trim()).filter(Boolean);
  }
  if (typeof value === "string") {
    return value
      .split(/\r?\n|,/)
      .map((v) => v.trim())
      .filter(Boolean);
  }
  return [];
}

function getItemTexts(item, lang) {
  const titlePrimary = lang === "en" ? item.title_en : item.title_ru;
  const titleFallback = lang === "en" ? item.title_ru : item.title_en;
  const descPrimary = lang === "en" ? item.desc_en : item.desc_ru;
  const descFallback = lang === "en" ? item.desc_ru : item.desc_en;
  const fullPrimary = lang === "en" ? item.full_desc_en : item.full_desc_ru;
  const fullFallback = lang === "en" ? item.full_desc_ru : item.full_desc_en;
  const specsPrimary = lang === "en" ? item.specs_en : item.specs_ru;
  const specsFallback = lang === "en" ? item.specs_ru : item.specs_en;

  return {
    title: titlePrimary || titleFallback || "",
    desc: descPrimary || descFallback || "",
    fullDesc: fullPrimary || fullFallback || descPrimary || descFallback || "",
    specs: specsPrimary || specsFallback || ""
  };
}

function parsePrice(value) {
  const digits = String(value || "").replace(/[^\d]/g, "");
  return digits ? Number(digits).toLocaleString("ru-RU") : value || "";
}

function parsePriceNumber(value) {
  const digits = String(value || "").replace(/[^\d]/g, "");
  return digits ? Number(digits) : 0;
}

function parseStock(value) {
  const stock = Number(value);
  return Number.isFinite(stock) && stock > 0 ? Math.floor(stock) : 0;
}

function tr(key) {
  return window.t ? window.t(key) : key;
}

async function addCurrentToCart() {
  if (!currentItem) return;
  const stock = parseStock(currentItem.in_stock);
  if (stock <= 0) return;

  const qtyToAdd = Math.max(1, Math.floor(Number(selectedQty || 1)));
  const id = currentItem.id;
  const cart = await loadCartAny();
  const items = cart.items || [];
  const existing = items.find((i) => String(i.product_id) === String(id));
  const existingQty = existing ? Number(existing.qty || 0) : 0;
  const allowedToAdd = Math.max(0, stock - existingQty);
  const actualAdd = Math.min(qtyToAdd, allowedToAdd);
  if (actualAdd <= 0) {
    if (typeof showCenterNotice === "function") {
      showCenterNotice(tr("out_of_stock"));
    }
    return;
  }

  const lang = getLang();
  if (existing) {
    existing.qty = existingQty + actualAdd;
  } else {
    items.push({
      product_id: currentItem.id,
      title: textTitleByLang(currentItem, lang),
      price: currentItem.price,
      qty: actualAdd
    });
  }

  currentItem.in_stock = Math.max(0, stock - actualAdd);
  selectedQty = currentItem.in_stock > 0 ? Math.min(selectedQty, parseStock(currentItem.in_stock)) : 0;

  await saveCartAny(items);
  document.querySelectorAll("#cart-badge").forEach((b) => (b.textContent = cartCount(items)));
  renderProduct();
  if (typeof showCenterNotice === "function") {
    showCenterNotice(tr("product_added"));
  }
}

function textTitleByLang(item, lang) {
  return (lang === "en" ? item.title_en : item.title_ru) || (lang === "en" ? item.title_ru : item.title_en) || "";
}

function changeProductQty(delta) {
  if (!currentItem) return;
  const stock = parseStock(currentItem.in_stock);
  if (stock <= 0) return;
  selectedQty = Math.max(1, Math.min(stock, selectedQty + delta));
  renderProduct();
}

function renderProduct() {
  const root = document.getElementById("product-page");
  if (!root) return;

  if (loadFailed) {
    root.innerHTML = `<div class="card"><h1>${escapeHtml(tr("product_load_error"))}</h1></div>`;
    return;
  }

  if (!currentItem) {
    root.innerHTML = `<div class="card"><h1>${escapeHtml(tr("product_not_found"))}</h1></div>`;
    return;
  }

  const lang = getLang();
  const text = getItemTexts(currentItem, lang);
  const stock = parseStock(currentItem.in_stock);
  const isOutOfStock = stock <= 0;
  selectedQty = isOutOfStock ? 0 : Math.max(1, Math.min(stock, selectedQty || 1));

  const images = [];
  if (isSafeImageSource(currentItem.image)) images.push(String(currentItem.image).trim());
  images.push(...normalizeExtraImages(currentItem.extra_images));

  const uniqueImages = [...new Set(images.filter(isSafeImageSource))];
  const safeTitle = escapeHtml(text.title || "");
  const safeDesc = escapeHtml(text.desc || "");
  const safeFullDesc = escapeHtml(text.fullDesc || "");
  const safeSpecs = escapeHtml(text.specs || "");
  const gallery = uniqueImages.length
    ? uniqueImages
        .map((src) => `<img src="${escapeHtml(src)}" alt="${safeTitle}" class="product-gallery__img">`)
        .join("")
    : `<div class="product-gallery__placeholder">${escapeHtml(tr("product_no_image"))}</div>`;

  const specsBlock = safeSpecs
    ? `<pre class="product-specs__text">${safeSpecs}</pre>`
    : `<p class="status">${escapeHtml(tr("product_no_specs"))}</p>`;

  root.innerHTML = `
    <div class="section__head">
      <h1>${safeTitle}</h1>
      <p>${safeDesc}</p>
    </div>

    <div class="product-layout">
      <div class="card">
        <div class="product-gallery">${gallery}</div>
      </div>

      <div class="card product-main">
        <div class="price-row">
          <strong class="price-value">${parsePrice(currentItem.price)}${lang === "en" ? " RUB" : " ₽"}</strong>
          <span class="stock-label">${escapeHtml(tr("in_stock_label"))}: ${stock}</span>
        </div>
        <div class="product-main__actions">
          <div class="qty-picker">
            <button id="product-qty-dec" class="qty-btn" ${isOutOfStock || selectedQty <= 1 ? "disabled" : ""}>-</button>
            <span class="qty-value">${isOutOfStock ? 0 : selectedQty}</span>
            <button id="product-qty-inc" class="qty-btn" ${isOutOfStock || selectedQty >= stock ? "disabled" : ""}>+</button>
          </div>
          <button id="product-add-to-cart" class="btn btn--primary" ${isOutOfStock ? "disabled" : ""}>${escapeHtml(
            isOutOfStock ? tr("out_of_stock") : tr("add_to_cart")
          )}</button>
        </div>
        <h3>${escapeHtml(tr("product_full_desc"))}</h3>
        <p>${safeFullDesc}</p>
      </div>
    </div>

    <div class="card product-specs">
      <h3>${escapeHtml(tr("product_specs"))}</h3>
      ${specsBlock}
    </div>
  `;

  const addBtn = document.getElementById("product-add-to-cart");
  const decBtn = document.getElementById("product-qty-dec");
  const incBtn = document.getElementById("product-qty-inc");
  if (decBtn) {
    decBtn.addEventListener("click", () => changeProductQty(-1));
  }
  if (incBtn) {
    incBtn.addEventListener("click", () => changeProductQty(1));
  }
  if (addBtn) {
    addBtn.addEventListener("click", addCurrentToCart);
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  const params = new URLSearchParams(window.location.search);
  const rawId = params.get("id");
  const id = Number(rawId);
  if (!Number.isFinite(id)) {
    currentItem = null;
    renderProduct();
    return;
  }

  try {
    const res = await fetch(`data/services.json?v=${Date.now()}`, { cache: "no-store" });
    if (!res.ok) throw new Error("failed to load product");
    const data = await res.json();
    catalog = (data.services || []).filter(isDisplayableItem);
    currentItem = catalog.find((item) => Number(item.id) === id) || null;
  } catch {
    loadFailed = true;
  }

  renderProduct();
  document.addEventListener("languageChanged", renderProduct);
});
