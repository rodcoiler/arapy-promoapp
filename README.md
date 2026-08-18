# PromoBox

> Motor de promociones NxM configurable para Shopify — alternativa a Rebuy y GiftBox.

## ¿Qué hace esta app?

Permite crear reglas de promoción del tipo **4x3, 3x2, 5x4** (compra N lleva M gratis/descontado) directamente desde el panel de administración de Shopify, con widgets automáticos en la tienda: banner animado, modal, badge en el carrito y fila de ahorro en totales.

## Stack

- **Remix v2** + **React 18** — Framework full-stack
- **Shopify Polaris v13** — UI del panel admin
- **Prisma v6 + SQLite** — Base de datos
- **@shopify/shopify-app-remix v3** — Auth, webhooks, session
- **Vite v5** — Bundler
- **Vanilla JS** — Script del storefront (sin dependencias)

## Estructura

```
app/
  routes/
    app.jsx                  → Layout con auth
    app._index.jsx           → Dashboard
    app.promotions.$id.jsx   → Editor de promociones
    app.settings.jsx         → Configuración global
    api.promotions.jsx       → API pública para el storefront
    api.sync-promotions.jsx  → Sincroniza promos con Shopify
    auth.$.jsx               → Auth callback
    webhooks.jsx             → Webhooks

extensions/
  theme-app-extension/
    assets/promobox-storefront.js   → Script del storefront
    blocks/promobox_banner.liquid   → App Block
  cart-transform/
    src/index.js                    → Shopify Function (descuento real)

prisma/
  schema.prisma    → Modelos Session + Promotion
```

## Setup rápido

```bash
# 1. Copiar variables de entorno
cp .env.example .env
# Editar .env con tu API Key y Secret de Shopify Partners

# 2. Base de datos (ya ejecutado, dev.db existe)
npx prisma generate
npx prisma migrate dev

# 3. Exponer con ngrok
ngrok http 3000

# 4. Actualizar SHOPIFY_APP_URL en .env con la URL de ngrok

# 5. Correr la app
shopify app dev
# o en modo local sin CLI de Shopify:
npm run dev:local
```

## Variables de entorno

| Variable | Descripción |
|---------|-------------|
| `SHOPIFY_API_KEY` | API Key de Shopify Partners |
| `SHOPIFY_API_SECRET` | API Secret de Shopify Partners |
| `SHOPIFY_APP_URL` | URL pública de la app (ngrok en dev) |
| `SCOPES` | Permisos de la app |
| `DATABASE_URL` | URL de la base de datos SQLite |

## Funcionalidades

### Reglas configurables
- **NxM**: 4x3, 3x2, 5x4 — cualquier combinación
- **Tipo de descuento**: Gratis (precio $0) / % porcentaje / monto fijo
- **Artículo descontado**: el más barato o el más caro del grupo
- **Colecciones elegibles**: selección múltiple o toda la tienda
- **Envío gratis**: toggle al activar la promo

### Widgets del storefront
- Banner animado superior (slide + fade)
- Modal emergente (cuando falta 1 item para la promo)
- Badge "¡GRATIS!" sobre el producto descontado
- Fila de ahorro en los totales del carrito

### Mensajes configurables
Todos los textos de los widgets son editables desde el admin:
- `{MISSING}` → número de productos faltantes
- `{COUNT}` → número de productos gratis

### Colores
Color de acento y color de texto totalmente personalizables con preview en tiempo real.

## Notas importantes

### Descuento real de precios
El descuento visual (badge, banner, fila de totales) funciona inmediatamente.
Para el descuento **real** en el precio del checkout, se necesita conectar la extensión `cart-transform` (Shopify Function) ubicada en `extensions/cart-transform/`.

Esto requiere:
1. Plan Shopify Basic o superior (las Cart Transform Functions están disponibles en todos los planes para descuentos de % y montos, pero no para precio $0 — ese requiere Shopify Plus).
2. Compilar la extensión: `shopify app generate extension --type=cart_transform`

### Alternativa para todos los planes
Usar la **Discounts API** para crear códigos de descuento automáticos al detectar la promo activa en el carrito.
