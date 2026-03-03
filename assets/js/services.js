let catalog = [];
let currentFilter = "all";

function parsePrice(value) {
  const digits = String(value || "").replace(/[^\d]/g, "");
  return digits ? Number(digits) : 0;
}

function getLang() {
  return localStorage.getItem("lang") || "ru";
}

function renderCatalog() {
  const grid = document.getElementById("services-grid");
  if (!grid) return;

  const lang = getLang();
  const sortValue = document.getElementById("sort-select").value;

  let items = catalog.slice();

  if (currentFilter !== "all") {
    items = items.filter((item) => item.category === currentFilter);
  }

  items.sort((a, b) => {
    const nameA = (lang === "en" ? a.title_en : a.title_ru).toLowerCase();
    const nameB = (lang === "en" ? b.title_en : b.title_ru).toLowerCase();
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

  grid.innerHTML = items
    .map((item) => {
      const title = lang === "en" ? item.title_en : item.title_ru;
      const desc = lang === "en" ? item.desc_en : item.desc_ru;
      const img = item.image ? `<img src="${item.image}" alt="${title}" />` : "";
      const imgClass = item.image ? "catalog-image" : "catalog-image catalog-image--placeholder";

      return `
        <div class="catalog-card" data-category="${item.category}">
          <div class="${imgClass}">
            ${img || `<span>${title}</span>`}
          </div>
          <div class="catalog-body">
            <h3>${title}</h3>
            <p>${desc}</p>
            <div class="price-row">
              <strong>${item.price}</strong>
            </div>
          </div>
        </div>
      `;
    })
    .join("");
}

document.addEventListener("DOMContentLoaded", async () => {
  const res = await fetch("data/services.json");
  const data = await res.json();
  catalog = data.services || [];

  const chips = document.querySelectorAll(".chip");
  chips.forEach((chip) => {
    chip.addEventListener("click", () => {
      chips.forEach((c) => c.classList.remove("is-active"));
      chip.classList.add("is-active");
      currentFilter = chip.dataset.filter;
      renderCatalog();
    });
  });

  document.getElementById("sort-select").addEventListener("change", renderCatalog);

  document.addEventListener("languageChanged", renderCatalog);

  renderCatalog();
});
