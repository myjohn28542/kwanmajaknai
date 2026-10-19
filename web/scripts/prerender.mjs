// After `vite build`: write dist/t/{id}.html with per-tambon og:title / og:image so
// links shared to LINE / Facebook preview the latest sentence and image.
// Reads the data the pipeline copied into dist/data/. SITE_URL must be absolute.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const dist = join(dirname(fileURLToPath(import.meta.url)), "..", "dist");
const site = (process.env.SITE_URL || "").replace(/\/$/, "");
const indexPath = join(dist, "data", "index.json");

if (!existsSync(indexPath)) {
  console.warn("prerender: no dist/data/index.json — run the pipeline first; skipping");
  process.exit(0);
}
if (!site) console.warn("prerender: SITE_URL not set; og:image/og:url will be relative (previews may not show)");

const esc = (s) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
const template = readFileSync(join(dist, "index.html"), "utf8");
const START = "<!--og:start-->";
const END = "<!--og:end-->";
if (!template.includes(START) || !template.includes(END)) throw new Error("index.html lacks og markers");

const index = JSON.parse(readFileSync(indexPath, "utf8"));
const version = (index.latest_t || "").replace(/\D/g, "").slice(0, 10);
mkdirSync(join(dist, "t"), { recursive: true });

let n = 0;
for (const t of index.tambons) {
  const docPath = join(dist, "data", `${t.id}.json`);
  if (!existsSync(docPath)) continue;
  const doc = JSON.parse(readFileSync(docPath, "utf8"));
  const snap = doc.snapshots[0];
  const title = snap ? snap.sentence : `ควันที่ต.${t.name_th} อ.${t.amphoe_th} มาจากไหน`;
  const url = `${site}/t/${t.id}`;
  const image = `${site}/data/${t.id}.png?v=${version}`;
  const head = [
    `<title>${esc(`ต.${t.name_th} อ.${t.amphoe_th} — ควันมาจากไหน`)}</title>`,
    `<meta name="description" content="${esc(title)}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="ควันมาจากไหน" />`,
    `<meta property="og:title" content="${esc(title)}" />`,
    `<meta property="og:description" content="ประมาณการจากทิศลมย้อนหลังและจุดความร้อนจากดาวเทียม ไม่ใช่หลักฐานกล่าวโทษผู้ใด" />`,
    `<meta property="og:url" content="${esc(url)}" />`,
    `<meta property="og:image" content="${esc(image)}" />`,
    `<meta property="og:image:width" content="1200" />`,
    `<meta property="og:image:height" content="630" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
  ].join("\n    ");
  const html = template.slice(0, template.indexOf(START)) + head + template.slice(template.indexOf(END) + END.length);
  writeFileSync(join(dist, "t", `${t.id}.html`), html);
  n++;
}
console.log(`prerender: wrote ${n} tambon pages`);
