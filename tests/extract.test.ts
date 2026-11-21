import assert from "node:assert/strict";
import test from "node:test";
import { deflateSync } from "node:zlib";
import sharp from "sharp";
import { strToU8, zipSync } from "fflate";
import { extractMaterial } from "../lib/extract";

const note = "A binary digit is called a bit.";
const word = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
const drawing = "http://schemas.openxmlformats.org/drawingml/2006/main";
const presentation = "http://schemas.openxmlformats.org/presentationml/2006/main";
const relationship = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";

test("extracts plain text and rejects disguised binary", async () => {
  assert.equal((await extractMaterial(new File([note], "notes.txt"))).text, note);
  await assert.rejects(extractMaterial(new File([new Uint8Array([255, 5, 0])], "notes.txt")), { status: 422 });
  await assert.rejects(extractMaterial(new File([note], "notes.exe")), { status: 415 });
});

test("extracts DOCX and PPTX text in presentation order", async () => {
  const docx = zipSync({ "word/document.xml": strToU8(`<w:document xmlns:w="${word}"><w:body><w:p><w:r><w:t>${note}</w:t></w:r></w:p></w:body></w:document>`) });
  const slide = (text: string) => strToU8(`<p:sld xmlns:p="${presentation}" xmlns:a="${drawing}"><a:p><a:r><a:t>${text}</a:t></a:r></a:p></p:sld>`);
  const pptx = zipSync({
    "ppt/presentation.xml": strToU8(`<p:presentation xmlns:p="${presentation}" xmlns:r="${relationship}"><p:sldIdLst><p:sldId r:id="rId2"/><p:sldId r:id="rId1"/></p:sldIdLst></p:presentation>`),
    "ppt/_rels/presentation.xml.rels": strToU8('<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Target="slides/slide1.xml"/><Relationship Id="rId2" Target="slides/slide2.xml"/></Relationships>'),
    "ppt/slides/slide1.xml": slide("Byte comes second."),
    "ppt/slides/slide2.xml": slide("Bit comes first."),
  });
  assert.equal((await extractMaterial(new File([new Uint8Array(docx)], "notes.docx"))).text, note);
  assert.equal((await extractMaterial(new File([new Uint8Array(pptx)], "notes.pptx"))).text, "Bit comes first.\n\nByte comes second.");
});

function pdf(objects: (string | Buffer)[]) {
  const chunks: Buffer[] = [Buffer.from("%PDF-1.4\n")];
  const offsets = [0];
  let size = chunks[0].length;
  for (const [index, object] of objects.entries()) {
    offsets.push(size);
    const chunk = Buffer.concat([Buffer.from(`${index + 1} 0 obj\n`), Buffer.from(object), Buffer.from("\nendobj\n")]);
    chunks.push(chunk);
    size += chunk.length;
  }
  const entries = offsets.slice(1).map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`).join("");
  chunks.push(Buffer.from(`xref\n0 ${offsets.length}\n0000000000 65535 f \n${entries}trailer\n<< /Root 1 0 R /Size ${offsets.length} >>\nstartxref\n${size}\n%%EOF\n`));
  return new Uint8Array(Buffer.concat(chunks));
}

function stream(content: string | Buffer, attributes = "") {
  const data = Buffer.from(content);
  return Buffer.concat([Buffer.from(`<< /Length ${data.length} ${attributes} >>\nstream\n`), data, Buffer.from("\nendstream")]);
}

test("extracts a text PDF, a standalone image, and a scanned page of a mixed PDF", async () => {
  const source = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="640" height="150"><rect width="100%" height="100%" fill="white"/><text x="25" y="85" font-family="sans-serif" font-size="38" fill="black">A byte contains eight bits.</text></svg>');
  const png = await sharp(source).png().toBuffer();
  assert.match((await extractMaterial(new File([new Uint8Array(png)], "notes.png"))).text, /byte contains eight bits/i);
  const gray = await sharp(png).removeAlpha().greyscale().raw().toBuffer();
  const data = pdf([
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Count 2 /Kids [3 0 R 6 0 R] >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 640 150] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>",
    stream(`BT /F1 28 Tf 25 65 Td (${note}) Tj ET`),
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 640 150] /Resources << /XObject << /Im0 8 0 R >> >> /Contents 7 0 R >>",
    stream("q 640 0 0 150 0 0 cm /Im0 Do Q"),
    stream(deflateSync(gray), "/Type /XObject /Subtype /Image /Width 640 /Height 150 /ColorSpace /DeviceGray /BitsPerComponent 8 /Filter /FlateDecode"),
  ]);
  const extracted = await extractMaterial(new File([data], "mixed.pdf"));
  assert.match(extracted.text, /binary digit is called a bit/i);
  assert.match(extracted.text, /byte contains eight bits/i);
});
