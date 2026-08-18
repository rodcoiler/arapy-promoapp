import { json } from "@remix-run/node";
import { Form, useActionData, useLoaderData } from "@remix-run/react";
import { useState } from "react";
import {
  AppProvider,
  Button,
  Card,
  FormLayout,
  Page,
  Text,
  TextField,
} from "@shopify/polaris";
import shopify from "../shopify.server";
import { loginErrorMessage } from "./auth.login.error.server";

export const loader = async ({ request }) => {
  const errors = loginErrorMessage(request);
  return json({ errors, shopifyConfig: { shop: "" } });
};

export const action = async ({ request }) => {
  const errors = {};
  const formData = await request.formData();
  const shop = formData.get("shop");

  if (!shop) {
    errors.shop = "La URL de la tienda es requerida";
    return json({ errors });
  }

  // Attempt login redirect
  return shopify.login(request);
};

export default function Login() {
  const loaderData = useLoaderData();
  const actionData = useActionData();
  const [shop, setShop] = useState("");
  const errors = actionData?.errors || loaderData?.errors || {};

  return (
    <Page>
      <Card>
        <Form method="post">
          <FormLayout>
            <Text variant="headingMd" as="h2">
              Log in to PromoBox
            </Text>
            <TextField
              label="Shop domain"
              name="shop"
              value={shop}
              onChange={setShop}
              autoComplete="off"
              error={errors.shop}
              placeholder="example.myshopify.com"
            />
            <Button submit variant="primary">
              Log in
            </Button>
          </FormLayout>
        </Form>
      </Card>
    </Page>
  );
}
