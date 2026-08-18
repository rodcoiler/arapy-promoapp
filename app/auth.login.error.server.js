import { LoginErrorType } from "@shopify/shopify-app-remix/server";

export function loginErrorMessage(request) {
  const url = new URL(request.url);
  const error = url.searchParams.get("error");

  switch (error) {
    case LoginErrorType.MissingShop:
      return { shop: "La URL de la tienda es requerida" };
    case LoginErrorType.InvalidShop:
      return { shop: "URL de tienda no válida. Usa el formato: tu-tienda.myshopify.com" };
    default:
      return {};
  }
}
