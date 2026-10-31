/**
 * Undertaker dashboard page.
 *
 * Talks to the app backend through the gateway proxy at /apps/undertaker/api/*.
 * Shows watches with schedule state and score trend, the findings of the selected
 * watch, and revival plans waiting for a human decision.
 */
import { useAppApi, useNavBadge, useNotify } from '@kirocrew/app-sdk'
import { Badge, Btn, Card, CardTitle, ContentSkeleton, EmptyState, Input, PageHeader, SegmentedControl, StatCard } from '@kirocrew/app-sdk/ui'
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import type {
  Band,
  FixturesResponse,
  Plan,
  PlansResponse,
  RunResponse,
  Severity,
  TrendPoint,
  WatchesResponse,
  WatchKind,
  WatchMode,
  WatchView,
} from '../../src/api-types.ts'

const BASE = '/apps/undertaker/api'
const SEVERITY_RANK: Record<Severity, number> = { info: 0, warning: 1, critical: 2 }
const BAND_LABEL: Record<Band, string> = { healthy: 'healthy', 'at-risk': 'at risk', critical: 'critical', unknown: 'unscored' }

type BadgeVariant = 'ok' | 'err' | 'warn' | 'aim' | 'muted'
type SeverityFilter = 'all' | 'warning' | 'critical'

const th = 'text-left text-muted text-[12px] uppercase tracking-[.04em] px-2.5 py-2 border-b border-border font-medium'
const td = 'px-2.5 py-2 text-sm align-middle'
const field = 'bg-transparent border border-border rounded-md px-2 py-1 text-[13px] text-text'

function bandVariant(band: Band | null): BadgeVariant {
  if (band === 'healthy') return 'ok'
  if (band === 'at-risk') return 'warn'
  if (band === 'critical' || band === null) return 'err'
  return 'muted'
}

/** "68 · at risk", or just "unscored" when NecroKit had no evidence to score. */
function scoreLabel(score: number | null, band: Band): string {
  return score === null ? BAND_LABEL[band] : `${score} · ${BAND_LABEL[band]}`
}

function severityVariant(severity: Severity): BadgeVariant {
  return severity === 'critical' ? 'err' : severity === 'warning' ? 'warn' : 'muted'
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function relative(iso: string, now: string): string {
  const hours = (Date.parse(iso) - Date.parse(now)) / 3_600_000
  if (Math.abs(hours) < 1) return `${Math.round(hours * 60)} min`
  if (Math.abs(hours) < 48) return `${Math.round(hours)} h`
  return `${Math.round(hours / 24)} d`
}

/** Score history as a small line. Uses currentColor so it follows the host theme. */
function Sparkline({ points }: { points: TrendPoint[] }) {
  if (points.length < 2) return <span className="text-muted text-[12px]">{points.length === 1 ? 'one scan' : 'no scans'}</span>
  const w = 96
  const h = 24
  const step = w / (points.length - 1)
  const xy = points.map((p, i) => [i * step, h - 2 - (p.score / 100) * (h - 4)] as const)
  const last = xy[xy.length - 1] ?? [0, 0]
  const label = `Score trend: ${points.map((p) => p.score).join(', ')}`
  return (
    <svg width={w} height={h} viewBox={`-2 0 ${w + 4} ${h}`} role="img" aria-label={label} className="text-muted">
      <title>{label}</title>
      <polyline points={xy.map(([x, y]) => `${x},${y}`).join(' ')} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <circle cx={last[0]} cy={last[1]} r="2.5" fill="currentColor" />
    </svg>
  )
}

/** Small tombstone mark for empty states (no icon library). */
function Tombstone() {
  return (
    <svg width="32" height="32" viewBox="0 0 64 64" aria-hidden="true" className="text-muted">
      <path d="M16 44V28a16 16 0 0 1 32 0v16z" fill="none" stroke="currentColor" strokeWidth="3" />
      <path d="M12 48h40" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <path d="M32 24v12M27 29h10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}

function AddWatch({ fixtures, onAdded }: { fixtures: FixturesResponse | null; onAdded: () => void }) {
  const api = useAppApi()
  const notify = useNotify()
  const [kind, setKind] = useState<WatchKind>('package')
  const [mode, setMode] = useState<WatchMode>('fixture')
  const [subject, setSubject] = useState('')
  const [everyHours, setEveryHours] = useState('24')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const options = fixtures?.[kind] ?? []
  const chosen = mode === 'fixture' ? subject || options[0] || '' : subject

  async function submit(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    setError(null)
    try {
      await api.post(`${BASE}/watches`, { kind, mode, subject: chosen.trim(), everyHours: Number(everyHours) })
      notify(`Watching ${chosen}`, { type: 'success' })
      setSubject('')
      onAdded()
    } catch (err) {
      setError(errorText(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-wrap items-end gap-3">
      <label className="flex flex-col gap-1 text-[12px] text-muted">
        Type
        <select className={field} value={kind} onChange={(e) => { setKind(e.target.value as WatchKind); setSubject('') }}>
          <option value="package">npm package</option>
          <option value="repository">GitHub repository</option>
        </select>
      </label>
      <label className="flex flex-col gap-1 text-[12px] text-muted">
        Source
        <select className={field} value={mode} onChange={(e) => { setMode(e.target.value as WatchMode); setSubject('') }}>
          <option value="fixture">Recorded fixture (offline)</option>
          <option value="live">Live public API</option>
        </select>
      </label>
      <label className="flex flex-col gap-1 text-[12px] text-muted">
        {mode === 'fixture' ? 'Fixture' : kind === 'package' ? 'Package name' : 'owner/repo'}
        {mode === 'fixture' ? (
          <select className={field} value={chosen} onChange={(e) => setSubject(e.target.value)}>
            {options.map((name) => <option key={name} value={name}>{name}</option>)}
          </select>
        ) : (
          <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder={kind === 'package' ? 'left-pad' : 'owner/name'} required />
        )}
      </label>
      <label className="flex flex-col gap-1 text-[12px] text-muted">
        Every (hours)
        <Input type="number" min={1} max={720} value={everyHours} onChange={(e) => setEveryHours(e.target.value)} className="w-24" />
      </label>
      <Btn type="submit" primary disabled={saving || chosen.trim() === ''}>{saving ? 'Adding…' : 'Add watch'}</Btn>
      {mode === 'live' && <p className="w-full text-[12px] text-muted">Live scans call the public npm and GitHub APIs without a token. Failed sources show up as unavailable evidence.</p>}
      {error && <p role="alert" className="w-full text-[13px] text-danger-text">{error}</p>}
    </form>
  )
}

function Findings({ watch }: { watch: WatchView }) {
  const [filter, setFilter] = useState<SeverityFilter>('all')
  const report = watch.latest?.report ?? null
  if (!watch.latest) return <p className="text-sm text-muted">Not scanned yet. Use Run now.</p>
  if (!report) return <p role="alert" className="text-sm text-danger-text">Last scan failed: {watch.latest.error}</p>

  const min = filter === 'all' ? 0 : SEVERITY_RANK[filter]
  const shown = report.findings
    .filter((f) => SEVERITY_RANK[f.severity] >= min)
    .sort((a, b) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity] || b.weight - a.weight)
  const evidence = new Map(report.evidence.map((e) => [e.id, e]))
  const count = (s: Severity) => report.findings.filter((f) => SEVERITY_RANK[f.severity] >= SEVERITY_RANK[s]).length

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm text-muted">
          {report.subject} · scanned {new Date(report.generatedAt).toLocaleString()} · {watch.mode === 'fixture' ? 'recorded fixture' : 'live'}
        </span>
        <SegmentedControl<SeverityFilter>
          ariaLabel="Minimum severity"
          value={filter}
          onChange={setFilter}
          segments={[
            { key: 'all', label: 'All', count: report.findings.length },
            { key: 'warning', label: 'Warning+', count: count('warning') },
            { key: 'critical', label: 'Critical', count: count('critical') },
          ]}
        />
      </div>
      {report.score.score === null ? (
        <p className="text-sm">
          Unscored: no evidence could be collected, so NecroKit gives no score and Undertaker makes no plan. The reasons are listed below.
        </p>
      ) : shown.length === 0 ? (
        <p className="text-sm text-muted">{report.findings.length === 0 ? 'No findings. Nothing to revive.' : 'No findings at this severity.'}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {shown.map((f) => (
            <li key={f.id} className="border border-border rounded-md px-3 py-2">
              <div className="flex items-center gap-2">
                <Badge variant={severityVariant(f.severity)}>{f.severity}</Badge>
                <span className="text-sm font-medium">{f.title}</span>
                <span className="text-[12px] text-muted">{f.ruleId}</span>
              </div>
              <p className="text-sm mt-1">{f.explanation}</p>
              <p className="text-[12px] text-muted mt-1">
                Evidence: {f.evidenceIds.map((id) => {
                  const e = evidence.get(id)
                  return e ? `${e.label} = ${String(e.value)} (${e.source})` : id
                }).join('; ')}
              </p>
            </li>
          ))}
        </ul>
      )}
      {report.unavailable.length > 0 && (
        <div>
          <p className="text-[12px] uppercase tracking-[.04em] text-muted">Unavailable evidence</p>
          <ul className="text-sm">
            {report.unavailable.map((u) => <li key={u.id}>{u.source}: {u.reason}</li>)}
          </ul>
        </div>
      )}
    </div>
  )
}

function PlanCard({ plan, onDecide, busy }: { plan: Plan; onDecide: (id: string, decision: 'approve' | 'dismiss') => void; busy: boolean }) {
  return (
    <li className="border border-border rounded-md px-3 py-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{plan.title}</span>
          <Badge variant={bandVariant(plan.band)}>{scoreLabel(plan.score, plan.band)}</Badge>
        </div>
        {plan.decision === null ? (
          <div className="flex gap-2">
            <Btn primary disabled={busy} onClick={() => onDecide(plan.id, 'approve')}>Approve</Btn>
            <Btn disabled={busy} onClick={() => onDecide(plan.id, 'dismiss')}>Dismiss</Btn>
          </div>
        ) : (
          <Badge variant={plan.decision === 'approve' ? 'ok' : 'muted'}>{plan.decision === 'approve' ? 'approved' : 'dismissed'}</Badge>
        )}
      </div>
      <ol className="mt-2 flex flex-col gap-1">
        {plan.steps.map((s) => (
          <li key={s.findingId} className="text-sm flex gap-2">
            <span className="text-muted w-5 shrink-0">{s.priority}.</span>
            <span>{s.action} <span className="text-muted text-[12px]">({s.severity}: {s.title})</span></span>
          </li>
        ))}
      </ol>
    </li>
  )
}

export default function Undertaker() {
  const api = useAppApi()
  const notify = useNotify()
  const setBadge = useNavBadge()
  const [data, setData] = useState<WatchesResponse | null>(null)
  const [plans, setPlans] = useState<Plan[]>([])
  const [fixtures, setFixtures] = useState<FixturesResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [showDecided, setShowDecided] = useState(false)
  const [exported, setExported] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const [watches, planList] = await Promise.all([
        api.get<WatchesResponse>(`${BASE}/watches`),
        api.get<PlansResponse>(`${BASE}/plans`),
      ])
      setData(watches)
      setPlans(planList.plans)
      setError(null)
    } catch (err) {
      setError(errorText(err))
    }
  }, [api])

  useEffect(() => {
    void load()
    api.get<FixturesResponse>(`${BASE}/fixtures`).then(setFixtures).catch(() => setFixtures(null))
  }, [])

  useEffect(() => {
    setBadge(data?.summary.critical ?? 0)
  }, [data, setBadge])

  const selected = useMemo(() => {
    const watches = data?.watches ?? []
    return watches.find((w) => w.id === selectedId) ?? watches.find((w) => w.latest?.band === 'critical') ?? watches[0] ?? null
  }, [data, selectedId])

  async function act(key: string, work: () => Promise<unknown>, done?: string) {
    setBusy(key)
    try {
      await work()
      if (done) notify(done, { type: 'success' })
      await load()
    } catch (err) {
      notify(errorText(err), { type: 'error' })
    } finally {
      setBusy(null)
    }
  }

  const runNow = (watchId?: string) =>
    act(watchId ?? 'all', async () => {
      const out = await api.post<RunResponse>(`${BASE}/run`, watchId ? { watchId } : {})
      if (!watchId) notify(out.ran.length ? `Scanned ${out.ran.length} due watches` : 'Nothing was due', { type: 'info' })
    })

  const decide = (id: string, decision: 'approve' | 'dismiss') =>
    act(id, () => api.post(`${BASE}/plans/${id}/decision`, { decision }), decision === 'approve' ? 'Plan approved' : 'Plan dismissed')

  const remove = (watch: WatchView) =>
    act(watch.id, () => api.del(`${BASE}/watches/${watch.id}`), `Stopped watching ${watch.subject}`)

  async function exportPlans() {
    setBusy('export')
    try {
      const res = await api.raw(`${BASE}/plans/export`)
      const text = await res.text()
      setExported(text)
      const url = URL.createObjectURL(new Blob([text], { type: 'text/markdown' }))
      const a = document.createElement('a')
      a.href = url
      a.download = 'undertaker-approved-plans.md'
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      notify(errorText(err), { type: 'error' })
    } finally {
      setBusy(null)
    }
  }

  const pending = plans.filter((p) => p.decision === null)
  const decided = plans.filter((p) => p.decision !== null)
  const approvedCount = decided.filter((p) => p.decision === 'approve').length

  const header = (
    <PageHeader
      title="Undertaker"
      subtitle="Scheduled NecroKit scans and revival plans that wait for your approval"
      actions={
        <div className="flex gap-2">
          <Btn onClick={() => runNow()} disabled={busy !== null || !data}>{busy === 'all' ? 'Scanning…' : 'Run due watches'}</Btn>
          <Btn onClick={exportPlans} disabled={busy !== null || approvedCount === 0}>Export approved ({approvedCount})</Btn>
        </div>
      }
    />
  )

  if (!data) {
    return (
      <>
        {header}
        <div className="px-6 pb-8 overflow-y-auto flex-1 min-h-0">
          {error ? (
            <Card>
              <CardTitle>Could not reach the Undertaker backend</CardTitle>
              <p role="alert" className="text-sm text-danger-text mb-3">{error}</p>
              <p className="text-sm text-muted mb-3">Check that the app is enabled and trusted in Settings → Security, then retry.</p>
              <Btn onClick={() => void load()}>Retry</Btn>
            </Card>
          ) : (
            <Card><ContentSkeleton rows={6} /></Card>
          )}
        </div>
      </>
    )
  }

  const { summary } = data

  return (
    <>
      {header}
      <div className="px-6 pb-8 overflow-y-auto flex-1 min-h-0 flex flex-col gap-4">
        {error && <p role="alert" className="text-sm text-danger-text">Last refresh failed: {error}</p>}
        <div className="grid gap-3.5 grid-cols-[repeat(auto-fit,minmax(150px,1fr))]">
          <StatCard label="Critical" value={summary.critical} accent={summary.critical > 0} />
          <StatCard label="At risk" value={summary.atRisk} />
          <StatCard label="Healthy" value={summary.healthy} />
          <StatCard label="Due now" value={summary.due} />
          <StatCard label="Plans to review" value={summary.pendingPlans} />
          {summary.unknown > 0 && <StatCard label="Unscored" value={summary.unknown} title="No evidence could be collected for these watches" />}
        </div>

        <Card>
          <CardTitle>Watches</CardTitle>
          {data.watches.length === 0 ? (
            <EmptyState icon={<Tombstone />} title="Nothing is being watched" subtitle="Add a package or repository below. Recorded fixtures work offline." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className={th}>Subject</th>
                    <th className={th}>Health</th>
                    <th className={th}>Trend</th>
                    <th className={th}>Schedule</th>
                    <th className={th}><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody>
                  {data.watches.map((w) => {
                    const band = w.latest ? w.latest.band : null
                    const isSelected = selected?.id === w.id
                    return (
                      <tr key={w.id} className={isSelected ? 'bg-bg-hover' : ''}>
                        <td className={td}>
                          <button type="button" onClick={() => setSelectedId(w.id)} className="text-left cursor-pointer" aria-pressed={isSelected}>
                            <span className="font-medium">{w.latest?.report?.subject ?? w.subject}</span>
                            <span className="block text-[12px] text-muted">{w.kind} · {w.mode === 'fixture' ? `fixture "${w.subject}"` : 'live'}</span>
                          </button>
                        </td>
                        <td className={td}>
                          {w.latest ? (
                            <Badge variant={bandVariant(band)}>{band ? scoreLabel(w.latest.score, band) : 'scan failed'}</Badge>
                          ) : (
                            <Badge variant="muted">not scanned</Badge>
                          )}
                        </td>
                        <td className={td}><Sparkline points={w.trend} /></td>
                        <td className={td}>
                          {w.due ? <Badge variant="aim">due</Badge> : <span className="text-[13px] text-muted">next in {relative(w.nextRunAt, data.now)}</span>}
                          <span className="block text-[12px] text-muted">every {w.everyHours} h</span>
                        </td>
                        <td className={`${td} text-right whitespace-nowrap`}>
                          <div className="inline-flex gap-2">
                            <Btn onClick={() => runNow(w.id)} disabled={busy !== null}>{busy === w.id ? 'Scanning…' : 'Run now'}</Btn>
                            <Btn danger onClick={() => remove(w)} disabled={busy !== null} aria-label={`Stop watching ${w.subject}`}>Remove</Btn>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {selected && (
          <Card>
            <CardTitle>Findings · {selected.latest?.report?.subject ?? selected.subject}</CardTitle>
            <Findings key={selected.id} watch={selected} />
          </Card>
        )}

        <Card>
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <CardTitle>Revival plans</CardTitle>
            {decided.length > 0 && (
              <Btn onClick={() => setShowDecided((v) => !v)}>{showDecided ? 'Hide decided' : `Show decided (${decided.length})`}</Btn>
            )}
          </div>
          <p className="text-[13px] text-muted mb-3">Undertaker never changes code. Approving a plan only adds it to the export for you to act on.</p>
          {pending.length === 0 && !showDecided ? (
            <EmptyState icon={<Tombstone />} title="No plans waiting" subtitle="New plans appear when a scan finds something to fix." />
          ) : (
            <ul className="flex flex-col gap-2">
              {pending.map((p) => <PlanCard key={p.id} plan={p} onDecide={decide} busy={busy !== null} />)}
              {showDecided && decided.map((p) => <PlanCard key={p.id} plan={p} onDecide={decide} busy={busy !== null} />)}
            </ul>
          )}
          {exported && (
            <details className="mt-3">
              <summary className="text-sm cursor-pointer">Last export (also downloaded as undertaker-approved-plans.md)</summary>
              <pre className="text-[12px] whitespace-pre-wrap mt-2 border border-border rounded-md p-3 max-h-80 overflow-auto">{exported}</pre>
            </details>
          )}
        </Card>

        <Card>
          <CardTitle>Add a watch</CardTitle>
          <AddWatch fixtures={fixtures} onAdded={() => void load()} />
        </Card>
      </div>
    </>
  )
}
