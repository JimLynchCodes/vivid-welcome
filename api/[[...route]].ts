/**
 * Vercel catch-all for /api/* → Hono app (health + chat).
 * Prefer this over a single api/chat.ts so /api/health also works.
 */
import { handle } from "hono/vercel";
import { app } from "../server/app.js";

export const config = { runtime: "nodejs" };

export default handle(app);
