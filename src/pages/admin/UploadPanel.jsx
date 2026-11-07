import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../lib/api.js'
import { buildDrafts, compressImage, filesFromDrop } from '../../lib/folder.js'
import { CATEGORY_ORDER } from '../../lib/store.jsx'
import { Notice } from '../../components/ui.jsx'

const CONCURRENCY = 3

export default function UploadPanel({ reload }) {
  const folderRef = useRef()
  const filesRef = useRef()
  const [drafts, setDrafts] = useState([])
  const [skipped, setSkipped] = useState([])
  const [csvRows, setCsvRows] = useState(0)
  const [status, setStatus] = useState({}) // key -> 'uploading' | 'done' | 'updated' | error string
  const [running, setRunning] = useState(false)
  const [drag, setDrag] = useState(false)
  const [summary, setSummary] = useState('')

  const ingest = async (entries) => {
    const r = await buildDrafts(entries)
    setDrafts(r.drafts)
    setSkipped(r.skipped)
    setCsvRows(r.csvRows)
    setStatus({})
    setSummary('')
  }

  const fromInput = (e) => {
    const files = [...(e.target.files || [])]
    ingest(files.map((f) => ({ file: f, path: f.webkitRelativePath || f.name })))
    e.target.value = ''
  }

  const onDrop = async (e) => {
    e.preventDefault()
    setDrag(false)
    ingest(await filesFromDrop(e.dataTransfer))
  }

  const edit = (key, field, value) => setDrafts((ds) => ds.map((d) => (d.key === key ? { ...d, [field]: value } : d)))
  const drop = (key) => setDrafts((ds) => ds.filter((d) => d.key !== key))

  const uploadOne = async (d) => {
    setStatus((s) => ({ ...s, [d.key]: 'uploading' }))
    try {
      const blob = await compressImage(d.file)
      const q = new URLSearchParams({ name: d.name, category: d.category, filename: d.path })
      const r = await api(`/admin/upload?${q}`, {
        method: 'POST', raw: blob, as: 'admin', headers: { 'content-type': blob.type || d.file.type || 'image/jpeg' },
      })
      const patch = {}
      if (Number(d.price) > 0) patch.price = Number(d.price)
      for (const k of ['description', 'size', 'ingredients', 'tags']) if (d[k]) patch[k] = d[k]
      if (d.featured) patch.featured = true
      if (Object.keys(patch).length) await api(`/products/${r.product.id}`, { method: 'PUT', body: patch, as: 'admin' })
      setStatus((s) => ({ ...s, [d.key]: r.created ? 'done' : 'updated' }))
      return r.created ? 'created' : 'updated'
    } catch (e) {
      setStatus((s) => ({ ...s, [d.key]: e.message }))
      return 'failed'
    }
  }

  const start = async () => {
    setRunning(true)
    const queue = drafts.filter((d) => !['done', 'updated'].includes(status[d.key]))
    const counts = { created: 0, updated: 0, failed: 0 }
    const worker = async () => {
      while (queue.length) counts[await uploadOne(queue.shift())]++
    }
    await Promise.all(Array.from({ length: CONCURRENCY }, worker))
    await reload().catch(() => {})
    setRunning(false)
    setSummary(`Added ${counts.created} new item(s), updated photos on ${counts.updated}.${counts.failed ? ` ${counts.failed} failed — retry below.` : ''}`)
  }

  const done = Object.values(status).filter((s) => s === 'done' || s === 'updated').length
  const categories = [...new Set([...CATEGORY_ORDER, ...drafts.map((d) => d.category)])]

  return (
    <section>
      <header className="admin-head">
        <div>
          <h1>Upload a folder</h1>
          <p className="muted">Each photo becomes an item. Edit names, categories and prices here, or later on the Products page.</p>
        </div>
      </header>

      <div
        className={`dropzone ${drag ? 'is-drag' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
        onDragLeave={() => setDrag(false)}
        onDrop={onDrop}
      >
        <p className="dropzone-title">Drop your photo folder here</p>
        <p className="muted">or</p>
        <div className="actions center">
          <button className="btn btn-primary" onClick={() => folderRef.current.click()} disabled={running}>Choose folder</button>
          <button className="btn btn-ghost" onClick={() => filesRef.current.click()} disabled={running}>Choose photos</button>
        </div>
        <input ref={folderRef} type="file" hidden webkitdirectory="" directory="" multiple onChange={fromInput} />
        <input ref={filesRef} type="file" hidden accept="image/*,.csv" multiple onChange={fromInput} />
        <details className="tips">
          <summary>How to name your folder for the best results</summary>
          <ul>
            <li>Put photos in sub-folders named by category, e.g. <code>Cakes/</code>, <code>Cookies/</code>, <code>Breads/</code>. Without sub-folders, the category is guessed from the file name.</li>
            <li>The file name becomes the item name: <code>red-velvet-cake.jpg</code> becomes “Red Velvet Cake”.</li>
            <li>Add a price after two underscores: <code>red-velvet-cake__45.jpg</code>.</li>
            <li>Optional: include a <code>details.csv</code> with columns <code>file, name, category, price, description, size, ingredients, tags, featured</code>.</li>
            <li>Uploading a photo with the same item name again replaces that item’s photo and keeps your edits.</li>
          </ul>
        </details>
      </div>

      {skipped.length > 0 && <Notice kind="info">Skipped {skipped.length} file(s) that aren’t photos: {skipped.slice(0, 6).join(', ')}{skipped.length > 6 ? '…' : ''}</Notice>}
      {csvRows > 0 && <Notice kind="info">Read {csvRows} row(s) of details from your CSV.</Notice>}

      {drafts.length > 0 && (
        <>
          <div className="upload-bar">
            <p><strong>{drafts.length}</strong> photo(s) ready{running || done ? `, ${done} uploaded` : ''}.</p>
            <progress max={drafts.length} value={done} aria-label="Upload progress" />
            <button className="btn btn-primary" onClick={start} disabled={running || done === drafts.length}>
              {running ? 'Uploading…' : done && done < drafts.length ? 'Retry remaining' : `Upload ${drafts.length} item(s)`}
            </button>
          </div>
          {summary && <Notice kind="success">{summary} <Link to="/admin">Review items</Link></Notice>}
          <datalist id="cat-list">{categories.map((c) => <option key={c} value={c} />)}</datalist>
          <div className="draft-grid">
            {drafts.map((d) => {
              const st = status[d.key]
              const ok = st === 'done' || st === 'updated'
              return (
                <div key={d.key} className={`draft ${ok ? 'is-done' : ''}`}>
                  <img src={d.preview} alt="" />
                  <input value={d.name} onChange={(e) => edit(d.key, 'name', e.target.value)} aria-label="Item name" disabled={running || ok} />
                  <div className="draft-row">
                    <input list="cat-list" value={d.category} onChange={(e) => edit(d.key, 'category', e.target.value)} aria-label="Category" disabled={running || ok} />
                    <input type="number" min="0" step="0.01" value={d.price || ''} placeholder="Price" onChange={(e) => edit(d.key, 'price', e.target.value)} aria-label="Price" disabled={running || ok} />
                  </div>
                  <div className="draft-status">
                    {st === 'uploading' && <span>Uploading…</span>}
                    {st === 'done' && <span className="ok">Added</span>}
                    {st === 'updated' && <span className="ok">Photo updated</span>}
                    {st && !['uploading', 'done', 'updated'].includes(st) && <span className="err">{st}</span>}
                    {!st && !running && <button className="link-btn" onClick={() => drop(d.key)}>Remove</button>}
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </section>
  )
}
