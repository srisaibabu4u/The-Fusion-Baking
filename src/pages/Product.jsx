import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useShop } from '../lib/store.jsx'
import { Arch, Price, ProductCard } from '../components/ui.jsx'

export default function Product() {
  const { id } = useParams()
  const { products, loading, add } = useShop()
  const [qty, setQty] = useState(1)
  const [added, setAdded] = useState(false)
  const p = products.find((x) => x.id === id)

  if (loading) return <p className="section muted center">Loading…</p>
  if (!p) {
    return (
      <section className="section center">
        <h1 className="display-sm">This item is no longer on the menu</h1>
        <p><Link to="/shop" className="btn btn-ghost">Back to the shop</Link></p>
      </section>
    )
  }

  const soldOut = p.available === false
  const related = products.filter((x) => x.category === p.category && x.id !== p.id).slice(0, 4)

  const onAdd = () => {
    add(p, qty)
    setAdded(true)
    setTimeout(() => setAdded(false), 2500)
  }

  return (
    <>
      <section className="section product-detail">
        <Arch image={p.image} alt={p.name} label={p.name} className="arch-detail" eager />
        <div className="product-info">
          <nav className="crumbs" aria-label="Breadcrumb">
            <Link to="/shop">Shop</Link> / <Link to={`/shop/${encodeURIComponent(p.category)}`}>{p.category}</Link>
          </nav>
          <h1 className="display-sm">{p.name}</h1>
          <p className="detail-price"><Price value={p.price} /></p>
          {p.tags?.length > 0 && (
            <ul className="tag-list">{p.tags.map((t) => <li key={t} className="badge">{t}</li>)}</ul>
          )}
          {p.description && <p className="detail-desc">{p.description}</p>}
          <dl className="detail-facts">
            {p.size && (<><dt>Size</dt><dd>{p.size}</dd></>)}
            {p.ingredients && (<><dt>Ingredients</dt><dd>{p.ingredients}</dd></>)}
          </dl>
          {soldOut ? (
            <p className="notice notice-info">Sold out today. Check back tomorrow.</p>
          ) : (
            <div className="buy-row">
              <div className="qty" role="group" aria-label="Quantity">
                <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Decrease quantity">−</button>
                <span aria-live="polite">{qty}</span>
                <button type="button" onClick={() => setQty((q) => Math.min(50, q + 1))} aria-label="Increase quantity">+</button>
              </div>
              <button className="btn btn-primary" onClick={onAdd}>Add to basket</button>
            </div>
          )}
          {added && (
            <p className="notice notice-success" role="status">
              Added to your basket. <Link to="/cart">View basket</Link>
            </p>
          )}
        </div>
      </section>
      {related.length > 0 && (
        <section className="section">
          <div className="section-head"><h2>More {p.category.toLowerCase()}</h2></div>
          <div className="product-grid">{related.map((r) => <ProductCard key={r.id} product={r} />)}</div>
        </section>
      )}
    </>
  )
}
