import { useEffect, useState } from 'react'
import { api } from '../../lib/api.js'
import { useShop } from '../../lib/store.jsx'
import { Field, Notice } from '../../components/ui.jsx'

export function CustomersPanel() {
  const [users, setUsers] = useState(null)
  const [error, setError] = useState('')
  useEffect(() => { api('/admin/users', { as: 'admin' }).then(setUsers).catch((e) => setError(e.message)) }, [])

  return (
    <section>
      <header className="admin-head">
        <div>
          <h1>Customers</h1>
          <p className="muted">{users ? `${users.length} registered` : 'Loading…'}</p>
        </div>
      </header>
      <Notice>{error}</Notice>
      {users && users.length === 0 && <div className="empty"><p>No customers have registered yet.</p></div>}
      {users && users.length > 0 && (
        <div className="table-wrap">
          <table className="admin-table">
            <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Joined</th></tr></thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>{u.name}</td>
                  <td><a href={`mailto:${u.email}`}>{u.email}</a></td>
                  <td>{u.phone || '—'}</td>
                  <td>{new Date(u.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

const FIELDS = [
  ['shopName', 'Shop name'],
  ['tagline', 'Tagline (footer)'],
  ['heroTitle', 'Home page headline', 'textarea'],
  ['heroText', 'Home page introduction', 'textarea'],
  ['currency', 'Currency symbol', 'input', 'e.g. $, S$, ₹, £'],
  ['phone', 'Phone'],
  ['email', 'Email'],
  ['address', 'Address', 'textarea'],
  ['hours', 'Opening hours'],
  ['deliveryNote', 'Ordering and payment note', 'textarea'],
  ['instagram', 'Instagram link'],
]

export function SettingsPanel() {
  const { settings, setSettings } = useShop()
  const [form, setForm] = useState(settings || {})
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => { if (settings) setForm(settings) }, [settings])

  const save = async (e) => {
    e.preventDefault()
    setBusy(true); setMsg(''); setError('')
    try {
      const s = await api('/settings', { method: 'PUT', body: form, as: 'admin' })
      setSettings(s)
      setMsg('Settings saved.')
    } catch (err) { setError(err.message) } finally { setBusy(false) }
  }

  return (
    <section>
      <header className="admin-head"><div><h1>Shop settings</h1><p className="muted">Text and contact details shown across the shop.</p></div></header>
      <form className="panel settings-form" onSubmit={save}>
        {FIELDS.map(([k, label, as = 'input', hint]) => (
          <Field key={k} as={as} rows={as === 'textarea' ? 3 : undefined} label={label} id={`s-${k}`} hint={hint}
            value={form[k] || ''} onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))} />
        ))}
        <Notice kind="success">{msg}</Notice>
        <Notice>{error}</Notice>
        <button className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save settings'}</button>
      </form>
    </section>
  )
}
