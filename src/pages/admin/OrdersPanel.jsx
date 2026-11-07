import { useEffect, useState } from 'react'
import { api, formatPrice } from '../../lib/api.js'
import { useShop } from '../../lib/store.jsx'
import { Notice } from '../../components/ui.jsx'

const STATUSES = ['pending', 'confirmed', 'baking', 'ready', 'completed', 'cancelled']
const LABEL = { pending: 'New', confirmed: 'Confirmed', baking: 'Baking', ready: 'Ready', completed: 'Completed', cancelled: 'Cancelled' }

export default function OrdersPanel() {
  const { settings } = useShop()
  const [orders, setOrders] = useState(null)
  const [filter, setFilter] = useState('open')
  const [error, setError] = useState('')

  const load = () => api('/orders', { as: 'admin' }).then(setOrders).catch((e) => setError(e.message))
  useEffect(() => { load() }, [])

  const setStatus = async (o, status) => {
    try {
      const updated = await api(`/orders/${o.id}`, { method: 'PATCH', body: { status }, as: 'admin' })
      setOrders((list) => list.map((x) => (x.id === o.id ? updated : x)))
    } catch (e) { setError(e.message) }
  }

  const shown = (orders || []).filter((o) =>
    filter === 'all' ? true : filter === 'open' ? !['completed', 'cancelled'].includes(o.status) : o.status === filter)

  return (
    <section>
      <header className="admin-head">
        <div>
          <h1>Orders</h1>
          <p className="muted">{orders ? `${orders.filter((o) => o.status === 'pending').length} new` : 'Loading…'}</p>
        </div>
        <select value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Filter orders">
          <option value="open">Open orders</option>
          <option value="all">All orders</option>
          {STATUSES.map((s) => <option key={s} value={s}>{LABEL[s]}</option>)}
        </select>
      </header>
      <Notice>{error}</Notice>
      {orders && shown.length === 0 && <div className="empty"><p>No orders here yet.</p></div>}
      <div className="order-admin-list">
        {shown.map((o) => (
          <article key={o.id} className="panel order-admin">
            <div className="order-top">
              <div>
                <strong>{o.id}</strong>
                <p className="muted small">{new Date(o.createdAt).toLocaleString()}</p>
              </div>
              <select value={o.status} onChange={(e) => setStatus(o, e.target.value)} className={`status-select status-${o.status}`} aria-label={`Status of ${o.id}`}>
                {STATUSES.map((s) => <option key={s} value={s}>{LABEL[s]}</option>)}
              </select>
            </div>
            <div className="order-cols">
              <div>
                <p><strong>{o.customer.name}</strong></p>
                <p><a href={`tel:${o.customer.phone}`}>{o.customer.phone}</a></p>
                <p><a href={`mailto:${o.customer.email}`}>{o.customer.email}</a></p>
              </div>
              <div>
                <p><strong>{o.fulfilment === 'delivery' ? 'Delivery' : 'Collection'}</strong>{o.date ? ` on ${o.date}` : ''}</p>
                {o.address && <p>{o.address}</p>}
                {o.notes && <p className="order-notes">{o.notes}</p>}
              </div>
              <div>
                <ul>{o.items.map((i) => <li key={i.id}>{i.qty} × {i.name}</li>)}</ul>
                <p><strong>{formatPrice(o.subtotal, settings?.currency)}</strong></p>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
