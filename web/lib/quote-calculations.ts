export interface QuoteLineInput {
  partId: string;
  description: string;
  quantity: number;
  unitPriceCents: number;
  discountBps: number;
}

export function calculateLineTotal(line: QuoteLineInput) {
  const gross = line.quantity * line.unitPriceCents;
  return Math.max(0, Math.round(gross * (10_000 - line.discountBps) / 10_000));
}

export function calculateQuoteTotals(lines: QuoteLineInput[], taxRateBps: number) {
  const totalCents = lines.reduce((sum, line) => sum + calculateLineTotal(line), 0);
  const taxBaseCents = Math.round(totalCents * 10_000 / (10_000 + taxRateBps));
  return { totalCents, taxBaseCents, taxCents: totalCents - taxBaseCents };
}

export function formatMoney(cents: number) {
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(cents / 100);
}
