/**
 * PromoBox — Shopify Storefront Script
 * ======================================
 * Equivalente al código WooCommerce 4x3, adaptado para Shopify.
 * Este script se inyecta en la tienda y gestiona:
 *   - Banner superior animado (falta poco / promo activa)
 *   - Modal emergente (cuando falta N items para activar la promo)
 *   - Badge en el carrito (etiqueta "GRATIS" sobre el producto)
 *   - Fila de ahorro en el resumen de totales
 *
 * La lógica de precios (descuento real) se aplica en el backend
 * via Shopify Functions / Discounts API.
 *
 * Configuración inyectada desde el backend via window.PROMOBOX_CONFIG
 */

(function () {
  "use strict";

  // ─── State ────────────────────────────────────────────────────────────────
  let config = { promotions: [], shop: "" };
  let cartData = null;
  let currentPromoState = null; // null | "almost" | "active"
  let activePromo = null;
  let discountedLineIndex = null;

  // ─── Init ─────────────────────────────────────────────────────────────────
  async function init() {
    // Detect app origin dynamically from script tag src
    const scriptSrc = document.currentScript ? document.currentScript.src : "";
    const appUrl = scriptSrc ? new URL(scriptSrc).origin : "";
    const shop = window.Shopify?.shop || "";

    if (!shop || !appUrl) {
      console.warn("[PromoBox] Missing shop metadata or script source origin.");
      return;
    }

    try {
      // Fetch promotions configuration from public API
      const resConfig = await fetch(`${appUrl}/api/promotions?shop=${shop}`);
      const dataConfig = await resConfig.json();
      config.promotions = dataConfig.promotions || [];
      config.shop = shop;
    } catch (e) {
      console.error("[PromoBox] Error loading promotions config:", e);
      return;
    }

    if (!config.promotions || config.promotions.length === 0) {
      return; // No active promotions
    }

    cartData = await fetchCart();
    evaluatePromotions();
    setupUI();
  }

  // ─── Cart Fetching ────────────────────────────────────────────────────────
  async function fetchCart() {
    try {
      const res = await fetch("/cart.js");
      return await res.json();
    } catch (e) {
      console.warn("[PromoBox] Error fetching cart:", e);
      return null;
    }
  }

  // ─── Promotion Evaluation ─────────────────────────────────────────────────
  function evaluatePromotions() {
    if (!cartData || !cartData.items) return;

    for (const promo of config.promotions) {
      if (!promo.active) continue;

      const eligibleItems = getEligibleItems(cartData.items, promo);
      const totalUnits = eligibleItems.reduce((sum, item) => sum + item.quantity, 0);
      const { buyQuantity, getQuantity } = promo;

      if (totalUnits >= buyQuantity) {
        // Promo activa
        currentPromoState = "active";
        activePromo = promo;

        // Identificar el item que recibe el descuento (el más barato en unidades)
        const allUnits = expandToUnits(eligibleItems);
        if (promo.targetItem === "most_expensive") {
          allUnits.sort((a, b) => b.price - a.price);
        } else {
          allUnits.sort((a, b) => a.price - b.price);
        }

        // Los primeros `getQuantity` items reciben el descuento
        discountedLineIndex = allUnits.slice(0, getQuantity).map(u => u.key);
        return;
      }

      const missingForPromo = buyQuantity - totalUnits;
      if (missingForPromo <= Math.ceil(buyQuantity * 0.4)) {
        // "Casi" - falta menos del 40% para activar la promo
        currentPromoState = "almost";
        activePromo = promo;
        discountedLineIndex = null;
      }
    }
  }

  function getEligibleItems(items, promo) {
    if (promo.applyToAll) return items;

    const eligibleCollections = JSON.parse(promo.collections || "[]");
    if (!eligibleCollections.length) return items;

    return items.filter((item) => {
      const itemCollections = item.collections || item.product_tags || [];
      return itemCollections.some((col) => {
        const colId = typeof col === "string" ? col : col.id || col;
        return eligibleCollections.includes(colId);
      });
    });
  }

  function expandToUnits(items) {
    const units = [];
    for (const item of items) {
      for (let i = 0; i < item.quantity; i++) {
        units.push({
          key: item.key,
          price: item.price / 100, // Shopify prices are in cents
          title: item.title,
          image: item.image,
        });
      }
    }
    return units;
  }

  function getMissingCount() {
    if (!activePromo || !cartData) return 0;
    const eligible = getEligibleItems(cartData.items, activePromo);
    const total = eligible.reduce((s, i) => s + i.quantity, 0);
    return Math.max(0, activePromo.buyQuantity - total);
  }

  // ─── UI Setup ────────────────────────────────────────────────────────────
  function setupUI() {
    injectStyles();

    if (currentPromoState === "active" || currentPromoState === "almost") {
      renderBanner();
    }

    if (currentPromoState === "almost") {
      maybeShowModal();
    }

    if (currentPromoState === "active") {
      renderCartBadges();
      renderSavingsRow();
    }

    // Re-evaluate on cart update events
    document.addEventListener("cart:updated", async () => {
      cartData = await fetchCart();
      evaluatePromotions();
      updateBanner();
      renderCartBadges();
      renderSavingsRow();
    });
  }

  // ─── Banner ───────────────────────────────────────────────────────────────
  function renderBanner() {
    if (document.getElementById("promobox-banner")) return;

    const promo = activePromo;
    const missing = getMissingCount();
    const isActive = currentPromoState === "active";

    const msg = isActive
      ? (promo.bannerMsgActive || "").replace("{COUNT}", Math.abs(
          getEligibleItems(cartData.items, promo).reduce((s, i) => s + i.quantity, 0) - promo.buyQuantity + promo.getQuantity
        ))
      : (promo.bannerMsgAlmost || "").replace("{MISSING}", missing);

    const accentColor = promo.accentColor || "#D9FF4F";
    const accentTextColor = promo.accentTextColor || "#000";

    const banner = document.createElement("div");
    banner.id = "promobox-banner";
    banner.className = `promobox-banner promobox-banner--${currentPromoState}`;
    banner.setAttribute("role", "alert");
    banner.innerHTML = `
      <div class="promobox-banner__icon">
        ${isActive
          ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`
          : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`
        }
      </div>
      <div class="promobox-banner__text">${msg}</div>
      <button class="promobox-banner__close" aria-label="Cerrar">&times;</button>
    `;

    // Apply accent color for active state
    if (isActive) {
      banner.style.setProperty("--promobox-accent", accentColor);
      banner.style.setProperty("--promobox-accent-text", accentTextColor);
    }

    document.body.appendChild(banner);

    // Show with animation
    requestAnimationFrame(() => {
      setTimeout(() => {
        banner.classList.add("promobox-banner--show");
      }, 800);
    });

    // Close button
    banner.querySelector(".promobox-banner__close").addEventListener("click", () => {
      banner.classList.remove("promobox-banner--show");
      sessionStorage.setItem(`promobox_banner_closed_${currentPromoState}`, "1");
    });

    // Check session storage
    const closed = sessionStorage.getItem(`promobox_banner_closed_${currentPromoState}`);
    if (closed) {
      banner.style.display = "none";
    }
  }

  function updateBanner() {
    const existing = document.getElementById("promobox-banner");
    if (existing) existing.remove();
    if (currentPromoState === "active" || currentPromoState === "almost") {
      renderBanner();
    }
  }

  // ─── Modal ────────────────────────────────────────────────────────────────
  function maybeShowModal() {
    if (!activePromo) return;
    const sessionKey = `promobox_modal_dismissed_${activePromo.id}`;
    if (sessionStorage.getItem(sessionKey)) return;

    const promo = activePromo;
    const missing = getMissingCount();
    const accentColor = promo.accentColor || "#D9FF4F";
    const accentTextColor = promo.accentTextColor || "#000";

    const overlay = document.createElement("div");
    overlay.id = "promobox-modal";
    overlay.className = "promobox-modal-overlay";
    overlay.innerHTML = `
      <div class="promobox-modal-card" role="dialog" aria-modal="true" aria-labelledby="promobox-modal-title">
        <button class="promobox-modal-close" aria-label="Cerrar">&times;</button>
        
        <div class="promobox-modal-icon" style="background: ${accentColor};">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="${accentTextColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 12 20 22 4 22 4 12"/>
            <rect x="2" y="7" width="20" height="5"/>
            <line x1="12" y1="22" x2="12" y2="7"/>
            <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/>
            <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/>
          </svg>
        </div>

        <h2 id="promobox-modal-title" class="promobox-modal-title">
          ${(promo.modalTitle || "¡Casi lo logras!").replace("{MISSING}", missing)}
        </h2>
        <p class="promobox-modal-body">
          ${(promo.modalBody || "Agrega {MISSING} artículo(s) más y llévate el de menor valor GRATIS").replace("{MISSING}", missing)}
        </p>

        <a class="promobox-modal-btn" href="/collections/all" style="background: ${accentColor}; color: ${accentTextColor};">
          ${promo.modalBtnText || "¡Aprovechar la promo!"}
        </a>
        <button class="promobox-modal-dismiss">
          ${promo.modalDismissText || "No gracias, continuar al pago"}
        </button>
      </div>
    `;

    document.body.appendChild(overlay);

    const dismiss = () => {
      sessionStorage.setItem(sessionKey, "1");
      overlay.style.opacity = "0";
      setTimeout(() => overlay.remove(), 300);
    };

    overlay.querySelector(".promobox-modal-close").addEventListener("click", dismiss);
    overlay.querySelector(".promobox-modal-dismiss").addEventListener("click", dismiss);
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) dismiss();
    });

    // Show after delay
    setTimeout(() => {
      overlay.style.display = "flex";
      requestAnimationFrame(() => {
        overlay.style.opacity = "1";
      });
    }, 1200);
  }

  // ─── Cart Badges ─────────────────────────────────────────────────────────
  function renderCartBadges() {
    if (!activePromo || currentPromoState !== "active") return;

    const badgeText = activePromo.badgeText || "¡GRATIS!";
    const accentColor = activePromo.accentColor || "#D9FF4F";
    const accentTextColor = activePromo.accentTextColor || "#000";

    // Try multiple selectors for cart items (different themes use different structures)
    const cartItemSelectors = [
      ".cart-item",
      "[data-cart-item]",
      ".cart__item",
      "tr.cart_item",
      ".line-item",
    ];

    for (const selector of cartItemSelectors) {
      const cartItems = document.querySelectorAll(selector);
      if (!cartItems.length) continue;

      cartItems.forEach((el, idx) => {
        // Remove existing badges
        el.querySelectorAll(".promobox-badge").forEach((b) => b.remove());

        const key = el.dataset.key || el.querySelector("[data-key]")?.dataset.key;
        if (discountedLineIndex && (discountedLineIndex.includes(key) || idx === 0)) {
          const badge = document.createElement("div");
          badge.className = "promobox-badge";
          badge.innerHTML = `<span class="promobox-badge__icon">🎉</span> ${badgeText}`;
          badge.style.setProperty("--badge-bg", accentColor);
          badge.style.setProperty("--badge-text", accentTextColor);

          const nameEl = el.querySelector(".cart-item__name, .product__description, td.cart__product-name, .line-item__title");
          if (nameEl) {
            nameEl.appendChild(badge);
          } else {
            el.prepend(badge);
          }
        }
      });
      break;
    }
  }

  // ─── Savings Row ─────────────────────────────────────────────────────────
  function renderSavingsRow() {
    if (!activePromo || currentPromoState !== "active" || !cartData) return;

    // Remove existing
    document.querySelectorAll(".promobox-savings-row").forEach((el) => el.remove());

    const eligibleItems = getEligibleItems(cartData.items, activePromo);
    const allUnits = expandToUnits(eligibleItems);
    allUnits.sort((a, b) => a.price - b.price);
    const discountedItems = allUnits.slice(0, activePromo.getQuantity);
    const totalSavings = discountedItems.reduce((sum, u) => {
      if (activePromo.discountType === "free") return sum + u.price;
      if (activePromo.discountType === "percentage") return sum + (u.price * (activePromo.discountValue / 100));
      if (activePromo.discountType === "fixed") return sum + Math.min(u.price, activePromo.discountValue);
      return sum;
    }, 0);

    if (totalSavings <= 0) return;

    const label = activePromo.savingsRowLabel || "Descuento aplicado";
    const formattedSavings = new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: cartData.currency || "ARS",
    }).format(totalSavings);

    // Try to insert before subtotal/total rows
    const totalRowSelectors = [
      ".cart__subtotal",
      ".totals__subtotal",
      ".cart-subtotal",
      "[data-cart-totals]",
      ".order-summary__subtotal",
    ];

    for (const sel of totalRowSelectors) {
      const target = document.querySelector(sel);
      if (!target) continue;

      const savingsRow = document.createElement("div");
      savingsRow.className = "promobox-savings-row";
      savingsRow.innerHTML = `
        <span class="promobox-savings-row__label">${label}</span>
        <span class="promobox-savings-row__amount">-${formattedSavings}</span>
      `;

      target.parentNode.insertBefore(savingsRow, target);
      break;
    }
  }

  // ─── Styles ───────────────────────────────────────────────────────────────
  function injectStyles() {
    if (document.getElementById("promobox-styles")) return;

    const styles = document.createElement("style");
    styles.id = "promobox-styles";
    styles.textContent = `
      /* ── Banner ──────────────────────────────────── */
      .promobox-banner {
        position: fixed;
        top: 80px;
        left: 50%;
        transform: translateX(-50%) translateY(-200%);
        background: #ffffff;
        padding: 11px 24px 11px 14px;
        border-radius: 50px;
        box-shadow: 0 10px 40px rgba(0,0,0,0.12);
        z-index: 9998;
        display: flex;
        align-items: center;
        gap: 12px;
        width: 92%;
        max-width: 520px;
        opacity: 0;
        transition: transform 0.6s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.6s ease;
        border: 1px solid #f0f0f0;
        font-family: -apple-system, BlinkMacSystemFont, 'Inter', sans-serif;
      }
      .promobox-banner--show {
        transform: translateX(-50%) translateY(0);
        opacity: 1;
      }
      .promobox-banner--active {
        border: 2px solid var(--promobox-accent, #D9FF4F);
      }
      .promobox-banner--active .promobox-banner__icon {
        background: var(--promobox-accent, #D9FF4F);
        color: var(--promobox-accent-text, #000);
      }
      .promobox-banner--almost .promobox-banner__icon {
        background: #f3f4f6;
        color: #6b7280;
      }
      .promobox-banner__icon {
        width: 36px;
        height: 36px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }
      .promobox-banner__text {
        font-size: 14px;
        color: #333;
        line-height: 1.4;
        flex: 1;
      }
      .promobox-banner__text strong { font-weight: 800; color: #000; }
      .promobox-banner__close {
        background: transparent;
        border: none;
        font-size: 22px;
        line-height: 1;
        color: #9ca3af;
        cursor: pointer;
        padding: 0 0 0 8px;
        transition: color 0.15s;
      }
      .promobox-banner__close:hover { color: #000; }

      @media (max-width: 768px) {
        .promobox-banner { top: 60px; padding: 10px 18px 10px 10px; }
        .promobox-banner__text { font-size: 13px; }
      }

      /* ── Modal ───────────────────────────────────── */
      .promobox-modal-overlay {
        display: none;
        position: fixed;
        z-index: 99999;
        left: 0; top: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.45);
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
        align-items: center;
        justify-content: center;
        opacity: 0;
        transition: opacity 0.3s ease;
        font-family: -apple-system, BlinkMacSystemFont, 'Inter', sans-serif;
      }
      .promobox-modal-card {
        background: #ffffff;
        width: 92%;
        max-width: 420px;
        padding: 44px 32px;
        border-radius: 24px;
        text-align: center;
        position: relative;
        box-shadow: 0 24px 60px rgba(0,0,0,0.18);
        animation: promoboxPop 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        opacity: 0;
        transform: scale(0.92) translateY(24px);
      }
      @keyframes promoboxPop {
        to { opacity: 1; transform: scale(1) translateY(0); }
      }
      .promobox-modal-close {
        position: absolute;
        right: 20px;
        top: 20px;
        background: #f2f2f2;
        border: none;
        width: 32px;
        height: 32px;
        border-radius: 50%;
        font-size: 20px;
        line-height: 1;
        cursor: pointer;
        color: #666;
        transition: all 0.2s ease;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .promobox-modal-close:hover { background: #e5e5e5; color: #000; }
      .promobox-modal-icon {
        width: 72px;
        height: 72px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 0 auto 24px;
      }
      .promobox-modal-title {
        font-size: 24px !important;
        font-weight: 800 !important;
        color: #000 !important;
        margin: 0 0 16px !important;
        letter-spacing: -0.5px;
        line-height: 1.2;
      }
      .promobox-modal-body {
        font-size: 15px;
        color: #555;
        line-height: 1.55;
        margin: 0 0 28px;
      }
      .promobox-modal-btn {
        display: block;
        border-radius: 50px !important;
        padding: 16px 20px !important;
        font-size: 16px !important;
        font-weight: 700 !important;
        text-decoration: none !important;
        margin-bottom: 16px;
        transition: all 0.3s ease;
        border: none;
        cursor: pointer;
      }
      .promobox-modal-btn:hover {
        filter: brightness(0.92);
        transform: translateY(-2px);
        box-shadow: 0 8px 24px rgba(0,0,0,0.15);
      }
      .promobox-modal-dismiss {
        background: transparent;
        border: none;
        color: #9ca3af;
        font-size: 13px;
        font-weight: 500;
        text-decoration: underline;
        cursor: pointer;
        padding: 6px;
        transition: color 0.15s;
      }
      .promobox-modal-dismiss:hover { color: #000; }

      /* ── Badge ───────────────────────────────────── */
      .promobox-badge {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        background: var(--badge-bg, #D9FF4F);
        color: var(--badge-text, #000);
        border-radius: 50px;
        padding: 4px 12px;
        font-size: 12px;
        font-weight: 700;
        margin-top: 6px;
        animation: promoboxBadgePop 0.4s cubic-bezier(0.16, 1, 0.3, 1) both;
      }
      @keyframes promoboxBadgePop {
        from { opacity: 0; transform: scale(0.8); }
        to   { opacity: 1; transform: scale(1); }
      }
      .promobox-badge__icon { font-size: 14px; }

      /* ── Savings Row ─────────────────────────────── */
      .promobox-savings-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 8px 0;
        border-bottom: 1px solid #f0f0f0;
        font-family: -apple-system, BlinkMacSystemFont, 'Inter', sans-serif;
        animation: promoboxSlideIn 0.3s ease both;
      }
      @keyframes promoboxSlideIn {
        from { opacity: 0; transform: translateY(-8px); }
        to   { opacity: 1; transform: translateY(0); }
      }
      .promobox-savings-row__label {
        font-size: 14px;
        color: #374151;
        font-weight: 500;
      }
      .promobox-savings-row__amount {
        font-size: 15px;
        font-weight: 800;
        color: #059669;
      }
    `;
    document.head.appendChild(styles);
  }

  // ─── Boot ─────────────────────────────────────────────────────────────────
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

})();
