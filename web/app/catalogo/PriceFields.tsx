"use client";

import { useMemo, useState } from "react";

const TAX_MULTIPLIER = 1.21;

function parseDecimal(value: string) {
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function parsePercentage(value: string) {
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) && parsed >= -100 ? parsed : null;
}

function formatDecimal(value: number, decimals = 2) {
  return value.toFixed(decimals).replace(".", ",");
}

interface PriceFieldsProps {
  initialCostCents?: number;
  initialPriceCents?: number;
  inputClass: string;
}

export function PriceFields({ initialCostCents = 0, initialPriceCents = 0, inputClass }: PriceFieldsProps) {
  const initialMargin = useMemo(() => {
    if (initialCostCents <= 0 || initialPriceCents <= 0) return "0";
    return formatDecimal(((initialPriceCents / 100 / TAX_MULTIPLIER) / (initialCostCents / 100) - 1) * 100);
  }, [initialCostCents, initialPriceCents]);

  const [cost, setCost] = useState(formatDecimal(initialCostCents / 100));
  const [margin, setMargin] = useState(initialMargin);
  const [price, setPrice] = useState(formatDecimal(initialPriceCents / 100));

  function calculatePrice(nextCost: string, nextMargin: string) {
    const costValue = parseDecimal(nextCost);
    const marginValue = parsePercentage(nextMargin);
    if (costValue === null || marginValue === null) return;
    setPrice(formatDecimal(costValue * (1 + marginValue / 100) * TAX_MULTIPLIER));
  }

  function handleCost(nextCost: string) {
    setCost(nextCost);
    calculatePrice(nextCost, margin);
  }

  function handleMargin(nextMargin: string) {
    setMargin(nextMargin);
    calculatePrice(cost, nextMargin);
  }

  function handlePrice(nextPrice: string) {
    setPrice(nextPrice);
    const costValue = parseDecimal(cost);
    const priceValue = parseDecimal(nextPrice);
    if (!costValue || priceValue === null) {
      setMargin("0");
      return;
    }
    const calculated = ((priceValue / TAX_MULTIPLIER) / costValue - 1) * 100;
    setMargin(formatDecimal(calculated));
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:col-span-2">
      <div className="space-y-1.5">
        <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Precio de coste sin IVA</label>
        <input name="cost" required inputMode="decimal" value={cost} onChange={event => handleCost(event.target.value)} className={inputClass} placeholder="Ej: 10,00" />
      </div>
      <div className="space-y-1.5">
        <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Recargo sobre coste (%)</label>
        <input name="margin" required inputMode="decimal" value={margin} onChange={event => handleMargin(event.target.value)} className={inputClass} placeholder="Ej: 30" />
      </div>
      <div className="space-y-1.5">
        <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">PVP con IVA incluido</label>
        <input name="price" required inputMode="decimal" value={price} onChange={event => handlePrice(event.target.value)} className={inputClass} placeholder="Ej: 15,73" />
      </div>
      <p className="text-xs text-slate-500 sm:col-span-3">
        El porcentaje se aplica al coste sin IVA y después se añade el 21% de IVA. Si cambias el PVP, el porcentaje se calcula automáticamente.
      </p>
    </div>
  );
}
