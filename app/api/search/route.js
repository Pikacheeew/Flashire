// HR semantic search: DeepSeek splits hard/soft criteria, we embed the query,
// run pgvector search with hard filters in SQL, explain the top results, then
// apply the verified gate before anything reaches the caller.
import { getSupabaseAdmin, getUserFromRequest, getCallerWorkspace } from "../../../lib/supabaseAdmin";
import { deepseekChat, deepseekJson, embedText } from "../../../lib/ai";
import { applyVerifiedGate } from "../../../lib/gate";

export const runtime = "nodejs";

function leadTeamRegex(row) {
  return /lead|led|supervis|manager|head|team/i.test(`${row.title || ""} ${row.summary || ""}`);
}

export async function POST(req) {
  const user = await getUserFromRequest(req);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const admin = getSupabaseAdmin();
  const workspace = await getCallerWorkspace(admin, user.id);
  if (!workspace) return Response.json({ error: "No workspace" }, { status: 403 });

  const { query } = await req.json().catch(() => ({}));
  if (!query || !query.trim()) return Response.json({ error: "Missing query" }, { status: 400 });

  let hard, soft;
  try {
    const parsePrompt = `You are a recruiting query parser. Convert the HR search below into JSON with exactly these keys:
"min_years" (number or null), "locations" (array of place-name strings, e.g. ["Riau","Sumatra"], or []), "must_lead_team" (boolean), "soft_criteria" (array of short lowercase keyword phrases describing desired skills/industry/traits).
Return ONLY the JSON object, no prose, no markdown.

HR search: "${query}"`;
    const parsed = await deepseekJson(parsePrompt);
    hard = { min_years: parsed.min_years, locations: parsed.locations || [], must_lead_team: !!parsed.must_lead_team };
    soft = parsed.soft_criteria || [];
  } catch {
    return Response.json({ error: "Couldn't parse that query. Try rephrasing." }, { status: 400 });
  }

  let embedding;
  try {
    embedding = await embedText([query, ...soft].join(" "));
  } catch (e) {
    return Response.json({ error: "Embedding failed", detail: String(e) }, { status: 502 });
  }

  const { data: rows, error: rpcErr } = await admin.rpc("match_candidates", {
    query_embedding: embedding,
    min_years: hard.min_years ?? null,
    locations: hard.locations.length ? hard.locations : null,
    match_count: 40,
  });
  if (rpcErr) return Response.json({ error: rpcErr.message }, { status: 500 });

  let matches = hard.must_lead_team ? rows.filter(leadTeamRegex) : rows;
  matches = matches.slice(0, 20);

  admin.from("usage_events").insert({ workspace_id: workspace.id, kind: "search" }).then(() => {});

  if (!matches.length) return Response.json({ results: [], parsed: { ...hard, soft } });

  try {
    const explainPrompt = `An HR recruiter searched: "${query}".
Here are the shortlisted candidates (already filtered to meet hard constraints), ranked by fit:
${matches.map((c, i) => `${i + 1}. ${c.full_name} — ${c.title}, ${c.years} yrs, ${c.current_city}. ${c.summary}`).join("\n")}

For EACH candidate, write one concise sentence (max 25 words) explaining why they fit or where they fall short against this specific search. Return ONLY a JSON array of strings, in the same order, no markdown.`;
    const reasons = JSON.parse(await deepseekChat(explainPrompt, { json: false }).then((t) => t.replace(/```json|```/g, "").trim()));
    matches.forEach((c, i) => { c.reason = reasons[i] || ""; });
  } catch {
    matches.forEach((c) => { c.reason = ""; });
  }

  const results = matches.map((r) => applyVerifiedGate(r, workspace.is_verified));
  return Response.json({ results, parsed: { ...hard, soft }, verified: workspace.is_verified });
}
