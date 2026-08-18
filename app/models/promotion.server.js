import prisma from "../db.server";

/**
 * Get all promotions for a shop
 */
export async function getPromotions(shop) {
  return prisma.promotion.findMany({
    where: { shop },
    orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
  });
}

/**
 * Get a single promotion by ID
 */
export async function getPromotion(id, shop) {
  return prisma.promotion.findFirst({
    where: { id, shop },
  });
}

/**
 * Create a new promotion
 */
export async function createPromotion(shop, data) {
  return prisma.promotion.create({
    data: {
      shop,
      name: data.name,
      active: data.active ?? true,
      priority: data.priority ?? 0,
      ruleType: data.ruleType ?? "NxM",
      buyQuantity: parseInt(data.buyQuantity) || 4,
      getQuantity: parseInt(data.getQuantity) || 1,
      collections: JSON.stringify(data.collections ?? []),
      applyToAll: data.applyToAll ?? false,
      discountType: data.discountType ?? "free",
      discountValue: parseFloat(data.discountValue) || 100,
      targetItem: data.targetItem ?? "cheapest",
      giftProductId: data.giftProductId || null,
      giftProductTitle: data.giftProductTitle || null,
      giftProductImage: data.giftProductImage || null,
      freeShipping: data.freeShipping ?? false,
      bannerMsgAlmost: data.bannerMsgAlmost ?? "¡Agrega {MISSING} artículo(s) más y llévate 1 GRATIS!",
      bannerMsgActive: data.bannerMsgActive ?? "🎉 ¡Promo activa! Tienes {COUNT} producto(s) GRATIS en tu carrito",
      modalTitle: data.modalTitle ?? "¡Casi lo logras!",
      modalBody: data.modalBody ?? "Agrega {MISSING} artículo(s) más y llévate el de menor valor GRATIS",
      modalBtnText: data.modalBtnText ?? "¡Aprovechar la promo!",
      modalDismissText: data.modalDismissText ?? "No gracias, continuar al pago",
      badgeText: data.badgeText ?? "¡GRATIS!",
      savingsRowLabel: data.savingsRowLabel ?? "Descuento aplicado",
      accentColor: data.accentColor ?? "#D9FF4F",
      accentTextColor: data.accentTextColor ?? "#000000",
    },
  });
}

/**
 * Update a promotion
 */
export async function updatePromotion(id, shop, data) {
  return prisma.promotion.update({
    where: { id },
    data: {
      name: data.name,
      active: data.active,
      priority: data.priority !== undefined ? parseInt(data.priority) : undefined,
      ruleType: data.ruleType,
      buyQuantity: data.buyQuantity !== undefined ? parseInt(data.buyQuantity) : undefined,
      getQuantity: data.getQuantity !== undefined ? parseInt(data.getQuantity) : undefined,
      collections: data.collections !== undefined ? JSON.stringify(data.collections) : undefined,
      applyToAll: data.applyToAll,
      discountType: data.discountType,
      discountValue: data.discountValue !== undefined ? parseFloat(data.discountValue) : undefined,
      targetItem: data.targetItem,
      giftProductId: data.giftProductId,
      giftProductTitle: data.giftProductTitle,
      giftProductImage: data.giftProductImage,
      freeShipping: data.freeShipping,
      bannerMsgAlmost: data.bannerMsgAlmost,
      bannerMsgActive: data.bannerMsgActive,
      modalTitle: data.modalTitle,
      modalBody: data.modalBody,
      modalBtnText: data.modalBtnText,
      modalDismissText: data.modalDismissText,
      badgeText: data.badgeText,
      savingsRowLabel: data.savingsRowLabel,
      accentColor: data.accentColor,
      accentTextColor: data.accentTextColor,
      updatedAt: new Date(),
    },
  });
}

/**
 * Delete a promotion
 */
export async function deletePromotion(id, shop) {
  return prisma.promotion.delete({
    where: { id },
  });
}

/**
 * Toggle active state of a promotion
 */
export async function togglePromotion(id, shop) {
  const promo = await getPromotion(id, shop);
  if (!promo) throw new Error("Promotion not found");
  return prisma.promotion.update({
    where: { id },
    data: { active: !promo.active },
  });
}

/**
 * Get stats for all promotions in a shop
 */
export async function getPromoStats(shop) {
  const total = await prisma.promotion.count({ where: { shop } });
  const active = await prisma.promotion.count({ where: { shop, active: true } });
  return { total, active, inactive: total - active };
}
