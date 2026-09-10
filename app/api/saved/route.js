// Saved candidates: which candidate is saved to which role, and pipeline stage.
// Scoped to the caller's workspace. Candidate details go back through the same
// verified gate as /api/search — saving a candidate must not become a way for
// an unverified workspace to see contact details search already hid.
import { getSupabaseAdmin, getUserFromRequest, getCallerWorkspace } from "../../../lib/supabaseAdmin";
import { applyVerifiedGate } from "../../../lib/gate";

export const runtime = "nodejs";

async function requireWorkspace(req) {
  const user = await getUserFromRequest(req);
  if (!user) return { error: Response.json({ error: "Unauthorized" }, { status: 401 }) };
  const admin = getSupabaseAdmin();
  const workspace = await getCallerWorkspace(admin, user.id);
  if (!workspace) return { error: Response.json({ error: "No workspace" }, { status: 403 }) };
  return { admin, workspace };
}

async function roleBelongsToWorkspace(admin, roleId, workspaceId) {
  const { data } = await admin.from("roles").select("id").eq("id", roleId).eq("workspace_id", workspaceId).maybeSingle();
  return !!data;
}

export async function GET(req) {
  const ctx = await requireWorkspace(req);
  if (ctx.error) return ctx.error;
  const { data, error } = await ctx.admin
    .from("saved_candidates")
    .select("id, role_id, stage, candidates(id, full_name, email, phone, title, years, current_city, aspiration_cities, cur_salary, exp_salary, status, summary, cv_url, cv_filename)")
    .in("role_id",
      (await ctx.admin.from("roles").select("id").eq("workspace_id", ctx.workspace.id)).data?.map((r) => r.id) || []
    );
  if (error) return Response.json({ error: error.message }, { status: 500 });

  const saved = data.map((row) => ({
    id: row.id,
    roleId: row.role_id,
    stage: row.stage,
    candidate: row.candidates ? applyVerifiedGate(row.candidates, ctx.workspace.is_verified) : null,
  }));
  return Response.json({ saved });
}

export async function POST(req) {
  const ctx = await requireWorkspace(req);
  if (ctx.error) return ctx.error;
  const { candidateId, roleId } = await req.json().catch(() => ({}));
  if (!candidateId || !roleId) return Response.json({ error: "Missing candidateId or roleId" }, { status: 400 });
  if (!(await roleBelongsToWorkspace(ctx.admin, roleId, ctx.workspace.id))) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }
  const { data, error } = await ctx.admin
    .from("saved_candidates")
    .upsert({ role_id: roleId, candidate_id: candidateId }, { onConflict: "role_id,candidate_id" })
    .select()
    .single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ saved: data });
}

export async function DELETE(req) {
  const ctx = await requireWorkspace(req);
  if (ctx.error) return ctx.error;
  const { searchParams } = new URL(req.url);
  const candidateId = searchParams.get("candidateId");
  const roleId = searchParams.get("roleId");
  if (!candidateId || !roleId) return Response.json({ error: "Missing candidateId or roleId" }, { status: 400 });
  if (!(await roleBelongsToWorkspace(ctx.admin, roleId, ctx.workspace.id))) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }
  const { error } = await ctx.admin.from("saved_candidates").delete().eq("role_id", roleId).eq("candidate_id", candidateId);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
