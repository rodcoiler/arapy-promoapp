import type {
  RunInput,
  FunctionRunResult,
  Target,
  ProductVariant
} from "../generated/api";
import {
  DiscountApplicationStrategy,
} from "../generated/api";

const EMPTY_DISCOUNT: FunctionRunResult = {
  discountApplicationStrategy: DiscountApplicationStrategy.First,
  discounts: [],
};

type PromotionConfig = {
  id: string;
  name: string;
  active: boolean;
  applyToAll: boolean;
  productIds?: string[];
  buyQuantity: number;
  getQuantity: number;
  discountType: "free" | "percentage" | "fixed";
  discountValue: number;
  targetItem: "cheapest" | "most_expensive";
};

export function run(input: RunInput): FunctionRunResult {
  const shopMetafield = input.shop?.metafield?.value;
  if (!shopMetafield) {
    return EMPTY_DISCOUNT;
  }

  let promotions: PromotionConfig[] = [];
  try {
    promotions = JSON.parse(shopMetafield);
  } catch (e) {
    return EMPTY_DISCOUNT;
  }

  if (!promotions || !Array.isArray(promotions) || promotions.length === 0) {
    return EMPTY_DISCOUNT;
  }

  // Find the first active promotion that applies
  for (const promo of promotions) {
    if (!promo.active) continue;

    const eligibleLines = input.cart.lines.filter((line) => {
      if (promo.applyToAll) return true;
      if (!promo.productIds || promo.productIds.length === 0) return true;
      
      const variant = line.merchandise as ProductVariant;
      if (!variant?.product?.id) return false;
      return promo.productIds.includes(variant.product.id);
    });

    const totalUnits = eligibleLines.reduce((acc, line) => acc + line.quantity, 0);

    // If we haven't reached the required buy quantity, continue to next promo
    if (totalUnits < promo.buyQuantity) continue;

    // Expand to individual units so we can sort them by price
    type Unit = { cartLineId: string; price: number };
    const units: Unit[] = [];
    for (const line of eligibleLines) {
      const price = parseFloat(line.cost.amountPerQuantity.amount);
      for (let i = 0; i < line.quantity; i++) {
        units.push({ cartLineId: line.id, price });
      }
    }

    // Sort based on targetItem preference
    if (promo.targetItem === "most_expensive") {
      units.sort((a, b) => b.price - a.price);
    } else {
      units.sort((a, b) => a.price - b.price);
    }

    // Select the units that get the discount
    const discountedUnits = units.slice(0, promo.getQuantity);

    // Group by cart line ID
    const discountedLinesMap = new Map<string, number>();
    for (const unit of discountedUnits) {
      const count = discountedLinesMap.get(unit.cartLineId) || 0;
      discountedLinesMap.set(unit.cartLineId, count + 1);
    }

    const targets: Target[] = [];
    for (const [cartLineId, quantity] of discountedLinesMap.entries()) {
      targets.push({
        cartLine: {
          id: cartLineId,
          quantity: quantity
        }
      });
    }

    if (targets.length === 0) continue;

    // We generate the discount logic depending on the type configured
    let value: any;
    if (promo.discountType === "free") {
      value = { percentage: { value: 100 } };
    } else if (promo.discountType === "percentage") {
      value = { percentage: { value: promo.discountValue } };
    } else if (promo.discountType === "fixed") {
      // NOTE: For fixed discounts spanning multiple targets, fixedAmount applies to EACH target.
      // We will assume value is fixed per item for simplicity.
      value = { fixedAmount: { amount: promo.discountValue.toString(), appliesToEachItem: true } };
    } else {
      value = { percentage: { value: 100 } };
    }

    return {
      discountApplicationStrategy: DiscountApplicationStrategy.First,
      discounts: [
        {
          message: promo.name || "PromoBox Discount",
          targets: targets,
          value: value
        }
      ]
    };
  }

  return EMPTY_DISCOUNT;
};