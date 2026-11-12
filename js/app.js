/* Renders the box from data/items.json. Edit that file to change the saves. */

const TYPES = [
  { id: "recipe", label: "Recipes", tag: "Recipe" },
  { id: "article", label: "Articles", tag: "Article" },
  { id: "meme", label: "Memes", tag: "Meme" },
  { id: "note", label: "Notes", tag: "Note" },
];

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const PIN_ICON = '<svg class="pin-icon" viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M8.8 1.5 10 5.2l3.8.3-2.9 2.5.9 3.7L8 9.7 4.2 11.7l.9-3.7-2.9-2.5 3.8-.3L8 1.5Z"/></svg>';

const box = document.getElementById("box");
const boxWrap = document.getElementById("box-wrap");
const countEl = document.getElementById("count");
const searchForm = document.getElementById("search-form");
const searchInput = document.getElementById("q");
const tabs = Array.from(document.querySelectorAll(".folder-tab"));
const lightbox = document.getElementById("lightbox");
const lightboxImg = document.getElementById("lightbox-img");
const lightboxTitle = document.getElementById("lightbox-title");
const lightboxSummary = document.getElementById("lightbox-summary");
const lightboxMeta = document.getElementById("lightbox-meta");

let items = [];
let filter = "all";
let query = "";

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
  if (filter !== "all" && item.type !== filter) return false;
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return true;
  const hay = haystack(item);
  return words.every((word) => hay.includes(word));
}

function countLabel(total) {
  if (total === 0 && (query.trim() || filter !== "all")) return "No matches";
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

function cardHtml(item) {
  const image = item.image
    ? `<div class="thumb"><img src="${esc(item.image)}" alt="" width="64" height="64"></div>`
    : `<div class="thumb thumb-fallback" aria-hidden="true"></div>`;
  const body = `<div class="body">${metaHtml(item)}<h3 class="title">${esc(item.title)}</h3><p class="summary">${esc(item.summary)}</p></div>`;
  if (item.type === "meme") {
    return `<button type="button" class="index-card" data-meme="${esc(item.id)}">${image}${body}</button>`;
  }
  if (item.url) {
    return `<a class="index-card" href="${esc(item.url)}" target="_blank" rel="noopener noreferrer">${image}${body}</a>`;
  }
  return `<article class="index-card">${image}${body}</article>`;
}

function render() {
  const visible = items.filter(isMatch);
  countEl.textContent = countLabel(visible.length);

  tabs.forEach((tab) => {
    const selected = filter !== "all" && tab.dataset.type === filter;
    const front = filter === "all" ? tab.dataset.type === "recipe" : selected;
    tab.classList.toggle("on", front);
    tab.setAttribute("aria-pressed", String(selected));
  });

  boxWrap.className = `box filter-${filter}${filter === "all" ? "" : " is-filtered"}`;

  if (!items.length) {
    box.innerHTML = '<p class="empty">Nothing has been saved yet. Add some to data/items.json.</p>';
    return;
  }

  const sections = TYPES.map((type) => {
    const group = visible.filter((item) => item.type === type.id);
    return { type, group };
  }).filter((section) => section.group.length);

  const parts = [];
  if (filter !== "all") {
    const label = typeMeta(filter).label.toLowerCase();
    parts.push(
      `<div class="filter-note"><span>Showing ${esc(label)}</span><button type="button" class="show-all" data-show-all>Show everything</button></div>`
    );
  }

  if (!sections.length) {
    const again = filter !== "all"
      ? '<button type="button" class="show-all" data-show-all>Show everything</button>'
      : "";
    parts.push(`<div class="empty"><p>Nothing in the box matches that.</p>${again}</div>`);
  } else {
    sections.forEach(({ type, group }) => {
      const cards = group.map(cardHtml).join("");
      parts.push(
        `<section class="section ${esc(type.id)}" id="section-${esc(type.id)}">` +
          `<header class="divider"><h2 class="tab-label">${esc(type.label)}</h2><span class="sec-count">${group.length}</span></header>` +
          `<div class="list">${cards}</div>` +
        `</section>`
      );
    });
  }

  box.innerHTML = parts.join("");
}

function openMeme(id) {
  const item = items.find((entry) => entry.id === id);
  if (!item) return;
  lightboxMeta.innerHTML = metaHtml(item);
  lightboxTitle.textContent = item.title;
  lightboxSummary.textContent = item.summary;
  if (item.image) {
    lightboxImg.src = item.image;
    lightboxImg.alt = item.title;
    lightboxImg.hidden = false;
  } else {
    lightboxImg.removeAttribute("src");
    lightboxImg.alt = "";
    lightboxImg.hidden = true;
  }
  if (!lightbox.open) lightbox.showModal();
}

function boot() {
  searchForm.addEventListener("submit", (event) => event.preventDefault());
  searchInput.addEventListener("input", () => {
    query = searchInput.value;
    if (query.trim()) filter = "all";
    render();
  });

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const type = tab.dataset.type;
      filter = filter === type ? "all" : type;
      render();
    });
  });

  box.addEventListener("click", (event) => {
    const showAll = event.target.closest("[data-show-all]");
    if (showAll) {
      filter = "all";
      render();
      return;
    }
    const meme = event.target.closest("[data-meme]");
    if (meme) openMeme(meme.dataset.meme);
  });

  document.getElementById("lightbox-close").addEventListener("click", () => {
    lightbox.close();
  });
  lightbox.addEventListener("click", (event) => {
    if (event.target === lightbox) lightbox.close();
  });

  fetch("data/items.json")
    .then((response) => {
      if (!response.ok) throw new Error("Could not open the saves");
      return response.json();
    })
    .then((data) => {
      if (!Array.isArray(data)) throw new Error("Saves file is not a list");
      items = data.map(normalize).filter(Boolean);
      render();
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
