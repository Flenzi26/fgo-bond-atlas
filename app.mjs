import { matchesSearch, queryServants, scope } from "./query.mjs";

const $ = (id) => document.getElementById(id);
const el = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
};
const pageSize = 24;
const preferredCraft = 2052;
const filters = { region: "cn", cls: "", star: "", search: "" };
const categories = [["", "全部"], ["traits", "按特性"], ["class", "按职阶"], ["all", "全队通用"]];
let data, selected, results, visible, category = "";

function wikiLink(label, url, className) {
  const a = el("a", className, label);
  a.href = url;
  a.target = "_blank";
  a.rel = "noopener";
  return a;
}

function imageBox(className, url, fallback, lazy = true) {
  const box = el("span", className, fallback);
  box.setAttribute("aria-hidden", "true");
  const img = el("img");
  img.alt = "";
  img.decoding = "async";
  if (lazy) img.loading = "lazy";
  img.addEventListener("error", () => img.replaceWith(document.createTextNode(fallback)), { once: true });
  box.replaceChildren(img);
  img.src = url;
  return box;
}

const gain = ({ value, unit }) => `+${value}${unit}`;
const conditionName = (craft) => craft.category === "class"
  ? `${data.classes[craft.condition]} · ${craft.condition}` : craft.condition;
const rarity = (n) => n === 0 ? "0 星" : "★".repeat(n);
const padded = (number) => String(number).padStart(3, "0");

function setEffect() {
  $("chosen-name").textContent = selected.name;
  $("chosen-caption").textContent = `NO. ${padded(selected.id)} · ${conditionName(selected)}`;
  const art = imageBox("choice-art", selected.img, "✦", false);
  art.id = "chosen-art";
  $("chosen-art").replaceWith(art);
  const badges = [];
  const add = (label, value) => {
    const badge = el("span", "", label);
    badge.append(el("strong", "", value));
    badges.push(badge);
  };
  add(selected.max ? "未满破" : "牵绊", gain(selected.base));
  if (selected.base.support !== undefined) add("未满破助战", `+${selected.base.support}%`);
  if (selected.max) add("满破", gain(selected.max));
  if (selected.max?.support !== undefined) add("满破助战", `+${selected.max.support}%`);
  $("effect").replaceChildren(...badges);
  $("condition").textContent = selected.category === "all" ? "适用于队伍中可获得牵绊的从者。"
    : selected.condition === "持有灵衣之人" && filters.region === "cn"
      ? "适用条件：拥有在国服实装灵衣的从者。"
      : `适用条件：${conditionName(selected)}。`;
  $("craft-link").href = selected.url;
  $("craft-link").hidden = false;
}

function updateUrl() {
  const url = new URL(location.href);
  const values = { ce: selected.id, region: filters.region === "all" ? "all" : "", class: filters.cls, star: filters.star };
  for (const [key, value] of Object.entries(values)) {
    if (value === "") url.searchParams.delete(key);
    else url.searchParams.set(key, value);
  }
  history.replaceState(null, "", url);
}

function renderServant(s) {
  const li = el("li");
  const a = wikiLink("", s.url, "servant");
  const entry = el("span", "entry");
  const meta = el("span", "entry-meta");
  const cls = el("span", "class-tag");
  const icon = el("img");
  icon.alt = "";
  icon.loading = "lazy";
  icon.src = s.classImg;
  icon.addEventListener("error", () => icon.remove(), { once: true });
  cls.append(icon, document.createTextNode(data.classes[s.class]));
  const stars = el("span", "stars", rarity(s.rarity));
  stars.setAttribute("aria-label", `${s.rarity} 星`);
  meta.append(cls, stars);
  if (!s.cn) meta.append(el("span", "", "国服未实装"));
  entry.append(el("strong", "servant-name", s.name), meta, el("span", "entry-id", `NO. ${padded(s.id)}`));
  const arrow = el("span", "corner", "↗");
  arrow.setAttribute("aria-hidden", "true");
  a.append(imageBox("portrait", s.img, padded(s.id)), entry, arrow);
  li.append(a);
  return li;
}

function appendResults(moveFocus = false) {
  const batch = results.slice(visible, visible + pageSize).map(renderServant);
  visible += batch.length;
  $("roster").append(...batch);
  $("more").hidden = visible >= results.length;
  $("more").textContent = `显示更多从者（还剩 ${results.length - visible} 骑）`;
  if (moveFocus) batch[0]?.firstElementChild.focus({ preventScroll: true });
}

function renderResults() {
  results = queryServants(data.servants, selected, filters);
  visible = 0;
  $("roster").replaceChildren();
  $("match-count").textContent = `${results.length} 骑`;
  const constraints = [conditionName(selected), filters.cls && data.classes[filters.cls], filters.star !== "" && `${filters.star} 星`].filter(Boolean);
  $("result-note").textContent = `${constraints.join(" · ")}　／　找到 ${results.length} 骑从者`;
  $("empty").hidden = results.length !== 0;
  appendResults();
  for (const button of $("star-filter").children) button.setAttribute("aria-pressed", String(button.dataset.value === filters.star));
}

function selectCraft(craft) {
  selected = craft;
  setEffect();
  updateUrl();
  renderResults();
}

function resetFilters() {
  Object.assign(filters, { cls: "", star: "", search: "" });
  $("class-filter").value = "";
  $("servant-search").value = "";
  updateUrl();
  renderResults();
}

function renderRegion(requestedId) {
  const crafts = scope(data.crafts, filters.region);
  const servants = scope(data.servants, filters.region);
  $("craft-total").textContent = crafts.length;
  $("servant-total").textContent = servants.length;
  const classIds = new Set(servants.map((s) => s.class));
  const options = [new Option("全部职阶", ""), ...Object.entries(data.classes)
    .filter(([key]) => classIds.has(key))
    .map(([key, label]) => new Option(key === label ? label : `${label} · ${key}`, key))];
  $("class-filter").replaceChildren(...options);
  if (!classIds.has(filters.cls)) filters.cls = "";
  $("class-filter").value = filters.cls;
  selectCraft(crafts.find((c) => c.id === requestedId)
    ?? crafts.find((c) => c.id === preferredCraft) ?? crafts[0]);
}

function renderPicker() {
  for (const button of $("scope-options").children) button.setAttribute("aria-pressed", String(button.dataset.value === category));
  const input = $("craft-search").value;
  const visibleCrafts = scope(data.crafts, filters.region)
    .filter((c) => (!category || c.category === category)
      && matchesSearch(c, input, conditionName(c) + (c.condition === "Fate/stay night 从者" ? " FSN" : "")))
    .sort((a, b) => Number(b.id === selected.id) - Number(a.id === selected.id)
      || Number(b.category !== "all") - Number(a.category !== "all") || b.id - a.id);
  $("picker-status").textContent = visibleCrafts.length ? `${visibleCrafts.length} 张礼装` : "没有符合条件的礼装，试试其他关键词。";
  $("picker-list").replaceChildren(...visibleCrafts.map((c) => {
    const button = el("button", "pick-item");
    button.type = "button";
    if (c.id === selected.id) button.setAttribute("aria-current", "true");
    const title = el("span", "picker-title-text");
    title.append(el("strong", "", c.name), el("small", "", `NO. ${padded(c.id)} · ${conditionName(c)}${c.cn ? "" : " · 国服未实装"}`));
    button.append(imageBox("mini-art", c.img, "✦"), title, el("span", "pick-gain", gain(c.max ?? c.base)));
    button.addEventListener("click", () => {
      selectCraft(c);
      $("picker").close();
    });
    return button;
  }));
  $("picker-list").scrollTop = 0;
}

function buildButtons(id, pairs, select) {
  $(id).replaceChildren(...pairs.map(([value, label]) => {
    const button = el("button", "", label);
    button.type = "button";
    button.dataset.value = value;
    button.setAttribute("aria-pressed", String(value === ""));
    button.addEventListener("click", () => select(value));
    return button;
  }));
}

async function init() {
  $("load-error").hidden = true;
  $("desk").setAttribute("aria-busy", "true");
  try {
    const response = await fetch("./data.json");
    if (!response.ok) throw new Error(`Data request: ${response.status}`);
    data = await response.json();
    if (!data.crafts?.length || !data.servants?.length || !data.classes) throw new Error("Invalid catalogue");
    const url = new URLSearchParams(location.search);
    filters.region = url.get("region") === "all" ? "all" : "cn";
    filters.cls = url.get("class") || "";
    const star = url.get("star") || "";
    filters.star = /^[0-5]$/u.test(star) ? star : "";
    $("region").value = filters.region;
    $("snapshot").dateTime = data.date;
    $("snapshot").textContent = data.date;
    buildButtons("star-filter", [["", "全部"], ...[5, 4, 3, 2, 1, 0].map((n) => [String(n), `${n}★`])], (value) => {
      filters.star = value;
      updateUrl();
      renderResults();
    });
    buildButtons("scope-options", categories, (value) => { category = value; renderPicker(); });
    renderRegion(Number(url.get("ce")));
    for (const id of ["region", "reset", "open-picker", "class-filter", "servant-search"]) $(id).disabled = false;
  } catch (error) {
    console.error(error);
    $("load-error").hidden = false;
    $("result-note").textContent = "图鉴暂不可用";
  } finally {
    $("desk").setAttribute("aria-busy", "false");
  }
}

$("region").addEventListener("change", () => {
  filters.region = $("region").value;
  renderRegion(selected.id);
});
$("class-filter").addEventListener("change", () => {
  filters.cls = $("class-filter").value;
  updateUrl();
  renderResults();
});
$("servant-search").addEventListener("input", () => {
  filters.search = $("servant-search").value;
  renderResults();
});
$("reset").addEventListener("click", resetFilters);
$("empty-reset").addEventListener("click", () => { resetFilters(); $("class-filter").focus(); });
$("more").addEventListener("click", () => appendResults(true));
$("retry").addEventListener("click", init);
$("open-picker").addEventListener("click", () => {
  category = "";
  $("craft-search").value = "";
  renderPicker();
  $("picker").showModal();
  $("close-picker").focus();
});
$("craft-search").addEventListener("input", renderPicker);
$("close-picker").addEventListener("click", () => $("picker").close());
$("picker").addEventListener("close", () => $("open-picker").focus());
$("picker").addEventListener("click", (event) => {
  if (event.target !== $("picker")) return;
  const rect = $("picker").getBoundingClientRect();
  if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) $("picker").close();
});
init();
