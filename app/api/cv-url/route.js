// Short-lived signed URL to preview a candidate's original CV file. Gated the
// same as search: only a verified workspace can reach the original file,
// since it likely contains name/contact the gate otherwise strips.
import { getSupabaseAdmin, getUserFromRequest, getCallerWorkspace } from "../../../lib/supabaseAdmin";

export const runtime = "nodejs";

export async function POST(req) {
  const user = await getUserFromRequest(req);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const admin = getSupabaseAdmin();
  const workspace = await getCallerWorkspace(admin, user.id);
  if (!workspace) return Response.json({ error: "No workspace" }, { status: 403 });
  if (!workspace.is_verified) return Response.json({ error: "Workspace not verified" }, { status: 403 });

  const { candidateId } = await req.json().catch(() => ({}));
  if (!candidateId) return Response.json({ error: "Missing candidateId" }, { status: 400 });

  const { data: candidate } = await admin.from("candidates").select("cv_url").eq("id", candidateId).maybeSingle();
  if (!candidate?.cv_url) return Response.json({ error: "No CV on file" }, { status: 404 });

  const { data, error } = await admin.storage.from("cvs").createSignedUrl(candidate.cv_url, 300);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ url: data.signedUrl });
}
