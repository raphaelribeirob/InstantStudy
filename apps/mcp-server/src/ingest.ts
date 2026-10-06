import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import type { StudyFile } from "./contentSessions.js";

const MAX_FILE_BYTES = 12 * 1024 * 1024;
const MAX_TEXT_CHARS = 200_000;

function isTextMime(mime = "") {
  return (
    mime.startsWith("text/") ||
    mime.includes("json") ||
    mime.includes("xml") ||
    mime.includes("markdown") ||
    mime.includes("csv")
  );
}

async function download(file: StudyFile) {
  const response = await fetch(file.download_url, {
    redirect: "follow",
    signal: AbortSignal.timeout(20_000),
  });

  if (!response.ok) {
    throw new Error(
      `Could not download ${file.file_name ?? file.file_id}: HTTP ${response.status}`,
    );
  }

  const length = Number(response.headers.get("content-length") ?? 0);
  if (length > MAX_FILE_BYTES) {
    throw new Error(
      `${file.file_name ?? file.file_id} is larger than the ${MAX_FILE_BYTES} byte ingestion limit.`,
    );
  }

  const buffer = new Uint8Array(await response.arrayBuffer());
  if (buffer.byteLength > MAX_FILE_BYTES) {
    throw new Error(
      `${file.file_name ?? file.file_id} is larger than the ${MAX_FILE_BYTES} byte ingestion limit.`,
    );
  }

  return {
    bytes: buffer,
    mime: file.mime_type || response.headers.get("content-type") || "",
  };
}

async function extractPdf(bytes: Uint8Array) {
  const document = await getDocument({ data: bytes }).promise;
  const pages: string[] = [];

  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    const page = await document.getPage(pageNumber);
    const content = await page.getTextContent();
    const text = content.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();

    if (text) pages.push(text);
    if (pages.join("\n\n").length >= MAX_TEXT_CHARS) break;
  }

  return pages.join("\n\n").slice(0, MAX_TEXT_CHARS);
}

export async function ingestFiles(files: StudyFile[]) {
  const extracted: Array<{
    fileId: string;
    fileName?: string;
    mimeType?: string;
    text?: string;
    status: "extracted" | "host_text_required" | "failed";
    error?: string;
  }> = [];

  for (const file of files) {
    try {
      const { bytes, mime } = await download(file);
      const normalizedMime = mime.toLowerCase();

      if (normalizedMime.includes("pdf")) {
        const text = await extractPdf(bytes);
        extracted.push({
          fileId: file.file_id,
          fileName: file.file_name,
          mimeType: mime,
          text,
          status: text ? "extracted" : "host_text_required",
        });
        continue;
      }

      if (isTextMime(normalizedMime)) {
        const text = new TextDecoder("utf-8", { fatal: false })
          .decode(bytes)
          .slice(0, MAX_TEXT_CHARS);
        extracted.push({
          fileId: file.file_id,
          fileName: file.file_name,
          mimeType: mime,
          text,
          status: text.trim() ? "extracted" : "host_text_required",
        });
        continue;
      }

      extracted.push({
        fileId: file.file_id,
        fileName: file.file_name,
        mimeType: mime,
        status: "host_text_required",
      });
    } catch (error) {
      extracted.push({
        fileId: file.file_id,
        fileName: file.file_name,
        mimeType: file.mime_type,
        status: "failed",
        error: error instanceof Error ? error.message : "File ingestion failed",
      });
    }
  }

  const text = extracted
    .map((item) => item.text?.trim())
    .filter(Boolean)
    .join("\n\n")
    .slice(0, MAX_TEXT_CHARS);

  return {
    text,
    files: extracted,
  };
}
