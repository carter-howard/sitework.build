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

function InternalApp() {
  const [url, setUrl] = useState("");
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

        {data && (
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

// ════════════════════════════════════════════════════════════════════════════
// CUSTOMER-FACING SCANNER — /scan
// ════════════════════════════════════════════════════════════════════════════

const gradeFor = (n) => (n >= 85 ? "A" : n >= 70 ? "B" : n >= 55 ? "C" : n >= 40 ? "D" : "F");
const gradeColor = (g) => (g === "A" || g === "B" ? C.greenBright : g === "C" ? C.yellow : C.red);

// Translate crawl + score data into plain-English wins and gaps
function buildPlainEnglish(d) {
  const crawl = d.prospectCrawl || {};
  const p = d.prospect || {};
  const ps = d.comparison?.prospect || {};
  const ca = d.comparison?.competitorAverage || {};
  const wins = [];
  const gapsOut = [];

  // ── Wins ──────────────────────────────────────────────────────────────────
  if (p.rating >= 4.5 && p.reviewCount >= 50)
    wins.push({ t: `${p.rating}★ across ${p.reviewCount.toLocaleString()} reviews`, d: "Customers clearly love your work. That reputation is your single biggest asset for winning local search." });
  else if (p.rating >= 4.0 && p.reviewCount >= 20)
    wins.push({ t: `${p.rating}★ rating with ${p.reviewCount} reviews`, d: "Solid reputation. The next step is making sure it's visible every time someone searches your trade." });
  if (crawl.hasPhoneLink)
    wins.push({ t: "Click-to-call works on mobile", d: "Customers on their phone can reach you in one tap — no copying numbers, no friction." });
  if (crawl.hasBookingWidget)
    wins.push({ t: "Online booking is set up", d: "Customers can schedule without calling. That's a real edge, especially for after-hours searches." });
  if (crawl.hasSchema)
    wins.push({ t: "Google can read your site structure", d: "Schema markup is how Google understands your services and location. You have it — most competitors don't." });
  if (p.hours?.length >= 7)
    wins.push({ t: "Business hours fully listed on Google", d: "Customers know exactly when they can reach you. It's a small thing that filters out a lot of missed calls." });
  if (crawl.hasEmergencyText)
    wins.push({ t: "Emergency availability is visible on your site", d: "Urgent jobs are the most profitable — and you're already signaling you take them." });
  if (crawl.hasLicenseNumber || crawl.hasBBBLink)
    wins.push({ t: "License or credentials shown", d: "Homeowners letting a stranger into their house need proof. You're already building that trust before the first call." });
  if (p.photoCount >= 15)
    wins.push({ t: `${p.photoCount} photos on your Google profile`, d: "Strong photo presence. Profiles with real job photos get significantly more calls than those without." });
  if (crawl.hasFacebook)
    wins.push({ t: "Facebook presence linked", d: "Social citations strengthen your local SEO footprint and give customers a second place to verify you're legit." });

  // ── GBP gaps ───────────────────────────────────────────────────────────────
  if (!p.website)
    gapsOut.push({ t: "No website on your Google profile", d: "When someone searches your business and clicks through, there's nothing to find. Most won't call — they'll click the next name that has a site." });
  if (p.photoCount < 5)
    gapsOut.push({ t: `Only ${p.photoCount} photo${p.photoCount === 1 ? "" : "s"} on your Google profile`, d: "Google profiles with more photos get 35% more clicks and far more direction requests. Real job photos are the fastest trust-builder you have." });
  else if (p.photoCount < 15)
    gapsOut.push({ t: `${p.photoCount} photos on Google — room to grow`, d: "Competitors with 20+ job photos significantly outperform on clicks and calls. A monthly habit of uploading 3-4 photos makes a measurable difference." });
  if (!p.hours?.length)
    gapsOut.push({ t: "Business hours not listed on Google", d: "Customers searching at 7pm don't know if you're available. Missing hours is a trust gap that sends them to someone who has theirs posted." });
  if (p.reviewCount < 30)
    gapsOut.push({ t: `${p.reviewCount} reviews — below the local threshold for trust`, d: "Most homeowners won't hire a contractor with fewer than 20-30 reviews. A simple follow-up text after each job doubles your review velocity in 60 days." });
  else if (ca.reputation && ps.reputation < ca.reputation - 10)
    gapsOut.push({ t: "Review count behind local competitors", d: `Your market average is ${d.comparison?.avgReviews?.toLocaleString() || "higher"} reviews. The gap is closeable — most contractors just never ask.` });

  // ── Website conversion gaps ───────────────────────────────────────────────
  if (p.website && !crawl.hasBookingWidget)
    gapsOut.push({ cat: "Website", t: "No online booking on your site", d: "Customers searching at 9pm can't schedule with you — but they can with competitors who have booking. That job is gone before you wake up." });
  if (p.website && !crawl.hasPhoneLink)
    gapsOut.push({ cat: "Website", t: "Phone number isn't tappable on mobile", d: "Most local searches happen on phones. If tapping your number doesn't auto-dial, you're losing calls at the exact moment someone decided to hire you." });
  if (p.website && !crawl.hasForm)
    gapsOut.push({ cat: "Website", t: "No contact form on your site", d: "Some customers won't call — they want to send a message first. Without a form, you're invisible to that segment entirely." });
  if (!crawl.hasLicenseNumber && !crawl.hasBBBLink)
    gapsOut.push({ cat: "Trust", t: "License and credentials not visible", d: "Homeowners letting a stranger into their house scan for proof you're licensed and insured. Without it visible, the hesitation often costs you the job." });
  if (p.website && !crawl.hasFinancing)
    gapsOut.push({ cat: "Website", t: "No financing options mentioned", d: "Big-ticket jobs — new HVAC, repiping, full electrical — often hinge on payment flexibility. Competitors who offer financing win the quotes you lose." });
  if (p.website && !crawl.hasEmergencyText)
    gapsOut.push({ cat: "Website", t: "Emergency availability not mentioned", d: "Emergency calls are the highest-margin jobs in your trade. If your site doesn't say you're available, customers in a panic call whoever does." });

  // ── SEO gaps ─────────────────────────────────────────────────────────────
  if (p.website && !crawl.hasSchema)
    gapsOut.push({ cat: "SEO", t: "Google can't fully read your site", d: "Schema markup tells Google exactly what services you offer and where. Without it, competitors who have it outrank you for searches you should be winning." });
  if (crawl.crawled && crawl.pagesCrawled < 2)
    gapsOut.push({ cat: "SEO", t: "Site appears to be a single page", d: "Single-page sites can only rank for one thing. Competitors with separate pages for each service capture far more searches." });
  if (crawl.crawled && crawl.serviceKeywords < 4)
    gapsOut.push({ cat: "SEO", t: "Service content is too thin to rank", d: "Google ranks pages, not businesses. If your site doesn't have enough content about each service, you won't show up when someone searches that specific job." });
  if (crawl.crawled && crawl.textLength < 3000)
    gapsOut.push({ cat: "SEO", t: "Not enough content for Google to work with", d: "Thin sites can't compete for local search rankings. Google needs context about your services, area, and expertise to send you traffic." });
  if (crawl.crawled && crawl.trustKeywords < 2)
    gapsOut.push({ cat: "Trust", t: "Trust language missing from your site", d: "Words like 'licensed', 'insured', 'family owned', and 'guaranteed' are what homeowners scan for before calling. They also boost local SEO." });
  if (p.website && p.website.startsWith("http:"))
    gapsOut.push({ cat: "SEO", t: "Site not running on HTTPS", d: "Google flags non-HTTPS sites as 'Not secure'. That warning appears before customers read a single word — and most leave immediately." });

  // ── Social & citation gaps ────────────────────────────────────────────────
  if (!crawl.hasFacebook)
    gapsOut.push({ cat: "Social", t: "No Facebook presence found", d: "Facebook is still where homeowners ask for contractor recommendations. No presence means you're invisible in those conversations." });
  if (!crawl.hasInstagram)
    gapsOut.push({ cat: "Social", t: "No Instagram linked", d: "Before/after photos on Instagram are one of the highest-converting content formats for trades. Competitors posting job photos are building audiences you're not reaching." });
  if (!crawl.hasYelp)
    gapsOut.push({ cat: "Social", t: "No Yelp presence detected", d: "Yelp still drives significant contractor searches and is a citation that strengthens your overall local SEO footprint." });

  // Sort by category priority, cap at 6
  const catOrder = { "GBP": 0, "Website": 1, "SEO": 2, "Trust": 3, "Social": 4 };
  gapsOut.sort((a, b) => (catOrder[a.cat] ?? 5) - (catOrder[b.cat] ?? 5));

  return { wins: wins.slice(0, 5), gaps: gapsOut.slice(0, 6) };
}

function CustomerApp() {
  const [url, setUrl] = useState("");
  const [email, setEmail] = useState("");
  const [emailGated, setEmailGated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const analyze = useCallback(async () => {
    if (!url.trim()) return;
    setLoading(true); setError(null); setData(null); setEmailGated(false);
    setStatus("Scanning your online presence… this takes about 30 seconds.");
    try {
      const res = await fetch(`${WORKER}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gbpUrl: url.trim() }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Scan failed — double-check your Google Maps link.");
      }
      setData(await res.json());
      setStatus("");
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [url]);

  const unlock = useCallback(async () => {
    if (!email.trim() || !email.includes("@")) return;
    setEmailGated(true); // show results immediately, don't make them wait

    // Fire-and-forget lead capture to Web3Forms
    try {
      await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          access_key: "6282a64b-adda-4bbf-bea4-ad946332e211",
          subject: `New Scan Lead — ${data?.prospect?.name || "Unknown"}`,
          name: data?.prospect?.name || "Contractor",
          email: email.trim(),
          message: `Business: ${data?.prospect?.name || "—"}
Address: ${data?.prospect?.address || "—"}
Reviews: ${data?.prospect?.reviewCount || "—"} · ${data?.prospect?.rating || "—"}★
GBP URL: ${url.trim()}
Overall Grade: ${gradeFor(data?.comparison?.prospect?.overall ?? 0)}
Scanned: ${new Date().toLocaleString()}`,
        }),
      });
    } catch (_) {
      // non-fatal — lead already unlocked above
    }
  }, [email, data, url]);

  const p = data?.prospect || {};
  const ps = data?.comparison?.prospect || {};
  const overall = ps.overall ?? 0;
  const grade = gradeFor(overall);
  const competitors = (data?.competitors || []).slice().sort((a, b) => (b.reviewCount || 0) - (a.reviewCount || 0)).slice(0, 3);
  const plain = data ? buildPlainEnglish(data) : { wins: [], gaps: [] };

  return (
    <div style={{ background: C.bg, minHeight: "100vh", color: C.text, fontFamily: "'Montserrat', 'Segoe UI', sans-serif" }}>
      <div style={{ borderBottom: `1px solid ${C.border}`, padding: "16px 24px", display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ color: C.green, fontWeight: 900, fontSize: 15, letterSpacing: ".12em", textTransform: "uppercase" }}>SITEWORK</span>
        <span style={{ color: C.dim, fontSize: 11 }}>|</span>
        <span style={{ color: C.muted, fontSize: 11, letterSpacing: ".06em", textTransform: "uppercase" }}>Free Online Presence Scan</span>
      </div>

      <div style={{ maxWidth: 760, margin: "0 auto", padding: "40px 24px" }}>
        {!data && (
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <h1 style={{ fontSize: 26, fontWeight: 800, marginBottom: 10 }}>How does your business look online?</h1>
            <p style={{ color: C.muted, fontSize: 14, lineHeight: 1.7, maxWidth: 560, margin: "0 auto" }}>
              Paste your Google Maps link and we'll scan your online presence the way a customer sees it — reviews, website, booking, trust signals — and show you exactly where jobs are slipping away.
            </p>
          </div>
        )}

        <div style={S.card}>
          <label style={S.label}>Your Google Maps link</label>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <input
              style={{ ...S.input, flex: 1, minWidth: 240 }}
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && analyze()}
              placeholder="Search your business on Google Maps, tap Share, paste the link here"
              disabled={loading}
            />
            <button style={{ ...S.btn("primary"), opacity: loading ? 0.6 : 1 }} onClick={analyze} disabled={loading || !url.trim()}>
              {loading ? "Scanning…" : "Run Free Scan"}
            </button>
          </div>
          {status && <div style={{ color: C.muted, fontSize: 11, marginTop: 8 }}>{status}</div>}
          {error && <div style={{ color: C.red, fontSize: 12, marginTop: 8 }}>⚠ {error}</div>}
        </div>

        {data && !emailGated && (
          <div style={{ ...S.card, background: "#0D1A0D", border: `1px solid ${C.green}44`, textAlign: "center", padding: 28 }}>
            <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 4 }}>{p.name}</div>
            <div style={{ color: C.muted, fontSize: 12, marginBottom: 18 }}>Scan complete. Your results are ready.</div>
            <div style={{ display: "inline-block", filter: "blur(6px)", pointerEvents: "none", marginBottom: 18 }}>
              <span style={{ fontSize: 56, fontWeight: 900, color: gradeColor(grade) }}>{grade}</span>
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>Where should we send your full report?</div>
            <div style={{ color: C.muted, fontSize: 11, marginBottom: 14 }}>Free. No spam, no obligation — just the results.</div>
            <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
              <input style={{ ...S.input, maxWidth: 280 }} value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => e.key === "Enter" && unlock()} placeholder="you@yourbusiness.com" type="email" />
              <button style={S.btn("primary")} onClick={unlock}>Show My Results</button>
            </div>
          </div>
        )}

        {data && emailGated && (
          <>
            {/* Grade card */}
            <div style={{ ...S.card, display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap" }}>
              <div style={{ textAlign: "center", minWidth: 110 }}>
                <div style={{ fontSize: 64, fontWeight: 900, color: gradeColor(grade), lineHeight: 1 }}>{grade}</div>
                <div style={{ color: C.muted, fontSize: 10, textTransform: "uppercase", letterSpacing: ".08em", marginTop: 6 }}>Online Presence Grade</div>
              </div>
              <div style={{ flex: 1, minWidth: 220 }}>
                <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 4 }}>{p.name}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 8 }}>
                  <Stars rating={p.rating} />
                  <span style={{ color: C.muted, fontSize: 12 }}>{(p.reviewCount || 0).toLocaleString()} Google reviews</span>
                </div>
                <div style={{ color: C.muted, fontSize: 12, lineHeight: 1.6 }}>
                  {grade === "A" && "Your online presence is strong. The opportunities below are about protecting your lead and squeezing more out of what's working."}
                  {grade === "B" && "Solid foundation with real gaps. Customers can find you — but some are leaking to competitors at key moments."}
                  {(grade === "C" || grade === "D") && "Your reputation is better than your online presence shows. That mismatch is costing you jobs every week."}
                  {grade === "F" && "Customers who hear about you can't verify you online — and in 2026, that means most of them keep scrolling."}
                </div>
              </div>
            </div>

            {/* Wins */}
            {plain.wins.length > 0 && (
              <Section title="What you're doing right">
                {plain.wins.map((w, i) => (
                  <div key={i} style={{ background: "#0D150A", border: `1px solid ${C.greenBright}33`, borderRadius: 6, padding: "12px 16px", marginBottom: 8 }}>
                    <div style={{ color: C.text, fontSize: 13, fontWeight: 700, marginBottom: 3 }}>✓ {w.t}</div>
                    <div style={{ color: C.muted, fontSize: 12, lineHeight: 1.6 }}>{w.d}</div>
                  </div>
                ))}
              </Section>
            )}

            {/* Gaps */}
            {plain.gaps.length > 0 && (
              <Section title="Where jobs are slipping away">
                {plain.gaps.map((g, i) => {
                  const catColors = { Website: "#3A6BC4", SEO: "#7A4FA3", Trust: "#C47A3A", Social: "#3A9C7A", GBP: C.green };
                  const catColor = catColors[g.cat] || C.dim;
                  return (
                    <div key={i} style={{ background: "#1E0808", border: `1px solid ${C.red}33`, borderRadius: 6, padding: "12px 16px", marginBottom: 8 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        <span style={{ color: C.text, fontSize: 13, fontWeight: 700 }}>✕ {g.t}</span>
                        {g.cat && <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", background: `${catColor}22`, border: `1px solid ${catColor}55`, borderRadius: 3, color: catColor, padding: "2px 6px", flexShrink: 0 }}>{g.cat}</span>}
                      </div>
                      <div style={{ color: C.muted, fontSize: 12, lineHeight: 1.6 }}>{g.d}</div>
                    </div>
                  );
                })}
              </Section>
            )}

            {/* Competitive snapshot */}
            {competitors.length > 0 && (
              <Section title="Your market at a glance">
                <div style={{ color: C.muted, fontSize: 12, marginBottom: 12, lineHeight: 1.6 }}>
                  When a customer searches for your trade in your area, here's who they see next to you:
                </div>
                {competitors.map((c, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 6, padding: "12px 16px", marginBottom: 8, flexWrap: "wrap", gap: 8 }}>
                    <span style={{ color: C.text, fontSize: 13, fontWeight: 600 }}>{c.name}</span>
                    <span style={{ color: C.muted, fontSize: 12 }}>{(c.reviewCount || 0).toLocaleString()} reviews · {c.rating}★</span>
                  </div>
                ))}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#0D1A0D", border: `1px solid ${C.green}44`, borderRadius: 6, padding: "12px 16px", flexWrap: "wrap", gap: 8 }}>
                  <span style={{ color: C.greenBright, fontSize: 13, fontWeight: 700 }}>{p.name} (you)</span>
                  <span style={{ color: C.muted, fontSize: 12 }}>{(p.reviewCount || 0).toLocaleString()} reviews · {p.rating}★</span>
                </div>
              </Section>
            )}

            {/* What it takes */}
            <Section title="What it takes to be the #1 choice in your market">
              <div style={{ color: C.muted, fontSize: 12, lineHeight: 1.8 }}>
                The contractors who dominate local search all do the same five things: they keep reviews coming in steadily, their Google profile is complete down to the photos, their website turns visitors into phone calls instead of just existing, every service they offer has its own findable page, and trust signals — license, insurance, guarantees — are impossible to miss. None of it is complicated. It's just consistent, and most contractors never get around to it. That's the opening.
              </div>
            </Section>

            {/* CTA */}
            <div style={{ ...S.card, background: "#0D1A0D", border: `1px solid ${C.green}44`, textAlign: "center", padding: 28 }}>
              <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 6 }}>Want to see what {p.name} could look like?</div>
              <div style={{ color: C.muted, fontSize: 13, marginBottom: 16, lineHeight: 1.6 }}>
                We build you a free mock site before we ever talk business. If you like it, we'll talk. If not, no hard feelings.
              </div>
              <a href={`https://sitework.build/get-started?biz=${encodeURIComponent(p.name || "")}`} style={{ ...S.btn("primary"), textDecoration: "none", display: "inline-block" }}>
                Get My Free Mock Site →
              </a>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Path router ──────────────────────────────────────────────────────────────
export default function App() {
  const path = window.location.pathname.replace(/\/$/, "");
  if (path === "/scan") return <CustomerApp />;
  return <InternalApp />;
}
