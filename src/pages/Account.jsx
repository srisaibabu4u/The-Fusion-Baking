import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { useShop } from '../lib/store.jsx'
import { EGG_LABEL, VARIANT_LABEL, api, money, whatsappLink } from '../lib/api.js'
import { Field, Notice, PasswordField, WhatsAppIcon } from '../components/ui.jsx'

const nextPath = (params) => {
  const n = params.get('next') || '/account'
  return n.startsWith('/') && !n.startsWith('//') ? n : '/account'
}

export function Login() {
  const { signIn, customer } = useShop()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (customer) return <Navigate to={nextPath(params)} replace />

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true); setError('')
    try {
      const r = await api('/auth/login', { method: 'POST', body: { email, password }, as: 'none' })
      signIn(r.token, r.user)
      navigate(nextPath(params))
    } catch (err) { setError(err.message) } finally { setBusy(false) }
  }

  return (
    <section className="section auth">
      <form className="panel auth-panel" onSubmit={submit}>
        <h1 className="script-head">Sign in</h1>
        <Field label="Email" id="l-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
        <PasswordField id="l-pass" value={password} onChange={setPassword} />
        <Notice>{error}</Notice>
        <button className="btn btn-primary btn-block" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
        <p className="muted small center">New here? <Link to={`/account/register?next=${encodeURIComponent(nextPath(params))}`}>Create an account</Link></p>
      </form>
    </section>
  )
}

export function Register() {
  const { signIn, customer } = useShop()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', confirm: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: typeof v === 'string' ? v : v.target.value }))

  if (customer) return <Navigate to={nextPath(params)} replace />

  const submit = async (e) => {
    e.preventDefault()
    if (form.password !== form.confirm) return setError('The two passwords do not match.')
    setBusy(true); setError('')
    try {
      const r = await api('/auth/register', { method: 'POST', body: form, as: 'none' })
      signIn(r.token, r.user)
      navigate(nextPath(params))
    } catch (err) { setError(err.message) } finally { setBusy(false) }
  }

  return (
    <section className="section auth">
      <form className="panel auth-panel" onSubmit={submit}>
        <h1 className="script-head">Create an account</h1>
        <Field label="Full name" id="r-name" value={form.name} onChange={set('name')} required autoComplete="name" />
        <Field label="Email" id="r-email" type="email" value={form.email} onChange={set('email')} required autoComplete="email" />
        <Field label="Phone (optional)" id="r-phone" type="tel" value={form.phone} onChange={set('phone')} autoComplete="tel" />
        <PasswordField id="r-pass" value={form.password} onChange={set('password')} autoComplete="new-password" minLength={8} hint="At least 8 characters." />
        <PasswordField id="r-confirm" label="Confirm password" value={form.confirm} onChange={set('confirm')} autoComplete="new-password" minLength={8} />
        <Notice>{error}</Notice>
        <button className="btn btn-primary btn-block" disabled={busy}>{busy ? 'Creating account…' : 'Create account'}</button>
        <p className="muted small center">Already have an account? <Link to="/account/login">Sign in</Link></p>
      </form>
    </section>
  )
}

const STATUS_LABEL = {
  pending: 'Received', confirmed: 'Confirmed', baking: 'Baking', ready: 'Ready', completed: 'Completed', cancelled: 'Cancelled',
}

export function Account() {
  const { customer, signOut, settings } = useShop()
  const [params] = useSearchParams()
  const [orders, setOrders] = useState(null)
  const [error, setError] = useState('')
  const placed = params.get('placed')

  useEffect(() => {
    if (!customer) return
    api('/orders').then(setOrders).catch((e) => setError(e.message))
  }, [customer])

  if (!customer) return <Navigate to="/account/login" replace />

  return (
    <section className="section narrow">
      <div className="account-head">
        <h1 className="script-head">Hello, {customer.name.split(' ')[0]}</h1>
        <button className="btn btn-ghost" onClick={signOut}>Sign out</button>
      </div>
      {placed && (() => {
        const o = orders?.find((x) => x.id === placed)
        const cur = settings?.currency || '₹'
        const text = o
          ? `Hi, I just placed order ${o.id}:\n${o.items.map((i) => `${i.qty} × ${i.name} (${VARIANT_LABEL[i.variant] || 'Classic'}, ${EGG_LABEL[i.egg] || ''})`).join('\n')}\nTotal ${money(o.subtotal, cur)}${o.date ? `\nFor ${o.date}` : ''}`
          : `Hi, I just placed order ${placed}.`
        const wa = whatsappLink(settings?.whatsapp, text)
        return (
          <div className="notice notice-success placed">
            <p>Order {placed} is placed. We’ll confirm it with you shortly.</p>
            {wa && <a className="btn btn-primary" href={wa} target="_blank" rel="noreferrer"><WhatsAppIcon /> Send order on WhatsApp</a>}
          </div>
        )
      })()}
      <h2>Your orders</h2>
      <Notice>{error}</Notice>
      {orders === null ? (
        <p className="muted">Loading orders…</p>
      ) : orders.length === 0 ? (
        <p className="muted">No orders yet. <Link to="/shop">Browse the shop</Link>.</p>
      ) : (
        <ul className="order-list">
          {orders.map((o) => (
            <li key={o.id} className="panel order-card">
              <div className="order-top">
                <strong>{o.id}</strong>
                <span className={`status status-${o.status}`}>{STATUS_LABEL[o.status] || o.status}</span>
              </div>
              <p className="muted small">
                Placed {new Date(o.createdAt).toLocaleDateString()}. {o.fulfilment === 'delivery' ? 'Delivery' : 'Collection'}{o.date ? ` on ${o.date}` : ''}.
              </p>
              <ul>{o.items.map((i, n) => <li key={n}>{i.qty} × {i.name} <span className="muted">({VARIANT_LABEL[i.variant] || 'Classic'}{i.egg ? `, ${EGG_LABEL[i.egg].toLowerCase()}` : ''})</span></li>)}</ul>
              <p className="right"><strong>{money(o.subtotal, settings?.currency || '₹')}</strong></p>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
