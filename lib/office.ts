import { DOMParser } from "@xmldom/xmldom";
import { fromBuffer, type Entry, type ZipFile } from "yauzl";
import { ApiError } from "./api";

const WORD_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
const DRAWING_NS = "http://schemas.openxmlformats.org/drawingml/2006/main";
const SLIDE_NS = "http://schemas.openxmlformats.org/presentationml/2006/main";
const REL_NS = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
const MAX_XML_BYTES = 12 * 1024 * 1024;

function readEntry(zip: ZipFile, entry: Entry): Promise<string> {
  return new Promise((resolve, reject) => {
    zip.openReadStream(entry, (error, stream) => {
      if (error) return reject(error);
      const chunks: Buffer[] = [];
      stream.on("data", (chunk: Buffer) => chunks.push(chunk));
      stream.on("error", reject);
      stream.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    });
  });
}

async function readOfficeXml(buffer: Buffer, wanted: RegExp) {
  const zip = await new Promise<ZipFile>((resolve, reject) => {
    fromBuffer(buffer, { lazyEntries: true }, (error, opened) => error ? reject(error) : resolve(opened));
  });
  const entries = new Map<string, string>();
  let totalBytes = 0;

  try {
    await new Promise<void>((resolve, reject) => {
      if (zip.entryCount > 10_000) return reject(new ApiError(413, "This Office document has too many embedded items."));
      zip.on("error", reject);
      zip.on("end", resolve);
      zip.on("entry", async (entry: Entry) => {
        try {
          if (wanted.test(entry.fileName)) {
            totalBytes += entry.uncompressedSize;
            if (totalBytes > MAX_XML_BYTES) throw new ApiError(413, "This Office document contains too much text.");
            entries.set(entry.fileName, await readEntry(zip, entry));
          }
          zip.readEntry();
        } catch (error) {
          reject(error);
        }
      });
      zip.readEntry();
    });
    return entries;
  } finally {
    zip.close();
  }
}

function parseXml(xml: string | undefined) {
  if (!xml || /<!DOCTYPE/i.test(xml)) throw new Error("Missing or invalid Office XML");
  return new DOMParser().parseFromString(xml, "application/xml");
}

function readParagraphs(xml: string | undefined, namespace: string) {
  return Array.from(parseXml(xml).getElementsByTagNameNS(namespace, "p"))
    .map((paragraph) => Array.from(paragraph.getElementsByTagNameNS(namespace, "t"))
      .map((run) => run.textContent ?? "").join(""))
    .join("\n");
}

export async function extractOffice(buffer: Buffer, ext: "docx" | "pptx") {
  if (ext === "docx") {
    const entries = await readOfficeXml(buffer, /^word\/document\.xml$/);
    return readParagraphs(entries.get("word/document.xml"), WORD_NS);
  }

  const entries = await readOfficeXml(buffer, /^ppt\/(?:presentation\.xml|_rels\/presentation\.xml\.rels|slides\/slide\d+\.xml)$/);
  const manifest = parseXml(entries.get("ppt/presentation.xml"));
  const links = parseXml(entries.get("ppt/_rels/presentation.xml.rels"));
  const paths = new Map(Array.from(links.getElementsByTagNameNS("*", "Relationship")).map((link) => [
    link.getAttribute("Id"), link.getAttribute("Target"),
  ]));
  return Array.from(manifest.getElementsByTagNameNS(SLIDE_NS, "sldId")).map((slide) => {
    const target = paths.get(slide.getAttributeNS(REL_NS, "id"));
    const path = target?.startsWith("/") ? target.slice(1) : `ppt/${target}`;
    return readParagraphs(entries.get(path), DRAWING_NS);
  }).join("\n\n");
}
