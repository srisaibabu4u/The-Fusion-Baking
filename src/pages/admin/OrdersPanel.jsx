import { useEffect, useState } from 'react'
import { EGG_LABEL, VARIANT_LABEL, api, money, whatsappLink } from '../../lib/api.js'
import { useShop } from '../../lib/store.jsx'
import { Notice, VegMark } from '../../components/ui.jsx'

const STATUSES = ['pending', 'confirmed', 'baking', 'ready', 'completed', 'cancelled']
const LABEL = { pending: 'New', confirmed: 'Confirmed', baking: 'Baking', ready: 'Ready', completed: 'Completed', cancelled: 'Cancelled' }
const ENQ = ['new', 'contacted', 'quoted', 'won', 'closed']
const ENQ_LABEL = { new: 'New', contacted: 'Contacted', quoted: 'Quoted', won: 'Confirmed', closed: 'Closed' }

export default function OrdersPanel() {
  const { settings } = useShop()
  const cur = settings?.currency || '₹'
  const [tab, setTab] = useState('orders')
  const [orders, setOrders] = useState(null)
  const [enquiries, setEnquiries] = useState(null)
  const [filter, setFilter] = useState('open')
  const [error, setError] = useState('')

  useEffect(() => {
    api('/orders', { as: 'admin' }).then(setOrders).catch((e) => setError(e.message))
    api('/enquiries', { as: 'admin' }).then(setEnquiries).catch((e) => setError(e.message))
  }, [])

  const setStatus = async (o, status) => {
    try {
      const updated = await api(`/orders/${o.id}`, { method: 'PATCH', body: { status }, as: 'admin' })
      setOrders((list) => list.map((x) => (x.id === o.id ? updated : x)))
    } catch (e) { setError(e.message) }
  }
  const setEnqStatus = async (q, status) => {
    try {
      const updated = await api(`/enquiries/${q.id}`, { method: 'PATCH', body: { status }, as: 'admin' })
      setEnquiries((list) => list.map((x) => (x.id === q.id ? updated : x)))
    } catch (e) { setError(e.message) }
  }

  const shown = (orders || []).filter((o) =>
    filter === 'all' ? true : filter === 'open' ? !['completed', 'cancelled'].includes(o.status) : o.status === filter)
  const newOrders = (orders || []).filter((o) => o.status === 'pending').length
  const newEnq = (enquiries || []).filter((q) => q.status === 'new').length

  const confirmText = (o) => `Hi ${o.customer.name.split(' ')[0]}, thank you for your order ${o.id} with ${settings?.shopName || 'us'}:\n` +
    o.items.map((i) => `${i.qty} × ${i.name} (${VARIANT_LABEL[i.variant] || 'Classic'}, ${EGG_LABEL[i.egg] || ''})`).join('\n') +
    `\nTotal ${money(o.subtotal, cur)}. ${o.date ? `We'll have it ready for ${o.date}.` : ''}`

  return (
    <section>
      <header className="admin-head">
        <div>
          <h1>Orders</h1>
          <p className="muted">{orders ? `${newOrders} new order(s), ${newEnq} new bulk enquiry(ies)` : 'Loading…'}</p>
        </div>
        {tab === 'orders' && (
          <select value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Filter orders">
            <option value="open">Open orders</option>
            <option value="all">All orders</option>
            {STATUSES.map((s) => <option key={s} value={s}>{LABEL[s]}</option>)}
          </select>
        )}
      </header>
      <div className="tabs" role="tablist">
        <button role="tab" aria-selected={tab === 'orders'} className={`chip ${tab === 'orders' ? 'active' : ''}`} onClick={() => setTab('orders')}>Shop orders</button>
        <button role="tab" aria-selected={tab === 'bulk'} className={`chip ${tab === 'bulk' ? 'active' : ''}`} onClick={() => setTab('bulk')}>Bulk enquiries{newEnq ? ` (${newEnq})` : ''}</button>
      </div>
      <Notice>{error}</Notice>

      {tab === 'orders' && (
        <>
          {orders && shown.length === 0 && <div className="empty"><p>No orders here yet.</p></div>}
          <div className="order-admin-list">
            {shown.map((o) => {
              const wa = whatsappLink(o.customer.phone, confirmText(o))
              return (
                <article key={o.id} className="panel order-admin">
                  <div className="order-top">
                    <div>
                      <strong>{o.id}</strong>
                      <p className="muted small">{new Date(o.createdAt).toLocaleString('en-IN')}</p>
                    </div>
                    <select value={o.status} onChange={(e) => setStatus(o, e.target.value)} className="status-select" aria-label={`Status of ${o.id}`}>
                      {STATUSES.map((s) => <option key={s} value={s}>{LABEL[s]}</option>)}
                    </select>
                  </div>
                  <div className="order-cols">
                    <div>
                      <p><strong>{o.customer.name}</strong></p>
                      <p><a href={`tel:${o.customer.phone}`}>{o.customer.phone}</a></p>
                      <p><a href={`mailto:${o.customer.email}`}>{o.customer.email}</a></p>
                      {wa && <p><a href={wa} target="_blank" rel="noreferrer">Confirm on WhatsApp</a></p>}
                    </div>
                    <div>
                      <p><strong>{o.fulfilment === 'delivery' ? 'Delivery' : 'Collection'}</strong>{o.date ? ` on ${o.date}` : ''}</p>
                      {o.address && <p>{o.address}{o.pincode ? `, ${o.pincode}` : ''}</p>}
                      {o.notes && <p className="order-notes">{o.notes}</p>}
                    </div>
                    <div>
                      <ul>
                        {o.items.map((i, n) => (
                          <li key={n}>{i.qty} × {i.name}<br /><span className="muted small">{VARIANT_LABEL[i.variant] || 'Classic'}{i.egg && <>, <VegMark type={i.egg} size={12} /> {EGG_LABEL[i.egg].toLowerCase()}</>}</span></li>
                        ))}
                      </ul>
                      <p><strong>{money(o.subtotal, cur)}</strong></p>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        </>
      )}

      {tab === 'bulk' && (
        <>
          {enquiries && enquiries.length === 0 && <div className="empty"><p>No bulk enquiries yet. They arrive from the “Bulk &amp; party orders” form.</p></div>}
          <div className="order-admin-list">
            {(enquiries || []).map((q) => {
              const wa = whatsappLink(q.phone, `Hi ${q.name.split(' ')[0]}, thanks for your enquiry with ${settings?.shopName || 'us'}.`)
              return (
                <article key={q.id} className="panel order-admin">
                  <div className="order-top">
                    <div>
                      <strong>{q.name}</strong>
                      <p className="muted small">{q.id}, {new Date(q.createdAt).toLocaleString('en-IN')}</p>
                    </div>
                    <select value={q.status} onChange={(e) => setEnqStatus(q, e.target.value)} className="status-select" aria-label={`Status of ${q.id}`}>
                      {ENQ.map((s) => <option key={s} value={s}>{ENQ_LABEL[s]}</option>)}
                    </select>
                  </div>
                  <div className="order-cols">
                    <div>
                      {q.phone && <p><a href={`tel:${q.phone}`}>{q.phone}</a></p>}
                      {q.email && <p><a href={`mailto:${q.email}`}>{q.email}</a></p>}
                      {wa && <p><a href={wa} target="_blank" rel="noreferrer">Reply on WhatsApp</a></p>}
                    </div>
                    <div>
                      {q.occasion && <p><strong>{q.occasion}</strong></p>}
                      {q.date && <p>Needed on {q.date}</p>}
                      {q.quantity && <p>{q.quantity}</p>}
                    </div>
                    <div>{q.details && <p className="order-notes">{q.details}</p>}</div>
                  </div>
                </article>
              )
            })}
          </div>
        </>
      )}
    </section>
  )
}
