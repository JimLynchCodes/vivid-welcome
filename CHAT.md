# Store Assistant (Chat + RAG)

ChatGPT-style UI at `/#/chat` backed by a small Hono API that retrieves passages from `data/knowledge/` and streams an OpenAI-compatible LLM reply.

## Local development

```sh
cp .env.example .env
# For real LLM:
#   LLM_API_KEY=sk-...
#   LLM_BASE_URL=https://api.openai.com/v1
#   LLM_MODEL=gpt-4o-mini

# Or use the bundled mock (no key needed):
# terminal A
npm run mock-llm
# terminal B
LLM_API_KEY=mock LLM_BASE_URL=http://localhost:18990/v1 LLM_MODEL=mock npm run server
# terminal C
npm run dev:web
```

`npm run dev` starts Vite + the API together (still needs `LLM_*` env vars). Vite proxies `/api` → `http://localhost:8787`.

## Knowledge base

Put Markdown files in `data/knowledge/`. Files named `TODO-*.md` are placeholders — fill them in (hours, contact, policies, products). Until then the assistant is instructed to say it does not know those details.

Retrieval is keyword / TF scoring over chunked Markdown headings (no vector DB).

## Deploy notes

- **Static frontend**: `npm run build` → host `dist/` (GitHub Pages, Netlify, etc.). Hash routes (`/#/chat`) need no rewrite.
- **API**: run `server/index.ts` as a Node service, or deploy to Vercel (see `api/[[...route]].ts`). Set `LLM_API_KEY` / `LLM_BASE_URL` / `LLM_MODEL` in the host env. Never commit secrets.
- Point the frontend at the API by hosting them on the same origin (recommended) or set a reverse proxy so `/api/chat` reaches the server.
