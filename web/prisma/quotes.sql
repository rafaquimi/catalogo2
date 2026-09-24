-- Ejecutar una sola vez en Supabase > SQL Editor antes de desplegar presupuestos.
CREATE TABLE IF NOT EXISTS public."CompanySettings" (
  "id" TEXT NOT NULL,
  "businessName" TEXT NOT NULL DEFAULT '',
  "taxId" TEXT NOT NULL DEFAULT '',
  "address" TEXT NOT NULL DEFAULT '',
  "postalCode" TEXT NOT NULL DEFAULT '',
  "city" TEXT NOT NULL DEFAULT '',
  "province" TEXT NOT NULL DEFAULT '',
  "phone" TEXT NOT NULL DEFAULT '',
  "email" TEXT NOT NULL DEFAULT '',
  "website" TEXT NOT NULL DEFAULT '',
  "logoUrl" TEXT,
  "quotePrefix" TEXT NOT NULL DEFAULT 'PRE',
  "defaultValidityDays" INTEGER NOT NULL DEFAULT 30,
  "defaultTaxBps" INTEGER NOT NULL DEFAULT 2100,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CompanySettings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS public."Customer" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "email" TEXT,
  "notes" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS public."QuoteCounter" (
  "year" INTEGER NOT NULL,
  "nextValue" INTEGER NOT NULL DEFAULT 1,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "QuoteCounter_pkey" PRIMARY KEY ("year")
);

CREATE TABLE IF NOT EXISTS public."Quote" (
  "id" TEXT NOT NULL,
  "number" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "customerId" TEXT NOT NULL,
  "customerName" TEXT NOT NULL,
  "customerPhone" TEXT NOT NULL,
  "customerEmail" TEXT,
  "issueDate" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "validUntil" TIMESTAMPTZ NOT NULL,
  "notes" TEXT,
  "taxRateBps" INTEGER NOT NULL DEFAULT 2100,
  "taxBaseCents" INTEGER NOT NULL,
  "taxCents" INTEGER NOT NULL,
  "totalCents" INTEGER NOT NULL,
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Quote_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Quote_number_key" UNIQUE ("number"),
  CONSTRAINT "Quote_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES public."Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS public."QuoteItem" (
  "id" TEXT NOT NULL,
  "quoteId" TEXT NOT NULL,
  "partId" TEXT,
  "description" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL,
  "unitPriceCents" INTEGER NOT NULL,
  "discountBps" INTEGER NOT NULL DEFAULT 0,
  "totalCents" INTEGER NOT NULL,
  "position" INTEGER NOT NULL,
  CONSTRAINT "QuoteItem_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "QuoteItem_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES public."Quote"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "QuoteItem_partId_fkey" FOREIGN KEY ("partId") REFERENCES public."Part"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS public."QuoteDelivery" (
  "id" TEXT NOT NULL,
  "quoteId" TEXT NOT NULL,
  "channel" TEXT NOT NULL,
  "recipient" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "error" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "QuoteDelivery_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "QuoteDelivery_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES public."Quote"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "Customer_name_idx" ON public."Customer" ("name");
CREATE INDEX IF NOT EXISTS "Customer_phone_idx" ON public."Customer" ("phone");
CREATE INDEX IF NOT EXISTS "Quote_customerId_createdAt_idx" ON public."Quote" ("customerId", "createdAt");
CREATE INDEX IF NOT EXISTS "Quote_status_createdAt_idx" ON public."Quote" ("status", "createdAt");
CREATE INDEX IF NOT EXISTS "Quote_createdAt_idx" ON public."Quote" ("createdAt");
CREATE INDEX IF NOT EXISTS "QuoteItem_quoteId_position_idx" ON public."QuoteItem" ("quoteId", "position");
CREATE INDEX IF NOT EXISTS "QuoteItem_partId_idx" ON public."QuoteItem" ("partId");
CREATE INDEX IF NOT EXISTS "QuoteDelivery_quoteId_createdAt_idx" ON public."QuoteDelivery" ("quoteId", "createdAt");

ALTER TABLE public."CompanySettings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Customer" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."QuoteCounter" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Quote" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."QuoteItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."QuoteDelivery" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."CompanySettings", public."Customer", public."QuoteCounter", public."Quote", public."QuoteItem", public."QuoteDelivery" FROM anon, authenticated;
