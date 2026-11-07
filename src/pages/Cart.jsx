import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useShop } from '../lib/store.jsx'
import { EGG_LABEL, VARIANT_LABEL, api, formatPrice, money, offeredVariants, variantPrice } from '../lib/api.js'
import { Field, Notice, Photo, VegMark } from '../components/ui.jsx'

function useLiveCart() {
  const { cart, products } = useShop()
  return cart.map((i) => {
    const live = products.find((p) => p.id === i.id)
    const gone = products.length > 0 && (!live || live.available === false || !offeredVariants(live).includes(i.variant))
    return { ...i, price: live ? variantPrice(live, i.variant) : 0, image: live?.image ?? i.image, gone }
  })
}

function LineMeta({ item }) {
  return (
    <span className="line-meta">
      {VARIANT_LABEL[item.variant] || 'Classic'}
      {item.egg && <>, <VegMark type={item.egg} size={13} /> {EGG_LABEL[item.egg].toLowerCase()}</>}
    </span>
  )
}

export function Cart() {
  const { setQty, remove, settings } = useShop()
  const items = useLiveCart()
  const total = items.reduce((s, i) => s + (i.gone ? 0 : i.price * i.qty), 0)
  const cur = settings?.currency || '₹'

  if (!items.length) {
    return (
      <section className="section center narrow">
        <h1 className="script-head">Your basket is empty</h1>
        <p className="muted">Pick something fresh from the shop to get started.</p>
        <p><Link to="/shop" className="btn btn-primary">Browse the bakes</Link></p>
      </section>
    )
  }

  return (
    <section className="section narrow">
      <h1 className="script-head">Your basket</h1>
      <ul className="cart-list">
        {items.map((i) => (
          <li key={i.key} className="cart-line">
            <Photo image={i.image} alt="" label={i.name} className="polaroid-thumb" />
            <div className="cart-line-info">
              <Link to={`/product/${i.id}`} className="cart-line-name">{i.name}</Link>
              <LineMeta item={i} />
              <span>{formatPrice(i.price, cur)}</span>
              {i.gone && <span className="badge badge-muted">No longer available, remove to continue</span>}
            </div>
            <div className="qty" role="group" aria-label={`Quantity of ${i.name}`}>
              <button type="button" onClick={() => setQty(i.key, i.qty - 1)} aria-label="Decrease">−</button>
              <span>{i.qty}</span>
              <button type="button" onClick={() => setQty(i.key, i.qty + 1)} aria-label="Increase">+</button>
            </div>
            <button className="link-btn" onClick={() => remove(i.key)}>Remove</button>
          </li>
        ))}
      </ul>
      <div className="cart-total"><span>Subtotal</span><strong>{money(total, cur)}</strong></div>
      <p className="muted small">{settings?.deliveryNote}</p>
      <p className="right">
        {items.some((i) => i.gone)
          ? <span className="muted small">Remove unavailable items to check out.</span>
          : <Link to="/checkout" className="btn btn-primary">Continue to checkout</Link>}
      </p>
    </section>
  )
}

export function Checkout() {
  const { customer, settings, clear } = useShop()
  const items = useLiveCart().filter((i) => !i.gone)
  const navigate = useNavigate()
  const [form, setForm] = useState({
    name: customer?.name || '', phone: customer?.phone || '', fulfilment: 'delivery', address: '', pincode: '', date: '', notes: '',
  })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const cur = settings?.currency || '₹'
  const total = items.reduce((s, i) => s + i.price * i.qty, 0)

  if (!customer) {
    return (
      <section className="section center narrow">
        <h1 className="script-head">Sign in to check out</h1>
        <p className="muted">Your account keeps your order history and status updates in one place.</p>
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
        <h1 className="script-head">Your basket is empty</h1>
        <p><Link to="/shop" className="btn btn-primary">Browse the bakes</Link></p>
      </section>
    )
  }

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const order = await api('/orders', { method: 'POST', body: { ...form, items: items.map(({ id, name, qty, variant, egg }) => ({ id, name, qty, variant, egg })) } })
      clear()
      navigate(`/account?placed=${order.id}`)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const minDate = new Date(Date.now() + 86400000).toISOString().slice(0, 10)

  return (
    <section className="section checkout">
      <form className="panel" onSubmit={submit}>
        <h1 className="script-head">Checkout</h1>
        <Field label="Name" id="c-name" value={form.name} onChange={set('name')} required autoComplete="name" />
        <Field label="Mobile number" id="c-phone" type="tel" value={form.phone} onChange={set('phone')} required autoComplete="tel" placeholder="+91 98765 43210" hint="We confirm every order on WhatsApp or by phone." />
        <fieldset className="field">
          <legend>Delivery or collection</legend>
          <div className="segmented">
            <label><input type="radio" name="f" value="delivery" checked={form.fulfilment === 'delivery'} onChange={set('fulfilment')} /> Deliver to me</label>
            <label><input type="radio" name="f" value="pickup" checked={form.fulfilment === 'pickup'} onChange={set('fulfilment')} /> I’ll collect</label>
          </div>
        </fieldset>
        {form.fulfilment === 'delivery' && (
          <>
            <Field as="textarea" rows={3} label="Delivery address" id="c-addr" value={form.address} onChange={set('address')} required autoComplete="street-address" />
            <Field label="PIN code" id="c-pin" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} value={form.pincode} onChange={set('pincode')} autoComplete="postal-code" />
          </>
        )}
        <Field label="Date you need it" id="c-date" type="date" min={minDate} value={form.date} onChange={set('date')} hint="Everything is baked to order, so choose tomorrow or later." />
        <Field as="textarea" rows={3} label="Notes (message on cake, allergies…)" id="c-notes" value={form.notes} onChange={set('notes')} />
        <Notice>{error}</Notice>
        <button className="btn btn-primary btn-block" disabled={busy}>{busy ? 'Placing order…' : 'Place order'}</button>
        <p className="muted small">{settings?.deliveryNote}</p>
      </form>
      <aside className="panel summary">
        <h2>Order summary</h2>
        <ul>
          {items.map((i) => (
            <li key={i.key}>
              <span>{i.qty} × {i.name}<br /><LineMeta item={i} /></span>
              <span>{money(i.price * i.qty, cur)}</span>
            </li>
          ))}
        </ul>
        <div className="cart-total"><span>Total</span><strong>{money(total, cur)}</strong></div>
      </aside>
    </section>
  )
}
