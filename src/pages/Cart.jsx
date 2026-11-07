import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useShop } from '../lib/store.jsx'
import { api, formatPrice } from '../lib/api.js'
import { Arch, Field, Notice, Price } from '../components/ui.jsx'

function useLiveCart() {
  const { cart, products } = useShop()
  return cart.map((i) => {
    const live = products.find((p) => p.id === i.id)
    return { ...i, price: live?.price ?? i.price, image: live?.image ?? i.image, gone: products.length > 0 && (!live || live.available === false) }
  })
}

export function Cart() {
  const { setQty, remove, settings } = useShop()
  const items = useLiveCart()
  const total = items.reduce((s, i) => s + (i.price || 0) * i.qty, 0)

  if (!items.length) {
    return (
      <section className="section center narrow">
        <h1 className="display-sm">Your basket is empty</h1>
        <p className="muted">Pick something from the counter to get started.</p>
        <p><Link to="/shop" className="btn btn-primary">Browse the shop</Link></p>
      </section>
    )
  }

  return (
    <section className="section narrow">
      <h1 className="display-sm">Your basket</h1>
      <ul className="cart-list">
        {items.map((i) => (
          <li key={i.id} className="cart-line">
            <Arch image={i.image} alt="" label={i.name} className="arch-thumb" />
            <div className="cart-line-info">
              <Link to={`/product/${i.id}`} className="cart-line-name">{i.name}</Link>
              <Price value={i.price} />
              {i.gone && <span className="badge badge-muted">No longer available</span>}
            </div>
            <div className="qty" role="group" aria-label={`Quantity of ${i.name}`}>
              <button type="button" onClick={() => setQty(i.id, i.qty - 1)} aria-label="Decrease">−</button>
              <span>{i.qty}</span>
              <button type="button" onClick={() => setQty(i.id, i.qty + 1)} aria-label="Increase">+</button>
            </div>
            <button className="link-btn" onClick={() => remove(i.id)}>Remove</button>
          </li>
        ))}
      </ul>
      <div className="cart-total">
        <span>Subtotal</span>
        <strong>{formatPrice(total, settings?.currency)}</strong>
      </div>
      <p className="muted small">{settings?.deliveryNote}</p>
      <p className="right"><Link to="/checkout" className="btn btn-primary">Continue to checkout</Link></p>
    </section>
  )
}

export function Checkout() {
  const { customer, settings, clear } = useShop()
  const items = useLiveCart()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    name: customer?.name || '', phone: customer?.phone || '', fulfilment: 'pickup', address: '', date: '', notes: '',
  })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const total = items.reduce((s, i) => s + (i.price || 0) * i.qty, 0)

  if (!customer) {
    return (
      <section className="section center narrow">
        <h1 className="display-sm">Sign in to check out</h1>
        <p className="muted">We use your account to send order updates and keep your order history.</p>
        <div className="actions center">
          <Link to="/account/login?next=/checkout" className="btn btn-primary">Sign in</Link>
          <Link to="/account/register?next=/checkout" className="btn btn-ghost">Create an account</Link>
        </div>
      </section>
    )
  }
  if (!items.length) {
    return (
      <section className="section center narrow">
        <h1 className="display-sm">Your basket is empty</h1>
        <p><Link to="/shop" className="btn btn-primary">Browse the shop</Link></p>
      </section>
    )
  }

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const order = await api('/orders', { method: 'POST', body: { ...form, items: items.map(({ id, name, qty }) => ({ id, name, qty })) } })
      clear()
      navigate(`/account?placed=${order.id}`)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const today = new Date().toISOString().slice(0, 10)

  return (
    <section className="section checkout">
      <form className="panel" onSubmit={submit}>
        <h1 className="display-sm">Checkout</h1>
        <Field label="Name" id="c-name" value={form.name} onChange={set('name')} required autoComplete="name" />
        <Field label="Phone" id="c-phone" type="tel" value={form.phone} onChange={set('phone')} required autoComplete="tel" hint="We call or message to confirm your order." />
        <fieldset className="field">
          <legend>How would you like it?</legend>
          <div className="segmented">
            <label><input type="radio" name="f" value="pickup" checked={form.fulfilment === 'pickup'} onChange={set('fulfilment')} /> Collect from the shop</label>
            <label><input type="radio" name="f" value="delivery" checked={form.fulfilment === 'delivery'} onChange={set('fulfilment')} /> Deliver to me</label>
          </div>
        </fieldset>
        {form.fulfilment === 'delivery' && (
          <Field as="textarea" rows={3} label="Delivery address" id="c-addr" value={form.address} onChange={set('address')} required autoComplete="street-address" />
        )}
        <Field label="Preferred date" id="c-date" type="date" min={today} value={form.date} onChange={set('date')} />
        <Field as="textarea" rows={3} label="Notes (message on cake, allergies…)" id="c-notes" value={form.notes} onChange={set('notes')} />
        <Notice>{error}</Notice>
        <button className="btn btn-primary btn-block" disabled={busy}>{busy ? 'Placing order…' : 'Place order'}</button>
        <p className="muted small">{settings?.deliveryNote}</p>
      </form>
      <aside className="panel summary">
        <h2>Order summary</h2>
        <ul>
          {items.map((i) => (
            <li key={i.id}><span>{i.qty} × {i.name}</span><Price value={(i.price || 0) * i.qty} /></li>
          ))}
        </ul>
        <div className="cart-total"><span>Total</span><strong>{formatPrice(total, settings?.currency)}</strong></div>
      </aside>
    </section>
  )
}
