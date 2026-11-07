import { useState } from 'react'
import { Link } from 'react-router-dom'
import { formatPrice, imageUrl, money, offeredVariants } from '../lib/api.js'
import { useShop } from '../lib/store.jsx'

// Polaroid print: white border, deeper bottom margin, optional tape and handwritten caption.
export function Photo({ image, alt = '', label, caption, className = '', tape = false, eager = false }) {
  const src = imageUrl(image)
  return (
    <figure className={`polaroid ${tape ? 'has-tape' : ''} ${className}`}>
      <div className="polaroid-img">
        {src ? (
          <img src={src} alt={alt} loading={eager ? 'eager' : 'lazy'} decoding="async" />
        ) : (
          <div className="photo-placeholder" aria-hidden="true"><span>{(label || alt || 'F').trim().charAt(0)}</span></div>
        )}
      </div>
      {caption && <figcaption>{caption}</figcaption>}
    </figure>
  )
}

export function Price({ value }) {
  const { settings } = useShop()
  return <span className="price">{formatPrice(value, settings?.currency)}</span>
}

export function FromPrice({ product }) {
  const { settings } = useShop()
  const cur = settings?.currency || '₹'
  if (!product.price) return <span className="price">Price on request</span>
  const multi = offeredVariants(product).length > 1 && product.classicPrice !== product.nutritiousPrice
  return <span className="price">{multi ? 'From ' : ''}{money(product.price, cur)}</span>
}

// Indian food marks: green = eggless (vegetarian), red = contains egg.
export function VegMark({ type, size = 16, title }) {
  const color = type === 'egg' ? '#b3261e' : '#1e8a3a'
  const label = title || (type === 'egg' ? 'Contains egg' : 'Eggless')
  return (
    <svg className="veg-mark" width={size} height={size} viewBox="0 0 16 16" role="img" aria-label={label}>
      <title>{label}</title>
      <rect x="1" y="1" width="14" height="14" rx="1.5" fill="#fff" stroke={color} strokeWidth="1.6" />
      <circle cx="8" cy="8" r="3.8" fill={color} />
    </svg>
  )
}

export function DietMarks({ diet, withText = false }) {
  const kinds = diet === 'both' ? ['eggless', 'egg'] : [diet === 'egg' ? 'egg' : 'eggless']
  const text = diet === 'both' ? 'Eggless or with egg' : diet === 'egg' ? 'Contains egg' : 'Eggless'
  return (
    <span className="diet-marks" title={text}>
      {kinds.map((k) => <VegMark key={k} type={k} />)}
      {withText && <span>{text}</span>}
    </span>
  )
}

export function ProductCard({ product }) {
  const soldOut = product.available === false
  return (
    <Link to={`/product/${product.id}`} className="product-card">
      <Photo image={product.image} alt={product.name} label={product.name} />
      <div className="product-card-body">
        <h3>{product.name}</h3>
        {product.tagline && <p className="card-tagline">{product.tagline}</p>}
        <p className="product-card-meta">
          <DietMarks diet={product.diet} />
          <FromPrice product={product} />
          {soldOut && <span className="badge badge-muted">Sold out</span>}
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
        <input id={id} type={show ? 'text' : 'password'} value={value} onChange={(e) => onChange(e.target.value)} autoComplete={autoComplete} required {...rest} />
        <button type="button" className="eye" onClick={() => setShow((s) => !s)} aria-label={show ? 'Hide password' : 'Show password'} aria-pressed={show}>
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

// "------- The Fusion Baking -------" — the sign-off from the Instagram posters.
export function Signature({ name }) {
  const { settings } = useShop()
  return (
    <div className="signature" aria-hidden="true">
      <span className="signature-line" />
      <span className="signature-name">{name || settings?.shopName || 'The Fusion Baking'}</span>
      <span className="signature-line" />
    </div>
  )
}

export function KraftStrip({ children }) {
  return <div className="kraft">{children}</div>
}

export function WhatsAppIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path fill="currentColor" d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.3-.4.7-1.4a.5.5 0 0 0 0-.5l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.9 11.9 0 0 0 4.6 4 5.2 5.2 0 0 0 3.2.7 2.7 2.7 0 0 0 1.8-1.3 2.2 2.2 0 0 0 .2-1.3c-.1-.1-.2-.2-.4-.3z" />
    </svg>
  )
}
