const fetch = require('node-fetch');

async function run() {
  const query = `
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
  `;

  const res = await fetch("https://euduvf-10.myshopify.com/admin/api/2025-01/graphql.json", {
    method: "POST",
    headers: {
      "X-Shopify-Access-Token": "shpua_a0a7e02580abf3baecb4231b79f85c3f",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query })
  });

  const json = await res.json();
  console.log(JSON.stringify(json, null, 2));
}

run().catch(console.error);
