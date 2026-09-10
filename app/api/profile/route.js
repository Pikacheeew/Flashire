// Upserts the calling candidate's own profile row (RLS: auth.uid() = user_id).
// Embeds the profile summary for semantic search on every save — cheap and
// only needed once per save (searching doesn't re-embed candidates).
import { getSupabaseAdmin, getUserFromRequest } from "../../../lib/supabaseAdmin";
import { embedText } from "../../../lib/ai";

export const runtime = "nodejs";
const THREE_MONTHS_MS = 90 * 24 * 60 * 60 * 1000;

export async function GET(req) {
  const user = await getUserFromRequest(req);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const admin = getSupabaseAdmin();
  const { data, error } = await admin.from("candidates").select("*").eq("user_id", user.id).maybeSingle();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ profile: data });
}

export async function POST(req) {
  const user = await getUserFromRequest(req);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const admin = getSupabaseAdmin();

  const { data: existing } = await admin
    .from("candidates")
    .select("id, cv_url, cv_changed_at")
    .eq("user_id", user.id)
    .maybeSingle();

  const changingCv = body.cvUrl && body.cvUrl !== existing?.cv_url;
  if (changingCv && existing?.cv_changed_at) {
    const since = Date.now() - new Date(existing.cv_changed_at).getTime();
    if (since < THREE_MONTHS_MS) {
      const next = new Date(new Date(existing.cv_changed_at).getTime() + THREE_MONTHS_MS);
      return Response.json({ error: "cv_locked", nextChangeAt: next.toISOString() }, { status: 409 });
    }
  }

  const embeddingInput = [body.title, body.summary, body.industry, (body.aspirationCities || []).join(" ")]
    .filter(Boolean)
    .join(" ");
  let embedding;
  try {
    embedding = embeddingInput.trim() ? await embedText(embeddingInput) : undefined;
  } catch (e) {
    return Response.json({ error: "Embedding failed", detail: String(e) }, { status: 502 });
  }

  const row = {
    user_id: user.id,
    full_name: body.fullName,
    email: body.email,
    phone: body.phone,
    photo_url: body.photoUrl,
    title: body.title,
    current_city: body.currentCity,
    aspiration_cities: body.aspirationCities || [],
    years: body.years ?? null,
    cur_salary: body.curSalary,
    exp_salary: body.expSalary,
    status: body.status,
    notice_period: body.noticePeriod || null,
    work_pref: body.workPref || [],
    cover_letter: (body.coverLetter || "").slice(0, 2000),
    cv_url: body.cvUrl,
    cv_filename: body.cvFilename,
    summary: body.summary,
    is_published: true,
    updated_at: new Date().toISOString(),
    ...(changingCv ? { cv_changed_at: new Date().toISOString() } : {}),
    ...(embedding ? { embedding } : {}),
  };

  const { data, error } = await admin
    .from("candidates")
    .upsert(row, { onConflict: "user_id" })
    .select()
    .single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ profile: data });
}
