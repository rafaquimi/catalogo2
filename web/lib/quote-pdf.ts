import "server-only";

import { PDFDocument, PDFFont, PDFImage, PDFPage, StandardFonts, rgb } from "pdf-lib";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { prisma } from "@/lib/prisma";
import { getR2Bucket, getR2Client } from "@/lib/r2";
import { getR2KeyFromUrl } from "@/lib/image-storage";

const A4 = { width: 595.28, height: 841.89 };
const navy = rgb(0.035, 0.09, 0.18);
const blue = rgb(0.04, 0.38, 0.7);
const cyan = rgb(0.13, 0.78, 0.86);
const slate = rgb(0.35, 0.4, 0.48);
const pale = rgb(0.95, 0.97, 0.99);

function money(cents: number) { return `${(cents / 100).toFixed(2).replace(".", ",")} EUR`; }
function date(value: Date) { return new Intl.DateTimeFormat("es-ES").format(value); }

function wrap(text: string, font: PDFFont, size: number, width: number) {
  const words = text.replace(/\s+/g, " ").trim().split(" ");
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= width) line = candidate;
    else { if (line) lines.push(line); line = word; }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [""];
}

function drawText(page: PDFPage, text: string, x: number, y: number, font: PDFFont, size = 9, color = navy) {
  page.drawText(text, { x, y, font, size, color });
}

export async function generateQuotePdf(quoteId: string) {
  const [quote, company] = await Promise.all([
    prisma.quote.findUnique({ where: { id: quoteId }, include: { items: { orderBy: { position: "asc" } } } }),
    prisma.companySettings.upsert({ where: { id: "default" }, create: { id: "default" }, update: {} }),
  ]);
  if (!quote) throw new Error("Presupuesto no encontrado.");

  const doc = await PDFDocument.create();
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  let logoImage: PDFImage | null = null;
  if (company.logoUrl) {
    try {
      const key = getR2KeyFromUrl(company.logoUrl);
      if (key) {
        const object = await getR2Client().send(new GetObjectCommand({ Bucket: getR2Bucket(), Key: key }));
        if (object.Body) logoImage = await doc.embedPng(await object.Body.transformToByteArray());
      }
    } catch (error) {
      console.error("No se ha podido incluir el logo en el PDF", error);
    }
  }
  let page = doc.addPage([A4.width, A4.height]);
  let y = A4.height - 45;

  const header = () => {
    page.drawRectangle({ x: 0, y: A4.height - 125, width: A4.width, height: 125, color: navy });
    let companyX = 45;
    if (logoImage) {
      const scale = Math.min(72 / logoImage.width, 44 / logoImage.height);
      page.drawImage(logoImage, { x: 45, y: A4.height - 83, width: logoImage.width * scale, height: logoImage.height * scale });
      companyX = 130;
    }
    drawText(page, company.businessName || "Catálogo Pro", companyX, A4.height - 52, bold, 20, rgb(1,1,1));
    const contact = [company.taxId, company.address, [company.postalCode, company.city, company.province].filter(Boolean).join(" "), company.phone, company.email].filter(Boolean);
    contact.slice(0,4).forEach((line, i) => drawText(page, line, companyX, A4.height - 73 - i*13, regular, 8.5, rgb(.72,.78,.86)));
    drawText(page, "PRESUPUESTO", 395, A4.height - 50, bold, 12, cyan);
    drawText(page, quote.number, 395, A4.height - 75, bold, 15, rgb(1,1,1));
    drawText(page, `Fecha: ${date(quote.issueDate)}`, 395, A4.height - 95, regular, 8.5, rgb(.72,.78,.86));
    drawText(page, `Válido hasta: ${date(quote.validUntil)}`, 395, A4.height - 109, regular, 8.5, rgb(.72,.78,.86));
    y = A4.height - 160;
  };
  const tableHeader = () => {
    page.drawRectangle({ x: 42, y: y - 5, width: 511, height: 25, color: navy });
    drawText(page, "DESCRIPCIÓN", 52, y + 3, bold, 8, rgb(1,1,1));
    drawText(page, "CANT.", 338, y + 3, bold, 8, rgb(1,1,1));
    drawText(page, "PRECIO", 397, y + 3, bold, 8, rgb(1,1,1));
    drawText(page, "DTO.", 470, y + 3, bold, 8, rgb(1,1,1));
    drawText(page, "TOTAL", 515, y + 3, bold, 8, rgb(1,1,1));
    y -= 20;
  };
  const newPage = () => { page = doc.addPage([A4.width, A4.height]); header(); tableHeader(); };

  header();
  page.drawRectangle({ x: 42, y: y - 68, width: 511, height: 72, color: pale, borderColor: rgb(.88,.91,.95), borderWidth: 1 });
  drawText(page, "CLIENTE", 55, y - 17, bold, 8, blue);
  drawText(page, quote.customerName, 55, y - 38, bold, 12);
  drawText(page, quote.customerPhone, 55, y - 55, regular, 9, slate);
  if (quote.customerEmail) drawText(page, quote.customerEmail, 300, y - 55, regular, 9, slate);
  y -= 100;
  tableHeader();

  quote.items.forEach((item, index) => {
    const lines = wrap(item.description, regular, 9, 265).slice(0,3);
    const rowHeight = Math.max(29, lines.length * 12 + 13);
    if (y - rowHeight < 155) newPage();
    if (index % 2 === 0) page.drawRectangle({ x: 42, y: y - rowHeight + 6, width: 511, height: rowHeight, color: rgb(.98,.985,.995) });
    lines.forEach((line,i)=>drawText(page,line,52,y-i*12,regular,9));
    drawText(page, String(item.quantity), 347, y, regular, 9);
    drawText(page, money(item.unitPriceCents), 390, y, regular, 8.5);
    drawText(page, `${(item.discountBps/100).toFixed(0)}%`, 478, y, regular, 9);
    const totalText = money(item.totalCents);
    drawText(page, totalText, 548 - bold.widthOfTextAtSize(totalText, 8.5), y, bold, 8.5);
    y -= rowHeight;
  });

  if (y < 235) { page = doc.addPage([A4.width,A4.height]); y=A4.height-70; }
  const boxY = y - 112;
  page.drawRectangle({ x: 350, y: boxY, width: 203, height: 112, color: navy });
  drawText(page, "Base imponible", 368, y-24, regular, 9, rgb(.72,.78,.86));
  drawText(page, money(quote.taxBaseCents), 535-bold.widthOfTextAtSize(money(quote.taxBaseCents),9), y-24, bold, 9, rgb(1,1,1));
  drawText(page, `IVA incluido (${(quote.taxRateBps/100).toFixed(0)}%)`, 368, y-48, regular, 9, rgb(.72,.78,.86));
  drawText(page, money(quote.taxCents), 535-bold.widthOfTextAtSize(money(quote.taxCents),9), y-48, bold, 9, rgb(1,1,1));
  page.drawLine({ start:{x:368,y:y-63}, end:{x:535,y:y-63}, thickness:1, color:rgb(.2,.3,.42) });
  drawText(page, "TOTAL", 368, y-91, bold, 11, cyan);
  drawText(page, money(quote.totalCents), 535-bold.widthOfTextAtSize(money(quote.totalCents),15), y-94, bold, 15, rgb(1,1,1));
  if (quote.notes) {
    drawText(page,"NOTAS Y CONDICIONES",45,y-22,bold,8,blue);
    wrap(quote.notes,regular,8.5,270).slice(0,7).forEach((line,i)=>drawText(page,line,45,y-40-i*12,regular,8.5,slate));
  }

  const pages = doc.getPages();
  pages.forEach((p,i)=>{
    p.drawLine({start:{x:42,y:38},end:{x:553,y:38},thickness:.7,color:rgb(.85,.88,.92)});
    drawText(p, `${company.businessName || "Catálogo Pro"} · Presupuesto ${quote.number}`, 42, 23, regular, 7.5, slate);
    const num=`Página ${i+1} de ${pages.length}`; drawText(p,num,553-regular.widthOfTextAtSize(num,7.5),23,regular,7.5,slate);
  });
  return { bytes: await doc.save(), quote };
}
