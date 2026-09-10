// The verified-HR gate. Unverified workspaces must never receive sensitive
// candidate fields over the wire — this strips them server-side before the
// JSON response is built. Blurring in the UI is not protection.

const REGION_BY_PROVINCE_HINT = [
  { match: /sumat|riau|medan|padang|palembang|batam|jambi|lampung/i, region: "Sumatra" },
  { match: /jakarta|bogor|depok|bekasi|tangerang|bandung|cimahi|cirebon|semarang|yogya|jogja|solo|surakarta|surabaya|malang|sidoarjo|jawa|java/i, region: "Java" },
  { match: /denpasar|bali|canggu/i, region: "Bali" },
  { match: /makassar|manado|sulawesi/i, region: "Sulawesi" },
  { match: /balikpapan|samarinda|pontianak|banjarmasin|kalimantan/i, region: "Kalimantan" },
];

export function coarseRegion(city) {
  if (!city) return "Indonesia";
  const hit = REGION_BY_PROVINCE_HINT.find((r) => r.match.test(city));
  return hit ? hit.region : "Indonesia";
}

const SALARY_BANDS_ORDER = ["< 5", "5–10", "10–15", "15–20", "20–30", "30–50", "50–75", "75–100", "100+"];
export function coarseSalaryBand(band) {
  const i = SALARY_BANDS_ORDER.indexOf(band);
  if (i < 0) return "mid";
  if (i <= 2) return "junior";
  if (i <= 5) return "mid";
  return "senior";
}

// Seniority bucket, derived from years — there's no `level` column, this is
// display-only and never sensitive, so it's safe to include either branch.
export function levelFromYears(years) {
  if (years == null) return "—";
  if (years < 4) return "Staff";
  if (years < 7) return "Senior / Supervisor";
  if (years < 11) return "Manager";
  if (years < 15) return "Senior Manager / Head";
  return "Director / VP";
}

// Applies the gate to one search result row. `verified` = the caller's workspace.is_verified.
export function applyVerifiedGate(row, verified) {
  const level = levelFromYears(row.years);
  if (verified) return { ...row, level, locked: false };
  return {
    id: row.id,
    title: row.title,
    years: row.years,
    level,
    region: coarseRegion(row.current_city),
    salaryBand: coarseSalaryBand(row.exp_salary),
    summary: row.summary,
    similarity: row.similarity,
    reason: row.reason,
    locked: true,
  };
}
