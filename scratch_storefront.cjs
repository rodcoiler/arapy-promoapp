const fs = require('fs');

async function run() {
  const res = await fetch("https://euduvf-10.myshopify.com/");
  const html = await res.text();
  const match = html.match(/window\.PROMOBOX_CONFIG\s*=\s*(\{.*?\});/s);
  if (match) {
    console.log(match[1]);
  } else {
    console.log("Not found");
  }
}

run().catch(console.error);
