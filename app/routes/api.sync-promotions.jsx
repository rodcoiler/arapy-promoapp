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

  // Helper to fetch all product IDs for given collections
  const resolveProductIdsForCollections = async (collectionIds) => {
    if (!collectionIds || collectionIds.length === 0) return [];
    
    const productIds = new Set();
    
    try {
      for (const colId of collectionIds) {
        // Basic pagination (first 250 products per collection for simplicity)
        const res = await admin.graphql(`
          query getCollectionProducts($id: ID!) {
            collection(id: $id) {
              products(first: 250) {
                edges {
                  node {
                    id
                  }
                }
              }
            }
          }
        `, {
          variables: { id: colId }
        });
        
        const data = await res.json();
        const products = data?.data?.collection?.products?.edges || [];
        for (const edge of products) {
          productIds.add(edge.node.id);
        }
      }
    } catch (error) {
      console.error("Error resolving product IDs for collections:", error);
    }
    return Array.from(productIds);
  };

  const resolvedPromotions = [];
  for (const p of activePromotions) {
    let collections = [];
    try {
      collections = JSON.parse(p.collections || "[]");
    } catch (e) {
      console.error("Error parsing collections JSON:", e);
    }
    
    let productIds = [];
    if (!p.applyToAll && collections.length > 0) {
      productIds = await resolveProductIdsForCollections(collections);
    }
    
    resolvedPromotions.push({
      id: p.id,
      name: p.name,
      active: p.active,
      ruleType: p.ruleType,
      buyQuantity: p.buyQuantity,
      getQuantity: p.getQuantity,
      applyToAll: p.applyToAll,
      collections: collections,
      productIds: productIds, // Inject resolved product IDs for the backend Function
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
    });
  }

  const promotionsJson = JSON.stringify(resolvedPromotions);

  // 1. Store promotions as shop metafield (used by Cart Transform Function)
  let metafieldData = null;
  try {
    const shopQueryRes = await admin.graphql(`query { shop { id } }`);
    const shopQueryData = await shopQueryRes.json();
    const shopGid = shopQueryData.data.shop.id;

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
            ownerId: shopGid,
            type: "json",
            value: promotionsJson,
          },
        ],
      },
    });

    metafieldData = await metafieldResponse.json();
    if (metafieldData.data?.metafieldsSet?.userErrors?.length > 0) {
      console.error("Metafield user errors:", metafieldData.data.metafieldsSet.userErrors);
    }
  } catch (error) {
    console.error("Error setting metafield:", error);
  }

  // 2. Create or Update Automatic App Discount to run our Shopify Function
  let functionId = process.env.SHOPIFY_PROMOBOX_DISCOUNT_ID;
  if (!functionId) {
    try {
      const funcRes = await admin.graphql(`
        query {
          shopifyFunctions(first: 10) {
            edges {
              node {
                id
                title
              }
            }
          }
        }
      `);
      const funcData = await funcRes.json();
      const myFunc = funcData.data?.shopifyFunctions?.edges.find(e => 
        e.node.title.includes("promobox-discount") || e.node.title.includes("PromoBox") || e.node.title === "t:name"
      );
      if (myFunc) {
        functionId = myFunc.node.id;
        console.log("Dynamically resolved Function ID:", functionId);
      }
    } catch (error) {
      console.error("Error fetching shopifyFunctions:", error);
    }
  }

  if (functionId) {
    try {
      // Blindly create the discount. If it already exists, it will just return a UserError which we ignore.
      const createDiscountRes = await admin.graphql(`
        mutation discountAutomaticAppCreate($automaticAppDiscount: DiscountAutomaticAppInput!) {
          discountAutomaticAppCreate(automaticAppDiscount: $automaticAppDiscount) {
            automaticAppDiscount {
              discountId
            }
            userErrors {
              field
              message
            }
          }
        }
      `, {
        variables: {
          automaticAppDiscount: {
            title: "PromoBox NxM Discount",
            functionId: functionId,
            startsAt: new Date().toISOString(),
          }
        }
      });
      
      const createDiscountData = await createDiscountRes.json();
      if (createDiscountData.data?.discountAutomaticAppCreate?.userErrors?.length > 0) {
        // If it says "title has already been taken" or similar, we just ignore it.
        const errors = createDiscountData.data.discountAutomaticAppCreate.userErrors;
        if (!errors.some(e => e.message.includes("taken") || e.message.includes("already"))) {
          console.error("User Errors creating discount:", errors);
        }
      }
    } catch (error) {
      console.error("Error managing automatic discount:", error);
    }
  }

  return json({
    success: true,
    promotionsSynced: activePromotions.length,
    metafield: metafieldData?.data?.metafieldsSet?.metafields?.[0] || null,
  });
};

export const loader = async ({ request }) => {
  await authenticate.admin(request);
  return json({ message: "Use POST to sync promotions" });
};
