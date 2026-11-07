// Turns a dropped/selected folder of images into product drafts.
//
// Folder conventions (all optional):
//   MyBakery/Cakes/chocolate-truffle-cake.jpg      → name "Chocolate Truffle Cake", category "Cakes"
//   MyBakery/red-velvet-cupcake__4.50.jpg           → price 4.50, category guessed from the name
//   MyBakery/details.csv                            → extra details per image (see README)

const IMAGE_RE = /\.(jpe?g|png|webp|gif|avif)$/i

const CATEGORY_WORDS = [
  ['Cakes', /\b(cakes?|gateau|cheesecake|tiramisu)\b/i],
  ['Muffins', /\b(muffins?|cupcakes?)\b/i],
  ['Cookies', /\b(cookies?|biscuits?|macarons?|shortbread)\b/i],
  ['Brownies', /\b(brownies?|blondies?)\b/i],
  ['Breads', /\b(breads?|loaf|loaves|sourdough|baguette|buns?|focaccia|brioche|rolls?)\b/i],
  ['Pastries', /\b(pastry|pastries|croissants?|tarts?|danish|eclairs?|puffs?)\b/i],
]

const titleCase = (s) =>
  s.replace(/[_\-.]+/g, ' ').replace(/\s+/g, ' ').trim()
    .replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())

export function normaliseCategory(folder) {
  if (!folder) return ''
  for (const [cat, re] of CATEGORY_WORDS) if (re.test(folder.replace(/[_-]/g, ' '))) return cat
  return titleCase(folder)
}

export function guessCategory(name) {
  for (const [cat, re] of CATEGORY_WORDS) if (re.test(name)) return cat
  return 'Uncategorised'
}

export function parseFileName(fileName) {
  const base = fileName.replace(/\.[^.]+$/, '')
  const m = base.match(/^(.*?)(?:__|\s+-\s+|_\$|\s\$)(\d+(?:\.\d{1,2})?)$/)
  const rawName = m ? m[1] : base
  return { name: titleCase(rawName.replace(/^\d+[\s._-]+/, '')) || titleCase(rawName), price: m ? Number(m[2]) : 0 }
}

// Minimal CSV parser (handles quotes, commas and newlines inside quotes)
export function parseCsv(text) {
  const rows = []
  let row = [], cell = '', q = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (q) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++ }
      else if (c === '"') q = false
      else cell += c
    } else if (c === '"') q = true
    else if (c === ',') { row.push(cell); cell = '' }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++
      row.push(cell); rows.push(row); row = []; cell = ''
    } else cell += c
  }
  if (cell || row.length) { row.push(cell); rows.push(row) }
  const [head, ...body] = rows.filter((r) => r.some((x) => x.trim()))
  if (!head) return []
  const keys = head.map((h) => h.trim().toLowerCase())
  return body.map((r) => Object.fromEntries(keys.map((k, i) => [k, (r[i] ?? '').trim()])))
}

// Recursively read a dropped DataTransfer into File objects with relative paths
export async function filesFromDrop(dataTransfer) {
  const items = [...(dataTransfer.items || [])]
  const entries = items.map((i) => i.webkitGetAsEntry?.()).filter(Boolean)
  if (!entries.length) return [...(dataTransfer.files || [])].map((f) => ({ file: f, path: f.name }))
  const out = []
  const walk = async (entry, prefix) => {
    if (entry.isFile) {
      const file = await new Promise((ok, no) => entry.file(ok, no))
      out.push({ file, path: `${prefix}${file.name}` })
    } else if (entry.isDirectory) {
      const reader = entry.createReader()
      let batch
      do {
        batch = await new Promise((ok, no) => reader.readEntries(ok, no))
        for (const e of batch) await walk(e, `${prefix}${entry.name}/`)
      } while (batch.length)
    }
  }
  for (const e of entries) await walk(e, '')
  return out
}

export async function buildDrafts(fileEntries) {
  const csvEntry = fileEntries.find((f) => /\.csv$/i.test(f.path))
  let rows = []
  if (csvEntry) rows = parseCsv(await csvEntry.file.text())
  const byFile = new Map(rows.filter((r) => r.file).map((r) => [r.file.toLowerCase(), r]))
  const byName = new Map(rows.filter((r) => r.name).map((r) => [r.name.toLowerCase(), r]))

  const skipped = []
  const drafts = []
  for (const { file, path } of fileEntries) {
    if (/\.csv$/i.test(path) || file.name.startsWith('.')) continue
    if (!IMAGE_RE.test(file.name)) {
      if (/\.(heic|heif)$/i.test(file.name)) skipped.push(`${file.name} (HEIC — export as JPEG first)`)
      else skipped.push(file.name)
      continue
    }
    const parts = path.split('/').filter(Boolean)
    const folder = parts.length >= 3 ? parts[parts.length - 2] : ''
    const parsed = parseFileName(file.name)
    const row = byFile.get(file.name.toLowerCase()) || byName.get(parsed.name.toLowerCase()) || {}
    const name = row.name || parsed.name
    drafts.push({
      key: path,
      file,
      path,
      preview: URL.createObjectURL(file),
      name,
      category: normaliseCategory(row.category) || normaliseCategory(folder) || guessCategory(name),
      price: row.price ? Number(row.price) || 0 : parsed.price,
      description: row.description || '',
      size: row.size || '',
      ingredients: row.ingredients || '',
      tags: row.tags || '',
      featured: /^(y|yes|true|1)$/i.test(row.featured || ''),
    })
  }
  return { drafts, skipped, csvRows: rows.length }
}

// Downscale + compress in the browser so uploads stay small and fast
export async function compressImage(file, maxSide = 1600, quality = 0.85) {
  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
    const w = Math.round(bitmap.width * scale)
    const h = Math.round(bitmap.height * scale)
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    canvas.getContext('2d').drawImage(bitmap, 0, 0, w, h)
    bitmap.close?.()
    const toBlob = (type) => new Promise((ok) => canvas.toBlob(ok, type, quality))
    let blob = await toBlob('image/webp')
    if (!blob || blob.type !== 'image/webp') blob = await toBlob('image/jpeg')
    if (blob && (blob.size < file.size || file.size > 4.5 * 1024 * 1024)) return blob
    return file
  } catch {
    return file
  }
}
