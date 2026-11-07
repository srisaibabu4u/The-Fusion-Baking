import { useState } from 'react'
import { Link } from 'react-router-dom'
import { formatPrice, imageUrl } from '../lib/api.js'
import { useShop } from '../lib/store.jsx'

export function Arch({ image, alt = '', label, className = '', eager = false }) {
  const src = imageUrl(image)
  return (
    <div className={`arch ${className}`}>
      {src ? (
        <img src={src} alt={alt} loading={eager ? 'eager' : 'lazy'} decoding="async" />
      ) : (
        <div className="arch-placeholder" aria-hidden="true">
          <span>{(label || alt || 'F').trim().charAt(0)}</span>
        </div>
      )}
    </div>
  )
}

export function Price({ value }) {
  const { settings } = useShop()
  return <span className="price">{formatPrice(value, settings?.currency)}</span>
}

export function ProductCard({ product }) {
  const soldOut = product.available === false
  return (
    <Link to={`/product/${product.id}`} className="product-card">
      <Arch image={product.image} alt={product.name} label={product.name} />
      <div className="product-card-body">
        <h3>{product.name}</h3>
        <p className="product-card-meta">
          <Price value={product.price} />
          {soldOut && <span className="badge badge-muted">Sold out</span>}
          {!soldOut && product.tags?.[0] && <span className="badge">{product.tags[0]}</span>}
        </p>
      </div>
    </Link>
  )
}

function EyeIcon({ open }) {
  return open ? (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path d="M3 3l18 18M10.6 5.1A9.9 9.9 0 0 1 12 5c6.4 0 10 7 10 7a17.6 17.6 0 0 1-3.2 4.1M6.6 6.6A17.4 17.4 0 0 0 2 12s3.6 7 10 7a9.6 9.6 0 0 0 5.4-1.6M9.9 9.9a3 3 0 0 0 4.2 4.2"
        fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

export function PasswordField({ label = 'Password', value, onChange, autoComplete = 'current-password', id = 'password', hint, ...rest }) {
  const [show, setShow] = useState(false)
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className="password-wrap">
        <input
          id={id}
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          required
          {...rest}
        />
        <button
          type="button"
          className="eye"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? 'Hide password' : 'Show password'}
          aria-pressed={show}
        >
          <EyeIcon open={show} />
        </button>
      </div>
      {hint && <small className="hint">{hint}</small>}
    </div>
  )
}

export function Field({ label, id, hint, as = 'input', ...rest }) {
  const Tag = as
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <Tag id={id} {...rest} />
      {hint && <small className="hint">{hint}</small>}
    </div>
  )
}

export function Notice({ kind = 'error', children }) {
  if (!children) return null
  return <p className={`notice notice-${kind}`} role={kind === 'error' ? 'alert' : 'status'}>{children}</p>
}

export function Ornament() {
  return (
    <svg className="ornament" viewBox="0 0 120 12" aria-hidden="true">
      <path d="M0 6h48M72 6h48" stroke="currentColor" strokeWidth="1" />
      <path d="M60 1l5 5-5 5-5-5z" fill="none" stroke="currentColor" strokeWidth="1" />
    </svg>
  )
}
