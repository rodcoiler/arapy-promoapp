-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "isOnline" BOOLEAN NOT NULL DEFAULT false,
    "scope" TEXT,
    "expires" DATETIME,
    "accessToken" TEXT NOT NULL,
    "userId" BIGINT,
    "firstName" TEXT,
    "lastName" TEXT,
    "email" TEXT,
    "accountOwner" BOOLEAN NOT NULL DEFAULT false,
    "locale" TEXT,
    "collaborator" BOOLEAN DEFAULT false,
    "emailVerified" BOOLEAN DEFAULT false
);

-- CreateTable
CREATE TABLE "Promotion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "ruleType" TEXT NOT NULL DEFAULT 'NxM',
    "buyQuantity" INTEGER NOT NULL DEFAULT 4,
    "getQuantity" INTEGER NOT NULL DEFAULT 1,
    "collections" TEXT NOT NULL DEFAULT '[]',
    "applyToAll" BOOLEAN NOT NULL DEFAULT false,
    "discountType" TEXT NOT NULL DEFAULT 'free',
    "discountValue" REAL NOT NULL DEFAULT 100,
    "targetItem" TEXT NOT NULL DEFAULT 'cheapest',
    "giftProductId" TEXT,
    "giftProductTitle" TEXT,
    "giftProductImage" TEXT,
    "freeShipping" BOOLEAN NOT NULL DEFAULT false,
    "bannerMsgAlmost" TEXT NOT NULL DEFAULT '¡Agrega {MISSING} artículo(s) más y llévate 1 GRATIS!',
    "bannerMsgActive" TEXT NOT NULL DEFAULT '🎉 ¡Promo activa! Tienes {COUNT} producto(s) GRATIS en tu carrito',
    "modalTitle" TEXT NOT NULL DEFAULT '¡Casi lo logras!',
    "modalBody" TEXT NOT NULL DEFAULT 'Agrega {MISSING} artículo(s) más y llévate el de menor valor GRATIS',
    "modalBtnText" TEXT NOT NULL DEFAULT '¡Aprovechar la promo!',
    "modalDismissText" TEXT NOT NULL DEFAULT 'No gracias, continuar al pago',
    "badgeText" TEXT NOT NULL DEFAULT '¡GRATIS!',
    "savingsRowLabel" TEXT NOT NULL DEFAULT 'Descuento aplicado',
    "accentColor" TEXT NOT NULL DEFAULT '#D9FF4F',
    "accentTextColor" TEXT NOT NULL DEFAULT '#000000',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "Promotion_shop_idx" ON "Promotion"("shop");
