const TOKEN_KEY = 'fb.customerToken'
const ADMIN_KEY = 'fb.adminToken'

const safe = {
  get(k) {
    try { return localStorage.getItem(k) } catch { return null }
  },
  set(k, v) {
    try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v) } catch { /* storage unavailable */ }
  },
}

export const tokens = {
  customer: () => safe.get(TOKEN_KEY),
  admin: () => safe.get(ADMIN_KEY),
  setCustomer: (t) => safe.set(TOKEN_KEY, t),
  setAdmin: (t) => safe.set(ADMIN_KEY, t),
}
export { safe as storage }

export async function api(path, { method = 'GET', body, as = 'customer', raw, headers = {} } = {}) {
  const token = as === 'admin' ? tokens.admin() : as === 'customer' ? tokens.customer() : null
  const init = { method, headers: { ...headers } }
  if (token) init.headers.authorization = `Bearer ${token}`
  if (raw) init.body = raw
  else if (body !== undefined) {
    init.body = JSON.stringify(body)
    init.headers['content-type'] = 'application/json'
  }
  let res
  try {
    res = await fetch(`/api${path}`, init)
  } catch {
    throw new Error('Could not reach the server. Check your connection and try again.')
  }
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error(data.error || `Request failed (${res.status}).`)
    err.status = res.status
    throw err
  }
  return data
}

// Uploaded photos are blob keys; starter-menu photos are static paths like /seed/x.webp
export const imageUrl = (key) => (!key ? null : key.startsWith('/') ? key : `/api/images/${key}`)

// ₹ uses Indian digit grouping (₹1,25,000); other currencies use 2 decimals.
export function money(value, currency = '₹') {
  const n = Number(value) || 0
  if (currency.includes('₹')) {
    return `${currency}${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
  }
  return `${currency}${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function formatPrice(value, currency = '₹') {
  if (!value) return 'Price on request'
  return money(value, currency)
}

export const VARIANT_LABEL = { classic: 'Classic', nutritious: 'Nutritious' }
export const EGG_LABEL = { eggless: 'Eggless', egg: 'With egg' }

export function offeredVariants(p) {
  const v = []
  if (p.offerClassic !== false) v.push('classic')
  if (p.offerNutritious) v.push('nutritious')
  return v.length ? v : ['classic']
}

export const variantPrice = (p, variant) => (variant === 'nutritious' ? p.nutritiousPrice : p.classicPrice ?? p.price) || 0

export function whatsappLink(number, text) {
  const digits = String(number || '').replace(/\D/g, '')
  if (!digits) return null
  return `https://wa.me/${digits}${text ? `?text=${encodeURIComponent(text)}` : ''}`
}
