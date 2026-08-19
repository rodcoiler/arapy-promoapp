import { json, redirect } from "@remix-run/node";
import { useLoaderData, useActionData, Form, useNavigation, useSubmit } from "@remix-run/react";
import { useState, useCallback } from "react";
import {
  Page,
  Layout,
  Card,
  Text,
  Button,
  TextField,
  Select,
  Checkbox,
  InlineStack,
  BlockStack,
  Box,
  Divider,
  Badge,
  Banner,
  FormLayout,
  RangeSlider,
  Tooltip,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import {
  createPromotion,
  updatePromotion,
  getPromotion,
  deletePromotion,
} from "../models/promotion.server";

export const loader = async ({ request, params }) => {
  const { session, admin } = await authenticate.admin(request);
  const { shop } = session;

  let promotion = null;
  if (params.id !== "new") {
    promotion = await getPromotion(params.id, shop);
    if (!promotion) throw new Response("Not Found", { status: 404 });
  }

  // Fetch collections from Shopify
  let collections = [];
  try {
    const collectionsResponse = await admin.graphql(`
      query {
        collections(first: 50) {
          edges {
            node {
              id
              title
              image { url }
              productsCount { count }
            }
          }
        }
      }
    `);
    const collectionsData = await collectionsResponse.json();
    if (collectionsData.errors) {
       console.error("GraphQL Errors fetching collections:", collectionsData.errors);
    } else {
       collections = collectionsData.data.collections.edges.map((e) => e.node);
    }
  } catch (error) {
    console.error("Error fetching collections in loader:", error);
  }

  return json({ promotion, collections, shop, isNew: params.id === "new" });
};

export const action = async ({ request, params }) => {
  const { session } = await authenticate.admin(request);
  const { shop } = session;
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "delete") {
    await deletePromotion(params.id, shop);
    return redirect("/app");
  }

  const data = {
    name: formData.get("name"),
    active: formData.get("active") === "true",
    ruleType: formData.get("ruleType"),
    buyQuantity: formData.get("buyQuantity"),
    getQuantity: formData.get("getQuantity"),
    collections: JSON.parse(formData.get("collections") || "[]"),
    applyToAll: formData.get("applyToAll") === "true",
    sameCollections: formData.get("sameCollections") === "true",
    getCollections: JSON.parse(formData.get("getCollections") || "[]"),
    discountType: formData.get("discountType"),
    discountValue: formData.get("discountValue"),
    targetItem: formData.get("targetItem"),
    giftProductId: formData.get("giftProductId") || null,
    giftProductTitle: formData.get("giftProductTitle") || null,
    freeShipping: formData.get("freeShipping") === "true",
    enableProgressBar: formData.get("enableProgressBar") === "true",
    bannerMsgAlmost: formData.get("bannerMsgAlmost"),
    bannerMsgActive: formData.get("bannerMsgActive"),
    modalTitle: formData.get("modalTitle"),
    modalBody: formData.get("modalBody"),
    modalBtnText: formData.get("modalBtnText"),
    modalDismissText: formData.get("modalDismissText"),
    badgeText: formData.get("badgeText"),
    savingsRowLabel: formData.get("savingsRowLabel"),
    accentColor: formData.get("accentColor"),
    accentTextColor: formData.get("accentTextColor"),
  };

  // Validate
  if (!data.name || data.name.trim() === "") {
    return json({ error: "El nombre de la promoción es requerido" }, { status: 400 });
  }

  if (params.id === "new") {
    await createPromotion(shop, data);
  } else {
    await updatePromotion(params.id, shop, data);
  }

  return redirect("/app");
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function PromotionForm() {
  const { promotion, collections, isNew } = useLoaderData();
  const actionData = useActionData();
  const navigation = useNavigation();
  const submit = useSubmit();
  const isSaving = navigation.state === "submitting";

  // Parse existing collections
  const existingCollections = promotion
    ? JSON.parse(promotion.collections || "[]")
    : [];

  const existingGetCollections = promotion
    ? JSON.parse(promotion.getCollections || "[]")
    : [];

  // Form State
  const [name, setName] = useState(promotion?.name ?? "");
  const [active, setActive] = useState(promotion?.active ?? true);
  const [ruleType, setRuleType] = useState(promotion?.ruleType ?? "NxM");
  const [buyQty, setBuyQty] = useState(String(promotion?.buyQuantity ?? 4));
  const [getQty, setGetQty] = useState(String(promotion?.getQuantity ?? 1));
  const [selectedCollections, setSelectedCollections] = useState(existingCollections);
  const [applyToAll, setApplyToAll] = useState(promotion?.applyToAll ?? false);
  const [sameCollections, setSameCollections] = useState(promotion?.sameCollections ?? true);
  const [selectedGetCollections, setSelectedGetCollections] = useState(existingGetCollections);
  const [discountType, setDiscountType] = useState(promotion?.discountType ?? "free");
  const [discountValue, setDiscountValue] = useState(String(promotion?.discountValue ?? 100));
  const [targetItem, setTargetItem] = useState(promotion?.targetItem ?? "cheapest");
  const [freeShipping, setFreeShipping] = useState(promotion?.freeShipping ?? false);
  const [enableProgressBar, setEnableProgressBar] = useState(promotion?.enableProgressBar ?? true);

  // Messages
  const [bannerMsgAlmost, setBannerMsgAlmost] = useState(
    promotion?.bannerMsgAlmost ?? "¡Agrega {MISSING} artículo(s) más y llévate 1 GRATIS!"
  );
  const [bannerMsgActive, setBannerMsgActive] = useState(
    promotion?.bannerMsgActive ?? "🎉 ¡Promo activa! Tienes {COUNT} producto(s) GRATIS en tu carrito"
  );
  const [modalTitle, setModalTitle] = useState(promotion?.modalTitle ?? "¡Casi lo logras!");
  const [modalBody, setModalBody] = useState(
    promotion?.modalBody ?? "Agrega {MISSING} artículo(s) más y llévate el de menor valor GRATIS"
  );
  const [modalBtnText, setModalBtnText] = useState(promotion?.modalBtnText ?? "¡Aprovechar la promo!");
  const [modalDismissText, setModalDismissText] = useState(
    promotion?.modalDismissText ?? "No gracias, continuar al pago"
  );
  const [badgeText, setBadgeText] = useState(promotion?.badgeText ?? "¡GRATIS!");
  const [savingsRowLabel, setSavingsRowLabel] = useState(
    promotion?.savingsRowLabel ?? "Descuento aplicado"
  );
  const [accentColor, setAccentColor] = useState(promotion?.accentColor ?? "#D9FF4F");
  const [accentTextColor, setAccentTextColor] = useState(promotion?.accentTextColor ?? "#000000");

  const ruleDescription = () => {
    const n = parseInt(buyQty) || 4;
    const m = parseInt(getQty) || 1;
    const discount = discountType === "free"
      ? "GRATIS"
      : discountType === "percentage"
        ? `con ${discountValue}% de descuento`
        : `con $${discountValue} de descuento`;
    return `Compra ${n} artículos y lleva ${m} ${discount}`;
  };

  const toggleCollection = (collectionId) => {
    setSelectedCollections((prev) =>
      prev.includes(collectionId)
        ? prev.filter((id) => id !== collectionId)
        : [...prev, collectionId]
    );
  };

  const toggleGetCollection = (collectionId) => {
    setSelectedGetCollections((prev) =>
      prev.includes(collectionId)
        ? prev.filter((id) => id !== collectionId)
        : [...prev, collectionId]
    );
  };

  const handleSave = () => {
    const formData = new FormData();
    formData.append("name", name);
    formData.append("active", String(active));
    formData.append("ruleType", ruleType);
    formData.append("buyQuantity", buyQty);
    formData.append("getQuantity", getQty);
    formData.append("collections", JSON.stringify(selectedCollections));
    formData.append("applyToAll", String(applyToAll));
    formData.append("sameCollections", String(sameCollections));
    formData.append("getCollections", JSON.stringify(selectedGetCollections));
    formData.append("discountType", discountType);
    formData.append("discountValue", discountValue);
    formData.append("targetItem", targetItem);
    formData.append("freeShipping", String(freeShipping));
    formData.append("enableProgressBar", String(enableProgressBar));
    formData.append("bannerMsgAlmost", bannerMsgAlmost);
    formData.append("bannerMsgActive", bannerMsgActive);
    formData.append("modalTitle", modalTitle);
    formData.append("modalBody", modalBody);
    formData.append("modalBtnText", modalBtnText);
    formData.append("modalDismissText", modalDismissText);
    formData.append("badgeText", badgeText);
    formData.append("savingsRowLabel", savingsRowLabel);
    formData.append("accentColor", accentColor);
    formData.append("accentTextColor", accentTextColor);
    submit(formData, { method: "post" });
  };

  const handleDelete = () => {
    if (confirm("¿Estás seguro de que quieres eliminar esta promoción?")) {
      const formData = new FormData();
      formData.append("intent", "delete");
      submit(formData, { method: "post" });
    }
  };

  return (
    <Page
      backAction={{ url: "/app" }}
      title={isNew ? "Nueva Promoción" : `Editar: ${name || "Promoción"}`}
      subtitle={ruleDescription()}
      primaryAction={{
        content: isSaving ? "Guardando..." : "Guardar Promoción",
        onAction: handleSave,
        loading: isSaving,
      }}
      secondaryActions={[
        ...(active
          ? [{ content: "Pausar", onAction: () => { setActive(false); } }]
          : [{ content: "Activar", onAction: () => { setActive(true); } }]),
        ...(!isNew
          ? [{ content: "Eliminar", onAction: handleDelete, destructive: true }]
          : []),
      ]}
    >
      <BlockStack gap="600">
        {actionData?.error && (
          <Banner tone="critical" title={actionData.error} />
        )}

        <Layout>
          {/* LEFT: Main config */}
          <Layout.Section>
            <BlockStack gap="400">

              {/* Sección 1: Regla básica */}
              <SectionCard
                title="⚙️ Regla de Promoción"
                subtitle="Define el tipo de oferta y las cantidades"
              >
                <FormLayout>
                  <TextField
                    label="Nombre interno de la promoción"
                    value={name}
                    onChange={setName}
                    placeholder="Ej: Promo 4x3 Calzado Verano"
                    helpText="Solo visible en el panel de administración"
                    autoComplete="off"
                  />

                  <Select
                    label="Tipo de regla"
                    options={[
                      { label: "NxM — Compra N lleva M a descuento", value: "NxM" },
                    ]}
                    value={ruleType}
                    onChange={setRuleType}
                  />

                  {ruleType === "NxM" && (
                    <div style={{
                      background: "linear-gradient(135deg, #f0f9ff, #ede9fe)",
                      borderRadius: "12px",
                      padding: "20px",
                    }}>
                      <BlockStack gap="300">
                        <Text variant="headingMd" as="h3" fontWeight="semibold">
                          Configura tu regla NxM
                        </Text>
                        <InlineStack gap="400" wrap={false}>
                          <div style={{ flex: 1 }}>
                            <NumberStepInput
                              label="N — Cantidad a comprar"
                              value={parseInt(buyQty)}
                              onChange={(v) => setBuyQty(String(v))}
                              min={2}
                              max={20}
                              color="#6366f1"
                            />
                          </div>
                          <div style={{
                            display: "flex",
                            alignItems: "center",
                            paddingTop: "28px",
                            fontSize: "24px",
                            fontWeight: "900",
                            color: "#6366f1",
                          }}>
                            ×
                          </div>
                          <div style={{ flex: 1 }}>
                            <NumberStepInput
                              label="M — Cantidad a regalar/descontar"
                              value={parseInt(getQty)}
                              onChange={(v) => setGetQty(String(v))}
                              min={1}
                              max={parseInt(buyQty) - 1 || 1}
                              color="#10b981"
                            />
                          </div>
                        </InlineStack>

                        {/* Preview pill */}
                        <div style={{
                          background: "#fff",
                          borderRadius: "50px",
                          padding: "10px 20px",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "8px",
                          border: "1px solid #e5e7eb",
                          alignSelf: "flex-start",
                        }}>
                          <span style={{ fontSize: "20px" }}>🛒</span>
                          <span style={{ fontWeight: "700", fontSize: "16px" }}>
                            {buyQty}x{parseInt(buyQty) - parseInt(getQty)}
                          </span>
                          <span style={{ color: "#6b7280", fontSize: "14px" }}>
                            Compra {buyQty} → lleva {getQty} gratis
                          </span>
                        </div>
                      </BlockStack>
                    </div>
                  )}

                  <Divider />

                  <Select
                    label="Tipo de descuento"
                    options={[
                      { label: "🎁 Gratis (precio $0)", value: "free" },
                      { label: "% Porcentaje de descuento", value: "percentage" },
                      { label: "$ Monto fijo de descuento", value: "fixed" },
                    ]}
                    value={discountType}
                    onChange={setDiscountType}
                  />

                  {discountType !== "free" && (
                    <TextField
                      label={discountType === "percentage" ? "Porcentaje (%)" : "Monto ($)"}
                      type="number"
                      value={discountValue}
                      onChange={setDiscountValue}
                      suffix={discountType === "percentage" ? "%" : ""}
                      prefix={discountType === "fixed" ? "$" : ""}
                      min={0}
                      max={discountType === "percentage" ? 100 : undefined}
                      autoComplete="off"
                    />
                  )}

                  <Select
                    label="¿Qué artículo recibe el descuento?"
                    options={[
                      { label: "El más barato del grupo elegible", value: "cheapest" },
                      { label: "El más caro del grupo elegible", value: "most_expensive" },
                    ]}
                    value={targetItem}
                    onChange={setTargetItem}
                    helpText="El artículo seleccionado recibirá el descuento o quedará en $0"
                  />
                </FormLayout>
              </SectionCard>

              {/* Sección 2: Colecciones */}
              <SectionCard
                title="🏷️ Productos Elegibles y Colección del Regalo"
                subtitle="Define qué productos se compran y de qué colección se obtiene el regalo"
              >
                <BlockStack gap="400">
                  <Text variant="headingSm" as="h4" fontWeight="semibold">
                    1️⃣ Colección requerida para comprar ({buyQty} unidades):
                  </Text>

                  <Checkbox
                    label="Aplicar compra a toda la tienda (cualquier producto)"
                    checked={applyToAll}
                    onChange={setApplyToAll}
                  />

                  {!applyToAll && (
                    <BlockStack gap="300">
                      <Text variant="bodySm" as="p" tone="subdued">
                        Selecciona las colecciones que el cliente debe comprar:
                      </Text>
                      <div style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
                        gap: "12px",
                        maxHeight: "260px",
                        overflowY: "auto",
                        paddingRight: "4px",
                      }}>
                        {collections.map((col) => {
                          const isSelected = selectedCollections.includes(col.id);
                          return (
                            <div
                              key={`buy-${col.id}`}
                              onClick={() => toggleCollection(col.id)}
                              style={{
                                border: `2px solid ${isSelected ? "#6366f1" : "#e5e7eb"}`,
                                borderRadius: "12px",
                                padding: "12px",
                                cursor: "pointer",
                                background: isSelected ? "#ede9fe" : "#fff",
                                transition: "all 0.15s ease",
                              }}
                            >
                              <InlineStack gap="200" blockAlign="center" wrap={false}>
                                <div style={{
                                  width: "32px",
                                  height: "32px",
                                  borderRadius: "8px",
                                  background: isSelected ? "#6366f1" : "#f3f4f6",
                                  color: isSelected ? "#fff" : "#000",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  fontSize: "14px",
                                  flexShrink: 0,
                                }}>
                                  {isSelected ? "✓" : "○"}
                                </div>
                                <BlockStack gap="0">
                                  <Text variant="bodySm" as="p" fontWeight="semibold">
                                    {col.title}
                                  </Text>
                                  <Text variant="bodySm" as="p" tone="subdued">
                                    {col.productsCount?.count ?? 0} productos
                                  </Text>
                                </BlockStack>
                              </InlineStack>
                            </div>
                          );
                        })}
                      </div>
                      {selectedCollections.length > 0 && (
                        <div style={{
                          background: "#ede9fe",
                          borderRadius: "8px",
                          padding: "8px 14px",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                        }}>
                          <span style={{ fontWeight: "700", color: "#5b21b6" }}>
                            {selectedCollections.length}
                          </span>
                          <span style={{ color: "#5b21b6", fontSize: "13px" }}>
                            colección(es) de compra seleccionada(s)
                          </span>
                        </div>
                      )}
                    </BlockStack>
                  )}

                  <Divider />

                  <Text variant="headingSm" as="h4" fontWeight="semibold">
                    2️⃣ Colección para el producto GRATIS / Descontado ({getQty} unidad{parseInt(getQty) > 1 ? "es" : ""}):
                  </Text>

                  <Checkbox
                    label="El producto gratis debe ser de las mismas colecciones de compra"
                    checked={sameCollections}
                    onChange={setSameCollections}
                  />

                  {!sameCollections && (
                    <BlockStack gap="300">
                      <Text variant="bodySm" as="p" tone="subdued">
                        Elige la colección de la cual se descontará el producto gratis:
                      </Text>
                      <div style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
                        gap: "12px",
                        maxHeight: "260px",
                        overflowY: "auto",
                        paddingRight: "4px",
                      }}>
                        {collections.map((col) => {
                          const isSelected = selectedGetCollections.includes(col.id);
                          return (
                            <div
                              key={`get-${col.id}`}
                              onClick={() => toggleGetCollection(col.id)}
                              style={{
                                border: `2px solid ${isSelected ? "#10b981" : "#e5e7eb"}`,
                                borderRadius: "12px",
                                padding: "12px",
                                cursor: "pointer",
                                background: isSelected ? "#ecfdf5" : "#fff",
                                transition: "all 0.15s ease",
                              }}
                            >
                              <InlineStack gap="200" blockAlign="center" wrap={false}>
                                <div style={{
                                  width: "32px",
                                  height: "32px",
                                  borderRadius: "8px",
                                  background: isSelected ? "#10b981" : "#f3f4f6",
                                  color: isSelected ? "#fff" : "#000",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  fontSize: "14px",
                                  flexShrink: 0,
                                }}>
                                  {isSelected ? "✓" : "○"}
                                </div>
                                <BlockStack gap="0">
                                  <Text variant="bodySm" as="p" fontWeight="semibold">
                                    {col.title}
                                  </Text>
                                  <Text variant="bodySm" as="p" tone="subdued">
                                    {col.productsCount?.count ?? 0} productos
                                  </Text>
                                </BlockStack>
                              </InlineStack>
                            </div>
                          );
                        })}
                      </div>
                      {selectedGetCollections.length > 0 && (
                        <div style={{
                          background: "#ecfdf5",
                          borderRadius: "8px",
                          padding: "8px 14px",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                        }}>
                          <span style={{ fontWeight: "700", color: "#065f46" }}>
                            {selectedGetCollections.length}
                          </span>
                          <span style={{ color: "#065f46", fontSize: "13px" }}>
                            colección(es) de regalo seleccionada(s)
                          </span>
                        </div>
                      )}
                    </BlockStack>
                  )}
                </BlockStack>
              </SectionCard>

              {/* Sección 3: Envío */}
              <SectionCard
                title="🚚 Configuración de Envío"
                subtitle="Activa envío gratis cuando se dispara la promo"
              >
                <div style={{
                  background: freeShipping
                    ? "linear-gradient(135deg, #ecfdf5, #d1fae5)"
                    : "#fafafa",
                  borderRadius: "12px",
                  padding: "16px 20px",
                  border: `2px solid ${freeShipping ? "#10b981" : "#e5e7eb"}`,
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
                onClick={() => setFreeShipping(!freeShipping)}
                >
                  <InlineStack align="space-between" blockAlign="center">
                    <InlineStack gap="300" blockAlign="center">
                      <span style={{ fontSize: "28px" }}>🚚</span>
                      <BlockStack gap="100">
                        <Text variant="bodyMd" as="p" fontWeight="semibold">
                          Envío gratis al activar la promo
                        </Text>
                        <Text variant="bodySm" as="p" tone="subdued">
                          El cliente no pagará envío cuando la promo esté activa
                        </Text>
                      </BlockStack>
                    </InlineStack>
                    <div style={{
                      width: "48px",
                      height: "26px",
                      background: freeShipping ? "#10b981" : "#d1d5db",
                      borderRadius: "50px",
                      position: "relative",
                      transition: "background 0.2s ease",
                    }}>
                      <div style={{
                        position: "absolute",
                        width: "20px",
                        height: "20px",
                        background: "#fff",
                        borderRadius: "50%",
                        top: "3px",
                        left: freeShipping ? "25px" : "3px",
                        transition: "left 0.2s ease",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                      }} />
                    </div>
                  </InlineStack>
                </div>
              </SectionCard>

              {/* Sección 4: Mensajes */}
              <SectionCard
                title="💬 Barra Progresiva Inferior"
                subtitle="Personaliza la barra que aparece en la parte inferior de la pantalla"
              >
                <FormLayout>
                  <div style={{
                    background: enableProgressBar
                      ? "linear-gradient(135deg, #ecfdf5, #d1fae5)"
                      : "#fafafa",
                    borderRadius: "12px",
                    padding: "16px 20px",
                    border: `2px solid ${enableProgressBar ? "#10b981" : "#e5e7eb"}`,
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                    marginBottom: "16px"
                  }}
                  onClick={() => setEnableProgressBar(!enableProgressBar)}
                  >
                    <InlineStack align="space-between" blockAlign="center">
                      <InlineStack gap="300" blockAlign="center">
                        <span style={{ fontSize: "28px" }}>🚀</span>
                        <BlockStack gap="100">
                          <Text variant="bodyMd" as="p" fontWeight="semibold">
                            Mostrar barra progresiva
                          </Text>
                          <Text variant="bodySm" as="p" tone="subdued">
                            Fija una barra inferior indicando el avance de la promo
                          </Text>
                        </BlockStack>
                      </InlineStack>
                      <div style={{
                        width: "48px",
                        height: "26px",
                        background: enableProgressBar ? "#10b981" : "#d1d5db",
                        borderRadius: "50px",
                        position: "relative",
                        transition: "background 0.2s ease",
                      }}>
                        <div style={{
                          position: "absolute",
                          width: "20px",
                          height: "20px",
                          background: "#fff",
                          borderRadius: "50%",
                          top: "3px",
                          left: enableProgressBar ? "25px" : "3px",
                          transition: "left 0.2s ease",
                          boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                        }} />
                      </div>
                    </InlineStack>
                  </div>

                  <Text variant="bodyMd" as="p" tone="subdued">
                    Usa <code style={{ background: "#f3f4f6", padding: "1px 6px", borderRadius: "4px" }}>{"{MISSING}"}</code> para el número de productos faltantes y <code style={{ background: "#f3f4f6", padding: "1px 6px", borderRadius: "4px" }}>{"{COUNT}"}</code> para la cantidad de productos gratis.
                  </Text>
                  <TextField
                    label="Mensaje cuando falta poco"
                    value={bannerMsgAlmost}
                    onChange={setBannerMsgAlmost}
                    autoComplete="off"
                    helpText="Se muestra en la barra mientras se avanza hacia la promo"
                  />
                  <TextField
                    label="Mensaje cuando se activa la promo"
                    value={bannerMsgActive}
                    onChange={setBannerMsgActive}
                    autoComplete="off"
                    helpText="Se muestra en la barra cuando se alcanza la promoción"
                  />
                  <TextField
                    label="Modal — Título"
                    value={modalTitle}
                    onChange={setModalTitle}
                    autoComplete="off"
                  />
                  <TextField
                    label="Modal — Cuerpo del mensaje"
                    value={modalBody}
                    onChange={setModalBody}
                    multiline={2}
                    autoComplete="off"
                  />
                  <InlineStack gap="400">
                    <div style={{ flex: 1 }}>
                      <TextField
                        label="Modal — Botón principal"
                        value={modalBtnText}
                        onChange={setModalBtnText}
                        autoComplete="off"
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <TextField
                        label="Modal — Botón secundario"
                        value={modalDismissText}
                        onChange={setModalDismissText}
                        autoComplete="off"
                      />
                    </div>
                  </InlineStack>
                  <InlineStack gap="400">
                    <div style={{ flex: 1 }}>
                      <TextField
                        label="Badge del carrito"
                        value={badgeText}
                        onChange={setBadgeText}
                        autoComplete="off"
                        helpText="Etiqueta sobre el producto gratis"
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <TextField
                        label="Fila de totales — Etiqueta"
                        value={savingsRowLabel}
                        onChange={setSavingsRowLabel}
                        autoComplete="off"
                      />
                    </div>
                  </InlineStack>
                </FormLayout>
              </SectionCard>

              {/* Sección 5: Colores */}
              <SectionCard
                title="🎨 Colores de la Promoción"
                subtitle="Personaliza los colores de los widgets del storefront"
              >
                <InlineStack gap="600" wrap={false}>
                  <BlockStack gap="200">
                    <Text variant="bodyMd" as="p" fontWeight="semibold">
                      Color de acento
                    </Text>
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
                    <Text variant="bodyMd" as="p" fontWeight="semibold">
                      Color del texto
                    </Text>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <input
                        type="color"
                        value={accentTextColor}
                        onChange={(e) => setAccentTextColor(e.target.value)}
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
                        value={accentTextColor}
                        onChange={setAccentTextColor}
                        autoComplete="off"
                      />
                    </div>
                  </BlockStack>
                </InlineStack>

                {/* Preview */}
                <Box paddingBlockStart="400">
                  <Text variant="bodyMd" as="p" fontWeight="semibold" tone="subdued">
                    Vista previa del botón:
                  </Text>
                  <Box paddingBlockStart="200">
                    <button style={{
                      background: accentColor,
                      color: accentTextColor,
                      border: "none",
                      borderRadius: "50px",
                      padding: "12px 28px",
                      fontSize: "15px",
                      fontWeight: "700",
                      cursor: "default",
                    }}>
                      {modalBtnText}
                    </button>
                  </Box>
                </Box>
              </SectionCard>
            </BlockStack>
          </Layout.Section>

          {/* RIGHT: Status & Preview */}
          <Layout.Section variant="oneThird">
            <BlockStack gap="400" position="sticky" inlineAlign="start">

              {/* Status toggle */}
              <div style={{
                background: active
                  ? "linear-gradient(135deg, #ecfdf5, #d1fae5)"
                  : "linear-gradient(135deg, #fafafa, #f3f4f6)",
                borderRadius: "16px",
                padding: "20px",
                border: `2px solid ${active ? "#10b981" : "#e5e7eb"}`,
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
              onClick={() => setActive(!active)}
              >
                <InlineStack align="space-between" blockAlign="center">
                  <BlockStack gap="100">
                    <Text variant="headingMd" as="h3" fontWeight="bold">
                      {active ? "✅ Promoción Activa" : "⏸️ Promoción Pausada"}
                    </Text>
                    <Text variant="bodySm" as="p" tone="subdued">
                      {active
                        ? "Los clientes verán esta promo"
                        : "La promo no se mostrará a clientes"}
                    </Text>
                  </BlockStack>
                  <div style={{
                    width: "52px",
                    height: "28px",
                    background: active ? "#10b981" : "#d1d5db",
                    borderRadius: "50px",
                    position: "relative",
                    transition: "background 0.2s ease",
                    flexShrink: 0,
                  }}>
                    <div style={{
                      position: "absolute",
                      width: "22px",
                      height: "22px",
                      background: "#fff",
                      borderRadius: "50%",
                      top: "3px",
                      left: active ? "27px" : "3px",
                      transition: "left 0.2s ease",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                    }} />
                  </div>
                </InlineStack>
              </div>

              {/* Preview card */}
              <div style={{
                background: "#fff",
                borderRadius: "16px",
                padding: "20px",
                border: "1px solid #f0f0f0",
              }}>
                <BlockStack gap="300">
                  <Text variant="headingMd" as="h3" fontWeight="bold">
                    📱 Vista previa — Banner
                  </Text>
                  <PromoBannerPreview
                    msgAlmost={bannerMsgAlmost.replace("{MISSING}", "1")}
                    msgActive={bannerMsgActive.replace("{COUNT}", "1")}
                    accentColor={accentColor}
                    accentTextColor={accentTextColor}
                  />
                </BlockStack>
              </div>

              {/* Summary */}
              <div style={{
                background: "#0f0f0f",
                borderRadius: "16px",
                padding: "20px",
                color: "#fff",
              }}>
                <BlockStack gap="200">
                  <Text variant="headingMd" as="h3" fontWeight="bold" tone="text-inverse">
                    Resumen de la regla
                  </Text>
                  <Divider borderColor="border-inverse" />
                  <SummaryRow
                    label="Tipo"
                    value={ruleType}
                  />
                  <SummaryRow
                    label="Regla"
                    value={`${buyQty}×${buyQty - getQty} (compra ${buyQty} → ${getQty} gratis)`}
                  />
                  <SummaryRow
                    label="Descuento"
                    value={
                      discountType === "free"
                        ? "Gratis (precio $0)"
                        : discountType === "percentage"
                          ? `${discountValue}% off`
                          : `$${discountValue} off`
                    }
                  />
                  <SummaryRow
                    label="Artículo descontado"
                    value={targetItem === "cheapest" ? "El más barato" : "El más caro"}
                  />
                  <SummaryRow
                    label="Colección compra"
                    value={
                      applyToAll
                        ? "Toda la tienda"
                        : `${selectedCollections.length} colección(es)`
                    }
                  />
                  <SummaryRow
                    label="Colección regalo"
                    value={
                      sameCollections
                        ? "Mismas que compra"
                        : `${selectedGetCollections.length} colección(es)`
                    }
                  />
                  <SummaryRow
                    label="Envío gratis"
                    value={freeShipping ? "✅ Sí" : "❌ No"}
                  />
                </BlockStack>
              </div>
            </BlockStack>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}

// ─── Subcomponents ────────────────────────────────────────────────────────────

function SectionCard({ title, subtitle, children }) {
  return (
    <div style={{
      background: "#fff",
      borderRadius: "16px",
      padding: "28px",
      border: "1px solid #f0f0f0",
    }}>
      <BlockStack gap="400">
        <BlockStack gap="100">
          <Text variant="headingMd" as="h2" fontWeight="bold">
            {title}
          </Text>
          <Text variant="bodySm" as="p" tone="subdued">
            {subtitle}
          </Text>
        </BlockStack>
        <Divider />
        {children}
      </BlockStack>
    </div>
  );
}

function NumberStepInput({ label, value, onChange, min = 1, max = 20, color }) {
  return (
    <BlockStack gap="100">
      <Text variant="bodySm" as="p" fontWeight="semibold" tone="subdued">
        {label}
      </Text>
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: "0",
        border: "2px solid #e5e7eb",
        borderRadius: "12px",
        overflow: "hidden",
        width: "100%",
      }}>
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - 1))}
          style={{
            background: "#f3f4f6",
            border: "none",
            padding: "12px 16px",
            fontSize: "20px",
            fontWeight: "700",
            cursor: "pointer",
            color: "#374151",
            transition: "background 0.1s",
          }}
          onMouseOver={e => e.currentTarget.style.background = "#e5e7eb"}
          onMouseOut={e => e.currentTarget.style.background = "#f3f4f6"}
        >
          −
        </button>
        <div style={{
          flex: 1,
          textAlign: "center",
          fontSize: "28px",
          fontWeight: "800",
          color: color,
          padding: "8px",
        }}>
          {value}
        </div>
        <button
          type="button"
          onClick={() => onChange(Math.min(max, value + 1))}
          style={{
            background: "#f3f4f6",
            border: "none",
            padding: "12px 16px",
            fontSize: "20px",
            fontWeight: "700",
            cursor: "pointer",
            color: "#374151",
            transition: "background 0.1s",
          }}
          onMouseOver={e => e.currentTarget.style.background = "#e5e7eb"}
          onMouseOut={e => e.currentTarget.style.background = "#f3f4f6"}
        >
          +
        </button>
      </div>
    </BlockStack>
  );
}

function PromoBannerPreview({ msgAlmost, msgActive, accentColor, accentTextColor }) {
  const [showing, setShowing] = useState("almost");
  return (
    <BlockStack gap="200">
      <InlineStack gap="200">
        <button
          type="button"
          onClick={() => setShowing("almost")}
          style={{
            background: showing === "almost" ? "#f3f4f6" : "transparent",
            border: "1px solid #e5e7eb",
            borderRadius: "6px",
            padding: "4px 10px",
            fontSize: "12px",
            cursor: "pointer",
            fontWeight: "600",
          }}
        >
          Casi
        </button>
        <button
          type="button"
          onClick={() => setShowing("active")}
          style={{
            background: showing === "active" ? accentColor : "transparent",
            color: showing === "active" ? accentTextColor : "#374151",
            border: "1px solid #e5e7eb",
            borderRadius: "6px",
            padding: "4px 10px",
            fontSize: "12px",
            cursor: "pointer",
            fontWeight: "600",
          }}
        >
          Activa
        </button>
      </InlineStack>
      <div style={{
        background: showing === "active" ? accentColor : "#fff",
        color: showing === "active" ? accentTextColor : "#333",
        border: `2px solid ${showing === "active" ? accentColor : "#e5e7eb"}`,
        borderRadius: "12px",
        padding: "12px 16px",
        fontSize: "13px",
        fontWeight: "500",
        display: "flex",
        alignItems: "center",
        gap: "10px",
        transition: "all 0.3s ease",
      }}>
        <span>{showing === "active" ? "✅" : "ℹ️"}</span>
        <span dangerouslySetInnerHTML={{
          __html: showing === "almost" ? msgAlmost : msgActive
        }} />
      </div>
    </BlockStack>
  );
}

function SummaryRow({ label, value }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <span style={{ color: "#9ca3af", fontSize: "13px" }}>{label}</span>
      <span style={{ color: "#fff", fontSize: "13px", fontWeight: "600", textAlign: "right", maxWidth: "55%" }}>
        {value}
      </span>
    </div>
  );
}
