import crypto from "node:crypto";

import { env } from "@workspace/env/server";

/**
 * Simple webhook verification.
 *
 * For this test, we accept either:
 * - `x-webhook-secret: <SANITY_WEBHOOK_SECRET>`
 * - `x-webhook-signature: sha256=<hex>` where hex is HMAC-SHA256 over the raw body
 */
export function verifyWebhookOrThrow(params: {
  headers: Headers;
  rawBody: string;
}) {
  const secret = env.SANITY_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error("Webhook secret not configured");
  }

  const direct = params.headers.get("x-webhook-secret");
  if (direct && direct === secret) {
    return;
  }

  const signature = params.headers.get("x-webhook-signature");
  if (!signature) {
    throw new Error("Missing webhook signature");
  }

  const [scheme, provided] = signature.split("=");
  if (scheme !== "sha256" || !provided) {
    throw new Error("Invalid webhook signature format");
  }

  const expected = crypto
    .createHmac("sha256", secret)
    .update(params.rawBody)
    .digest("hex");

  const ok = crypto.timingSafeEqual(
    Buffer.from(provided, "hex"),
    Buffer.from(expected, "hex")
  );

  if (!ok) {
    throw new Error("Invalid webhook signature");
  }
}

