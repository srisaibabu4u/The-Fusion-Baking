// The Fusion Baking — single API function.
// All data (products, images, customers, orders, settings) lives in Netlify Blobs,
// so there is no external database to set up.

import { getStore } from '@netlify/blobs'
import crypto from 'node:crypto'
import {
  signToken, verifyToken, hashPassword, checkPassword, checkAdminPassword, bearer,
} from './lib/auth.mjs'

export const config = { path: '/api/*' }

const store = (name) => getStore({ name, consistency: 'strong' })
const catalog = () => store('catalog')
const images = () => store('images')
const users = () => store('users')
const orders = () => store('orders')
const settingsStore = () => store('settings')

const MAX_IMAGE_BYTES = 5 * 1024 * 1024
const ORDER_STATUSES = ['pending', 'confirmed', 'baking', 'ready', 'completed', 'cancelled']

export const DEFAULT_SETTINGS = {
  shopName: 'The Fusion Baking',
  tagline: 'Baked every morning, finished by hand',
  heroTitle: 'Cakes, breads and small luxuries, baked fresh each day',
  heroText:
    'Celebration cakes, brownies, cookies, muffins and breads made in small batches. Order online and collect from the shop or have it delivered.',
  currency: '$',
  phone: '',
  email: '',
  address: '',
  hours: 'Tue – Sun, 9am – 7pm',
  deliveryNote: 'Orders are confirmed by phone or email. Pay on collection or delivery.',
  instagram: '',
}

// ---------- helpers ----------

const json = (data, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store', ...headers },
  })

const fail = (status, message) => json({ error: message }, status)

const id = () => crypto.randomBytes(8).toString('hex')

const emailKey = (email) => crypto.createHash('sha256').update(email.trim().toLowerCase()).digest('hex')

const slugify = (s) =>
  String(s || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)

const str = (v, max = 2000) => (v == null ? '' : String(v).trim().slice(0, max))
const num = (v) => {
  const n = Number(v)
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : 0
}

async function readJson(req) {
  try {
    return await req.json()
  } catch {
    return {}
  }
}

function auth(req) {
  return verifyToken(bearer(req))
}

const isAdmin = (req) => auth(req)?.role === 'admin'

function cleanProduct(input, existing = {}) {
  const p = { ...existing }
  if ('name' in input) p.name = str(input.name, 120) || existing.name || 'Untitled'
  if ('category' in input) p.category = str(input.category, 60) || 'Uncategorised'
  if ('price' in input) p.price = num(input.price)
  if ('description' in input) p.description = str(input.description, 3000)
  if ('ingredients' in input) p.ingredients = str(input.ingredients, 2000)
  if ('size' in input) p.size = str(input.size, 120)
  if ('tags' in input) {
    const tags = Array.isArray(input.tags) ? input.tags : String(input.tags || '').split(',')
    p.tags = tags.map((t) => str(t, 30)).filter(Boolean).slice(0, 12)
  }
  if ('featured' in input) p.featured = Boolean(input.featured)
  if ('available' in input) p.available = Boolean(input.available)
  if ('hidden' in input) p.hidden = Boolean(input.hidden)
  if ('sortOrder' in input) p.sortOrder = Math.round(Number(input.sortOrder) || 0)
  if ('slug' in input) p.slug = slugify(input.slug) || slugify(p.name)
  if (!p.slug) p.slug = slugify(p.name)
  return p
}

async function listProducts() {
  const s = catalog()
  const { blobs } = await s.list({ prefix: 'products/' })
  const all = await Promise.all(blobs.map((b) => s.get(b.key, { type: 'json' })))
  return all
    .filter(Boolean)
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.name.localeCompare(b.name))
}

async function getProduct(pid) {
  return catalog().get(`products/${pid}`, { type: 'json' })
}

async function saveProduct(p) {
  p.updatedAt = new Date().toISOString()
  await catalog().setJSON(`products/${p.id}`, p)
  return p
}

async function putImage(bytes, contentType) {
  const key = `${Date.now().toString(36)}-${id()}`
  await images().set(key, bytes, { metadata: { contentType } })
  return key
}

async function getSettings() {
  const saved = await settingsStore().get('site', { type: 'json' })
  return { ...DEFAULT_SETTINGS, ...(saved || {}) }
}

const publicUser = (u) => ({ id: u.id, name: u.name, email: u.email, phone: u.phone || '', createdAt: u.createdAt })

// ---------- route handlers ----------

async function handleImageUpload(req, url) {
  // Body: raw image bytes. Query: filename, category, name, productId (replace image), mode
  const contentType = req.headers.get('content-type') || ''
  if (!contentType.startsWith('image/')) return fail(415, 'Upload an image file (JPEG, PNG or WebP).')
  const bytes = await req.arrayBuffer()
  if (!bytes.byteLength) return fail(400, 'The image file is empty.')
  if (bytes.byteLength > MAX_IMAGE_BYTES) return fail(413, 'Images must be under 5 MB after compression.')

  const q = url.searchParams
  const imageKey = await putImage(bytes, contentType)

  // Replace the image of a specific product
  const productId = q.get('productId')
  if (productId) {
    const p = await getProduct(productId)
    if (!p) return fail(404, 'Product not found.')
    const old = p.image
    p.image = imageKey
    await saveProduct(p)
    if (old) await images().delete(old).catch(() => {})
    return json({ product: p, created: false })
  }

  // Folder upload: create a product, or update the image of the product with the same slug
  const name = str(q.get('name'), 120) || 'Untitled'
  const slug = slugify(name)
  const existing = (await listProducts()).find((p) => p.slug === slug)
  if (existing) {
    const old = existing.image
    existing.image = imageKey
    if (q.get('category')) existing.category = str(q.get('category'), 60)
    await saveProduct(existing)
    if (old && old !== imageKey) await images().delete(old).catch(() => {})
    return json({ product: existing, created: false })
  }

  const p = cleanProduct(
    {
      name,
      category: q.get('category') || 'Uncategorised',
      price: q.get('price') || 0,
      description: q.get('description') || '',
      available: true,
      featured: false,
      tags: [],
    },
    { id: id(), createdAt: new Date().toISOString(), sortOrder: Date.now() % 1e9 },
  )
  p.image = imageKey
  p.originalFile = str(q.get('filename'), 200)
  await saveProduct(p)
  return json({ product: p, created: true }, 201)
}

async function router(req) {
  const url = new URL(req.url)
  const path = url.pathname.replace(/^\/api/, '').replace(/\/+$/, '') || '/'
  const seg = path.split('/').filter(Boolean)
  const method = req.method

  // ---- health ----
  if (path === '/health') return json({ ok: true, adminConfigured: Boolean(process.env.ADMIN_PASSWORD) })

  // ---- images (public) ----
  if (seg[0] === 'images' && seg[1] && method === 'GET') {
    const res = await images().getWithMetadata(seg[1], { type: 'arrayBuffer' })
    if (!res) return new Response('Not found', { status: 404 })
    return new Response(res.data, {
      headers: {
        'content-type': res.metadata?.contentType || 'image/jpeg',
        'cache-control': 'public, max-age=31536000, immutable',
      },
    })
  }

  // ---- settings ----
  if (path === '/settings') {
    if (method === 'GET') return json(await getSettings())
    if (method === 'PUT') {
      if (!isAdmin(req)) return fail(401, 'Sign in as admin to change settings.')
      const body = await readJson(req)
      const next = await getSettings()
      for (const k of Object.keys(DEFAULT_SETTINGS)) if (k in body) next[k] = str(body[k], 1000)
      await settingsStore().setJSON('site', next)
      return json(next)
    }
  }

  // ---- auth ----
  if (path === '/auth/admin' && method === 'POST') {
    const { password } = await readJson(req)
    const r = checkAdminPassword(password)
    if (r.reason === 'not-configured')
      return fail(503, 'Admin password is not set. Add ADMIN_PASSWORD in Netlify environment variables.')
    if (!r.ok) {
      await new Promise((ok) => setTimeout(ok, 600))
      return fail(401, 'That password is incorrect.')
    }
    return json({ token: signToken({ role: 'admin', sub: 'admin', name: 'Admin' }, 60 * 60 * 12) })
  }

  if (path === '/auth/register' && method === 'POST') {
    const body = await readJson(req)
    const name = str(body.name, 80)
    const email = str(body.email, 160).toLowerCase()
    const password = String(body.password || '')
    if (!name) return fail(400, 'Enter your name.')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail(400, 'Enter a valid email address.')
    if (password.length < 8) return fail(400, 'Use a password of at least 8 characters.')
    const key = `users/${emailKey(email)}`
    if (await users().get(key, { type: 'json' })) return fail(409, 'An account with this email already exists. Sign in instead.')
    const user = {
      id: id(), name, email, phone: str(body.phone, 30),
      password: hashPassword(password), createdAt: new Date().toISOString(),
    }
    await users().setJSON(key, user)
    return json({ token: signToken({ role: 'customer', sub: user.id, email, name }), user: publicUser(user) }, 201)
  }

  if (path === '/auth/login' && method === 'POST') {
    const body = await readJson(req)
    const email = str(body.email, 160).toLowerCase()
    const user = email ? await users().get(`users/${emailKey(email)}`, { type: 'json' }) : null
    if (!user || !checkPassword(String(body.password || ''), user.password)) {
      await new Promise((ok) => setTimeout(ok, 400))
      return fail(401, 'Email or password is incorrect.')
    }
    return json({ token: signToken({ role: 'customer', sub: user.id, email, name: user.name }), user: publicUser(user) })
  }

  if (path === '/auth/me' && method === 'GET') {
    const t = auth(req)
    if (!t) return fail(401, 'Not signed in.')
    if (t.role === 'admin') return json({ role: 'admin', name: 'Admin' })
    const user = await users().get(`users/${emailKey(t.email)}`, { type: 'json' })
    if (!user) return fail(401, 'Account not found.')
    return json({ role: 'customer', user: publicUser(user) })
  }

  // ---- products ----
  if (seg[0] === 'products') {
    if (seg.length === 1 && method === 'GET') {
      const all = await listProducts()
      return json(isAdmin(req) ? all : all.filter((p) => !p.hidden))
    }
    if (seg.length === 1 && method === 'POST') {
      if (!isAdmin(req)) return fail(401, 'Sign in as admin.')
      const body = await readJson(req)
      const p = cleanProduct(
        { available: true, featured: false, tags: [], ...body },
        { id: id(), createdAt: new Date().toISOString(), sortOrder: Date.now() % 1e9 },
      )
      return json(await saveProduct(p), 201)
    }
    if (seg.length === 2) {
      const p = await getProduct(seg[1])
      if (method === 'GET') return p && (!p.hidden || isAdmin(req)) ? json(p) : fail(404, 'Product not found.')
      if (!isAdmin(req)) return fail(401, 'Sign in as admin.')
      if (!p) return fail(404, 'Product not found.')
      if (method === 'PUT' || method === 'PATCH') {
        const body = await readJson(req)
        return json(await saveProduct(cleanProduct(body, p)))
      }
      if (method === 'DELETE') {
        await catalog().delete(`products/${p.id}`)
        if (p.image) await images().delete(p.image).catch(() => {})
        return json({ ok: true })
      }
    }
  }

  // ---- bulk product actions (admin) ----
  if (path === '/admin/products/bulk' && method === 'POST') {
    if (!isAdmin(req)) return fail(401, 'Sign in as admin.')
    const { ids = [], action, value } = await readJson(req)
    const done = []
    for (const pid of ids.slice(0, 500)) {
      const p = await getProduct(pid)
      if (!p) continue
      if (action === 'delete') {
        await catalog().delete(`products/${p.id}`)
        if (p.image) await images().delete(p.image).catch(() => {})
      } else if (action === 'category') {
        await saveProduct(cleanProduct({ category: value }, p))
      } else if (action === 'available') {
        await saveProduct(cleanProduct({ available: Boolean(value) }, p))
      } else if (action === 'hidden') {
        await saveProduct(cleanProduct({ hidden: Boolean(value) }, p))
      }
      done.push(pid)
    }
    return json({ ok: true, count: done.length })
  }

  if (path === '/admin/upload' && method === 'POST') {
    if (!isAdmin(req)) return fail(401, 'Sign in as admin.')
    return handleImageUpload(req, url)
  }

  // ---- customers (admin) ----
  if (path === '/admin/users' && method === 'GET') {
    if (!isAdmin(req)) return fail(401, 'Sign in as admin.')
    const s = users()
    const { blobs } = await s.list({ prefix: 'users/' })
    const all = (await Promise.all(blobs.map((b) => s.get(b.key, { type: 'json' })))).filter(Boolean)
    return json(all.map(publicUser).sort((a, b) => b.createdAt.localeCompare(a.createdAt)))
  }

  // ---- orders ----
  if (seg[0] === 'orders') {
    const t = auth(req)
    if (seg.length === 1 && method === 'POST') {
      if (!t || t.role !== 'customer') return fail(401, 'Sign in to place an order.')
      const body = await readJson(req)
      const items = Array.isArray(body.items) ? body.items.slice(0, 100) : []
      if (!items.length) return fail(400, 'Your basket is empty.')
      const lines = []
      for (const it of items) {
        const p = await getProduct(str(it.id, 40))
        if (!p || p.available === false) return fail(409, `${it.name || 'An item'} is no longer available. Remove it to continue.`)
        const qty = Math.min(50, Math.max(1, Math.round(Number(it.qty) || 1)))
        lines.push({ id: p.id, name: p.name, price: p.price, qty, image: p.image || null })
      }
      const subtotal = Math.round(lines.reduce((s, l) => s + l.price * l.qty, 0) * 100) / 100
      const order = {
        id: `FB-${Date.now().toString(36).toUpperCase()}`,
        userId: t.sub,
        customer: { name: str(body.name, 80) || t.name, email: t.email, phone: str(body.phone, 30) },
        fulfilment: body.fulfilment === 'delivery' ? 'delivery' : 'pickup',
        address: str(body.address, 400),
        date: str(body.date, 40),
        notes: str(body.notes, 1000),
        items: lines,
        subtotal,
        status: 'pending',
        createdAt: new Date().toISOString(),
      }
      if (order.fulfilment === 'delivery' && !order.address) return fail(400, 'Enter a delivery address.')
      if (!order.customer.phone) return fail(400, 'Enter a phone number so we can confirm your order.')
      await orders().setJSON(`orders/${order.id}`, order)
      return json(order, 201)
    }
    if (seg.length === 1 && method === 'GET') {
      if (!t) return fail(401, 'Sign in to see orders.')
      const s = orders()
      const { blobs } = await s.list({ prefix: 'orders/' })
      let all = (await Promise.all(blobs.map((b) => s.get(b.key, { type: 'json' })))).filter(Boolean)
      if (t.role !== 'admin') all = all.filter((o) => o.userId === t.sub)
      return json(all.sort((a, b) => b.createdAt.localeCompare(a.createdAt)))
    }
    if (seg.length === 2 && (method === 'PATCH' || method === 'PUT')) {
      if (t?.role !== 'admin') return fail(401, 'Sign in as admin.')
      const o = await orders().get(`orders/${seg[1]}`, { type: 'json' })
      if (!o) return fail(404, 'Order not found.')
      const { status } = await readJson(req)
      if (!ORDER_STATUSES.includes(status)) return fail(400, 'Unknown order status.')
      o.status = status
      o.updatedAt = new Date().toISOString()
      await orders().setJSON(`orders/${o.id}`, o)
      return json(o)
    }
  }

  return fail(404, `No API route for ${method} ${path}`)
}

export default async (req) => {
  try {
    return await router(req)
  } catch (err) {
    console.error(err)
    return fail(500, 'Something went wrong on the server. Try again in a moment.')
  }
}
