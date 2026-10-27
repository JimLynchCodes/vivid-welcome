/**
 * Local fake Quickvee API for testing the quickvee provider.
 * Serves GET /inventory and GET /orders with the ASSUMED response shapes.
 *
 *   npm run mock-quickvee
 *   QUICKVEE_BASE_URL=http://localhost:18991 QUICKVEE_API_KEY=test COMMERCE_PROVIDER=quickvee npm run server
 */
import { createServer } from "node:http";

const port = Number(process.env["MOCK_QUICKVEE_PORT"] ?? 18991);

const inventory = {
  items: [
    {
      sku: "QV-ELF-5000",
      name: "Elf Bar BC5000",
      brand: "Elf Bar",
      store_id: "vineland",
      store_name: "Pineapple Xpress Vineland",
      quantity: 18,
      in_stock: true,
      price: 19.99,
    },
    {
      sku: "QV-ELF-5000",
      name: "Elf Bar BC5000",
      brand: "Elf Bar",
      store_id: "burlington",
      store_name: "Pineapple Xpress Burlington",
      quantity: 0,
      in_stock: false,
      price: 19.99,
    },
    {
      sku: "QV-LOST-MARY",
      name: "Lost Mary OS5000",
      brand: "Lost Mary",
      store_id: "vineland",
      store_name: "Pineapple Xpress Vineland",
      quantity: 5,
      in_stock: true,
      price: 18.5,
    },
  ],
};

const orders: Record<string, Record<string, unknown>> = {
  "QV-9001": {
    order_number: "QV-9001",
    status: "preparing",
    store_name: "Pineapple Xpress Vineland",
    created_at: "2026-10-27T15:00:00-04:00",
    customer_email: "jane@example.com",
    customer_phone: "5551112222",
    items: [{ name: "Elf Bar BC5000", quantity: 1 }],
    estimated_ready: "5:30pm",
  },
};

createServer(async (req, res) => {
  const auth = req.headers["authorization"] || req.headers["x-api-key"];
  if (!auth) {
    res.writeHead(401, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: "unauthorized" }));
    return;
  }

  const url = new URL(req.url || "/", `http://localhost:${port}`);

  if (req.method === "GET" && url.pathname === "/inventory") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify(inventory));
    return;
  }

  if (req.method === "GET" && url.pathname === "/orders") {
    const id = (url.searchParams.get("order_number") || "").toUpperCase();
    const order = orders[id];
    if (!order) {
      res.writeHead(404, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: "not found" }));
      return;
    }
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ order }));
    return;
  }

  res.writeHead(404, { "content-type": "application/json" });
  res.end(JSON.stringify({ error: "not found" }));
}).listen(port, () => {
  console.log(`Mock Quickvee on http://localhost:${port}`);
});
