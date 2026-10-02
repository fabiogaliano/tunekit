// Fetches the curated palette collections the picker's Library offers and writes them to src/color/data/curated.ts.
// Run with `bun scripts/palettes.ts` to refresh them. Every collection here is MIT or CC0; check before adding one
// that isn't.
const RAW = "https://raw.githubusercontent.com";
const get = async (path: string) => {
  const r = await fetch(`${RAW}/${path}`);
  if (!r.ok) throw new Error(`${path}: ${r.status}`);
  return r.text();
};

type Palette = [name: string, colors: string[]];
type Collection = { id: string; title: string; credit: string; source: string; licence: string; palettes: Palette[] };

const hex = (s: string) => {
  const h = s.trim().replace(/^#?/, "#").toLowerCase();
  return h.length === 4 ? `#${[...h.slice(1)].map((c) => c + c).join("")}` : h.slice(0, 7);
};
const HEX = /#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b/g;
const hexes = (s: string) => (s.match(HEX) ?? []).map(hex);
// "BottleRocket1" → "Bottle Rocket 1", "JosefAlbers_1" → "Josef Albers 1", "frozen-rose" → "frozen rose"
const nice = (s: string) =>
  s.replace(/[_-]+/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2").replace(/([A-Za-z])(\d)/g, "$1 $2").replace(/(\d)([A-Za-z])/g, "$1 $2").replace(/\bIsleof\b/, "Isle of").replace(/\s+/g, " ").trim();
// the same colours twice (wesanderson's Rushmore and Rushmore1) are listed once
const unique = (ps: Palette[]) => {
  const seen = new Set<string>();
  return ps.filter(([, c]) => c.length >= 2 && !seen.has(c.join()) && seen.add(c.join()));
};

// `Name = list(c("#…", …), c(order…), colorblind=…)`, the format MetBrewer, MoMAColors, MexBrewer and NatParks share;
// PNWColors writes `rbind(` and wesanderson a bare `c(` in the same place
const rList = (src: string) =>
  [...src.matchAll(/^\s*([A-Za-z][\w.]*)\s*=\s*(?:list|rbind)?\(?\s*c\(([^)]*)\)/gm)].map(([, name, body]) => [nice(name!), hexes(body!)] as Palette);
// `Name:\n- '#…'` lists
const yamlList = (src: string) =>
  src.split(/^(?=[^\s-])/m).map((block) => [nice(block.split(":")[0]!.trim()), hexes(block)] as Palette);

const collections: Collection[] = [];
const add = (c: Omit<Collection, "palettes">, palettes: Palette[]) => {
  collections.push({ ...c, palettes: unique(palettes) });
  console.log(`${c.title}: ${unique(palettes).length}`);
};

add(
  { id: "met", title: "The Met", credit: "MetBrewer, Blake Robert Mills", source: "https://github.com/BlakeRMills/MetBrewer", licence: "CC0-1.0" },
  rList(await get("BlakeRMills/MetBrewer/main/R/PaletteCode.R")),
);
add(
  { id: "moma", title: "MoMA", credit: "MoMAColors, Blake Robert Mills", source: "https://github.com/BlakeRMills/MoMAColors", licence: "MIT © 2023 MoMAColors authors" },
  rList(await get("BlakeRMills/MoMAColors/main/R/Colors.R")),
);
add(
  { id: "artists", title: "Artists", credit: "lisa, Tyler Littlefield", source: "https://github.com/tyluRp/lisa", licence: "MIT © 2019 Tyler Littlefield" },
  yamlList(await get("tyluRp/lisa/master/inst/extdata/palettes.yml")),
);
add(
  { id: "muralists", title: "Mexican muralists", credit: "MexBrewer, Antonio Páez", source: "https://github.com/paezha/MexBrewer", licence: "MIT © 2021 MexBrewer authors" },
  rList(await get("paezha/MexBrewer/master/R/MexBrewer-package.R")),
);
add(
  { id: "wes", title: "Wes Anderson", credit: "wesanderson, Karthik Ram", source: "https://github.com/karthik/wesanderson", licence: "MIT © 2022 Karthik Ram" },
  rList((await get("karthik/wesanderson/master/R/colors.R")).split("wes_palettes <- list(")[1]!),
);
add(
  { id: "ghibli", title: "Studio Ghibli", credit: "ghibli, Ewen Henderson", source: "https://github.com/ewenme/ghibli", licence: "MIT © 2020 Ewen Henderson" },
  yamlList(await get("ewenme/ghibli/master/inst/extdata/palettes.yml")),
);
add(
  { id: "parks", title: "National parks", credit: "NatParksPalettes, Kevin S. Blake", source: "https://github.com/kevinsblake/NatParksPalettes", licence: "MIT © 2022 Kevin S. Blake" },
  rList(await get("kevinsblake/NatParksPalettes/main/R/NatParksPalettes.R")),
);
add(
  { id: "pnw", title: "Pacific Northwest", credit: "PNWColors, Jake Lawlor", source: "https://github.com/jakelawlor/PNWColors", licence: "CC0" },
  rList(await get("jakelawlor/PNWColors/master/R/PNWColors.R")),
);

// chromotome: ES modules of `{ name, colors, background?, stroke? }`. the background is part of the combination, so it
// leads the palette
{
  const files = ["cako", "colourscafe", "dale", "ducci", "duotone", "exposito", "flourish", "hilda", "iivonen", "judson", "jung", "kovecses", "mayo", "misc", "orbifold", "ranganath", "rohlfs", "roygbivs", "spatial", "system", "tsuchimochi", "tundra"];
  const palettes: Palette[] = [];
  for (const f of files) {
    const src = await get(`kgolid/chromotome/master/palettes/${f}.js`);
    for (const [, body] of src.matchAll(/\{([^{}]*name\s*:[^{}]*)\}/g)) {
      const name = body!.match(/name\s*:\s*['"]([^'"]+)['"]/)?.[1];
      const colors = hexes(body!.match(/colors\s*:\s*\[([^\]]*)\]/)?.[1] ?? "");
      const bg = body!.match(/backg?r?o?u?n?d\s*:\s*['"](#[0-9a-fA-F]{3,6})['"]/)?.[1];
      if (name) palettes.push([nice(name), bg && !colors.includes(hex(bg)) ? [hex(bg), ...colors] : colors]);
    }
  }
  add({ id: "chromotome", title: "chromotome", credit: "Kjetil Midtgarden Golid", source: "https://github.com/kgolid/chromotome", licence: "MIT © 2019 Kjetil Midtgarden Golid" }, palettes);
}

{
  const json = JSON.parse(await get("itmeo/webgradients/master/gradients.json")) as { name: string; gradient: { color: string; pos: number }[] }[];
  add(
    { id: "webgradients", title: "WebGradients", credit: "itmeo", source: "https://github.com/itmeo/webgradients", licence: "MIT © 2017 itmeo" },
    json.map((g) => [g.name, [...g.gradient].sort((a, b) => a.pos - b.pos).map((s) => hex(s.color))]),
  );
}

// editor themes: each theme's ground, its text, then its accents
{
  const palettes: Palette[] = [];
  const cat = JSON.parse(await get("catppuccin/palette/main/palette.json")) as Record<string, { name: string; colors: Record<string, { hex: string; accent: boolean }> }>;
  for (const flavour of ["latte", "frappe", "macchiato", "mocha"]) {
    const c = cat[flavour]!.colors;
    palettes.push([`Catppuccin ${cat[flavour]!.name}`, [c.base!.hex, c.text!.hex, ...Object.values(c).filter((x) => x.accent).map((x) => x.hex)].map(hex)]);
  }
  const rose = JSON.parse(await get("rose-pine/palette/main/palette.json")) as Record<string, { role: string; hex: string }[]>;
  for (const [variant, name] of [["main", "Rosé Pine"], ["moon", "Rosé Pine Moon"], ["dawn", "Rosé Pine Dawn"]] as const) {
    const by = Object.fromEntries(rose[variant]!.map((x) => [x.role, hex(x.hex)]));
    palettes.push([name, ["base", "text", "love", "gold", "rose", "pine", "foam", "iris"].map((r) => by[r]!)]);
  }
  const nord = await get("nordtheme/nord/develop/src/nord.css");
  palettes.push(["Nord", Array.from({ length: 16 }, (_, i) => hex(nord.match(new RegExp(`--nord${i}:\\s*(#[0-9a-fA-F]{6})`))![1]!))]);
  // these three have no data file, only their published values
  palettes.push(["Solarized dark", ["#002b36", "#839496", "#b58900", "#cb4b16", "#dc322f", "#d33682", "#6c71c4", "#268bd2", "#2aa198", "#859900"]]);
  palettes.push(["Solarized light", ["#fdf6e3", "#657b83", "#b58900", "#cb4b16", "#dc322f", "#d33682", "#6c71c4", "#268bd2", "#2aa198", "#859900"]]);
  palettes.push(["Gruvbox dark", ["#282828", "#ebdbb2", "#fb4934", "#b8bb26", "#fabd2f", "#83a598", "#d3869b", "#8ec07c", "#fe8019"]]);
  palettes.push(["Gruvbox light", ["#fbf1c7", "#3c3836", "#9d0006", "#79740e", "#b57614", "#076678", "#8f3f71", "#427b58", "#af3a03"]]);
  palettes.push(["Dracula", ["#282a36", "#f8f8f2", "#8be9fd", "#50fa7b", "#ffb86c", "#ff79c6", "#bd93f9", "#ff5555", "#f1fa8c"]]);
  add(
    {
      id: "themes",
      title: "Editor themes",
      credit: "Catppuccin, Rosé Pine (mvllow), Nord (Sven Greb), Solarized (Ethan Schoonover), Gruvbox (Pavel Pertsev), Dracula (Zeno Rocha)",
      source: "https://github.com/catppuccin/palette, https://github.com/rose-pine/palette, https://github.com/nordtheme/nord, https://github.com/altercation/solarized, https://github.com/morhetz/gruvbox, https://github.com/dracula/dracula-theme",
      licence: "MIT",
    },
    palettes,
  );
}

const header = collections.map((c) => `// ${c.title}: ${c.credit}. ${c.source} (${c.licence})`).join("\n");
const body = `// Generated by scripts/palettes.ts. Don't edit by hand; run it again.
${header}
export type Collection = { id: string; title: string; credit: string; source: string; palettes: [name: string, colors: string[]][] };
export const CURATED: Collection[] = ${JSON.stringify(collections.map(({ licence: _, ...c }) => c))};
`;
await Bun.write(`${import.meta.dir}/../src/color/data/curated.ts`, body);
console.log(`wrote src/color/data/curated.ts, ${(body.length / 1024).toFixed(1)} KB`);
