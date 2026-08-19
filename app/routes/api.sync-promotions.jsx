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

    let getCollections = [];
    try {
      getCollections = JSON.parse(p.getCollections || "[]");
    } catch (e) {
      console.error("Error parsing getCollections JSON:", e);
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
      sameCollections: p.sameCollections ?? true,
      getCollections: getCollections,
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

  // 1. Store promotions as shop metafield (used by Cart Transform Function & Storefront)
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

  // 2. Create or Update Native Automatic BXGY Discount (Works on all Shopify Plans)
  for (const p of activePromotions) {
    if (p.ruleType === "NxM") {
      try {
        let targetBuyCollectionGids = [];
        let collections = [];
        try {
          collections = JSON.parse(p.collections || "[]");
        } catch (e) {}

        let getCollections = [];
        try {
          getCollections = JSON.parse(p.getCollections || "[]");
        } catch (e) {}

        // Fetch all store collections if needed
        let allStoreCollectionGids = null;
        const getAllStoreCollections = async () => {
          if (!allStoreCollectionGids) {
            const colsRes = await admin.graphql(`query { collections(first: 50) { edges { node { id } } } }`);
            const colsData = await colsRes.json();
            allStoreCollectionGids = colsData?.data?.collections?.edges?.map(e => e.node.id) || [];
          }
          return allStoreCollectionGids;
        };

        if (p.applyToAll || !collections.length) {
          targetBuyCollectionGids = await getAllStoreCollections();
        } else {
          targetBuyCollectionGids = collections;
        }

        // Determine target Get collection
        let targetGetCollectionGids = [];
        if (p.sameCollections !== false) {
          targetGetCollectionGids = targetBuyCollectionGids;
        } else if (getCollections.length > 0) {
          targetGetCollectionGids = getCollections;
        } else {
          targetGetCollectionGids = await getAllStoreCollections();
        }

        if (targetBuyCollectionGids.length > 0 && targetGetCollectionGids.length > 0) {
          const discountPercentage = p.discountType === "free" ? 1.0 : (p.discountValue ? p.discountValue / 100 : 1.0);

          const bxgyRes = await admin.graphql(`
            mutation discountAutomaticBxgyCreate($automaticBxgyDiscount: DiscountAutomaticBxgyInput!) {
              discountAutomaticBxgyCreate(automaticBxgyDiscount: $automaticBxgyDiscount) {
                automaticDiscountNode {
                  id
                  automaticDiscount {
                    ... on DiscountAutomaticBxgy {
                      title
                      status
                    }
                  }
                }
                userErrors {
                  field
                  message
                }
              }
            }
          `, {
            variables: {
              automaticBxgyDiscount: {
                title: `${p.name || "Promo 4x3"} (PromoBox)`,
                startsAt: new Date().toISOString(),
                customerBuys: {
                  items: {
                    collections: {
                      add: targetBuyCollectionGids
                    }
                  },
                  value: {
                    quantity: String(p.buyQuantity || 4)
                  }
                },
                customerGets: {
                  items: {
                    collections: {
                      add: targetGetCollectionGids
                    }
                  },
                  value: {
                    discountOnQuantity: {
                      quantity: String(p.getQuantity || 1),
                      effect: {
                        percentage: discountPercentage
                      }
                    }
                  }
                },
                usesPerOrderLimit: "1"
              }
            }
          });

          const bxgyData = await bxgyRes.json();
          if (bxgyData?.data?.discountAutomaticBxgyCreate?.userErrors?.length > 0) {
            const errs = bxgyData.data.discountAutomaticBxgyCreate.userErrors;
            if (!errs.some(e => e.message.includes("taken") || e.message.includes("already"))) {
              console.error("BXGY userErrors:", errs);
            }
          } else {
            console.log("Successfully created/updated BXGY discount:", bxgyData?.data?.discountAutomaticBxgyCreate?.automaticDiscountNode?.id);
          }
        }
      } catch (error) {
        console.error("Error creating native BXGY discount:", error);
      }
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
