# Flashire

Say it once. Get found. AI-powered candidate matching for Indonesia, backed by
Supabase (auth, Postgres + pgvector, storage) and DeepSeek + OpenAI embeddings.

## What's in here

```
app/
  layout.js               root layout
  page.js                 the whole UI (candidate flow + HR screening)
  api/ai/route.js         DeepSeek passthrough (cover letters, etc.)
  api/workspace/route.js  bootstraps/reads an HR workspace on signup
  api/parse-cv/route.js   CV text extraction + DeepSeek classify/extract
  api/profile/route.js    candidate profile upsert + embedding
  api/search/route.js     HR semantic search + the verified-data gate
  api/roles/route.js      roles CRUD (scoped to the HR workspace)
  api/saved/route.js      saved-candidate CRUD (goes through the same gate)
  api/cv-url/route.js     short-lived signed URL to preview a candidate's CV
  api/verify-turnstile/   Cloudflare Turnstile server-side check
lib/
  supabaseClient.js       browser Supabase client (anon key)
  supabaseAdmin.js        server-only Supabase client (service role) + auth helpers
  ai.js                   DeepSeek chat + OpenAI embedding calls
  gate.js                 the verified-HR data gate
.env.example              copy to .env.local and fill in real values
```

All secrets (DeepSeek key, OpenAI key, Supabase service role key) live only in
`app/api/*` routes on the server — never in the browser.

## Set up Supabase (one-time)

1. Create a Supabase project.
2. SQL Editor → paste and run `../01-database-schema.sql` (in the parent
   handoff folder) — creates tables, the `cvs` storage bucket + policies, RLS,
   and the `match_candidates` vector-search function.
3. Authentication → Providers → enable Email and Google.
4. Project Settings → API → copy the URL, anon key, and service_role key into
   your env vars (below).

## Run it locally

```
npm install
cp .env.example .env.local   # fill in real keys — see .env.example for where each comes from
npm run dev
```

Open http://localhost:3000. Candidate CV parsing (DeepSeek) and embeddings
(OpenAI) need real API keys to work; Turnstile is optional locally (search UI
still full-featured without it, just without the spam check).

## Go live on Vercel

1. Push this folder to a GitHub repo (`.env.local` is gitignored).
2. vercel.com → New Project → import the repo.
3. Settings → Environment Variables → add every var from `.env.example`.
4. In Supabase Auth settings, add your Vercel URL as a redirect URL (needed
   for Google OAuth and email confirmation links).
5. Deploy.

## The verified-HR gate

An HR workspace starts unverified. `/api/search` and `/api/saved` never send
an unverified caller a candidate's name, exact salary, exact city, or contact
info — those fields are stripped server-side (see `lib/gate.js`), not just
hidden in the UI. To verify a workspace for real hiring use, flip
`workspaces.is_verified` to `true` for that row in the Supabase table editor
(there's no self-serve verification UI by design — that's a manual approval
step).

## Cost note

DeepSeek and OpenAI embeddings are both cheap per call. Set spend caps in
both dashboards. Candidate embeddings are computed once per profile save, not
per search — searching 10,000 candidates costs the same as searching 100.
