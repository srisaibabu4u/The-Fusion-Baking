import crypto from 'node:crypto'

const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7 // 7 days

function secret() {
  const s = process.env.JWT_SECRET
  if (s && s.length >= 16) return s
  // Fallback derived from the admin password so the site still works before
  // JWT_SECRET is configured. Set JWT_SECRET in production.
  const base = process.env.ADMIN_PASSWORD || 'fusion-baking-dev-only'
  return crypto.createHash('sha256').update(`fusion-baking::${base}`).digest('hex')
}

const b64u = (input) => Buffer.from(input).toString('base64url')

export function signToken(payload, ttl = TOKEN_TTL_SECONDS) {
  const now = Math.floor(Date.now() / 1000)
  const header = b64u(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const body = b64u(JSON.stringify({ ...payload, iat: now, exp: now + ttl }))
  const sig = crypto.createHmac('sha256', secret()).update(`${header}.${body}`).digest('base64url')
  return `${header}.${body}.${sig}`
}

export function verifyToken(token) {
  if (!token || typeof token !== 'string') return null
  const parts = token.split('.')
  if (parts.length !== 3) return null
  const [header, body, sig] = parts
  const expected = crypto.createHmac('sha256', secret()).update(`${header}.${body}`).digest('base64url')
  const a = Buffer.from(sig)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'))
    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null
    return payload
  } catch {
    return null
  }
}

export function hashPassword(password) {
  const salt = crypto.randomBytes(16)
  const hash = crypto.scryptSync(password, salt, 64)
  return `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`
}

export function checkPassword(password, stored) {
  if (!stored || typeof stored !== 'string') return false
  const [scheme, saltHex, hashHex] = stored.split('$')
  if (scheme !== 'scrypt') return false
  const expected = Buffer.from(hashHex, 'hex')
  const actual = crypto.scryptSync(password, Buffer.from(saltHex, 'hex'), expected.length)
  return crypto.timingSafeEqual(expected, actual)
}

export function checkAdminPassword(password) {
  const configured = process.env.ADMIN_PASSWORD
  if (!configured) return { ok: false, reason: 'not-configured' }
  const a = crypto.createHash('sha256').update(String(password ?? '')).digest()
  const b = crypto.createHash('sha256').update(configured).digest()
  return { ok: crypto.timingSafeEqual(a, b) }
}

export function bearer(req) {
  const h = req.headers.get('authorization') || ''
  return h.startsWith('Bearer ') ? h.slice(7) : null
}
