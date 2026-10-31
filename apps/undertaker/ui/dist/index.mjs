import { jsxs as a, Fragment as J, jsx as e } from "react/jsx-runtime";
import { useAppApi as ae, useNotify as le, useNavBadge as de } from "@kirocrew/app-sdk";
import { Card as A, CardTitle as M, Btn as y, ContentSkeleton as oe, StatCard as L, EmptyState as Q, Badge as E, Input as X, SegmentedControl as ue, PageHeader as he } from "@kirocrew/app-sdk/ui";
import { useState as o, useCallback as pe, useEffect as Z, useMemo as me } from "react";
const C = "/apps/undertaker/api", R = { info: 0, warning: 1, critical: 2 }, ee = { healthy: "healthy", "at-risk": "at risk", critical: "critical", unknown: "unscored" }, U = "text-left text-muted text-[12px] uppercase tracking-[.04em] px-2.5 py-2 border-b border-border font-medium", P = "px-2.5 py-2 text-sm align-middle", I = "bg-transparent border border-border rounded-md px-2 py-1 text-[13px] text-text";
function re(n) {
  return n === "healthy" ? "ok" : n === "at-risk" ? "warn" : n === "critical" || n === null ? "err" : "muted";
}
function ie(n, i) {
  return n === null ? ee[i] : `${n} · ${ee[i]}`;
}
function xe(n) {
  return n === "critical" ? "err" : n === "warning" ? "warn" : "muted";
}
function W(n) {
  return n instanceof Error ? n.message : String(n);
}
function fe(n, i) {
  const s = (Date.parse(n) - Date.parse(i)) / 36e5;
  return Math.abs(s) < 1 ? `${Math.round(s * 60)} min` : Math.abs(s) < 48 ? `${Math.round(s)} h` : `${Math.round(s / 24)} d`;
}
function ge({ points: n }) {
  if (n.length < 2) return /* @__PURE__ */ e("span", { className: "text-muted text-[12px]", children: n.length === 1 ? "one scan" : "no scans" });
  const i = 96, s = 24, l = i / (n.length - 1), u = n.map((x, p) => [p * l, s - 2 - x.score / 100 * (s - 4)]), v = u[u.length - 1] ?? [0, 0], h = `Score trend: ${n.map((x) => x.score).join(", ")}`;
  return /* @__PURE__ */ a("svg", { width: i, height: s, viewBox: `-2 0 ${i + 4} ${s}`, role: "img", "aria-label": h, className: "text-muted", children: [
    /* @__PURE__ */ e("title", { children: h }),
    /* @__PURE__ */ e("polyline", { points: u.map(([x, p]) => `${x},${p}`).join(" "), fill: "none", stroke: "currentColor", strokeWidth: "1.5", strokeLinejoin: "round" }),
    /* @__PURE__ */ e("circle", { cx: v[0], cy: v[1], r: "2.5", fill: "currentColor" })
  ] });
}
function te() {
  return /* @__PURE__ */ a("svg", { width: "32", height: "32", viewBox: "0 0 64 64", "aria-hidden": "true", className: "text-muted", children: [
    /* @__PURE__ */ e("path", { d: "M16 44V28a16 16 0 0 1 32 0v16z", fill: "none", stroke: "currentColor", strokeWidth: "3" }),
    /* @__PURE__ */ e("path", { d: "M12 48h40", stroke: "currentColor", strokeWidth: "3", strokeLinecap: "round" }),
    /* @__PURE__ */ e("path", { d: "M32 24v12M27 29h10", stroke: "currentColor", strokeWidth: "3", strokeLinecap: "round" })
  ] });
}
function ve({ fixtures: n, onAdded: i }) {
  const s = ae(), l = le(), [u, v] = o("package"), [h, x] = o("fixture"), [p, r] = o(""), [m, N] = o("24"), [B, f] = o(!1), [S, j] = o(null), D = (n == null ? void 0 : n[u]) ?? [], $ = h === "fixture" ? p || D[0] || "" : p;
  async function F(c) {
    c.preventDefault(), f(!0), j(null);
    try {
      await s.post(`${C}/watches`, { kind: u, mode: h, subject: $.trim(), everyHours: Number(m) }), l(`Watching ${$}`, { type: "success" }), r(""), i();
    } catch (b) {
      j(W(b));
    } finally {
      f(!1);
    }
  }
  return /* @__PURE__ */ a("form", { onSubmit: F, className: "flex flex-wrap items-end gap-3", children: [
    /* @__PURE__ */ a("label", { className: "flex flex-col gap-1 text-[12px] text-muted", children: [
      "Type",
      /* @__PURE__ */ a("select", { className: I, value: u, onChange: (c) => {
        v(c.target.value), r("");
      }, children: [
        /* @__PURE__ */ e("option", { value: "package", children: "npm package" }),
        /* @__PURE__ */ e("option", { value: "repository", children: "GitHub repository" })
      ] })
    ] }),
    /* @__PURE__ */ a("label", { className: "flex flex-col gap-1 text-[12px] text-muted", children: [
      "Source",
      /* @__PURE__ */ a("select", { className: I, value: h, onChange: (c) => {
        x(c.target.value), r("");
      }, children: [
        /* @__PURE__ */ e("option", { value: "fixture", children: "Recorded fixture (offline)" }),
        /* @__PURE__ */ e("option", { value: "live", children: "Live public API" })
      ] })
    ] }),
    /* @__PURE__ */ a("label", { className: "flex flex-col gap-1 text-[12px] text-muted", children: [
      h === "fixture" ? "Fixture" : u === "package" ? "Package name" : "owner/repo",
      h === "fixture" ? /* @__PURE__ */ e("select", { className: I, value: $, onChange: (c) => r(c.target.value), children: D.map((c) => /* @__PURE__ */ e("option", { value: c, children: c }, c)) }) : /* @__PURE__ */ e(X, { value: p, onChange: (c) => r(c.target.value), placeholder: u === "package" ? "left-pad" : "owner/name", required: !0 })
    ] }),
    /* @__PURE__ */ a("label", { className: "flex flex-col gap-1 text-[12px] text-muted", children: [
      "Every (hours)",
      /* @__PURE__ */ e(X, { type: "number", min: 1, max: 720, value: m, onChange: (c) => N(c.target.value), className: "w-24" })
    ] }),
    /* @__PURE__ */ e(y, { type: "submit", primary: !0, disabled: B || $.trim() === "", children: B ? "Adding…" : "Add watch" }),
    h === "live" && /* @__PURE__ */ e("p", { className: "w-full text-[12px] text-muted", children: "Live scans call the public npm and GitHub APIs without a token. Failed sources show up as unavailable evidence." }),
    S && /* @__PURE__ */ e("p", { role: "alert", className: "w-full text-[13px] text-danger-text", children: S })
  ] });
}
function be({ watch: n }) {
  var p;
  const [i, s] = o("all"), l = ((p = n.latest) == null ? void 0 : p.report) ?? null;
  if (!n.latest) return /* @__PURE__ */ e("p", { className: "text-sm text-muted", children: "Not scanned yet. Use Run now." });
  if (!l) return /* @__PURE__ */ a("p", { role: "alert", className: "text-sm text-danger-text", children: [
    "Last scan failed: ",
    n.latest.error
  ] });
  const u = i === "all" ? 0 : R[i], v = l.findings.filter((r) => R[r.severity] >= u).sort((r, m) => R[m.severity] - R[r.severity] || m.weight - r.weight), h = new Map(l.evidence.map((r) => [r.id, r])), x = (r) => l.findings.filter((m) => R[m.severity] >= R[r]).length;
  return /* @__PURE__ */ a("div", { className: "flex flex-col gap-3", children: [
    /* @__PURE__ */ a("div", { className: "flex flex-wrap items-center justify-between gap-2", children: [
      /* @__PURE__ */ a("span", { className: "text-sm text-muted", children: [
        l.subject,
        " · scanned ",
        new Date(l.generatedAt).toLocaleString(),
        " · ",
        n.mode === "fixture" ? "recorded fixture" : "live"
      ] }),
      /* @__PURE__ */ e(
        ue,
        {
          ariaLabel: "Minimum severity",
          value: i,
          onChange: s,
          segments: [
            { key: "all", label: "All", count: l.findings.length },
            { key: "warning", label: "Warning+", count: x("warning") },
            { key: "critical", label: "Critical", count: x("critical") }
          ]
        }
      )
    ] }),
    l.score.score === null ? /* @__PURE__ */ e("p", { className: "text-sm", children: "Unscored: no evidence could be collected, so NecroKit gives no score and Undertaker makes no plan. The reasons are listed below." }) : v.length === 0 ? /* @__PURE__ */ e("p", { className: "text-sm text-muted", children: l.findings.length === 0 ? "No findings. Nothing to revive." : "No findings at this severity." }) : /* @__PURE__ */ e("ul", { className: "flex flex-col gap-2", children: v.map((r) => /* @__PURE__ */ a("li", { className: "border border-border rounded-md px-3 py-2", children: [
      /* @__PURE__ */ a("div", { className: "flex items-center gap-2", children: [
        /* @__PURE__ */ e(E, { variant: xe(r.severity), children: r.severity }),
        /* @__PURE__ */ e("span", { className: "text-sm font-medium", children: r.title }),
        /* @__PURE__ */ e("span", { className: "text-[12px] text-muted", children: r.ruleId })
      ] }),
      /* @__PURE__ */ e("p", { className: "text-sm mt-1", children: r.explanation }),
      /* @__PURE__ */ a("p", { className: "text-[12px] text-muted mt-1", children: [
        "Evidence: ",
        r.evidenceIds.map((m) => {
          const N = h.get(m);
          return N ? `${N.label} = ${String(N.value)} (${N.source})` : m;
        }).join("; ")
      ] })
    ] }, r.id)) }),
    l.unavailable.length > 0 && /* @__PURE__ */ a("div", { children: [
      /* @__PURE__ */ e("p", { className: "text-[12px] uppercase tracking-[.04em] text-muted", children: "Unavailable evidence" }),
      /* @__PURE__ */ e("ul", { className: "text-sm", children: l.unavailable.map((r) => /* @__PURE__ */ a("li", { children: [
        r.source,
        ": ",
        r.reason
      ] }, r.id)) })
    ] })
  ] });
}
function ne({ plan: n, onDecide: i, busy: s }) {
  return /* @__PURE__ */ a("li", { className: "border border-border rounded-md px-3 py-2.5", children: [
    /* @__PURE__ */ a("div", { className: "flex flex-wrap items-center justify-between gap-2", children: [
      /* @__PURE__ */ a("div", { className: "flex items-center gap-2", children: [
        /* @__PURE__ */ e("span", { className: "text-sm font-medium", children: n.title }),
        /* @__PURE__ */ e(E, { variant: re(n.band), children: ie(n.score, n.band) })
      ] }),
      n.decision === null ? /* @__PURE__ */ a("div", { className: "flex gap-2", children: [
        /* @__PURE__ */ e(y, { primary: !0, disabled: s, onClick: () => i(n.id, "approve"), children: "Approve" }),
        /* @__PURE__ */ e(y, { disabled: s, onClick: () => i(n.id, "dismiss"), children: "Dismiss" })
      ] }) : /* @__PURE__ */ e(E, { variant: n.decision === "approve" ? "ok" : "muted", children: n.decision === "approve" ? "approved" : "dismissed" })
    ] }),
    /* @__PURE__ */ e("ol", { className: "mt-2 flex flex-col gap-1", children: n.steps.map((l) => /* @__PURE__ */ a("li", { className: "text-sm flex gap-2", children: [
      /* @__PURE__ */ a("span", { className: "text-muted w-5 shrink-0", children: [
        l.priority,
        "."
      ] }),
      /* @__PURE__ */ a("span", { children: [
        l.action,
        " ",
        /* @__PURE__ */ a("span", { className: "text-muted text-[12px]", children: [
          "(",
          l.severity,
          ": ",
          l.title,
          ")"
        ] })
      ] })
    ] }, l.findingId)) })
  ] });
}
function Ce() {
  var q, z;
  const n = ae(), i = le(), s = de(), [l, u] = o(null), [v, h] = o([]), [x, p] = o(null), [r, m] = o(null), [N, B] = o(null), [f, S] = o(null), [j, D] = o(!1), [$, F] = o(null), c = pe(async () => {
    try {
      const [t, d] = await Promise.all([
        n.get(`${C}/watches`),
        n.get(`${C}/plans`)
      ]);
      u(t), h(d.plans), m(null);
    } catch (t) {
      m(W(t));
    }
  }, [n]);
  Z(() => {
    c(), n.get(`${C}/fixtures`).then(p).catch(() => p(null));
  }, []), Z(() => {
    s((l == null ? void 0 : l.summary.critical) ?? 0);
  }, [l, s]);
  const b = me(() => {
    const t = (l == null ? void 0 : l.watches) ?? [];
    return t.find((d) => d.id === N) ?? t.find((d) => {
      var g;
      return ((g = d.latest) == null ? void 0 : g.band) === "critical";
    }) ?? t[0] ?? null;
  }, [l, N]);
  async function T(t, d, g) {
    S(t);
    try {
      await d(), g && i(g, { type: "success" }), await c();
    } catch (w) {
      i(W(w), { type: "error" });
    } finally {
      S(null);
    }
  }
  const K = (t) => T(t ?? "all", async () => {
    const d = await n.post(`${C}/run`, t ? { watchId: t } : {});
    t || i(d.ran.length ? `Scanned ${d.ran.length} due watches` : "Nothing was due", { type: "info" });
  }), V = (t, d) => T(t, () => n.post(`${C}/plans/${t}/decision`, { decision: d }), d === "approve" ? "Plan approved" : "Plan dismissed"), se = (t) => T(t.id, () => n.del(`${C}/watches/${t.id}`), `Stopped watching ${t.subject}`);
  async function ce() {
    S("export");
    try {
      const d = await (await n.raw(`${C}/plans/export`)).text();
      F(d);
      const g = URL.createObjectURL(new Blob([d], { type: "text/markdown" })), w = document.createElement("a");
      w.href = g, w.download = "undertaker-approved-plans.md", w.click(), URL.revokeObjectURL(g);
    } catch (t) {
      i(W(t), { type: "error" });
    } finally {
      S(null);
    }
  }
  const G = v.filter((t) => t.decision === null), H = v.filter((t) => t.decision !== null), O = H.filter((t) => t.decision === "approve").length, _ = /* @__PURE__ */ e(
    he,
    {
      title: "Undertaker",
      subtitle: "Scheduled NecroKit scans and revival plans that wait for your approval",
      actions: /* @__PURE__ */ a("div", { className: "flex gap-2", children: [
        /* @__PURE__ */ e(y, { onClick: () => K(), disabled: f !== null || !l, children: f === "all" ? "Scanning…" : "Run due watches" }),
        /* @__PURE__ */ a(y, { onClick: ce, disabled: f !== null || O === 0, children: [
          "Export approved (",
          O,
          ")"
        ] })
      ] })
    }
  );
  if (!l)
    return /* @__PURE__ */ a(J, { children: [
      _,
      /* @__PURE__ */ e("div", { className: "px-6 pb-8 overflow-y-auto flex-1 min-h-0", children: r ? /* @__PURE__ */ a(A, { children: [
        /* @__PURE__ */ e(M, { children: "Could not reach the Undertaker backend" }),
        /* @__PURE__ */ e("p", { role: "alert", className: "text-sm text-danger-text mb-3", children: r }),
        /* @__PURE__ */ e("p", { className: "text-sm text-muted mb-3", children: "Check that the app is enabled and trusted in Settings → Security, then retry." }),
        /* @__PURE__ */ e(y, { onClick: () => void c(), children: "Retry" })
      ] }) : /* @__PURE__ */ e(A, { children: /* @__PURE__ */ e(oe, { rows: 6 }) }) })
    ] });
  const { summary: k } = l;
  return /* @__PURE__ */ a(J, { children: [
    _,
    /* @__PURE__ */ e("div", { className: "px-6 pb-8 overflow-y-auto flex-1 min-h-0", children: /* @__PURE__ */ a("div", { className: "flex flex-col gap-4", children: [
      r && /* @__PURE__ */ a("p", { role: "alert", className: "text-sm text-danger-text", children: [
        "Last refresh failed: ",
        r
      ] }),
      /* @__PURE__ */ a("div", { className: "grid gap-3.5 grid-cols-[repeat(auto-fit,minmax(150px,1fr))]", children: [
        /* @__PURE__ */ e(L, { label: "Critical", value: k.critical, accent: k.critical > 0 }),
        /* @__PURE__ */ e(L, { label: "At risk", value: k.atRisk }),
        /* @__PURE__ */ e(L, { label: "Healthy", value: k.healthy }),
        /* @__PURE__ */ e(L, { label: "Due now", value: k.due }),
        /* @__PURE__ */ e(L, { label: "Plans to review", value: k.pendingPlans }),
        k.unknown > 0 && /* @__PURE__ */ e(L, { label: "Unscored", value: k.unknown, title: "No evidence could be collected for these watches" })
      ] }),
      /* @__PURE__ */ a(A, { children: [
        /* @__PURE__ */ e(M, { children: "Watches" }),
        l.watches.length === 0 ? /* @__PURE__ */ e(Q, { icon: /* @__PURE__ */ e(te, {}), title: "Nothing is being watched", subtitle: "Add a package or repository below. Recorded fixtures work offline." }) : /* @__PURE__ */ e("div", { className: "overflow-x-auto", children: /* @__PURE__ */ a("table", { className: "w-full border-collapse", children: [
          /* @__PURE__ */ e("thead", { children: /* @__PURE__ */ a("tr", { children: [
            /* @__PURE__ */ e("th", { className: U, children: "Subject" }),
            /* @__PURE__ */ e("th", { className: U, children: "Health" }),
            /* @__PURE__ */ e("th", { className: U, children: "Trend" }),
            /* @__PURE__ */ e("th", { className: U, children: "Schedule" }),
            /* @__PURE__ */ e("th", { className: U, children: /* @__PURE__ */ e("span", { className: "sr-only", children: "Actions" }) })
          ] }) }),
          /* @__PURE__ */ e("tbody", { children: l.watches.map((t) => {
            var w, Y;
            const d = t.latest ? t.latest.band : null, g = (b == null ? void 0 : b.id) === t.id;
            return /* @__PURE__ */ a("tr", { className: g ? "bg-bg-hover" : "", children: [
              /* @__PURE__ */ e("td", { className: P, children: /* @__PURE__ */ a("button", { type: "button", onClick: () => B(t.id), className: "text-left cursor-pointer", "aria-pressed": g, children: [
                /* @__PURE__ */ e("span", { className: "font-medium", children: ((Y = (w = t.latest) == null ? void 0 : w.report) == null ? void 0 : Y.subject) ?? t.subject }),
                /* @__PURE__ */ a("span", { className: "block text-[12px] text-muted", children: [
                  t.kind,
                  " · ",
                  t.mode === "fixture" ? `fixture "${t.subject}"` : "live"
                ] })
              ] }) }),
              /* @__PURE__ */ e("td", { className: P, children: t.latest ? /* @__PURE__ */ e(E, { variant: re(d), children: d ? ie(t.latest.score, d) : "scan failed" }) : /* @__PURE__ */ e(E, { variant: "muted", children: "not scanned" }) }),
              /* @__PURE__ */ e("td", { className: P, children: /* @__PURE__ */ e(ge, { points: t.trend }) }),
              /* @__PURE__ */ a("td", { className: P, children: [
                t.due ? /* @__PURE__ */ e(E, { variant: "aim", children: "due" }) : /* @__PURE__ */ a("span", { className: "text-[13px] text-muted", children: [
                  "next in ",
                  fe(t.nextRunAt, l.now)
                ] }),
                /* @__PURE__ */ a("span", { className: "block text-[12px] text-muted", children: [
                  "every ",
                  t.everyHours,
                  " h"
                ] })
              ] }),
              /* @__PURE__ */ e("td", { className: `${P} text-right whitespace-nowrap`, children: /* @__PURE__ */ a("div", { className: "inline-flex gap-2", children: [
                /* @__PURE__ */ e(y, { onClick: () => K(t.id), disabled: f !== null, children: f === t.id ? "Scanning…" : "Run now" }),
                /* @__PURE__ */ e(y, { danger: !0, onClick: () => se(t), disabled: f !== null, "aria-label": `Stop watching ${t.subject}`, children: "Remove" })
              ] }) })
            ] }, t.id);
          }) })
        ] }) })
      ] }),
      b && /* @__PURE__ */ a(A, { children: [
        /* @__PURE__ */ a(M, { children: [
          "Findings · ",
          ((z = (q = b.latest) == null ? void 0 : q.report) == null ? void 0 : z.subject) ?? b.subject
        ] }),
        /* @__PURE__ */ e(be, { watch: b }, b.id)
      ] }),
      /* @__PURE__ */ a(A, { children: [
        /* @__PURE__ */ a("div", { className: "flex flex-wrap items-center justify-between gap-2 mb-2", children: [
          /* @__PURE__ */ e(M, { children: "Revival plans" }),
          H.length > 0 && /* @__PURE__ */ e(y, { onClick: () => D((t) => !t), children: j ? "Hide decided" : `Show decided (${H.length})` })
        ] }),
        /* @__PURE__ */ e("p", { className: "text-[13px] text-muted mb-3", children: "Undertaker never changes code. Approving a plan only adds it to the export for you to act on." }),
        G.length === 0 && !j ? /* @__PURE__ */ e(Q, { icon: /* @__PURE__ */ e(te, {}), title: "No plans waiting", subtitle: "New plans appear when a scan finds something to fix." }) : /* @__PURE__ */ a("ul", { className: "flex flex-col gap-2", children: [
          G.map((t) => /* @__PURE__ */ e(ne, { plan: t, onDecide: V, busy: f !== null }, t.id)),
          j && H.map((t) => /* @__PURE__ */ e(ne, { plan: t, onDecide: V, busy: f !== null }, t.id))
        ] }),
        $ && /* @__PURE__ */ a("details", { className: "mt-3", children: [
          /* @__PURE__ */ e("summary", { className: "text-sm cursor-pointer", children: "Last export (also downloaded as undertaker-approved-plans.md)" }),
          /* @__PURE__ */ e("pre", { className: "text-[12px] whitespace-pre-wrap mt-2 border border-border rounded-md p-3 max-h-80 overflow-auto", children: $ })
        ] })
      ] }),
      /* @__PURE__ */ a(A, { children: [
        /* @__PURE__ */ e(M, { children: "Add a watch" }),
        /* @__PURE__ */ e(ve, { fixtures: x, onAdded: () => void c() })
      ] })
    ] }) })
  ] });
}
export {
  Ce as default
};
