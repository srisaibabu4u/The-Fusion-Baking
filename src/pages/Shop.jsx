import { useMemo, useState } from 'react'
import { NavLink, useParams } from 'react-router-dom'
import { useShop } from '../lib/store.jsx'
import { ProductCard } from '../components/ui.jsx'

export default function Shop() {
  const { category } = useParams()
  const { products, categories, loading } = useShop()
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState('featured')

  const list = useMemo(() => {
    let l = category ? products.filter((p) => p.category === category) : products
    const q = query.trim().toLowerCase()
    if (q) l = l.filter((p) => `${p.name} ${p.description} ${(p.tags || []).join(' ')}`.toLowerCase().includes(q))
    if (sort === 'price-asc') l = [...l].sort((a, b) => (a.price || 0) - (b.price || 0))
    if (sort === 'price-desc') l = [...l].sort((a, b) => (b.price || 0) - (a.price || 0))
    if (sort === 'name') l = [...l].sort((a, b) => a.name.localeCompare(b.name))
    if (sort === 'featured') l = [...l].sort((a, b) => Number(!!b.featured) - Number(!!a.featured))
    return l
  }, [products, category, query, sort])

  return (
    <section className="section shop">
      <header className="page-head">
        <h1 className="display-sm">{category || 'The whole counter'}</h1>
      </header>

      <div className="shop-bar">
        <nav className="chips" aria-label="Categories">
          <NavLink end to="/shop" className="chip">All</NavLink>
          {categories.map((c) => (
            <NavLink key={c} to={`/shop/${encodeURIComponent(c)}`} className="chip">{c}</NavLink>
          ))}
        </nav>
        <div className="shop-tools">
          <input type="search" placeholder="Search" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search products" />
          <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort">
            <option value="featured">Favourites first</option>
            <option value="name">Name</option>
            <option value="price-asc">Price, low to high</option>
            <option value="price-desc">Price, high to low</option>
          </select>
        </div>
      </div>

      {loading ? (
        <p className="muted center">Setting out the counter…</p>
      ) : list.length ? (
        <div className="product-grid">{list.map((p) => <ProductCard key={p.id} product={p} />)}</div>
      ) : (
        <p className="muted center">Nothing matches {query ? `“${query}”` : 'this category'} yet.</p>
      )}
    </section>
  )
}
