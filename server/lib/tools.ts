import { getCommerceProvider } from "../providers/index.js";
import { rateLimit } from "./rate-limit.js";

export const TOOL_DEFINITIONS = [
  {
    type: "function" as const,
    function: {
      name: "check_inventory",
      description:
        "Look up live inventory for a product at one or all Pineapple Xpress stores. Use when the user asks if something is in stock or available.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Product name, brand, or SKU to search for",
          },
          store: {
            type: "string",
            description: "Optional store filter, e.g. 'vineland', 'burlington', or a store name",
          },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_order_status",
      description:
        "Look up the status of a customer order. ALWAYS requires the order number PLUS a verification field (email or phone on the order). Never call this with only an order number.",
      parameters: {
        type: "object",
        properties: {
          order_number: {
            type: "string",
            description: "Order number / id as shown on the receipt",
          },
          verify: {
            type: "string",
            description:
              "Email address or phone number associated with the order (for ownership verification)",
          },
        },
        required: ["order_number", "verify"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "list_products",
      description: "List products matching a search query from the live catalog/inventory feed.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Optional search text (brand, name, category)",
          },
          limit: {
            type: "number",
            description: "Max products to return (default 10, max 25)",
          },
        },
      },
    },
  },
];

export type ToolCall = {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
};

type StatusEmitter = (status: string) => void;

export async function runToolCall(
  call: ToolCall,
  opts: { ip: string; onStatus?: StatusEmitter },
): Promise<string> {
  const limited = rateLimit(`tool:${opts.ip}`, 30, 60_000);
  if (!limited.ok) {
    return JSON.stringify({
      error: "Tool rate limit exceeded. Please wait a moment.",
    });
  }

  let args: Record<string, unknown> = {};
  try {
    args = JSON.parse(call.function.arguments || "{}") as Record<string, unknown>;
  } catch {
    return JSON.stringify({ error: "Invalid tool arguments JSON" });
  }

  const provider = getCommerceProvider();
  const name = call.function.name;

  try {
    if (name === "check_inventory") {
      opts.onStatus?.("Checking inventory…");
      const query = String(args["query"] ?? "");
      const store = args["store"] != null ? String(args["store"]) : undefined;
      if (!query.trim()) return JSON.stringify({ error: "query is required" });
      const items = await provider.checkInventory(query, store);
      return JSON.stringify({
        provider: provider.id,
        sample_note: provider.id === "mock" ? "FAKE SAMPLE DATA — not real inventory" : undefined,
        count: items.length,
        items: items.map((i) => ({
          sku: i.sku,
          name: i.name,
          brand: i.brand,
          store: i.storeName ?? i.storeId,
          quantity: i.quantity,
          in_stock: i.inStock,
          // omit price unless present; mock has null
          ...(i.price != null ? { price: i.price } : {}),
        })),
      });
    }

    if (name === "get_order_status") {
      opts.onStatus?.("Looking up order…");
      const orderNumber = String(args["order_number"] ?? "");
      const verify = String(args["verify"] ?? "");
      if (!orderNumber.trim() || !verify.trim()) {
        return JSON.stringify({
          error: "Both order_number and verify (email or phone) are required to look up an order.",
        });
      }
      const status = await provider.getOrderStatus(orderNumber, verify);
      if (!status) {
        return JSON.stringify({
          found: false,
          message:
            "No matching order found for that number and verification. Double-check the order number and the email/phone used at checkout.",
        });
      }
      return JSON.stringify({
        found: true,
        provider: provider.id,
        sample_note: provider.id === "mock" ? "FAKE SAMPLE ORDER — not a real order" : undefined,
        order: status,
      });
    }

    if (name === "list_products") {
      opts.onStatus?.("Listing products…");
      const query = args["query"] != null ? String(args["query"]) : undefined;
      const limit = Math.min(25, Math.max(1, Number(args["limit"] ?? 10)));
      const products = await provider.listProducts(query, limit);
      return JSON.stringify({
        provider: provider.id,
        sample_note: provider.id === "mock" ? "FAKE SAMPLE DATA — not a real catalog" : undefined,
        count: products.length,
        products,
      });
    }

    return JSON.stringify({ error: `Unknown tool: ${name}` });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Tool failed";
    console.error("[tool]", name, message);
    return JSON.stringify({ error: message });
  }
}
