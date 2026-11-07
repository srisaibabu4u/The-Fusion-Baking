import { useState } from 'react'
import { api } from '../lib/api.js'
import { Field, Notice } from './ui.jsx'

export default function BulkForm() {
  const blank = { name: '', phone: '', email: '', occasion: '', date: '', quantity: '', details: '', website: '' }
  const [form, setForm] = useState(blank)
  const [sent, setSent] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true); setError('')
    try {
      await api('/enquiries', { method: 'POST', body: form, as: 'none' })
      setSent(form.name.split(' ')[0])
      setForm(blank)
    } catch (err) { setError(err.message) } finally { setBusy(false) }
  }

  if (sent) {
    return (
      <div className="panel bulk-done" role="status">
        <p className="script-sm">Thank you, {sent}</p>
        <p>We’ve got your enquiry and will reply on WhatsApp or by phone with options and a quote.</p>
        <button className="btn btn-ghost" onClick={() => setSent('')}>Send another enquiry</button>
      </div>
    )
  }

  const today = new Date().toISOString().slice(0, 10)
  return (
    <form className="panel bulk-form" onSubmit={submit}>
      <div className="field-row">
        <Field label="Your name" id="b-name" value={form.name} onChange={set('name')} required autoComplete="name" />
        <Field label="Phone or WhatsApp" id="b-phone" type="tel" value={form.phone} onChange={set('phone')} autoComplete="tel" placeholder="+91" />
      </div>
      <div className="field-row">
        <Field label="Occasion" id="b-occ" value={form.occasion} onChange={set('occasion')} placeholder="Office Diwali gifting, birthday, wedding…" />
        <Field label="Date needed" id="b-date" type="date" min={today} value={form.date} onChange={set('date')} />
      </div>
      <Field label="What and how many" id="b-qty" value={form.quantity} onChange={set('quantity')} placeholder="e.g. 150 muffins, 50 brownie boxes" />
      <Field as="textarea" rows={3} label="Anything else (optional)" id="b-details" value={form.details} onChange={set('details')} placeholder="Flavours, Classic or Nutritious, eggless, packaging, budget…" />
      <Field label="Email (optional)" id="b-email" type="email" value={form.email} onChange={set('email')} autoComplete="email" />
      <div className="hp" aria-hidden="true">
        <label htmlFor="b-web">Website</label>
        <input id="b-web" tabIndex={-1} autoComplete="off" value={form.website} onChange={set('website')} />
      </div>
      <Notice>{error}</Notice>
      <button className="btn btn-primary" disabled={busy}>{busy ? 'Sending…' : 'Send enquiry'}</button>
    </form>
  )
}
