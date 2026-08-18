import { redirect } from "@remix-run/node";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  return redirect(`/app?shop=${session.shop}&host=${new URL(request.url).searchParams.get("host")}`);
};
