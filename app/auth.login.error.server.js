import { LoginErrorType } from "@shopify/shopify-app-remix/server";

export function loginErrorMessage(request) {
  const url = new URL(request.url);
  const error = url.searchParams.get("error");

  switch (error) {
    case LoginErrorType.ShopifyKilledAccess:
      return { shop: "Acceso denegado por Shopify" };
    case LoginErrorType.ActiveSessionNotFound:
      return { shop: "Sesión activa no encontrada" };
    default:
      return {};
  }
}
