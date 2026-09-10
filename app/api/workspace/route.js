// Bootstraps an HR workspace for a newly-signed-up employer, and returns the
// caller's existing workspace otherwise. Runs with the service role because
// workspace/membership creation has no client-side insert policy (RLS only
// allows members to SELECT their own workspace).
import { getSupabaseAdmin, getUserFromRequest, getCallerWorkspace } from "../../../lib/supabaseAdmin";

export const runtime = "nodejs";

export async function POST(req) {
  const user = await getUserFromRequest(req);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const admin = getSupabaseAdmin();
  const existing = await getCallerWorkspace(admin, user.id);
  if (existing) return Response.json({ workspace: existing });

  const { companyName } = await req.json().catch(() => ({}));
  const { data: workspace, error: wErr } = await admin
    .from("workspaces")
    .insert({ name: companyName || user.email, is_verified: false })
    .select()
    .single();
  if (wErr) return Response.json({ error: wErr.message }, { status: 500 });

  const { error: mErr } = await admin
    .from("memberships")
    .insert({ user_id: user.id, workspace_id: workspace.id, role: "admin" });
  if (mErr) return Response.json({ error: mErr.message }, { status: 500 });

  return Response.json({ workspace });
}

export async function GET(req) {
  const user = await getUserFromRequest(req);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const admin = getSupabaseAdmin();
  const workspace = await getCallerWorkspace(admin, user.id);
  return Response.json({ workspace });
}
