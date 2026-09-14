// Run: node scripts/generate-samples.js
// Generates products.csv and products.xlsx from existing .md files

const fs = require("fs");
const path = require("path");
const matter = require("gray-matter");

const productsDir = path.join(process.cwd(), "content", "products");
const csvPath = path.join(process.cwd(), "content", "products.csv");
const xlsxPath = path.join(process.cwd(), "content", "products.xlsx");

// ── Read all .md files ──
const files = fs.readdirSync(productsDir).filter((f) => f.endsWith(".md"));
const products = files.map((file) => {
  const { data } = matter(fs.readFileSync(path.join(productsDir, file), "utf8"));
  return data;
});

// ── Sort: featured first, then by name ──
products.sort((a, b) => {
  if (a.featured && !b.featured) return -1;
  if (!a.featured && b.featured) return 1;
  return (a.name || "").localeCompare(b.name || "");
});

// ── CSV ──
const HEADERS = [
  "id", "name", "priceUSD", "category", "image", "images",
  "description", "featured", "originalPrice", "stock", "status",
  "promo", "seoTitle", "seoDescription", "options", "attributes",
];

function csvEscape(val) {
  const s = String(val ?? "");
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

const csvLines = [HEADERS.join(",")];
products.forEach((p) => {
  const row = HEADERS.map((h) => {
    if (h === "images") {
      const imgs = p.images || (p.image ? [p.image] : []);
      return csvEscape(Array.isArray(imgs) ? imgs.join(",") : imgs);
    }
    if (h === "options" || h === "attributes") {
      const val = p[h];
      return csvEscape(val ? JSON.stringify(val) : "");
    }
    return csvEscape(p[h] ?? "");
  });
  csvLines.push(row.join(","));
});
fs.writeFileSync(csvPath, csvLines.join("\n"), "utf8");
console.log(`✓ Generated ${csvPath} (${products.length} products)`);

// ── XLSX ──
try {
  const XLSX = require("xlsx");
  const wb = XLSX.utils.book_new();
  const data = [HEADERS];
  products.forEach((p) => {
    data.push(HEADERS.map((h) => {
      if (h === "images") {
        const imgs = p.images || (p.image ? [p.image] : []);
        return Array.isArray(imgs) ? imgs.join(",") : (imgs || "");
      }
      if (h === "options" || h === "attributes") {
        const val = p[h];
        return val ? JSON.stringify(val) : "";
      }
      return p[h] ?? "";
    }));
  });
  const ws = XLSX.utils.aoa_to_sheet(data);
  XLSX.utils.book_append_sheet(wb, ws, "Products");
  XLSX.writeFile(wb, xlsxPath);
  console.log(`✓ Generated ${xlsxPath} (${products.length} products)`);
} catch (e) {
  console.log("Skipping XLSX (install xlsx: npm install xlsx)");
}
