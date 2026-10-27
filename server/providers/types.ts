export type InventoryItem = {
  sku: string;
  name: string;
  brand?: string;
  storeId: string;
  storeName?: string;
  quantity: number;
  inStock: boolean;
  price?: number | null;
  currency?: string;
};

export type OrderStatus = {
  orderId: string;
  status: string;
  storeName?: string;
  placedAt?: string;
  /** High-level line items only — never customer PII */
  items?: Array<{ name: string; quantity: number }>;
  estimatedReady?: string | null;
};

export type ProductSummary = {
  sku: string;
  name: string;
  brand?: string;
  category?: string;
};

export type CommerceProvider = {
  readonly id: string;
  checkInventory(query: string, store?: string): Promise<InventoryItem[]>;
  getOrderStatus(orderNumber: string, verify: string): Promise<OrderStatus | null>;
  listProducts(query?: string, limit?: number): Promise<ProductSummary[]>;
};
