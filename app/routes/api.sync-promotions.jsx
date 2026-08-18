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

    metafieldData = await metafieldResponse.json();
  } catch (error) {
    console.error("Error setting metafield:", error);
  }

  // 2. Create or Update Automatic App Discount to run our Shopify Function
  const functionId = process.env.SHOPIFY_PROMOBOX_DISCOUNT_ID;
  if (functionId) {
    try {
      // Check if the discount already exists
      const discountsRes = await admin.graphql(`
        query {
          discountNodes(first: 10) {
            edges {
              node {
                id
                discount {
                  ... on DiscountAutomaticApp {
                    title
                    appDiscountType {
                      functionId
                    }
                  }
                }
              }
            }
          }
        }
      `);
      const discountsData = await discountsRes.json();
      const existingDiscounts = discountsData?.data?.discountNodes?.edges || [];
      
      let discountExists = false;
      for (const edge of existingDiscounts) {
        if (edge.node.discount?.appDiscountType?.functionId === functionId) {
          discountExists = true;
          break;
        }
      }

      if (!discountExists) {
        // Create it
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
           console.error("User Errors creating discount:", createDiscountData.data.discountAutomaticAppCreate.userErrors);
        }
      }
    } catch (error) {
      console.error("Error managing automatic discount:", error);
    }
  }

  // 3. Create Script Tag for storefront injection (auto-injects promobox-storefront.js)
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
