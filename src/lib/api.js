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

export const imageUrl = (key) => (key ? `/api/images/${key}` : null)

export function formatPrice(value, currency = '$') {
  if (!value) return 'Price on request'
  return `${currency}${Number(value).toFixed(2)}`
}
