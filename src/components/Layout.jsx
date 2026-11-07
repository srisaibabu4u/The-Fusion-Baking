import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { useShop } from '../lib/store.jsx'

export default function Layout() {
  const { settings, cartCount, customer, categories } = useShop()
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()

  useEffect(() => { setOpen(false); window.scrollTo(0, 0) }, [pathname])

  const name = settings?.shopName || 'The Fusion Baking'
  // Show the full name on one line; a leading "The" is set in gilt italic.
  const m = name.match(/^(the)\s+(.+)$/i)
  const lead = m ? m[1] : ''
  const main = m ? m[2] : name

  return (
    <div className="site">
      <a href="#main" className="skip">Skip to content</a>
      <header className="masthead">
        <div className="masthead-inner">
          <nav className="nav nav-left" aria-label="Shop">
            <NavLink to="/shop">Shop all</NavLink>
            {categories.slice(0, 3).map((c) => (
              <NavLink key={c} to={`/shop/${encodeURIComponent(c)}`} className="hide-md">{c}</NavLink>
            ))}
          </nav>
          <Link to="/" className="wordmark" aria-label={`${name} home`}>
            {lead && <span className="wordmark-lead">{lead} </span>}
            <span className="wordmark-main">{main}</span>
          </Link>
          <nav className="nav nav-right" aria-label="Account">
            <NavLink to={customer ? '/account' : '/account/login'} className="hide-sm">
              {customer ? customer.name.split(' ')[0] : 'Sign in'}
            </NavLink>
            <NavLink to="/cart" className="basket-link">
              Basket{cartCount > 0 && <span className="basket-count" aria-label={`${cartCount} items`}>{cartCount}</span>}
            </NavLink>
            <button className="menu-btn" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-controls="mobile-menu">
              Menu
            </button>
          </nav>
        </div>
        {open && (
          <nav id="mobile-menu" className="mobile-menu" aria-label="Menu">
            <NavLink to="/shop">Shop all</NavLink>
            {categories.map((c) => <NavLink key={c} to={`/shop/${encodeURIComponent(c)}`}>{c}</NavLink>)}
            <NavLink to={customer ? '/account' : '/account/login'}>{customer ? 'My account' : 'Sign in'}</NavLink>
          </nav>
        )}
      </header>

      <main id="main"><Outlet /></main>

      <footer className="footer">
        <div className="footer-inner">
          <div>
            <p className="footer-name">{name}</p>
            <p>{settings?.tagline}</p>
          </div>
          <div>
            <p className="footer-head">Visit</p>
            {settings?.address && <p>{settings.address}</p>}
            {settings?.hours && <p>{settings.hours}</p>}
          </div>
          <div>
            <p className="footer-head">Contact</p>
            {settings?.phone && <p><a href={`tel:${settings.phone}`}>{settings.phone}</a></p>}
            {settings?.email && <p><a href={`mailto:${settings.email}`}>{settings.email}</a></p>}
            {settings?.instagram && <p><a href={settings.instagram} target="_blank" rel="noreferrer">Instagram</a></p>}
          </div>
        </div>
        <p className="footer-fine">© {new Date().getFullYear()} {name}. <Link to="/admin/login">Staff sign in</Link></p>
      </footer>
    </div>
  )
}
