// Serves the built site (dist/) and the API function with a local Blobs store.
// Handy for testing without the Netlify CLI:  npm run build && node scripts/local-server.mjs
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { BlobsServer } from '@netlify/blobs/server'
import { setEnvironmentContext } from '@netlify/blobs'

const root = path.resolve('dist')
const dataDir = path.resolve('.netlify/local-blobs')
fs.mkdirSync(dataDir, { recursive: true })
const blobs = new BlobsServer({ directory: dataDir, port: 8971, token: 'local' })
await blobs.start()
setEnvironmentContext({ edgeURL: 'http://localhost:8971', uncachedEdgeURL: 'http://localhost:8971', siteID: 'local', token: 'local' })
process.env.ADMIN_PASSWORD ||= 'admin12345'
const { default: api } = await import('../netlify/functions/api.mjs')

const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png' }

http.createServer(async (req, res) => {
  if (req.url.startsWith('/api/')) {
    const chunks = []
    for await (const c of req) chunks.push(c)
    const body = chunks.length ? Buffer.concat(chunks) : undefined
    const r = await api(new Request(`http://localhost${req.url}`, { method: req.method, headers: req.headers, body: ['GET', 'HEAD'].includes(req.method) ? undefined : body }))
    res.writeHead(r.status, Object.fromEntries(r.headers))
    res.end(Buffer.from(await r.arrayBuffer()))
    return
  }
  let file = path.join(root, decodeURIComponent(req.url.split('?')[0]))
  if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(root, 'index.html')
  res.writeHead(200, { 'content-type': types[path.extname(file)] || 'application/octet-stream' })
  fs.createReadStream(file).pipe(res)
}).listen(process.env.PORT || 4321, () => console.log(`Local site on http://localhost:${process.env.PORT || 4321} (admin password: ${process.env.ADMIN_PASSWORD})`))
