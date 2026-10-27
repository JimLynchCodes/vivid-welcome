import {
  createQuickveeProvider,
  mapInventoryResponse,
  mapOrderResponse,
} from "../server/providers/quickvee.ts";

const provider = createQuickveeProvider();

const inv = await provider.checkInventory("Elf Bar", "vineland");
if (!inv.length || !inv[0]!.name.includes("Elf Bar")) {
  throw new Error("inventory map failed: " + JSON.stringify(inv));
}
console.log(
  "inventory:",
  inv.map((i) => `${i.name}@${i.storeId}:${i.quantity}`).join(", "),
);

const orderOk = await provider.getOrderStatus("QV-9001", "jane@example.com");
if (!orderOk || orderOk.status !== "preparing") {
  throw new Error("order map failed: " + JSON.stringify(orderOk));
}
console.log("order:", orderOk.orderId, orderOk.status);

const orderBad = await provider.getOrderStatus("QV-9001", "wrong@example.com");
if (orderBad !== null) throw new Error("expected verify failure");

const mapped = mapInventoryResponse({ items: [{ sku: "X", name: "Y", quantity: 2 }] });
if (mapped[0]!.sku !== "X" || mapped[0]!.inStock !== true) throw new Error("mapper smoke failed");
const noMatch = mapOrderResponse(
  { order: { order_number: "1", status: "x", customer_email: "a@b.c" } },
  "z@z.z",
);
if (noMatch !== null) throw new Error("expected null verify");

console.log("test-quickvee: OK");
