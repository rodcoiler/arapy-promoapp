import { json } from "@remix-run/node";
import { useLoaderData, Form, useNavigation, useFetcher } from "@remix-run/react";
import { useState } from "react";
import {
  Page,
  Layout,
  Text,
  BlockStack,
  InlineStack,
  Box,
  Divider,
  TextField,
  Banner,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const { shop } = session;

  // Get global settings from shop metafield (stored as JSON)
  // For now, return defaults
  return json({
    shop,
    settings: {
      storeNameOverride: "",
      defaultAccentColor: "#D9FF4F",
      defaultAccentTextColor: "#000000",
      enableBanner: true,
      enableModal: true,
      enableBadge: true,
      enableSavingsRow: true,
    },
  });
};

export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const { shop } = session;
  const formData = await request.formData();

  // TODO: Store settings in a ShopSettings model
  return json({ success: true, message: "Configuración guardada" });
};

export default function Settings() {
  const { shop, settings } = useLoaderData();
  const navigation = useNavigation();
  const fetcher = useFetcher();
  const isSaving = navigation.state === "submitting";
  const isSyncing = fetcher.state !== "idle";
  const syncSuccess = fetcher.data?.success;

  const [accentColor, setAccentColor] = useState(settings.defaultAccentColor);
  const [textColor, setTextColor] = useState(settings.defaultAccentTextColor);
  const [enableBanner, setEnableBanner] = useState(settings.enableBanner);
  const [enableModal, setEnableModal] = useState(settings.enableModal);
  const [enableBadge, setEnableBadge] = useState(settings.enableBadge);
  const [enableSavingsRow, setEnableSavingsRow] = useState(settings.enableSavingsRow);

  return (
    <Page
      backAction={{ url: "/app" }}
      title="⚙️ Configuración Global"
      subtitle="Ajustes que aplican a todas las promociones"
      primaryAction={{
        content: isSaving ? "Guardando..." : "Guardar cambios",
        loading: isSaving,
        onAction: () => {},
      }}
    >
      <BlockStack gap="600">
        {syncSuccess && (
          <Banner title="Promociones publicadas con éxito" tone="success">
            <p>
              El script de la promoción y la configuración se han guardado e inyectado correctamente en tu tienda.
            </p>
          </Banner>
        )}
        <Layout>
          <Layout.Section>
            <BlockStack gap="400">

              {/* Shop Info */}
              <div style={{
                background: "#fff",
                border: "1px solid #f0f0f0",
                borderRadius: "16px",
                padding: "24px",
              }}>
                <BlockStack gap="300">
                  <Text variant="headingMd" as="h2" fontWeight="bold">🏪 Tienda conectada</Text>
                  <Divider />
                  <InlineStack gap="300" blockAlign="center">
                    <div style={{
                      background: "#d1fae5",
                      borderRadius: "50px",
                      padding: "6px 14px",
                      fontSize: "13px",
                      fontWeight: "600",
                      color: "#065f46",
                    }}>
                      ✅ Conectada
                    </div>
                    <Text variant="bodyMd" as="p" tone="subdued">
                      {shop}
                    </Text>
                  </InlineStack>
                </BlockStack>
              </div>

              {/* Default Colors */}
              <div style={{
                background: "#fff",
                border: "1px solid #f0f0f0",
                borderRadius: "16px",
                padding: "24px",
              }}>
                <BlockStack gap="400">
                  <Text variant="headingMd" as="h2" fontWeight="bold">
                    🎨 Colores globales por defecto
                  </Text>
                  <Text variant="bodySm" as="p" tone="subdued">
                    Estos colores se usarán como valor inicial al crear nuevas promociones.
                  </Text>
                  <Divider />
                  <InlineStack gap="600" wrap={false}>
                    <BlockStack gap="200">
                      <Text variant="bodyMd" as="p" fontWeight="semibold">Color de acento</Text>
                      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <input
                          type="color"
                          value={accentColor}
                          onChange={(e) => setAccentColor(e.target.value)}
                          style={{
                            width: "48px",
                            height: "48px",
                            borderRadius: "12px",
                            border: "2px solid #e5e7eb",
                            cursor: "pointer",
                            padding: "2px",
                          }}
                        />
                        <TextField
                          value={accentColor}
                          onChange={setAccentColor}
                          autoComplete="off"
                        />
                      </div>
                    </BlockStack>
                    <BlockStack gap="200">
                      <Text variant="bodyMd" as="p" fontWeight="semibold">Color del texto</Text>
                      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <input
                          type="color"
                          value={textColor}
                          onChange={(e) => setTextColor(e.target.value)}
                          style={{
                            width: "48px",
                            height: "48px",
                            borderRadius: "12px",
                            border: "2px solid #e5e7eb",
                            cursor: "pointer",
                            padding: "2px",
                          }}
                        />
                        <TextField
                          value={textColor}
                          onChange={setTextColor}
                          autoComplete="off"
                        />
                      </div>
                    </BlockStack>
                  </InlineStack>
                  {/* Preview */}
                  <button style={{
                    background: accentColor,
                    color: textColor,
                    border: "none",
                    borderRadius: "50px",
                    padding: "12px 28px",
                    fontSize: "15px",
                    fontWeight: "700",
                    cursor: "default",
                    display: "inline-block",
                    alignSelf: "flex-start",
                  }}>
                    Vista previa del botón
                  </button>
                </BlockStack>
              </div>

              {/* Widget Toggles */}
              <div style={{
                background: "#fff",
                border: "1px solid #f0f0f0",
                borderRadius: "16px",
                padding: "24px",
              }}>
                <BlockStack gap="400">
                  <Text variant="headingMd" as="h2" fontWeight="bold">
                    📱 Widgets del Storefront
                  </Text>
                  <Text variant="bodySm" as="p" tone="subdued">
                    Activa o desactiva globalmente cada widget que se muestra en la tienda.
                  </Text>
                  <Divider />
                  <BlockStack gap="200">
                    <WidgetToggle
                      label="Banner superior animado"
                      description="Aparece en la parte superior de la página con estado 'casi' y 'activa'"
                      icon="📢"
                      active={enableBanner}
                      onToggle={() => setEnableBanner(!enableBanner)}
                    />
                    <WidgetToggle
                      label="Modal emergente"
                      description="Popup que aparece cuando falta poco para activar la promo"
                      icon="💬"
                      active={enableModal}
                      onToggle={() => setEnableModal(!enableModal)}
                    />
                    <WidgetToggle
                      label="Badge en el carrito"
                      description="Etiqueta '¡GRATIS!' sobre el producto descontado"
                      icon="🏷️"
                      active={enableBadge}
                      onToggle={() => setEnableBadge(!enableBadge)}
                    />
                    <WidgetToggle
                      label="Fila de ahorro en totales"
                      description="Muestra el descuento total aplicado en el resumen del carrito"
                      icon="💰"
                      active={enableSavingsRow}
                      onToggle={() => setEnableSavingsRow(!enableSavingsRow)}
                    />
                  </BlockStack>
                </BlockStack>
              </div>

            </BlockStack>
          </Layout.Section>

          {/* Right: Sync panel */}
          <Layout.Section variant="oneThird">
            <BlockStack gap="400">
              <div style={{
                background: "linear-gradient(135deg, #0f0f0f, #1a1a2e)",
                borderRadius: "16px",
                padding: "24px",
                color: "#fff",
              }}>
                <BlockStack gap="300">
                  <Text variant="headingMd" as="h2" fontWeight="bold" tone="text-inverse">
                    🔄 Sincronizar con la tienda
                  </Text>
                  <Text variant="bodySm" as="p" tone="text-inverse">
                    Publica las promociones activas en tu storefront. Esto inyecta el script de PromoBox en tu tema.
                  </Text>
                  <fetcher.Form method="post" action="/api/sync-promotions">
                    <button
                      type="submit"
                      disabled={isSyncing}
                      style={{
                        width: "100%",
                        background: isSyncing ? "#9ca3af" : "#D9FF4F",
                        color: "#000",
                        border: "none",
                        borderRadius: "12px",
                        padding: "14px",
                        fontSize: "15px",
                        fontWeight: "700",
                        cursor: isSyncing ? "not-allowed" : "pointer",
                        transition: "all 0.2s ease",
                        marginTop: "8px",
                      }}
                      onMouseOver={e => {
                        if (!isSyncing) {
                          e.currentTarget.style.transform = "translateY(-2px)";
                          e.currentTarget.style.boxShadow = "0 8px 24px rgba(217,255,79,0.4)";
                        }
                      }}
                      onMouseOut={e => {
                        if (!isSyncing) {
                          e.currentTarget.style.transform = "translateY(0)";
                          e.currentTarget.style.boxShadow = "none";
                        }
                      }}
                    >
                      {isSyncing ? "⌛ Sincronizando..." : "🚀 Publicar en la tienda"}
                    </button>
                  </fetcher.Form>
                </BlockStack>
              </div>

              {/* Instructions */}
              <div style={{
                background: "#fff",
                border: "1px solid #f0f0f0",
                borderRadius: "16px",
                padding: "20px",
              }}>
                <BlockStack gap="300">
                  <Text variant="headingMd" as="h2" fontWeight="bold">
                    📋 Instrucciones de instalación
                  </Text>
                  <Divider />
                  <BlockStack gap="200">
                    <StepItem number="1" text="Crea una promoción desde el Dashboard" />
                    <StepItem number="2" text="Activa la promoción con el toggle" />
                    <StepItem number="3" text='Presiona "Publicar en la tienda" aquí arriba' />
                    <StepItem number="4" text="Ve al editor del tema → Agrega el App Block de PromoBox" />
                    <StepItem number="5" text="¡Listo! El banner y modal aparecerán automáticamente" />
                  </BlockStack>
                </BlockStack>
              </div>
            </BlockStack>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}

function WidgetToggle({ label, description, icon, active, onToggle }) {
  return (
    <div
      style={{
        background: active ? "#ecfdf5" : "#fafafa",
        border: `1px solid ${active ? "#10b981" : "#e5e7eb"}`,
        borderRadius: "12px",
        padding: "14px 18px",
        cursor: "pointer",
        transition: "all 0.2s ease",
      }}
      onClick={onToggle}
    >
      <InlineStack align="space-between" blockAlign="center">
        <InlineStack gap="300" blockAlign="center">
          <span style={{ fontSize: "22px" }}>{icon}</span>
          <BlockStack gap="50">
            <Text variant="bodyMd" as="p" fontWeight="semibold">{label}</Text>
            <Text variant="bodySm" as="p" tone="subdued">{description}</Text>
          </BlockStack>
        </InlineStack>
        <div style={{
          width: "44px",
          height: "24px",
          background: active ? "#10b981" : "#d1d5db",
          borderRadius: "50px",
          position: "relative",
          transition: "background 0.2s ease",
          flexShrink: 0,
        }}>
          <div style={{
            position: "absolute",
            width: "18px",
            height: "18px",
            background: "#fff",
            borderRadius: "50%",
            top: "3px",
            left: active ? "23px" : "3px",
            transition: "left 0.2s ease",
            boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
          }} />
        </div>
      </InlineStack>
    </div>
  );
}

function StepItem({ number, text }) {
  return (
    <InlineStack gap="200" blockAlign="start" wrap={false}>
      <div style={{
        width: "22px",
        height: "22px",
        background: "#6366f1",
        borderRadius: "50%",
        color: "#fff",
        fontSize: "11px",
        fontWeight: "800",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        marginTop: "1px",
      }}>
        {number}
      </div>
      <Text variant="bodySm" as="p" tone="subdued">{text}</Text>
    </InlineStack>
  );
}
