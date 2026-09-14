// ── Google Sheets Integration Layer ──
// Loads products from a published Google Sheet when configured,
// falls back to .md files when no sheet is configured.

const SHEETS_BASE = "https://sheets.googleapis.com/v4/spreadsheets";

// Map sheet column headers → product field names
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
};

function normalizeRow(headers, row) {
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
    } else {
      product[key] = val;
    }
  });

  // Assign ratio deterministically from name length
  const nameLen = (product.name || "").length;
  if (nameLen % 3 === 0) product.ratioClass = "ratio-tall";
  else if (nameLen % 3 === 1) product.ratioClass = "ratio-square";
  else product.ratioClass = "ratio-wide";

  // offer is true when originalPrice > priceUSD
  if (product.originalPrice && product.originalPrice > product.priceUSD) {
    product.offer = true;
  }

  // Ensure images array includes primary image
  if (product.image && !product.images.includes(product.image)) {
    product.images = [product.image, ...product.images];
  }

  return product;
}

// ── Fetch products from Google Sheets ──
export async function fetchSheetProducts(sheetConfig) {
  if (!sheetConfig || !sheetConfig.sheetId) return null;

  const { sheetId, apiKey, range = "Sheet1!A:Z" } = sheetConfig;
  if (!apiKey) {
    console.warn("Google Sheets configured but no API key provided. Falling back to .md files.");
    return null;
  }

  try {
    const url = `${SHEETS_BASE}/${sheetId}/values/${encodeURIComponent(range)}?key=${apiKey}`;
    const res = await fetch(url);

    if (!res.ok) {
      console.warn(`Google Sheets API error: ${res.status}. Falling back to .md files.`);
      return null;
    }

    const data = await res.json();
    const rows = data.values || [];
    if (rows.length < 2) {
      console.warn("Google Sheets has no data rows. Falling back to .md files.");
      return null;
    }

    const headers = rows[0].map((h) => h.toString().trim().toLowerCase());
    const products = rows.slice(1).map((row, index) => {
      const product = normalizeRow(headers, row);
      // Use explicit id from sheet, or derive from name
      if (!product.id) {
        const rawId = product.name || `Product ${index + 1}`;
        product.id = String(rawId).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || `sheet-product-${index}`;
      }
      return product;
    });

    // Sort: featured first, then alphabetical
    return products.sort((a, b) => {
      if (a.featured && !b.featured) return -1;
      if (!a.featured && b.featured) return 1;
      return (a.name || "").localeCompare(b.name || "");
    });
  } catch (err) {
    console.warn("Failed to fetch Google Sheet:", err.message);
    return null;
  }
}
