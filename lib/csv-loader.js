import fs from "fs";
import path from "path";

const productsDirectory = path.join(process.cwd(), "content");
const csvPath = path.join(productsDirectory, "products.csv");

const FIELD_MAP = {
  id: "id",
  name: "name",
  priceusd: "priceUSD",
  category: "category",
  image: "image",
  images: "images",
  description: "description",
  featured: "featured",
  originalprice: "originalPrice",
  stock: "stock",
  status: "status",
  promo: "promo",
  seotitle: "seoTitle",
  seodescription: "seoDescription",
  options: "options",
  attributes: "attributes",
};

function parseCSVLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  return lines.map((line) => parseCSVLine(line));
}

function normalizeProduct(headers, row) {
  const product = {
    priceUSD: 0,
    category: "General",
    image: "/images/placeholder.svg",
    images: [],
    description: "",
    featured: false,
    offer: false,
    originalPrice: null,
    stock: Infinity,
    status: null,
    promo: null,
    seoTitle: "",
    seoDescription: "",
    contentHtml: "",
    ratioClass: "ratio-square",
  };

  headers.forEach((header, i) => {
    const key = FIELD_MAP[header.replace(/\s/g, "").toLowerCase()];
    if (!key) return;
    let val = row[i] || "";
    val = val.toString().trim();

    if (key === "priceUSD") {
      product[key] = parseFloat(val) || 0;
    } else if (key === "originalPrice") {
      const parsed = parseFloat(val);
      product[key] = isNaN(parsed) ? null : parsed;
    } else if (key === "stock") {
      product[key] = val ? parseInt(val, 10) : Infinity;
    } else if (key === "featured") {
      product[key] = val.toLowerCase() === "true" || val === "1" || val.toLowerCase() === "yes";
    } else if (key === "images") {
      product[key] = val ? val.split(",").map((s) => s.trim()).filter(Boolean) : [];
    } else if (key === "image") {
      product[key] = val || "/images/placeholder.svg";
    } else if (key === "options") {
      try {
        if (val) {
          const parsed = JSON.parse(val);
          const normalized = {};
          Object.entries(parsed).forEach(([optKey, values]) => {
            if (Array.isArray(values)) {
              normalized[optKey] = values.map((v) => {
                if (v && v.image && !v.image.startsWith("/") && !v.image.startsWith("http")) {
                  return { ...v, image: `/api/images/products/${encodeURIComponent(v.image)}` };
                }
                return v;
              });
            } else {
              normalized[optKey] = values;
            }
          });
          product[key] = normalized;
        } else {
          product[key] = null;
        }
      } catch (err) {
        console.warn("Failed to parse options JSON for product:", product.id || product.name, err.message);
        product[key] = null;
      }
    } else if (key === "attributes") {
      try {
        product[key] = val ? JSON.parse(val) : {};
      } catch (err) {
        console.warn("Failed to parse attributes JSON for product:", product.id || product.name, err.message);
        product[key] = {};
      }
    } else {
      product[key] = val;
    }
  });

  const nameLen = (product.name || "").length;
  if (nameLen % 3 === 0) product.ratioClass = "ratio-tall";
  else if (nameLen % 3 === 1) product.ratioClass = "ratio-square";
  else product.ratioClass = "ratio-wide";

  if (product.originalPrice && product.originalPrice > product.priceUSD) {
    product.offer = true;
  }

  // Normalize image paths: prepend API route for relative paths
  const normalizeImg = (img) => {
    if (!img || img.startsWith("/") || img.startsWith("http")) return img;
    return `/api/images/products/${encodeURIComponent(img)}`;
  };
  product.image = normalizeImg(product.image);
  if (product.images?.length) {
    product.images = product.images.map(normalizeImg).filter(Boolean);
    // Promote first real image as primary if image is placeholder
    const realImages = product.images.filter((i) => !i.includes("placeholder"));
    if (realImages.length && product.image?.includes("placeholder")) {
      product.image = realImages[0];
    }
    if (product.image && !product.images.includes(product.image)) {
      product.images = [product.image, ...product.images];
    }
  }

  return product;
}

export function fetchCSVProducts() {
  if (!fs.existsSync(csvPath)) return null;

  try {
    const text = fs.readFileSync(csvPath, "utf8");
    const rows = parseCSV(text);
    if (rows.length < 1) return null;

    const headers = rows[0].map((h) => h.toLowerCase());
    const products = rows.slice(1).map((row) => {
      const product = normalizeProduct(headers, row);
      if (!product.id) {
        const rawId = product.name || "Unnamed Product";
        product.id = String(rawId).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      }
      return product;
    });

    products.forEach((p, i) => {
      if (!p.id) p.id = `csv-product-${i}`;
    });

    return products.sort((a, b) => {
      if (a.featured && !b.featured) return -1;
      if (!a.featured && b.featured) return 1;
      return (a.name || "").localeCompare(b.name || "");
    });
  } catch (err) {
    console.warn("Failed to parse CSV:", err.message);
    return null;
  }
}
