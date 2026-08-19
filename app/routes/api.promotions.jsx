import { json } from "@remix-run/node";
import { getPromotions } from "../models/promotion.server";


/**
 * Public API endpoint: /api/promotions
 * Returns active promotions for a shop (used by the storefront script tag)
 */
export const loader = async ({ request }) => {
  const url = new URL(request.url);
  const shop = url.searchParams.get("shop");

  if (!shop) {
    return json({ error: "Missing shop parameter" }, { status: 400 });
  }

  let promotions = await getPromotions(shop);

  // Mismatch fallback: if no promotions found, try querying with the default shop from sessions table
  if (promotions.length === 0) {
    try {
      const prisma = (await import("../db.server")).default;
      const session = await prisma.session.findFirst();
      if (session && session.shop) {
        promotions = await getPromotions(session.shop);
      }
    } catch (e) {
      // ignore fallback error
    }
  }

  const activePromotions = promotions.filter((p) => p.active);

  return json(
    {
      promotions: activePromotions.map((p) => ({
        id: p.id,
        name: p.name,
        active: p.active,
        ruleType: p.ruleType,
        buyQuantity: p.buyQuantity,
        getQuantity: p.getQuantity,
        collections: JSON.parse(p.collections || "[]"),
        productIds: JSON.parse(p.productIds || "[]"),
        getProductIds: JSON.parse(p.getProductIds || "[]"),
        applyToAll: p.applyToAll,
        discountType: p.discountType,
        discountValue: p.discountValue,
        targetItem: p.targetItem,
        freeShipping: p.freeShipping,
        bannerMsgAlmost: p.bannerMsgAlmost,
        bannerMsgActive: p.bannerMsgActive,
        modalTitle: p.modalTitle,
        modalBody: p.modalBody,
        modalBtnText: p.modalBtnText,
        modalDismissText: p.modalDismissText,
        badgeText: p.badgeText,
        savingsRowLabel: p.savingsRowLabel,
        accentColor: p.accentColor,
        accentTextColor: p.accentTextColor,
      })),
    },
    {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=60",
      },
    }
  );
};
