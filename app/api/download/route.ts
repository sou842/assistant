import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get("url");
    const filename = searchParams.get("filename") || "download";

    if (!url) {
      return NextResponse.json({ error: "Missing url parameter" }, { status: 400 });
    }

    const response = await fetch(url);
    if (!response.ok) {
      return NextResponse.json({ error: "Failed to fetch remote asset" }, { status: response.status });
    }

    const contentType = response.headers.get("content-type") || "application/octet-stream";
    const blob = await response.blob();

    const headers = new Headers();
    headers.set("Content-Type", contentType);
    // Sanitize the filename to remove quotes or newlines
    const safeFilename = filename.replace(/["\r\n]/g, "");
    headers.set("Content-Disposition", `attachment; filename="${safeFilename}"`);

    return new NextResponse(blob, {
      status: 200,
      headers,
    });
  } catch (error: any) {
    console.error("Download proxy error:", error);
    return NextResponse.json({ error: error.message || "Failed to download" }, { status: 500 });
  }
}
