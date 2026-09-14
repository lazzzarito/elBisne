import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { marked } from "marked";
import { fetchSheetProducts } from "./sheets";
import { fetchCSVProducts } from "./csv-loader";
import { fetchXLSXProducts } from "./xlsx-loader";

const productsDirectory = path.join(process.cwd(), "content");
const productsSubdirectory = path.join(productsDirectory, "products");

// ── Read & parse store config from JSON ──
export function getStoreConfig() {
  const filePath = path.join(productsDirectory, "store-config.json");
  try {
    const fileContent = fs.readFileSync(filePath, "utf8");
    return JSON.parse(fileContent);
  } catch (error) {
    console.error("Error reading store configuration:", error);
    return {
      name: "My Store",
      location: "Your city, Your country",
      whatsappNumber: "+15551234567",
      currency: { code: "USD", symbol: "$" },
      messaging: {
        defaultChannel: "whatsapp",
        channels: { whatsapp: { enabled: true } }
      }
    };
  }
}

// ── Parse .md product file ──
async function parseMdProduct(fileName) {
  const id = fileName.replace(/\.md$/, "");
  const fullPath = path.join(productsSubdirectory, fileName);
  const fileContents = fs.readFileSync(fullPath, "utf8");
  const { data, content } = matter(fileContents);
  const contentHtml = await marked.parse(content);

  const ratioClass = data.ratio || (() => {
    const idLength = id.length;
    if (idLength % 3 === 0) return "ratio-tall";
    if (idLength % 3 === 1) return "ratio-square";
    return "ratio-wide";
  })();

  const rawImages = data.images || (data.image ? [data.image] : []);
  const imageList = Array.isArray(rawImages) ? rawImages : [rawImages];
  const images = imageList.map((img) => {
    if (img.startsWith("/") || img.startsWith("http")) return img;
    return `/api/images/products/${encodeURIComponent(img)}`;
  });

  return {
    id: data.id || id,
    name: data.name || "Unnamed Product",
    priceUSD: parseFloat(data.priceUSD) || 0,
    category: data.category || "General",
    image: images[0] || "/images/placeholder.svg",
    images,
    description: data.description || "",
    featured: !!data.featured,
    offer: !!data.offer,
    originalPrice: data.originalPrice ? parseFloat(data.originalPrice) : null,
    stock: data.stock !== undefined ? parseInt(data.stock, 10) : Infinity,
    status: data.status || null,
    attributes: data.attributes ? { ...data.attributes } : {},
    options: (() => {
      if (!data.options) return null;
      const normalized = {};
      Object.entries(data.options).forEach(([key, values]) => {
        if (Array.isArray(values)) {
          normalized[key] = values.map((val) => {
            if (val && val.image && !val.image.startsWith("/") && !val.image.startsWith("http")) {
              return { ...val, image: `/api/images/products/${encodeURIComponent(val.image)}` };
            }
            return val;
          });
        } else {
          normalized[key] = values;
        }
      });
      return normalized;
    })(),
    promo: data.promo || null,
    seoTitle: data.seoTitle || "",
    seoDescription: data.seoDescription || "",
    contentHtml,
    ratioClass,
  };
}

// ── Read all .md files from content/products/ ──
async function getMdProducts() {
  if (!fs.existsSync(productsSubdirectory)) return [];
  const fileNames = fs.readdirSync(productsSubdirectory);
  const products = await Promise.all(
    fileNames.filter((fn) => fn.endsWith(".md")).map(parseMdProduct)
  );
  return products.sort((a, b) => {
    if (a.featured && !b.featured) return -1;
    if (!a.featured && b.featured) return 1;
    return a.name.localeCompare(b.name);
  });
}

// ── Multi-source product loader: Sheets → XLSX → CSV → .md ──
export async function getProducts() {
  const config = getStoreConfig();
  const sheetConfig = config.googleSheets;

  // 1. Try Google Sheets if configured (must have both sheetId and apiKey)
  if (sheetConfig && sheetConfig.sheetId && sheetConfig.apiKey) {
    const sheetProducts = await fetchSheetProducts(sheetConfig);
    if (sheetProducts && sheetProducts.length > 0) {
      return sheetProducts;
    }
  }

  // 2. Try XLSX (local Excel file)
  const xlsxProducts = await fetchXLSXProducts();
  if (xlsxProducts && xlsxProducts.length > 0) {
    return xlsxProducts;
  }

  // 3. Try CSV (local CSV file)
  const csvProducts = fetchCSVProducts();
  if (csvProducts && csvProducts.length > 0) {
    return csvProducts;
  }

  // 4. Fallback to .md files
  return getMdProducts();
}

// ── Get single product by ID (includes contentHtml) ──
export async function getProductById(id) {
  if (!id) return null;
  const products = await getProducts();
  return products.find((p) => p && p.id === id) || products.find((p) => p && p.id && p.id.toLowerCase() === id.toLowerCase()) || null;
}

// ── Get all product IDs (for static params) ──
export async function getAllProductIds() {
  const products = await getProducts();
  return products.filter((p) => p && p.id).map((p) => p.id);
}
