/* Reusable component loader (no build tooling)

Usage on pages:
  <div data-component="bottom-nav" data-active="map"></div>

This file injects components from /components/*.html
and then applies the active state based on data-active.
*/

(function () {
  const COMPONENTS_BASE_PATH = "../components/";

  function resolveBaseForPage() {
    // Heuristic: pages live in /pages or /pages/admin.
    // If the page is under /pages/admin, the relative path to /components is ../../components/
    const path = window.location.pathname || "";
    if (path.includes("/pages/admin/")) return "../../components/";
    return "../components/";
  }

  function applyBottomNavActive(container, activeKey) {
    if (!container) return;
    const root = container.querySelector("[data-bottom-nav]") || container;
    const items = root.querySelectorAll(".bottom-nav .nav-item[data-key]");
    items.forEach((el) => {
      el.classList.remove("active");
    });

    if (!activeKey) return;
    const target = root.querySelector(`.nav-item[data-key="${activeKey}"]`);
    if (target) target.classList.add("active");
  }

  async function loadComponent(placeholder) {
    const componentName = placeholder.getAttribute("data-component");
    const activeKey = placeholder.getAttribute("data-active");

    const basePath = resolveBaseForPage();
    const url = basePath + `${componentName}.html`;

    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`Failed to load component: ${componentName} (${res.status})`);

    let html = await res.text();

    // Inject correct logo relative path (for pages vs admin pages)
    // pages: ../assets/isla-logo.png
    // pages/admin: ../../assets/isla-logo.png
    const logoSrc = window.location.pathname.includes("/pages/admin/")
      ? "../../assets/isla-logo.png"
      : "../assets/isla-logo.png";
    html = html.replace(/__LOGO_SRC__/g, logoSrc);

    placeholder.innerHTML = html;

    // Apply active state
    if (componentName === "bottom-nav") {
      applyBottomNavActive(placeholder, activeKey);
    }
  }

  async function init() {
    const placeholders = document.querySelectorAll("[data-component]");
    if (!placeholders || placeholders.length === 0) return;

    const tasks = Array.from(placeholders).map((el) => loadComponent(el));
    try {
      await Promise.all(tasks);
    } catch (e) {
      // Avoid breaking page load
      console.error(e);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

