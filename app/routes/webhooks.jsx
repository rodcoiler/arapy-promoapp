import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";

export const action = async ({ request }) => {
  const { topic, shop, session, admin, payload } = await authenticate.webhook(request);

  if (!admin && topic !== "CUSTOMERS_DATA_REQUEST") {
    // The admin GraphQL client is required for processing customer data requests.
    throw new Response();
  }

  switch (topic) {
    case "APP_UNINSTALLED":
      // Clean up promotions for the shop on uninstall
      try {
        const prisma = (await import("../db.server")).default;
        await prisma.promotion.deleteMany({ where: { shop } });
        await prisma.session.deleteMany({ where: { shop } });
      } catch (e) {
        console.error("[PromoBox] Error cleaning up on uninstall:", e);
      }
      break;
    case "CUSTOMERS_DATA_REQUEST":
    case "CUSTOMERS_REDACT":
    case "SHOP_REDACT":
    default:
      throw new Response("Unhandled webhook topic", { status: 404 });
  }

  throw new Response();
};
