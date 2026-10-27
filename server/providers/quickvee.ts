/**
 * Quickvee commerce provider.
 *
 * Calls:
 *   GET {QUICKVEE_BASE_URL}/inventory
 *   GET {QUICKVEE_BASE_URL}/orders
 *
 * Auth: configurable header (default Authorization: Bearer <QUICKVEE_API_KEY>).
 *
 * The live Quickvee response shapes are not fully documented here yet, so all
 * field mapping is isolated in mapInventoryResponse / mapOrderResponse with
 * ASSUMED field names. Adjust those two functions when Jim confirms the real schema.
 */
import type { CommerceProvider, InventoryItem, OrderStatus, ProductSummary } from "./types.js";

const DEFAULT_BASE = "https://quickvee.com";
const TIMEOUT_MS = Number(process.env["QUICKVEE_TIMEOUT_MS"] ?? 8000);

export type QuickveeConfig = {
  baseUrl: string;
  apiKey: string;
  /** Header name that carries the API key */
  authHeader: string;
  /** How to format the header value; "bearer" → "Bearer <key>", "raw" → key only */
  authScheme: "bearer" | "raw";
  merchantId?: string;
};

export function getQuickveeConfig(): QuickveeConfig {
  const cfg: QuickveeConfig = {
    baseUrl: (process.env["QUICKVEE_BASE_URL"] ?? DEFAULT_BASE).replace(/\/$/, ""),
    apiKey: process.env["QUICKVEE_API_KEY"] ?? "",
    authHeader: process.env["QUICKVEE_AUTH_HEADER"] ?? "Authorization",
    authScheme: (process.env["QUICKVEE_AUTH_SCHEME"] as "bearer" | "raw") ?? "bearer",
  };
  const mid = process.env["QUICKVEE_MERCHANT_ID"];
  if (mid) cfg.merchantId = mid;
  return cfg;
}

async function quickveeFetch(
  config: QuickveeConfig,
  path: string,
  query: Record<string, string | undefined>,
  signal?: AbortSignal,
): Promise<unknown> {
  if (!config.apiKey) {
    throw new Error("QUICKVEE_API_KEY is not set");
  }
  const url = new URL(config.baseUrl + path);
  for (const [k, v] of Object.entries(query)) {
    if (v) url.searchParams.set(k, v);
  }
  if (config.merchantId) url.searchParams.set("merchant_id", config.merchantId);

  const headers: Record<string, string> = {
    accept: "application/json",
  };
  headers[config.authHeader] =
    config.authScheme === "bearer" ? `Bearer ${config.apiKey}` : config.apiKey;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const onAbort = () => controller.abort();
  signal?.addEventListener("abort", onAbort);

  try {
    const res = await fetch(url.toString(), {
      method: "GET",
      headers,
      signal: controller.signal,
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Quickvee ${path} failed (${res.status}): ${body.slice(0, 300)}`);
    }
    return await res.json();
  } catch (err) {
    if ((err as Error).name === "AbortError") {
      throw new Error(`Quickvee ${path} timed out after ${TIMEOUT_MS}ms`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", onAbort);
  }
}

/**
 * ASSUMED inventory JSON shape (adjust when real schema is confirmed):
 * {
 *   items: [{
 *     sku, name, brand?,
 *     store_id | storeId, store_name | storeName?,
 *     quantity | qty, in_stock | inStock?,
 *     price?
 *   }]
 * }
 * — or a bare array of those objects.
 */
export function mapInventoryResponse(raw: unknown): InventoryItem[] {
  const list = Array.isArray(raw)
    ? raw
    : Array.isArray((raw as { items?: unknown }).items)
      ? (raw as { items: unknown[] }).items
      : Array.isArray((raw as { data?: unknown }).data)
        ? (raw as { data: unknown[] }).data
        : [];

  return list.map((row) => {
    const r = row as Record<string, unknown>;
    const quantity = Number(r["quantity"] ?? r["qty"] ?? 0);
    const inStock =
      typeof r["in_stock"] === "boolean"
        ? r["in_stock"]
        : typeof r["inStock"] === "boolean"
          ? r["inStock"]
          : quantity > 0;
    const item: InventoryItem = {
      sku: String(r["sku"] ?? r["product_id"] ?? ""),
      name: String(r["name"] ?? r["product_name"] ?? "Unknown"),
      storeId: String(r["store_id"] ?? r["storeId"] ?? r["merchant_id"] ?? ""),
      quantity,
      inStock,
      price: r["price"] != null ? Number(r["price"]) : null,
      currency: r["currency"] != null ? String(r["currency"]) : "USD",
    };
    if (r["brand"] != null) item.brand = String(r["brand"]);
    if (r["store_name"] != null) item.storeName = String(r["store_name"]);
    else if (r["storeName"] != null) item.storeName = String(r["storeName"]);
    return item;
  });
}

/**
 * ASSUMED order JSON shape (adjust when real schema is confirmed):
 * {
 *   order: {
 *     id | order_id | order_number,
 *     status,
 *     store_name?,
 *     created_at | placed_at?,
 *     items?: [{ name, quantity }],
 *     estimated_ready?,
 *     // customer email/phone used ONLY for verification — never returned
 *     customer_email?, customer_phone?
 *   }
 * }
 * Verification: caller supplies email or phone; we match against those fields
 * before returning a sanitized OrderStatus (no PII).
 */
export function mapOrderResponse(raw: unknown, verify: string): OrderStatus | null {
  const root =
    (raw as { order?: unknown; data?: unknown }).order ?? (raw as { data?: unknown }).data ?? raw;
  if (!root || typeof root !== "object") return null;
  const r = root as Record<string, unknown>;

  const email = String(r["customer_email"] ?? r["email"] ?? "").toLowerCase();
  const phone = String(r["customer_phone"] ?? r["phone"] ?? "").replace(/\D/g, "");
  const v = verify.toLowerCase().trim();
  const vDigits = v.replace(/\D/g, "");
  const emailOk = email && v.includes(email);
  const phoneOk =
    phone &&
    vDigits &&
    (phone.endsWith(vDigits) || vDigits.endsWith(phone.slice(-4)) || phone.includes(vDigits));
  if (!emailOk && !phoneOk) return null;

  const itemsRaw = Array.isArray(r["items"]) ? (r["items"] as unknown[]) : [];
  const items = itemsRaw.map((it) => {
    const i = it as Record<string, unknown>;
    return {
      name: String(i["name"] ?? i["product_name"] ?? "Item"),
      quantity: Number(i["quantity"] ?? i["qty"] ?? 1),
    };
  });

  const status: OrderStatus = {
    orderId: String(r["order_number"] ?? r["order_id"] ?? r["id"] ?? ""),
    status: String(r["status"] ?? "unknown"),
    items,
    estimatedReady: r["estimated_ready"] != null ? String(r["estimated_ready"]) : null,
  };
  if (r["store_name"] != null) status.storeName = String(r["store_name"]);
  else if (r["storeName"] != null) status.storeName = String(r["storeName"]);
  if (r["placed_at"] != null) status.placedAt = String(r["placed_at"]);
  else if (r["created_at"] != null) status.placedAt = String(r["created_at"]);
  return status;
}

export function createQuickveeProvider(
  config: QuickveeConfig = getQuickveeConfig(),
): CommerceProvider {
  return {
    id: "quickvee",

    async checkInventory(query, store) {
      const raw = await quickveeFetch(config, "/inventory", {
        q: query || undefined,
        store: store || undefined,
      });
      const items = mapInventoryResponse(raw);
      // Client-side filter in case the API returns a full dump
      const q = query.toLowerCase();
      const s = (store ?? "").toLowerCase();
      return items.filter((item) => {
        const hay = `${item.name} ${item.brand ?? ""} ${item.sku}`.toLowerCase();
        const matchQ = !q || hay.includes(q) || q.split(/\s+/).every((t) => hay.includes(t));
        const matchStore =
          !s ||
          item.storeId.toLowerCase().includes(s) ||
          (item.storeName ?? "").toLowerCase().includes(s);
        return matchQ && matchStore;
      });
    },

    async getOrderStatus(orderNumber, verify) {
      const raw = await quickveeFetch(config, "/orders", {
        order_number: orderNumber,
        // Prefer not to send verify to the API if it doesn't need it;
        // we verify locally against mapped customer fields.
      });
      return mapOrderResponse(raw, verify);
    },

    async listProducts(query, limit = 20) {
      // Prefer inventory endpoint as a product catalog until a dedicated
      // /products route is confirmed.
      const raw = await quickveeFetch(config, "/inventory", {
        q: query || undefined,
      });
      const items = mapInventoryResponse(raw);
      const seen = new Set<string>();
      const out: ProductSummary[] = [];
      for (const item of items) {
        if (seen.has(item.sku)) continue;
        seen.add(item.sku);
        const summary: ProductSummary = { sku: item.sku, name: item.name };
        if (item.brand) summary.brand = item.brand;
        out.push(summary);
        if (out.length >= limit) break;
      }
      return out;
    },
  };
}
