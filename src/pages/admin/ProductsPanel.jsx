import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, imageUrl, money } from '../../lib/api.js'
import { compressImage } from '../../lib/folder.js'
import { CATEGORY_ORDER, useShop } from '../../lib/store.jsx'
import { DietMarks, Field, Notice } from '../../components/ui.jsx'

const BLANK = {
  name: '', category: 'Cakes', tagline: '', classicPrice: 0, nutritiousPrice: 0, offerClassic: true, offerNutritious: false,
  nutritiousNote: '', diet: 'both', description: '', ingredients: '', size: '', tags: [], featured: false, available: true, hidden: false,
}

export default function ProductsPanel({ products, reload }) {
  const { settings } = useShop()
  const cur = settings?.currency || '₹'
  const [editing, setEditing] = useState(null)
  const [query, setQuery] = useState('')
  const [cat, setCat] = useState('')
  const [selected, setSelected] = useState(new Set())
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')

  const categories = useMemo(() => [...new Set([...CATEGORY_ORDER, ...products.map((p) => p.category)])].filter(Boolean), [products])
  const list = products.filter((p) => (!cat || p.category === cat) && (!query || p.name.toLowerCase().includes(query.toLowerCase())))

  const toggle = (id) => setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })
  const allSelected = list.length > 0 && list.every((p) => selected.has(p.id))

  const quick = async (p, patch) => {
    setError('')
    try { await api(`/products/${p.id}`, { method: 'PUT', body: patch, as: 'admin' }); await reload() } catch (e) { setError(e.message) }
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

  const loadStarter = async () => {
    setError(''); setMsg('')
    try {
      const r = await api('/admin/seed', { method: 'POST', as: 'admin' })
      setMsg(r.added ? `Added ${r.added} starter item(s). Set their prices next.` : 'Every starter item is already in your shop.')
      await reload()
    } catch (e) { setError(e.message) }
  }

  const priceCell = (p) => {
    const parts = []
    if (p.offerClassic !== false) parts.push(['Classic', p.classicPrice])
    if (p.offerNutritious) parts.push(['Nutritious', p.nutritiousPrice])
    if (!parts.some(([, v]) => v > 0)) return <span className="warn">Set price</span>
    return parts.map(([k, v]) => <span key={k}>{v ? money(v, cur) : '—'} <small>{k}</small></span>)
  }

  return (
    <section>
      <header className="admin-head">
        <div>
          <h1>Products</h1>
          <p className="muted">
            {products.length} items. Click an item to edit its details.
            {products.some((p) => !p.price) && <> {products.filter((p) => !p.price).length} still need a price.</>}
          </p>
        </div>
        <div className="actions">
          <button className="btn btn-ghost" onClick={loadStarter} title="Adds any starter items missing from your shop">Load starter menu</button>
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
            <select defaultValue="" onChange={(e) => { if (e.target.value) bulk('diet', e.target.value); e.target.value = '' }} aria-label="Set eggless or egg">
              <option value="">Egg mark…</option>
              <option value="eggless">Eggless</option>
              <option value="egg">With egg</option>
              <option value="both">Both</option>
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
          <p>No items yet. Upload a folder of photos and each photo becomes an item you can edit, or start from the starter menu of 13 bakes.</p>
          <div className="actions center">
            <Link to="/admin/upload" className="btn btn-primary">Upload folder</Link>
            <button className="btn btn-ghost" onClick={loadStarter}>Load starter menu</button>
          </div>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th><input type="checkbox" checked={allSelected} onChange={() => setSelected(allSelected ? new Set() : new Set(list.map((p) => p.id)))} aria-label="Select all" /></th>
                <th>Item</th><th className="hide-sm">Category</th><th>Price</th><th className="hide-sm">Egg</th><th>In stock</th><th className="hide-sm">Favourite</th><th className="hide-sm">Visible</th>
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
                  <td className="hide-sm">{p.category}</td>
                  <td className="price-cell">{priceCell(p)}</td>
                  <td className="hide-sm"><DietMarks diet={p.diet} /></td>
                  <td><input type="checkbox" checked={p.available !== false} onChange={(e) => quick(p, { available: e.target.checked })} aria-label="In stock" /></td>
                  <td className="hide-sm"><input type="checkbox" checked={!!p.featured} onChange={(e) => quick(p, { featured: e.target.checked })} aria-label="Favourite" /></td>
                  <td className="hide-sm"><input type="checkbox" checked={!p.hidden} onChange={(e) => quick(p, { hidden: !e.target.checked })} aria-label="Visible" /></td>
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
          currency={cur}
          onClose={() => setEditing(null)}
          onSaved={async (text) => { setEditing(null); setMsg(text); await reload() }}
        />
      )}
    </section>
  )
}

function ProductEditor({ product, categories, currency, onClose, onSaved }) {
  const isNew = !product.id
  const [p, setP] = useState({ ...BLANK, ...product, tags: (product.tags || []).join(', ') })
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
    if (!p.offerClassic && !p.offerNutritious) return setError('Offer at least one version: Classic or Nutritious.')
    setBusy(true); setError('')
    try {
      const body = { ...p, classicPrice: Number(p.classicPrice) || 0, nutritiousPrice: Number(p.nutritiousPrice) || 0 }
      delete body.price
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
            <figure className="polaroid">
              <div className="polaroid-img">
                {preview ? <img src={preview} alt="" /> : <div className="photo-placeholder"><span>{(p.name || 'F').charAt(0)}</span></div>}
              </div>
            </figure>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={pick} />
            <button type="button" className="btn btn-ghost btn-block" onClick={() => fileRef.current.click()}>{preview ? 'Replace photo' : 'Add photo'}</button>
          </div>
          <div>
            <div className="field-row">
              <Field label="Name" id="e-name" value={p.name} onChange={set('name')} required />
              <div className="field">
                <label htmlFor="e-cat">Category</label>
                {newCat ? (
                  <input id="e-cat" value={p.category} onChange={set('category')} placeholder="e.g. Tarts" required />
                ) : (
                  <select id="e-cat" value={p.category} onChange={(e) => (e.target.value === '__new' ? (setNewCat(true), setP((x) => ({ ...x, category: '' }))) : set('category')(e))}>
                    {categories.map((c) => <option key={c}>{c}</option>)}
                    <option value="__new">New category…</option>
                  </select>
                )}
              </div>
            </div>
            <Field label="Tagline" id="e-tagline" value={p.tagline} onChange={set('tagline')} placeholder="e.g. Healthy made simple" hint="Short line shown in gold under the name." maxLength={80} />

            <fieldset className="editor-section">
              <legend>Versions and prices ({currency})</legend>
              <div className="variant-row">
                <label className="toggle"><input type="checkbox" checked={p.offerClassic} onChange={set('offerClassic')} /> Classic</label>
                <Field label="Price" id="e-cprice" type="number" min="0" step="1" value={p.classicPrice} onChange={set('classicPrice')} disabled={!p.offerClassic} />
                <span />
              </div>
              <div className="variant-row">
                <label className="toggle"><input type="checkbox" checked={p.offerNutritious} onChange={set('offerNutritious')} /> Nutritious</label>
                <Field label="Price" id="e-nprice" type="number" min="0" step="1" value={p.nutritiousPrice} onChange={set('nutritiousPrice')} disabled={!p.offerNutritious} />
                <Field label="What makes it nutritious" id="e-nnote" value={p.nutritiousNote} onChange={set('nutritiousNote')} disabled={!p.offerNutritious} placeholder="Whole wheat, ragi & jaggery" />
              </div>
              <p className="hint">A price of 0 shows “Price on request”.</p>
            </fieldset>

            <fieldset className="editor-section">
              <legend>Eggless or egg</legend>
              <div className="radio-row">
                {[['eggless', 'Eggless only'], ['egg', 'Contains egg'], ['both', 'Customer chooses']].map(([v, l]) => (
                  <label key={v}><input type="radio" name="diet" value={v} checked={p.diet === v} onChange={set('diet')} /> <DietMarks diet={v} /> {l}</label>
                ))}
              </div>
            </fieldset>

            <Field as="textarea" rows={3} label="Description" id="e-desc" value={p.description || ''} onChange={set('description')} />
            <div className="field-row">
              <Field label="Size or weight" id="e-size" value={p.size || ''} onChange={set('size')} placeholder="e.g. 500 g, serves 6" />
              <Field label="Labels" id="e-tags" value={p.tags} onChange={set('tags')} placeholder="Bestseller, Festive" hint="Separate with commas." />
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
