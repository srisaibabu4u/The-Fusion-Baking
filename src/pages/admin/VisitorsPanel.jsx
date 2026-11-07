import { useEffect, useMemo, useState } from 'react'
import { api } from '../../lib/api.js'
import { useShop } from '../../lib/store.jsx'
import { Notice } from '../../components/ui.jsx'

const RANGES = [7, 30, 90]
const fmtDay = (d, opts = { day: 'numeric', month: 'short' }) => new Date(`${d}T00:00:00`).toLocaleDateString('en-IN', opts)
const fmtTime = (iso) => new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })
const n = (v) => Number(v || 0).toLocaleString('en-IN')

function usePageName() {
  const { products } = useShop()
  return (path) => {
    if (path === '/') return 'Home'
    if (path.startsWith('/product/')) return products.find((p) => p.id === path.split('/')[2])?.name || 'A product page'
    if (path.startsWith('/shop/')) return decodeURIComponent(path.split('/')[2] || 'Shop')
    const known = { '/shop': 'Shop', '/cart': 'Basket', '/checkout': 'Checkout', '/bulk-orders': 'Bulk orders', '/account': 'My account', '/account/login': 'Sign in', '/account/register': 'Create account' }
    return known[path] || path
  }
}

function VisitsChart({ series }) {
  const [active, setActive] = useState(null)
  const max = Math.max(1, ...series.map((d) => d.visits))
  const tick = max <= 5 ? max : Math.ceil(max / 5) * 5
  const peak = series.reduce((a, b) => (b.visits > a.visits ? b : a), series[0])
  const labelIdx = new Set([0, Math.floor((series.length - 1) / 2), series.length - 1])
  const shown = active ?? null

  return (
    <figure className="vchart">
      <div className="vchart-plot" onMouseLeave={() => setActive(null)}>
        <div className="vchart-grid" aria-hidden="true">
          <span className="vchart-tick" style={{ bottom: '100%' }}>{n(tick)}</span>
          <span className="vchart-tick" style={{ bottom: '50%' }}>{n(tick / 2)}</span>
          <span className="vchart-tick" style={{ bottom: 0 }}>0</span>
        </div>
        <div className="vchart-bars" style={{ '--count': series.length }}>
          {series.map((d, i) => (
            <button
              key={d.day}
              type="button"
              className={`vchart-col ${shown === i ? 'is-active' : ''}`}
              onMouseEnter={() => setActive(i)}
              onFocus={() => setActive(i)}
              onBlur={() => setActive(null)}
              aria-label={`${fmtDay(d.day, { weekday: 'short', day: 'numeric', month: 'short' })}: ${d.visits} visits, ${d.visitors} people`}
            >
              <span className="vchart-bar" style={{ height: `${(d.visits / tick) * 100}%` }} />
              {d === peak && d.visits > 0 && shown == null && <span className="vchart-peak" style={{ bottom: `${(d.visits / tick) * 100}%` }}>{n(d.visits)}</span>}
            </button>
          ))}
          {shown != null && (
            <div className="vchart-tip" role="status" style={{ left: `${((shown + 0.5) / series.length) * 100}%` }}>
              <strong>{fmtDay(series[shown].day, { weekday: 'short', day: 'numeric', month: 'short' })}</strong>
              <span>{n(series[shown].visits)} visits</span>
              <span>{n(series[shown].visitors)} people</span>
            </div>
          )}
        </div>
      </div>
      <div className="vchart-x" style={{ '--count': series.length }} aria-hidden="true">
        {series.map((d, i) => <span key={d.day}>{labelIdx.has(i) ? fmtDay(d.day) : ''}</span>)}
      </div>
      <details className="vchart-table">
        <summary>Show as a table</summary>
        <table className="admin-table">
          <thead><tr><th>Day</th><th>Visits</th><th>People</th></tr></thead>
          <tbody>
            {[...series].reverse().map((d) => (
              <tr key={d.day}><td>{fmtDay(d.day, { weekday: 'short', day: 'numeric', month: 'short' })}</td><td>{n(d.visits)}</td><td>{n(d.visitors)}</td></tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  )
}

export default function VisitorsPanel() {
  const [days, setDays] = useState(30)
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [showAll, setShowAll] = useState(false)
  const pageName = usePageName()

  useEffect(() => {
    setError('')
    api(`/admin/analytics?days=${days}`, { as: 'admin' }).then(setData).catch((e) => setError(e.message))
  }, [days])

  const signedShare = useMemo(() => (data?.totals.visits ? Math.round((data.totals.signedInVisits / data.totals.visits) * 100) : 0), [data])

  return (
    <section>
      <header className="admin-head">
        <div>
          <h1>Visitors</h1>
          <p className="muted">One visit is one browsing session. Your own visits while signed in as admin aren’t counted.</p>
        </div>
        <div className="chips" role="group" aria-label="Date range">
          {RANGES.map((r) => (
            <button key={r} className={`chip ${days === r ? 'active' : ''}`} aria-pressed={days === r} onClick={() => setDays(r)}>Last {r} days</button>
          ))}
        </div>
      </header>
      <Notice>{error}</Notice>
      {!data ? (
        <p className="muted">Loading…</p>
      ) : (
        <>
          <div className="stat-row">
            <div className="stat"><span className="stat-value">{n(data.today.visits)}</span><span className="stat-label">Visits today</span></div>
            <div className="stat"><span className="stat-value">{n(data.today.visitors)}</span><span className="stat-label">People today</span></div>
            <div className="stat"><span className="stat-value">{n(data.totals.visits)}</span><span className="stat-label">Visits, last {data.days} days</span></div>
            <div className="stat"><span className="stat-value">{n(data.totals.visitors)}</span><span className="stat-label">Different people, last {data.days} days</span></div>
            <div className="stat"><span className="stat-value">{n(data.totals.signedInVisits)}</span><span className="stat-label">Visits by known customers ({signedShare}%)</span></div>
          </div>

          <div className="panel">
            <h2 className="panel-title">Visits per day</h2>
            {data.totals.visits ? <VisitsChart series={data.series} /> : <p className="muted">No visits in this period yet. Share your shop link on Instagram and WhatsApp to get started.</p>}
          </div>

          <div className="visitor-cols">
            <div className="panel">
              <h2 className="panel-title">Signed-in customers</h2>
              {data.customers.length === 0 ? (
                <p className="muted">No signed-in visits yet. Names appear here once customers create an account or sign in.</p>
              ) : (
                <div className="table-wrap flat">
                  <table className="admin-table">
                    <thead><tr><th>Name</th><th className="hide-sm">Email</th><th>Visits</th><th>Last visit</th></tr></thead>
                    <tbody>
                      {data.customers.map((c) => (
                        <tr key={c.email}>
                          <td>{c.name}</td>
                          <td className="hide-sm"><a href={`mailto:${c.email}`}>{c.email}</a></td>
                          <td>{n(c.visits)}</td>
                          <td>{fmtTime(c.lastVisit)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <div className="panel">
              <h2 className="panel-title">Where visits start</h2>
              {data.topPages.length === 0 ? <p className="muted">Nothing yet.</p> : (
                <ul className="bar-list">
                  {data.topPages.map((p) => (
                    <li key={p.page}>
                      <span className="bar-list-name">{pageName(p.page)}</span>
                      <span className="bar-list-track"><span style={{ width: `${(p.count / data.topPages[0].count) * 100}%` }} /></span>
                      <span className="bar-list-value">{n(p.count)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="panel">
            <h2 className="panel-title">Latest visits</h2>
            {data.recent.length === 0 ? <p className="muted">No visits yet.</p> : (
              <div className="table-wrap flat">
                <table className="admin-table">
                  <thead><tr><th>When</th><th>Who</th><th>First page</th></tr></thead>
                  <tbody>
                    {(showAll ? data.recent : data.recent.slice(0, 12)).map((v, i) => (
                      <tr key={i}>
                        <td>{fmtTime(v.at)}</td>
                        <td>{v.name ? <strong>{v.name}</strong> : <span className="muted">Guest</span>}</td>
                        <td>{pageName(v.page)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {data.recent.length > 12 && (
                  <button className="link-btn" onClick={() => setShowAll((x) => !x)}>{showAll ? 'Show fewer' : `Show all ${data.recent.length}`}</button>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </section>
  )
}
