import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import type { Notebook, Page } from "./types";
import { templateSpacingPoints } from "./templateSpacing";
type Stroke = {
  d: string;
  color: string;
  width: number;
  opacity: number;
  dashed?: boolean;
  fill?: "translucent" | "solid";
};
const esc = (v: string) =>
  v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
export async function exportNotebookPdf(note: Notebook) {
  const pages = note.pages
    .map((page) => {
      let strokes: Stroke[] = [];
      try {
        strokes = JSON.parse(page.drawingData || "[]");
      } catch {}
      const paths = strokes
        .map(
          (x) =>
            `<path d="${esc(x.d)}" stroke="${esc(x.color)}" stroke-width="${x.width}" ${x.dashed ? 'stroke-dasharray="12 7"' : ""} opacity="${x.opacity}" fill="${x.fill ? esc(x.color) : "none"}" ${x.fill ? `fill-opacity="${x.fill === "solid" ? .72 : .2}"` : ""} stroke-linecap="round" stroke-linejoin="round"/>`,
        )
        .join("");
      const elements = (page.elements ?? [])
        .map((x) =>
          x.kind === "text"
            ? `<div style="position:absolute;white-space:pre-wrap;overflow:hidden;left:${x.x * 100}%;top:${x.y * 100}%;width:${x.width * 100}%;height:${x.height * 100}%;font-size:${x.fontSize}px;color:${esc(x.color)}">${esc(x.text)}${x.source ? `<span style="position:absolute;left:0;bottom:0;font-size:${Math.max(9, x.fontSize * 0.55)}px;font-weight:600;color:#2f7d66">↩ ${esc(x.source.pdfName || "PDF")} · ${x.source.pageIndex + 1}쪽</span>` : ""}</div>`
            : `<img src="${esc(x.uri)}" style="position:absolute;object-fit:${x.fit ?? "contain"};left:${x.x * 100}%;top:${x.y * 100}%;width:${x.width * 100}%;height:${x.height * 100}%;transform:rotate(${x.rotation ?? 0}deg)"/>`,
        )
        .join("");
      const custom = page.customTemplateUri
        ? `<img class="template-bg" src="${esc(page.customTemplateUri)}"/>`
        : "";
      const paint =
        page.backgroundColor && (page.backgroundOpacity ?? 0) > 0
          ? `<div class="page-paint" style="background:${esc(page.backgroundColor)};opacity:${page.backgroundOpacity}"></div>`
          : "";
      const rotation = page.rotation ?? 0,
        portrait = rotation === 90 || rotation === 270;
      const columns=Math.max(1,Math.min(4,page.canvasExtent?.columns??1)),rows=Math.max(1,Math.min(4,page.canvasExtent?.rows??1));
      const spacing = templateSpacingPoints(page.templateSpacing);
      const widthMm=297*columns,heightMm=210*rows;
      return `<section class="page" style="width:${portrait?heightMm:widthMm}mm;height:${portrait?widthMm:heightMm}mm"><div class="page-content ${page.template}" style="--spacing:${spacing}px;width:${widthMm}mm;height:${heightMm}mm;transform:translate(-50%,-50%) rotate(${rotation}deg)">${custom}${paint}<svg viewBox="0 0 ${900*columns} ${636*rows}">${paths}</svg>${elements}</div></section>`;
    })
    .join("");
  const html = `<!doctype html><html><head><style>@page{size:auto;margin:0}body{margin:0}.page{position:relative;page-break-after:always;background:#fff;overflow:hidden}.landscape{width:297mm;height:210mm}.portrait{width:210mm;height:297mm}.page-content{position:absolute;left:50%;top:50%;width:297mm;height:210mm;transform-origin:center}.template-bg,.page-paint{position:absolute;inset:0;width:100%;height:100%;object-fit:fill}.line{background-image:repeating-linear-gradient(#fff 0,#fff calc(var(--spacing) - 1px),#dde2dd var(--spacing))}.grid{background-image:linear-gradient(#dde2dd 1px,transparent 1px),linear-gradient(90deg,#dde2dd 1px,transparent 1px);background-size:var(--spacing) var(--spacing)}.dot{background-image:radial-gradient(#bdc4bd 1px,transparent 1px);background-size:var(--spacing) var(--spacing)}.cornell{background-image:linear-gradient(90deg,transparent 24.8%,#bfd0c8 25%,transparent 25.2%),linear-gradient(0deg,transparent 17.8%,#bfd0c8 18%,transparent 18.2%),repeating-linear-gradient(#fff 0,#fff calc(var(--spacing) - 1px),#dde2dd var(--spacing))}.planner{background-image:linear-gradient(#dde2dd 1px,transparent 1px),linear-gradient(90deg,#dde2dd 1px,transparent 1px);background-size:100% 11.11%,14.285% 100%}.dark{background-color:#202522;background-image:repeating-linear-gradient(transparent 0,transparent calc(var(--spacing) - 1px),#465149 var(--spacing))}svg{position:relative;width:100%;height:100%}</style></head><body>${pages}</body></html>`;
  const { uri } = await Print.printToFileAsync({ html });
  await Sharing.shareAsync(uri, {
    mimeType: "application/pdf",
    dialogTitle: `${note.title} PDF 내보내기`,
  });
  return uri;
}
export async function exportPagePng(
  note: Notebook,
  page: Page,
  pageIndex: number,
) {
  let strokes: Stroke[] = [];
  try {
    strokes = JSON.parse(page.drawingData || "[]");
  } catch {}
  const paths = strokes
    .map(
      (x) =>
        `<path d="${esc(x.d)}" stroke="${esc(x.color)}" stroke-width="${x.width}" ${x.dashed ? 'stroke-dasharray="12 7"' : ""} opacity="${x.opacity}" fill="${x.fill ? esc(x.color) : "none"}" ${x.fill ? `fill-opacity="${x.fill === "solid" ? .72 : .2}"` : ""} stroke-linecap="round" stroke-linejoin="round"/>`,
    )
    .join("");
  const columns=Math.max(1,Math.min(4,page.canvasExtent?.columns??1)),rows=Math.max(1,Math.min(4,page.canvasExtent?.rows??1)),canvasWidth=900*columns,canvasHeight=636*rows;
  const labels = (page.elements ?? [])
    .map((x) =>
      x.kind === "text"
        ? `<text x="${x.x * canvasWidth}" y="${x.y * canvasHeight + x.fontSize}" font-family="sans-serif" font-size="${x.fontSize}" fill="${esc(x.color)}">${esc(x.text)}</text>${x.source ? `<text x="${x.x * canvasWidth}" y="${(x.y + x.height) * canvasHeight - 5}" font-family="sans-serif" font-size="${Math.max(9, x.fontSize * 0.55)}" font-weight="600" fill="#2f7d66">↩ ${esc(x.source.pdfName || "PDF")} · ${x.source.pageIndex + 1}쪽</text>` : ""}`
        : `<image href="${esc(x.uri)}" x="${x.x * canvasWidth}" y="${x.y * canvasHeight}" width="${x.width * canvasWidth}" height="${x.height * canvasHeight}" preserveAspectRatio="xMidYMid ${x.fit === "cover" ? "slice" : "meet"}" transform="rotate(${x.rotation ?? 0} ${x.x * canvasWidth + x.width * canvasWidth/2} ${x.y * canvasHeight + x.height * canvasHeight/2})"/>`,
    )
    .join("");
  const spacing = templateSpacingPoints(page.templateSpacing);
  const ruled = `<defs><pattern id="r" width="${spacing}" height="${spacing}" patternUnits="userSpaceOnUse"><path d="M0 ${spacing - .5}H${spacing}" stroke="#dde2dd"/></pattern><pattern id="g" width="${spacing}" height="${spacing}" patternUnits="userSpaceOnUse"><path d="M0 ${spacing - .5}H${spacing}M${spacing - .5} 0V${spacing}" stroke="#dde2dd"/></pattern><pattern id="d" width="${spacing}" height="${spacing}" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="1" fill="#bdc4bd"/></pattern></defs>`;
  const background = page.customTemplateUri
    ? `<image href="${esc(page.customTemplateUri)}" width="${canvasWidth}" height="${canvasHeight}" preserveAspectRatio="none"/>`
    : page.template === "dark"
      ? `<rect width="${canvasWidth}" height="${canvasHeight}" fill="#202522"/><path d="${Array.from({length:Math.ceil(canvasHeight/spacing)},(_,i)=>`M0 ${(i+1)*spacing}H${canvasWidth}`).join(' ')}" stroke="#465149"/>`
      : page.template === "cornell"
        ? `${ruled}<rect width="${canvasWidth}" height="${canvasHeight}" fill="white"/><rect x="${canvasWidth*.25}" width="${canvasWidth*.75}" height="${canvasHeight*.82}" fill="url(#r)"/><path d="M${canvasWidth*.25} 0V${canvasHeight*.82}M0 ${canvasHeight*.82}H${canvasWidth}" stroke="#bfd0c8"/>`
        : page.template === "planner"
          ? `<rect width="${canvasWidth}" height="${canvasHeight}" fill="white"/><path d="${Array.from({ length: 8 }, (_, i) => `M${i * canvasWidth/7} ${canvasHeight*.1}V${canvasHeight*.97}`).join(" ")} ${Array.from({ length: 10 }, (_, i) => `M0 ${canvasHeight*.1+i*canvasHeight*.097}H${canvasWidth}`).join(" ")}" stroke="#dde2dd"/>`
          : page.template === "line"
            ? `${ruled}<rect width="${canvasWidth}" height="${canvasHeight}" fill="url(#r)"/>`
            : page.template === "grid"
              ? `${ruled}<rect width="${canvasWidth}" height="${canvasHeight}" fill="url(#g)"/>`
              : page.template === "dot"
                ? `${ruled}<rect width="${canvasWidth}" height="${canvasHeight}" fill="url(#d)"/>`
                : `<rect width="${canvasWidth}" height="${canvasHeight}" fill="white"/>`;
  const paint =
    page.backgroundColor && (page.backgroundOpacity ?? 0) > 0
      ? `<rect width="${canvasWidth}" height="${canvasHeight}" fill="${esc(page.backgroundColor)}" opacity="${page.backgroundOpacity}"/>`
      : "";
  const rotation = page.rotation ?? 0,
    odd = rotation === 90 || rotation === 270,
    viewWidth = odd ? canvasHeight : canvasWidth,
    viewHeight = odd ? canvasWidth : canvasHeight,
    transform =
      rotation === 90
        ? `translate(${canvasHeight} 0) rotate(90)`
        : rotation === 180
          ? `translate(${canvasWidth} ${canvasHeight}) rotate(180)`
          : rotation === 270
            ? `translate(0 ${canvasWidth}) rotate(-90)`
            : "";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${viewWidth * 3}" height="${viewHeight * 3}" viewBox="0 0 ${viewWidth} ${viewHeight}"><g transform="${transform}">${background}${paint}${paths}${labels}</g></svg>`;
  const image = new Image();
  const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error("PNG 렌더링 실패"));
    image.src = url;
  });
  const canvas = document.createElement("canvas");
  canvas.width = viewWidth * 3;
  canvas.height = viewHeight * 3;
  canvas.getContext("2d")?.drawImage(image, 0, 0, canvas.width, canvas.height);
  URL.revokeObjectURL(url);
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (v) => (v ? resolve(v) : reject(new Error("PNG 변환 실패"))),
      "image/png",
    ),
  );
  const output = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = output;
  link.download = `${note.title}-${pageIndex + 1}.png`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(output), 1000);
  return output;
}

export async function createPageFlashcardAssets(_page:Page,_pageIndex:number,_splitRatio=.5):Promise<{questionUri:string;answerUri:string}>{
  throw new Error('페이지 Q/A 이미지 카드는 iPad 앱에서 사용할 수 있습니다.');
}
