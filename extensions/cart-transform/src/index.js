/**
 * PromoBox — Cart Transform Function
 * ====================================
 * Esta función de Shopify aplica el descuento real en los precios del carrito.
 *
 * Shopify Functions se compilan a WebAssembly. Este archivo es la implementación
 * en JavaScript que se compila con Javy (o similar).
 *
 * Lógica:
 * 1. Lee las líneas del carrito
 * 2. Filtra las líneas elegibles según las colecciones de la promoción activa
 * 3. Ordena por precio (más barato primero)
 * 4. Aplica el descuento configurado al/los item(s) objetivo
 *
 * API de entrada/salida:
 * - INPUT: CartTransform Input (cart lines, metafields, etc.)
 * - OUTPUT: CartTransformResult con operaciones de merge/expand y ajustes de precio
 */

// ─── Input / Output Types ─────────────────────────────────────────────────────
// En el entorno de Shopify Functions, el input se recibe via stdin como JSON
// y la salida se escribe en stdout.

const input = JSON.parse(readInput());

/**
 * Main function — entry point
 */
function run(input) {
  const cart = input.cart;
  const cartLines = cart.lines || [];

  // Leer configuración de promociones desde metafields del shop
  // (se injectan como metafields via Admin API cuando se guarda una promo)
  let promotions = [];
  try {
    const metafield = cart.attribute?.value;
    if (metafield) {
      promotions = JSON.parse(metafield);
    }
  } catch (e) {
    // fallback: no promotions
  }

  if (!promotions.length) {
    return noChanges();
  }

  // Evaluar cada promoción activa
  for (const promo of promotions) {
    if (!promo.active) continue;

    const result = applyPromotion(cartLines, promo);
    if (result) return result;
  }

  return noChanges();
}

/**
 * Apply a single promotion to the cart lines
 */
function applyPromotion(cartLines, promo) {
  const eligibleLines = getEligibleLines(cartLines, promo);
  const totalUnits = eligibleLines.reduce((sum, l) => sum + l.quantity, 0);

  if (totalUnits < promo.buyQuantity) {
    return null; // Promo no aplica
  }

  // Expandir a unidades individuales y ordenar
  const units = expandToUnits(eligibleLines);
  if (promo.targetItem === "most_expensive") {
    units.sort((a, b) => b.price - a.price);
  } else {
    units.sort((a, b) => a.price - b.price);
  }

  // Los primeros `getQuantity` items reciben el descuento
  const discountedUnits = units.slice(0, promo.getQuantity);
  if (!discountedUnits.length) return null;

  // Construir operaciones de cart transform
  const operations = [];

  // Agrupar unidades descontadas por línea de carrito
  const discountsByLine = {};
  for (const unit of discountedUnits) {
    if (!discountsByLine[unit.lineId]) {
      discountsByLine[unit.lineId] = { count: 0, price: unit.price };
    }
    discountsByLine[unit.lineId].count++;
  }

  // Para cada línea con descuento, aplicar via merge/expand
  for (const [lineId, info] of Object.entries(discountsByLine)) {
    const line = cartLines.find((l) => l.id === lineId);
    if (!line) continue;

    const discountedQty = info.count;
    const normalQty = line.quantity - discountedQty;

    let discountedPrice;
    if (promo.discountType === "free") {
      discountedPrice = 0;
    } else if (promo.discountType === "percentage") {
      discountedPrice = Math.round(info.price * (1 - promo.discountValue / 100));
    } else if (promo.discountType === "fixed") {
      discountedPrice = Math.max(0, info.price - Math.round(promo.discountValue * 100));
    } else {
      discountedPrice = 0;
    }

    if (normalQty > 0 && discountedQty > 0) {
      // Necesitamos expandir la línea en dos: una con precio normal y otra con descuento
      operations.push({
        expand: {
          cartLineId: lineId,
          expandedCartItems: [
            {
              merchandiseId: line.merchandise.id,
              quantity: normalQty,
              price: {
                adjustment: {
                  fixedPricePerUnit: { amount: (info.price / 100).toFixed(2), currencyCode: "USD" },
                },
              },
            },
            {
              merchandiseId: line.merchandise.id,
              quantity: discountedQty,
              price: {
                adjustment: {
                  fixedPricePerUnit: { amount: (discountedPrice / 100).toFixed(2), currencyCode: "USD" },
                },
              },
            },
          ],
        },
      });
    } else if (discountedQty === line.quantity) {
      // Toda la línea recibe descuento
      operations.push({
        expand: {
          cartLineId: lineId,
          expandedCartItems: [
            {
              merchandiseId: line.merchandise.id,
              quantity: discountedQty,
              price: {
                adjustment: {
                  fixedPricePerUnit: { amount: (discountedPrice / 100).toFixed(2), currencyCode: "USD" },
                },
              },
            },
          ],
        },
      });
    }
  }

  if (!operations.length) return null;

  return { operations };
}

/**
 * Get cart lines eligible for a promotion
 */
function getEligibleLines(cartLines, promo) {
  if (promo.applyToAll) return cartLines;

  const eligibleCollections = promo.collections || [];
  if (!eligibleCollections.length) return cartLines;

  return cartLines.filter((line) => {
    const productCollections = line.merchandise?.product?.collections?.nodes || [];
    return productCollections.some((col) =>
      eligibleCollections.includes(col.id)
    );
  });
}

/**
 * Expand cart lines into individual units for price comparison
 */
function expandToUnits(cartLines) {
  const units = [];
  for (const line of cartLines) {
    const price = line.cost?.amountPerQuantity
      ? Math.round(parseFloat(line.cost.amountPerQuantity.amount) * 100)
      : 0;

    for (let i = 0; i < line.quantity; i++) {
      units.push({ lineId: line.id, price });
    }
  }
  return units;
}

/**
 * Return an empty result (no changes to the cart)
 */
function noChanges() {
  return { operations: [] };
}

/**
 * Read input from stdin (Shopify Functions environment)
 */
function readInput() {
  const chunks = [];
  const buf = new Uint8Array(1024);
  let bytesRead;
  // In the Shopify Functions WASM runtime, stdin is available via global
  // For local testing, we read from process.stdin
  if (typeof __stdin !== "undefined") {
    return __stdin;
  }
  // Node.js fallback for testing
  return process.env.PROMOBOX_INPUT || "{}";
}

// Execute and write output
const output = run(input);
process.stdout.write(JSON.stringify(output));
