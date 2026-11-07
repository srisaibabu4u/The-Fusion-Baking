import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useShop } from '../lib/store.jsx'
import { EGG_LABEL, VARIANT_LABEL, formatPrice, offeredVariants, variantPrice, whatsappLink } from '../lib/api.js'
import { DietMarks, Photo, ProductCard, VegMark, WhatsAppIcon } from '../components/ui.jsx'

export default function Product() {
  const { id } = useParams()
  const { products, loading, add, settings } = useShop()
  const p = products.find((x) => x.id === id)
  const variants = p ? offeredVariants(p) : ['classic']
  const [variant, setVariant] = useState(variants[0])
  const [egg, setEgg] = useState('eggless')
  const [qty, setQty] = useState(1)
  const [added, setAdded] = useState(false)

  useEffect(() => { if (p) setVariant(offeredVariants(p)[0]) }, [p?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return <p className="section muted center">Loading…</p>
  if (!p) {
    return (
      <section className="section center">
        <h1 className="script-head">No longer on the menu</h1>
        <p><Link to="/shop" className="btn btn-ghost">Back to the shop</Link></p>
      </section>
    )
  }

  const soldOut = p.available === false
  const related = products.filter((x) => x.category === p.category && x.id !== p.id).slice(0, 4)
  const price = variantPrice(p, variant)
  const eggChoice = p.diet === 'both' ? egg : p.diet
  const wa = whatsappLink(settings?.whatsapp, `Hi, I'd like to order ${p.name} (${VARIANT_LABEL[variant]}, ${EGG_LABEL[eggChoice]}).`)

  const onAdd = () => {
    add(p, qty, variant, p.diet === 'both' ? egg : p.diet)
    setAdded(true)
    setTimeout(() => setAdded(false), 2500)
  }

  return (
    <>
      <section className="section product-detail">
        <div className="detail-photo">
          <Photo image={p.image} alt={p.name} label={p.name} tape eager />
        </div>
        <div className="product-info">
          <nav className="crumbs" aria-label="Breadcrumb">
            <Link to="/shop">Shop</Link> / <Link to={`/shop/${encodeURIComponent(p.category)}`}>{p.category}</Link>
          </nav>
          <h1 className="script-title">{p.name}</h1>
          {p.tagline && <p className="tagline">{p.tagline}</p>}
          <p className="detail-price">{formatPrice(price, settings?.currency)}</p>
          {p.description && <p className="detail-desc">{p.description}</p>}

          {!soldOut && (
            <div className="choices">
              {variants.length > 1 ? (
                <fieldset className="choice">
                  <legend>Choose your bake</legend>
                  <div className="choice-options">
                    {variants.map((v) => (
                      <label key={v} className={variant === v ? 'is-on' : ''}>
                        <input type="radio" name="variant" value={v} checked={variant === v} onChange={() => setVariant(v)} />
                        <span className="choice-name">{VARIANT_LABEL[v]}</span>
                        <span className="choice-price">{formatPrice(variantPrice(p, v), settings?.currency)}</span>
                        {v === 'nutritious' && p.nutritiousNote && <span className="choice-note">{p.nutritiousNote}</span>}
                      </label>
                    ))}
                  </div>
                </fieldset>
              ) : (
                <p className="single-variant">
                  {VARIANT_LABEL[variants[0]]} bake{variants[0] === 'nutritious' && p.nutritiousNote ? `: ${p.nutritiousNote}` : ''}
                </p>
              )}

              {p.diet === 'both' ? (
                <fieldset className="choice">
                  <legend>Eggless or with egg</legend>
                  <div className="choice-options">
                    {['eggless', 'egg'].map((e) => (
                      <label key={e} className={egg === e ? 'is-on' : ''}>
                        <input type="radio" name="egg" value={e} checked={egg === e} onChange={() => setEgg(e)} />
                        <span className="choice-name"><VegMark type={e} /> {EGG_LABEL[e]}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              ) : (
                <p className="single-variant"><DietMarks diet={p.diet} withText /></p>
              )}
            </div>
          )}

          <dl className="detail-facts">
            {p.size && (<><dt>Size</dt><dd>{p.size}</dd></>)}
            {p.ingredients && (<><dt>Ingredients</dt><dd>{p.ingredients}</dd></>)}
          </dl>

          {soldOut ? (
            <p className="notice notice-info">Sold out for now. Message us to ask when it’s next baked.</p>
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
          {added && <p className="notice notice-success" role="status">Added to your basket. <Link to="/cart">View basket</Link></p>}
          {wa && <p className="wa-ask"><a href={wa} target="_blank" rel="noreferrer"><WhatsAppIcon /> Ask about this on WhatsApp</a></p>}
        </div>
      </section>
      {related.length > 0 && (
        <section className="section">
          <header className="section-head"><h2 className="script-head">More {p.category.toLowerCase()}</h2></header>
          <div className="product-grid">{related.map((r) => <ProductCard key={r.id} product={r} />)}</div>
        </section>
      )}
    </>
  )
}
