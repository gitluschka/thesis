const BUILD_VERSION = "20260303-1805";

function applyVersionToLinks() {
  const anchors = document.querySelectorAll('a[href$=".html"], a[href*=".html?"]');
  anchors.forEach((a) => {
    try {
      const url = new URL(a.getAttribute("href"), window.location.origin);
      if (!url.pathname.endsWith(".html")) return;
      url.searchParams.set("v", BUILD_VERSION);
      a.setAttribute("href", `${url.pathname}${url.search}`);
    } catch {
      // ignore invalid hrefs
    }
  });
}

function syncTopbarOffset() {
  const topbar = document.querySelector(".topbar");
  if (!topbar) return;
  const height = Math.ceil(topbar.getBoundingClientRect().height);
  if (!height) return;
  document.documentElement.style.setProperty("--topbar-offset", `${height + 8}px`);
}

document.addEventListener("DOMContentLoaded", async () => {
  applyVersionToLinks();
  syncTopbarOffset();
  window.addEventListener("resize", syncTopbarOffset);
  document.addEventListener("languageChanged", syncTopbarOffset);
  requestAnimationFrame(syncTopbarOffset);
  setTimeout(syncTopbarOffset, 150);

  try {
    const cart = await loadCartAny();
    const count = cartCount(cart.items || []);
    document.querySelectorAll("#cart-badge").forEach((b) => (b.textContent = count));
  } catch {
    document.querySelectorAll("#cart-badge").forEach((b) => (b.textContent = "0"));
  }
});
