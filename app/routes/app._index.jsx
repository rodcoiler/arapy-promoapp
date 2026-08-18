import { json } from "@remix-run/node";
import { useLoaderData, Link } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  Text,
  Button,
  InlineStack,
  BlockStack,
  Badge,
  Divider,
  Box,
  Icon,
  EmptyState,
  Banner,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import { getPromotions, getPromoStats } from "../models/promotion.server";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const { shop } = session;
  const [promotions, stats] = await Promise.all([
    getPromotions(shop),
    getPromoStats(shop),
  ]);
  return json({ promotions, stats, shop });
};

export default function Index() {
  const { promotions, stats, shop } = useLoaderData();

  return (
    <Page>
      <div style={{ fontFamily: "'Inter', sans-serif" }}>
        {/* Header Hero */}
        <div style={{
          background: "linear-gradient(135deg, #0f0f0f 0%, #1a1a2e 50%, #16213e 100%)",
          borderRadius: "16px",
          padding: "40px",
          marginBottom: "24px",
          position: "relative",
          overflow: "hidden",
        }}>
          <div style={{
            position: "absolute",
            top: "-40px",
            right: "-40px",
            width: "200px",
            height: "200px",
            background: "radial-gradient(circle, rgba(217,255,79,0.15) 0%, transparent 70%)",
            borderRadius: "50%",
          }} />
          <div style={{
            position: "absolute",
            bottom: "-60px",
            left: "20%",
            width: "300px",
            height: "300px",
            background: "radial-gradient(circle, rgba(99,102,241,0.1) 0%, transparent 70%)",
            borderRadius: "50%",
          }} />
          <InlineStack align="space-between" blockAlign="center" wrap={false}>
            <BlockStack gap="300">
              <InlineStack gap="200" blockAlign="center">
                <div style={{
                  background: "#D9FF4F",
                  borderRadius: "12px",
                  width: "48px",
                  height: "48px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "24px",
                }}>
                  🎁
                </div>
                <Text variant="headingXl" as="h1" fontWeight="bold" tone="text-inverse">
                  PromoBox
                </Text>
              </InlineStack>
              <Text variant="bodyLg" as="p" tone="text-inverse">
                Motor de promociones inteligente para tu tienda Shopify
              </Text>
              <InlineStack gap="300">
                <StatPill
                  value={stats.total}
                  label="Reglas totales"
                  color="#6366f1"
                />
                <StatPill
                  value={stats.active}
                  label="Activas"
                  color="#D9FF4F"
                  textColor="#000"
                />
                <StatPill
                  value={stats.inactive}
                  label="Pausadas"
                  color="#374151"
                />
              </InlineStack>
            </BlockStack>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", alignItems: "flex-end" }}>
              <Link to="/app/promotions/new">
                <button style={{
                  background: "#D9FF4F",
                  color: "#000",
                  border: "none",
                  borderRadius: "50px",
                  padding: "14px 28px",
                  fontSize: "15px",
                  fontWeight: "700",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  transition: "all 0.2s ease",
                  whiteSpace: "nowrap",
                }}
                onMouseOver={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 24px rgba(217,255,79,0.4)"; }}
                onMouseOut={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}
                >
                  <span>+</span> Nueva Promoción
                </button>
              </Link>
              <Link to="/app/settings">
                <button style={{
                  background: "rgba(255,255,255,0.12)",
                  color: "#fff",
                  border: "1px solid rgba(255,255,255,0.2)",
                  borderRadius: "50px",
                  padding: "9px 20px",
                  fontSize: "13px",
                  fontWeight: "600",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  transition: "all 0.2s ease",
                  whiteSpace: "nowrap",
                }}
                onMouseOver={e => { e.currentTarget.style.background = "rgba(255,255,255,0.2)"; }}
                onMouseOut={e => { e.currentTarget.style.background = "rgba(255,255,255,0.12)"; }}
                >
                  ⚙️ Configuración
                </button>
              </Link>
            </div>
          </InlineStack>
        </div>

        {/* Feature Cards */}
        <Layout>
          <Layout.Section variant="oneThird">
            <FeatureCard
              icon="🛒"
              title="Reglas NxM"
              description="4x3, 3x2, 5x4... Compra N productos y lleva M gratis o con descuento"
              color="#6366f1"
            />
          </Layout.Section>
          <Layout.Section variant="oneThird">
            <FeatureCard
              icon="🎁"
              title="Regalos automáticos"
              description="Agrega productos gratis al carrito al superar un monto o cantidad"
              color="#10b981"
            />
          </Layout.Section>
          <Layout.Section variant="oneThird">
            <FeatureCard
              icon="🚚"
              title="Envío inteligente"
              description="Activa envío gratis automáticamente cuando se dispara una promoción"
              color="#f59e0b"
            />
          </Layout.Section>
        </Layout>

        {/* Promotions List */}
        <Box paddingBlockStart="600">
          <BlockStack gap="400">
            <InlineStack align="space-between" blockAlign="center">
              <Text variant="headingLg" as="h2" fontWeight="bold">
                Mis Promociones
              </Text>
              {promotions.length > 0 && (
                <Link to="/app/promotions/new">
                  <Button variant="primary">+ Nueva</Button>
                </Link>
              )}
            </InlineStack>

            {promotions.length === 0 ? (
              <EmptyPromoState />
            ) : (
              <BlockStack gap="300">
                {promotions.map((promo) => (
                  <PromotionCard key={promo.id} promo={promo} />
                ))}
              </BlockStack>
            )}
          </BlockStack>
        </Box>
      </div>
    </Page>
  );
}

function StatPill({ value, label, color, textColor = "#fff" }) {
  return (
    <div style={{
      background: color,
      borderRadius: "50px",
      padding: "6px 16px",
      display: "flex",
      alignItems: "center",
      gap: "8px",
    }}>
      <span style={{ color: textColor, fontWeight: "800", fontSize: "18px" }}>{value}</span>
      <span style={{ color: textColor, fontSize: "13px", opacity: 0.8 }}>{label}</span>
    </div>
  );
}

function FeatureCard({ icon, title, description, color }) {
  return (
    <div style={{
      background: "#fff",
      border: "1px solid #f0f0f0",
      borderRadius: "16px",
      padding: "24px",
      height: "100%",
      transition: "all 0.2s ease",
      cursor: "default",
    }}
    onMouseOver={e => {
      e.currentTarget.style.transform = "translateY(-4px)";
      e.currentTarget.style.boxShadow = "0 12px 40px rgba(0,0,0,0.08)";
      e.currentTarget.style.borderColor = color;
    }}
    onMouseOut={e => {
      e.currentTarget.style.transform = "translateY(0)";
      e.currentTarget.style.boxShadow = "none";
      e.currentTarget.style.borderColor = "#f0f0f0";
    }}
    >
      <BlockStack gap="300">
        <div style={{
          width: "52px",
          height: "52px",
          background: `${color}15`,
          borderRadius: "14px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "26px",
        }}>
          {icon}
        </div>
        <Text variant="headingMd" as="h3" fontWeight="bold">{title}</Text>
        <Text variant="bodySm" as="p" tone="subdued">{description}</Text>
      </BlockStack>
    </div>
  );
}

function EmptyPromoState() {
  return (
    <div style={{
      background: "#fafafa",
      border: "2px dashed #e5e7eb",
      borderRadius: "16px",
      padding: "60px 40px",
      textAlign: "center",
    }}>
      <div style={{ fontSize: "56px", marginBottom: "16px" }}>🎯</div>
      <Text variant="headingLg" as="h3" fontWeight="bold">
        Crea tu primera promoción
      </Text>
      <Box paddingBlockStart="200" paddingBlockEnd="400">
        <Text variant="bodyMd" as="p" tone="subdued">
          Configura reglas de 4x3, 3x2 o regalos automáticos para tu tienda
        </Text>
      </Box>
      <Link to="/app/promotions/new">
        <button style={{
          background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
          color: "#fff",
          border: "none",
          borderRadius: "50px",
          padding: "14px 32px",
          fontSize: "15px",
          fontWeight: "700",
          cursor: "pointer",
          transition: "all 0.2s ease",
        }}
        onMouseOver={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 24px rgba(99,102,241,0.4)"; }}
        onMouseOut={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}
        >
          ✨ Crear Promoción
        </button>
      </Link>
    </div>
  );
}

function PromotionCard({ promo }) {
  const collections = JSON.parse(promo.collections || "[]");
  const ruleLabel = promo.ruleType === "NxM"
    ? `${promo.buyQuantity}x${promo.buyQuantity - promo.getQuantity}`
    : promo.ruleType;
  const discountLabel = promo.discountType === "free"
    ? "Gratis"
    : promo.discountType === "percentage"
      ? `${promo.discountValue}% off`
      : `$${promo.discountValue} off`;

  return (
    <div style={{
      background: "#fff",
      border: "1px solid #f0f0f0",
      borderRadius: "14px",
      padding: "20px 24px",
      transition: "all 0.2s ease",
      position: "relative",
      overflow: "hidden",
    }}
    onMouseOver={e => {
      e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.07)";
      e.currentTarget.style.borderColor = "#e5e7eb";
    }}
    onMouseOut={e => {
      e.currentTarget.style.boxShadow = "none";
      e.currentTarget.style.borderColor = "#f0f0f0";
    }}
    >
      {/* Active indicator */}
      <div style={{
        position: "absolute",
        left: 0,
        top: 0,
        bottom: 0,
        width: "4px",
        background: promo.active
          ? "linear-gradient(180deg, #10b981, #6366f1)"
          : "#e5e7eb",
        borderRadius: "4px 0 0 4px",
      }} />

      <InlineStack align="space-between" blockAlign="center" wrap={false}>
        <InlineStack gap="400" blockAlign="center" wrap={false}>
          <div style={{
            background: promo.active ? "#10b98115" : "#f3f4f6",
            borderRadius: "10px",
            width: "44px",
            height: "44px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "20px",
            flexShrink: 0,
          }}>
            {promo.ruleType === "NxM" ? "🛒" : "🎁"}
          </div>
          <BlockStack gap="100">
            <InlineStack gap="200" blockAlign="center">
              <Text variant="headingMd" as="h3" fontWeight="semibold">
                {promo.name}
              </Text>
              <span style={{
                background: promo.active ? "#d1fae5" : "#f3f4f6",
                color: promo.active ? "#065f46" : "#6b7280",
                borderRadius: "50px",
                padding: "2px 10px",
                fontSize: "12px",
                fontWeight: "600",
              }}>
                {promo.active ? "● Activa" : "○ Pausada"}
              </span>
            </InlineStack>
            <InlineStack gap="200">
              <span style={{
                background: "#ede9fe",
                color: "#5b21b6",
                borderRadius: "6px",
                padding: "2px 8px",
                fontSize: "12px",
                fontWeight: "600",
              }}>
                {ruleLabel}
              </span>
              <span style={{
                background: "#fff7ed",
                color: "#92400e",
                borderRadius: "6px",
                padding: "2px 8px",
                fontSize: "12px",
                fontWeight: "600",
              }}>
                {discountLabel}
              </span>
              {promo.freeShipping && (
                <span style={{
                  background: "#ecfdf5",
                  color: "#065f46",
                  borderRadius: "6px",
                  padding: "2px 8px",
                  fontSize: "12px",
                  fontWeight: "600",
                }}>
                  🚚 Envío gratis
                </span>
              )}
              <span style={{
                background: "#f0f9ff",
                color: "#075985",
                borderRadius: "6px",
                padding: "2px 8px",
                fontSize: "12px",
                fontWeight: "600",
              }}>
                {promo.applyToAll
                  ? "Toda la tienda"
                  : `${collections.length} colección(es)`}
              </span>
            </InlineStack>
          </BlockStack>
        </InlineStack>

        <InlineStack gap="200" wrap={false}>
          <Link to={`/app/promotions/${promo.id}`}>
            <button style={{
              background: "#f3f4f6",
              color: "#374151",
              border: "none",
              borderRadius: "8px",
              padding: "8px 16px",
              fontSize: "13px",
              fontWeight: "600",
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
            onMouseOver={e => { e.currentTarget.style.background = "#e5e7eb"; }}
            onMouseOut={e => { e.currentTarget.style.background = "#f3f4f6"; }}
            >
              Editar
            </button>
          </Link>
        </InlineStack>
      </InlineStack>
    </div>
  );
}
