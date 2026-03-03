let catalog = [];
let currentFilter = "all";
const PRODUCT_PAGE_VERSION = "20260303-1805";
let catalogLoadFailed = false;
const selectedQtyById = {};

function parsePrice(value) {
  const digits = String(value || "").replace(/[^\d]/g, "");
  return digits ? Number(digits) : 0;
}

function parseStock(value) {
  const stock = Number(value);
  return Number.isFinite(stock) && stock > 0 ? Math.floor(stock) : 0;
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

function isDisplayableItem(item) {
  if (!item || typeof item !== "object") return false;
  const hasTitle = String(item.title_ru || "").trim() || String(item.title_en || "").trim();
  const hasPrice = parsePrice(item.price) > 0;
  return Boolean(hasTitle && hasPrice);
}

function isSafeImageSource(value) {
  const src = String(value || "").trim();
  if (!src) return false;
  return !/^javascript:/i.test(src) && !/^data:/i.test(src);
}

function getItemTitle(item, lang) {
  return (lang === "en" ? item.title_en : item.title_ru) || (lang === "en" ? item.title_ru : item.title_en) || "";
}

function getItemDesc(item, lang) {
  return (lang === "en" ? item.desc_en : item.desc_ru) || (lang === "en" ? item.desc_ru : item.desc_en) || "";
}

function getSelectedQty(item) {
  const id = String(item.id || "");
  const stock = parseStock(item.in_stock);
  if (!id || stock <= 0) return 0;

  const raw = Number(selectedQtyById[id]);
  if (!Number.isFinite(raw) || raw < 1) {
    selectedQtyById[id] = 1;
    return 1;
  }

  const clamped = Math.min(Math.floor(raw), stock);
  selectedQtyById[id] = Math.max(1, clamped);
  return selectedQtyById[id];
}

function changeSelectedQty(id, delta) {
  const item = catalog.find((entry) => String(entry.id) === String(id));
  if (!item) return;
  const stock = parseStock(item.in_stock);
  if (stock <= 0) return;

  const current = getSelectedQty(item);
  const next = Math.max(1, Math.min(stock, current + delta));
  selectedQtyById[String(id)] = next;
  renderCatalog();
}

function renderCatalog() {
  const grid = document.getElementById("catalog-grid");
  if (!grid) return;

  if (catalogLoadFailed) {
    grid.innerHTML = `<div class="card"><p>${escapeHtml(tr("catalog_load_error"))}</p></div>`;
    return;
  }

  const lang = getLang();
  const sortValue = document.getElementById("sort-select")?.value || "name-asc";

  let items = catalog.slice();

  if (currentFilter !== "all") {
    items = items.filter((item) => item.category === currentFilter);
  }

  items.sort((a, b) => {
    const nameA = getItemTitle(a, lang).toLowerCase();
    const nameB = getItemTitle(b, lang).toLowerCase();
    const priceA = parsePrice(a.price);
    const priceB = parsePrice(b.price);

    switch (sortValue) {
      case "name-desc":
        return nameB.localeCompare(nameA);
      case "price-asc":
        return priceA - priceB;
      case "price-desc":
        return priceB - priceA;
      default:
        return nameA.localeCompare(nameB);
    }
  });

  if (!items.length) {
    grid.innerHTML = `<div class="card"><p>${escapeHtml(tr("catalog_empty"))}</p></div>`;
    return;
  }

  grid.innerHTML = items
    .map((item) => {
      const title = getItemTitle(item, lang);
      const desc = getItemDesc(item, lang);
      const safeTitle = escapeHtml(title);
      const safeDesc = escapeHtml(desc);
      const safePrice = escapeHtml(item.price || "");
      const hasId = item.id !== null && item.id !== undefined && String(item.id).trim() !== "";
      const rawId = hasId ? String(item.id) : "";
      const safeId = escapeHtml(rawId);
      const encodedId = hasId ? encodeURIComponent(rawId) : "";
      const safeCategory = escapeHtml(item.category || "");
      const stock = parseStock(item.in_stock);
      const qty = getSelectedQty(item);
      const isOutOfStock = stock <= 0;

      const img = isSafeImageSource(item.image)
        ? `<img src="${escapeHtml(item.image)}" alt="${safeTitle}" />`
        : "";
      const imgClass = isSafeImageSource(item.image)
        ? "catalog-image"
        : "catalog-image catalog-image--placeholder";

      const stockText = `${escapeHtml(tr("in_stock_label"))}: ${stock}`;
      const addButtonLabel = isOutOfStock ? escapeHtml(tr("out_of_stock")) : escapeHtml(tr("add_to_cart"));
      const disabledAttr = !hasId || isOutOfStock ? "disabled" : "";

      return `
        <div class="catalog-card" data-category="${safeCategory}">
          <div class="${imgClass}">
            ${img || `<span>${safeTitle}</span>`}
          </div>
          <div class="catalog-body">
            <h3>
              <a class="catalog-title-link" href="product.html?id=${encodedId}&v=${PRODUCT_PAGE_VERSION}">${safeTitle}</a>
            </h3>
            <p>${safeDesc}</p>
            <div class="price-row">
              <strong class="price-value">${safePrice}</strong>
              <span class="stock-label">${stockText}</span>
            </div>
            <div class="catalog-actions">
              <div class="qty-picker">
                <button class="qty-btn" data-qty-dec="${safeId}" ${isOutOfStock || qty <= 1 ? "disabled" : ""}>-</button>
                <span class="qty-value">${isOutOfStock ? 0 : qty}</span>
                <button class="qty-btn" data-qty-inc="${safeId}" ${isOutOfStock || qty >= stock ? "disabled" : ""}>+</button>
              </div>
              <button class="btn btn--primary" data-add="${safeId}" ${disabledAttr}>${addButtonLabel}</button>
            </div>
          </div>
        </div>
      `;
    })
    .join("");

  grid.querySelectorAll("[data-qty-inc]").forEach((btn) => {
    btn.addEventListener("click", () => changeSelectedQty(btn.dataset.qtyInc, 1));
  });

  grid.querySelectorAll("[data-qty-dec]").forEach((btn) => {
    btn.addEventListener("click", () => changeSelectedQty(btn.dataset.qtyDec, -1));
  });

  grid.querySelectorAll("[data-add]").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (btn.disabled) return;
      const id = btn.dataset.add;
      const item = catalog.find((entry) => String(entry.id) === String(id));
      if (!item) return;
      const qty = getSelectedQty(item);
      addToCart(id, qty);
    });
  });

  if (typeof applyVersionToLinks === "function") {
    applyVersionToLinks();
  }
}

async function addToCart(id, qtyToAdd) {
  const item = catalog.find((i) => String(i.id) === String(id));
  if (!item) return;

  const stock = parseStock(item.in_stock);
  if (stock <= 0) return;

  const amount = Math.max(1, Math.floor(Number(qtyToAdd || 1)));
  const cart = await loadCartAny();
  const items = cart.items || [];
  const existing = items.find((i) => String(i.product_id) === String(id));
  const existingQty = existing ? Number(existing.qty || 0) : 0;
  const allowedToAdd = Math.max(0, stock - existingQty);
  const actualAdd = Math.min(amount, allowedToAdd);

  if (actualAdd <= 0) {
    if (typeof showCenterNotice === "function") {
      showCenterNotice(tr("out_of_stock"));
    }
    return;
  }

  if (existing) {
    existing.qty = existingQty + actualAdd;
  } else {
    const lang = getLang();
    items.push({
      product_id: item.id,
      title: getItemTitle(item, lang),
      price: item.price,
      qty: actualAdd
    });
  }

  item.in_stock = Math.max(0, stock - actualAdd);
  if (item.in_stock <= 0) {
    selectedQtyById[String(id)] = 0;
  } else {
    selectedQtyById[String(id)] = Math.min(getSelectedQty(item), parseStock(item.in_stock));
  }

  await saveCartAny(items);
  document.querySelectorAll("#cart-badge").forEach((b) => (b.textContent = cartCount(items)));
  renderCatalog();
  if (typeof showCenterNotice === "function") {
    showCenterNotice(tr("product_added"));
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  try {
    const res = await fetch(`data/services.json?v=${Date.now()}`, { cache: "no-store" });
    if (!res.ok) throw new Error("failed to load catalog");
    const data = await res.json();
    catalog = (data.services || []).filter(isDisplayableItem);
  } catch {
    catalog = [];
    catalogLoadFailed = true;
  }

  const chips = document.querySelectorAll(".chip");
  chips.forEach((chip) => {
    chip.addEventListener("click", () => {
      chips.forEach((c) => c.classList.remove("is-active"));
      chip.classList.add("is-active");
      currentFilter = chip.dataset.filter;
      renderCatalog();
    });
  });

  document.getElementById("sort-select")?.addEventListener("change", renderCatalog);
  document.addEventListener("languageChanged", renderCatalog);

  renderCatalog();
});
