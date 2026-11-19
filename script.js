/* FreshRoots Cooperative — functional prototype (single-page app, hash routing)
   Routes: #/home  #/browse?q=&cat=  #/map  #/farm/:id  #/cart  #/checkout  #/order/:id */
"use strict";

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const esc = escapeHtml;

/* ───────────── demo data + optional demo login (?demo=farmer|customer) ───────────── */
ensureDemoData();
loadCatalog();
(function demoLogin() {
  const mode = new URLSearchParams(location.search).get("demo");
  if (!mode) return;
  if (mode === "farmer") FRStore.set("fr_user", farmerAccount(FARMS[0].email));
  if (mode === "customer") FRStore.set("fr_user", { name: DEMO_CUSTOMER.name, email: DEMO_CUSTOMER.email, role: "customer" });
  history.replaceState(null, "", location.pathname + location.hash);
})();

/* ───────────── state ───────────── */
const state = {
  cart: FRStore.get("fr_cart", {}),
  follows: FRStore.get("fr_follow", []),
  user: FRStore.get("fr_user", null),
  browse: { q: "", cat: "all", dist: 0, organic: false, sort: "relevance" },
  map: { cat: "all", dist: 0, selected: null },
  draft: {}, // checkout form values (kept when switching language)
  accTab: "orders",
  fpTab: "overview",
  route: { page: "home", param: null },
};

// drop unknown products that may be left in storage
Object.keys(state.cart).forEach((id) => {
  const p = PRODUCTS.find((x) => x.id === id);
  if (!p || p.active === false || !(state.cart[id] > 0) || p.stock <= 0) delete state.cart[id];
  else if (state.cart[id] > p.stock) state.cart[id] = p.stock;
});

const farmById = (id) => FARMS.find((f) => f.id === id);
const productById = (id) => PRODUCTS.find((p) => p.id === id);
const pname = (p) => L(p.name);
const kmText = (d) => t("km", { n: fmtNum(d) });
const awayText = (d) => t("dist_away", { n: fmtNum(d) });
const unitText = (u) => t("unit_" + u);
const onSale = (p) => p.active !== false;
const catIcon = (c) => (CATEGORIES.find((x) => x.id === c) || {}).icon || "";

/* ───────────── cart ───────────── */
function cartLines() {
  return Object.entries(state.cart)
    .map(([id, qty]) => ({ p: productById(id), qty }))
    .filter((l) => l.p && onSale(l.p) && l.qty > 0);
}
const cartCount = () => cartLines().reduce((a, l) => a + l.qty, 0);
const cartSubtotal = () => cartLines().reduce((a, l) => a + l.p.price * l.qty, 0);
const deliveryFee = (sub) => (sub === 0 || sub >= FREE_DELIVERY_FROM ? 0 : DELIVERY_FEE);

function saveCart() {
  FRStore.set("fr_cart", state.cart);
}

function setQty(id, qty) {
  const p = productById(id);
  if (!p) return;
  const max = Math.max(0, Math.min(99, p.stock));
  if (qty > max) {
    toast(t("max_stock", { n: max }), "info");
    qty = max;
  }
  qty = Math.max(0, qty);
  if (qty === 0) delete state.cart[id];
  else state.cart[id] = qty;
  saveCart();
  updateBadge(true);
  $$(`[data-buy="${id}"]`).forEach((el) => (el.innerHTML = buyControl(p)));
  if (state.route.page === "cart") $("#view").innerHTML = viewCart();
}

function updateBadge(bump) {
  const b = $("#cart-badge");
  const n = cartCount();
  b.textContent = n;
  b.classList.toggle("is-empty", n === 0);
  if (bump) {
    b.classList.remove("bump");
    void b.offsetWidth;
    b.classList.add("bump");
  }
}

/* ───────────── toast + modal ───────────── */
function toast(msg, kind = "ok") {
  const el = document.createElement("div");
  el.className = "toast toast-" + kind;
  el.textContent = msg;
  $("#toasts").appendChild(el);
  setTimeout(() => el.classList.add("out"), 2400);
  setTimeout(() => el.remove(), 2800);
}

let lastFocus = null;
function openModal(html) {
  lastFocus = document.activeElement;
  const m = $("#modal");
  m.innerHTML = html;
  m.hidden = false;
  const first = m.querySelector("textarea, input, button");
  if (first) first.focus();
}
function closeModal() {
  const m = $("#modal");
  m.hidden = true;
  m.innerHTML = "";
  if (lastFocus) lastFocus.focus();
}

/* ───────────── shared components ───────────── */
function buyControl(p) {
  const q = state.cart[p.id] || 0;
  if (p.stock <= 0) {
    return `<button type="button" class="btn btn-block btn-disabled" disabled>${t("sold_out")}</button>`;
  }
  if (!q) {
    return `<button type="button" class="btn btn-primary btn-block" data-action="add" data-id="${p.id}">${t("add_to_cart")}</button>`;
  }
  return `<div class="stepper" role="group" aria-label="${esc(pname(p))}">
      <button type="button" data-action="dec" data-id="${p.id}" aria-label="${t("qty_dec")}">−</button>
      <span class="stepper-val">${t("in_cart", { n: q })}</span>
      <button type="button" data-action="inc" data-id="${p.id}" aria-label="${t("qty_inc")}" ${q >= p.stock ? "disabled" : ""}>+</button>
    </div>`;
}

function productCard(p) {
  const f = farmById(p.farm);
  return `<article class="product-card${p.stock <= 0 ? " is-sold-out" : ""}">
    <div class="product-image">
      <img src="${p.img}" alt="${esc(pname(p))}" loading="lazy" />
      ${p.organic ? `<span class="badge badge-organic">🌱 ${t("organic_badge")}</span>` : ""}
      ${
        p.stock <= 0
          ? `<span class="badge badge-stock out">${t("sold_out")}</span>`
          : p.stock <= 5
          ? `<span class="badge badge-stock">⏳ ${t("stock_left", { n: p.stock })}</span>`
          : ""
      }
    </div>
    <div class="product-body">
      <h3 class="product-name">${esc(pname(p))}</h3>
      <a class="farmer-info" href="#/farm/${f.id}">👩‍🌾 ${esc(f.name)} · ${awayText(f.distance)}</a>
      <div class="product-price">${fmtPrice(p.price)} <span class="unit">/ ${unitText(p.unit)}</span></div>
      <div class="buy" data-buy="${p.id}">${buyControl(p)}</div>
    </div>
  </article>`;
}

function farmCard(f) {
  const n = PRODUCTS.filter((p) => p.farm === f.id && onSale(p)).length;
  return `<article class="farm-card">
    <a class="farm-card-img" href="#/farm/${f.id}"><img src="${f.img}" alt="" loading="lazy" /></a>
    <div class="farm-card-body">
      <h3><a href="#/farm/${f.id}">${esc(f.name)}</a></h3>
      <p class="farmer-info">📍 ${awayText(f.distance)} · ${f.cats.map((c) => catIcon(c) + " " + t("cat_" + c)).join(", ")}</p>
      <p class="farmer-info">${f.organic ? "🌱 " + t("method_organic") : "♻️ " + t("method_conventional")} · ${t(
    "farm_products_count",
    { n }
  )}</p>
      <a class="btn btn-outline btn-sm" href="#/farm/${f.id}">${t("view_farm")} →</a>
    </div>
  </article>`;
}

function chip(scope, key, value, label, active) {
  return `<button type="button" class="chip${active ? " active" : ""}" aria-pressed="${active}" data-action="filter" data-scope="${scope}" data-key="${key}" data-value="${value}">${label}</button>`;
}

function summaryHtml() {
  const sub = cartSubtotal();
  const fee = deliveryFee(sub);
  const missing = Math.max(0, FREE_DELIVERY_FROM - sub);
  const pct = Math.min(100, (sub / FREE_DELIVERY_FROM) * 100);
  return `<h2>${t("summary")}</h2>
    <div class="sum-row"><span>${t("subtotal")}</span><strong>${fmtPrice(sub)}</strong></div>
    <div class="sum-row"><span>${t("delivery_fee")}</span><strong>${fee === 0 ? t("free") : fmtPrice(fee)}</strong></div>
    <div class="free-ship">
      <div class="bar"><span style="width:${pct}%"></span></div>
      <small>${missing > 0 ? t("free_delivery_hint", { amount: fmtPrice(missing) }) : "🎉 " + t("free_delivery_ok")}</small>
    </div>
    <hr />
    <div class="sum-row sum-total"><span>${t("total")}</span><strong>${fmtPrice(sub + fee)}</strong></div>`;
}

/* ───────────── HOME ───────────── */
const SLIDES = [
  { img: "img/farmer_org.jpg", t: "hero1_t", s: "hero1_s" },
  { img: "img/organic.jpg", t: "hero2_t", s: "hero2_s" },
  { img: "img/delivery.jpg", t: "hero3_t", s: "hero3_s" },
];
let carIdx = 0;
let carTimer = null;

function viewHome() {
  const featured = PRODUCTS.filter((p) => p.featured && onSale(p));
  const nearest = [...FARMS].sort((a, b) => a.distance - b.distance).slice(0, 3);
  return `
  <section class="hero">
    <div class="carousel" id="carousel">
      ${SLIDES.map(
        (s, i) => `<div class="carousel-slide${i === carIdx ? " active" : ""}" aria-hidden="${i !== carIdx}">
          <img src="${s.img}" alt="" />
          <div class="carousel-caption"><h1>${t(s.t)}</h1><p>${t(s.s)}</p></div>
        </div>`
      ).join("")}
      <button type="button" class="car-btn car-prev" data-action="car-prev" aria-label="${t("prev_slide")}">‹</button>
      <button type="button" class="car-btn car-next" data-action="car-next" aria-label="${t("next_slide")}">›</button>
      <div class="carousel-dots">
        ${SLIDES.map(
          (s, i) =>
            `<button type="button" class="dot${i === carIdx ? " active" : ""}" data-action="car-go" data-index="${i}" aria-label="${t(
              "go_slide",
              { n: i + 1 }
            )}"></button>`
        ).join("")}
      </div>
    </div>
    <form class="search-bar" data-form="search" role="search">
      <input type="search" name="q" placeholder="${t("search_ph")}" aria-label="${t("search_ph")}" />
      <button type="submit" class="btn btn-primary">🔍 ${t("search_btn")}</button>
    </form>
  </section>

  <section class="section">
    <h2 class="center">${t("why_title")}</h2>
    <div class="why-grid">
      <div class="why-card"><span class="why-icon">👩‍🌾</span><h3>${t("why1_t")}</h3><p>${t("why1_d")}</p></div>
      <div class="why-card"><span class="why-icon">💶</span><h3>${t("why2_t")}</h3><p>${t("why2_d")}</p></div>
      <div class="why-card"><span class="why-icon">🕑</span><h3>${t("why3_t")}</h3><p>${t("why3_d")}</p></div>
    </div>
  </section>

  <section class="section">
    <div class="section-head"><h2>🔥 ${t("home_featured")}</h2><a href="#/browse">${t("home_see_all")} →</a></div>
    <div class="product-grid">${featured.map(productCard).join("")}</div>
  </section>

  <section class="section">
    <div class="section-head"><h2>📍 ${t("home_farms")}</h2><a href="#/map">${t("home_see_all")} →</a></div>
    <div class="farm-grid">${nearest.map(farmCard).join("")}</div>
  </section>`;
}

function goSlide(i) {
  const slides = $$(".carousel-slide");
  if (!slides.length) return;
  carIdx = (i + slides.length) % slides.length;
  slides.forEach((s, k) => {
    s.classList.toggle("active", k === carIdx);
    s.setAttribute("aria-hidden", k !== carIdx);
  });
  $$(".carousel-dots .dot").forEach((d, k) => d.classList.toggle("active", k === carIdx));
}
function startCarousel() {
  stopCarousel();
  carTimer = setInterval(() => goSlide(carIdx + 1), 5000);
}
function stopCarousel() {
  if (carTimer) clearInterval(carTimer);
  carTimer = null;
}
function bindCarousel() {
  const c = $("#carousel");
  if (!c) return;
  c.addEventListener("mouseenter", stopCarousel);
  c.addEventListener("mouseleave", startCarousel);
  c.addEventListener("focusin", stopCarousel);
  c.addEventListener("focusout", startCarousel);
  startCarousel();
}

/* ───────────── BROWSE ───────────── */
function filteredProducts() {
  const b = state.browse;
  const q = b.q.trim().toLowerCase();
  let list = PRODUCTS.filter((p) => {
    const f = farmById(p.farm);
    if (!onSale(p)) return false;
    if (b.cat !== "all" && p.cat !== b.cat) return false;
    if (b.dist && f.distance > b.dist) return false;
    if (b.organic && !p.organic) return false;
    if (q) {
      const hay = [pname(p), p.name.en || "", f.name, t("cat_" + p.cat)].join(" ").toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
  const byDist = (p) => farmById(p.farm).distance;
  if (b.sort === "price_asc") list.sort((a, c) => a.price - c.price);
  else if (b.sort === "price_desc") list.sort((a, c) => c.price - a.price);
  else if (b.sort === "distance") list.sort((a, c) => byDist(a) - byDist(c));
  else list.sort((a, c) => (c.featured ? 1 : 0) - (a.featured ? 1 : 0));
  list.sort((a, c) => (a.stock <= 0 ? 1 : 0) - (c.stock <= 0 ? 1 : 0));
  return list;
}

function viewBrowse() {
  const b = state.browse;
  const sorts = ["relevance", "price_asc", "price_desc", "distance"];
  return `<section class="page">
    <h1>${t("browse_title")}</h1>
    <div class="browse-layout">
      <aside class="filters card" aria-label="Filters">
        <label class="field">
          <span class="field-label">🔍 ${t("search_btn")}</span>
          <input type="search" id="b-q" value="${esc(b.q)}" placeholder="${t("search_ph")}" />
        </label>
        <fieldset>
          <legend>${t("filter_category")}</legend>
          <div class="chips">
            ${chip("browse", "cat", "all", t("cat_all"), b.cat === "all")}
            ${CATEGORIES.map((c) => chip("browse", "cat", c.id, c.icon + " " + t("cat_" + c.id), b.cat === c.id)).join("")}
          </div>
        </fieldset>
        <fieldset>
          <legend>📍 ${t("filter_distance")}</legend>
          <div class="chips">
            ${[0, 3, 5, 10].map((d) => chip("browse", "dist", d, d ? kmText(d) : t("dist_any"), b.dist === d)).join("")}
          </div>
        </fieldset>
        <label class="check"><input type="checkbox" id="b-organic" ${b.organic ? "checked" : ""} /> 🌱 ${t("filter_organic")}</label>
        <label class="field">
          <span class="field-label">${t("sort_label")}</span>
          <select id="b-sort">${sorts
            .map((s) => `<option value="${s}"${b.sort === s ? " selected" : ""}>${t("sort_" + s)}</option>`)
            .join("")}</select>
        </label>
      </aside>
      <div class="results">
        <p class="results-count" id="b-count" aria-live="polite"></p>
        <div class="product-grid" id="b-results"></div>
      </div>
    </div>
  </section>`;
}

function renderResults() {
  const list = filteredProducts();
  $("#b-count").textContent = t("results_count", { n: list.length });
  $("#b-results").innerHTML = list.length
    ? list.map(productCard).join("")
    : `<div class="empty"><p>🥲 ${t("no_results")}</p><button type="button" class="btn btn-outline" data-action="clear-filters">${t(
        "clear_filters"
      )}</button></div>`;
}

function bindBrowse() {
  $("#b-q").addEventListener("input", (e) => {
    state.browse.q = e.target.value;
    renderResults();
  });
  $("#b-organic").addEventListener("change", (e) => {
    state.browse.organic = e.target.checked;
    renderResults();
  });
  $("#b-sort").addEventListener("change", (e) => {
    state.browse.sort = e.target.value;
    renderResults();
  });
  renderResults();
}

/* ───────────── MAP ───────────── */
const MAP = { w: 800, h: 480, cx: 400, cy: 240, s: 21 };
const PIN_COLORS = { veg: "#3f8f4f", fruit: "#d64545", dairy: "#3a78c2", eggs: "#d9962b", bakery: "#9a6a3a" };

function farmXY(f) {
  const a = (f.angle * Math.PI) / 180;
  return { x: MAP.cx + f.distance * MAP.s * Math.cos(a), y: MAP.cy + f.distance * MAP.s * Math.sin(a) };
}
function mapMatch(f) {
  const m = state.map;
  return (m.cat === "all" || f.cats.includes(m.cat)) && (!m.dist || f.distance <= m.dist);
}

function svgMap() {
  const r5 = 5 * MAP.s;
  const r10 = 10 * MAP.s;
  const pins = FARMS.map((f) => {
    const { x, y } = farmXY(f);
    const c = PIN_COLORS[f.cats[0]];
    const cls = ["pin", mapMatch(f) ? "" : "is-hidden", state.map.selected === f.id ? "selected" : ""].join(" ");
    return `<g class="${cls}" data-action="pin" data-id="${f.id}" transform="translate(${x.toFixed(1)} ${y.toFixed(
      1
    )})" tabindex="${mapMatch(f) ? 0 : -1}" role="button" aria-label="${esc(f.name)}, ${awayText(f.distance)}">
        <circle class="pin-halo" r="24"></circle>
        <path d="M0 6 C -14 -8 -14 -28 0 -28 C 14 -28 14 -8 0 6 Z" fill="${c}" stroke="#fff" stroke-width="2.5"></path>
        <text class="pin-emoji" y="-12" text-anchor="middle">${catIcon(f.cats[0])}</text>
        <text class="pin-label" y="24" text-anchor="middle">${esc(f.name)}</text>
      </g>`;
  }).join("");

  return `<svg viewBox="0 0 ${MAP.w} ${MAP.h}" class="farm-map" role="img" aria-label="${t("map_title")}">
    <rect width="${MAP.w}" height="${MAP.h}" class="map-bg"></rect>
    <path class="map-park" d="M80 60 q60 -30 120 10 q30 40 -20 70 q-70 30 -110 -20 z"></path>
    <path class="map-park" d="M600 330 q70 -20 110 30 q10 60 -70 70 q-70 0 -60 -50 z"></path>
    <path class="map-park" d="M560 60 q50 -20 90 20 q0 40 -50 40 q-50 -10 -40 -60 z"></path>
    <path class="map-river" d="M-10 140 C 120 120, 200 220, 300 250 S 420 330, 520 300 S 700 180, 820 210"></path>
    <path class="map-road" d="M0 400 L 800 90"></path>
    <path class="map-road" d="M120 0 L 330 480"></path>
    <path class="map-road minor" d="M0 260 L 800 250"></path>
    <path class="map-road minor" d="M520 0 L 470 480"></path>
    <circle class="ring" cx="${MAP.cx}" cy="${MAP.cy}" r="${r10}"></circle>
    <circle class="ring" cx="${MAP.cx}" cy="${MAP.cy}" r="${r5}"></circle>
    <text class="ring-label" x="${MAP.cx + 4}" y="${MAP.cy - r5 - 6}">${kmText(5)}</text>
    <text class="ring-label" x="${MAP.cx + 4}" y="${MAP.cy - r10 + 16}">${kmText(10)}</text>
    <g class="you">
      <circle cx="${MAP.cx}" cy="${MAP.cy}" r="22" class="you-pulse"></circle>
      <circle cx="${MAP.cx}" cy="${MAP.cy}" r="11"></circle>
      <text x="${MAP.cx}" y="${MAP.cy + 34}" text-anchor="middle" class="you-label">📍 ${t("map_you")}</text>
    </g>
    ${pins}
  </svg>`;
}

function mapCardHtml() {
  const f = farmById(state.map.selected);
  if (!f) {
    return `<div class="map-card-empty"><span class="big">👆</span><p>${t("map_hint")}</p></div>`;
  }
  const n = PRODUCTS.filter((p) => p.farm === f.id && onSale(p)).length;
  return `<img src="${f.img}" alt="" />
    <h3>${esc(f.name)}</h3>
    <p class="farmer-info">📍 ${awayText(f.distance)}</p>
    <p class="farmer-info">${f.cats.map((c) => catIcon(c) + " " + t("cat_" + c)).join(", ")} · ${t("farm_products_count", { n })}</p>
    <p class="farmer-info">${f.organic ? "🌱 " + t("method_organic") : "♻️ " + t("method_conventional")}</p>
    <a class="btn btn-primary btn-block" href="#/farm/${f.id}">${t("view_farm")} →</a>`;
}

function viewMap() {
  const m = state.map;
  return `<section class="page">
    <h1>📍 ${t("map_title")}</h1>
    <p class="muted">${t("map_hint")}</p>
    <div class="map-filters">
      <div class="chips"><strong>${t("map_type")}:</strong>
        ${chip("map", "cat", "all", t("cat_all"), m.cat === "all")}
        ${CATEGORIES.map((c) => chip("map", "cat", c.id, c.icon + " " + t("cat_" + c.id), m.cat === c.id)).join("")}
      </div>
      <div class="chips"><strong>${t("filter_distance")}:</strong>
        ${[0, 5, 10].map((d) => chip("map", "dist", d, d ? kmText(d) : t("dist_any"), m.dist === d)).join("")}
      </div>
    </div>
    <div class="map-layout">
      <div class="map-box" id="map-box">${svgMap()}</div>
      <aside class="map-card card" id="map-card" aria-live="polite">${mapCardHtml()}</aside>
    </div>
    <h2>${t("map_list")}</h2>
    <div class="farm-grid" id="map-list"></div>
  </section>`;
}

function renderMapParts() {
  $("#map-box").innerHTML = svgMap();
  $("#map-card").innerHTML = mapCardHtml();
  const list = [...FARMS].filter(mapMatch).sort((a, b) => a.distance - b.distance);
  $("#map-list").innerHTML = list.length ? list.map(farmCard).join("") : `<div class="empty"><p>${t("map_no_farms")}</p></div>`;
}

/* ───────────── FARM PROFILE ───────────── */
function viewFarm(id) {
  const f = farmById(id);
  if (!f) return viewNotFound();
  const prods = PRODUCTS.filter((p) => p.farm === id && onSale(p));
  const fol = state.follows.includes(id);
  return `<section class="page">
    <button type="button" class="link-btn" data-action="back">${t("back")}</button>
    <div class="farm-hero">
      <img src="${f.img}" alt="" />
      <div class="farm-hero-overlay">
        <h1>${esc(f.name)}</h1>
        <p>${t("farm_owner", { name: esc(f.owner) })}</p>
      </div>
    </div>
    <div class="farm-layout">
      <aside class="farm-info card">
        <img class="avatar" src="${f.avatar}" alt="${esc(f.owner)}" />
        <dl class="facts">
          <dt>📍 ${t("farm_distance")}</dt><dd>${kmText(f.distance)}</dd>
          <dt>🌱 ${t("farm_method")}</dt><dd>${f.organic ? t("method_organic") : t("method_conventional")}</dd>
          <dt>📞 ${t("farm_phone")}</dt><dd><a href="tel:${f.phone.replace(/\s/g, "")}">${f.phone}</a></dd>
          <dt>📧 ${t("farm_email")}</dt><dd><a href="mailto:${f.email}">${f.email}</a></dd>
          <dt>📸 ${t("farm_instagram")}</dt><dd>@${f.instagram}</dd>
        </dl>
        <div class="btn-col">
          <button type="button" class="btn ${fol ? "btn-secondary" : "btn-primary"}" data-action="follow" data-id="${f.id}" aria-pressed="${fol}">${
    fol ? t("following") : "＋ " + t("follow")
  }</button>
          <button type="button" class="btn btn-outline" data-action="message" data-id="${f.id}">✉️ ${t("send_message")}</button>
        </div>
      </aside>
      <div>
        <h2>${t("farm_about")}</h2>
        <p class="lead">${L(f.about)}</p>
        <h2>🛒 ${t("farm_products")}</h2>
        <div class="product-grid">${prods.map(productCard).join("")}</div>
      </div>
    </div>
  </section>`;
}

function openMessage(id) {
  const f = farmById(id);
  openModal(`<div class="modal" role="dialog" aria-modal="true" aria-labelledby="m-title">
    <h2 id="m-title">✉️ ${t("msg_title", { farm: esc(f.name) })}</h2>
    <textarea id="m-text" rows="5" placeholder="${t("msg_ph")}"></textarea>
    <small class="err" id="m-err"></small>
    <div class="btn-row end">
      <button type="button" class="btn btn-ghost" data-action="modal-close">${t("msg_cancel")}</button>
      <button type="button" class="btn btn-primary" data-action="msg-send" data-id="${f.id}">${t("msg_send")}</button>
    </div>
  </div>`);
}

/* ───────────── CART ───────────── */
function viewCart() {
  const lines = cartLines();
  if (!lines.length) {
    return `<section class="page"><h1>🛒 ${t("cart_title")}</h1>
      <div class="empty big-empty"><span class="big">🧺</span><p>${t("cart_empty")}</p>
      <a class="btn btn-primary btn-lg" href="#/browse">${t("cart_start")}</a></div></section>`;
  }
  const groups = [];
  lines.forEach((l) => {
    let g = groups.find((x) => x.farm.id === l.p.farm);
    if (!g) groups.push((g = { farm: farmById(l.p.farm), lines: [] }));
    g.lines.push(l);
  });
  return `<section class="page">
    <h1>🛒 ${t("cart_title")}</h1>
    <div class="cart-layout">
      <div class="cart-items">
        ${groups
          .map(
            (g) => `<div class="cart-group card">
            <h3 class="cart-group-head"><a href="#/farm/${g.farm.id}">👩‍🌾 ${t("from_farm", { farm: esc(g.farm.name) })}</a>
              <span class="muted">· ${awayText(g.farm.distance)}</span></h3>
            ${g.lines
              .map(
                (l) => `<div class="cart-item">
                <img src="${l.p.img}" alt="" />
                <div class="ci-info"><strong>${esc(pname(l.p))}</strong>
                  <span class="muted">${fmtPrice(l.p.price)} / ${unitText(l.p.unit)}</span></div>
                <div class="stepper compact" role="group" aria-label="${esc(pname(l.p))}">
                  <button type="button" data-action="dec" data-id="${l.p.id}" aria-label="${t("qty_dec")}">−</button>
                  <span class="stepper-val">${l.qty}</span>
                  <button type="button" data-action="inc" data-id="${l.p.id}" aria-label="${t("qty_inc")}">+</button>
                </div>
                <strong class="ci-total">${fmtPrice(l.p.price * l.qty)}</strong>
                <button type="button" class="icon-btn" data-action="remove" data-id="${l.p.id}" aria-label="${t("remove")}" title="${t(
                  "remove"
                )}">🗑️</button>
              </div>`
              )
              .join("")}
          </div>`
          )
          .join("")}
      </div>
      <aside class="cart-summary card">
        ${summaryHtml()}
        <a class="btn btn-primary btn-block btn-lg" href="#/checkout">${t("checkout")} →</a>
        <a class="btn btn-ghost btn-block" href="#/browse">${t("continue_shopping")}</a>
      </aside>
    </div>
  </section>`;
}

/* ───────────── CHECKOUT ───────────── */
function slotDays() {
  const days = [];
  const d = new Date();
  for (let i = 1; i <= 3; i++) {
    const x = new Date(d.getFullYear(), d.getMonth(), d.getDate() + i);
    const iso = `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
    days.push({ iso, date: x });
  }
  return days;
}
function fmtDay(date, long) {
  const opts = long ? { weekday: "long", day: "numeric", month: "long" } : { weekday: "short", day: "numeric", month: "numeric" };
  return new Intl.DateTimeFormat(langInfo().locale, opts).format(date);
}
function isoToDate(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

const CO_FIELDS = [
  { id: "name", key: "co_name", type: "text", auto: "name", full: true },
  { id: "email", key: "co_email", type: "email", auto: "email" },
  { id: "phone", key: "co_phone", type: "tel", auto: "tel", ph: "+420 777 123 456" },
  { id: "address", key: "co_address", type: "text", auto: "street-address", full: true },
  { id: "city", key: "co_city", type: "text", auto: "address-level2" },
  { id: "zip", key: "co_zip", type: "text", auto: "postal-code", ph: "110 00" },
];

function viewCheckout() {
  if (!cartLines().length) {
    location.replace("#/cart");
    return "";
  }
  const d = state.draft;
  if (state.user) {
    const prof = (userRecord(state.user.email) || {}).profile || {};
    if (d.name == null) d.name = state.user.name;
    if (d.email == null) d.email = state.user.email;
    ["phone", "address", "city", "zip"].forEach((k) => {
      if (d[k] == null && prof[k]) d[k] = prof[k];
    });
  }
  if (d.city == null) d.city = "Praha";
  if (!d.pay) d.pay = "card";
  const days = slotDays();
  return `<section class="page">
    <button type="button" class="link-btn" data-action="go" data-href="#/cart">← ${t("co_back")}</button>
    <h1>${t("checkout_title")}</h1>
    <form class="checkout-layout" id="co-form" novalidate>
      <div class="co-main">
        <fieldset class="card">
          <legend>📦 ${t("co_contact")}</legend>
          <div class="form-grid">
            ${CO_FIELDS.map(
              (f) => `<label class="field${f.full ? " full" : ""}">
                <span class="field-label">${t(f.key)} *</span>
                <input id="co-${f.id}" name="${f.id}" type="${f.type}" autocomplete="${f.auto}" value="${esc(d[f.id] || "")}" ${
                f.ph ? `placeholder="${f.ph}"` : ""
              } aria-describedby="err-${f.id}" />
                <small class="err" id="err-${f.id}"></small>
              </label>`
            ).join("")}
          </div>
        </fieldset>

        <fieldset class="card">
          <legend>🕑 ${t("co_slot")} *</legend>
          <p class="muted">${t("co_slot_hint")}</p>
          <div class="slot-grid" role="radiogroup">
            ${days
              .map(
                (day) => `<div class="slot-day"><strong>${fmtDay(day.date)}</strong>
                ${DELIVERY_WINDOWS.map((w) => {
                  const v = day.iso + "|" + w;
                  return `<label class="slot"><input type="radio" name="slot" value="${v}" ${d.slot === v ? "checked" : ""} /><span>${w}</span></label>`;
                }).join("")}
              </div>`
              )
              .join("")}
          </div>
          <small class="err" id="err-slot"></small>
        </fieldset>

        <fieldset class="card">
          <legend>💳 ${t("co_payment")}</legend>
          <div class="pay-row">
            ${["card", "cash", "online"]
              .map(
                (p) =>
                  `<label class="radio-card"><input type="radio" name="pay" value="${p}" ${d.pay === p ? "checked" : ""} /><span>${t(
                    "pay_" + p
                  )}</span></label>`
              )
              .join("")}
          </div>
          <p class="muted small">ℹ️ ${t("co_note")}</p>
        </fieldset>
      </div>

      <aside class="cart-summary card">
        <ul class="mini-lines">
          ${cartLines()
            .map((l) => `<li><span>${l.qty} × ${esc(pname(l.p))}</span><span>${fmtPrice(l.p.price * l.qty)}</span></li>`)
            .join("")}
        </ul>
        ${summaryHtml()}
        <p class="err" id="co-error" role="alert"></p>
        <button type="submit" class="btn btn-primary btn-block btn-lg">✅ ${t("co_place")}</button>
      </aside>
    </form>
  </section>`;
}

const VALIDATORS = {
  name: (v) => (v.trim() ? "" : "err_required"),
  email: (v) => (!v.trim() ? "err_required" : /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) ? "" : "err_email"),
  phone: (v) => (!v.trim() ? "err_required" : /^\+?[0-9][0-9 ]{7,16}$/.test(v.trim()) ? "" : "err_phone"),
  address: (v) => (v.trim() ? "" : "err_required"),
  city: (v) => (v.trim() ? "" : "err_required"),
  zip: (v) => (!v.trim() ? "err_required" : /^\d{3}\s?\d{2}$/.test(v.trim()) ? "" : "err_zip"),
};

function validateField(id) {
  const input = $("#co-" + id);
  const errKey = VALIDATORS[id](input.value);
  input.setAttribute("aria-invalid", errKey ? "true" : "false");
  $("#err-" + id).textContent = errKey ? t(errKey) : "";
  return !errKey;
}

function bindCheckout() {
  const form = $("#co-form");
  if (!form) return;
  form.addEventListener("input", (e) => {
    const el = e.target;
    if (el.name) state.draft[el.name] = el.value;
    if (VALIDATORS[el.name] && el.getAttribute("aria-invalid") === "true") validateField(el.name);
  });
  form.addEventListener("change", (e) => {
    if (e.target.name === "slot") {
      state.draft.slot = e.target.value;
      $("#err-slot").textContent = "";
    }
    if (e.target.name === "pay") state.draft.pay = e.target.value;
  });
  form.addEventListener(
    "blur",
    (e) => {
      if (VALIDATORS[e.target.name] && e.target.value) validateField(e.target.name);
    },
    true
  );
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    let firstBad = null;
    Object.keys(VALIDATORS).forEach((id) => {
      if (!validateField(id) && !firstBad) firstBad = $("#co-" + id);
    });
    if (!state.draft.slot) {
      $("#err-slot").textContent = t("err_slot");
      if (!firstBad) firstBad = $('input[name="slot"]');
    }
    if (firstBad) {
      $("#co-error").textContent = t("co_fix");
      firstBad.focus();
      return;
    }
    placeOrder();
  });
}

function placeOrder() {
  const lines = cartLines();
  const sub = cartSubtotal();
  const fee = deliveryFee(sub);
  const [date, win] = state.draft.slot.split("|");
  const order = {
    id: "FR-" + String(Date.now()).slice(-6),
    created: new Date().toISOString(),
    lines: lines.map((l) => ({ id: l.p.id, qty: l.qty, price: l.p.price, name: l.p.name, farm: l.p.farm, unit: l.p.unit })),
    farms: [...new Set(lines.map((l) => l.p.farm))],
    farmStatus: Object.fromEntries([...new Set(lines.map((l) => l.p.farm))].map((f) => [f, "new"])),
    userEmail: state.user ? state.user.email : null,
    address: { address: state.draft.address, city: state.draft.city, zip: state.draft.zip },
    subtotal: sub,
    fee,
    total: sub + fee,
    slot: { date, win },
    pay: state.draft.pay,
    customer: { name: state.draft.name, email: state.draft.email, phone: state.draft.phone },
  };
  const orders = FRStore.get("fr_orders", []);
  orders.push(order);
  FRStore.set("fr_orders", orders);
  // reduce stock: the farmer sees it immediately in the portal
  lines.forEach((l) => (l.p.stock = Math.max(0, l.p.stock - l.qty)));
  saveCatalog();
  // remember the address for next time
  if (state.user) {
    const rec = userRecord(state.user.email);
    if (rec && !(rec.profile && rec.profile.address)) {
      updateUserRecord(state.user.email, {
        profile: { phone: state.draft.phone, address: state.draft.address, city: state.draft.city, zip: state.draft.zip },
      });
    }
  }
  state.cart = {};
  saveCart();
  updateBadge();
  state.draft = { slot: undefined };
  location.hash = "#/order/" + order.id;
}

function viewOrder(id) {
  const o = FRStore.get("fr_orders", []).find((x) => x.id === id);
  if (!o) return viewNotFound();
  const slot = fmtDay(isoToDate(o.slot.date), true) + ", " + o.slot.win;
  const farms = o.farms.map((fid) => (farmById(fid) || {}).name).filter(Boolean);
  return `<section class="page">
    <div class="order-ok card">
      <span class="big">🎉</span>
      <h1>${t("order_ok_title")}</h1>
      <p class="lead">${t("order_ok_text", { id: `<strong>${esc(o.id)}</strong>`, slot: `<strong>${esc(slot)}</strong>` })}</p>
      <p>👩‍🌾 ${t("order_ok_farms", { farms: farms.map((n) => esc(n)).join(", ") })}</p>
      <ul class="mini-lines">
        ${o.lines.map((l) => `<li><span>${l.qty} × ${esc(lineName(l))}</span><span>${fmtPrice(l.price * l.qty)}</span></li>`).join("")}
        <li><span>${t("delivery_fee")}</span><span>${o.fee === 0 ? t("free") : fmtPrice(o.fee)}</span></li>
        <li class="sum-total"><span>${t("total")}</span><span>${fmtPrice(o.total)}</span></li>
      </ul>
      ${orderTracker(overallStatus(o))}
      <div class="btn-row" style="justify-content:center">
        ${state.user && state.user.role !== "farmer" ? `<a class="btn btn-outline btn-lg" href="#/account/orders">📦 ${t("acc_orders")}</a>` : ""}
        <a class="btn btn-primary btn-lg" href="#/home">${t("back_home")}</a>
      </div>
    </div>
  </section>`;
}

function viewNotFound() {
  return `<section class="page"><div class="empty big-empty"><span class="big">🧭</span><p>${t("not_found")}</p>
    <a class="btn btn-primary" href="#/home">${t("back_home")}</a></div></section>`;
}

/* ───────────── shared order + user helpers ───────────── */
function userRecord(email) {
  return FRStore.get("fr_users", []).find((u) => u.email === email) || null;
}
function updateUserRecord(email, patch) {
  const users = FRStore.get("fr_users", []);
  const u = users.find((x) => x.email === email);
  if (!u) return;
  Object.assign(u, patch);
  FRStore.set("fr_users", users);
}
function allOrders() {
  return FRStore.get("fr_orders", []).sort((a, b) => (a.created < b.created ? 1 : -1));
}
function saveOrders(list) {
  FRStore.set("fr_orders", list);
}
function lineName(l) {
  if (l.name) return L(l.name);
  const p = productById(l.id);
  return p ? pname(p) : l.id;
}
function lineFarm(l) {
  return l.farm || (productById(l.id) || {}).farm;
}
const statusIdx = (s) => ORDER_STATUSES.indexOf(s);
function farmStatusOf(o, farmId) {
  return (o.farmStatus && o.farmStatus[farmId]) || "new";
}
function overallStatus(o) {
  return o.farms.map((f) => farmStatusOf(o, f)).reduce((a, b) => (statusIdx(b) < statusIdx(a) ? b : a), "delivered");
}
function statusPill(s) {
  return `<span class="status status-${s}">${t("status_" + s)}</span>`;
}
function orderTracker(s) {
  const cur = statusIdx(s);
  return `<ol class="tracker" aria-label="${t("order_status")}: ${t("status_" + s)}">${ORDER_STATUSES.map(
    (x, i) => `<li class="${i < cur ? "done" : i === cur ? "current" : ""}"><span></span>${t("status_" + x)}</li>`
  ).join("")}</ol>`;
}
function fmtDateTime(iso) {
  return new Intl.DateTimeFormat(langInfo().locale, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(
    new Date(iso)
  );
}
function slotText(slot) {
  return fmtDay(isoToDate(slot.date), true) + ", " + slot.win;
}
function tabBar(base, tabs, cur) {
  return `<nav class="tab-bar" role="tablist">${tabs
    .map(
      ([id, label, n]) =>
        `<a role="tab" href="#/${base}/${id}" aria-selected="${id === cur}" class="${id === cur ? "active" : ""}">${label}${
          n ? ` <span class="count">${n}</span>` : ""
        }</a>`
    )
    .join("")}</nav>`;
}
function needLogin(farmerPage) {
  return `<section class="page"><div class="empty big-empty"><span class="big">🔒</span>
    <p>${t(farmerPage ? "farmer_only" : "login_needed")}</p>
    <a class="btn btn-primary" href="login.html">${t("go_login")}</a></div></section>`;
}

/* ───────────── CUSTOMER ACCOUNT ───────────── */
function myOrders() {
  return allOrders().filter((o) => state.user && o.userEmail === state.user.email);
}
function myMessages() {
  return FRStore.get("fr_messages", [])
    .filter((m) => state.user && m.from === state.user.email)
    .sort((a, b) => (a.at < b.at ? 1 : -1));
}

function viewAccount() {
  const u = state.user;
  if (!u) return needLogin(false);
  if (u.role === "farmer") {
    location.replace("#/farmer");
    return "";
  }
  const tabsList = ["orders", "follows", "messages", "profile"];
  if (!tabsList.includes(state.accTab)) state.accTab = "orders";
  const orders = myOrders();
  const msgs = myMessages();
  const first = String(u.name || "").split(" ")[0];
  const tabs = [
    ["orders", "📦 " + t("acc_orders"), orders.length],
    ["follows", "⭐ " + t("acc_follows"), state.follows.length],
    ["messages", "✉️ " + t("acc_messages"), msgs.length],
    ["profile", "👤 " + t("acc_profile")],
  ];
  let body = "";
  if (state.accTab === "orders") {
    body = orders.length
      ? orders.map(customerOrderCard).join("")
      : `<div class="empty"><p>${t("acc_no_orders")}</p><a class="btn btn-primary" href="#/browse">${t("cart_start")}</a></div>`;
  } else if (state.accTab === "follows") {
    const farms = state.follows.map(farmById).filter(Boolean);
    body = farms.length
      ? `<div class="farm-grid">${farms.map(farmCard).join("")}</div>`
      : `<div class="empty"><p>${t("acc_no_follows")}</p><a class="btn btn-primary" href="#/map">${t("nav_map")}</a></div>`;
  } else if (state.accTab === "messages") {
    body = msgs.length ? msgs.map(customerMsgCard).join("") : `<div class="empty"><p>${t("acc_no_messages")}</p></div>`;
  } else {
    body = profileForm(u);
  }
  return `<section class="page">
    <div class="portal-head">
      <span class="portal-avatar">👤</span>
      <div><p class="kicker">${t("acc_title")}</p><h1>${t("acc_hello", { name: esc(first) })}</h1><p class="muted">${esc(u.email)}</p></div>
    </div>
    ${tabBar("account", tabs, state.accTab)}
    <div class="tab-body">${body}</div>
  </section>`;
}

function customerOrderCard(o) {
  const st = overallStatus(o);
  return `<article class="order-card card">
    <div class="oc-head">
      <div><strong>#${esc(o.id)}</strong> <span class="muted">· ${t("placed_on", { date: fmtDateTime(o.created) })}</span></div>
      ${statusPill(st)}
    </div>
    ${orderTracker(st)}
    <p class="oc-slot">🕑 ${t("delivery_on", { slot: esc(slotText(o.slot)) })}</p>
    <div class="oc-farms">
      ${o.farms
        .map((fid) => {
          const f = farmById(fid);
          const items = o.lines.filter((l) => lineFarm(l) === fid);
          return `<div class="oc-farm">
            <div class="oc-farm-head"><a href="#/farm/${fid}">👩‍🌾 ${esc(f ? f.name : fid)}</a> ${statusPill(farmStatusOf(o, fid))}</div>
            <ul class="mini-lines">${items
              .map((l) => `<li><span>${l.qty} × ${esc(lineName(l))}</span><span>${fmtPrice(l.price * l.qty)}</span></li>`)
              .join("")}</ul>
          </div>`;
        })
        .join("")}
    </div>
    <div class="oc-foot">
      <span>${t("total")}: <strong>${fmtPrice(o.total)}</strong></span>
      <button type="button" class="btn btn-outline btn-sm" data-action="reorder" data-id="${esc(o.id)}">🔁 ${t("order_again")}</button>
    </div>
  </article>`;
}

function customerMsgCard(m) {
  const f = farmById(m.farm);
  const fname = f ? f.name : m.farm;
  return `<article class="msg-card card">
    <div class="oc-head"><strong>✉️ ${t("msg_to", { farm: esc(fname) })}</strong><span class="muted">${fmtDateTime(m.at)}</span></div>
    <p class="msg-text">${esc(m.text)}</p>
    ${
      (m.replies || []).length
        ? m.replies
            .map(
              (r) => `<div class="reply"><strong>🧑‍🌾 ${t("msg_reply_from", { farm: esc(fname) })}</strong>
                <span class="muted"> · ${fmtDateTime(r.at)}</span><p>${esc(r.text)}</p></div>`
            )
            .join("")
        : `<p class="muted small">⏳ ${t("msg_waiting")}</p>`
    }
  </article>`;
}

function profileForm(u) {
  const rec = userRecord(u.email) || {};
  const p = rec.profile || {};
  const f = (id, key, val, extra = "") => `<label class="field">
      <span class="field-label">${t(key)}</span>
      <input name="${id}" id="pf-${id}" value="${esc(val || "")}" ${extra} aria-describedby="pe-${id}" />
      <small class="err" id="pe-${id}"></small>
    </label>`;
  return `<form class="card profile-form" id="profile-form" novalidate>
    <div class="form-grid">
      ${f("name", "co_name", u.name, 'autocomplete="name"')}
      ${f("phone", "co_phone", p.phone, 'type="tel" autocomplete="tel"')}
    </div>
    <h3>🏠 ${t("default_address")}</h3>
    <p class="muted small">${t("profile_hint")}</p>
    <div class="form-grid">
      <div class="full">${f("address", "co_address", p.address, 'autocomplete="street-address"')}</div>
      ${f("city", "co_city", p.city, 'autocomplete="address-level2"')}
      ${f("zip", "co_zip", p.zip, 'autocomplete="postal-code" placeholder="110 00"')}
    </div>
    <button type="submit" class="btn btn-primary">💾 ${t("save")}</button>
  </form>`;
}

function saveProfile(form) {
  const v = Object.fromEntries(new FormData(form).entries());
  const checks = {
    name: v.name.trim() ? "" : "err_required",
    phone: !v.phone.trim() || VALIDATORS.phone(v.phone) === "" ? "" : "err_phone",
    zip: !v.zip.trim() || VALIDATORS.zip(v.zip) === "" ? "" : "err_zip",
  };
  let ok = true;
  Object.entries(checks).forEach(([k, err]) => {
    const input = $("#pf-" + k);
    input.setAttribute("aria-invalid", err ? "true" : "false");
    $("#pe-" + k).textContent = err ? t(err) : "";
    if (err) ok = false;
  });
  if (!ok) return;
  updateUserRecord(state.user.email, {
    name: v.name.trim(),
    profile: { phone: v.phone.trim(), address: v.address.trim(), city: v.city.trim(), zip: v.zip.trim() },
  });
  state.user.name = v.name.trim();
  FRStore.set("fr_user", state.user);
  state.draft = {};
  renderAccount();
  render();
  toast(t("profile_saved"));
}

function reorder(orderId) {
  const o = allOrders().find((x) => x.id === orderId);
  if (!o) return;
  let missing = false;
  o.lines.forEach((l) => {
    const p = productById(l.id);
    if (!p || !onSale(p) || p.stock <= 0) {
      missing = true;
      return;
    }
    const want = (state.cart[p.id] || 0) + l.qty;
    if (want > p.stock) missing = true;
    state.cart[p.id] = Math.min(want, p.stock);
  });
  saveCart();
  updateBadge(true);
  toast(t(missing ? "reorder_partial" : "toast_reordered"), missing ? "info" : "ok");
  location.hash = "#/cart";
}

/* ───────────── FARMER PORTAL ───────────── */
function currentFarm() {
  return state.user && state.user.role === "farmer" ? farmById(state.user.farm) : null;
}
function farmOrders(fid) {
  return allOrders().filter((o) => o.farms.includes(fid));
}
function farmMessages(fid) {
  return FRStore.get("fr_messages", [])
    .filter((m) => m.farm === fid)
    .sort((a, b) => (a.at < b.at ? 1 : -1));
}
function farmPart(o, fid) {
  return o.lines.filter((l) => lineFarm(l) === fid).reduce((a, l) => a + l.price * l.qty, 0);
}

function viewFarmer() {
  const f = currentFarm();
  if (!f) return needLogin(true);
  const tabsList = ["overview", "products", "orders", "messages"];
  if (!tabsList.includes(state.fpTab)) state.fpTab = "overview";
  const prods = PRODUCTS.filter((p) => p.farm === f.id);
  const orders = farmOrders(f.id);
  const open = orders.filter((o) => farmStatusOf(o, f.id) !== "delivered");
  const msgs = farmMessages(f.id);
  const unanswered = msgs.filter((m) => !(m.replies || []).length);
  const tabs = [
    ["overview", "📊 " + t("fp_overview")],
    ["products", "🥕 " + t("fp_products"), prods.length],
    ["orders", "📦 " + t("fp_orders"), open.length],
    ["messages", "✉️ " + t("fp_messages"), unanswered.length],
  ];
  let body = "";
  if (state.fpTab === "overview") body = fpOverview(f, prods, orders, open, unanswered);
  else if (state.fpTab === "products") body = fpProducts(f, prods);
  else if (state.fpTab === "orders") body = orders.length ? orders.map((o) => farmerOrderCard(o, f.id)).join("") : `<div class="empty"><p>${t("fp_no_orders")}</p></div>`;
  else body = msgs.length ? msgs.map((m) => farmerMsgCard(m)).join("") : `<div class="empty"><p>${t("fp_no_messages")}</p></div>`;

  return `<section class="page">
    <div class="portal-head">
      <img class="portal-img" src="${f.img}" alt="" />
      <div>
        <p class="kicker">🧑‍🌾 ${t("fp_title")}</p>
        <h1>${esc(f.name)}</h1>
        <p class="muted">${t("farm_owner", { name: esc(f.owner) })} · <a href="#/farm/${f.id}">${t("fp_view_shop")} →</a></p>
      </div>
      <button type="button" class="btn btn-ghost btn-sm portal-reset" data-action="fp-reset">↺ ${t("fp_reset")}</button>
    </div>
    ${tabBar("farmer", tabs, state.fpTab)}
    <div class="tab-body">${body}</div>
  </section>`;
}

function fpOverview(f, prods, orders, open, unanswered) {
  const active = prods.filter(onSale);
  const low = active.filter((p) => p.stock <= 5);
  const revenue = orders.reduce((a, o) => a + farmPart(o, f.id), 0);
  const stat = (icon, n, key, href) =>
    `<a class="stat-card" href="${href}"><span class="stat-icon">${icon}</span><b>${n}</b><span>${t(key)}</span></a>`;
  return `<div class="stat-grid">
      ${stat("🥕", active.length, "fp_stat_products", "#/farmer/products")}
      ${stat("⏳", low.length, "fp_stat_low", "#/farmer/products")}
      ${stat("📦", open.length, "fp_stat_orders", "#/farmer/orders")}
      ${stat("💶", fmtPrice(revenue), "fp_stat_revenue", "#/farmer/orders")}
      ${stat("✉️", unanswered.length, "fp_stat_messages", "#/farmer/messages")}
    </div>
    <div class="grid-2">
      <div class="card">
        <h3>⏳ ${t("fp_low_title")}</h3>
        ${
          low.length
            ? `<ul class="mini-lines">${low
                .map(
                  (p) =>
                    `<li><span>${esc(pname(p))}</span><span class="${p.stock <= 0 ? "txt-danger" : "txt-warn"}">${
                      p.stock <= 0 ? t("sold_out") : t("stock_left", { n: p.stock })
                    }</span></li>`
                )
                .join("")}</ul><a class="btn btn-outline btn-sm" href="#/farmer/products">${t("fp_products")} →</a>`
            : `<p class="muted">✅ ${t("fp_all_good")}</p>`
        }
      </div>
      <div class="card">
        <h3>📦 ${t("fp_recent")}</h3>
        ${
          orders.length
            ? `<ul class="mini-lines">${orders
                .slice(0, 4)
                .map(
                  (o) =>
                    `<li><span>#${esc(o.id)} · ${esc(o.customer.name)}</span><span>${statusPill(farmStatusOf(o, f.id))}</span></li>`
                )
                .join("")}</ul><a class="btn btn-outline btn-sm" href="#/farmer/orders">${t("fp_orders")} →</a>`
            : `<p class="muted">${t("fp_no_orders")}</p>`
        }
      </div>
    </div>`;
}

const PRODUCT_IMAGES = ["tomato", "lettuce", "milk", "strawberry", "carrots", "potato", "bread", "eggs", "cucumber", "corn", "organic", "farm1", "farm2", "farm3"];
const UNITS = ["kg", "l", "box", "pcs10", "loaf", "pcs"];

function fpProducts(f, prods) {
  return `<p class="muted">ℹ️ ${t("fp_hidden_note")}</p>
    <div class="table-wrap card">
      <table class="data-table">
        <thead><tr><th>${t("fp_product")}</th><th>${t("fp_price")}</th><th>${t("fp_stock")}</th><th>${t("fp_active")}</th><th>${t(
    "fp_actions"
  )}</th></tr></thead>
        <tbody>
          ${prods
            .map(
              (p) => `<tr class="${onSale(p) ? "" : "row-off"}">
              <td><div class="tp"><img src="${p.img}" alt="" /><div><strong>${esc(pname(p))}</strong>
                <small class="muted">${catIcon(p.cat)} ${t("cat_" + p.cat)} · / ${unitText(p.unit)}${p.organic ? " · 🌱" : ""}</small></div></div></td>
              <td><input class="mini-input" type="number" min="0" step="0.01" value="${p.price}" data-edit="price" data-id="${p.id}" aria-label="${t(
                "fp_price"
              )}: ${esc(pname(p))}" /></td>
              <td><input class="mini-input" type="number" min="0" step="1" value="${p.stock}" data-edit="stock" data-id="${p.id}" aria-label="${t(
                "fp_stock"
              )}: ${esc(pname(p))}" />
                ${p.stock <= 0 ? `<span class="txt-danger small">${t("sold_out")}</span>` : p.stock <= 5 ? `<span class="txt-warn small">⏳</span>` : ""}</td>
              <td><label class="switch"><input type="checkbox" data-edit="active" data-id="${p.id}" ${onSale(p) ? "checked" : ""} aria-label="${t(
                "fp_active"
              )}: ${esc(pname(p))}" /><span></span></label></td>
              <td><button type="button" class="icon-btn" data-action="fp-delete" data-id="${p.id}" aria-label="${t("fp_delete")}: ${esc(
                pname(p)
              )}" title="${t("fp_delete")}">🗑️</button></td>
            </tr>`
            )
            .join("")}
        </tbody>
      </table>
    </div>

    <form class="card add-form" id="fp-add" novalidate>
      <h3>➕ ${t("fp_add")}</h3>
      <div class="form-grid three">
        <label class="field"><span class="field-label">${t("fp_name_en")} *</span><input name="name_en" id="ap-name_en" aria-describedby="ae-name_en" /><small class="err" id="ae-name_en"></small></label>
        <label class="field"><span class="field-label">${t("fp_name_cs")}</span><input name="name_cs" /></label>
        <label class="field"><span class="field-label">${t("fp_cat")}</span><select name="cat">${CATEGORIES.map(
          (c) => `<option value="${c.id}" ${f.cats[0] === c.id ? "selected" : ""}>${c.icon} ${t("cat_" + c.id)}</option>`
        ).join("")}</select></label>
        <label class="field"><span class="field-label">${t("fp_price")} *</span><input name="price" id="ap-price" type="number" min="0" step="0.01" aria-describedby="ae-price" /><small class="err" id="ae-price"></small></label>
        <label class="field"><span class="field-label">${t("fp_unit")}</span><select name="unit">${UNITS.map((u) => `<option value="${u}">${unitText(u)}</option>`).join(
          ""
        )}</select></label>
        <label class="field"><span class="field-label">${t("fp_stock")} *</span><input name="stock" id="ap-stock" type="number" min="0" step="1" aria-describedby="ae-stock" /><small class="err" id="ae-stock"></small></label>
        <label class="field"><span class="field-label">${t("fp_image")}</span><select name="img" id="ap-img">${PRODUCT_IMAGES.map(
          (i) => `<option value="img/${i}.jpg">${i}</option>`
        ).join("")}</select></label>
        <div class="field img-preview"><img id="ap-preview" src="img/${PRODUCT_IMAGES[0]}.jpg" alt="" /></div>
        <label class="check"><input type="checkbox" name="organic" ${f.organic ? "checked" : ""} /> 🌱 ${t("fp_organic")}</label>
      </div>
      <button type="submit" class="btn btn-primary">➕ ${t("fp_add")}</button>
    </form>`;
}

function farmerOrderCard(o, fid) {
  const st = farmStatusOf(o, fid);
  const next = ORDER_STATUSES[statusIdx(st) + 1];
  const items = o.lines.filter((l) => lineFarm(l) === fid);
  const addr = o.address || {};
  return `<article class="order-card card">
    <div class="oc-head">
      <div><strong>#${esc(o.id)}</strong> <span class="muted">· ${t("placed_on", { date: fmtDateTime(o.created) })}</span></div>
      ${statusPill(st)}
    </div>
    ${orderTracker(st)}
    <div class="oc-cols">
      <div>
        <p><strong>${t("fp_customer")}:</strong> ${esc(o.customer.name)}${o.customer.phone ? ` · <a href="tel:${esc(o.customer.phone.replace(/\s/g, ""))}">${esc(o.customer.phone)}</a>` : ""}</p>
        <p>🏠 ${esc([addr.address, addr.zip, addr.city].filter(Boolean).join(", ") || "—")}</p>
        <p>🕑 ${esc(slotText(o.slot))}</p>
      </div>
      <div>
        <p><strong>${t("fp_items")}:</strong></p>
        <ul class="mini-lines">${items
          .map((l) => `<li><span>${l.qty} × ${esc(lineName(l))}</span><span>${fmtPrice(l.price * l.qty)}</span></li>`)
          .join("")}</ul>
      </div>
    </div>
    <div class="oc-foot">
      <span>${t("fp_farm_total", { amount: `<strong>${fmtPrice(farmPart(o, fid))}</strong>` })}</span>
      ${
        next
          ? `<button type="button" class="btn btn-primary btn-sm" data-action="fp-status" data-id="${esc(o.id)}">➡️ ${t("fp_next", {
              status: t("status_" + next),
            })}</button>`
          : `<span class="txt-ok">✅ ${t("fp_done")}</span>`
      }
    </div>
  </article>`;
}

function farmerMsgCard(m) {
  return `<article class="msg-card card">
    <div class="oc-head"><strong>👤 ${esc(m.name || "Guest")}</strong><span class="muted">${fmtDateTime(m.at)}</span></div>
    <p class="msg-text">${esc(m.text)}</p>
    ${(m.replies || [])
      .map((r) => `<div class="reply"><strong>🧑‍🌾 ${t("msg_you")}</strong><span class="muted"> · ${fmtDateTime(r.at)}</span><p>${esc(r.text)}</p></div>`)
      .join("")}
    <div class="reply-box">
      <textarea id="rt-${m.id}" rows="2" placeholder="${t("fp_reply_ph")}" aria-label="${t("fp_reply")}"></textarea>
      <button type="button" class="btn btn-primary btn-sm" data-action="fp-reply" data-id="${m.id}">${t("fp_reply")}</button>
    </div>
    <small class="err" id="re-${m.id}"></small>
  </article>`;
}

function advanceStatus(orderId) {
  const f = currentFarm();
  if (!f) return;
  const orders = FRStore.get("fr_orders", []);
  const o = orders.find((x) => x.id === orderId);
  if (!o) return;
  o.farmStatus = o.farmStatus || {};
  const cur = farmStatusOf(o, f.id);
  const next = ORDER_STATUSES[statusIdx(cur) + 1];
  if (!next) return;
  o.farmStatus[f.id] = next;
  saveOrders(orders);
  render();
  toast(`#${o.id}: ${t("status_" + next)}`);
}

function deleteProduct(id) {
  const f = currentFarm();
  const i = PRODUCTS.findIndex((p) => p.id === id && f && p.farm === f.id);
  if (i < 0) return;
  const name = pname(PRODUCTS[i]);
  PRODUCTS.splice(i, 1);
  delete state.cart[id];
  saveCart();
  saveCatalog();
  updateBadge();
  render();
  toast(`${t("fp_deleted")}: ${name}`, "info");
}

function sendReply(msgId) {
  const box = $("#rt-" + msgId);
  const text = box.value.trim();
  if (!text) {
    $("#re-" + msgId).textContent = t("err_reply_empty");
    box.focus();
    return;
  }
  const msgs = FRStore.get("fr_messages", []);
  const m = msgs.find((x) => x.id === msgId);
  if (!m) return;
  m.replies = m.replies || [];
  m.replies.push({ text, at: new Date().toISOString() });
  FRStore.set("fr_messages", msgs);
  render();
  toast(t("fp_replied"));
}

function addProduct(form) {
  const f = currentFarm();
  if (!f) return;
  const v = Object.fromEntries(new FormData(form).entries());
  const errs = {
    name_en: v.name_en.trim() ? "" : "err_required",
    price: v.price !== "" && Number(v.price) >= 0 ? "" : v.price === "" ? "err_required" : "err_number",
    stock: v.stock !== "" && Number.isInteger(Number(v.stock)) && Number(v.stock) >= 0 ? "" : v.stock === "" ? "err_required" : "err_number",
  };
  let ok = true;
  Object.entries(errs).forEach(([k, e]) => {
    $("#ap-" + k).setAttribute("aria-invalid", e ? "true" : "false");
    $("#ae-" + k).textContent = e ? t(e) : "";
    if (e) ok = false;
  });
  if (!ok) {
    form.querySelector('[aria-invalid="true"]').focus();
    return;
  }
  const name = { en: v.name_en.trim() };
  if (v.name_cs.trim()) name.cs = v.name_cs.trim();
  PRODUCTS.push({
    id: "p-" + Date.now(),
    farm: f.id,
    cat: v.cat,
    price: Math.round(Number(v.price) * 100) / 100,
    unit: v.unit,
    stock: Number(v.stock),
    active: true,
    organic: !!v.organic,
    img: v.img,
    name,
  });
  saveCatalog();
  render();
  toast(`${t("fp_added")}: ${name.en}`);
}

function bindPortal() {
  const pf = $("#profile-form");
  if (pf) pf.addEventListener("submit", (e) => (e.preventDefault(), saveProfile(pf)));
  const af = $("#fp-add");
  if (af) {
    af.addEventListener("submit", (e) => (e.preventDefault(), addProduct(af)));
    $("#ap-img").addEventListener("change", (e) => ($("#ap-preview").src = e.target.value));
  }
}

// inline edits in the farmer product table (price / stock / on sale)
document.addEventListener("change", (e) => {
  const el = e.target.closest("[data-edit]");
  if (!el) return;
  const f = currentFarm();
  const p = PRODUCTS.find((x) => x.id === el.dataset.id && f && x.farm === f.id);
  if (!p) return;
  const key = el.dataset.edit;
  if (key === "active") {
    p.active = el.checked;
    el.closest("tr").classList.toggle("row-off", !el.checked);
  } else {
    const n = Number(el.value);
    const valid = el.value !== "" && n >= 0 && (key === "price" || Number.isInteger(n));
    el.setAttribute("aria-invalid", valid ? "false" : "true");
    if (!valid) {
      toast(t("err_number"), "info");
      return;
    }
    p[key] = key === "price" ? Math.round(n * 100) / 100 : n;
    if (key === "stock" && state.cart[p.id] > n) {
      if (n > 0) state.cart[p.id] = n;
      else delete state.cart[p.id];
      saveCart();
      updateBadge();
    }
  }
  saveCatalog();
  toast(t("fp_saved"));
});

/* ───────────── header account ───────────── */
function renderAccount() {
  const slot = $("#account-slot");
  if (state.user) {
    const first = String(state.user.name || "").split(" ")[0];
    const link =
      state.user.role === "farmer"
        ? `<a class="acct-link" href="#/farmer" data-route="farmer">🧑‍🌾 ${t("nav_farmer")}</a>`
        : `<a class="acct-link" href="#/account" data-route="account" title="${t("nav_account")}">👤 ${t("hello", { name: esc(first) })}</a>`;
    slot.innerHTML = `${link}
      <button type="button" class="link-btn light" data-action="logout">${t("nav_logout")}</button>`;
  } else {
    slot.innerHTML = `<a class="btn btn-light btn-sm" href="login.html">👤 ${t("nav_login")}</a>`;
  }
}

/* ───────────── router ───────────── */
function parseHash() {
  const raw = location.hash.replace(/^#\/?/, "");
  const [path, qs] = raw.split("?");
  const parts = path.split("/").filter(Boolean).map(decodeURIComponent);
  return { page: parts[0] || "home", param: parts[1] || null, qs: new URLSearchParams(qs || "") };
}

let lastQueryHash = null;
function render() {
  stopCarousel();
  const r = parseHash();
  state.route = r;
  const view = $("#view");

  if (r.page === "browse" && location.hash !== lastQueryHash) {
    lastQueryHash = location.hash;
    if (r.qs.has("q")) state.browse.q = r.qs.get("q");
    if (r.qs.has("cat")) state.browse.cat = r.qs.get("cat");
  }

  const views = {
    home: viewHome,
    browse: viewBrowse,
    map: viewMap,
    farm: () => viewFarm(r.param),
    cart: viewCart,
    checkout: viewCheckout,
    order: () => viewOrder(r.param),
    account: viewAccount,
    farmer: viewFarmer,
  };
  if (r.page === "account" && r.param) state.accTab = r.param;
  if (r.page === "farmer" && r.param) state.fpTab = r.param;
  view.innerHTML = (views[r.page] || viewNotFound)();

  if (r.page === "home") bindCarousel();
  if (r.page === "browse") bindBrowse();
  if (r.page === "map") renderMapParts();
  if (r.page === "checkout") bindCheckout();
  if (r.page === "farmer" || r.page === "account") bindPortal();

  const navPage = r.page === "farm" ? "map" : r.page === "checkout" || r.page === "order" ? "cart" : r.page;
  $$("[data-route]").forEach((a) => {
    const on = a.dataset.route === navPage;
    a.classList.toggle("active", on);
    if (on) a.setAttribute("aria-current", "page");
    else a.removeAttribute("aria-current");
  });
  document.title = t("page_title");
}

/* ───────────── events ───────────── */
document.addEventListener("click", (e) => {
  const el = e.target.closest("[data-action]");
  if (!el) {
    if (e.target.id === "modal") closeModal();
    return;
  }
  const id = el.dataset.id;
  const p = id && productById(id);
  switch (el.dataset.action) {
    case "add":
      setQty(id, 1);
      toast(t("toast_added", { name: pname(p) }));
      break;
    case "inc":
      setQty(id, (state.cart[id] || 0) + 1);
      break;
    case "dec": {
      const q = (state.cart[id] || 0) - 1;
      setQty(id, q);
      if (q <= 0) toast(t("toast_removed", { name: pname(p) }), "info");
      break;
    }
    case "remove":
      setQty(id, 0);
      toast(t("toast_removed", { name: pname(p) }), "info");
      break;
    case "filter": {
      const scope = state[el.dataset.scope];
      const key = el.dataset.key;
      scope[key] = key === "dist" ? Number(el.dataset.value) : el.dataset.value;
      $$(`.chip[data-scope="${el.dataset.scope}"][data-key="${key}"]`).forEach((c) => {
        const on = c === el;
        c.classList.toggle("active", on);
        c.setAttribute("aria-pressed", on);
      });
      if (el.dataset.scope === "browse") renderResults();
      else {
        if (state.map.selected && !mapMatch(farmById(state.map.selected))) state.map.selected = null;
        renderMapParts();
      }
      break;
    }
    case "clear-filters":
      state.browse = { q: "", cat: "all", dist: 0, organic: false, sort: "relevance" };
      if (location.hash.includes("?")) location.hash = "#/browse";
      else render();
      break;
    case "pin":
      state.map.selected = id;
      renderMapParts();
      break;
    case "car-prev":
      goSlide(carIdx - 1);
      break;
    case "car-next":
      goSlide(carIdx + 1);
      break;
    case "car-go":
      goSlide(Number(el.dataset.index));
      break;
    case "follow": {
      const f = farmById(id);
      const i = state.follows.indexOf(id);
      if (i >= 0) state.follows.splice(i, 1);
      else state.follows.push(id);
      FRStore.set("fr_follow", state.follows);
      const on = state.follows.includes(id);
      el.className = "btn " + (on ? "btn-secondary" : "btn-primary");
      el.setAttribute("aria-pressed", on);
      el.textContent = on ? t("following") : "＋ " + t("follow");
      toast(t(on ? "toast_followed" : "toast_unfollowed", { farm: f.name }), on ? "ok" : "info");
      break;
    }
    case "message":
      openMessage(id);
      break;
    case "msg-send": {
      const text = $("#m-text").value.trim();
      if (!text) {
        $("#m-err").textContent = t("msg_empty");
        $("#m-text").focus();
        return;
      }
      const msgs = FRStore.get("fr_messages", []);
      msgs.push({
        id: "m-" + Date.now(),
        farm: id,
        text,
        at: new Date().toISOString(),
        from: state.user ? state.user.email : null,
        name: state.user ? state.user.name : "Guest",
        replies: [],
      });
      FRStore.set("fr_messages", msgs);
      closeModal();
      toast(t("msg_sent", { farm: farmById(id).name }));
      break;
    }
    case "modal-close":
      closeModal();
      break;
    case "back":
      if (history.length > 1) history.back();
      else location.hash = "#/map";
      break;
    case "go":
      location.hash = el.dataset.href;
      break;
    case "reorder":
      reorder(id);
      break;
    case "fp-status":
      advanceStatus(id);
      break;
    case "fp-delete":
      deleteProduct(id);
      break;
    case "fp-reply":
      sendReply(id);
      break;
    case "fp-reset":
      ensureDemoData(true);
      state.cart = {};
      state.follows = [];
      updateBadge();
      render();
      toast(t("fp_reset_done"), "info");
      break;
    case "logout":
      state.user = null;
      FRStore.remove("fr_user");
      renderAccount();
      toast(t("logged_out"), "info");
      if (["account", "farmer"].includes(state.route.page)) location.hash = "#/home";
      break;
  }
});

// keyboard support for SVG map pins
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !$("#modal").hidden) closeModal();
  const pin = e.target.closest && e.target.closest(".pin");
  if (pin && (e.key === "Enter" || e.key === " ")) {
    e.preventDefault();
    state.map.selected = pin.dataset.id;
    renderMapParts();
    const again = $(`.pin[data-id="${pin.dataset.id}"]`);
    if (again) again.focus();
  }
});

document.addEventListener("submit", (e) => {
  if (e.target.dataset.form === "search") {
    e.preventDefault();
    const q = new FormData(e.target).get("q") || "";
    state.browse = { q: "", cat: "all", dist: 0, organic: false, sort: "relevance" };
    location.hash = "#/browse?q=" + encodeURIComponent(q.trim());
  }
});

window.addEventListener("hashchange", () => {
  render();
  window.scrollTo(0, 0);
  $("#view").focus({ preventScroll: true });
});

document.addEventListener("langchange", () => {
  renderAccount();
  render();
});

/* ───────────── boot ───────────── */
initLangPicker($("#lang-bar"));
applyI18n();
renderAccount();
updateBadge();
if (!location.hash) history.replaceState(null, "", "#/home");
render();

const flash = FRStore.get("fr_flash", null);
if (flash) {
  FRStore.remove("fr_flash");
  toast(t(flash));
}
