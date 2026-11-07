import { Link } from 'react-router-dom'
import { useShop } from '../lib/store.jsx'
import { whatsappLink } from '../lib/api.js'
import { KraftStrip, Photo, ProductCard } from '../components/ui.jsx'
import BulkForm from '../components/BulkForm.jsx'

export default function Home() {
  const { settings, products, categories, loading } = useShop()
  const featured = products.filter((p) => p.featured && p.available !== false)
  const showcase = (featured.length ? featured : products).slice(0, 8)
  const hero = showcase.find((p) => p.image) || products.find((p) => p.image)
  const recent = [...products].filter((p) => p.image).sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')).slice(0, 6)
  const wa = whatsappLink(settings?.whatsapp, `Hi ${settings?.shopName || ''}, I'd like to place an order.`)
  const igHandle = settings?.instagram ? settings.instagram.replace(/\/+$/, '').split('/').pop().split('?')[0] : ''

  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          {settings?.heroTagline && <p className="tagline">{settings.heroTagline}</p>}
          <h1 className="script-hero">{settings?.heroTitle}</h1>
          <p className="lede">{settings?.heroText}</p>
          <div className="actions">
            <Link to="/shop" className="btn btn-primary">Browse the bakes</Link>
            <Link to="/bulk-orders" className="btn btn-ghost">Bulk &amp; party orders</Link>
          </div>
        </div>
        <div className="hero-photo">
          <Photo image={hero?.image} alt={hero?.name || ''} label={settings?.shopName} tape eager
            caption={hero ? <Link to={`/product/${hero.id}`}>{hero.name}</Link> : null} />
        </div>
      </section>

      <KraftStrip>
        <p>
          Freshly baked on order. Order here, or{' '}
          {wa ? <a href={wa} target="_blank" rel="noreferrer">message us on WhatsApp</a> : <Link to="/bulk-orders">send us an enquiry</Link>}.
        </p>
      </KraftStrip>

      {categories.length > 0 && (
        <section className="section">
          <header className="section-head">
            <h2 className="script-head">From our oven</h2>
          </header>
          <div className="category-row">
            {categories.map((c, i) => {
              const cover = products.find((p) => p.category === c && p.image)
              return (
                <Link key={c} to={`/shop/${encodeURIComponent(c)}`} className={`category-tile tilt-${i % 4}`}>
                  <Photo image={cover?.image} alt="" label={c} caption={c} />
                </Link>
              )
            })}
          </div>
        </section>
      )}

      <section className="section">
        <header className="section-head">
          <h2 className="script-head">{featured.length ? 'House favourites' : 'Fresh bakes'}</h2>
        </header>
        {loading ? (
          <p className="muted center">Setting out the bakes…</p>
        ) : showcase.length ? (
          <>
            <div className="product-grid">{showcase.map((p) => <ProductCard key={p.id} product={p} />)}</div>
            <p className="center"><Link to="/shop" className="btn btn-ghost">See everything we bake</Link></p>
          </>
        ) : (
          <p className="muted center">Our menu is being arranged. Check back soon.</p>
        )}
      </section>

      <section className="bakes-band">
        <div className="bakes-inner">
          <div>
            <p className="tagline">Every bake, two ways</p>
            <h2 className="script-head">Classic or Nutritious</h2>
          </div>
          <div className="bakes-pair">
            <div>
              <h3>Classic</h3>
              <p>The recipe as it should be: butter, refined flour and good chocolate. Pure indulgence.</p>
            </div>
            <div>
              <h3>Nutritious</h3>
              <p>The same treat made with whole wheat, ragi or almond flour, with less refined sugar. Choose it on any item that offers it.</p>
            </div>
            <div>
              <h3>Eggless or with egg</h3>
              <p>Look for the green mark for eggless and the red mark for egg. Many bakes come both ways.</p>
            </div>
          </div>
        </div>
      </section>

      {recent.length >= 3 && (
        <section className="section recent">
          <header className="section-head">
            <h2 className="script-head">Recent bakes</h2>
            {igHandle && <p><a href={settings.instagram} target="_blank" rel="noreferrer">Follow @{igHandle} on Instagram</a></p>}
          </header>
          <div className="recent-strip">
            {recent.map((p, i) => (
              <Link key={p.id} to={`/product/${p.id}`} className={`recent-item tilt-${i % 4}`}>
                <Photo image={p.image} alt={p.name} caption={p.name} />
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="section bulk-section" id="bulk">
        <div className="bulk-copy">
          <p className="tagline">Gifting, offices &amp; celebrations</p>
          <h2 className="script-head">Bulk &amp; party orders</h2>
          <p>Individually packed muffins, cookie jars, brownie boxes and celebration cakes for 20 to 500 people. Tell us the occasion and quantity, and we’ll send options and a quote.</p>
        </div>
        <BulkForm />
      </section>

    </>
  )
}

export function BulkPage() {
  return (
    <section className="section bulk-section">
      <div className="bulk-copy">
        <p className="tagline">Gifting, offices &amp; celebrations</p>
        <h1 className="script-head">Bulk &amp; party orders</h1>
        <p>Individually packed muffins, cookie jars, brownie boxes and celebration cakes for 20 to 500 people. Every piece is freshly baked for your date, Classic or Nutritious, eggless or with egg.</p>
        <p>Tell us the occasion and quantity, and we’ll reply with options and a quote.</p>
      </div>
      <BulkForm />
    </section>
  )
}
