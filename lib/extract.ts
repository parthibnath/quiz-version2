import path from "node:path";
import sharp from "sharp";
import { PDFParse } from "pdf-parse";
import { createWorker, type Worker } from "tesseract.js";
import { ApiError } from "./api";
import { extractOffice } from "./office";
import type { FileType } from "./store";
import { MAX_TEXT_LENGTH, MAX_UPLOAD_BYTES, MIN_TEXT_LENGTH } from "./uploads";

const IMAGE_FORMATS: Record<string, string> = {
  png: "png", jpg: "jpeg", jpeg: "jpeg", webp: "webp", gif: "gif", tif: "tiff", tiff: "tiff",
};
const IMAGE_SIGNATURES: Record<string, string[]> = {
  png: ["89504e470d0a1a0a"],
  jpeg: ["ffd8ff"],
  gif: ["474946383761", "474946383961"],
  tiff: ["49492a00", "4d4d002a", "49492b00", "4d4d002b"],
};
const TEXT_FORMATS = new Set(["txt", "md", "csv"]);
const MAX_PDF_PAGES = 150;
const MAX_OCR_PAGES = 12;

function matchesImageFormat(buffer: Buffer, format: string) {
  if (format === "webp") {
    return buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP";
  }
  const header = buffer.subarray(0, 8).toString("hex");
  return IMAGE_SIGNATURES[format].some((signature) => header.startsWith(signature));
}

async function usingOcr<T>(run: (worker: Worker) => Promise<T>) {
  const worker = await createWorker("eng", undefined, {
    langPath: process.cwd(),
    gzip: false,
    cacheMethod: "none",
  });
  try {
    return await run(worker);
  } finally {
    await worker.terminate();
  }
}

async function recognize(worker: Worker, image: Uint8Array) {
  const { data } = await worker.recognize(Buffer.from(image));
  return { text: data.text.trim(), confidence: data.confidence };
}

async function extractPdf(buffer: Buffer) {
  if (!buffer.subarray(0, 1024).includes(Buffer.from("%PDF-"))) {
    throw new ApiError(422, "This file does not have a valid PDF header.");
  }
  const parser = new PDFParse({
    data: new Uint8Array(buffer), isEvalSupported: false,
    maxImageSize: 40_000_000,
  });
  try {
    const result = await parser.getText({ first: MAX_PDF_PAGES + 1 });
    if (result.total > MAX_PDF_PAGES) {
      throw new ApiError(413, `Split this PDF into files of ${MAX_PDF_PAGES} pages or fewer.`);
    }
    const scanned = result.pages.filter(({ text }) => text.replace(/[^\p{L}\p{N}]/gu, "").length < 15);
    if (scanned.length > MAX_OCR_PAGES) {
      throw new ApiError(413, `Split this file so each PDF contains at most ${MAX_OCR_PAGES} scanned pages.`);
    }
    if (!scanned.length) return { text: result.pages.map((page) => page.text).join("\n\n"), uncertain: false };

    const { pages } = await parser.getInfo({ parsePageInfo: true });
    let uncertain = false;
    await usingOcr(async (worker) => {
      for (const page of scanned) {
        const geometry = pages.find((info) => info.pageNumber === page.num);
        if (!geometry || !geometry.width || !geometry.height) throw new Error("Invalid page dimensions");
        const scale = 2000 / Math.max(geometry.width, geometry.height);
        const raster = await parser.getScreenshot({ partial: [page.num], scale, imageDataUrl: false });
        const scan = await recognize(worker, raster.pages[0].data);
        if (scan.text.length > page.text.trim().length) page.text = scan.text;
        uncertain ||= scan.confidence < 65 || !scan.text;
      }
    });
    return { text: result.pages.map((page) => page.text).join("\n\n"), uncertain };
  } finally {
    await parser.destroy();
  }
}

export async function extractMaterial(file: File, camera = false) {
  if (!file.size || file.size > MAX_UPLOAD_BYTES) {
    throw new ApiError(413, "Choose a non-empty file under 10 MiB.");
  }
  const fileName = path.basename(file.name.replaceAll("\\", "/")).slice(0, 240);
  const ext = path.extname(fileName).slice(1).toLowerCase();
  const imageFormat = Object.hasOwn(IMAGE_FORMATS, ext) ? IMAGE_FORMATS[ext] : undefined;
  if (!imageFormat && (camera || (!TEXT_FORMATS.has(ext) && !["pdf", "docx", "pptx"].includes(ext)))) {
    throw new ApiError(415, "Use PDF, PNG, JPG, WEBP, GIF, TIFF, DOCX, PPTX, TXT, MD, or CSV.");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  let fileType: FileType = "text";
  let text: string;
  let uncertain = false;
  try {
    if (imageFormat) {
      fileType = camera ? "camera" : "image";
      if (!matchesImageFormat(buffer, imageFormat)) throw new Error("Image type mismatch");
      const image = sharp(buffer, { limitInputPixels: 40_000_000 });
      const png = await image.rotate().resize({ width: 2400, height: 2400, fit: "inside", withoutEnlargement: true }).png().toBuffer();
      const scan = await usingOcr((worker) => recognize(worker, png));
      text = scan.text;
      uncertain = scan.confidence < 65;
    } else if (ext === "pdf") {
      fileType = "pdf";
      ({ text, uncertain } = await extractPdf(buffer));
    } else if (ext === "docx" || ext === "pptx") {
      text = await extractOffice(buffer, ext);
    } else {
      const utf16 = buffer[0] === 0xff && buffer[1] === 0xfe ? "utf-16le" : buffer[0] === 0xfe && buffer[1] === 0xff ? "utf-16be" : "utf-8";
      text = new TextDecoder(utf16, { fatal: true }).decode(buffer);
      if (text.includes("\0")) throw new Error("Binary text input");
    }
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(422, "This file could not be read. Check that it opens, remove any PDF password, or export it in a supported format.");
  }

  text = text.replace(/\r\n?/g, "\n").trim();
  if (text.length < MIN_TEXT_LENGTH) {
    throw new ApiError(422, "There is too little readable text. Try a clearer photo, another document, or paste your notes.");
  }
  if (text.length > MAX_TEXT_LENGTH) {
    throw new ApiError(413, "This material has over 100,000 characters. Split it and upload each part.");
  }
  return { fileName, fileType, text, uncertain };
}
