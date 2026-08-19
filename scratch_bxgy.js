import { shopifyApi, LATEST_API_VERSION } from "@shopify/shopify-api";
import "@shopify/shopify-app-remix/adapters/node";

const shopify = shopifyApi({
  apiKey: "bd67554b5dfd47781b0a7c4f420cb05d",
  apiSecretKey: "5e9c0c809923b72691eb29cc9b3baac6",
  scopes: ["read_discounts"],
  hostName: "promoapp.proyecto.link",
  apiVersion: LATEST_API_VERSION,
  isEmbeddedApp: true,
});

async function run() {
  const session = {
    shop: "euduvf-10.myshopify.com",
    accessToken: "shpua_a0a7e02580abf3baecb4231b79f85c3f",
  };

  const client = new shopify.clients.Graphql({ session });
  
  const res = await client.request(`
    query {
      automaticDiscountNodes(first: 5) {
        edges {
          node {
            id
            automaticDiscount {
              ... on DiscountAutomaticBxgy {
                title
                status
                customerBuys {
                  value {
                    ... on DiscountQuantity {
                      quantity
                    }
                  }
                  items {
                    ... on DiscountCollections {
                      collections(first: 5) {
                        edges {
                          node {
                            id
                          }
                        }
                      }
                    }
                  }
                }
                customerGets {
                  value {
                    ... on DiscountOnQuantity {
                      quantity {
                        quantity
                      }
                      effect {
                        ... on DiscountPercentage {
                          percentage
                        }
                      }
                    }
                  }
                  items {
                    ... on DiscountCollections {
                      collections(first: 5) {
                        edges {
                          node {
                            id
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  `);

  console.log(JSON.stringify(res, null, 2));
}

run().catch(console.error);
