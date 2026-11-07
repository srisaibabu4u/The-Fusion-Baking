// Local smoke test for the API function using an in-process Netlify Blobs server.
// Run: npm run test:api
import { BlobsServer } from '@netlify/blobs/server'
import { setEnvironmentContext } from '@netlify/blobs'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import assert from 'node:assert/strict'

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fb-blobs-'))
const token = 'test-token'
const port = 18000 + Math.floor(Math.random() * 1000)
const server = new BlobsServer({ directory: dir, port, token })
await server.start()
const edge = `http://localhost:${port}`
setEnvironmentContext({ edgeURL: edge, uncachedEdgeURL: edge, siteID: 'test-site', token })

process.env.ADMIN_PASSWORD = 'sugar-and-spice-123'
process.env.JWT_SECRET = 'x'.repeat(40)
const { default: api } = await import('../netlify/functions/api.mjs')

// First run on an empty shop loads the starter menu once
{
  const res = await api(new Request('http://local/api/products'))
  const first = await res.json()
  if (first.length !== 11) throw new Error(`expected 11 starter items, got ${first.length}`)
  for (const p of first) {
    const del = await api(new Request(`http://local/api/products/${p.id}`, { method: 'DELETE', headers: { authorization: `Bearer ${(await (await api(new Request('http://local/api/auth/admin', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ password: process.env.ADMIN_PASSWORD }) }))).json()).token}` } }))
    if (del.status !== 200) throw new Error('delete failed')
  }
  const again = await (await api(new Request('http://local/api/products'))).json()
  if (again.length !== 0) throw new Error('starter menu must not come back after the admin clears it')
}

const call = async (method, p, { body, token: t, headers = {} } = {}) => {
  const init = { method, headers: { ...headers } }
  if (t) init.headers.authorization = `Bearer ${t}`
  if (body instanceof Uint8Array) init.body = body
  else if (body !== undefined) {
    init.body = JSON.stringify(body)
    init.headers['content-type'] = 'application/json'
  }
  const res = await api(new Request(`http://local/api${p}`, init))
  const ct = res.headers.get('content-type') || ''
  return { status: res.status, data: ct.includes('json') ? await res.json() : await res.arrayBuffer() }
}

let r = await call('POST', '/auth/admin', { body: { password: 'wrong' } })
assert.equal(r.status, 401)
r = await call('POST', '/auth/admin', { body: { password: 'sugar-and-spice-123' } })
assert.equal(r.status, 200)
const admin = r.data.token

// tiny 1x1 PNG
const png = Uint8Array.from(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==', 'base64'))
r = await call('POST', '/admin/upload?name=Chocolate%20Truffle%20Cake&category=Cakes&filename=cakes/chocolate-truffle-cake.png', { body: png, token: admin, headers: { 'content-type': 'image/png' } })
assert.equal(r.status, 201, JSON.stringify(r.data))
const product = r.data.product
assert.equal(product.category, 'Cakes')

// Same name again updates image rather than duplicating
r = await call('POST', '/admin/upload?name=Chocolate%20Truffle%20Cake&category=Cakes', { body: png, token: admin, headers: { 'content-type': 'image/png' } })
assert.equal(r.status, 200)
assert.equal(r.data.product.id, product.id)

assert.equal(product.offerClassic, true)
assert.equal(product.diet, 'both')
r = await call('PUT', `/products/${product.id}`, { body: { classicPrice: 650, nutritiousPrice: 720, offerNutritious: true, nutritiousNote: 'Whole wheat & jaggery', tagline: 'Dark chocolate treat', description: 'Dark Belgian chocolate', tags: 'Bestseller' }, token: admin })
assert.equal(r.data.price, 650, 'price is the lowest offered price')
assert.equal(r.data.nutritiousPrice, 720)
assert.equal(r.data.tagline, 'Dark chocolate treat')
assert.deepEqual(r.data.tags, ['Bestseller'])

r = await call('GET', `/images/${r.data.image}`)
assert.equal(r.status, 200)

r = await call('PUT', `/products/${product.id}`, { body: { price: 1 } })
assert.equal(r.status, 401, 'unauthenticated edit must fail')

r = await call('POST', '/auth/register', { body: { name: 'Asha', email: 'asha@example.com', password: 'short' } })
assert.equal(r.status, 400)
r = await call('POST', '/auth/register', { body: { name: 'Asha', email: 'Asha@Example.com', password: 'longenough1' } })
assert.equal(r.status, 201)
r = await call('POST', '/auth/register', { body: { name: 'Asha', email: 'asha@example.com', password: 'longenough1' } })
assert.equal(r.status, 409)
r = await call('POST', '/auth/login', { body: { email: 'asha@example.com', password: 'longenough1' } })
assert.equal(r.status, 200)
const customer = r.data.token

r = await call('POST', '/orders', { body: { items: [{ id: product.id, qty: 2, variant: 'classic', egg: 'egg' }, { id: product.id, qty: 1, variant: 'nutritious' }], phone: '9876543210', fulfilment: 'pickup' }, token: customer })
assert.equal(r.status, 201, JSON.stringify(r.data))
assert.equal(r.data.subtotal, 650 * 2 + 720)
assert.equal(r.data.items[0].egg, 'egg')
assert.equal(r.data.items[1].egg, 'eggless', 'egg choice defaults to eggless')
const orderId = r.data.id

r = await call('GET', '/orders', { token: customer })
assert.equal(r.data.length, 1)
r = await call('PATCH', `/orders/${orderId}`, { body: { status: 'baking' }, token: customer })
assert.equal(r.status, 401)
r = await call('PATCH', `/orders/${orderId}`, { body: { status: 'baking' }, token: admin })
assert.equal(r.data.status, 'baking')

r = await call('GET', '/admin/users', { token: admin })
assert.equal(r.data.length, 1)
assert.equal(r.data[0].password, undefined, 'password hash must never be returned')

r = await call('GET', '/settings')
assert.equal(r.data.currency, '₹')
r = await call('PUT', '/settings', { body: { whatsapp: '+91 98765 43210', fssai: '12345678901234' }, token: admin })
assert.equal(r.data.whatsapp, '+919876543210')
r = await call('POST', '/admin/logo', { body: png, token: admin, headers: { 'content-type': 'image/png' } })
assert.ok(r.data.logo, 'logo saved')

// Variant rules
r = await call('PUT', `/products/${product.id}`, { body: { offerClassic: false, diet: 'eggless' }, token: admin })
assert.equal(r.data.price, 720)
r = await call('POST', '/orders', { body: { items: [{ id: product.id, qty: 1, variant: 'classic' }], phone: '9876543210' }, token: customer })
assert.equal(r.status, 409)

// Bulk enquiries
r = await call('POST', '/enquiries', { body: { name: 'Office', phone: '9876543210', quantity: '200 muffins', occasion: 'Diwali' } })
assert.equal(r.status, 201)
r = await call('POST', '/enquiries', { body: { name: 'Bot', phone: '1', quantity: 'x', website: 'spam.example' } })
r = await call('GET', '/enquiries')
assert.equal(r.status, 401)
r = await call('GET', '/enquiries', { token: admin })
assert.equal(r.data.length, 1, 'honeypot submissions are dropped')
r = await call('PATCH', `/enquiries/${r.data[0].id}`, { body: { status: 'contacted' }, token: admin })
assert.equal(r.data.status, 'contacted')

r = await call('PUT', `/products/${product.id}`, { body: { hidden: true }, token: admin })
r = await call('GET', '/products')
assert.equal(r.data.length, 0, 'hidden products are not public')

r = await call('DELETE', `/products/${product.id}`, { token: admin })
assert.equal(r.status, 200)

// Starter menu: added on demand, skips names that already exist, uses static photos
r = await call('POST', '/admin/seed', { token: admin })
assert.equal(r.data.added, 11)
r = await call('POST', '/admin/seed', { token: admin })
assert.equal(r.data.added, 0, 'seeding twice adds nothing')
r = await call('GET', '/products')
assert.equal(r.data.length, 11)
assert.ok(r.data.every((p) => p.image.startsWith('/seed/')))
assert.equal(r.data[0].name, 'Ragi Almond Biscuits')
r = await call('DELETE', `/products/${r.data[0].id}`, { token: admin })
assert.equal(r.status, 200, 'deleting a starter item works (static photo is left alone)')

await server.stop()
fs.rmSync(dir, { recursive: true, force: true })
console.log('All API smoke tests passed ✔')
