import { useEffect, useRef, useState } from 'react'
import { api, imageUrl } from '../../lib/api.js'
import { compressImage } from '../../lib/folder.js'
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

const GROUPS = [
  ['Shop', [
    ['shopName', 'Shop name'],
    ['tagline', 'Footer line'],
    ['heroTagline', 'Home page tagline (gold capitals)'],
    ['heroTitle', 'Home page headline (script)', 'input', 'Keep it short, 3 to 6 words, so the script stays readable.'],
    ['heroText', 'Home page introduction', 'textarea'],
  ]],
  ['Contact and ordering', [
    ['whatsapp', 'WhatsApp number', 'input', 'With country code, e.g. +91 98765 43210. Turns on the WhatsApp buttons.'],
    ['phone', 'Phone'],
    ['email', 'Email'],
    ['address', 'Address or area you deliver to', 'textarea'],
    ['hours', 'Order hours'],
    ['deliveryNote', 'Ordering and payment note', 'textarea'],
    ['instagram', 'Instagram link'],
  ]],
  ['Legal and money', [
    ['fssai', 'FSSAI licence or registration number', 'input', 'Shown in the footer.'],
    ['currency', 'Currency symbol', 'input', '₹ for India.'],
  ]],
]

export function SettingsPanel() {
  const { settings, setSettings } = useShop()
  const [form, setForm] = useState(settings || {})
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const logoRef = useRef()

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

  const uploadLogo = async (e) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    setBusy(true); setMsg(''); setError('')
    try {
      // Keep PNG transparency for small logos; compress large ones
      const blob = f.size > 1.5 * 1024 * 1024 ? await compressImage(f, 600, 0.9) : f
      const s = await api('/admin/logo', { method: 'POST', raw: blob, as: 'admin', headers: { 'content-type': blob.type || 'image/png' } })
      setSettings(s)
      setMsg('Logo updated.')
    } catch (err) { setError(err.message) } finally { setBusy(false) }
  }

  const removeLogo = async () => {
    setBusy(true)
    try { setSettings(await api('/admin/logo', { method: 'DELETE', as: 'admin' })); setMsg('Logo removed.') }
    catch (err) { setError(err.message) } finally { setBusy(false) }
  }

  return (
    <section>
      <header className="admin-head"><div><h1>Shop settings</h1><p className="muted">Text, contact details and logo shown across the shop.</p></div></header>
      <form className="panel settings-form" onSubmit={save}>
        <h2>Logo</h2>
        <div className="logo-row">
          {settings?.logo ? <img className="logo-preview" src={imageUrl(settings.logo)} alt="Current logo" /> : <span className="muted">No logo yet. The shop name shows in script instead.</span>}
          <input ref={logoRef} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" hidden onChange={uploadLogo} />
          <button type="button" className="btn btn-ghost" onClick={() => logoRef.current.click()} disabled={busy}>{settings?.logo ? 'Replace logo' : 'Upload logo'}</button>
          {settings?.logo && <button type="button" className="link-btn" onClick={removeLogo} disabled={busy}>Remove</button>}
        </div>
        <p className="hint">A PNG with a transparent background looks best. It appears beside the shop name in the header.</p>
        {GROUPS.map(([title, fields]) => (
          <div key={title}>
            <h2>{title}</h2>
            {fields.map(([k, label, as = 'input', hint]) => (
              <Field key={k} as={as} rows={as === 'textarea' ? 3 : undefined} label={label} id={`s-${k}`} hint={hint}
                value={form[k] || ''} onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))} />
            ))}
          </div>
        ))}
        <Notice kind="success">{msg}</Notice>
        <Notice>{error}</Notice>
        <button className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save settings'}</button>
      </form>
    </section>
  )
}
