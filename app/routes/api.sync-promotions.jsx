import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { getPromotions } from "../models/promotion.server";

/**
 * POST /api/sync-promotions
 * Syncs active promotions to Shopify:
 * 1. Creates/updates a Script Tag pointing to promobox-storefront.js
 * 2. Stores promotions config as a Shop metafield (for Cart Transform Function)
 */
export const action = async ({ request }) => {
  const { session, admin } = await authenticate.admin(request);
  const { shop } = session;

  const promotions = await getPromotions(shop);
  const activePromotions = promotions.filter((p) => p.active);

  const promotionsJson = JSON.stringify(
    activePromotions.map((p) => ({
      id: p.id,
      name: p.name,
      active: p.active,
      ruleType: p.ruleType,
      buyQuantity: p.buyQuantity,
      getQuantity: p.getQuantity,
      collections: JSON.parse(p.collections || "[]"),
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
    }))
  );

  // 1. Store promotions as shop metafield (used by Cart Transform Function)
  const metafieldResponse = await admin.graphql(`
    mutation metafieldsSet($metafields: [MetafieldsSetInput!]!) {
      metafieldsSet(metafields: $metafields) {
        metafields {
          id
          namespace
          key
        }
        userErrors {
          field
          message
        }
      }
    }
  `, {
    variables: {
      metafields: [
        {
          namespace: "promobox",
          key: "promotions",
          ownerId: `gid://shopify/Shop/${shop.split(".")[0]}`,
          type: "json",
          value: promotionsJson,
        },
      ],
    },
  });

  const metafieldData = await metafieldResponse.json();

  // 2. Create Script Tag for storefront injection (auto-injects promobox-storefront.js)
  const appUrl = process.env.SHOPIFY_APP_URL;
  const scriptUrl = `${appUrl}/promobox-storefront.js`;

  // Check for existing script tags
  const scriptTagsResponse = await admin.graphql(`
    query {
      scriptTags(first: 50) {
        edges {
          node {
            id
            src
          }
        }
      }
    }
  `);
  const scriptTagsData = await scriptTagsResponse.json();
  const existingTags = scriptTagsData.data?.scriptTags?.edges || [];

  let scriptTagResult = null;
  let tagExistsAndCorrect = false;

  for (const edge of existingTags) {
    const tag = edge.node;
    if (tag.src.includes("promobox") || tag.src.includes("your-app-url")) {
      if (tag.src === scriptUrl) {
        tagExistsAndCorrect = true;
        scriptTagResult = tag;
      } else {
        // Delete incorrect or outdated tag
        await admin.graphql(`
          mutation scriptTagDelete($id: ID!) {
            scriptTagDelete(id: $id) {
              deletedScriptTagId
            }
          }
        `, {
          variables: { id: tag.id },
        });
      }
    }
  }

  if (!tagExistsAndCorrect) {
    // Create new script tag
    const createResponse = await admin.graphql(`
      mutation scriptTagCreate($input: ScriptTagInput!) {
        scriptTagCreate(input: $input) {
          scriptTag {
            id
            src
          }
          userErrors {
            field
            message
          }
        }
      }
    `, {
      variables: {
        input: {
          src: scriptUrl,
          displayScope: "ALL",
        },
      },
    });
    const createData = await createResponse.json();
    scriptTagResult = createData?.data?.scriptTagCreate?.scriptTag || null;
  }

  return json({
    success: true,
    promotionsSynced: activePromotions.length,
    metafield: metafieldData?.data?.metafieldsSet?.metafields?.[0] || null,
    scriptTag: scriptTagResult,
  });
};

export const loader = async ({ request }) => {
  await authenticate.admin(request);
  return json({ message: "Use POST to sync promotions" });
};
