/* Renders the box from data/items.json. Edit that file to change the saves. */

const TYPES = [
  { id: "recipe", label: "Recipes", tag: "Recipe" },
  { id: "article", label: "Articles", tag: "Article" },
  { id: "meme", label: "Memes", tag: "Meme" },
  { id: "note", label: "Notes", tag: "Note" },
];

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const PIN_ICON = '<svg class="pin-icon" viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M8.8 1.5 10 5.2l3.8.3-2.9 2.5.9 3.7L8 9.7 4.2 11.7l.9-3.7-2.9-2.5 3.8-.3L8 1.5Z"/></svg>';

const PAGE_TITLE = "Rebecca’s Saves";
const BACK_ICON = '<svg class="back-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M14.5 5.5 8 12l6.5 6.5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';

const box = document.getElementById("box");
const boxWrap = document.getElementById("box-wrap");
const countEl = document.getElementById("count");
const searchForm = document.getElementById("search-form");
const searchInput = document.getElementById("q");
const tabs = Array.from(document.querySelectorAll(".folder-tab"));

let items = [];
let filter = "recent";
let query = "";
let ready = false;
let cameFromList = false;
let listScroll = 0;

function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[ch]));
}

function safeHttpUrl(url) {
  const value = String(url || "").trim();
  return /^https:\/\/[^\s"'<>]+$/i.test(value) ? value : "";
}

function safeImage(src) {
  const value = String(src || "").trim();
  return /^(?:images\/|\.\/images\/)[a-z0-9._/-]+\.(?:svg|png|jpe?g|webp)$/i.test(value) ? value : "";
}

function formatDate(iso) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || "").trim());
  if (!match) return String(iso || "").trim();
  const month = MONTHS[Number(match[2]) - 1];
  if (!month) return String(iso);
  return `${month} ${Number(match[3])}`;
}

function typeMeta(id) {
  return TYPES.find((type) => type.id === id) || { id, label: id, tag: id };
}

function normalize(raw) {
  if (!raw || typeof raw !== "object") return null;
  const type = String(raw.type || "").toLowerCase();
  if (!TYPES.some((entry) => entry.id === type)) return null;
  const title = String(raw.title || "").trim();
  if (!title) return null;
  return {
    id: String(raw.id || title).trim(),
    type,
    title,
    summary: String(raw.summary || "").trim(),
    note: String(raw.note || "").trim(),
    date_saved: String(raw.date_saved || "").trim(),
    url: safeHttpUrl(raw.url),
    image: safeImage(raw.image),
  };
}

function haystack(item) {
  const meta = typeMeta(item.type);
  return [
    item.title,
    item.summary,
    item.note,
    item.type,
    meta.label,
    meta.tag,
    formatDate(item.date_saved),
    item.date_saved,
  ].join(" ").toLowerCase();
}

function isMatch(item) {
  if (filter !== "recent" && item.type !== filter) return false;
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return true;
  const hay = haystack(item);
  return words.every((word) => hay.includes(word));
}

function byNewest(a, b) {
  if (a.date_saved !== b.date_saved) return a.date_saved < b.date_saved ? 1 : -1;
  return b.order - a.order;
}

function countLabel(total) {
  if (total === 0 && query.trim()) return "No matches";
  if (total === 0) return "Nothing saved yet";
  if (total === 1) return "1 saved thing";
  return `${total} saved things`;
}

function metaHtml(item) {
  const meta = typeMeta(item.type);
  const date = formatDate(item.date_saved);
  const note = item.note
    ? `<span class="pin">${PIN_ICON}${esc(item.note)}</span>`
    : "";
  const dateHtml = date ? `<span class="date">${esc(date)}</span>` : "";
  return `<div class="meta"><span class="tag ${esc(item.type)}">${esc(meta.tag)}</span>${dateHtml}${note}</div>`;
}

function itemHash(id) {
  return `#item/${encodeURIComponent(id)}`;
}

function itemIdFromHash() {
  const match = /^#item\/(.+)$/.exec(location.hash || "");
  if (!match) return "";
  try {
    return decodeURIComponent(match[1]);
  } catch (error) {
    return "";
  }
}

function cardHtml(item) {
  const image = item.image
    ? `<div class="thumb"><img src="${esc(item.image)}" alt="" width="64" height="64"></div>`
    : `<div class="thumb thumb-fallback" aria-hidden="true"></div>`;
  const body = `<div class="body">${metaHtml(item)}<h3 class="title">${esc(item.title)}</h3><p class="summary">${esc(item.summary)}</p></div>`;
  return `<a class="index-card ${esc(item.type)}" href="${esc(itemHash(item.id))}">${image}${body}</a>`;
}

function detailHtml(item) {
  const alt = item.type === "meme" ? esc(item.title) : "";
  const photo = item.image
    ? `<img class="detail-photo" src="${esc(item.image)}" alt="${alt}" width="800" height="800">`
    : "";
  const original = item.url
    ? `<a class="open-original" href="${esc(item.url)}" target="_blank" rel="noopener noreferrer">Open the original</a>`
    : "";
  return (
    `<div class="detail">` +
      `<button type="button" class="back-btn" data-back>${BACK_ICON}Back</button>` +
      `<article class="detail-card ${esc(item.type)}">` +
        `${photo}${metaHtml(item)}<h2 class="title">${esc(item.title)}</h2>` +
        `<p class="detail-copy">${esc(item.summary)}</p>${original}` +
      `</article>` +
    `</div>`
  );
}

function searchPrompt() {
  if (filter === "recent") return "Search your saves";
  return `Search ${typeMeta(filter).label.toLowerCase()}`;
}

function render() {
  const visible = items.filter(isMatch).sort(byNewest);
  countEl.textContent = countLabel(visible.length);
  searchInput.placeholder = `${searchPrompt()}…`;
  searchInput.setAttribute("aria-label", searchPrompt());

  tabs.forEach((tab) => {
    const selected = tab.dataset.type === filter;
    tab.classList.toggle("on", selected);
    tab.setAttribute("aria-pressed", String(selected));
  });

  boxWrap.className = `box view-${filter}${filter === "recent" ? "" : " is-filtered"}`;

  if (!items.length) {
    box.innerHTML = '<p class="empty">Nothing has been saved yet. Add some to data/items.json.</p>';
    return;
  }

  if (!visible.length) {
    const where = filter === "recent" ? "your saves" : typeMeta(filter).label.toLowerCase();
    box.innerHTML = `<div class="empty"><p>Nothing in ${esc(where)} matches that.</p></div>`;
    return;
  }

  const view = filter === "recent" ? { id: "recent", label: "Recent" } : typeMeta(filter);
  box.innerHTML =
    `<section class="section ${esc(view.id)}" id="section-${esc(view.id)}">` +
      `<header class="divider"><h2 class="tab-label">${esc(view.label)}</h2><span class="sec-count">${visible.length}</span></header>` +
      `<div class="list">${visible.map(cardHtml).join("")}</div>` +
    `</section>`;
}

function focusDetail() {
  const title = box.querySelector(".detail-card .title") || box.querySelector(".empty");
  if (!title) return;
  title.setAttribute("tabindex", "-1");
  title.focus({ preventScroll: true });
}

function showList() {
  document.body.classList.remove("is-detail");
  document.title = PAGE_TITLE;
  render();
}

function showDetail(id) {
  const item = items.find((entry) => entry.id === id);
  document.body.classList.add("is-detail");
  if (!item) {
    document.title = PAGE_TITLE;
    box.innerHTML =
      `<div class="detail">` +
        `<button type="button" class="back-btn" data-back>${BACK_ICON}Back</button>` +
        `<p class="empty">That save isn’t in the box.</p>` +
      `</div>`;
    focusDetail();
    return;
  }
  document.title = `${item.title} — ${PAGE_TITLE}`;
  box.innerHTML = detailHtml(item);
  focusDetail();
}

function syncView() {
  if (!ready) return;
  const id = itemIdFromHash();
  if (id) {
    if (!document.body.classList.contains("is-detail")) listScroll = window.scrollY;
    showDetail(id);
    window.scrollTo(0, 0);
    return;
  }
  const returning = document.body.classList.contains("is-detail");
  showList();
  if (returning) window.scrollTo(0, listScroll);
}

function goBack() {
  if (cameFromList) {
    cameFromList = false;
    history.back();
    return;
  }
  history.replaceState({ box: "list" }, "", location.pathname + location.search);
  showList();
}

function boot() {
  searchForm.addEventListener("submit", (event) => event.preventDefault());
  searchInput.addEventListener("input", () => {
    query = searchInput.value;
    if (!itemIdFromHash()) render();
  });

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      filter = tab.dataset.type;
      if (!itemIdFromHash()) render();
    });
  });

  box.addEventListener("click", (event) => {
    if (event.target.closest("[data-back]")) {
      event.preventDefault();
      goBack();
      return;
    }
    if (event.target.closest("a.index-card")) cameFromList = true;
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && itemIdFromHash()) goBack();
  });

  window.addEventListener("hashchange", () => {
    if (!itemIdFromHash()) cameFromList = false;
    syncView();
  });

  fetch("data/items.json")
    .then((response) => {
      if (!response.ok) throw new Error("Could not open the saves");
      return response.json();
    })
    .then((data) => {
      if (!Array.isArray(data)) throw new Error("Saves file is not a list");
      items = data.map((raw, index) => {
        const item = normalize(raw);
        if (!item) return null;
        item.order = index;
        return item;
      }).filter(Boolean);
      ready = true;
      syncView();
    })
    .catch(() => {
      countEl.textContent = "Saved things";
      box.innerHTML = '<p class="empty">The saves could not be opened. If the data file was just edited, check that it is still valid JSON.</p>';
    });

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("sw.js").catch(() => {});
    });
  }
}

boot();
