# Store Assistant (Chat + RAG + Live Commerce)

ChatGPT-style UI at `/#/chat` backed by a Hono API that:

1. Retrieves passages from `data/knowledge/` (BM25 over hierarchical Markdown chunks)
2. Runs an OpenAI-compatible **tool-calling** loop for live inventory / orders
3. Streams the final answer (with SSE status events like “Checking inventory…”)

## Local development

```sh
cp .env.example .env

# Terminal A — mock OpenAI (supports tool calls)
npm run mock-llm

# Terminal B — API with mock LLM + mock commerce
LLM_API_KEY=mock \
  LLM_BASE_URL=http://localhost:18990/v1 \
  LLM_MODEL=mock \
  COMMERCE_PROVIDER=mock \
  npm run server

# Terminal C — Vite (proxies /api → :8787)
npm run dev:web
```

Open `http://localhost:5173/#/chat`.

### Test against a local fake Quickvee

```sh
npm run mock-quickvee
# Then start the API with:
QUICKVEE_BASE_URL=http://localhost:18991 \
  QUICKVEE_API_KEY=test \
  COMMERCE_PROVIDER=quickvee \
  LLM_API_KEY=mock LLM_BASE_URL=http://localhost:18990/v1 LLM_MODEL=mock \
  npm run server
```

### Scripts

| Script                  | Purpose                                                 |
| ----------------------- | ------------------------------------------------------- |
| `npm run mock-llm`      | OpenAI-compatible mock with streaming + tool calls      |
| `npm run mock-quickvee` | Fake Quickvee `/inventory` + `/orders`                  |
| `npm run bench-rag`     | Generate ~500KB synthetic MD + time BM25 index/retrieve |
| `npm run test:chat`     | e2e against a running API (RAG + tools)                 |

## Knowledge base

- Put Markdown in `data/knowledge/`. Prefer editing `store-knowledge.md` (template with **TODO** sections Jim should fill).
- Files named `TODO-*.md` are skipped by the indexer until renamed.
- Retrieval: hierarchical heading chunks with size/overlap (`RAG_CHUNK_*`), BM25 index cached in memory and rebuilt when files change, context capped by `RAG_MAX_CONTEXT_CHARS`.
- Embeddings are **off** unless you flip a future `RAG_USE_EMBEDDINGS` flag (not wired yet).
- Synthetic large fixtures: `npm run bench-rag` writes under `data/fixtures/fake/` (gitignored `.md`).

## Live orders & inventory (tools)

The model may call:

| Tool               | Purpose                       | Notes                                                         |
| ------------------ | ----------------------------- | ------------------------------------------------------------- |
| `check_inventory`  | Live stock by product / store |                                                               |
| `get_order_status` | Order lookup                  | **Requires** `order_number` **and** `verify` (email or phone) |
| `list_products`    | Catalog search                | Uses inventory feed until a dedicated products API exists     |

Tools are rate-limited per IP. The UI shows status text while tools run.

### Commerce providers

| Provider       | When                                                                               | Notes                                                                  |
| -------------- | ---------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| **`quickvee`** | Production default when `QUICKVEE_API_KEY` is set, or `COMMERCE_PROVIDER=quickvee` | Real POS. Calls `{QUICKVEE_BASE_URL}/inventory` and `/orders`.         |
| **`mock`**     | Local/dev default when no Quickvee key                                             | Labeled **FAKE SAMPLE** data only (e.g. orders `PX-1001` / `PX-1002`). |

Shopify / Square / Lightspeed stubs were intentionally **not** added — keep the surface area small until needed.

### Quickvee assumptions (adjust when Jim confirms the real schema)

Response shapes are **unknown**. All field mapping lives in clearly commented functions in `server/providers/quickvee.ts`:

- `mapInventoryResponse` — assumes `{ items: [{ sku, name, brand?, store_id, store_name?, quantity\|qty, in_stock?, price? }] }` (or a bare array / `{ data: [...] }`)
- `mapOrderResponse` — assumes `{ order: { order_number\|id, status, customer_email?, customer_phone?, items?, … } }`; verification is done locally against those customer fields; **PII is never returned** to the model

Config:

- `QUICKVEE_BASE_URL` (default `https://quickvee.com`)
- `QUICKVEE_API_KEY`
- `QUICKVEE_MERCHANT_ID` (optional query param)
- `QUICKVEE_AUTH_HEADER` (default `Authorization`)
- `QUICKVEE_AUTH_SCHEME` (`bearer` \| `raw`)
- `QUICKVEE_TIMEOUT_MS` (default 8000)

Local `scripts/mock-quickvee.ts` serves the **assumed** shapes so the provider can be integration-tested without production credentials.

## Deploy notes

- **Static frontend**: `npm run build` → host `dist/` (GitHub Pages, Netlify, etc.). Hash routes (`/#/chat`) need no rewrite.
- **API**: run `server/index.ts` as a Node service, or deploy to Vercel (`api/[[...route]].ts`). Set `LLM_*` and `QUICKVEE_*` in the host env. Never commit secrets.
- Prefer same-origin so `/api/chat` reaches the server (Vite proxy in dev).
