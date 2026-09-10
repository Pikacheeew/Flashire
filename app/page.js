"use client";
import React, { useState, useEffect } from "react";
import { getSupabaseClient, isSupabaseConfigured } from "../lib/supabaseClient";

function NotConfigured({ onBack }) {
  return (
    <div style={s.center}>
      <div style={{ ...s.card, textAlign: "center" }}>
        <div style={s.errIcon}>⚙️</div>
        <h1 style={s.h1}>Backend not configured</h1>
        <p style={s.sub}>This deploy is missing its Supabase environment variables. Add them in <code>.env.local</code> (or your host's env settings) and reload — see .env.example.</p>
        <button style={s.primary} onClick={onBack}>← Back</button>
      </div>
    </div>
  );
}

/* Attaches the current Supabase session's access token so API routes can
   identify the caller. Throws with a readable message on non-OK responses. */
async function authedFetch(url, options = {}) {
  const supabase = getSupabaseClient();
  const { data: { session } } = await supabase.auth.getSession();
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}),
      ...(options.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error || "Request failed"), { data, status: res.status });
  return data;
}

/* Salary range options (IDR juta/month) — ranges, not single numbers */
const SALARY_BANDS = ["< 5", "5–10", "10–15", "15–20", "20–30", "30–50", "50–75", "75–100", "100+"];
const NOTICE_OPTS = ["1 month", "2 months", "3 months"];
const STATUS_OPTS = [
  { key: "asap", label: "Join ASAP", hint: "Available immediately" },
  { key: "notice", label: "In month notice", hint: "Serving notice at current job" },
  { key: "exploring", label: "Exploring opportunities", hint: "Open, but not in a hurry" },
];
const WORK_OPTS = [
  { key: "onsite", label: "On-site", hint: "Work from the office/field" },
  { key: "hybrid", label: "Hybrid", hint: "Mix of office and remote" },
  { key: "remote", label: "Remote", hint: "Work from anywhere" },
  { key: "anywhere", label: "Open to relocate", hint: "Willing to move for the right role" },
];

/* Location data — TWO tiers with roll-up:
   - kind "city": the backbone (all ~500 cities/regencies in production)
   - kind "hub": ~100 curated high-density work hubs/districts, each with a
     `parent` city it rolls up to, so an HR search for the parent still
     matches a candidate who picked the hub.
   SAMPLE below shows the shape and behavior. In production, load the full
   ~500 cities + ~100 curated hubs (with parents + aliases) from the DB. */
const LOCATIONS = [
  // ===== Greater Jakarta — hubs roll up to their parent city =====
  { name: "Jakarta Pusat", kind: "city", province: "DKI Jakarta", aliases: ["central jakarta", "jakpus"] },
  { name: "Jakarta Selatan", kind: "city", province: "DKI Jakarta", aliases: ["south jakarta", "jaksel"] },
  { name: "Jakarta Barat", kind: "city", province: "DKI Jakarta", aliases: ["west jakarta", "jakbar"] },
  { name: "Jakarta Timur", kind: "city", province: "DKI Jakarta", aliases: ["east jakarta", "jaktim"] },
  { name: "Jakarta Utara", kind: "city", province: "DKI Jakarta", aliases: ["north jakarta", "jakut"] },
  { name: "SCBD", kind: "hub", parent: "Jakarta Selatan", aliases: ["sudirman", "senayan"] },
  { name: "Kemang", kind: "hub", parent: "Jakarta Selatan", aliases: [] },
  { name: "Blok M", kind: "hub", parent: "Jakarta Selatan", aliases: [] },
  { name: "Jagakarsa", kind: "hub", parent: "Jakarta Selatan", aliases: [] },
  { name: "Cilandak", kind: "hub", parent: "Jakarta Selatan", aliases: ["tb simatupang"] },
  { name: "PIK", kind: "hub", parent: "Jakarta Utara", aliases: ["pantai indah kapuk"] },
  { name: "Kelapa Gading", kind: "hub", parent: "Jakarta Utara", aliases: ["gading"] },
  { name: "Sunter", kind: "hub", parent: "Jakarta Utara", aliases: [] },
  { name: "Kebon Jeruk", kind: "hub", parent: "Jakarta Barat", aliases: ["puri"] },
  { name: "Sudirman-Thamrin", kind: "hub", parent: "Jakarta Pusat", aliases: ["thamrin", "menteng"] },
  // ===== Bodetabek =====
  { name: "Bogor", kind: "city", province: "Jawa Barat", aliases: ["sentul"] },
  { name: "Depok", kind: "city", province: "Jawa Barat", aliases: ["margonda"] },
  { name: "Bekasi", kind: "city", province: "Jawa Barat", aliases: [] },
  { name: "Cikarang", kind: "hub", parent: "Bekasi", aliases: ["jababeka", "mm2100"] },
  { name: "Tangerang", kind: "city", province: "Banten", aliases: ["alam sutera"] },
  { name: "Tangerang Selatan", kind: "city", province: "Banten", aliases: ["tangsel"] },
  { name: "BSD City", kind: "hub", parent: "Tangerang Selatan", aliases: ["bsd", "serpong"] },
  { name: "Gading Serpong", kind: "hub", parent: "Tangerang", aliases: ["summarecon serpong"] },
  { name: "Bintaro", kind: "hub", parent: "Tangerang Selatan", aliases: [] },
  // ===== Rest of West Java =====
  { name: "Bandung", kind: "city", province: "Jawa Barat", aliases: ["dago", "bdg"] },
  { name: "Cimahi", kind: "city", province: "Jawa Barat", aliases: [] },
  { name: "Cirebon", kind: "city", province: "Jawa Barat", aliases: [] },
  // ===== Central & East Java =====
  { name: "Semarang", kind: "city", province: "Jawa Tengah", aliases: [] },
  { name: "Yogyakarta", kind: "city", province: "DIY", aliases: ["jogja", "yogya"] },
  { name: "Solo", kind: "city", province: "Jawa Tengah", aliases: ["surakarta"] },
  { name: "Surabaya", kind: "city", province: "Jawa Timur", aliases: ["sby"] },
  { name: "Malang", kind: "city", province: "Jawa Timur", aliases: [] },
  { name: "Sidoarjo", kind: "city", province: "Jawa Timur", aliases: [] },
  // ===== Sumatra =====
  { name: "Medan", kind: "city", province: "Sumatera Utara", aliases: [] },
  { name: "Pekanbaru", kind: "city", province: "Riau", aliases: [] },
  { name: "Padang", kind: "city", province: "Sumatera Barat", aliases: [] },
  { name: "Palembang", kind: "city", province: "Sumatera Selatan", aliases: [] },
  { name: "Batam", kind: "city", province: "Kepulauan Riau", aliases: [] },
  { name: "Jambi", kind: "city", province: "Jambi", aliases: [] },
  { name: "Bandar Lampung", kind: "city", province: "Lampung", aliases: ["lampung"] },
  // ===== Bali, Sulawesi, Kalimantan =====
  { name: "Denpasar", kind: "city", province: "Bali", aliases: ["bali"] },
  { name: "Canggu", kind: "hub", parent: "Denpasar", aliases: ["seminyak", "kuta"] },
  { name: "Makassar", kind: "city", province: "Sulawesi Selatan", aliases: [] },
  { name: "Manado", kind: "city", province: "Sulawesi Utara", aliases: [] },
  { name: "Balikpapan", kind: "city", province: "Kalimantan Timur", aliases: [] },
  { name: "Samarinda", kind: "city", province: "Kalimantan Timur", aliases: [] },
  { name: "Pontianak", kind: "city", province: "Kalimantan Barat", aliases: [] },
  { name: "Banjarmasin", kind: "city", province: "Kalimantan Selatan", aliases: [] },
];

/* Display + stored value for a location: hubs show "Hub, Parent", cities show "City, Province". */
function locLabel(l) {
  return l.kind === "hub" ? `${l.name}, ${l.parent}` : `${l.name}, ${l.province}`;
}

/* HR side: a ready pool of candidates to search (demo data). */
const HR_POOL = [
  { id: 1, name: "Rian Pratama", title: "Regional Sales Manager", level: "Manager", years: 8, city: "Pekanbaru, Riau", region: "Sumatra", industry: "Palm oil inputs", salary: "28", email: "rian.p@email.com", status: "Open to opportunities", summary: "Leads a 10-person field team selling agri-inputs to smallholder plantations. Owns quota, distributor relationships, and pricing.", score: 86 },
  { id: 2, name: "Sari Wijaya", title: "Key Account Manager", level: "Senior / Supervisor", years: 5, city: "Medan, North Sumatra", region: "Sumatra", industry: "FMCG distribution", salary: "14", email: "sari.w@email.com", status: "Casual — open to a chat", summary: "Five years on key retail accounts for a consumer-goods distributor. Strong CRM discipline, territory planning, trade-promo negotiation.", score: 81 },
  { id: 3, name: "Clara Simanjuntak", title: "Account Executive", level: "Senior / Supervisor", years: 6, city: "Jakarta", region: "Jakarta", industry: "Fintech / payments", salary: "17", email: "clara.s@email.com", status: "On notice period", summary: "Six years selling payment and POS solutions to SMEs and mid-market merchants. Full-cycle closing, consultative style.", score: 78 },
  { id: 4, name: "Maya Kusuma", title: "Inside Sales Lead", level: "Senior / Supervisor", years: 4, city: "Bandung, West Java", region: "Java", industry: "SaaS / B2B software", salary: "15", email: "maya.k@email.com", status: "Open to opportunities", summary: "Four years B2B software inside sales, last year leading a 3-person SDR pod. Strong demo-to-close and pipeline analytics.", score: 75 },
  { id: 5, name: "Bayu Firmansyah", title: "Sales Engineer", level: "Senior / Supervisor", years: 6, city: "Balikpapan, East Kalimantan", region: "Kalimantan", industry: "Industrial / heavy equipment", salary: "16", email: "bayu.f@email.com", status: "Still working, not looking", summary: "Six years in technical B2B sales of heavy equipment to mining and plantation clients. Solution selling, tender management.", score: 73 },
  { id: 6, name: "Lina Kartika", title: "Regional Head of Sales", level: "Senior Manager / Head", years: 11, city: "Medan, North Sumatra", region: "Sumatra", industry: "Telco / distribution", salary: "42", email: "lina.k@email.com", status: "Open to opportunities", summary: "Eleven years in telco distribution, now running Sumatra region sales through 4 area managers. Deep channel and distributor management.", score: 70 },
];

function CandidateJourney({ onExitToEntry }) {
  const [screen, setScreen] = useState("loading"); // loading | auth | intake | parsing | dashboard
  const [authMode, setAuthMode] = useState("signup");
  const [user, setUser] = useState(null);
  const [form, setForm] = useState({
    curSalary: "", expSalary: "", notice: "", status: "", cvName: "", cvFile: null, work: [],
    currentCity: "", aspirations: [],
  });
  const [profile, setProfile] = useState(null); // parsed + confirmed data
  const [parseError, setParseError] = useState(null);
  const [toast, setToast] = useState("");
  const flash = (m) => { setToast(m); setTimeout(() => setToast(""), 2400); };

  function hydrateFromServer(row) {
    setForm((f) => ({
      ...f,
      curSalary: row.cur_salary || "", expSalary: row.exp_salary || "",
      notice: row.notice_period || "", status: row.status || "",
      cvName: row.cv_filename || "", work: row.work_pref || [],
      currentCity: row.current_city || "", aspirations: row.aspiration_cities || [],
    }));
    setProfile({
      name: row.full_name || "", phone: row.phone || "", email: row.email || "",
      title: row.title || "", city: row.current_city || "", years: row.years != null ? String(row.years) : "",
      summary: row.summary || "", cover: row.cover_letter || "", photo: null, photoPath: row.photo_url || null,
      cvFile: row.cv_filename, cvUrl: row.cv_url, cvChangedAt: row.cv_changed_at,
      confidence: {},
    });
  }

  async function afterAuth() {
    if (!isSupabaseConfigured()) { setScreen("notconfigured"); return; }
    const supabase = getSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setScreen("auth"); return; }
    setUser(session.user);
    try {
      const { profile: existing } = await authedFetch("/api/profile");
      if (existing) { hydrateFromServer(existing); setScreen("dashboard"); return; }
    } catch { /* fall through to intake */ }
    setScreen("intake");
  }

  useEffect(() => { afterAuth(); }, []);

  const onAuthDone = async () => {
    const supabase = getSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { flash("Check your email to confirm your account, then log in."); setAuthMode("login"); return; }
    await afterAuth();
  };

  const startParse = async (turnstileToken) => {
    setParseError(null);
    setScreen("parsing");
    try {
      if (process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY) {
        const v = await authedFetch("/api/verify-turnstile", { method: "POST", body: JSON.stringify({ token: turnstileToken }) });
        if (!v.ok) { flash("Verification check failed — please try again."); setScreen("intake"); return; }
      }
      const supabase = getSupabaseClient();
      const path = `${user.id}/${Date.now()}-${form.cvFile.name}`;
      const { error: upErr } = await supabase.storage.from("cvs").upload(path, form.cvFile, { upsert: true });
      if (upErr) throw upErr;

      const parsed = await authedFetch("/api/parse-cv", { method: "POST", body: JSON.stringify({ path }) });
      if (parsed.error === "wrong" || parsed.error === "lowquality") {
        setParseError({ type: parsed.error, file: form.cvFile.name });
        setScreen("parseError");
        return;
      }
      const f = parsed.fields || {};
      setProfile({
        name: f.full_name || "", phone: f.phone || "", email: f.email || user.email || "",
        title: f.title || "", city: f.city || "", years: f.years != null ? String(f.years) : "",
        summary: f.summary || "", cover: "", photo: null,
        cvFile: form.cvFile.name, cvUrl: path, cvChangedAt: null,
        confidence: {},
      });
      setScreen("dashboard");
    } catch (e) {
      flash(e.message || "Something went wrong reading your CV.");
      setScreen("intake");
    }
  };

  return (
    <div style={s.root}>
      <style>{CSS}</style>
      {screen === "loading" && <Parsing />}
      {screen === "notconfigured" && <NotConfigured onBack={onExitToEntry} />}
      {screen === "auth" && <Auth mode={authMode} setMode={setAuthMode} onBack={onExitToEntry} onDone={onAuthDone} />}
      {screen === "intake" && <Intake form={form} setForm={setForm} onBack={() => setScreen("auth")} onSubmit={startParse} flash={flash} />}
      {screen === "parsing" && <Parsing />}
      {screen === "parseError" && <ParseError error={parseError} onRetry={() => setScreen("intake")} />}
      {screen === "dashboard" && <Dashboard form={form} setForm={setForm} profile={profile} setProfile={setProfile} onLogout={async () => { await getSupabaseClient().auth.signOut(); onExitToEntry(); }} onBack={() => setScreen("intake")} flash={flash} />}
      {toast && <div style={s.toast}>{toast}</div>}
    </div>
  );
}

/* ---------- AUTH ---------- */
/* ---------- LANDING ---------- */
/* ================= HR SIDE — auth → screening workspace ================= */
function HrSide({ onExit, initialMode = "signup" }) {
  const [hrScreen, setHrScreen] = useState("loading"); // loading | auth | app
  const [mode, setMode] = useState(initialMode); // signup | login
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [workspace, setWorkspace] = useState(null);
  const [toast, setToast] = useState("");
  const flash = (m) => { setToast(m); setTimeout(() => setToast(""), 2400); };

  async function loadWorkspace() {
    try {
      const { workspace: ws } = await authedFetch("/api/workspace");
      if (ws) { setWorkspace(ws); setHrScreen("app"); return true; }
    } catch { /* not signed in */ }
    return false;
  }

  useEffect(() => {
    if (!isSupabaseConfigured()) { setHrScreen("notconfigured"); return; }
    getSupabaseClient().auth.getSession().then(async ({ data: { session } }) => {
      if (session && (await loadWorkspace())) return;
      setHrScreen("auth");
    });
  }, []);

  const submit = async () => {
    setErr("");
    if (!email || !password) return setErr("Enter your work email and password.");
    setBusy(true);
    const supabase = getSupabaseClient();
    const { data, error } =
      mode === "signup"
        ? await supabase.auth.signUp({ email, password })
        : await supabase.auth.signInWithPassword({ email, password });
    if (error) { setBusy(false); return setErr(error.message); }
    if (!data.session) { setBusy(false); setErr("Check your email to confirm your account, then log in."); return; }
    try {
      const { workspace: ws } = await authedFetch("/api/workspace", { method: "POST", body: JSON.stringify({ companyName: company }) });
      setWorkspace(ws);
      setHrScreen("app");
    } catch (e) {
      setErr(e.message || "Couldn't set up your workspace.");
    }
    setBusy(false);
  };

  const google = async () => {
    await getSupabaseClient().auth.signInWithOAuth({ provider: "google", options: { redirectTo: window.location.href } });
  };

  const exit = async () => {
    await getSupabaseClient().auth.signOut();
    onExit();
  };

  return (
    <div style={s.root}>
      <style>{CSS}</style>
      {hrScreen === "loading" && <Parsing />}
      {hrScreen === "notconfigured" && <NotConfigured onBack={onExit} />}
      {hrScreen === "auth" && (
        <div style={s.center}>
          <div style={s.card}>
            <button style={{ ...s.back, marginBottom: 16 }} onClick={onExit}>← Back</button>
            <div style={{ ...s.brand, marginBottom: 18 }}>Flashire<span style={{ color: "#5DCAA5" }}> · for employers</span></div>
            <h1 style={s.h1}>{mode === "signup" ? "Create employer account 🔍" : "Employer log in"}</h1>
            <p style={s.sub}>{mode === "signup" ? "Sign up and start searching a ready pool of candidates." : "Log in to your hiring workspace."}</p>
            <button style={s.googleBtn} onClick={google}>
              <span style={s.gIcon} aria-hidden="true">G</span>
              Continue with Google
            </button>
            <div style={s.orRow}><span style={s.orLine} /><span style={s.orText}>or</span><span style={s.orLine} /></div>
            {err && <div style={s.errNote}>{err}</div>}
            <Field label="Work email"><input style={s.inp} type="email" placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
            {mode === "signup" && <Field label="Company"><input style={s.inp} placeholder="Company name" value={company} onChange={(e) => setCompany(e.target.value)} /></Field>}
            <Field label="Password"><input style={s.inp} type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} /></Field>
            <button style={s.primary} onClick={submit} disabled={busy}>{busy ? "Please wait…" : mode === "signup" ? "Create account" : "Log in"}</button>
            <p style={s.note}>
              {mode === "signup"
                ? <>Candidate names, salary, and contact stay locked until your team is verified.<br /><a style={s.link} onClick={() => setMode("login")}>Already have an account? Log in</a></>
                : <a style={s.link} onClick={() => setMode("signup")}>New here? Create an account</a>}
            </p>
          </div>
        </div>
      )}
      {hrScreen === "app" && (
        <div>
          <div style={s.dashHead}>
            <div style={s.brand}>Flashire<span style={{ color: "#5DCAA5" }}>.</span></div>
            <button style={s.logout} onClick={exit}>Exit</button>
          </div>
          <HrScreening verified={!!workspace?.is_verified} />
        </div>
      )}
      {toast && <div style={s.toast}>{toast}</div>}
    </div>
  );
}

/* ================= ROOT APP — two-column landing ================= */
export default function App() {
  const [route, setRoute] = useState("landing"); // landing | candidate | hr
  const [hrMode, setHrMode] = useState("signup");

  if (route === "candidate") return <CandidateSide onExit={() => setRoute("landing")} />;
  if (route === "hr") return <HrSide onExit={() => setRoute("landing")} initialMode={hrMode} />;

  return (
    <div style={s.root}>
      <style>{CSS}</style>
      <div style={s.landWrap}>
      <div style={s.landNav}>
        <div style={s.brand}>Flashire<span style={{ color: "#5DCAA5" }}>.</span></div>
        <div style={{ display: "flex", gap: 8 }}>
          <button style={s.landLogin} onClick={() => setRoute("candidate")}>Log in</button>
          <button style={s.landEmployer} onClick={() => { setHrMode("signup"); setRoute("hr"); }}>For employers →</button>
        </div>
      </div>

      <div className="rsh-two">
        {/* LEFT — candidate hero */}
        <div className="rsh-two-left">
          <div style={s.landPill}>For job seekers in Indonesia</div>
          <h1 style={s.landH1} className="rsh-land-h1">Say it once.<br /><span style={{ color: "#0F6E56" }}>Get found.</span></h1>
          <p style={s.landSub}>Drop your CV, add a few details, done. No hundred-field forms. Flashire reads your CV and puts you in front of hiring teams looking for exactly you.</p>
          <div style={s.landBtns}>
            <button style={s.landCta} onClick={() => setRoute("candidate")}>Share your CV — it's free</button>
            <button style={s.landGhost} onClick={() => setRoute("candidate")}>I already have a profile</button>
          </div>
          <div style={s.landNote}>Takes about a minute · One submission is all it takes</div>

          <div style={s.landSteps} className="rsh-land-steps">
            {[
              { n: "1", t: "Upload your CV", d: "PDF or DOCX. We read it for you." },
              { n: "2", t: "Add a few details", d: "Salary, location, availability — quick picks." },
              { n: "3", t: "Get discovered", d: "Hiring teams find you when you fit." },
            ].map((st) => (
              <div key={st.n} style={s.landStep}>
                <div style={s.landStepNum}>{st.n}</div>
                <div style={s.landStepTitle}>{st.t}</div>
                <div style={s.landStepDesc}>{st.d}</div>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT — employer panel */}
        <div className="rsh-two-right">
          <div style={s.empInner}>
            <div style={s.empTag}>For employers</div>
            <h2 style={s.empH}>Find candidates fast</h2>
            <p style={s.empP}>Search a ready pool in plain language. Full context — salary, availability, working preference — on every candidate. Save, shortlist, and reach out.</p>
            <button style={s.empCta} onClick={() => { setHrMode("signup"); setRoute("hr"); }}>Start hiring</button>
            <button style={s.empLogin} onClick={() => { setHrMode("login"); setRoute("hr"); }}>Employer log in</button>
          </div>
        </div>
      </div>

      <div style={s.entryFoot}>Flashire · Say it once. Done.</div>
      </div>
    </div>
  );
}

/* Candidate side: straight into the journey (signup → intake → profile).
   The landing's left column already served as the candidate pitch. */
function CandidateSide({ onExit }) {
  return <CandidateJourney onExitToEntry={onExit} />;
}

/* ---------- CANDIDATE MARKETING LANDING ---------- */
function CandidateLanding({ onStart, onLogin, onBack }) {
  return (
    <div style={s.land}>
      <div style={s.landNav}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button style={s.back} onClick={onBack}>← Back</button>
          <div style={s.brand}>Flashire<span style={{ color: "#5DCAA5" }}>.</span></div>
        </div>
        <button style={s.landLogin} onClick={onLogin}>Log in</button>
      </div>

      <div style={s.landHero}>
        <div style={s.landPill}>For job seekers in Indonesia</div>
        <h1 style={s.landH1} className="rsh-land-h1">Say it once.<br /><span style={{ color: "#0F6E56" }}>Get found.</span></h1>
        <p style={s.landSub}>Drop your CV, add a few details, done. No hundred-field forms. Flashire reads your CV and puts you in front of hiring teams looking for exactly you.</p>
        <div style={s.landBtns}>
          <button style={s.landCta} onClick={onStart}>Share your CV — it's free</button>
          <button style={s.landGhost} onClick={onLogin}>I already have a profile</button>
        </div>
        <div style={s.landNote}>Takes about a minute · One submission is all it takes</div>
      </div>

      <div style={s.landSteps} className="rsh-land-steps">
        {[
          { n: "1", t: "Upload your CV", d: "PDF or DOCX. We read it for you." },
          { n: "2", t: "Add a few details", d: "Salary, location, availability — quick picks." },
          { n: "3", t: "Get discovered", d: "Hiring teams find you when you fit." },
        ].map((st) => (
          <div key={st.n} style={s.landStep}>
            <div style={s.landStepNum}>{st.n}</div>
            <div style={s.landStepTitle}>{st.t}</div>
            <div style={s.landStepDesc}>{st.d}</div>
          </div>
        ))}
      </div>

      <div style={s.landFoot}>Flashire · Say it once. Done.</div>
    </div>
  );
}

/* ---------- AUTH ---------- */
function Auth({ mode, setMode, onBack, onDone }) {
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const submit = async () => {
    setErr("");
    if (!email || !password) return setErr("Enter your email and password.");
    setBusy(true);
    const supabase = getSupabaseClient();
    const { data, error } =
      mode === "signup"
        ? await supabase.auth.signUp({ email, password, options: { data: { full_name: fullName } } })
        : await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) return setErr(error.message);
    onDone(data.user);
  };

  const google = async () => {
    const supabase = getSupabaseClient();
    await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: window.location.href } });
  };

  return (
    <div style={s.center}>
      <div style={s.card}>
        <button style={{ ...s.back, marginBottom: 16 }} onClick={onBack}>← Back</button>
        <div style={{ ...s.brand, marginBottom: 18 }}>Flashire<span style={{ color: "#5DCAA5" }}>.</span></div>
        <h1 style={s.h1}>{mode === "signup" ? "Create your account" : "Welcome back"}</h1>
        <p style={s.sub}>{mode === "signup" ? "Share your CV once and get found by hiring teams." : "Log in to your profile."}</p>

        <button style={s.googleBtn} onClick={google}>
          <span style={s.gIcon} aria-hidden="true">G</span>
          Continue with Google
        </button>

        <div style={s.orRow}><span style={s.orLine} /><span style={s.orText}>or</span><span style={s.orLine} /></div>

        {err && <div style={s.errNote}>{err}</div>}
        <Field label="Email"><input style={s.inp} type="email" placeholder="you@email.com" value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
        {mode === "signup" && <Field label="Full name"><input style={s.inp} placeholder="Your name" value={fullName} onChange={(e) => setFullName(e.target.value)} /></Field>}
        <Field label="Password"><input style={s.inp} type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} /></Field>
        <button style={s.primary} onClick={submit} disabled={busy}>{busy ? "Please wait…" : mode === "signup" ? "Create account" : "Log in"}</button>
        <p style={s.note}>
          {mode === "signup"
            ? <>Already have an account? <a style={s.link} onClick={() => setMode("login")}>Log in</a></>
            : <>New here? <a style={s.link} onClick={() => setMode("signup")}>Create account</a></>}
        </p>
      </div>
    </div>
  );
}

/* ---------- INTAKE (mandatory) ---------- */
function Intake({ form, setForm, onBack, onSubmit, flash }) {
  const [errField, setErrField] = useState("");
  const [turnstileToken, setTurnstileToken] = useState(null);
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  useEffect(() => {
    if (!siteKey || document.querySelector('script[src*="turnstile"]')) return;
    window.onTurnstileToken = (token) => setTurnstileToken(token);
    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js";
    script.async = true;
    document.body.appendChild(script);
  }, [siteKey]);

  const set = (k, v) => { setForm({ ...form, [k]: v }); if (errField === k) setErrField(""); };
  const addAspiration = (city) => {
    if (form.aspirations.includes(city) || form.aspirations.length >= 3) return;
    setForm({ ...form, aspirations: [...form.aspirations, city] });
    if (errField === "aspirations") setErrField("");
  };
  const removeAspiration = (city) => setForm({ ...form, aspirations: form.aspirations.filter((c) => c !== city) });
  const toggleWork = (key) => {
    const cur = form.work;
    setForm({ ...form, work: cur.includes(key) ? cur.filter((k) => k !== key) : [...cur, key] });
    if (errField === "work") setErrField("");
  };

  const scrollToErr = (field, msg) => {
    setErrField(field);
    flash(msg);
    setTimeout(() => { document.getElementById("f-" + field)?.scrollIntoView({ behavior: "smooth", block: "center" }); }, 50);
  };
  const submit = () => {
    if (!form.cvFile) return scrollToErr("cvName", "Please upload your CV.");
    if (!form.curSalary) return scrollToErr("curSalary", "Select your current salary range.");
    if (!form.expSalary) return scrollToErr("expSalary", "Select your expected salary range.");
    if (!form.status) return scrollToErr("status", "Select your current status.");
    if (form.status !== "asap" && !form.notice) return scrollToErr("notice", "Select your notice period.");
    if (!form.work.length) return scrollToErr("work", "Select at least one working arrangement.");
    if (!form.currentCity) return scrollToErr("currentCity", "Select your current location.");
    if (!form.aspirations.length) return scrollToErr("aspirations", "Add at least one aspiration city.");
    if (siteKey && !turnstileToken) return flash("Please complete the verification check below.");
    onSubmit(turnstileToken);
  };
  return (
    <div style={s.center}>
      <div style={{ ...s.card, maxWidth: 460 }}>
        <div style={s.intakeTop}>
          <button style={s.back} onClick={onBack}>← Back</button>
          <div style={s.stepTag}>Step 1 of 2</div>
        </div>
        <h1 style={s.h1}>Tell us about you</h1>
        <p style={s.sub}>All fields required. This is the only time you'll fill this in.</p>

        <Field label="Upload CV (PDF or DOCX)" req id="cvName" error={errField === "cvName"}>
          <label style={{ ...s.drop, ...(form.cvName ? s.dropDone : {}), ...(errField === "cvName" ? s.dropErr : {}) }}>
            {form.cvName ? "✓ " + form.cvName : "Tap to upload your CV"}
            <input type="file" accept=".pdf,.doc,.docx" style={{ display: "none" }} onChange={(e) => {
              const file = e.target.files[0];
              if (file) setForm({ ...form, cvName: file.name, cvFile: file });
            }} />
          </label>
        </Field>

        <div style={s.two}>
          <Field label="Current salary (IDR jt/mo)" req id="curSalary" error={errField === "curSalary"}>
            <select className="rsh-select" style={{ ...s.inp, ...(errField === "curSalary" ? s.inpErr : {}) }} value={form.curSalary} onChange={(e) => set("curSalary", e.target.value)}>
              <option value="">Select range</option>{SALARY_BANDS.map((b) => <option key={b}>{b}</option>)}
            </select>
          </Field>
          <Field label="Expected salary (IDR jt/mo)" req id="expSalary" error={errField === "expSalary"}>
            <select className="rsh-select" style={{ ...s.inp, ...(errField === "expSalary" ? s.inpErr : {}) }} value={form.expSalary} onChange={(e) => set("expSalary", e.target.value)}>
              <option value="">Select range</option>{SALARY_BANDS.map((b) => <option key={b}>{b}</option>)}
            </select>
          </Field>
        </div>
        {form.curSalary && form.expSalary && SALARY_BANDS.indexOf(form.expSalary) <= SALARY_BANDS.indexOf(form.curSalary) && (
          <div style={s.salaryNotice}>
            {form.expSalary === form.curSalary
              ? "Heads up — your expected salary is the same as your current. Sure that's right? Most people aim a little higher."
              : "Heads up — your expected salary is lower than your current. Is that intentional? You can change it above if not."}
          </div>
        )}

        <Field label="Current status" req id="status" error={errField === "status"}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {STATUS_OPTS.map((o) => (
              <button key={o.key} style={{ ...s.statusBtn, ...(form.status === o.key ? s.statusOn : {}) }} onClick={() => { setForm({ ...form, status: o.key, notice: o.key === "asap" ? "" : form.notice }); if (errField === "status") setErrField(""); }}>
                <span style={{ fontWeight: 600 }}>{o.label}</span>
                <span style={s.statusHint}>{o.hint}</span>
              </button>
            ))}
          </div>
        </Field>

        {form.status && form.status !== "asap" && (
          <Field label="Notice period" req id="notice" error={errField === "notice"}>
            <div style={s.chips}>
              {NOTICE_OPTS.map((n) => (
                <button key={n} style={{ ...s.chip, ...(form.notice === n ? s.chipOn : {}) }} onClick={() => set("notice", n)}>{n}</button>
              ))}
            </div>
          </Field>
        )}

        <Field label="Working arrangement (select all that apply)" req id="work" error={errField === "work"}>
          <div style={s.workGrid}>
            {WORK_OPTS.map((o) => (
              <button key={o.key} style={{ ...s.workBtn, ...(form.work.includes(o.key) ? s.workOn : {}) }} onClick={() => toggleWork(o.key)}>
                <span style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <span style={{ ...s.checkBox, ...(form.work.includes(o.key) ? s.checkBoxOn : {}) }}>{form.work.includes(o.key) ? "✓" : ""}</span>
                  <span style={{ fontWeight: 600, fontSize: 13.5 }}>{o.label}</span>
                </span>
                <span style={s.statusHint}>{o.hint}</span>
              </button>
            ))}
          </div>
        </Field>

        <Field label="Current location" req id="currentCity" error={errField === "currentCity"}>
          <CityPicker value={form.currentCity} onSelect={(c) => set("currentCity", c)} placeholder="Type your city…" />
        </Field>

        <Field label="Aspiration cities (up to 3)" req id="aspirations" error={errField === "aspirations"}>
          {form.aspirations.length > 0 && (
            <div style={s.tagWrap}>
              {form.aspirations.map((c) => (
                <span key={c} style={s.cityTag}>{c}<button style={s.tagX} onClick={() => removeAspiration(c)}>×</button></span>
              ))}
            </div>
          )}
          {form.aspirations.length < 3
            ? <CityPicker value="" onSelect={addAspiration} placeholder={form.aspirations.length ? "Add another city…" : "Where would you like to work?"} exclude={form.aspirations} clearOnSelect />
            : <div style={s.hintText}>Maximum of 3 cities reached.</div>}
        </Field>

        {siteKey && <div className="cf-turnstile" data-sitekey={siteKey} data-callback="onTurnstileToken" style={{ margin: "12px 0" }} />}
        <button style={s.primary} onClick={submit}>Submit & continue</button>
      </div>
    </div>
  );
}

/* ---------- PARSING ---------- */
function Parsing() {
  return (
    <div style={s.center}>
      <div style={{ textAlign: "center" }}>
        <div style={s.spinner} />
        <h2 style={{ fontSize: 20, margin: "20px 0 6px" }}>Reading your CV…</h2>
        <p style={s.sub}>We're pulling out your details so you don't have to type them.</p>
      </div>
    </div>
  );
}

/* ---------- PARSE ERROR (wrong or bad document) ---------- */
function ParseError({ error, onRetry }) {
  const wrong = error?.type === "wrong";
  return (
    <div style={s.center}>
      <div style={{ ...s.card, maxWidth: 420, textAlign: "center" }}>
        <div style={s.errIcon}>{wrong ? "📄" : "⚠"}</div>
        <h1 style={s.h1}>{wrong ? "That doesn't look like a CV" : "We couldn't read that CV"}</h1>
        <p style={s.sub}>
          {wrong
            ? "The file you uploaded doesn't seem to be a CV or resume. Please upload your CV as a PDF or DOCX — not an ID, photo, or other document."
            : "The file uploaded, but we couldn't pull much from it — it may be a scanned image, mostly blank, or low quality. A text-based PDF works best."}
        </p>
        {error?.file && <div style={s.errFile}>Uploaded: {error.file}</div>}
        <div style={s.errTips}>
          <div style={s.errTipsTitle}>Tips for a CV we can read:</div>
          <ul style={s.errList}>
            <li>Export as a text PDF, not a photo or screenshot</li>
            <li>Include your name, contact, and work history</li>
            <li>Keep it under 10MB</li>
          </ul>
        </div>
        <button style={s.primary} onClick={onRetry}>Try another file</button>
      </div>
    </div>
  );
}


/* ---------- DASHBOARD (parsed data + complete contact) ---------- */
function Dashboard({ form, setForm, profile, setProfile, onBack, onLogout, flash }) {
  const set = (k, v) => setProfile({ ...profile, [k]: v });
  const statusLabel = STATUS_OPTS.find((o) => o.key === form.status)?.label || "—";
  const workLabel = form.work.map((k) => WORK_OPTS.find((o) => o.key === k)?.label).filter(Boolean).join(", ") || "—";
  const aspirationsStr = form.aspirations.join(" · ") || "—";
  const missing = !profile.phone;
  const firstName = (profile.name || "").split(" ")[0] || "there";
  const COVER_MAX = 2000;

  const [saved, setSaved] = useState(!!profile.cvUrl);
  const [editTold, setEditTold] = useState(false);
  const [showCv, setShowCv] = useState(false);
  const [saving, setSaving] = useState(false);

  // Show an existing photo/CV from a private storage path via a short-lived signed URL.
  useEffect(() => {
    if (!profile.photo && profile.photoPath) {
      getSupabaseClient().storage.from("cvs").createSignedUrl(profile.photoPath, 3600)
        .then(({ data }) => { if (data) set("photo", data.signedUrl); });
    }
  }, [profile.photoPath]);

  const onPhoto = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 1024 * 1024) { flash("Photo must be 1MB or smaller."); return; }
    const supabase = getSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();
    const path = `${session.user.id}/photo-${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("cvs").upload(path, file, { upsert: true });
    if (error) { flash("Photo upload failed."); return; }
    setProfile({ ...profile, photo: URL.createObjectURL(file), photoPath: path });
  };
  const onCover = (e) => { const v = e.target.value.slice(0, COVER_MAX); set("cover", v); };

  // Phone: lock to Indonesian +62 format. Strip non-digits, drop leading 0/62, show as +62 …
  const onPhone = (e) => {
    let d = e.target.value.replace(/\D/g, "");
    if (d.startsWith("62")) d = d.slice(2);
    if (d.startsWith("0")) d = d.slice(1);
    d = d.slice(0, 12);
    set("phone", d);
  };
  const phoneDisplay = profile.phone ? "+62 " + profile.phone.replace(/(\d{3})(\d{0,4})(\d{0,5})/, (m, a, b, c) => [a, b, c].filter(Boolean).join(" ")) : "";

  // CV can be replaced only once per 3 months — cvChangedAt comes from the server (candidates.cv_changed_at).
  // The client check is a UX nicety only; /api/profile enforces the real rule on save.
  const THREE_MONTHS = 90 * 24 * 60 * 60 * 1000;
  const lastCvChange = profile.cvChangedAt ? new Date(profile.cvChangedAt).getTime() : null;
  const cvLocked = lastCvChange && (Date.now() - lastCvChange < THREE_MONTHS);
  const cvNextDate = lastCvChange ? new Date(lastCvChange + THREE_MONTHS).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : null;
  const onCvReplace = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (cvLocked) { flash(`You can change your CV again after ${cvNextDate}.`); return; }
    const supabase = getSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();
    const path = `${session.user.id}/${Date.now()}-${file.name}`;
    const { error: upErr } = await supabase.storage.from("cvs").upload(path, file, { upsert: true });
    if (upErr) { flash("CV upload failed."); return; }
    try {
      const parsed = await authedFetch("/api/parse-cv", { method: "POST", body: JSON.stringify({ path }) });
      if (parsed.error === "wrong" || parsed.error === "lowquality") {
        flash(parsed.error === "wrong" ? "That doesn't look like a CV." : "We couldn't read that file.");
        return;
      }
      const f = parsed.fields || {};
      setProfile({
        ...profile,
        name: f.full_name || profile.name, phone: f.phone || profile.phone, email: f.email || profile.email,
        title: f.title || profile.title, city: f.city || profile.city, years: f.years != null ? String(f.years) : profile.years,
        summary: f.summary || profile.summary,
        cvFile: file.name, cvUrl: path,
      });
      flash("CV updated — review the fields below, then save.");
    } catch {
      flash("Couldn't read that CV — try another file.");
    }
  };
  const onSave = async () => {
    setSaving(true);
    try {
      const { profile: saved_ } = await authedFetch("/api/profile", {
        method: "POST",
        body: JSON.stringify({
          fullName: profile.name, email: profile.email, phone: profile.phone, photoUrl: profile.photoPath,
          title: profile.title, currentCity: form.currentCity, aspirationCities: form.aspirations,
          years: profile.years ? Number(profile.years) : null,
          curSalary: form.curSalary, expSalary: form.expSalary, status: form.status,
          noticePeriod: form.status !== "asap" ? form.notice : null, workPref: form.work,
          coverLetter: profile.cover || "", cvUrl: profile.cvUrl, cvFilename: profile.cvFile,
          summary: profile.summary,
        }),
      });
      setProfile({ ...profile, cvChangedAt: saved_.cv_changed_at });
      setSaved(true);
      setEditTold(false);
      flash(saved ? "Profile updated." : "Profile saved. You're visible to hiring teams.");
    } catch (e) {
      if (e.data?.error === "cv_locked") {
        flash(`You can change your CV again after ${new Date(e.data.nextChangeAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}.`);
      } else {
        flash(e.message || "Couldn't save your profile — try again.");
      }
    }
    setSaving(false);
  };

  return (
    <div style={s.dashWrap}>
      <div style={s.dashHead}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button style={s.backSm} onClick={onBack} aria-label="Back">←</button>
          <div style={s.brand}>Flashire<span style={{ color: "#5DCAA5" }}>.</span></div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {saved && <span style={s.doneBadge}><span style={s.liveDot} />Profile live</span>}
          <button style={{ ...s.saveTop, ...(saved ? s.updateTop : {}) }} onClick={onSave} disabled={saving}>{saving ? "Saving…" : saved ? "Update profile" : "Save profile"}</button>
          <button style={s.logout} onClick={onLogout}>Log out</button>
        </div>
      </div>

      <div style={s.dashBody}>
        <div style={{ maxWidth: 640 }}>
          <h1 style={s.h1}>Hello, {firstName}</h1>
          <p style={{ ...s.sub, margin: "4px 0 0" }}>We read this from your CV. Check it's right and complete anything missing.</p>
        </div>

        {missing && <div style={{ ...s.warnBar, marginTop: 16 }}>⚠ Add your phone number so hiring teams can reach you.</div>}

        <div className="dash-cols">
          {/* LEFT: photo + contact + CV + told-us */}
          <div>
            <div style={s.section}>
              <div style={s.sectionTitle}>Profile photo</div>
              <div style={s.photoRow}>
                <div style={s.photoCircle}>
                  {profile.photo ? <img src={profile.photo} alt="Profile" style={s.photoImg} /> : <span style={s.photoPlaceholder}>👤</span>}
                </div>
                <div>
                  <label style={s.photoBtn}>
                    {profile.photo ? "Change photo" : "Upload photo"}
                    <input type="file" accept="image/*" style={{ display: "none" }} onChange={onPhoto} />
                  </label>
                  <div style={s.photoHint}>A formal headshot works best. JPG or PNG, 1MB max. Shown as a circle.</div>
                </div>
              </div>
            </div>

            <div style={s.section}>
              <div style={s.sectionTitle}>Contact — please confirm</div>
              <Field label="Full name"><input style={s.inp} value={profile.name} onChange={(e) => set("name", e.target.value)} /></Field>
              <Field label="Email"><input style={s.inp} value={profile.email} onChange={(e) => set("email", e.target.value)} /></Field>
              <Field label={"Phone" + (missing ? " (missing — please add)" : "")}>
                <div style={{ ...s.phoneWrap, ...(missing ? s.inpWarn : {}) }}>
                  <span style={s.phonePrefix}>+62</span>
                  <input style={s.phoneInput} value={phoneDisplay.replace("+62 ", "")} onChange={onPhone} placeholder="8xx xxxx xxxx" inputMode="numeric" />
                </div>
              </Field>
            </div>

            <div style={s.section}>
              <div style={s.sectionTitle}>From your CV</div>
              <div style={s.two}>
                <Field label="Current role"><input style={s.inp} value={profile.title} onChange={(e) => set("title", e.target.value)} /></Field>
                <Field label="Location"><input style={s.inp} value={profile.city} onChange={(e) => set("city", e.target.value)} /></Field>
              </div>
            </div>

            <div style={s.section}>
              <div style={s.sectionTitle}>Your CV file</div>
              <div style={s.cvRow}>
                <div style={s.cvInfo}>
                  <span style={s.cvIcon}>📄</span>
                  <span style={s.cvName}>{profile.cvFile}</span>
                </div>
                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                  <button style={s.cvPreviewBtn} onClick={() => setShowCv(true)}>Preview</button>
                  <label style={{ ...s.cvBtn, ...(cvLocked ? s.cvBtnLocked : {}) }}>
                    {cvLocked ? "Locked" : "Replace"}
                    {!cvLocked && <input type="file" accept=".pdf,.doc,.docx" style={{ display: "none" }} onChange={onCvReplace} />}
                  </label>
                </div>
              </div>
              <div style={s.cvHint}>
                {cvLocked
                  ? `You've used your CV change. Next change available on ${cvNextDate}.`
                  : "Preview to check it's correct. You can replace your CV once every 3 months, so keep it up to date."}
              </div>
            </div>

            <div style={s.section}>
              <div style={s.sectionHead}>
                <div style={s.sectionTitle}>What you told us</div>
                <button style={s.editBtn} onClick={() => setEditTold(!editTold)}>{editTold ? "Done" : "Edit"}</button>
              </div>
              {!editTold ? (
                <div style={s.readGrid}>
                  <Read label="Current salary" value={"IDR " + form.curSalary + " jt/mo"} />
                  <Read label="Expected salary" value={"IDR " + form.expSalary + " jt/mo"} />
                  <Read label="Status" value={statusLabel} />
                  {form.status !== "asap" && <Read label="Notice period" value={form.notice || "—"} />}
                  <Read label="Working arrangement" value={workLabel} />
                  <Read label="Current location" value={form.currentCity || "—"} />
                  <Read label="Aspiration cities" value={aspirationsStr} />
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div style={s.two}>
                    <Field label="Current salary">
                      <select className="rsh-select" style={s.inp} value={form.curSalary} onChange={(e) => setForm({ ...form, curSalary: e.target.value })}>
                        {SALARY_BANDS.map((b) => <option key={b}>{b}</option>)}
                      </select>
                    </Field>
                    <Field label="Expected salary">
                      <select className="rsh-select" style={s.inp} value={form.expSalary} onChange={(e) => setForm({ ...form, expSalary: e.target.value })}>
                        {SALARY_BANDS.map((b) => <option key={b}>{b}</option>)}
                      </select>
                    </Field>
                  </div>
                  <Field label="Current status">
                    <div style={s.chips}>
                      {STATUS_OPTS.map((o) => (
                        <button key={o.key} style={{ ...s.chip, ...(form.status === o.key ? s.chipOn : {}) }} onClick={() => setForm({ ...form, status: o.key, notice: o.key === "asap" ? "" : form.notice })}>{o.label}</button>
                      ))}
                    </div>
                  </Field>
                  {form.status !== "asap" && (
                    <Field label="Notice period">
                      <div style={s.chips}>
                        {NOTICE_OPTS.map((n) => (
                          <button key={n} style={{ ...s.chip, ...(form.notice === n ? s.chipOn : {}) }} onClick={() => setForm({ ...form, notice: n })}>{n}</button>
                        ))}
                      </div>
                    </Field>
                  )}
                  <Field label="Working arrangement (select all)">
                    <div style={s.chips}>
                      {WORK_OPTS.map((o) => (
                        <button key={o.key} style={{ ...s.chip, ...(form.work.includes(o.key) ? s.chipOn : {}) }} onClick={() => setForm({ ...form, work: form.work.includes(o.key) ? form.work.filter((k) => k !== o.key) : [...form.work, o.key] })}>{o.label}</button>
                      ))}
                    </div>
                  </Field>
                  <Field label="Current location"><CityPicker value={form.currentCity} onSelect={(c) => setForm({ ...form, currentCity: c })} placeholder="Type your city…" /></Field>
                  <Field label="Aspiration cities (up to 3)">
                    {form.aspirations.length > 0 && (
                      <div style={s.tagWrap}>
                        {form.aspirations.map((c) => (
                          <span key={c} style={s.cityTag}>{c}<button style={s.tagX} onClick={() => setForm({ ...form, aspirations: form.aspirations.filter((x) => x !== c) })}>×</button></span>
                        ))}
                      </div>
                    )}
                    {form.aspirations.length < 3 && <CityPicker value="" onSelect={(c) => { if (!form.aspirations.includes(c)) setForm({ ...form, aspirations: [...form.aspirations, c] }); }} placeholder="Add a city…" exclude={form.aspirations} clearOnSelect />}
                  </Field>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: cover letter */}
          <div>
            <div style={{ ...s.section, ...s.coverSection }}>
              <div style={s.sectionTitle}>Cover letter</div>
              <p style={s.coverHint}>Optional, but it helps. Tell hiring teams what you're looking for and why you'd be a great fit.</p>
              <textarea
                style={s.cover}
                value={profile.cover || ""}
                onChange={onCover}
                maxLength={COVER_MAX}
                placeholder="Write a few lines about yourself, your strengths, and the kind of role you want…"
              />
              <div style={{ ...s.coverCount, ...((profile.cover || "").length >= COVER_MAX ? { color: "#BA7517" } : {}) }}>
                {(profile.cover || "").length} / {COVER_MAX}
              </div>
            </div>
          </div>
        </div>
      </div>

      {showCv && (
        <>
          <div style={s.cvOverlay} onClick={() => setShowCv(false)} />
          <div style={s.cvModal}>
            <div style={s.cvModalHead}>
              <span style={s.cvModalTitle}>{profile.cvFile}</span>
              <button style={s.cvClose} onClick={() => setShowCv(false)}>✕</button>
            </div>
            <div style={s.cvModalBody}>
              <div style={s.cvPage}>
                <div style={s.cvDocName}>{profile.name}</div>
                <div style={s.cvDocRole}>{profile.title} · {profile.city}</div>
                <div style={s.cvDocLine} />
                <div style={s.cvDocSection}>EXPERIENCE</div>
                <div style={s.cvDocText}>Regional Sales Manager — leads a 10-person field team selling agri-inputs to smallholder plantations. Owns quota, distributor relationships, and pricing.</div>
                <div style={s.cvDocText}>Field Sales Supervisor — route planning, sell-through tracking, team coaching.</div>
                <div style={s.cvDocSection}>EDUCATION</div>
                <div style={s.cvDocText}>S1, Agribusiness</div>
                <div style={s.cvPreviewNote}>Preview only — this is how your CV looks to you here. Hiring teams see the original file.</div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* ---------- SMALL ---------- */
function CityPicker({ value, onSelect, placeholder, exclude = [], clearOnSelect = false }) {
  const [q, setQ] = useState(value || "");
  const [open, setOpen] = useState(false);
  // Keep the input text in sync when the parent's value changes (e.g. reset/edit).
  React.useEffect(() => { if (!clearOnSelect) setQ(value || ""); }, [value, clearOnSelect]);

  const query = q.trim().toLowerCase();
  const matches = query
    ? LOCATIONS
        .filter((l) => !exclude.includes(locLabel(l)))
        .map((l) => {
          const label = locLabel(l);
          const inName = l.name.toLowerCase().includes(query);
          const inParent = l.parent && l.parent.toLowerCase().includes(query);
          const aliasHit = l.aliases.find((a) => a.includes(query));
          if (!inName && !inParent && !aliasHit) return null;
          return { label, kind: l.kind, parent: l.parent, via: !inName && aliasHit ? aliasHit : null };
        })
        .filter(Boolean)
        .sort((a, b) => (a.kind === "city" ? -1 : 1) - (b.kind === "city" ? -1 : 1))
        .slice(0, 7)
    : [];

  const choose = (label) => {
    onSelect(label);
    setQ(clearOnSelect ? "" : label);
    setOpen(false);
  };

  return (
    <div style={{ position: "relative" }}>
      <input
        style={s.inp}
        value={q}
        placeholder={placeholder}
        onChange={(e) => { setQ(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 200)}
      />
      {open && matches.length > 0 && (
        <div style={s.acList}>
          {matches.map((m) => (
            <div
              key={m.label}
              style={s.acItem}
              onMouseDown={(e) => { e.preventDefault(); choose(m.label); }}
            >
              <span style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {m.kind === "hub" ? m.label.split(",")[0] : m.label}
                </span>
                {m.kind === "hub" && <span style={s.hubTag}>in {m.parent}</span>}
              </span>
              {m.via && <span style={s.acVia}>“{m.via}”</span>}
            </div>
          ))}
        </div>
      )}
      {open && query && matches.length === 0 && <div style={s.acList}><div style={s.acEmpty}>No match — try the city name</div></div>}
    </div>
  );
}

function Field({ label, children, req, id, error }) {
  return (
    <div id={id ? "f-" + id : undefined} style={{ marginBottom: 14, textAlign: "left", ...(error ? s.fieldErr : {}) }}>
      <div style={s.fLabel}>{label}{req && <span style={s.reqStar}>*</span>}{error && <span style={s.errNote}> — required</span>}</div>
      {children}
    </div>
  );
}
function Read({ label, value }) {
  return (<div style={s.readCell}><div style={s.readLabel}>{label}</div><div style={s.readVal}>{value}</div></div>);
}

const CSS = `
  .rsh-spin { animation: rshspin 0.9s linear infinite; }
  @keyframes rshspin { to { transform: rotate(360deg); } }
  .dash-cols { display: grid; grid-template-columns: 1.4fr 1fr; gap: 16px; align-items: start; }
  @media (max-width: 900px) { .dash-cols { grid-template-columns: 1fr; } }
  @media (max-width: 860px) {
    .rsh-two { flex-direction: column !important; }
    .rsh-two-right { min-height: auto !important; }
  }
  @media (max-width: 700px) {
    .rsh-land-steps { grid-template-columns: 1fr !important; }
    .rsh-land-h1 { font-size: 38px !important; }
  }
  .rsh-two { display: flex; align-items: stretch; min-height: calc(100vh - 130px); }
  .rsh-two-left { flex: 1.5; padding: 48px 48px 48px 0; display: flex; flex-direction: column; justify-content: center; }
  .rsh-two-right { flex: 1; background: #0F6E56; border-radius: 24px; display: flex; align-items: center; justify-content: center; padding: 40px; }
  @media (max-width: 860px) {
    .rsh-two-left { padding: 32px 0; }
    .rsh-land-h1 { font-size: 40px; }
  }
  select.rsh-select {
    -webkit-appearance: none;
    -moz-appearance: none;
    appearance: none;
    padding-right: 40px;
    background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'><path d='M1 1.5L6 6.5L11 1.5' fill='none' stroke='%235F5E5A' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'/></svg>");
    background-repeat: no-repeat;
    background-position: right 14px center;
    background-size: 12px 8px;
  }
`;
const s = {
  root: { fontFamily: "ui-sans-serif, system-ui, sans-serif", background: "#FAF9F5", minHeight: "100vh", color: "#2C2C2A" },
  entryNav: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 24px" },
  entryH: { fontSize: 30, lineHeight: 1.15, letterSpacing: "-0.02em", margin: "0 0 12px" },
  entryP: { fontSize: 15, lineHeight: 1.55, margin: "0 0 28px", maxWidth: 320 },
  entryCta: { padding: "15px 28px", fontSize: 16, fontWeight: 600, borderRadius: 12, cursor: "pointer", border: "none", fontFamily: "inherit", minHeight: 48 },
  entryFoot: { textAlign: "center", fontSize: 13, color: "#888780", padding: "16px 0" },
  landWrap: { maxWidth: 1080, margin: "0 auto", padding: "0 24px 40px" },
  landEmployer: { padding: "8px 16px", fontSize: 14, fontWeight: 500, color: "#5F5E5A", background: "#F1EFE8", border: "none", borderRadius: 9, cursor: "pointer", fontFamily: "inherit" },
  empInner: { maxWidth: 340, textAlign: "left" },
  empTag: { display: "inline-block", fontSize: 12.5, fontWeight: 600, color: "#fff", background: "rgba(255,255,255,0.18)", padding: "5px 12px", borderRadius: 999, marginBottom: 16 },
  empH: { fontSize: 30, lineHeight: 1.15, letterSpacing: "-0.02em", color: "#fff", margin: "0 0 14px" },
  empP: { fontSize: 15.5, lineHeight: 1.6, color: "rgba(255,255,255,0.88)", margin: "0 0 28px" },
  empCta: { display: "block", width: "100%", padding: "15px 24px", fontSize: 16, fontWeight: 600, color: "#0F6E56", background: "#fff", border: "none", borderRadius: 12, cursor: "pointer", fontFamily: "inherit", marginBottom: 10 },
  empLogin: { display: "block", width: "100%", padding: "13px 24px", fontSize: 15, fontWeight: 500, color: "#fff", background: "transparent", border: "1.5px solid rgba(255,255,255,0.4)", borderRadius: 12, cursor: "pointer", fontFamily: "inherit" },
  hrSearchBtn: { padding: "12px 20px", fontSize: 14, fontWeight: 600, color: "#fff", background: "#1D9E75", border: "none", borderRadius: 10, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" },
  badgeLock: { fontSize: 12, fontWeight: 500, color: "#854F0B", background: "#FAEEDA", padding: "6px 12px", borderRadius: 999 },
  gateBar: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, background: "#E6F1FB", borderRadius: 10, padding: "12px 14px", marginTop: 14, flexWrap: "wrap" },
  verifyBtn: { padding: "8px 14px", fontSize: 13, fontWeight: 600, color: "#fff", background: "#185FA5", border: "none", borderRadius: 8, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" },
  empty: { fontSize: 14, color: "#888780", padding: "24px 0", textAlign: "center" },
  hrCard: { background: "#fff", border: "1px solid #E4E2DA", borderRadius: 12, padding: 15 },
  hrAvatar: { width: 40, height: 40, borderRadius: "50%", background: "#F1EFE8", color: "#888780", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 600, fontSize: 13, flexShrink: 0 },
  fitPill: { fontSize: 11.5, fontWeight: 500, color: "#0F6E56", background: "#E1F5EE", padding: "4px 9px", borderRadius: 999, whiteSpace: "nowrap" },
  land: { maxWidth: 960, margin: "0 auto", padding: "0 24px 60px" },
  landNav: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 0" },
  landLogin: { padding: "8px 18px", fontSize: 14, fontWeight: 500, color: "#0F6E56", background: "#E1F5EE", border: "none", borderRadius: 9, cursor: "pointer", fontFamily: "inherit" },
  landHero: { textAlign: "center", padding: "48px 0 40px", maxWidth: 640, margin: "0 auto" },
  landPill: { display: "inline-block", fontSize: 13, fontWeight: 600, color: "#854F0B", background: "#FAEEDA", padding: "6px 14px", borderRadius: 999, marginBottom: 24 },
  landH1: { fontSize: 52, lineHeight: 1.08, fontWeight: 700, letterSpacing: "-0.03em", margin: "0 0 20px" },
  landSub: { fontSize: 17, lineHeight: 1.6, color: "#5F5E5A", margin: "0 0 32px" },
  landBtns: { display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" },
  landCta: { padding: "15px 30px", fontSize: 16, fontWeight: 600, color: "#fff", background: "#1D9E75", border: "none", borderRadius: 12, cursor: "pointer", fontFamily: "inherit", minHeight: 50 },
  landGhost: { padding: "15px 26px", fontSize: 16, fontWeight: 500, color: "#0F6E56", background: "transparent", border: "1.5px solid #C3DED3", borderRadius: 12, cursor: "pointer", fontFamily: "inherit", minHeight: 50 },
  landNote: { fontSize: 13, color: "#888780", marginTop: 18 },
  landSteps: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginTop: 32 },
  landStep: { background: "#fff", border: "1px solid #E4E2DA", borderRadius: 14, padding: "22px 20px", textAlign: "center" },
  landStepNum: { width: 34, height: 34, borderRadius: "50%", background: "#E1F5EE", color: "#0F6E56", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" },
  landStepTitle: { fontSize: 15, fontWeight: 600, marginBottom: 5 },
  landStepDesc: { fontSize: 13.5, color: "#5F5E5A", lineHeight: 1.5 },
  landFoot: { textAlign: "center", fontSize: 13, color: "#888780", marginTop: 48 },
  center: { minHeight: "100vh", display: "flex", justifyContent: "center", alignItems: "flex-start", padding: "40px 16px" },
  card: { width: "100%", maxWidth: 400, background: "#fff", border: "1px solid #E4E2DA", borderRadius: 16, padding: 28 },
  brand: { fontSize: 17, fontWeight: 700, color: "#0F6E56", letterSpacing: "-0.02em" },
  h1: { fontSize: 23, fontWeight: 600, margin: "0 0 6px", letterSpacing: "-0.02em" },
  sub: { fontSize: 14, color: "#5F5E5A", margin: "0 0 20px", lineHeight: 1.5 },
  stepTag: { fontSize: 12, fontWeight: 600, color: "#854F0B", background: "#FAEEDA", display: "inline-block", padding: "5px 12px", borderRadius: 999 },
  fLabel: { fontSize: 13, fontWeight: 500, color: "#5F5E5A", marginBottom: 5 },
  reqStar: { color: "#C0392B", marginLeft: 3, fontWeight: 600 },
  salaryNotice: { fontSize: 13, color: "#854F0B", background: "#FEF6E7", border: "1px solid #F0D9A8", borderRadius: 10, padding: "10px 13px", marginBottom: 14, lineHeight: 1.45, marginTop: -2 },
  intakeTop: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  back: { display: "inline-flex", alignItems: "center", gap: 4, padding: "7px 12px 7px 10px", fontSize: 14, fontWeight: 500, color: "#5F5E5A", background: "#F1EFE8", border: "none", borderRadius: 8, cursor: "pointer", fontFamily: "inherit" },
  inp: { width: "100%", boxSizing: "border-box", padding: "12px 13px", fontSize: 14, border: "1px solid #D3D1C7", borderRadius: 10, background: "#fff", fontFamily: "inherit", outline: "none" },
  inpWarn: { borderColor: "#BA7517", background: "#FEFAF2" },
  inpErr: { borderColor: "#C0392B", background: "#FDF3F2" },
  dropErr: { borderColor: "#C0392B", background: "#FDF3F2" },
  fieldErr: { padding: "10px 12px", margin: "0 -12px 14px", borderRadius: 10, background: "#FDF3F2", border: "1px solid #F0C7C2" },
  errNote: { color: "#C0392B", fontWeight: 500 },
  backSm: { width: 34, height: 34, borderRadius: 8, border: "1px solid #D3D1C7", background: "#fff", color: "#5F5E5A", fontSize: 16, cursor: "pointer", fontFamily: "inherit" },
  logout: { padding: "7px 14px", fontSize: 13, fontWeight: 500, color: "#5F5E5A", background: "#F1EFE8", border: "none", borderRadius: 8, cursor: "pointer", fontFamily: "inherit" },
  photoRow: { display: "flex", gap: 16, alignItems: "center" },
  photoCircle: { width: 84, height: 84, borderRadius: "50%", background: "#F1EFE8", border: "1px solid #E4E2DA", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0 },
  photoImg: { width: "100%", height: "100%", objectFit: "cover" },
  photoPlaceholder: { fontSize: 34, opacity: 0.4 },
  photoBtn: { display: "inline-block", padding: "9px 16px", fontSize: 13.5, fontWeight: 500, color: "#0F6E56", background: "#E1F5EE", border: "none", borderRadius: 9, cursor: "pointer", fontFamily: "inherit" },
  photoHint: { fontSize: 12, color: "#888780", marginTop: 8, lineHeight: 1.4, maxWidth: 260 },
  coverHint: { fontSize: 13, color: "#5F5E5A", margin: "0 0 10px", lineHeight: 1.5 },
  cover: { width: "100%", boxSizing: "border-box", padding: "12px 13px", fontSize: 14, lineHeight: 1.6, border: "1px solid #D3D1C7", borderRadius: 10, background: "#fff", fontFamily: "inherit", outline: "none", resize: "vertical", flex: 1, minHeight: 240 },
  coverCount: { fontSize: 11.5, color: "#B4B2A9", textAlign: "right", marginTop: 6 },
  coverSection: { display: "flex", flexDirection: "column", height: "100%", boxSizing: "border-box" },
  titleRow: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" },
  saveTop: { padding: "9px 22px", fontSize: 14, fontWeight: 600, color: "#fff", background: "#1D9E75", border: "none", borderRadius: 9, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" },
  updateTop: { background: "#fff", color: "#0F6E56", border: "1.5px solid #1D9E75", padding: "8px 22px" },
  phoneWrap: { display: "flex", alignItems: "center", border: "1px solid #D3D1C7", borderRadius: 10, background: "#fff", overflow: "hidden" },
  phonePrefix: { padding: "12px 10px 12px 13px", fontSize: 14, color: "#5F5E5A", background: "#F4F2EC", borderRight: "1px solid #E4E2DA", fontWeight: 500 },
  phoneInput: { flex: 1, border: "none", outline: "none", padding: "12px 13px", fontSize: 14, fontFamily: "inherit", background: "transparent", minWidth: 0 },
  sectionHead: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  editBtn: { padding: "5px 14px", fontSize: 12.5, fontWeight: 500, color: "#0F6E56", background: "#E1F5EE", border: "none", borderRadius: 7, cursor: "pointer", fontFamily: "inherit" },
  cvPreviewBtn: { padding: "8px 14px", fontSize: 13, fontWeight: 500, color: "#5F5E5A", background: "#F1EFE8", border: "none", borderRadius: 8, cursor: "pointer", fontFamily: "inherit" },
  cvOverlay: { position: "fixed", inset: 0, background: "rgba(30,28,24,0.5)", zIndex: 60 },
  cvModal: { position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: "min(560px, 94vw)", maxHeight: "88vh", background: "#fff", borderRadius: 16, zIndex: 70, display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 24px 60px rgba(0,0,0,0.28)" },
  cvModalHead: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 18px", borderBottom: "1px solid #E4E2DA" },
  cvModalTitle: { fontSize: 14, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  cvClose: { width: 30, height: 30, borderRadius: 8, border: "1px solid #D3D1C7", background: "#fff", color: "#5F5E5A", fontSize: 14, cursor: "pointer", flexShrink: 0 },
  cvModalBody: { padding: 20, overflowY: "auto", background: "#F4F2EC" },
  cvPage: { background: "#fff", borderRadius: 8, padding: "28px 30px", boxShadow: "0 2px 12px rgba(0,0,0,0.08)", maxWidth: 460, margin: "0 auto" },
  cvDocName: { fontSize: 20, fontWeight: 700, letterSpacing: "-0.01em" },
  cvDocRole: { fontSize: 13, color: "#5F5E5A", marginTop: 3 },
  cvDocLine: { height: 1, background: "#E4E2DA", margin: "16px 0" },
  cvDocSection: { fontSize: 11, fontWeight: 700, color: "#888780", letterSpacing: "0.06em", marginTop: 16, marginBottom: 6 },
  cvDocText: { fontSize: 12.5, color: "#2C2C2A", lineHeight: 1.5, marginBottom: 6 },
  cvPreviewNote: { fontSize: 11.5, color: "#888780", fontStyle: "italic", marginTop: 20, paddingTop: 12, borderTop: "1px solid #F1EFE8" },
  cvRow: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, background: "#F9F8F3", border: "1px solid #E4E2DA", borderRadius: 10, padding: "12px 14px" },
  cvInfo: { display: "flex", alignItems: "center", gap: 10, minWidth: 0 },
  cvIcon: { fontSize: 20, flexShrink: 0 },
  cvName: { fontSize: 14, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  cvBtn: { padding: "8px 16px", fontSize: 13, fontWeight: 500, color: "#0F6E56", background: "#E1F5EE", border: "none", borderRadius: 8, cursor: "pointer", fontFamily: "inherit", flexShrink: 0 },
  cvBtnLocked: { color: "#B4B2A9", background: "#F1EFE8", cursor: "not-allowed" },
  cvHint: { fontSize: 12, color: "#888780", marginTop: 8, lineHeight: 1.4 },
  two: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 },
  drop: { display: "block", border: "1.5px dashed #C3C0B4", borderRadius: 12, padding: 18, textAlign: "center", fontSize: 14, color: "#888780", background: "#fff", cursor: "pointer" },
  dropDone: { borderColor: "#5DCAA5", color: "#0F6E56", background: "#F0FBF7", borderStyle: "solid" },
  chips: { display: "flex", gap: 6, flexWrap: "wrap" },
  chip: { padding: "8px 13px", fontSize: 13, color: "#5F5E5A", background: "#fff", border: "1px solid #D3D1C7", borderRadius: 999, cursor: "pointer", fontFamily: "inherit" },
  chipOn: { color: "#3C3489", background: "#EEEDFE", borderColor: "#C7C2F0", fontWeight: 500 },
  workGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 },
  workBtn: { display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 2, padding: "10px 12px", border: "1px solid #D3D1C7", borderRadius: 11, background: "#fff", cursor: "pointer", fontFamily: "inherit", textAlign: "left", color: "#2C2C2A" },
  workOn: { borderColor: "#1D9E75", background: "#E1F5EE" },
  inpDisabled: { background: "#F4F2EC", color: "#B4B2A9", cursor: "not-allowed" },
  hintText: { fontSize: 12, color: "#888780", marginTop: 2 },
  acList: { position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, background: "#fff", border: "1px solid #E4E2DA", borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.1)", zIndex: 30, overflow: "hidden" },
  acItem: { padding: "10px 13px", fontSize: 14, cursor: "pointer", borderBottom: "1px solid #F4F2EC", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 },
  acVia: { fontSize: 11.5, color: "#888780", fontStyle: "italic", flexShrink: 0 },
  hubTag: { fontSize: 11, color: "#0F6E56", background: "#E1F5EE", padding: "2px 7px", borderRadius: 999, flexShrink: 0 },
  acEmpty: { padding: "10px 13px", fontSize: 13, color: "#888780" },
  tagWrap: { display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 },
  cityTag: { display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, color: "#0F6E56", background: "#E1F5EE", padding: "5px 6px 5px 12px", borderRadius: 999 },
  tagX: { border: "none", background: "rgba(15,110,86,0.15)", color: "#0F6E56", width: 18, height: 18, borderRadius: "50%", cursor: "pointer", fontSize: 13, lineHeight: 1, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "inherit" },
  statusBtn: { display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 2, padding: "11px 14px", border: "1px solid #D3D1C7", borderRadius: 11, background: "#fff", cursor: "pointer", fontFamily: "inherit", textAlign: "left", fontSize: 14, color: "#2C2C2A" },
  statusOn: { borderColor: "#1D9E75", background: "#E1F5EE" },
  checkBox: { width: 18, height: 18, borderRadius: 5, border: "1.5px solid #C3C0B4", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: "#fff", flexShrink: 0 },
  checkBoxOn: { background: "#1D9E75", borderColor: "#1D9E75" },
  statusHint: { fontSize: 12, color: "#888780", fontWeight: 400 },
  primary: { width: "100%", padding: 14, fontSize: 15, fontWeight: 600, color: "#fff", background: "#1D9E75", border: "none", borderRadius: 11, cursor: "pointer", fontFamily: "inherit", marginTop: 8, minHeight: 48 },
  note: { fontSize: 13, color: "#5F5E5A", marginTop: 16, textAlign: "center" },
  link: { color: "#0F6E56", fontWeight: 600, cursor: "pointer", textDecoration: "underline" },
  googleBtn: { width: "100%", padding: "12px", fontSize: 14.5, fontWeight: 500, color: "#2C2C2A", background: "#fff", border: "1px solid #D3D1C7", borderRadius: 11, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, minHeight: 48 },
  gIcon: { width: 20, height: 20, borderRadius: "50%", background: "#fff", border: "1px solid #E4E2DA", color: "#4285F4", fontWeight: 700, fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center" },
  orRow: { display: "flex", alignItems: "center", gap: 10, margin: "16px 0" },
  orLine: { flex: 1, height: 1, background: "#E4E2DA" },
  orText: { fontSize: 12.5, color: "#888780" },
  spinner: { width: 40, height: 40, borderRadius: "50%", border: "3px solid #E4E2DA", borderTopColor: "#1D9E75", margin: "0 auto", animation: "rshspin 0.9s linear infinite" },
  errIcon: { fontSize: 40, marginBottom: 12 },
  errFile: { fontSize: 13, color: "#888780", background: "#F4F2EC", padding: "8px 12px", borderRadius: 8, marginBottom: 16, wordBreak: "break-all" },
  errTips: { textAlign: "left", background: "#F9F8F3", border: "1px solid #E4E2DA", borderRadius: 10, padding: "14px 16px", marginBottom: 18 },
  errTipsTitle: { fontSize: 13, fontWeight: 600, marginBottom: 8 },
  errList: { margin: 0, paddingLeft: 18, fontSize: 13, color: "#5F5E5A", lineHeight: 1.7 },
  toast: { position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", background: "#0F6E56", color: "#fff", padding: "12px 20px", borderRadius: 10, fontSize: 14, zIndex: 80, boxShadow: "0 8px 24px rgba(0,0,0,0.18)" },

  dashWrap: { maxWidth: 1200, margin: "0 auto" },
  dashHead: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 24px", borderBottom: "1px solid #E9E7E0", position: "sticky", top: 0, background: "rgba(250,249,245,0.92)", backdropFilter: "blur(8px)", zIndex: 20 },
  doneBadge: { display: "inline-flex", alignItems: "center", fontSize: 12.5, fontWeight: 500, color: "#0F6E56", background: "#E1F5EE", padding: "6px 13px", borderRadius: 999 },
  dashBody: { padding: "24px 24px 60px" },
  liveDot: { width: 7, height: 7, borderRadius: "50%", background: "#1D9E75", display: "inline-block", marginRight: 6 },
  warnBar: { background: "#FEF6E7", border: "1px solid #F0D9A8", color: "#854F0B", fontSize: 13.5, padding: "12px 14px", borderRadius: 10, marginBottom: 18 },
  section: { background: "#fff", border: "1px solid #E4E2DA", borderRadius: 14, padding: 18, marginBottom: 14 },
  sectionTitle: { fontSize: 12.5, fontWeight: 600, color: "#888780", marginBottom: 12 },
  readGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 },
  readCell: {},
  readLabel: { fontSize: 11.5, color: "#B4B2A9", marginBottom: 2 },
  readVal: { fontSize: 14, fontWeight: 500 },
};

/* ================= HR SCREENING WORKSPACE ================= */

const EXAMPLES = [
  "Sales manager, 7+ years, agriculture or FMCG, must lead a team",
  "Junior sales staff in Java, retail or B2B, English a plus",
  "Commercial director, 15+ years, distribution or agribusiness experience",
  "Someone strong in sales operations and pipeline analytics",
];

// Availability statuses a candidate can be in.
const STATUSES = [
  { key: "asap", label: "Join ASAP", color: "#0F6E56", bg: "#E1F5EE" },
  { key: "notice", label: "In month notice", color: "#3C3489", bg: "#EEEDFE" },
  { key: "exploring", label: "Exploring opportunities", color: "#854F0B", bg: "#FAEEDA" },
];

/* Real AI call — hits our own backend (/api/ai), which holds the DeepSeek key.
   The key is NEVER in the browser. `json` asks the model for structured output. */
async function callClaude(prompt, expectJson) {
  const res = await fetch("/api/ai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, json: !!expectJson }),
  });
  if (!res.ok) throw new Error("AI request failed");
  const data = await res.json();
  let text = data.text || "";
  if (expectJson) text = text.replace(/```json|```/g, "").trim();
  return text;
}

function HrScreening({ verified }) {
  const [query, setQuery] = useState("");
  const [stage, setStage] = useState("idle"); // idle | searching | done | error
  const [parsed, setParsed] = useState(null);
  const [results, setResults] = useState([]);
  const [error, setError] = useState("");

  // Saved-roles system — persisted server-side, scoped to this workspace.
  const [roles, setRoles] = useState([]);
  const [saved, setSaved] = useState([]); // [{ id, roleId, stage, candidate }]
  const [selectedId, setSelectedId] = useState(null); // candidate open in detail panel
  const [view, setView] = useState("search"); // "search" | "saved"
  const [coverLetters, setCoverLetters] = useState({}); // { candidateId: text }
  const [clLoading, setClLoading] = useState(false);
  const [saveMenuFor, setSaveMenuFor] = useState(null); // candidateId whose save menu is open

  useEffect(() => {
    authedFetch("/api/roles").then((d) => setRoles(d.roles || [])).catch(() => {});
    authedFetch("/api/saved").then((d) => setSaved(d.saved || [])).catch(() => {});
  }, []);

  function getCandidate(id) {
    return results.find((r) => r.id === id) || saved.find((s) => s.candidate?.id === id)?.candidate || null;
  }
  function savedRolesFor(candidateId) {
    return saved.filter((s) => s.candidate?.id === candidateId).map((s) => s.roleId);
  }
  async function addRole(name) {
    const { role } = await authedFetch("/api/roles", { method: "POST", body: JSON.stringify({ name }) });
    setRoles((r) => [...r, role]);
    return role.id;
  }
  async function toggleSave(candidateId, roleId) {
    const already = saved.some((s) => s.roleId === roleId && s.candidate?.id === candidateId);
    if (already) {
      await authedFetch(`/api/saved?candidateId=${candidateId}&roleId=${roleId}`, { method: "DELETE" });
      setSaved((s) => s.filter((x) => !(x.roleId === roleId && x.candidate?.id === candidateId)));
    } else {
      const candidate = getCandidate(candidateId);
      const { saved: row } = await authedFetch("/api/saved", { method: "POST", body: JSON.stringify({ candidateId, roleId }) });
      setSaved((s) => [...s, { id: row.id, roleId, stage: row.stage, candidate }]);
    }
  }
  async function genCoverLetter(id) {
    const c = getCandidate(id);
    if (!c || c.locked) return;
    setClLoading(true);
    try {
      const prompt = `Write a short, warm outreach cover letter (max 120 words) FROM a recruiter TO this candidate, inviting them to explore a role at SawitPRO, an Indonesian palm-oil agritech startup. Reference their background naturally. Candidate: ${c.full_name}, ${c.title}, ${c.years} yrs, ${c.current_city}. ${c.summary}. Return only the letter text, no subject line, no placeholders in brackets.`;
      const text = await callClaude(prompt, false);
      setCoverLetters((m) => ({ ...m, [id]: text.trim() }));
    } catch (e) {
      setCoverLetters((m) => ({ ...m, [id]: "Couldn't generate a letter just now — try again." }));
    }
    setClLoading(false);
  }

  async function runSearch(q) {
    const text = q ?? query;
    if (!text.trim()) return;
    setError(""); setResults([]); setParsed(null); setStage("searching");
    try {
      const data = await authedFetch("/api/search", { method: "POST", body: JSON.stringify({ query: text }) });
      setParsed(data.parsed);
      setResults(data.results || []);
      setStage("done");
    } catch (e) {
      setError(e.message || "Couldn't run that search. Try rephrasing, or pick an example.");
      setStage("error");
    }
  }

  const busy = stage === "searching";

  return (
    <div style={cs.page}>
      <div style={cs.wrap}>
        <div style={cs.topbar}>
          <div style={cs.brand}>SawitPRO · Talent</div>
          <div style={cs.navToggle}>
            <button style={{ ...cs.navBtn, ...(view === "search" ? cs.navBtnActive : {}) }} onClick={() => setView("search")}>Search</button>
            <button style={{ ...cs.navBtn, ...(view === "saved" ? cs.navBtnActive : {}) }} onClick={() => setView("saved")}>
              Saved{saved.length ? ` · ${saved.length}` : ""}
            </button>
          </div>
        </div>

        {!verified && (
          <div style={s.gateBar}>
            <span style={s.badgeLock}>🔒 Unverified workspace</span>
            <span style={{ fontSize: 13, color: "#2C4A6B" }}>
              Names, exact salary, city, and contact details stay hidden until your workspace is verified.
            </span>
          </div>
        )}

        {view === "search" && (
        <>
        <header style={cs.header}>
          <h1 style={cs.h1}>Candidate finder</h1>
          <p style={cs.sub}>Describe who you're looking for in plain language. The system reads your query, keeps only candidates who meet the hard requirements, then ranks the rest by fit and explains each pick.</p>
        </header>

        <div style={cs.searchRow}>
          <input
            style={cs.input}
            placeholder="e.g. 5+ years B2B sales in Riau, agriculture, must lead a team"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && runSearch()}
            disabled={busy}
          />
          <button style={{ ...cs.btn, ...(busy ? cs.btnBusy : {}) }} onClick={() => runSearch()} disabled={busy}>
            {busy ? "Working…" : "Search"}
          </button>
        </div>

        <div style={cs.examples}>
          {EXAMPLES.map((ex) => (
            <button key={ex} style={cs.chip} disabled={busy}
              onClick={() => { setQuery(ex); runSearch(ex); }}>
              {ex}
            </button>
          ))}
        </div>

        {stage !== "idle" && (
          <div style={cs.flow}>
            <Step label="Parse + embed query" active={stage === "searching"} done={stage === "done"} />
            <span style={cs.flowArrow}>→</span>
            <Step label="Vector search + rank" active={false} done={stage === "done"} />
            <span style={cs.flowArrow}>→</span>
            <Step label="Explain" active={false} done={stage === "done"} />
          </div>
        )}

        {parsed && (
          <div style={cs.parsedBox}>
            <div style={cs.parsedTitle}>How your query was read</div>
            <div style={cs.tags}>
              <Tag k="Min. years" v={parsed.min_years ?? "any"} kind="hard" />
              <Tag k="Location" v={parsed.locations.length ? parsed.locations.join(", ") : "any"} kind="hard" />
              <Tag k="Must lead team" v={parsed.must_lead_team ? "yes" : "no"} kind="hard" />
              {parsed.soft.map((sc) => <Tag key={sc} k="Fit" v={sc} kind="soft" />)}
            </div>
            <div style={cs.legend}>
              <span><span style={{ ...cs.dot, background: "#0F6E56" }} /> hard filter — must match</span>
              <span><span style={{ ...cs.dot, background: "#534AB7" }} /> soft criteria — used for ranking</span>
            </div>
          </div>
        )}

        {error && <div style={cs.error}>{error}</div>}

        {stage === "done" && !results.length && !error && (
          <div style={cs.empty}>No candidates meet the hard requirements. Loosen the constraints — fewer years, or a wider location.</div>
        )}

        <div style={cs.results}>
          {results.map((c, i) => {
            const savedRoles = savedRolesFor(c.id);
            const stObj = STATUSES.find((x) => x.key === c.status);
            return (
            <div key={c.id} style={cs.card}>
              <div style={cs.rank}>{i + 1}</div>
              <div style={{ flex: 1, cursor: "pointer" }} onClick={() => setSelectedId(c.id)}>
                <div style={cs.cardTop}>
                  <div>
                    <div style={cs.nameRow}>
                      <span style={cs.name}>{c.locked ? "🔒 Verify to reveal" : c.full_name}</span>
                      <span style={cs.levelPill}>{c.level}</span>
                    </div>
                    <div style={cs.meta}>{c.title} · {c.years} yrs · {c.locked ? c.region : c.current_city}</div>
                  </div>
                  <FitBadge score={c.similarity} />
                </div>
                {c.reason && <div style={cs.reason}>{c.reason}</div>}
                <div style={cs.cardFooter}>
                  {stObj && <span style={{ ...cs.statusPill, color: stObj.color, background: stObj.bg }}>{stObj.label}</span>}
                  <span style={cs.salaryText}>{c.locked ? `Salary band: ${c.salaryBand}` : `IDR ${c.exp_salary} jt/mo`}</span>
                </div>
              </div>
              <div style={cs.cardActions}>
                <button style={{ ...cs.saveBtn, ...(savedRoles.length ? cs.saveBtnActive : {}) }}
                  onClick={(e) => { e.stopPropagation(); setSaveMenuFor(saveMenuFor === c.id ? null : c.id); }}>
                  {savedRoles.length ? `Saved · ${savedRoles.length}` : "Save"}
                </button>
                {saveMenuFor === c.id && (
                  <SaveMenu roles={roles} saved={savedRoles}
                    onToggle={(rid) => toggleSave(c.id, rid)}
                    onClose={() => setSaveMenuFor(null)} />
                )}
              </div>
            </div>
            );
          })}
        </div>
        </>
        )}

        {view === "saved" && (
          <SavedView roles={roles} saved={saved}
            onOpen={(id) => setSelectedId(id)} onAddRole={addRole} />
        )}

        {selectedId && getCandidate(selectedId) && (
          <DetailPanel
            c={getCandidate(selectedId)}
            roles={roles} savedRoles={savedRolesFor(selectedId)}
            onToggleSave={(rid) => toggleSave(selectedId, rid)}
            onClose={() => setSelectedId(null)}
            coverLetter={coverLetters[selectedId]}
            clLoading={clLoading}
            onGenCoverLetter={() => genCoverLetter(selectedId)}
          />
        )}
      </div>
    </div>
  );
}

function SaveMenu({ roles, saved, onToggle, onClose }) {
  return (
    <>
      <div style={cs.menuBackdrop} onClick={onClose} />
      <div style={cs.saveMenu} onClick={(e) => e.stopPropagation()}>
        <div style={cs.saveMenuTitle}>Save to role</div>
        {roles.length === 0 && <div style={cs.saveMenuEmpty}>No roles yet. Create one on the Saved tab first.</div>}
        {roles.map((r) => (
          <label key={r.id} style={cs.saveMenuRow}>
            <input type="checkbox" checked={saved.includes(r.id)} onChange={() => onToggle(r.id)} />
            <span>{r.name}</span>
          </label>
        ))}
      </div>
    </>
  );
}

function SavedView({ roles, saved, onOpen, onAddRole }) {
  const [newRole, setNewRole] = useState("");
  const byRole = roles.map((r) => ({
    role: r,
    entries: saved.filter((s) => s.roleId === r.id && s.candidate),
  }));
  const anySaved = saved.length > 0;
  return (
    <div>
      <header style={cs.header}>
        <h1 style={cs.h1}>Saved roles</h1>
        <p style={cs.sub}>Candidates you've shortlisted, grouped by the role you're hiring for. A candidate can sit in more than one role.</p>
      </header>
      <div style={cs.newRoleRow}>
        <input style={cs.input} placeholder="Create a new role, e.g. Area Manager — East Java" value={newRole}
          onChange={(e) => setNewRole(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && newRole.trim()) { onAddRole(newRole.trim()); setNewRole(""); } }} />
        <button style={cs.btn} disabled={!newRole.trim()} onClick={() => { if (newRole.trim()) { onAddRole(newRole.trim()); setNewRole(""); } }}>Create role</button>
      </div>
      {!anySaved && <div style={cs.empty}>No candidates saved yet. Run a search and hit Save on a candidate to add them to a role.</div>}
      {byRole.map((g) => (
        <div key={g.role.id} style={cs.roleGroup}>
          <div style={cs.roleHead}>{g.role.name} <span style={cs.roleCount}>{g.entries.length}</span></div>
          {g.entries.length === 0 && <div style={cs.roleEmpty}>No candidates yet.</div>}
          {g.entries.map(({ candidate: c }) => {
            const stObj = STATUSES.find((x) => x.key === c.status);
            return (
              <div key={c.id} style={cs.savedRow} onClick={() => onOpen(c.id)}>
                <div>
                  <div style={cs.nameRow}><span style={cs.name}>{c.locked ? "🔒 Verify to reveal" : c.full_name}</span><span style={cs.levelPill}>{c.level}</span></div>
                  <div style={cs.meta}>{c.title} · {c.locked ? c.region : c.current_city}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  {stObj && <div style={{ ...cs.statusPill, color: stObj.color, background: stObj.bg, display: "inline-block" }}>{stObj.label}</div>}
                  <div style={cs.salaryText}>{c.locked ? `Band: ${c.salaryBand}` : `IDR ${c.exp_salary} jt/mo`}</div>
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function DetailPanel({ c, roles, savedRoles, onToggleSave, onClose, coverLetter, clLoading, onGenCoverLetter }) {
  const stObj = STATUSES.find((x) => x.key === c.status);
  const [cvBusy, setCvBusy] = useState(false);

  const previewCv = async () => {
    setCvBusy(true);
    try {
      const { url } = await authedFetch("/api/cv-url", { method: "POST", body: JSON.stringify({ candidateId: c.id }) });
      window.open(url, "_blank", "noopener");
    } catch (e) {
      alert(e.message || "Couldn't open that CV.");
    }
    setCvBusy(false);
  };

  return (
    <>
      <div style={cs.overlay} onClick={onClose} />
      <div style={cs.panel}>
        <div style={cs.panelHead}>
          <div>
            <div style={cs.nameRow}><span style={cs.panelName}>{c.locked ? "🔒 Verify to reveal" : c.full_name}</span><span style={cs.levelPill}>{c.level}</span></div>
            <div style={cs.meta}>{c.title} · {c.years} yrs · {c.locked ? c.region : c.current_city}</div>
          </div>
          <button style={cs.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div style={cs.panelBody}>
          {c.locked && (
            <div style={{ ...s.gateBar, marginTop: 0, marginBottom: 20 }}>
              <span style={s.badgeLock}>🔒 Locked</span>
              <span style={{ fontSize: 13, color: "#2C4A6B" }}>Verify your workspace to see this candidate's name, exact salary, city, contact, and CV.</span>
            </div>
          )}

          <Section title="Background">
            <p style={cs.panelSummary}>{c.summary}</p>
          </Section>

          {stObj && (
            <Section title="Availability">
              <div style={cs.roView}>
                <div style={cs.roItem}>
                  <span style={cs.roLabel}>Status</span>
                  <span style={{ ...cs.roPill, color: stObj.color, background: stObj.bg }}>{stObj.label}</span>
                </div>
                <div style={cs.roItem}>
                  <span style={cs.roLabel}>{c.locked ? "Salary band" : "Expected salary"}</span>
                  <span style={cs.roValue}>{c.locked ? c.salaryBand : `IDR ${c.exp_salary} jt/mo`}</span>
                </div>
              </div>
            </Section>
          )}

          {!c.locked && (
            <Section title="Contact & CV">
              <div style={cs.roView}>
                <div style={cs.roItem}>
                  <span style={cs.roLabel}>Email</span>
                  <span style={cs.roValue}>{c.email || "—"}</span>
                </div>
                <div style={cs.roItem}>
                  <span style={cs.roLabel}>Phone</span>
                  <span style={cs.roValue}>{c.phone || "—"}</span>
                </div>
              </div>
              {c.cv_url && <button style={cs.cvPreviewBtn} onClick={previewCv} disabled={cvBusy}>📄 {cvBusy ? "Opening…" : `Preview CV — ${c.cv_filename || "CV"}`}</button>}
            </Section>
          )}

          {!c.locked && (
            <Section title="Outreach cover letter">
              {coverLetter
                ? <p style={cs.panelSummary}>{coverLetter}</p>
                : <button style={cs.genBtnSmall} onClick={onGenCoverLetter} disabled={clLoading}>{clLoading ? "Writing…" : "Generate a cover letter"}</button>}
            </Section>
          )}

          <Section title="Save to roles">
            <div style={cs.detailRoles}>
              {roles.length === 0 && <div style={cs.saveMenuEmpty}>No roles yet. Create one on the Saved tab first.</div>}
              {roles.map((r) => (
                <label key={r.id} style={cs.saveMenuRow}>
                  <input type="checkbox" checked={savedRoles.includes(r.id)} onChange={() => onToggleSave(r.id)} />
                  <span>{r.name}</span>
                </label>
              ))}
            </div>
          </Section>
        </div>
      </div>
    </>
  );
}

function Section({ title, children }) {
  return (
    <div style={cs.section}>
      <div style={cs.sectionTitle}>{title}</div>
      {children}
    </div>
  );
}

function Step({ label, active, done }) {
  return (
    <div style={{
      ...st.step,
      borderColor: active ? "#BA7517" : done ? "#0F6E56" : "#D3D1C7",
      color: active ? "#854F0B" : done ? "#0F6E56" : "#888780",
      background: active ? "#FAEEDA" : done ? "#E1F5EE" : "#fff",
    }}>
      {done ? "✓ " : ""}{label}
    </div>
  );
}

function Tag({ k, v, kind }) {
  const c = kind === "hard" ? { bg: "#E1F5EE", fg: "#0F6E56" } : { bg: "#EEEDFE", fg: "#3C3489" };
  return <span style={{ ...st.tag, background: c.bg, color: c.fg }}><b style={{ fontWeight: 500 }}>{k}:</b> {String(v)}</span>;
}

function FitBadge({ score }) {
  score = score ?? 0;
  const pct = Math.round(score * 100);
  const strong = score >= 0.66, mid = score >= 0.33;
  const c = strong ? { bg: "#E1F5EE", fg: "#0F6E56" } : mid ? { bg: "#FAEEDA", fg: "#854F0B" } : { bg: "#F1EFE8", fg: "#5F5E5A" };
  const label = strong ? "Strong fit" : mid ? "Partial fit" : "Weak fit";
  return <span style={{ ...st.fit, background: c.bg, color: c.fg }}>{label} · {pct}%</span>;
}

const cs = {
  page: { fontFamily: "ui-sans-serif, system-ui, sans-serif", background: "#FAF9F5", minHeight: "100vh", padding: "32px 16px", color: "#2C2C2A" },
  wrap: { maxWidth: 720, margin: "0 auto" },
  header: { marginBottom: 24 },
  h1: { fontSize: 28, fontWeight: 600, margin: "0 0 8px", letterSpacing: "-0.02em" },
  sub: { fontSize: 15, lineHeight: 1.6, color: "#5F5E5A", margin: 0, maxWidth: 560 },
  searchRow: { display: "flex", gap: 8, marginBottom: 12 },
  input: { flex: 1, padding: "12px 14px", fontSize: 15, border: "1px solid #D3D1C7", borderRadius: 10, outline: "none", background: "#fff", fontFamily: "inherit" },
  btn: { padding: "12px 22px", fontSize: 15, fontWeight: 500, color: "#fff", background: "#1D9E75", border: "none", borderRadius: 10, cursor: "pointer" },
  btnBusy: { background: "#9FE1CB", cursor: "default" },
  examples: { display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 24 },
  chip: { padding: "7px 12px", fontSize: 13, color: "#5F5E5A", background: "#fff", border: "1px solid #D3D1C7", borderRadius: 999, cursor: "pointer", fontFamily: "inherit", textAlign: "left" },
  flow: { display: "flex", alignItems: "center", gap: 10, marginBottom: 20 },
  flowArrow: { color: "#B4B2A9", fontSize: 16 },
  parsedBox: { background: "#fff", border: "1px solid #E4E2DA", borderRadius: 12, padding: 16, marginBottom: 20 },
  parsedTitle: { fontSize: 13, fontWeight: 500, color: "#5F5E5A", marginBottom: 10 },
  tags: { display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 },
  legend: { display: "flex", gap: 16, fontSize: 12, color: "#888780", flexWrap: "wrap" },
  dot: { display: "inline-block", width: 8, height: 8, borderRadius: 999, marginRight: 5, verticalAlign: "middle" },
  error: { background: "#FCEBEB", color: "#A32D2D", padding: 14, borderRadius: 10, fontSize: 14, marginBottom: 16 },
  empty: { background: "#F1EFE8", color: "#5F5E5A", padding: 16, borderRadius: 10, fontSize: 14, marginBottom: 16 },
  results: { display: "flex", flexDirection: "column", gap: 10 },
  card: { display: "flex", gap: 14, background: "#fff", border: "1px solid #E4E2DA", borderRadius: 12, padding: 16 },
  rank: { width: 26, height: 26, borderRadius: 999, background: "#F1EFE8", color: "#5F5E5A", fontSize: 13, fontWeight: 500, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  cardTop: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 },
  nameRow: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" },
  name: { fontSize: 16, fontWeight: 500 },
  levelPill: { fontSize: 11, fontWeight: 500, color: "#5F5E5A", background: "#F1EFE8", padding: "2px 8px", borderRadius: 999 },
  meta: { fontSize: 13, color: "#888780", marginTop: 2 },
  industry: { fontSize: 13, color: "#5F5E5A", marginTop: 6 },
  reason: { fontSize: 14, lineHeight: 1.5, color: "#2C2C2A", marginTop: 8, paddingTop: 8, borderTop: "1px solid #F1EFE8" },

  topbar: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 },
  brand: { fontSize: 14, fontWeight: 600, color: "#0F6E56", letterSpacing: "-0.01em" },
  navToggle: { display: "flex", gap: 4, background: "#F1EFE8", padding: 3, borderRadius: 999 },
  navBtn: { padding: "6px 16px", fontSize: 13, fontWeight: 500, color: "#888780", background: "transparent", border: "none", borderRadius: 999, cursor: "pointer", fontFamily: "inherit" },
  navBtnActive: { background: "#fff", color: "#2C2C2A", boxShadow: "0 1px 2px rgba(0,0,0,0.06)" },

  cardFooter: { display: "flex", alignItems: "center", gap: 10, marginTop: 10, flexWrap: "wrap" },
  statusPill: { fontSize: 12, fontWeight: 500, padding: "3px 10px", borderRadius: 999 },
  salaryText: { fontSize: 12.5, color: "#888780" },
  cardActions: { position: "relative", flexShrink: 0 },
  saveBtn: { padding: "7px 14px", fontSize: 13, fontWeight: 500, color: "#5F5E5A", background: "#fff", border: "1px solid #D3D1C7", borderRadius: 8, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" },
  saveBtnActive: { color: "#0F6E56", background: "#E1F5EE", borderColor: "#9FE1CB" },

  menuBackdrop: { position: "fixed", inset: 0, zIndex: 10 },
  saveMenu: { position: "absolute", right: 0, top: "calc(100% + 6px)", width: 230, background: "#fff", border: "1px solid #E4E2DA", borderRadius: 12, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", padding: 12, zIndex: 20 },
  saveMenuTitle: { fontSize: 12, fontWeight: 500, color: "#888780", marginBottom: 8 },
  saveMenuRow: { display: "flex", alignItems: "center", gap: 8, padding: "6px 0", fontSize: 14, cursor: "pointer" },
  saveMenuNew: { display: "flex", gap: 6, marginTop: 8, paddingTop: 8, borderTop: "1px solid #F1EFE8" },
  saveMenuInput: { flex: 1, padding: "6px 10px", fontSize: 13, border: "1px solid #D3D1C7", borderRadius: 8, outline: "none", fontFamily: "inherit" },
  saveMenuAdd: { padding: "6px 12px", fontSize: 13, fontWeight: 500, color: "#fff", background: "#1D9E75", border: "none", borderRadius: 8, cursor: "pointer", fontFamily: "inherit" },

  newRoleRow: { display: "flex", gap: 8, marginBottom: 24 },
  roleGroup: { marginBottom: 24 },
  roleHead: { fontSize: 15, fontWeight: 600, marginBottom: 10, display: "flex", alignItems: "center", gap: 8 },
  roleCount: { fontSize: 12, fontWeight: 500, color: "#5F5E5A", background: "#F1EFE8", padding: "1px 8px", borderRadius: 999 },
  roleEmpty: { fontSize: 13, color: "#B4B2A9", fontStyle: "italic", paddingLeft: 2 },
  savedRow: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, background: "#fff", border: "1px solid #E4E2DA", borderRadius: 10, padding: "12px 14px", marginBottom: 8, cursor: "pointer" },

  overlay: { position: "fixed", inset: 0, background: "rgba(30,28,24,0.4)", zIndex: 30 },
  panel: { position: "fixed", top: 0, right: 0, bottom: 0, width: "min(460px, 92vw)", background: "#FAF9F5", zIndex: 40, overflowY: "auto", boxShadow: "-8px 0 32px rgba(0,0,0,0.16)" },
  panelHead: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, padding: "24px 24px 16px", borderBottom: "1px solid #E4E2DA", position: "sticky", top: 0, background: "#FAF9F5", zIndex: 1 },
  panelName: { fontSize: 20, fontWeight: 600 },
  closeBtn: { width: 32, height: 32, border: "1px solid #D3D1C7", background: "#fff", borderRadius: 8, cursor: "pointer", fontSize: 14, color: "#5F5E5A", flexShrink: 0 },
  panelBody: { padding: 24 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 12, fontWeight: 600, color: "#888780", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 10 },
  panelIndustry: { fontSize: 14, color: "#0F6E56", fontWeight: 500, marginBottom: 6 },
  roView: { display: "flex", flexDirection: "column", gap: 12 },
  roItem: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 },
  roLabel: { fontSize: 13, color: "#888780" },
  roValue: { fontSize: 14, fontWeight: 500, color: "#2C2C2A" },
  roPill: { fontSize: 12.5, fontWeight: 500, padding: "4px 12px", borderRadius: 999 },
  saveMenuEmpty: { fontSize: 13, color: "#888780", fontStyle: "italic", padding: "4px 0" },
  cvLink: { fontSize: 14, fontWeight: 500, color: "#0F6E56", cursor: "pointer", textDecoration: "none" },
  cvPreviewBtn: { marginTop: 12, width: "100%", padding: "10px 14px", fontSize: 13.5, fontWeight: 500, color: "#0F6E56", background: "#E1F5EE", border: "none", borderRadius: 9, cursor: "pointer", fontFamily: "inherit" },
  cvOverlay: { position: "fixed", inset: 0, background: "rgba(30,28,24,0.5)", zIndex: 60 },
  cvModal: { position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: "min(560px, 94vw)", maxHeight: "88vh", background: "#fff", borderRadius: 16, zIndex: 70, display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 24px 60px rgba(0,0,0,0.28)" },
  cvModalHead: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 18px", borderBottom: "1px solid #E4E2DA" },
  cvModalTitle: { fontSize: 14, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  cvClose: { width: 30, height: 30, borderRadius: 8, border: "1px solid #D3D1C7", background: "#fff", color: "#5F5E5A", fontSize: 14, cursor: "pointer", flexShrink: 0 },
  cvModalBody: { padding: 20, overflowY: "auto", background: "#F4F2EC" },
  cvPage: { background: "#fff", borderRadius: 8, padding: "28px 30px", boxShadow: "0 2px 12px rgba(0,0,0,0.08)", maxWidth: 460, margin: "0 auto" },
  cvDocName: { fontSize: 20, fontWeight: 700, letterSpacing: "-0.01em" },
  cvDocRole: { fontSize: 13, color: "#5F5E5A", marginTop: 3 },
  cvDocContact: { fontSize: 12, color: "#888780", marginTop: 3 },
  cvDocLine: { height: 1, background: "#E4E2DA", margin: "16px 0" },
  cvDocSection: { fontSize: 11, fontWeight: 700, color: "#888780", letterSpacing: "0.06em", marginTop: 16, marginBottom: 6 },
  cvDocText: { fontSize: 12.5, color: "#2C2C2A", lineHeight: 1.5, marginBottom: 6 },
  cvPreviewNote: { fontSize: 11.5, color: "#888780", fontStyle: "italic", marginTop: 20, paddingTop: 12, borderTop: "1px solid #F1EFE8" },
  panelSummary: { fontSize: 14, lineHeight: 1.6, color: "#2C2C2A", margin: "0 0 10px" },
  langs: { display: "flex", gap: 6, flexWrap: "wrap" },
  langPill: { fontSize: 12, color: "#5F5E5A", background: "#F1EFE8", padding: "3px 10px", borderRadius: 999 },
  statusGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 },
  statusChoice: { padding: "10px 12px", fontSize: 13, color: "#5F5E5A", background: "#fff", border: "1px solid #D3D1C7", borderRadius: 10, cursor: "pointer", fontFamily: "inherit", textAlign: "left" },
  noticeRow: { display: "flex", flexDirection: "column", gap: 8 },
  fieldLabel: { fontSize: 13, color: "#5F5E5A", fontWeight: 500 },
  noticeOpts: { display: "flex", gap: 6, flexWrap: "wrap" },
  noticeChip: { padding: "6px 12px", fontSize: 13, color: "#5F5E5A", background: "#fff", border: "1px solid #D3D1C7", borderRadius: 999, cursor: "pointer", fontFamily: "inherit" },
  noticeChipActive: { color: "#3C3489", background: "#EEEDFE", borderColor: "#C7C2F0" },
  salaryEdit: { display: "flex", alignItems: "center", gap: 8 },
  salaryInput: { width: 80, padding: "8px 10px", fontSize: 14, border: "1px solid #D3D1C7", borderRadius: 8, outline: "none", fontFamily: "inherit" },
  salaryDash: { color: "#888780" },
  salaryUnit: { fontSize: 13, color: "#888780" },
  detailRoles: { marginBottom: 4 },
  genBtn: { padding: "10px 16px", fontSize: 14, fontWeight: 500, color: "#fff", background: "#1D9E75", border: "none", borderRadius: 10, cursor: "pointer", fontFamily: "inherit" },
  genBtnSmall: { marginTop: 8, padding: "7px 14px", fontSize: 13, fontWeight: 500, color: "#5F5E5A", background: "#fff", border: "1px solid #D3D1C7", borderRadius: 8, cursor: "pointer", fontFamily: "inherit" },
  clLoading: { fontSize: 14, color: "#888780", fontStyle: "italic" },
  clText: { width: "100%", boxSizing: "border-box", padding: 12, fontSize: 13.5, lineHeight: 1.6, color: "#2C2C2A", border: "1px solid #E4E2DA", borderRadius: 10, background: "#fff", fontFamily: "inherit", resize: "vertical" },
};

const st = {
  step: { padding: "6px 12px", fontSize: 13, fontWeight: 500, border: "1px solid", borderRadius: 999 },
  tag: { padding: "4px 10px", fontSize: 12.5, borderRadius: 999 },
  fit: { padding: "4px 10px", fontSize: 12, fontWeight: 500, borderRadius: 999, whiteSpace: "nowrap", flexShrink: 0 },
};


