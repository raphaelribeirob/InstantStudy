import JSZip from "jszip";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import type { StudyFile } from "./contentSessions.js";

const MAX_FILE_BYTES = 25 * 1024 * 1024;
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

function isAudioMime(mime = "", name = "") {
  return (
    mime.startsWith("audio/") ||
    /\.(mp3|mp4|mpeg|mpga|m4a|ogg|wav|webm|flac)$/i.test(name)
  );
}

function normalizeMime(file: StudyFile, responseMime = "") {
  const supplied = file.mime_type?.toLowerCase() ?? "";
  const response = responseMime.toLowerCase();
  const name = file.file_name?.toLowerCase() ?? "";

  if (supplied) return supplied;
  if (response) return response;
  if (name.endsWith(".pdf")) return "application/pdf";
  if (name.endsWith(".docx")) {
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  }
  if (name.endsWith(".pptx")) {
    return "application/vnd.openxmlformats-officedocument.presentationml.presentation";
  }
  return "";
}

function privateIpv4(address: string) {
  const parts = address.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part))) return true;
  const [a, b] = parts;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224
  );
}

function privateIp(address: string) {
  const version = isIP(address);
  if (version === 4) return privateIpv4(address);
  if (version !== 6) return true;

  const normalized = address.toLowerCase();
  if (
    normalized === "::" ||
    normalized === "::1" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    /^fe[89ab]/.test(normalized)
  ) {
    return true;
  }

  const mapped = normalized.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  return mapped ? privateIpv4(mapped[1]) : false;
}

function hostAllowed(hostname: string) {
  const configured = (process.env.INSTANTSTUDY_FILE_HOST_ALLOWLIST ?? "")
    .split(",")
    .map((host) => host.trim().toLowerCase())
    .filter(Boolean);
  if (!configured.length) return true;

  const host = hostname.toLowerCase();
  return configured.some(
    (allowed) => host === allowed || host.endsWith(`.${allowed}`),
  );
}

async function validatePublicDownloadUrl(raw: string) {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("Invalid file download URL.");
  }

  if (!["https:", "http:"].includes(url.protocol)) {
    throw new Error("Only HTTP(S) file downloads are allowed.");
  }
  if (url.username || url.password) {
    throw new Error("Credential-bearing file URLs are not allowed.");
  }

  const hostname = url.hostname.toLowerCase().replace(/\.$/, "");
  if (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal") ||
    hostname === "metadata.google.internal" ||
    !hostAllowed(hostname)
  ) {
    throw new Error("File download host is not allowed.");
  }

  if (isIP(hostname)) {
    if (privateIp(hostname)) throw new Error("Private-network file URLs are blocked.");
    return url;
  }

  const resolved = await lookup(hostname, { all: true, verbatim: true });
  if (!resolved.length || resolved.some((entry) => privateIp(entry.address))) {
    throw new Error("File download host resolves to a private or invalid address.");
  }

  return url;
}

async function safeFetch(rawUrl: string) {
  let current = await validatePublicDownloadUrl(rawUrl);

  for (let redirects = 0; redirects <= 3; redirects += 1) {
    const response = await fetch(current, {
      redirect: "manual",
      signal: AbortSignal.timeout(20_000),
      headers: { "user-agent": "InstantStudy-Ingest/1.0" },
    });

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location || redirects === 3) {
        throw new Error("File download redirect limit exceeded.");
      }
      current = await validatePublicDownloadUrl(new URL(location, current).toString());
      continue;
    }

    return response;
  }

  throw new Error("File download redirect limit exceeded.");
}

async function download(file: StudyFile) {
  const response = await safeFetch(file.download_url);

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
    mime: normalizeMime(
      file,
      response.headers.get("content-type") || "",
    ),
  };
}

function decodeXmlEntities(value: string) {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&apos;", "'");
}

function extractXmlText(xml: string, tag: string) {
  const escaped = tag.replace(":", "\\:");
  const regex = new RegExp(`<${escaped}[^>]*>([\\s\\S]*?)<\\/${escaped}>`, "g");
  return [...xml.matchAll(regex)]
    .map((match) =>
      decodeXmlEntities(
        match[1]
          .replace(/<[^>]+>/g, " ")
          .replace(/\s+/g, " ")
          .trim(),
      ),
    )
    .filter(Boolean);
}

async function extractDocx(bytes: Uint8Array) {
  const zip = await JSZip.loadAsync(bytes);
  const orderedPaths = [
    "word/document.xml",
    ...Object.keys(zip.files)
      .filter((path) => /^word\/(header|footer|footnotes|endnotes).*\.xml$/i.test(path))
      .sort(),
  ];

  const parts: string[] = [];
  for (const path of orderedPaths) {
    const file = zip.file(path);
    if (!file) continue;
    const xml = await file.async("text");
    const text = extractXmlText(xml, "w:t").join(" ").trim();
    if (text) parts.push(text);
    if (parts.join("\n\n").length >= MAX_TEXT_CHARS) break;
  }

  return parts.join("\n\n").slice(0, MAX_TEXT_CHARS);
}

function slideNumber(path: string) {
  const match = path.match(/slide(\d+)\.xml$/i);
  return match ? Number.parseInt(match[1], 10) : Number.MAX_SAFE_INTEGER;
}

async function extractPptx(bytes: Uint8Array) {
  const zip = await JSZip.loadAsync(bytes);
  const slidePaths = Object.keys(zip.files)
    .filter((path) => /^ppt\/slides\/slide\d+\.xml$/i.test(path))
    .sort((a, b) => slideNumber(a) - slideNumber(b));

  const slides: string[] = [];
  for (const path of slidePaths) {
    const file = zip.file(path);
    if (!file) continue;
    const xml = await file.async("text");
    const text = extractXmlText(xml, "a:t").join(" ").trim();
    if (text) slides.push(text);
    if (slides.join("\n\n").length >= MAX_TEXT_CHARS) break;
  }

  return slides.join("\n\n").slice(0, MAX_TEXT_CHARS);
}

async function transcribeAudio(
  bytes: Uint8Array,
  mime: string,
  fileName = "lecture-audio",
) {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return null;

  const form = new FormData();
  const audioBytes = new Uint8Array(bytes.byteLength);
  audioBytes.set(bytes);
  form.append(
    "file",
    new Blob([audioBytes.buffer], { type: mime || "application/octet-stream" }),
    fileName,
  );
  form.append(
    "model",
    process.env.INSTANTSTUDY_TRANSCRIPTION_MODEL?.trim() ||
      "gpt-4o-mini-transcribe",
  );

  const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: form,
    signal: AbortSignal.timeout(120_000),
  });

  if (!response.ok) {
    const detail = (await response.text()).slice(0, 500);
    throw new Error(
      `Audio transcription failed: HTTP ${response.status} ${detail}`,
    );
  }

  const payload = (await response.json()) as { text?: string };
  return payload.text?.trim().slice(0, MAX_TEXT_CHARS) || null;
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
    extraction?: "pdf" | "docx" | "pptx" | "text" | "audio";
    error?: string;
  }> = [];

  for (const file of files) {
    try {
      const { bytes, mime } = await download(file);
      const normalizedMime = mime.toLowerCase();
      const name = file.file_name?.toLowerCase() ?? "";

      if (normalizedMime.includes("pdf") || name.endsWith(".pdf")) {
        const text = await extractPdf(bytes);
        extracted.push({
          fileId: file.file_id,
          fileName: file.file_name,
          mimeType: mime,
          text,
          extraction: "pdf",
          status: text ? "extracted" : "host_text_required",
        });
        continue;
      }

      if (
        normalizedMime.includes("wordprocessingml") ||
        name.endsWith(".docx")
      ) {
        const text = await extractDocx(bytes);
        extracted.push({
          fileId: file.file_id,
          fileName: file.file_name,
          mimeType: mime,
          text,
          extraction: "docx",
          status: text ? "extracted" : "host_text_required",
        });
        continue;
      }

      if (
        normalizedMime.includes("presentationml") ||
        name.endsWith(".pptx")
      ) {
        const text = await extractPptx(bytes);
        extracted.push({
          fileId: file.file_id,
          fileName: file.file_name,
          mimeType: mime,
          text,
          extraction: "pptx",
          status: text ? "extracted" : "host_text_required",
        });
        continue;
      }

      if (isAudioMime(normalizedMime, name)) {
        const text = await transcribeAudio(
          bytes,
          normalizedMime,
          file.file_name || "lecture-audio",
        );
        extracted.push({
          fileId: file.file_id,
          fileName: file.file_name,
          mimeType: mime,
          text: text || undefined,
          extraction: "audio",
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
          extraction: "text",
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
    limits: {
      maxFileBytes: MAX_FILE_BYTES,
      maxTextChars: MAX_TEXT_CHARS,
    },
  };
}
