import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { useShop } from '../lib/store.jsx'
import { api, formatPrice } from '../lib/api.js'
import { Field, Notice, PasswordField } from '../components/ui.jsx'

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
        <h1 className="display-sm">Sign in</h1>
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
        <h1 className="display-sm">Create an account</h1>
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
        <h1 className="display-sm">Hello, {customer.name.split(' ')[0]}</h1>
        <button className="btn btn-ghost" onClick={signOut}>Sign out</button>
      </div>
      {placed && <p className="notice notice-success">Order {placed} is placed. We’ll contact you shortly to confirm.</p>}
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
              <ul>{o.items.map((i) => <li key={i.id}>{i.qty} × {i.name}</li>)}</ul>
              <p className="right"><strong>{formatPrice(o.subtotal, settings?.currency)}</strong></p>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
