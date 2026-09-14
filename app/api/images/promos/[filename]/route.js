import fs from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";

const promosDir = path.join(process.cwd(), "content", "promos");

const MIME_TYPES = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".avif": "image/avif",
};

export async function GET(request, { params }) {
  try {
    const { filename } = await params;
    const decoded = decodeURIComponent(filename);

    if (decoded.includes("..") || decoded.includes("/")) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const filePath = path.join(promosDir, decoded);

    try { await fs.access(filePath); } catch { return new NextResponse("Not Found", { status: 404 }); }

    const ext = path.extname(decoded).toLowerCase();
    const contentType = MIME_TYPES[ext] || "application/octet-stream";
    const buffer = await fs.readFile(filePath);

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
