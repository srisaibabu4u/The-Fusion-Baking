// The Fusion Baking — single API function.
// All data (products, images, customers, orders, enquiries, settings) lives in
// Netlify Blobs, so there is no external database to set up.

import { getStore } from '@netlify/blobs'
import crypto from 'node:crypto'
import {
  signToken, verifyToken, hashPassword, checkPassword, checkAdminPassword, bearer,
} from './lib/auth.mjs'
import { SEED_PRODUCTS } from './lib/seed.mjs'

export const config = { path: '/api/*' }

const store = (name) => getStore({ name, consistency: 'strong' })
const catalog = () => store('catalog')
const images = () => store('images')
const users = () => store('users')
const orders = () => store('orders')
const enquiries = () => store('enquiries')
const settingsStore = () => store('settings')

const MAX_IMAGE_BYTES = 5 * 1024 * 1024
const ORDER_STATUSES = ['pending', 'confirmed', 'baking', 'ready', 'completed', 'cancelled']
const ENQUIRY_STATUSES = ['new', 'contacted', 'quoted', 'won', 'closed']
const DIETS = ['eggless', 'egg', 'both']

export const DEFAULT_SETTINGS = {
  shopName: 'The Fusion Baking',
  tagline: 'Classic & nutritious bakes, freshly baked on order',
  heroTitle: 'Baked fresh, just for you',
  heroTagline: 'Classic & Nutritious Bakes',
  heroText:
    'Cookies, biscuits, brownies, cakes and muffins, each baked to order. Choose the classic recipe or our nutritious version made with whole wheat, ragi and almond flour.',
  currency: '₹',
  phone: '',
  whatsapp: '',
  email: '',
  address: '',
  hours: 'Orders taken daily, 9am – 8pm',
  deliveryNote: 'Freshly baked on order. We confirm every order on WhatsApp or by phone, and you pay on delivery or collection.',
  instagram: 'https://www.instagram.com/thefusionbaking',
  fssai: '',
  logo: '/brand/logo-apron.png',
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
const bool = (v) => v === true || v === 'true' || v === 1 || v === '1' || v === 'yes' || v === 'on'

async function readJson(req) {
  try {
    return await req.json()
  } catch {
    return {}
  }
}

const auth = (req) => verifyToken(bearer(req))
const isAdmin = (req) => auth(req)?.role === 'admin'

// Fill in fields for products saved before Classic/Nutritious pricing existed,
// and keep `price` as the lowest offered price for sorting and "From" labels.
export function normalizeProduct(p) {
  if (!p) return p
  const o = { ...p }
  if (o.classicPrice == null) o.classicPrice = num(o.price)
  if (o.nutritiousPrice == null) o.nutritiousPrice = 0
  if (o.offerClassic == null) o.offerClassic = true
  if (o.offerNutritious == null) o.offerNutritious = false
  if (!o.offerClassic && !o.offerNutritious) o.offerClassic = true
  if (!DIETS.includes(o.diet)) o.diet = 'both'
  if (o.tagline == null) o.tagline = ''
  if (o.nutritiousNote == null) o.nutritiousNote = ''
  const offered = [o.offerClassic && o.classicPrice, o.offerNutritious && o.nutritiousPrice].filter((x) => x > 0)
  o.price = offered.length ? Math.min(...offered) : 0
  return o
}

function cleanProduct(input, existing = {}) {
  const p = { ...existing }
  if ('name' in input) p.name = str(input.name, 120) || existing.name || 'Untitled'
  if ('category' in input) p.category = str(input.category, 60) || 'Uncategorised'
  if ('price' in input && !('classicPrice' in input)) p.classicPrice = num(input.price)
  if ('classicPrice' in input) p.classicPrice = num(input.classicPrice)
  if ('nutritiousPrice' in input) p.nutritiousPrice = num(input.nutritiousPrice)
  if ('offerClassic' in input) p.offerClassic = bool(input.offerClassic)
  if ('offerNutritious' in input) p.offerNutritious = bool(input.offerNutritious)
  if ('nutritiousNote' in input) p.nutritiousNote = str(input.nutritiousNote, 200)
  if ('diet' in input) p.diet = DIETS.includes(input.diet) ? input.diet : 'both'
  if ('tagline' in input) p.tagline = str(input.tagline, 80)
  if ('description' in input) p.description = str(input.description, 3000)
  if ('ingredients' in input) p.ingredients = str(input.ingredients, 2000)
  if ('size' in input) p.size = str(input.size, 120)
  if ('tags' in input) {
    const tags = Array.isArray(input.tags) ? input.tags : String(input.tags || '').split(',')
    p.tags = tags.map((t) => str(t, 30)).filter(Boolean).slice(0, 12)
  }
  if ('featured' in input) p.featured = bool(input.featured)
  if ('available' in input) p.available = bool(input.available)
  if ('hidden' in input) p.hidden = bool(input.hidden)
  if ('sortOrder' in input) p.sortOrder = Math.round(Number(input.sortOrder) || 0)
  if ('slug' in input) p.slug = slugify(input.slug) || slugify(p.name)
  if (!p.slug) p.slug = slugify(p.name)
  delete p.price
  return normalizeProduct(p)
}

async function listProducts() {
  const s = catalog()
  const { blobs } = await s.list({ prefix: 'products/' })
  const all = await Promise.all(blobs.map((b) => s.get(b.key, { type: 'json' })))
  return all
    .filter(Boolean)
    .map(normalizeProduct)
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.name.localeCompare(b.name))
}

async function getProduct(pid) {
  return normalizeProduct(await catalog().get(`products/${pid}`, { type: 'json' }))
}

async function saveProduct(p) {
  p.updatedAt = new Date().toISOString()
  await catalog().setJSON(`products/${p.id}`, p)
  return p
}

// Starter-menu photos are static files ("/seed/…"); uploaded photos are blob keys.
const isBlobKey = (k) => Boolean(k) && !k.startsWith('/')
const dropImage = async (k) => { if (isBlobKey(k)) await images().delete(k).catch(() => {}) }

async function deleteProduct(p) {
  await catalog().delete(`products/${p.id}`)
  await dropImage(p.image)
}

async function addSeedProducts() {
  const existing = new Set((await listProducts()).map((p) => p.slug))
  let added = 0
  for (const [i, seed] of SEED_PRODUCTS.entries()) {
    const p = cleanProduct(seed, { id: id(), createdAt: new Date(Date.now() - i * 60000).toISOString() })
    if (existing.has(p.slug)) continue
    p.image = seed.image
    await saveProduct(p)
    added++
  }
  return added
}

// First run only: an empty catalogue gets the starter menu. After that the
// admin is in charge, so deleting everything never brings it back.
async function seedIfFirstRun() {
  const st = settingsStore()
  if (await st.get('seed-state', { type: 'json' })) return
  await st.setJSON('seed-state', { at: new Date().toISOString() })
  const { blobs } = await catalog().list({ prefix: 'products/' })
  if (!blobs.length) await addSeedProducts()
}

async function putImage(bytes, contentType) {
  const key = `${Date.now().toString(36)}-${id()}`
  await images().set(key, bytes, { metadata: { contentType } })
  return key
}

async function readImage(req) {
  const contentType = req.headers.get('content-type') || ''
  if (!contentType.startsWith('image/')) return { error: fail(415, 'Upload an image file (JPEG, PNG or WebP).') }
  const bytes = await req.arrayBuffer()
  if (!bytes.byteLength) return { error: fail(400, 'The image file is empty.') }
  if (bytes.byteLength > MAX_IMAGE_BYTES) return { error: fail(413, 'Images must be under 5 MB after compression.') }
  return { bytes, contentType }
}

async function getSettings() {
  const saved = await settingsStore().get('site', { type: 'json' })
  return { ...DEFAULT_SETTINGS, ...(saved || {}) }
}

async function listAll(s, prefix) {
  const { blobs } = await s.list({ prefix })
  return (await Promise.all(blobs.map((b) => s.get(b.key, { type: 'json' })))).filter(Boolean)
}

const publicUser = (u) => ({ id: u.id, name: u.name, email: u.email, phone: u.phone || '', createdAt: u.createdAt })

// ---------- route handlers ----------

async function handleImageUpload(req, url) {
  // Body: raw image bytes. Query: filename, category, name, productId (replace image)
  const img = await readImage(req)
  if (img.error) return img.error
  const q = url.searchParams
  const imageKey = await putImage(img.bytes, img.contentType)

  const productId = q.get('productId')
  if (productId) {
    const p = await getProduct(productId)
    if (!p) return fail(404, 'Product not found.')
    const old = p.image
    p.image = imageKey
    await saveProduct(p)
    await dropImage(old)
    return json({ product: p, created: false })
  }

  // Folder upload: create a product, or update the photo of the product with the same name
  const name = str(q.get('name'), 120) || 'Untitled'
  const slug = slugify(name)
  const existing = (await listProducts()).find((p) => p.slug === slug)
  if (existing) {
    const old = existing.image
    existing.image = imageKey
    if (q.get('category')) existing.category = str(q.get('category'), 60)
    await saveProduct(existing)
    if (old !== imageKey) await dropImage(old)
    return json({ product: existing, created: false })
  }

  const p = cleanProduct(
    {
      name,
      category: q.get('category') || 'Uncategorised',
      classicPrice: q.get('price') || 0,
      available: true,
      featured: false,
      tags: [],
    },
    { id: id(), createdAt: new Date().toISOString(), sortOrder: Date.now() % 1e9, description: '' },
  )
  p.image = imageKey
  p.originalFile = str(q.get('filename'), 200)
  await saveProduct(p)
  return json({ product: p, created: true }, 201)
}

async function placeOrder(req, t) {
  const body = await readJson(req)
  const items = Array.isArray(body.items) ? body.items.slice(0, 100) : []
  if (!items.length) return fail(400, 'Your basket is empty.')
  const lines = []
  for (const it of items) {
    const p = await getProduct(str(it.id, 40))
    if (!p || p.hidden || p.available === false) return fail(409, `${it.name || 'An item'} is no longer available. Remove it to continue.`)
    const variant = it.variant === 'nutritious' ? 'nutritious' : 'classic'
    if (variant === 'classic' && !p.offerClassic) return fail(409, `${p.name} is only available in the Nutritious version.`)
    if (variant === 'nutritious' && !p.offerNutritious) return fail(409, `${p.name} is only available in the Classic version.`)
    const egg = p.diet === 'both' ? (it.egg === 'egg' ? 'egg' : 'eggless') : p.diet
    const qty = Math.min(50, Math.max(1, Math.round(Number(it.qty) || 1)))
    const price = variant === 'nutritious' ? p.nutritiousPrice : p.classicPrice
    lines.push({ id: p.id, name: p.name, variant, egg, price, qty, image: p.image || null })
  }
  const subtotal = Math.round(lines.reduce((s, l) => s + l.price * l.qty, 0) * 100) / 100
  const order = {
    id: `FB-${Date.now().toString(36).toUpperCase()}`,
    userId: t.sub,
    customer: { name: str(body.name, 80) || t.name, email: t.email, phone: str(body.phone, 30) },
    fulfilment: body.fulfilment === 'delivery' ? 'delivery' : 'pickup',
    address: str(body.address, 400),
    pincode: str(body.pincode, 10),
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

async function router(req) {
  const url = new URL(req.url)
  const path = url.pathname.replace(/^\/api/, '').replace(/\/+$/, '') || '/'
  const seg = path.split('/').filter(Boolean)
  const method = req.method

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
      for (const k of Object.keys(DEFAULT_SETTINGS)) {
        if (k === 'logo') continue
        if (k in body) next[k] = str(body[k], 1000)
      }
      next.whatsapp = next.whatsapp.replace(/[^\d+]/g, '')
      await settingsStore().setJSON('site', next)
      return json(next)
    }
  }

  if (path === '/admin/logo') {
    if (!isAdmin(req)) return fail(401, 'Sign in as admin.')
    const next = await getSettings()
    const old = next.logo
    if (method === 'POST') {
      const img = await readImage(req)
      if (img.error) return img.error
      next.logo = await putImage(img.bytes, img.contentType)
    } else if (method === 'DELETE') {
      next.logo = ''
    } else return fail(405, 'Use POST or DELETE.')
    await settingsStore().setJSON('site', next)
    if (old !== next.logo) await dropImage(old)
    return json(next)
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
      await seedIfFirstRun()
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
      if (method === 'PUT' || method === 'PATCH') return json(await saveProduct(cleanProduct(await readJson(req), p)))
      if (method === 'DELETE') {
        await deleteProduct(p)
        return json({ ok: true })
      }
    }
  }

  if (path === '/admin/products/bulk' && method === 'POST') {
    if (!isAdmin(req)) return fail(401, 'Sign in as admin.')
    const { ids = [], action, value } = await readJson(req)
    let count = 0
    for (const pid of ids.slice(0, 500)) {
      const p = await getProduct(pid)
      if (!p) continue
      if (action === 'delete') await deleteProduct(p)
      else if (action === 'category') await saveProduct(cleanProduct({ category: value }, p))
      else if (action === 'available') await saveProduct(cleanProduct({ available: Boolean(value) }, p))
      else if (action === 'hidden') await saveProduct(cleanProduct({ hidden: Boolean(value) }, p))
      else if (action === 'diet') await saveProduct(cleanProduct({ diet: value }, p))
      else continue
      count++
    }
    return json({ ok: true, count })
  }

  if (path === '/admin/seed' && method === 'POST') {
    if (!isAdmin(req)) return fail(401, 'Sign in as admin.')
    await settingsStore().setJSON('seed-state', { at: new Date().toISOString() })
    return json({ added: await addSeedProducts() })
  }

  if (path === '/admin/upload' && method === 'POST') {
    if (!isAdmin(req)) return fail(401, 'Sign in as admin.')
    return handleImageUpload(req, url)
  }

  if (path === '/admin/users' && method === 'GET') {
    if (!isAdmin(req)) return fail(401, 'Sign in as admin.')
    const all = await listAll(users(), 'users/')
    return json(all.map(publicUser).sort((a, b) => b.createdAt.localeCompare(a.createdAt)))
  }

  // ---- orders ----
  if (seg[0] === 'orders') {
    const t = auth(req)
    if (seg.length === 1 && method === 'POST') {
      if (!t || t.role !== 'customer') return fail(401, 'Sign in to place an order.')
      return placeOrder(req, t)
    }
    if (seg.length === 1 && method === 'GET') {
      if (!t) return fail(401, 'Sign in to see orders.')
      let all = await listAll(orders(), 'orders/')
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

  // ---- bulk & party enquiries ----
  if (seg[0] === 'enquiries') {
    if (seg.length === 1 && method === 'POST') {
      const body = await readJson(req)
      if (body.website) return json({ ok: true }, 201) // honeypot: bots fill hidden fields
      const e = {
        id: `EQ-${Date.now().toString(36).toUpperCase()}`,
        name: str(body.name, 80),
        phone: str(body.phone, 30),
        email: str(body.email, 160),
        occasion: str(body.occasion, 120),
        date: str(body.date, 40),
        quantity: str(body.quantity, 60),
        details: str(body.details, 2000),
        status: 'new',
        createdAt: new Date().toISOString(),
      }
      if (!e.name) return fail(400, 'Enter your name.')
      if (!e.phone && !e.email) return fail(400, 'Enter a phone number or email so we can reply.')
      if (!e.details && !e.quantity) return fail(400, 'Tell us what you need and roughly how many.')
      await enquiries().setJSON(`enquiries/${e.id}`, e)
      return json({ ok: true, id: e.id }, 201)
    }
    if (!isAdmin(req)) return fail(401, 'Sign in as admin.')
    if (seg.length === 1 && method === 'GET') {
      const all = await listAll(enquiries(), 'enquiries/')
      return json(all.sort((a, b) => b.createdAt.localeCompare(a.createdAt)))
    }
    if (seg.length === 2 && (method === 'PATCH' || method === 'PUT')) {
      const e = await enquiries().get(`enquiries/${seg[1]}`, { type: 'json' })
      if (!e) return fail(404, 'Enquiry not found.')
      const { status } = await readJson(req)
      if (!ENQUIRY_STATUSES.includes(status)) return fail(400, 'Unknown enquiry status.')
      e.status = status
      await enquiries().setJSON(`enquiries/${e.id}`, e)
      return json(e)
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
