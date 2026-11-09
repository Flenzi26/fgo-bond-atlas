const compounds = {
  "秩序且善": ["秩序", "善"],
  "秩序的女性": ["秩序", "女性"],
  "混沌且七骑士": ["混沌", "七骑士"],
};

export function benefits(craft, servant, region) {
  if (craft.category === "all") return true;
  if (craft.category === "class") return servant.class === craft.condition;
  if (craft.category !== "traits") throw new Error("Unknown craft category");
  const has = (tag) => servant.tags.includes(tag);
  const condition = craft.condition;
  if (condition === "持有灵衣之人") return region === "cn" ? servant.costumeCn : servant.costume;
  if (condition === "星之力或恶") return has("星之力") || has("恶");
  if (Object.hasOwn(compounds, condition)) return compounds[condition].every(has);
  return has(condition);
}

export function scope(rows, region) {
  return region === "cn" ? rows.filter((row) => row.cn) : rows;
}

function normalized(value) {
  return String(value).normalize("NFKC").toLowerCase();
}

export function matchesSearch(row, input, extra = "") {
  const terms = normalized(input).trim().split(/\s+/u).filter(Boolean);
  const haystack = normalized([row.name, row.aliases, extra].join(" "));
  return terms.every((term) => {
    if (/^#?\d+$/u.test(term)) return Number(term.replace(/^#/u, "")) === row.id;
    return haystack.includes(term);
  });
}

export function queryServants(servants, craft, { region, cls = "", star = "", search = "" }) {
  return scope(servants, region)
    .filter((s) => benefits(craft, s, region) && (!cls || s.class === cls)
      && (star === "" || s.rarity === Number(star)) && matchesSearch(s, search))
    .sort((a, b) => b.rarity - a.rarity || a.id - b.id);
}
