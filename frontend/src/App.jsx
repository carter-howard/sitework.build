import { useState, useCallback } from "react";

// ─── Config ──────────────────────────────────────────────────────────────────
const WORKER = import.meta.env.VITE_WORKER_URL || "https://places.sitework.build";

// ─── Design tokens ───────────────────────────────────────────────────────────
const C = {
  bg: "#0D0D0D",
  surface: "#141414",
  border: "#1F1F1F",
  green: "#5A6B46",
  greenBright: "#7A9B5A",
  text: "#E8E8E8",
  muted: "#888",
  dim: "#555",
  red: "#C0392B",
  yellow: "#D4A017",
};

const S = {
  card: { background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: 20, marginBottom: 16 },
  label: { color: C.muted, fontSize: 10, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", marginBottom: 6, display: "block" },
  input: { width: "100%", background: "#0D0D0D", border: `1px solid ${C.border}`, borderRadius: 6, color: C.text, fontSize: 13, padding: "10px 12px", outline: "none" },
  btn: (variant = "primary") => ({
    background: variant === "primary" ? C.green : "transparent",
    border: `1px solid ${variant === "primary" ? C.green : C.border}`,
    borderRadius: 6, color: C.text, cursor: "pointer", fontSize: 12, fontWeight: 700,
    letterSpacing: ".06em", padding: "10px 20px", textTransform: "uppercase",
  }),
};

const DIMENSIONS = [
  { key: "googleProfile", label: "Google Profile" },
  { key: "reputation", label: "Reputation" },
  { key: "website", label: "Website" },
  { key: "localSeo", label: "Local SEO" },
  { key: "conversion", label: "Conversion" },
  { key: "trust", label: "Trust" },
  { key: "content", label: "Content" },
  { key: "social", label: "Social" },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────
const scoreColor = (n) => (n >= 70 ? C.greenBright : n >= 45 ? C.yellow : C.red);

function ScoreNum({ value, max = 100, size = 22 }) {
  return (
    <span style={{ color: scoreColor(value), fontWeight: 800, fontSize: size }}>
      {value}
      <span style={{ color: C.dim, fontWeight: 400, fontSize: size * 0.55 }}>/{max}</span>
    </span>
  );
}

function Badge({ children, color }) {
  return (
    <span style={{ background: `${color}22`, border: `1px solid ${color}44`, borderRadius: 4, color, fontSize: 9, fontWeight: 700, letterSpacing: ".08em", padding: "2px 7px", textTransform: "uppercase" }}>
      {children}
    </span>
  );
}

function Stars({ rating }) {
  if (!rating) return null;
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5;
  return (
    <span style={{ color: "#F5C518", fontSize: 13 }}>
      {"★".repeat(full)}{half ? "½" : ""}{"☆".repeat(Math.max(0, 5 - full - (half ? 1 : 0)))}
      <span style={{ color: C.muted, fontSize: 11, marginLeft: 4 }}>{rating.toFixed(1)}</span>
    </span>
  );
}

function Bar({ value, benchmark }) {
  const pct = Math.min(100, Math.max(0, value));
  return (
    <div style={{ background: C.border, borderRadius: 3, height: 5, width: "100%", marginTop: 6, position: "relative" }}>
      <div style={{ background: scoreColor(pct), borderRadius: 3, height: 5, width: `${pct}%`, transition: "width .4s" }} />
      {benchmark != null && (
        <div style={{ position: "absolute", top: -2, left: `${Math.min(100, benchmark)}%`, width: 2, height: 9, background: C.text, opacity: 0.6 }} title={`Competitor avg: ${benchmark}`} />
      )}
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ color: C.dim, fontSize: 9, fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase", marginBottom: 10, borderBottom: `1px solid ${C.border}`, paddingBottom: 6 }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function Delta({ value }) {
  if (value == null) return null;
  const color = value > 0 ? C.greenBright : value < 0 ? C.red : C.muted;
  return <span style={{ color, fontSize: 10, marginLeft: 5, fontWeight: 700 }}>{value > 0 ? `+${value}` : value}</span>;
}

const DIMENSION_EXPLAINERS = {
  googleProfile: "Completeness of the Google Business Profile — hours, photos, phone, website link. Drives local pack visibility.",
  reputation: "Review count and rating vs the local market. The #1 trust signal homeowners check.",
  website: "Whether a site exists and converts — click-to-call, forms, booking, schema.",
  localSeo: "How findable the site is for local service searches — titles, headings, schema, content depth.",
  conversion: "How easily a visitor becomes a phone call — CTAs, emergency messaging, booking, financing.",
  trust: "License, insurance, BBB, and credibility signals that close the deal.",
  content: "Depth of service content. Thin content can't rank for service keywords.",
  social: "Facebook, Instagram, Yelp presence — citation consistency and social proof.",
};

// ─── Report builder ───────────────────────────────────────────────────────────
function buildReport(d) {
  const p = d.prospect || {};
  const ps = d.comparison?.prospect || {};
  const ca = d.comparison?.competitorAverage || {};
  const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const slug = (p.name || "prospect").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  const rows = DIMENSIONS.map(({ key, label }) =>
    `<tr><td>${esc(label)}</td><td>${esc(ps[key] ?? "—")}</td><td>${esc(ca[key] ?? "—")}</td></tr>`
  ).join("");
  const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"/>
<title>SITEWORK Report — ${esc(p.name)}</title>
<style>
body{font-family:system-ui,sans-serif;background:#0D0D0D;color:#E8E8E8;padding:40px;max-width:900px;margin:0 auto}
h1{color:#7A9B5A;font-size:22px;margin-bottom:4px}
h2{color:#888;font-size:11px;letter-spacing:.1em;text-transform:uppercase;margin-bottom:24px}
.card{background:#141414;border:1px solid #1F1F1F;border-radius:8px;padding:20px;margin-bottom:16px}
.label{color:#555;font-size:10px;letter-spacing:.1em;text-transform:uppercase;margin-bottom:4px}
.val{color:#E8E8E8;font-size:14px}
.hook{background:#0D1A0D;border-left:3px solid #5A6B46;padding:14px 18px;border-radius:0 6px 6px 0;font-size:13px;line-height:1.6;white-space:pre-wrap}
table{width:100%;border-collapse:collapse;font-size:12px}
td,th{padding:6px 10px;border-bottom:1px solid #1F1F1F;text-align:left}
th{color:#888;font-size:10px;text-transform:uppercase;letter-spacing:.08em}
li{font-size:13px;line-height:1.8}
</style></head><body>
<h1>${esc(p.name)}</h1>
<h2>SITEWORK Prospect Intelligence Report</h2>
<div class="card">
  <div class="label">Business</div><div class="val">${esc(p.name)} · ${esc(p.address)}</div>
  <div class="label" style="margin-top:12px">Reviews</div><div class="val">${esc(p.reviewCount)} reviews · ${esc(p.rating)}★</div>
  <div class="label" style="margin-top:12px">SITEWORK Opportunity</div><div class="val">${esc(d.comparison?.siteworkOpportunity ?? "—")}/100</div>
  <div class="label" style="margin-top:12px">Ghost Score</div><div class="val">${esc(ps.ghost ?? "—")}/100</div>
</div>
<div class="card">
  <div class="label">Scorecard vs Competitor Average</div>
  <table><tr><th>Dimension</th><th>Prospect</th><th>Competitor Avg</th></tr>${rows}</table>
</div>
<div class="card">
  <div class="label">Opportunities</div>
  <ul>${(d.opportunities ?? []).map((o) => `<li>${esc(o)}</li>`).join("")}</ul>
</div>
<div class="card">
  <div class="label">Build Plan</div>
  <ul>${(d.buildPlan ?? []).map((o) => `<li>${esc(o)}</li>`).join("")}</ul>
</div>
${d.narrative?.hook ? `<div class="card"><div class="label">Cold Call Hook</div><div class="hook">${esc(d.narrative.hook)}</div></div>` : ""}
${d.narrative?.coldEmail ? `<div class="card"><div class="label">Cold Email</div><div class="hook">${esc(d.narrative.coldEmail)}</div></div>` : ""}
<p style="color:#333;font-size:10px;margin-top:32px">Generated by SITEWORK · sitework.build</p>
</body></html>`;
  return { slug, html };
}

// ─── Main App ─────────────────────────────────────────────────────────────────
const TABS = ["Overview", "Competitive", "Game Plan", "Outreach"];

export default function App() {
  const [url, setUrl] = useState("");
  const [email, setEmail] = useState("");
  const [emailGated, setEmailGated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState("Overview");

  const analyze = useCallback(async () => {
    if (!url.trim()) return;
    setLoading(true);
    setError(null);
    setData(null);
    setStatus("Resolving business profile…");
    console.log("[SITEWORK] URL submitted:", url.trim());

    try {
      setStatus("Pulling live GBP data, crawling site, scoring vs competitors… (~30s)");
      const res = await fetch(`${WORKER}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gbpUrl: url.trim() }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Worker returned ${res.status}`);
      }
      const result = await res.json();
      setData(result);
      setStatus("");
      setTab("Overview");
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [url]);

  const handleEmailGate = useCallback(() => {
    if (!email.trim()) return;
    console.log("[SITEWORK] Email captured:", email.trim());
    setEmailGated(true);
  }, [email]);

  const downloadReport = useCallback(() => {
    if (!data) return;
    const { slug, html } = buildReport(data);
    const blob = new Blob([html], { type: "text/html" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `sitework-${slug}.html`;
    a.click();
  }, [data]);

  // ── Mapped fields from Worker response ──────────────────────────────────────
  const prospect = data?.prospect || {};
  const ps = data?.comparison?.prospect || {};            // prospect scores
  const ca = data?.comparison?.competitorAverage || {};   // competitor avg scores
  const compScores = data?.comparison?.competitors || []; // scored competitors
  const compInfo = data?.competitors || [];               // basic competitor info
  const topComp = data?.comparison?.topCompetitor || null;
  const opportunity = data?.comparison?.siteworkOpportunity;
  const gaps = data?.comparison?.gaps || [];
  const narrative = data?.narrative || null;
  const city = (prospect.address || "").split(",").slice(1, 2).join("").trim();

  // merge competitor info + scores by placeId
  const competitors = compScores.map((cs) => {
    const info = compInfo.find((c) => c.placeId === cs.placeId) || {};
    return { ...info, ...cs };
  });

  return (
    <div style={{ background: C.bg, minHeight: "100vh", color: C.text, fontFamily: "'Montserrat', 'Segoe UI', sans-serif" }}>
      <div style={{ borderBottom: `1px solid ${C.border}`, padding: "16px 24px", display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ color: C.green, fontWeight: 900, fontSize: 15, letterSpacing: ".12em", textTransform: "uppercase" }}>SITEWORK</span>
        <span style={{ color: C.dim, fontSize: 11 }}>|</span>
        <span style={{ color: C.muted, fontSize: 11, letterSpacing: ".06em", textTransform: "uppercase" }}>Prospect Analyzer</span>
      </div>

      <div style={{ maxWidth: 1020, margin: "0 auto", padding: "32px 24px" }}>
        {/* Input */}
        <div style={S.card}>
          <label style={S.label}>Google Business Profile URL or Maps Link</label>
          <div style={{ display: "flex", gap: 10 }}>
            <input
              style={S.input}
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && analyze()}
              placeholder="https://maps.app.goo.gl/... or maps.google.com/?cid=..."
              disabled={loading}
            />
            <button style={{ ...S.btn("primary"), whiteSpace: "nowrap", opacity: loading ? 0.6 : 1 }} onClick={analyze} disabled={loading || !url.trim()}>
              {loading ? "Analyzing…" : "Analyze"}
            </button>
          </div>
          {status && <div style={{ color: C.muted, fontSize: 11, marginTop: 8 }}>{status}</div>}
          {error && <div style={{ color: C.red, fontSize: 12, marginTop: 8 }}>⚠ {error}</div>}
        </div>

        {data && !emailGated && (
          <div style={{ ...S.card, background: "#0D1A0D", border: `1px solid ${C.green}44` }}>
            <div style={{ filter: "blur(4px)", pointerEvents: "none", marginBottom: 12 }}>
              <div style={{ color: C.text, fontSize: 16, fontWeight: 700 }}>{prospect.name}</div>
              <div style={{ color: C.muted, fontSize: 12 }}>{prospect.reviewCount} reviews · {prospect.rating}★ · Opportunity {opportunity}/100</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ color: C.text, fontSize: 13, fontWeight: 700, marginBottom: 4 }}>Enter your email to unlock the full report</div>
              <div style={{ color: C.muted, fontSize: 11, marginBottom: 14 }}>Free. No spam. Just the intelligence.</div>
              <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
                <input style={{ ...S.input, maxWidth: 280 }} value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleEmailGate()} placeholder="you@email.com" type="email" />
                <button style={S.btn("primary")} onClick={handleEmailGate}>Unlock</button>
              </div>
            </div>
          </div>
        )}

        {data && emailGated && (
          <>
            {prospect.matchWarning && (
              <div style={{ background: "#1A1608", border: `1px solid ${C.yellow}44`, borderRadius: 6, padding: "10px 14px", marginBottom: 16, color: C.yellow, fontSize: 12 }}>
                ⚠ {prospect.matchWarning}
              </div>
            )}

            {/* Business header */}
            <div style={{ ...S.card, display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 800, color: C.text, marginBottom: 4 }}>{prospect.name}</div>
                <div style={{ color: C.muted, fontSize: 12, marginBottom: 8 }}>{prospect.address}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                  <Stars rating={prospect.rating} />
                  <span style={{ color: C.muted, fontSize: 12 }}>{(prospect.reviewCount || 0).toLocaleString()} reviews</span>
                  <Badge color={C.greenBright}>LIVE GBP DATA</Badge>
                  {prospect.website ? <Badge color={C.greenBright}>HAS SITE</Badge> : <Badge color={C.red}>NO SITE</Badge>}
                </div>
              </div>
              <button style={S.btn("secondary")} onClick={downloadReport}>↓ Download Report</button>
            </div>

            {/* Headline scores */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px,1fr))", gap: 10, marginBottom: 16 }}>
              <div style={{ ...S.card, marginBottom: 0, background: "#0D1A0D", border: `1px solid ${C.green}44` }}>
                <div style={{ color: C.greenBright, fontSize: 9, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", marginBottom: 6 }}>SITEWORK Opportunity</div>
                <ScoreNum value={opportunity ?? 0} size={32} />
                <div style={{ color: C.muted, fontSize: 10, marginTop: 6, lineHeight: 1.5 }}>How much upside SITEWORK can unlock. 60+ = strong prospect.</div>
              </div>
              <div style={{ ...S.card, marginBottom: 0 }}>
                <div style={{ color: C.muted, fontSize: 9, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", marginBottom: 6 }}>Ghost Score</div>
                <ScoreNum value={ps.ghost ?? 0} size={32} />
                <div style={{ color: C.muted, fontSize: 10, marginTop: 6, lineHeight: 1.5 }}>How invisible they are online. Higher = bigger gap between real reputation and digital presence.</div>
              </div>
              <div style={{ ...S.card, marginBottom: 0 }}>
                <div style={{ color: C.muted, fontSize: 9, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", marginBottom: 6 }}>Overall vs Market</div>
                <div style={{ display: "flex", alignItems: "baseline" }}>
                  <ScoreNum value={ps.overall ?? 0} size={32} />
                  <Delta value={(ps.overall ?? 0) - (ca.overall ?? 0)} />
                </div>
                <div style={{ color: C.muted, fontSize: 10, marginTop: 6, lineHeight: 1.5 }}>Competitor average: {ca.overall ?? "—"}/100</div>
              </div>
            </div>

            {/* Tabs */}
            <div style={{ display: "flex", gap: 4, marginBottom: 20, borderBottom: `1px solid ${C.border}` }}>
              {TABS.map((t) => (
                <button key={t} onClick={() => setTab(t)} style={{ background: "transparent", border: "none", borderBottom: `2px solid ${tab === t ? C.green : "transparent"}`, color: tab === t ? C.text : C.muted, cursor: "pointer", fontSize: 11, fontWeight: 700, letterSpacing: ".06em", padding: "8px 14px 10px", textTransform: "uppercase" }}>
                  {t}
                </button>
              ))}
            </div>

            {/* ── OVERVIEW ── */}
            {tab === "Overview" && (
              <div>
                <Section title="Scorecard — every dimension vs competitor average (white tick = market avg)">
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px,1fr))", gap: 10 }}>
                    {DIMENSIONS.map(({ key, label }) => (
                      <div key={key} style={{ ...S.card, padding: 14, marginBottom: 0 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                          <span style={{ color: C.muted, fontSize: 9, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase" }}>{label}</span>
                          <span>
                            <ScoreNum value={ps[key] ?? 0} size={18} />
                            <Delta value={(ps[key] ?? 0) - (ca[key] ?? 0)} />
                          </span>
                        </div>
                        <Bar value={ps[key] ?? 0} benchmark={ca[key]} />
                        <div style={{ color: C.dim, fontSize: 10, marginTop: 8, lineHeight: 1.5 }}>{DIMENSION_EXPLAINERS[key]}</div>
                      </div>
                    ))}
                  </div>
                </Section>

                {data.strengths?.length > 0 && (
                  <Section title="What they're doing right (lead with respect)">
                    {data.strengths.map((s, i) => (
                      <div key={i} style={{ background: "#0D150A", border: `1px solid ${C.greenBright}33`, borderRadius: 5, padding: "10px 14px", marginBottom: 8, color: C.text, fontSize: 12 }}>
                        ✅ {s}
                      </div>
                    ))}
                  </Section>
                )}

                {gaps.length > 0 && (
                  <Section title="Biggest gaps vs market">
                    {gaps.slice(0, 5).map((g, i) => {
                      const dim = DIMENSIONS.find((d) => d.key === g.dimension);
                      return (
                        <div key={i} style={{ background: "#1E0808", border: `1px solid ${C.red}33`, borderRadius: 5, padding: "11px 14px", marginBottom: 8 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                            <span style={{ color: C.text, fontSize: 12, fontWeight: 700 }}>{dim?.label ?? g.dimension}</span>
                            <span style={{ color: C.red, fontSize: 11, fontWeight: 700 }}>−{g.gap} vs market</span>
                          </div>
                          <div style={{ color: C.muted, fontSize: 11 }}>They score {g.prospect}/100. Local average is {g.competitorAvg}/100. {DIMENSION_EXPLAINERS[g.dimension]}</div>
                        </div>
                      );
                    })}
                  </Section>
                )}
              </div>
            )}

            {/* ── COMPETITIVE ── */}
            {tab === "Competitive" && (
              <div>
                {topComp && (
                  <Section title="Market leader">
                    <div style={{ ...S.card, background: "#0D1A0D", border: `1px solid ${C.green}33`, marginBottom: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{topComp.name}</div>
                      <div style={{ color: C.muted, fontSize: 12, marginTop: 4 }}>
                        {topComp.reviewCount?.toLocaleString()} reviews · {topComp.rating}★ — the bar in this market. {prospect.name} has {(prospect.reviewCount || 0).toLocaleString()}, a gap of {Math.max(0, (topComp.reviewCount || 0) - (prospect.reviewCount || 0)).toLocaleString()} reviews.
                      </div>
                    </div>
                  </Section>
                )}

                <Section title="Head-to-head — verified Google data">
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                      <thead>
                        <tr>
                          {["Business", "Reviews", "Rating", "Overall", "GBP", "Rep", "Web", "SEO", "Conv"].map((h) => (
                            <th key={h} style={{ textAlign: h === "Business" ? "left" : "center", color: C.muted, fontWeight: 700, padding: "6px 8px", borderBottom: `1px solid ${C.border}`, fontSize: 10, textTransform: "uppercase", letterSpacing: ".05em" }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        <tr style={{ background: `${C.green}18` }}>
                          <td style={{ padding: "8px", color: C.greenBright, fontWeight: 700, borderBottom: `1px solid ${C.border}` }}>{prospect.name} <Badge color={C.greenBright}>PROSPECT</Badge></td>
                          <td style={{ textAlign: "center", padding: "8px", borderBottom: `1px solid ${C.border}` }}>{(prospect.reviewCount || 0).toLocaleString()}</td>
                          <td style={{ textAlign: "center", padding: "8px", borderBottom: `1px solid ${C.border}` }}>{prospect.rating ? `${prospect.rating}★` : "—"}</td>
                          {["overall", "googleProfile", "reputation", "website", "localSeo", "conversion"].map((k) => (
                            <td key={k} style={{ textAlign: "center", padding: "8px", borderBottom: `1px solid ${C.border}`, color: scoreColor(ps[k] ?? 0), fontWeight: 700 }}>{ps[k] ?? "—"}</td>
                          ))}
                        </tr>
                        {competitors.map((c, i) => (
                          <tr key={i} style={{ background: i % 2 ? "#0A0A0A" : "transparent" }}>
                            <td style={{ padding: "8px", color: C.text, borderBottom: `1px solid ${C.border}` }}>{c.name}</td>
                            <td style={{ textAlign: "center", padding: "8px", color: C.muted, borderBottom: `1px solid ${C.border}` }}>{(c.reviewCount || 0).toLocaleString()}</td>
                            <td style={{ textAlign: "center", padding: "8px", color: C.muted, borderBottom: `1px solid ${C.border}` }}>{c.rating ? `${c.rating}★` : "—"}</td>
                            {["overall", "googleProfile", "reputation", "website", "localSeo", "conversion"].map((k) => (
                              <td key={k} style={{ textAlign: "center", padding: "8px", color: C.muted, borderBottom: `1px solid ${C.border}` }}>
                                {c[k] ?? "—"}<Delta value={(ps[k] ?? 0) - (c[k] ?? 0)} />
                              </td>
                            ))}
                          </tr>
                        ))}
                        <tr>
                          <td style={{ padding: "8px", color: C.dim, fontStyle: "italic", borderBottom: `1px solid ${C.border}` }}>Market average</td>
                          <td style={{ textAlign: "center", padding: "8px", color: C.dim, borderBottom: `1px solid ${C.border}` }}>{data.comparison?.avgReviews?.toLocaleString() ?? "—"}</td>
                          <td style={{ textAlign: "center", padding: "8px", color: C.dim, borderBottom: `1px solid ${C.border}` }}>—</td>
                          {["overall", "googleProfile", "reputation", "website", "localSeo", "conversion"].map((k) => (
                            <td key={k} style={{ textAlign: "center", padding: "8px", color: C.dim, borderBottom: `1px solid ${C.border}` }}>{ca[k] ?? "—"}</td>
                          ))}
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <div style={{ color: C.dim, fontSize: 10, marginTop: 8 }}>Green deltas = prospect leads. Red = competitor leads. All review counts and ratings verified via Google Places API.</div>
                </Section>
              </div>
            )}

            {/* ── GAME PLAN ── */}
            {tab === "Game Plan" && (
              <div>
                <Section title="The opportunity — what's costing them jobs right now">
                  {(data.opportunities ?? []).map((o, i) => (
                    <div key={i} style={{ background: "#1A1608", border: `1px solid ${C.yellow}33`, borderRadius: 5, padding: "11px 14px", marginBottom: 8, color: C.text, fontSize: 12 }}>
                      🎯 {o}
                    </div>
                  ))}
                  {!(data.opportunities ?? []).length && <div style={{ color: C.muted, fontSize: 12 }}>No major gaps found — this prospect is already strong.</div>}
                </Section>

                <Section title="The SITEWORK build plan — how we make them the #1 choice">
                  {(data.buildPlan ?? []).map((step, i) => (
                    <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 5, padding: "12px 14px", marginBottom: 8 }}>
                      <span style={{ color: C.greenBright, fontWeight: 800, fontSize: 13, flexShrink: 0 }}>{String(i + 1).padStart(2, "0")}</span>
                      <span style={{ color: C.text, fontSize: 12, lineHeight: 1.6 }}>{step}</span>
                    </div>
                  ))}
                </Section>

                <Section title="Why this works">
                  <div style={{ color: C.muted, fontSize: 12, lineHeight: 1.8 }}>
                    {prospect.name} already has the hard part — {(prospect.reviewCount || 0).toLocaleString()} reviews at {prospect.rating}★ is real-world proof customers love them.
                    The gap is digital: their online presence doesn't match their offline reputation. That's the cheapest, fastest kind of gap to close,
                    because we're not building a reputation from scratch — we're making an existing one visible. Every search they don't show up in is a job going to {topComp?.name ?? "a competitor"}.
                  </div>
                </Section>
              </div>
            )}

            {/* ── OUTREACH ── */}
            {tab === "Outreach" && (
              <div>
                {narrative?.hook && (
                  <Section title="Cold call hook — Carter's voice">
                    <div style={{ background: "#0D1A0D", border: `1px solid ${C.green}33`, borderLeft: `3px solid ${C.green}`, borderRadius: "0 6px 6px 0", padding: "14px 18px", fontSize: 13, lineHeight: 1.7, color: C.text, whiteSpace: "pre-wrap" }}>
                      {narrative.hook}
                    </div>
                  </Section>
                )}

                {narrative?.talkingPoints?.length > 0 && (
                  <Section title="Talking points">
                    {narrative.talkingPoints.map((tp, i) => (
                      <div key={i} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 5, padding: "10px 14px", marginBottom: 8, color: C.text, fontSize: 12 }}>
                        💬 {tp}
                      </div>
                    ))}
                  </Section>
                )}

                {narrative?.coldEmail && (
                  <Section title="Cold email — ready to send">
                    <div style={{ background: "#0D1A0D", border: `1px solid ${C.green}33`, borderRadius: 6, padding: 14, fontSize: 12, lineHeight: 1.8, color: C.text, whiteSpace: "pre-wrap" }}>
                      {narrative.coldEmail}
                    </div>
                    <button
                      style={{ ...S.btn("secondary"), marginTop: 10 }}
                      onClick={() => navigator.clipboard.writeText(narrative.coldEmail)}
                    >
                      Copy Email
                    </button>
                  </Section>
                )}

                {!narrative && (
                  <div style={{ color: C.muted, fontSize: 12 }}>
                    AI narrative wasn't generated for this run (non-fatal — all verified data above still stands). Re-run the analysis to retry.
                  </div>
                )}

                <Section title="Request free mock site">
                  <div style={{ background: "#0D1A0D", border: `1px solid ${C.green}33`, borderRadius: 6, padding: 16 }}>
                    <div style={{ color: C.text, fontSize: 13, fontWeight: 700, marginBottom: 6 }}>Want to see what {prospect.name} could look like?</div>
                    <div style={{ color: C.muted, fontSize: 12, marginBottom: 14 }}>We build a free mock site before we ever pitch. No commitment.</div>
                    <a href={`https://sitework.build/get-started?biz=${encodeURIComponent(prospect.name || "")}`} target="_blank" rel="noreferrer" style={{ ...S.btn("primary"), textDecoration: "none", display: "inline-block" }}>
                      Request Free Mock →
                    </a>
                  </div>
                </Section>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
