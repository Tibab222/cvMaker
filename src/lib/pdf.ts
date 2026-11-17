import { GlobalWorkerOptions, getDocument } from "pdfjs-dist";
import type { TextItem } from "pdfjs-dist/types/src/display/api";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { VAULT_MAX_BYTES, type VaultImportPayload } from "@shared/vault.types";

GlobalWorkerOptions.workerSrc = workerUrl;

const THUMBNAIL_WIDTH = 240;

/** Text of one page, lines kept, words separated where the layout leaves a gap (PDFs often split words in pieces). */
function pageText(items: TextItem[]): string {
  let text = "";
  let previous: TextItem | null = null;
  for (const item of items) {
    if (previous && !previous.hasEOL) {
      const previousEnd = previous.transform[4] + previous.width;
      const gap = item.transform[4] - previousEnd;
      const sameLine = Math.abs(item.transform[5] - previous.transform[5]) < 2;
      if (!sameLine) text += "\n";
      else if (gap > 1 && !/\s$/.test(text) && !/^\s/.test(item.str)) text += " ";
    }
    text += item.str;
    if (item.hasEOL) text += "\n";
    previous = item;
  }
  return text.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n");
}

async function renderThumbnail(page: Awaited<ReturnType<Awaited<ReturnType<typeof getDocument>["promise"]>["getPage"]>>): Promise<string | null> {
  try {
    const base = page.getViewport({ scale: 1 });
    const viewport = page.getViewport({ scale: THUMBNAIL_WIDTH / base.width });
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(viewport.width);
    canvas.height = Math.round(viewport.height);
    const context = canvas.getContext("2d");
    if (!context) return null;
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvas, canvasContext: context, viewport }).promise;
    return canvas.toDataURL("image/jpeg", 0.82);
  } catch {
    return null;
  }
}

/** Reads a PDF resume in the window: bytes for the vault, its text, page count and a thumbnail of the first page. */
export async function readPdfResume(file: File): Promise<VaultImportPayload> {
  if (file.size > VAULT_MAX_BYTES) throw new Error(`${file.name} is over ${VAULT_MAX_BYTES / 1024 / 1024} MB.`);
  const bytes = new Uint8Array(await file.arrayBuffer());
  // pdf.js takes ownership of the buffer it reads: give it a copy, the original goes to the vault
  const task = getDocument({ data: bytes.slice() });
  const document = await task.promise.catch(() => {
    throw new Error(`${file.name} could not be read as a PDF.`);
  });
  try {
    const pages: string[] = [];
    let thumbnail: string | null = null;
    for (let index = 1; index <= document.numPages; index++) {
      const page = await document.getPage(index);
      const content = await page.getTextContent();
      pages.push(pageText(content.items.filter((item): item is TextItem => "str" in item)));
      if (index === 1) thumbnail = await renderThumbnail(page);
      page.cleanup();
    }
    return { fileName: file.name, bytes, text: pages.join("\n\n").trim(), pages: document.numPages, thumbnail };
  } finally {
    void task.destroy();
  }
}
