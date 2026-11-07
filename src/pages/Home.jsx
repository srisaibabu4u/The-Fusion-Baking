import { Link } from 'react-router-dom'
import { useShop } from '../lib/store.jsx'
import { Arch, Ornament, ProductCard } from '../components/ui.jsx'

export default function Home() {
  const { settings, products, categories, loading } = useShop()
  const featured = products.filter((p) => p.featured && p.available !== false)
  const showcase = (featured.length ? featured : products).slice(0, 8)
  const hero = showcase.find((p) => p.image) || products.find((p) => p.image)

  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <h1 className="display">{settings?.heroTitle}</h1>
          <p className="lede">{settings?.heroText}</p>
          <div className="actions">
            <Link to="/shop" className="btn btn-primary">Browse the shop</Link>
            {categories.includes('Cakes') && <Link to="/shop/Cakes" className="btn btn-ghost">Order a cake</Link>}
          </div>
        </div>
        <div className="hero-window">
          <Arch image={hero?.image} alt={hero?.name || ''} label={settings?.shopName} className="arch-hero" eager />
          {hero && (
            <Link to={`/product/${hero.id}`} className="hero-caption">
              <span>{hero.name}</span>
            </Link>
          )}
        </div>
      </section>

      {categories.length > 0 && (
        <section className="section">
          <div className="section-head">
            <h2>The counter</h2>
            <Ornament />
          </div>
          <div className="category-row">
            {categories.map((c) => {
              const cover = products.find((p) => p.category === c && p.image)
              const count = products.filter((p) => p.category === c).length
              return (
                <Link key={c} to={`/shop/${encodeURIComponent(c)}`} className="category-tile">
                  <Arch image={cover?.image} alt="" label={c} />
                  <span className="category-name">{c}</span>
                  <span className="category-count">{count} {count === 1 ? 'item' : 'items'}</span>
                </Link>
              )
            })}
          </div>
        </section>
      )}

      <section className="section">
        <div className="section-head">
          <h2>{featured.length ? 'House favourites' : 'Fresh from the oven'}</h2>
          <Ornament />
        </div>
        {loading ? (
          <p className="muted center">Setting out the counter…</p>
        ) : showcase.length ? (
          <>
            <div className="product-grid">
              {showcase.map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
            <p className="center"><Link to="/shop" className="btn btn-ghost">See everything we bake</Link></p>
          </>
        ) : (
          <p className="muted center">Our menu is being arranged. Check back soon.</p>
        )}
      </section>

      <section className="salon-band">
        <div className="salon-inner">
          <div>
            <h3>Baked each morning</h3>
            <p>Everything on the counter is made in small batches the day you receive it.</p>
          </div>
          <div>
            <h3>Order ahead</h3>
            <p>Choose your date at checkout. Celebration cakes need at least two days’ notice.</p>
          </div>
          <div>
            <h3>Collect or delivered</h3>
            <p>{settings?.deliveryNote}</p>
          </div>
        </div>
      </section>
    </>
  )
}
