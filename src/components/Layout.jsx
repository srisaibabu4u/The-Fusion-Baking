import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { useShop } from '../lib/store.jsx'
import { imageUrl, whatsappLink } from '../lib/api.js'
import { Signature, WhatsAppIcon } from './ui.jsx'

export function Wordmark({ settings }) {
  const name = settings?.shopName || 'The Fusion Baking'
  return (
    <Link to="/" className="wordmark" aria-label={`${name} home`}>
      {settings?.logo && <img src={imageUrl(settings.logo)} alt="" className="wordmark-logo" />}
      <span className="wordmark-name">{name}</span>
    </Link>
  )
}

export default function Layout() {
  const { settings, cartCount, customer, categories } = useShop()
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()

  useEffect(() => { setOpen(false); window.scrollTo(0, 0) }, [pathname])

  const name = settings?.shopName || 'The Fusion Baking'
  const wa = whatsappLink(settings?.whatsapp, `Hi ${name}, I'd like to place an order.`)

  return (
    <div className="site">
      <a href="#main" className="skip">Skip to content</a>
      <header className="masthead">
        <div className="masthead-inner">
          <nav className="nav nav-left" aria-label="Shop">
            <NavLink to="/shop">Shop</NavLink>
            {categories.slice(0, 3).map((c) => (
              <NavLink key={c} to={`/shop/${encodeURIComponent(c)}`} className="hide-md">{c}</NavLink>
            ))}
            <NavLink to="/bulk-orders" className="hide-md">Bulk orders</NavLink>
          </nav>
          <Wordmark settings={settings} />
          <nav className="nav nav-right" aria-label="Account">
            <NavLink to={customer ? '/account' : '/account/login'} className="hide-sm">
              {customer ? customer.name.split(' ')[0] : 'Sign in'}
            </NavLink>
            <NavLink to="/cart" className="basket-link" aria-label={`Basket${cartCount ? `, ${cartCount} items` : ''}`}>
              <svg className="bag-icon" width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M5 8h14l-1.2 12.2a1 1 0 0 1-1 .8H7.2a1 1 0 0 1-1-.8z M9 8V6.5a3 3 0 0 1 6 0V8" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
              </svg>
              <span className="basket-text">Basket</span>
              {cartCount > 0 && <span className="basket-count" aria-hidden="true">{cartCount}</span>}
            </NavLink>
            <button className="menu-btn" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-controls="mobile-menu">Menu</button>
          </nav>
        </div>
        {open && (
          <nav id="mobile-menu" className="mobile-menu" aria-label="Menu">
            <NavLink to="/shop">Shop all</NavLink>
            {categories.map((c) => <NavLink key={c} to={`/shop/${encodeURIComponent(c)}`}>{c}</NavLink>)}
            <NavLink to="/bulk-orders">Bulk &amp; party orders</NavLink>
            <NavLink to={customer ? '/account' : '/account/login'}>{customer ? 'My account' : 'Sign in'}</NavLink>
          </nav>
        )}
      </header>

      <main id="main"><Outlet /></main>

      <footer className="footer">
        <Signature />
        <div className="footer-inner">
          <div className="footer-brand">
            <img src="/brand/logo-badge.png" alt="" width="84" height="84" loading="lazy" />
            <div>
            <p>{settings?.tagline}</p>
            {settings?.instagram && (
              <p><a href={settings.instagram} target="_blank" rel="noreferrer">Instagram @{settings.instagram.replace(/\/+$/, '').split('/').pop().split('?')[0]}</a></p>
            )}
            </div>
          </div>
          <div>
            <p className="footer-head">Ordering</p>
            {settings?.hours && <p>{settings.hours}</p>}
            {settings?.address && <p>{settings.address}</p>}
          </div>
          <div>
            <p className="footer-head">Contact</p>
            {wa && <p><a href={wa} target="_blank" rel="noreferrer">WhatsApp</a></p>}
            {settings?.phone && <p><a href={`tel:${settings.phone}`}>{settings.phone}</a></p>}
            {settings?.email && <p><a href={`mailto:${settings.email}`}>{settings.email}</a></p>}
          </div>
        </div>
        <p className="footer-fine">
          © {new Date().getFullYear()} {name}.{settings?.fssai && <> FSSAI Lic. No. {settings.fssai}.</>} <Link to="/admin/login">Staff sign in</Link>
        </p>
      </footer>

      {wa && (
        <a className="wa-float" href={wa} target="_blank" rel="noreferrer">
          <WhatsAppIcon size={20} /><span>Order on WhatsApp</span>
        </a>
      )}
    </div>
  )
}
