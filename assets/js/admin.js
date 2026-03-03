const listEl = document.getElementById("admin-list");
const statusEl = document.getElementById("save-status");
const addBtn = document.getElementById("add-service");
const saveBtn = document.getElementById("save-services");
const ordersList = document.getElementById("orders-list");

let catalog = [];

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function setStatus(text) {
  if (statusEl) statusEl.textContent = text;
}

function createItem(service = {}) {
  const extraImagesValue = Array.isArray(service.extra_images)
    ? service.extra_images.join("\n")
    : String(service.extra_images || "");
  const category = ["wash", "exterior", "interior", "polish", "accessories"].includes(service.category)
    ? service.category
    : "wash";

  const item = document.createElement("div");
  item.className = "admin-item";
  item.innerHTML = `
    <div class="admin-row">
      <input name="title_ru" placeholder="Название (RU)" value="${escapeHtml(service.title_ru || "")}">
      <input name="title_en" placeholder="Title (EN)" value="${escapeHtml(service.title_en || "")}">
      <select name="category">
        <option value="wash" ${category === "wash" ? "selected" : ""}>Мойка</option>
        <option value="exterior" ${category === "exterior" ? "selected" : ""}>Экстерьер</option>
        <option value="interior" ${category === "interior" ? "selected" : ""}>Интерьер</option>
        <option value="polish" ${category === "polish" ? "selected" : ""}>Полировка</option>
        <option value="accessories" ${category === "accessories" ? "selected" : ""}>Аксессуары</option>
      </select>
      <input name="price" placeholder="Цена" value="${escapeHtml(service.price || "")}">
      <input name="in_stock" type="number" min="0" step="1" placeholder="В наличии" value="${escapeHtml(service.in_stock ?? 0)}">
    </div>
    <div class="admin-row">
      <textarea name="desc_ru" rows="2" placeholder="Описание (RU)">${escapeHtml(service.desc_ru || "")}</textarea>
      <textarea name="desc_en" rows="2" placeholder="Description (EN)">${escapeHtml(service.desc_en || "")}</textarea>
    </div>
    <div class="admin-row">
      <textarea name="full_desc_ru" rows="3" placeholder="Полное описание (RU)">${escapeHtml(service.full_desc_ru || "")}</textarea>
      <textarea name="full_desc_en" rows="3" placeholder="Full description (EN)">${escapeHtml(service.full_desc_en || "")}</textarea>
    </div>
    <div class="admin-row">
      <textarea name="specs_ru" rows="3" placeholder="Характеристики (RU), каждая с новой строки">${escapeHtml(service.specs_ru || "")}</textarea>
      <textarea name="specs_en" rows="3" placeholder="Specifications (EN), one per line">${escapeHtml(service.specs_en || "")}</textarea>
    </div>
    <div class="admin-row">
      <input name="image" placeholder="URL фото" value="${escapeHtml(service.image || "")}">
      <textarea name="extra_images" rows="3" placeholder="Дополнительные фото: URL с новой строки">${escapeHtml(extraImagesValue)}</textarea>
      <button class="btn btn--outline" data-remove>Удалить</button>
    </div>
  `;

  item.querySelector("[data-remove]")?.addEventListener("click", () => {
    item.remove();
  });

  return item;
}

function collectServices() {
  if (!listEl) return [];
  const items = listEl.querySelectorAll(".admin-item");
  return Array.from(items).map((item, idx) => {
    const get = (name) => item.querySelector(`[name="${name}"]`);
    const extraImagesRaw = get("extra_images")?.value || "";
    return {
      id: idx + 1,
      title_ru: (get("title_ru")?.value || "").trim(),
      title_en: (get("title_en")?.value || "").trim(),
      desc_ru: (get("desc_ru")?.value || "").trim(),
      desc_en: (get("desc_en")?.value || "").trim(),
      full_desc_ru: (get("full_desc_ru")?.value || "").trim(),
      full_desc_en: (get("full_desc_en")?.value || "").trim(),
      specs_ru: (get("specs_ru")?.value || "").trim(),
      specs_en: (get("specs_en")?.value || "").trim(),
      category: (get("category")?.value || "wash").trim(),
      price: (get("price")?.value || "").trim(),
      in_stock: Math.max(0, parseInt((get("in_stock")?.value || "0").trim(), 10) || 0),
      image: (get("image")?.value || "").trim(),
      extra_images: extraImagesRaw
        .split(/\r?\n|,/)
        .map((s) => s.trim())
        .filter(Boolean)
    };
  });
}

async function saveServices() {
  if (!listEl) return;
  setStatus("Сохранение...");
  const payload = { services: collectServices() };

  try {
    const res = await fetch("save_services.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    let data = null;
    try {
      data = await res.json();
    } catch {}

    if (!res.ok) {
      const details = data && data.details ? ` (${data.details})` : "";
      const message = data && data.error ? `Ошибка: ${data.error}${details}` : "Ошибка сохранения";
      setStatus(message);
      return;
    }

    setStatus(data && data.ok ? "Сохранено" : "Ошибка");
  } catch {
    setStatus("Ошибка сохранения");
  }
}

function renderOrders(orders) {
  if (!ordersList) return;
  ordersList.innerHTML = orders.length
    ? orders
        .map(
          (o) => `
        <div class="order-card">
          <strong>Заказ #${escapeHtml(o.id)}</strong>
          <div>${escapeHtml(o.phone)} — ${escapeHtml(o.name)}</div>
          <div>${escapeHtml(o.total_display)}</div>
          <div>${escapeHtml(o.created_at)}</div>
          <ul>
            ${(o.items || []).map((i) => `<li>${escapeHtml(i.title)} × ${escapeHtml(i.qty)} — ${escapeHtml(i.price)}</li>`).join("")}
          </ul>
        </div>
      `
        )
        .join("")
    : "<p>Заказов пока нет</p>";
}

async function loadOrders() {
  if (!ordersList) return;
  ordersList.innerHTML = "<p>Загрузка...</p>";
  try {
    const data = await api("api/admin_orders.php");
    renderOrders(data.orders || []);
  } catch {
    ordersList.innerHTML = "<p>Не удалось загрузить заказы</p>";
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  if (!listEl || !addBtn || !saveBtn) return;

  setStatus("Загрузка...");
  try {
    const res = await fetch(`data/services.json?v=${Date.now()}`, { cache: "no-store" });
    if (!res.ok) throw new Error("failed to load services");
    const data = await res.json();
    catalog = data.services || [];
    catalog.forEach((service) => listEl.appendChild(createItem(service)));
    setStatus("");
  } catch {
    setStatus("Не удалось загрузить каталог");
  }

  addBtn.addEventListener("click", () => {
    listEl.appendChild(createItem({}));
  });

  saveBtn.addEventListener("click", saveServices);

  const tabButtons = document.querySelectorAll(".admin-tabs .chip");
  if (!tabButtons.length) return;

  tabButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      tabButtons.forEach((b) => b.classList.remove("is-active"));
      btn.classList.add("is-active");
      const tab = btn.dataset.tab;
      document.getElementById("tab-products")?.classList.toggle("hidden", tab !== "products");
      document.getElementById("tab-orders")?.classList.toggle("hidden", tab !== "orders");
      if (tab === "orders") loadOrders();
    });
  });
});
