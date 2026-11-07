import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, formatPrice, imageUrl } from '../../lib/api.js'
import { compressImage } from '../../lib/folder.js'
import { CATEGORY_ORDER, useShop } from '../../lib/store.jsx'
import { Field, Notice } from '../../components/ui.jsx'

const BLANK = { name: '', category: 'Cakes', price: 0, description: '', ingredients: '', size: '', tags: [], featured: false, available: true, hidden: false }

export default function ProductsPanel({ products, reload }) {
  const { settings } = useShop()
  const [editing, setEditing] = useState(null)
  const [query, setQuery] = useState('')
  const [cat, setCat] = useState('')
  const [selected, setSelected] = useState(new Set())
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')

  const categories = useMemo(() => {
    const s = new Set([...CATEGORY_ORDER, ...products.map((p) => p.category)])
    return [...s].filter(Boolean)
  }, [products])

  const list = products.filter((p) =>
    (!cat || p.category === cat) && (!query || p.name.toLowerCase().includes(query.toLowerCase())))

  const toggle = (id) => setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })
  const allSelected = list.length > 0 && list.every((p) => selected.has(p.id))

  const quick = async (p, patch) => {
    setError('')
    try { await api(`/products/${p.id}`, { method: 'PUT', body: patch, as: 'admin' }); await reload() }
    catch (e) { setError(e.message) }
  }

  const bulk = async (action, value) => {
    if (!selected.size) return
    if (action === 'delete' && !window.confirm(`Delete ${selected.size} item(s)? This also removes their photos.`)) return
    setError('')
    try {
      const r = await api('/admin/products/bulk', { method: 'POST', body: { ids: [...selected], action, value }, as: 'admin' })
      setSelected(new Set())
      setMsg(`Updated ${r.count} item(s).`)
      await reload()
    } catch (e) { setError(e.message) }
  }

  return (
    <section>
      <header className="admin-head">
        <div>
          <h1>Products</h1>
          <p className="muted">{products.length} items. Click an item to edit its details.</p>
        </div>
        <div className="actions">
          <Link to="/admin/upload" className="btn btn-ghost">Upload folder</Link>
          <button className="btn btn-primary" onClick={() => setEditing({ ...BLANK })}>Add item</button>
        </div>
      </header>

      <div className="admin-toolbar">
        <input type="search" placeholder="Search items" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search items" />
        <select value={cat} onChange={(e) => setCat(e.target.value)} aria-label="Filter by category">
          <option value="">All categories</option>
          {categories.map((c) => <option key={c}>{c}</option>)}
        </select>
        {selected.size > 0 && (
          <div className="bulk">
            <span>{selected.size} selected</span>
            <select defaultValue="" onChange={(e) => { if (e.target.value) bulk('category', e.target.value); e.target.value = '' }} aria-label="Move to category">
              <option value="">Move to…</option>
              {categories.map((c) => <option key={c}>{c}</option>)}
            </select>
            <button className="btn btn-small" onClick={() => bulk('available', true)}>In stock</button>
            <button className="btn btn-small" onClick={() => bulk('available', false)}>Sold out</button>
            <button className="btn btn-small" onClick={() => bulk('hidden', true)}>Hide</button>
            <button className="btn btn-small" onClick={() => bulk('hidden', false)}>Show</button>
            <button className="btn btn-small btn-danger" onClick={() => bulk('delete')}>Delete</button>
          </div>
        )}
      </div>
      <Notice kind="success">{msg}</Notice>
      <Notice>{error}</Notice>

      {list.length === 0 ? (
        <div className="empty">
          <p>No items yet. Upload a folder of photos and each photo becomes an item you can edit.</p>
          <Link to="/admin/upload" className="btn btn-primary">Upload folder</Link>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th><input type="checkbox" checked={allSelected} onChange={() => setSelected(allSelected ? new Set() : new Set(list.map((p) => p.id)))} aria-label="Select all" /></th>
                <th>Item</th><th>Category</th><th>Price</th><th>In stock</th><th>Favourite</th><th>Visible</th>
              </tr>
            </thead>
            <tbody>
              {list.map((p) => (
                <tr key={p.id} className={p.hidden ? 'row-hidden' : ''}>
                  <td><input type="checkbox" checked={selected.has(p.id)} onChange={() => toggle(p.id)} aria-label={`Select ${p.name}`} /></td>
                  <td>
                    <button className="item-cell" onClick={() => setEditing(p)}>
                      {p.image ? <img src={imageUrl(p.image)} alt="" /> : <span className="thumb-empty" />}
                      <span>{p.name}</span>
                    </button>
                  </td>
                  <td>{p.category}</td>
                  <td>{p.price ? formatPrice(p.price, settings?.currency) : <span className="warn">Set price</span>}</td>
                  <td><input type="checkbox" checked={p.available !== false} onChange={(e) => quick(p, { available: e.target.checked })} aria-label="In stock" /></td>
                  <td><input type="checkbox" checked={!!p.featured} onChange={(e) => quick(p, { featured: e.target.checked })} aria-label="Favourite" /></td>
                  <td><input type="checkbox" checked={!p.hidden} onChange={(e) => quick(p, { hidden: !e.target.checked })} aria-label="Visible" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <ProductEditor
          product={editing}
          categories={categories}
          onClose={() => setEditing(null)}
          onSaved={async (text) => { setEditing(null); setMsg(text); await reload() }}
        />
      )}
    </section>
  )
}

function ProductEditor({ product, categories, onClose, onSaved }) {
  const isNew = !product.id
  const [p, setP] = useState({ ...product, tags: (product.tags || []).join(', ') })
  const [newCat, setNewCat] = useState(false)
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(imageUrl(product.image))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef()
  const set = (k) => (e) => setP((x) => ({ ...x, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))

  const pick = (e) => {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f)
    setPreview(URL.createObjectURL(f))
  }

  const save = async (e) => {
    e.preventDefault()
    setBusy(true); setError('')
    try {
      const body = { ...p, price: Number(p.price) || 0 }
      const saved = isNew
        ? await api('/products', { method: 'POST', body, as: 'admin' })
        : await api(`/products/${p.id}`, { method: 'PUT', body, as: 'admin' })
      if (file) {
        const blob = await compressImage(file)
        await api(`/admin/upload?productId=${saved.id}`, { method: 'POST', raw: blob, as: 'admin', headers: { 'content-type': blob.type || 'image/jpeg' } })
      }
      await onSaved(isNew ? `Added ${saved.name}.` : `Saved ${saved.name}.`)
    } catch (err) { setError(err.message) } finally { setBusy(false) }
  }

  const remove = async () => {
    if (!window.confirm(`Delete ${p.name}? This also removes its photo.`)) return
    setBusy(true)
    try { await api(`/products/${p.id}`, { method: 'DELETE', as: 'admin' }); await onSaved(`Deleted ${p.name}.`) }
    catch (err) { setError(err.message); setBusy(false) }
  }

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form className="modal" onSubmit={save} role="dialog" aria-modal="true" aria-labelledby="editor-title">
        <header className="modal-head">
          <h2 id="editor-title">{isNew ? 'Add item' : 'Edit item'}</h2>
          <button type="button" className="link-btn" onClick={onClose}>Close</button>
        </header>
        <div className="editor-grid">
          <div className="editor-photo">
            <div className="arch arch-editor">
              {preview ? <img src={preview} alt="" /> : <div className="arch-placeholder"><span>{(p.name || 'F').charAt(0)}</span></div>}
            </div>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={pick} />
            <button type="button" className="btn btn-ghost btn-block" onClick={() => fileRef.current.click()}>
              {preview ? 'Replace photo' : 'Add photo'}
            </button>
          </div>
          <div className="editor-fields">
            <Field label="Name" id="e-name" value={p.name} onChange={set('name')} required />
            <div className="field-row">
              <div className="field">
                <label htmlFor="e-cat">Category</label>
                {newCat ? (
                  <input id="e-cat" value={p.category} onChange={set('category')} placeholder="e.g. Tarts" required />
                ) : (
                  <select id="e-cat" value={p.category} onChange={(e) => e.target.value === '__new' ? (setNewCat(true), setP((x) => ({ ...x, category: '' }))) : set('category')(e)}>
                    {categories.map((c) => <option key={c}>{c}</option>)}
                    <option value="__new">New category…</option>
                  </select>
                )}
              </div>
              <Field label={`Price`} id="e-price" type="number" min="0" step="0.01" value={p.price} onChange={set('price')} hint="0 shows “Price on request”." />
            </div>
            <Field as="textarea" rows={4} label="Description" id="e-desc" value={p.description || ''} onChange={set('description')} />
            <div className="field-row">
              <Field label="Size or weight" id="e-size" value={p.size || ''} onChange={set('size')} placeholder="e.g. 1 kg, serves 8" />
              <Field label="Labels" id="e-tags" value={p.tags} onChange={set('tags')} placeholder="Eggless, Bestseller" hint="Separate with commas." />
            </div>
            <Field as="textarea" rows={2} label="Ingredients and allergens" id="e-ing" value={p.ingredients || ''} onChange={set('ingredients')} />
            <div className="checks">
              <label><input type="checkbox" checked={p.available !== false} onChange={set('available')} /> In stock</label>
              <label><input type="checkbox" checked={!!p.featured} onChange={set('featured')} /> Show on home page</label>
              <label><input type="checkbox" checked={!!p.hidden} onChange={set('hidden')} /> Hide from shop</label>
            </div>
          </div>
        </div>
        <Notice>{error}</Notice>
        <footer className="modal-foot">
          {!isNew && <button type="button" className="btn btn-danger" onClick={remove} disabled={busy}>Delete</button>}
          <span className="spacer" />
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : isNew ? 'Add item' : 'Save changes'}</button>
        </footer>
      </form>
    </div>
  )
}
