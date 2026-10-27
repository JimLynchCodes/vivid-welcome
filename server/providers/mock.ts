/**
 * Fake commerce data for local/dev. Clearly labeled — never used as real inventory.
 */
import type { CommerceProvider, InventoryItem, OrderStatus, ProductSummary } from "./types.js";

const FAKE_PRODUCTS: ProductSummary[] = [
  {
    sku: "FAKE-ELF-5000",
    name: "Elf Bar BC5000 (FAKE SAMPLE)",
    brand: "Elf Bar",
    category: "disposable",
  },
  {
    sku: "FAKE-LOST-MARY",
    name: "Lost Mary OS5000 (FAKE SAMPLE)",
    brand: "Lost Mary",
    category: "disposable",
  },
  {
    sku: "FAKE-JUUL-POD",
    name: "JUUL Pods Mint 4pk (FAKE SAMPLE)",
    brand: "JUUL",
    category: "pods",
  },
  {
    sku: "FAKE-GEEKVAPE",
    name: "GeekVape Aegis (FAKE SAMPLE)",
    brand: "GeekVape",
    category: "device",
  },
];

const FAKE_INVENTORY: InventoryItem[] = [
  {
    sku: "FAKE-ELF-5000",
    name: "Elf Bar BC5000 (FAKE SAMPLE)",
    brand: "Elf Bar",
    storeId: "vineland",
    storeName: "Pineapple Xpress Vineland",
    quantity: 24,
    inStock: true,
    price: null,
  },
  {
    sku: "FAKE-ELF-5000",
    name: "Elf Bar BC5000 (FAKE SAMPLE)",
    brand: "Elf Bar",
    storeId: "burlington",
    storeName: "Pineapple Xpress Burlington",
    quantity: 0,
    inStock: false,
    price: null,
  },
  {
    sku: "FAKE-LOST-MARY",
    name: "Lost Mary OS5000 (FAKE SAMPLE)",
    brand: "Lost Mary",
    storeId: "vineland",
    storeName: "Pineapple Xpress Vineland",
    quantity: 8,
    inStock: true,
    price: null,
  },
  {
    sku: "FAKE-JUUL-POD",
    name: "JUUL Pods Mint 4pk (FAKE SAMPLE)",
    brand: "JUUL",
    storeId: "burlington",
    storeName: "Pineapple Xpress Burlington",
    quantity: 12,
    inStock: true,
    price: null,
  },
];

/** orderId -> { verify tokens (email or last4 phone), status } */
const FAKE_ORDERS: Record<string, { verify: string[]; status: OrderStatus }> = {
  "PX-1001": {
    verify: ["test@example.com", "5551234", "1234"],
    status: {
      orderId: "PX-1001",
      status: "out_for_delivery",
      storeName: "Pineapple Xpress Vineland",
      placedAt: "2026-10-27T14:00:00-04:00",
      items: [{ name: "Elf Bar BC5000 (FAKE SAMPLE)", quantity: 2 }],
      estimatedReady: "today 6–7pm",
    },
  },
  "PX-1002": {
    verify: ["buyer@example.com", "5559876", "9876"],
    status: {
      orderId: "PX-1002",
      status: "ready_for_pickup",
      storeName: "Pineapple Xpress Burlington",
      placedAt: "2026-10-27T11:30:00-04:00",
      items: [{ name: "JUUL Pods Mint 4pk (FAKE SAMPLE)", quantity: 1 }],
      estimatedReady: null,
    },
  },
};

function norm(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

export const mockProvider: CommerceProvider = {
  id: "mock",

  async checkInventory(query, store) {
    const q = norm(query);
    const storeQ = store ? norm(store) : "";
    return FAKE_INVENTORY.filter((item) => {
      const hay = norm(`${item.name} ${item.brand ?? ""} ${item.sku}`);
      const matchQ = !q || hay.includes(q) || q.split(/\s+/).some((t) => hay.includes(t));
      const matchStore =
        !storeQ ||
        norm(item.storeId).includes(storeQ) ||
        norm(item.storeName ?? "").includes(storeQ);
      return matchQ && matchStore;
    });
  },

  async getOrderStatus(orderNumber, verify) {
    const key = orderNumber.trim().toUpperCase();
    const row = FAKE_ORDERS[key];
    if (!row) return null;
    const v = norm(verify);
    const ok = row.verify.some((token) => v.includes(norm(token)) || norm(token).includes(v));
    if (!ok) return null;
    // Strip anything that could look like PII — status payload is already clean
    return { ...row.status };
  },

  async listProducts(query, limit = 20) {
    const q = norm(query ?? "");
    return FAKE_PRODUCTS.filter((p) => {
      if (!q) return true;
      return norm(`${p.name} ${p.brand ?? ""} ${p.sku} ${p.category ?? ""}`).includes(q);
    }).slice(0, limit);
  },
};
