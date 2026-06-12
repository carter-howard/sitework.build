import { useState, useCallback } from "react";

// ─── Config ──────────────────────────────────────────────────────────────────
const WORKER = import.meta.env.VITE_WORKER_URL || "https://places.sitework.build";

// ─── Design tokens ───────────────────────────────────────────────────────────
const C = {
  bg:      "#0D0D0D",
  surface: "#141414",
  border:  "#1F1F1F",
  green:   "#5A6B46",
  greenBright: "#7A9B5A",
  text:    "#E8E8E8",
  muted:   "#888",
  dim:     "#555",
  red:     "#C0392B",
  yellow:  "#D4A017",
};

const S = {
  card: {
    background: C.surface,
    border: `1px solid ${C.border}`,
    borderRadius: 8,
    padding: 20,
    marginBottom: 16,
  },
  label: {
    color: C.muted,
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: ".1em",
    textTransform: "uppercase",
    marginBottom: 6,
    display: "block",
  },
  input: {
    width: "100%",
    background: "#0D0D0D",
    border: `1px solid ${C.border}`,
    borderRadius: 6,
    color: C.text,
    fontSize: 13,
    padding: "10px 12px",
    outline: "none",
  },
  btn: (variant = "primary") => ({
    background: variant === "primary" ? C.green : "transparent",
    border: `1px solid ${variant === "primary" ? C.green : C.border}`,
    borderRadius: 6,
    color: C.text,
    cursor: "pointer",
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: ".06em",
    padding: "10px 20px",
    textTransform: "uppercase",
  }),
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
function score(n, max = 100) {
  const pct = Math.min(100, Math.max(0, n));
  const color = pct >= 70 ? C.greenBright : pct >= 45 ? C.yellow : C.red;
  return (
    <span style={{ color, fontWeight: 700 }}>
      {pct}
      <span style={{ color: C.dim, fontWeight: 400, fontSize: "0.85em" }}>/{max}</span>
    </span>
  );
}

function Badge({ children, color }) {
  return (
    <span style={{
      background: `${color}22`,
      border: `1px solid ${color}44`,
      borderRadius: 4,
      color,
      fontSize: 9,
      fontWeight: 700,
      letterSpacing: ".08em",
      padding: "2px 7px",
      textTransform: "uppercase",
    }}>
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

function ScoreBar({ value, max = 100 }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  const color = pct >= 70 ? C.greenBright : pct >= 45 ? C.yellow : C.red;
  return (
    <div style={{ background: C.border, borderRadius: 3, height: 4, width: "100%", marginTop: 4 }}>
      <div style={{ background: color, borderRadius: 3, height: 4, width: `${pct}%`, transition: "width .4s" }} />
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

// ─── Key Insights ─────────────────────────────────────────────────────────────
function KeyInsights({ prospect, competitors = [] }) {
  const insights = [];
  const n = competitors.length;
  if (!n) return <div style={{ color: C.muted, fontSize: 12 }}>No competitor data available.</div>;

  const avgReviews = Math.round(competitors.reduce((s, c) => s + (c.reviewCount || 0), 0) / n);
  const topReviews = Math.max(...competitors.map(c => c.reviewCount || 0));
  const topName = competitors.find(c => c.reviewCount === topReviews)?.name || "top competitor";
  const pReviews = prospect?.reviewCount || 0;
  const pRating = prospect?.rating || 0;

  if (pReviews < avgReviews) {
    insights.push({
      priority: "high", icon: "⭐",
      title: `${(avgReviews - pReviews).toLocaleString()} reviews behind local average`,
      body: `${prospect?.name} has ${pReviews.toLocaleString()} reviews. Competitor avg is ${avgReviews.toLocaleString()}. ${topName} leads with ${topReviews.toLocaleString()}.`,
    });
  } else {
    insights.push({
      priority: "good", icon: "⭐",
      title: "Review count above competitor average",
      body: `${pReviews.toLocaleString()} reviews vs ${avgReviews.toLocaleString()} avg. Strong social proof to lead with.`,
    });
  }

  const avgRating = +(competitors.reduce((s, c) => s + (c.rating || 0), 0) / n).toFixed(1);
  if (pRating > 0 && pRating < avgRating - 0.2) {
    insights.push({
      priority: "high", icon: "📉",
      title: `Rating ${pRating}★ lags competitor average of ${avgRating}★`,
      body: "Below-average rating reduces local pack ranking and first-impression conversion.",
    });
  } else if (pRating >= 4.5) {
    insights.push({
      priority: "good", icon: "📈",
      title: `Strong ${pRating}★ rating`,
      body: "Top-tier rating for local pack visibility. Protect it.",
    });
  }

  const hasWebsite = prospect?.hasWebsite;
  const websiteScore = prospect?.scores?.website || 0;
  if (!hasWebsite) {
    insights.push({
      priority: "high", icon: "🌐",
      title: "No website detected",
      body: "Missing one of the highest-ROI trust signals in local search. This is the unlock.",
    });
  } else if (websiteScore < 40) {
    insights.push({
      priority: "medium", icon: "🌐",
      title: "Website exists but scores poorly",
      body: `Website health score: ${websiteScore}/100. Speed, mobile, or content gaps likely hurting conversions.`,
    });
  }

  if (!insights.length) {
    insights.push({ priority: "good", icon: "✅", title: "No critical gaps vs competitors", body: "Solid baseline. Opportunity is in fine-tuning conversion and deepening content." });
  }

  const priorityColor = p => p === "high" ? C.red : p === "medium" ? C.yellow : C.greenBright;
  const priorityBg = p => p === "high" ? "#1E0808" : p === "medium" ? "#1A1608" : "#0D150A";

  return (
    <div>
      {insights.map((ins, i) => (
        <div key={i} style={{ background: priorityBg(ins.priority), border: `1px solid ${priorityColor(ins.priority)}33`, borderRadius: 5, padding: "11px 14px", marginBottom: 8 }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
            <span style={{ fontSize: 16, flexShrink: 0 }}>{ins.icon}</span>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                <span style={{ color: C.text, fontSize: 12, fontWeight: 700 }}>{ins.title}</span>
                {ins.priority !== "good" && (
                  <span style={{ color: priorityColor(ins.priority), fontSize: 9, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", background: `${priorityColor(ins.priority)}22`, borderRadius: 3, padding: "2px 6px", flexShrink: 0, marginLeft: 8 }}>{ins.priority}</span>
                )}
              </div>
              <div style={{ color: C.muted, fontSize: 11, lineHeight: 1.55 }}>{ins.body}</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Competitor Table ─────────────────────────────────────────────────────────
function CompetitorTable({ prospect, competitors = [] }) {
  if (!competitors.length) return null;
  const pScores = prospect?.scores || {};
  const cols = ["overall", "reputation", "website", "localSeo", "conversion"];
  const colLabels = { overall: "Overall", reputation: "Reputation", website: "Website", localSeo: "Local SEO", conversion: "Conversion" };

  const delta = (a, b) => {
    const d = (a || 0) - (b || 0);
    const color = d > 0 ? C.greenBright : d < 0 ? C.red : C.muted;
    return <span style={{ color, fontSize: 10, marginLeft: 4 }}>{d > 0 ? `+${d}` : d}</span>;
  };

  return (
    <div style={{ overflowX: "auto", marginBottom: 16 }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
        <thead>
          <tr>
            <th style={{ textAlign: "left", color: C.muted, fontWeight: 700, padding: "6px 8px", borderBottom: `1px solid ${C.border}` }}>Business</th>
            <th style={{ textAlign: "center", color: C.muted, fontWeight: 700, padding: "6px 8px", borderBottom: `1px solid ${C.border}` }}>Reviews</th>
            <th style={{ textAlign: "center", color: C.muted, fontWeight: 700, padding: "6px 8px", borderBottom: `1px solid ${C.border}` }}>Rating</th>
            {cols.map(c => (
              <th key={c} style={{ textAlign: "center", color: C.muted, fontWeight: 700, padding: "6px 8px", borderBottom: `1px solid ${C.border}` }}>{colLabels[c]}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {/* Prospect row */}
          <tr style={{ background: `${C.green}18` }}>
            <td style={{ padding: "7px 8px", color: C.greenBright, fontWeight: 700, borderBottom: `1px solid ${C.border}` }}>
              {prospect?.name || "Prospect"} <Badge color={C.greenBright}>YOU</Badge>
            </td>
            <td style={{ textAlign: "center", padding: "7px 8px", color: C.text, borderBottom: `1px solid ${C.border}` }}>{(prospect?.reviewCount || 0).toLocaleString()}</td>
            <td style={{ textAlign: "center", padding: "7px 8px", color: C.text, borderBottom: `1px solid ${C.border}` }}>{prospect?.rating ? `${prospect.rating}★` : "—"}</td>
            {cols.map(c => (
              <td key={c} style={{ textAlign: "center", padding: "7px 8px", color: C.text, borderBottom: `1px solid ${C.border}` }}>{pScores[c] ?? "—"}</td>
            ))}
          </tr>
          {/* Competitor rows */}
          {competitors.map((comp, i) => {
            const cs = comp.scores || {};
            return (
              <tr key={i} style={{ background: i % 2 === 0 ? "transparent" : "#0A0A0A" }}>
                <td style={{ padding: "7px 8px", color: C.text, borderBottom: `1px solid ${C.border}` }}>{comp.name}</td>
                <td style={{ textAlign: "center", padding: "7px 8px", color: C.muted, borderBottom: `1px solid ${C.border}` }}>{(comp.reviewCount || 0).toLocaleString()}</td>
                <td style={{ textAlign: "center", padding: "7px 8px", color: C.muted, borderBottom: `1px solid ${C.border}` }}>{comp.rating ? `${comp.rating}★` : "—"}</td>
                {cols.map(c => (
                  <td key={c} style={{ textAlign: "center", padding: "7px 8px", color: C.muted, borderBottom: `1px solid ${C.border}` }}>
                    {cs[c] ?? "—"}
                    {cs[c] != null && pScores[c] != null && delta(pScores[c], cs[c])}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Report Download ──────────────────────────────────────────────────────────
function buildReport(data) {
  const p = data.prospect || {};
  const esc = s => String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const slug = (p.name || "prospect").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>SITEWORK Report — ${esc(p.name)}</title>
<style>
  body{font-family:system-ui,sans-serif;background:#0D0D0D;color:#E8E8E8;padding:40px;max-width:900px;margin:0 auto}
  h1{color:#7A9B5A;font-size:22px;margin-bottom:4px}
  h2{color:#888;font-size:11px;letter-spacing:.1em;text-transform:uppercase;margin-bottom:24px}
  .card{background:#141414;border:1px solid #1F1F1F;border-radius:8px;padding:20px;margin-bottom:16px}
  .label{color:#555;font-size:10px;letter-spacing:.1em;text-transform:uppercase;margin-bottom:4px}
  .val{color:#E8E8E8;font-size:14px}
  .hook{background:#0D1A0D;border-left:3px solid #5A6B46;padding:14px 18px;border-radius:0 6px 6px 0;font-size:13px;line-height:1.6;white-space:pre-wrap}
</style>
</head>
<body>
<h1>${esc(p.name)}</h1>
<h2>SITEWORK Prospect Intelligence Report</h2>
<div class="card">
  <div class="label">Business</div><div class="val">${esc(p.name)} · ${esc(p.city)}</div>
  <div class="label" style="margin-top:12px">Reviews</div><div class="val">${esc(p.reviewCount)} reviews · ${esc(p.rating)}★</div>
  <div class="label" style="margin-top:12px">Overall Score</div><div class="val">${esc(p.scores?.overall ?? "—")}/100</div>
</div>
<div class="card">
  <div class="label">Cold Call Hook</div>
  <div class="hook">${esc(data.coldCallHook)}</div>
</div>
<div class="card">
  <div class="label">Email Subject</div>
  <div class="val">${esc(data.emailSubject)}</div>
  <div class="label" style="margin-top:12px">Email Body</div>
  <div class="hook">${esc(data.emailBody)}</div>
</div>
<div class="card">
  <div class="label">AI Analysis</div>
  <div class="val" style="white-space:pre-wrap;font-size:12px;line-height:1.7">${esc(data.narrative)}</div>
</div>
<p style="color:#333;font-size:10px;margin-top:32px">Generated by SITEWORK · sitework.build</p>
</body>
</html>`;
  return { slug, html };
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────
const TABS = ["Overview", "Outreach", "Competitors", "Report"];

// ─── Main App ─────────────────────────────────────────────────────────────────
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

    // Log URL immediately (before gate)
    console.log("[SITEWORK] URL submitted:", url.trim());

    try {
      setStatus("Running analysis pipeline…");
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

  const prospect = data?.prospect || {};
  const competitors = data?.competitors || [];
  const scores = prospect.scores || {};

  return (
    <div style={{ background: C.bg, minHeight: "100vh", color: C.text, fontFamily: "'Montserrat', 'Segoe UI', sans-serif" }}>
      {/* Header */}
      <div style={{ borderBottom: `1px solid ${C.border}`, padding: "16px 24px", display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ color: C.green, fontWeight: 900, fontSize: 15, letterSpacing: ".12em", textTransform: "uppercase" }}>SITEWORK</span>
        <span style={{ color: C.dim, fontSize: 11 }}>|</span>
        <span style={{ color: C.muted, fontSize: 11, letterSpacing: ".06em", textTransform: "uppercase" }}>Prospect Analyzer</span>
      </div>

      <div style={{ maxWidth: 960, margin: "0 auto", padding: "32px 24px" }}>
        {/* Input */}
        <div style={S.card}>
          <label style={S.label}>Google Business Profile URL or Maps Link</label>
          <div style={{ display: "flex", gap: 10 }}>
            <input
              style={S.input}
              value={url}
              onChange={e => setUrl(e.target.value)}
              onKeyDown={e => e.key === "Enter" && analyze()}
              placeholder="https://maps.app.goo.gl/... or maps.google.com/?cid=..."
              disabled={loading}
            />
            <button
              style={{ ...S.btn("primary"), whiteSpace: "nowrap", opacity: loading ? 0.6 : 1 }}
              onClick={analyze}
              disabled={loading || !url.trim()}
            >
              {loading ? "Analyzing…" : "Analyze"}
            </button>
          </div>
          {status && <div style={{ color: C.muted, fontSize: 11, marginTop: 8 }}>{status}</div>}
          {error && <div style={{ color: C.red, fontSize: 12, marginTop: 8 }}>⚠ {error}</div>}
        </div>

        {/* Results */}
        {data && (
          <>
            {/* Email gate */}
            {!emailGated && (
              <div style={{ ...S.card, background: "#0D1A0D", border: `1px solid ${C.green}44`, position: "relative" }}>
                <div style={{ filter: "blur(4px)", pointerEvents: "none", marginBottom: 12 }}>
                  <div style={{ color: C.text, fontSize: 16, fontWeight: 700 }}>{prospect.name}</div>
                  <div style={{ color: C.muted, fontSize: 12 }}>{prospect.reviewCount} reviews · {prospect.rating}★ · Score {scores.overall}/100</div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ color: C.text, fontSize: 13, fontWeight: 700, marginBottom: 4 }}>Enter your email to unlock the full report</div>
                  <div style={{ color: C.muted, fontSize: 11, marginBottom: 14 }}>Free. No spam. Just the intelligence.</div>
                  <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
                    <input
                      style={{ ...S.input, maxWidth: 280 }}
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && handleEmailGate()}
                      placeholder="you@email.com"
                      type="email"
                    />
                    <button style={S.btn("primary")} onClick={handleEmailGate}>Unlock</button>
                  </div>
                </div>
              </div>
            )}

            {emailGated && (
              <>
                {/* Business header */}
                <div style={{ ...S.card, display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: C.text, marginBottom: 4 }}>{prospect.name}</div>
                    <div style={{ color: C.muted, fontSize: 12, marginBottom: 8 }}>{prospect.city} · {prospect.category}</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                      <Stars rating={prospect.rating} />
                      <span style={{ color: C.muted, fontSize: 12 }}>{(prospect.reviewCount || 0).toLocaleString()} reviews</span>
                      <Badge color={C.greenBright}>LIVE</Badge>
                      {prospect.hasWebsite ? <Badge color={C.greenBright}>HAS SITE</Badge> : <Badge color={C.red}>NO SITE</Badge>}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button style={S.btn("secondary")} onClick={downloadReport}>↓ Download Report</button>
                  </div>
                </div>

                {/* Score cards */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px,1fr))", gap: 10, marginBottom: 16 }}>
                  {[
                    { label: "Overall", key: "overall" },
                    { label: "Reputation", key: "reputation" },
                    { label: "Website", key: "website" },
                    { label: "Local SEO", key: "localSeo" },
                    { label: "Conversion", key: "conversion" },
                  ].map(({ label, key }) => (
                    <div key={key} style={{ ...S.card, padding: 14, marginBottom: 0 }}>
                      <div style={{ color: C.muted, fontSize: 9, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", marginBottom: 6 }}>{label}</div>
                      <div style={{ fontSize: 22, fontWeight: 800 }}>{score(scores[key] ?? 0)}</div>
                      <ScoreBar value={scores[key] ?? 0} />
                    </div>
                  ))}
                </div>

                {/* Tabs */}
                <div style={{ display: "flex", gap: 4, marginBottom: 20, borderBottom: `1px solid ${C.border}`, paddingBottom: 0 }}>
                  {TABS.map(t => (
                    <button
                      key={t}
                      onClick={() => setTab(t)}
                      style={{
                        background: "transparent",
                        border: "none",
                        borderBottom: `2px solid ${tab === t ? C.green : "transparent"}`,
                        color: tab === t ? C.text : C.muted,
                        cursor: "pointer",
                        fontSize: 11,
                        fontWeight: 700,
                        letterSpacing: ".06em",
                        padding: "8px 14px 10px",
                        textTransform: "uppercase",
                        transition: "color .15s",
                      }}
                    >
                      {t}
                    </button>
                  ))}
                </div>

                {/* Tab content */}
                {tab === "Overview" && (
                  <div>
                    <Section title="Key Insights">
                      <KeyInsights prospect={prospect} competitors={competitors} />
                    </Section>
                    <Section title="Competitor Comparison">
                      <CompetitorTable prospect={prospect} competitors={competitors} />
                    </Section>
                    {data.narrative && (
                      <Section title="AI Analysis">
                        <div style={{ color: C.muted, fontSize: 12, lineHeight: 1.8, whiteSpace: "pre-wrap" }}>{data.narrative}</div>
                      </Section>
                    )}
                  </div>
                )}

                {tab === "Outreach" && (
                  <div>
                    {data.coldCallHook && (
                      <Section title="Cold Call Hook">
                        <div style={{ background: "#0D1A0D", border: `1px solid ${C.green}33`, borderLeft: `3px solid ${C.green}`, borderRadius: "0 6px 6px 0", padding: "14px 18px", fontSize: 13, lineHeight: 1.7, color: C.text, whiteSpace: "pre-wrap" }}>
                          {data.coldCallHook}
                        </div>
                      </Section>
                    )}
                    {data.emailSubject && (
                      <Section title="Cold Email">
                        <div style={{ color: C.muted, fontSize: 10, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 4 }}>Subject</div>
                        <div style={{ color: C.text, fontSize: 13, marginBottom: 14, fontWeight: 600 }}>{data.emailSubject}</div>
                        <div style={{ color: C.muted, fontSize: 10, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 4 }}>Body</div>
                        <div style={{ background: "#0D1A0D", border: `1px solid ${C.green}33`, borderRadius: 6, padding: 14, fontSize: 12, lineHeight: 1.8, color: C.text, whiteSpace: "pre-wrap" }}>
                          {data.emailBody}
                        </div>
                      </Section>
                    )}
                    {data.ghostScore != null && (
                      <Section title="Ghost Business Score">
                        <div style={{ fontSize: 28, fontWeight: 800 }}>{score(data.ghostScore)}</div>
                        <div style={{ color: C.muted, fontSize: 11, marginTop: 4 }}>Higher = more likely a ghost or weak competitor. Good targets score 60+.</div>
                      </Section>
                    )}
                  </div>
                )}

                {tab === "Competitors" && (
                  <div>
                    <Section title="Top Local Competitors">
                      <CompetitorTable prospect={prospect} competitors={competitors} />
                    </Section>
                    {competitors.map((comp, i) => (
                      <div key={i} style={{ ...S.card, marginBottom: 10 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                          <div>
                            <div style={{ fontWeight: 700, color: C.text, fontSize: 13 }}>{comp.name}</div>
                            <div style={{ color: C.muted, fontSize: 11 }}>{comp.city} · {comp.category}</div>
                          </div>
                          <div style={{ textAlign: "right" }}>
                            <Stars rating={comp.rating} />
                            <div style={{ color: C.muted, fontSize: 11 }}>{(comp.reviewCount || 0).toLocaleString()} reviews</div>
                          </div>
                        </div>
                        {comp.scores && (
                          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                            {Object.entries(comp.scores).map(([k, v]) => (
                              <div key={k}>
                                <div style={{ color: C.dim, fontSize: 9, textTransform: "uppercase" }}>{k}</div>
                                <div style={{ color: C.text, fontSize: 12, fontWeight: 700 }}>{v}</div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {tab === "Report" && (
                  <div>
                    <Section title="Downloadable Report">
                      <p style={{ color: C.muted, fontSize: 12, marginBottom: 14 }}>
                        Self-contained HTML file. Open in any browser. Send to your team or attach to an outreach follow-up.
                      </p>
                      <button style={S.btn("primary")} onClick={downloadReport}>↓ Download HTML Report</button>
                    </Section>
                    <Section title="Request Free Mock Site">
                      <div style={{ background: "#0D1A0D", border: `1px solid ${C.green}33`, borderRadius: 6, padding: 16 }}>
                        <div style={{ color: C.text, fontSize: 13, fontWeight: 700, marginBottom: 6 }}>Want to see what {prospect.name} could look like?</div>
                        <div style={{ color: C.muted, fontSize: 12, marginBottom: 14 }}>We build a free mock site before we ever pitch. No commitment.</div>
                        <a
                          href={`https://sitework.build/get-started?biz=${encodeURIComponent(prospect.name || "")}`}
                          target="_blank"
                          rel="noreferrer"
                          style={{ ...S.btn("primary"), textDecoration: "none", display: "inline-block" }}
                        >
                          Request Free Mock →
                        </a>
                      </div>
                    </Section>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
