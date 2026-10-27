import { mockProvider } from "./mock.js";
import { createQuickveeProvider } from "./quickvee.js";
import type { CommerceProvider } from "./types.js";

export type { CommerceProvider } from "./types.js";
export { mockProvider } from "./mock.js";
export { createQuickveeProvider, mapInventoryResponse, mapOrderResponse } from "./quickvee.js";

/**
 * COMMERCE_PROVIDER:
 *   - "mock" (default in development / when unset and no Quickvee key)
 *   - "quickvee" (production default when QUICKVEE_API_KEY is set, or forced)
 */
export function getCommerceProvider(): CommerceProvider {
  const named = (process.env["COMMERCE_PROVIDER"] ?? "").toLowerCase().trim();
  if (named === "mock") return mockProvider;
  if (named === "quickvee") return createQuickveeProvider();

  // Auto: prefer Quickvee when a key is present, otherwise mock for local UX.
  if (process.env["QUICKVEE_API_KEY"]) return createQuickveeProvider();
  return mockProvider;
}
