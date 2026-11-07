import { useCallback, useEffect, useState } from 'react'
import { Link, Navigate, NavLink, Route, Routes, useNavigate } from 'react-router-dom'
import { api, tokens } from '../../lib/api.js'
import { useShop } from '../../lib/store.jsx'
import ProductsPanel from './ProductsPanel.jsx'
import UploadPanel from './UploadPanel.jsx'
import OrdersPanel from './OrdersPanel.jsx'
import { CustomersPanel, SettingsPanel } from './MiscPanels.jsx'

export default function Admin() {
  const navigate = useNavigate()
  const { refresh: refreshShop, settings } = useShop()
  const [state, setState] = useState(tokens.admin() ? 'checking' : 'out')
  const [products, setProducts] = useState([])

  useEffect(() => {
    if (state !== 'checking') return
    api('/auth/me', { as: 'admin' })
      .then((r) => setState(r.role === 'admin' ? 'in' : 'out'))
      .catch(() => { tokens.setAdmin(null); setState('out') })
  }, [state])

  const load = useCallback(async () => {
    const list = await api('/products', { as: 'admin' })
    setProducts(list)
    refreshShop()
    return list
  }, [refreshShop])

  useEffect(() => { if (state === 'in') load().catch(() => {}) }, [state, load])

  if (state === 'out') return <Navigate to="/admin/login" replace />
  if (state === 'checking') return <p className="section muted center">Checking your session…</p>

  const signOut = () => { tokens.setAdmin(null); navigate('/admin/login') }

  return (
    <div className="admin">
      <aside className="admin-side">
        <Link to="/" className="admin-brand">{settings?.shopName || 'The Fusion Baking'}</Link>
        <nav aria-label="Admin">
          <NavLink end to="/admin">Products</NavLink>
          <NavLink to="/admin/upload">Upload folder</NavLink>
          <NavLink to="/admin/orders">Orders &amp; enquiries</NavLink>
          <NavLink to="/admin/customers">Customers</NavLink>
          <NavLink to="/admin/settings">Shop settings</NavLink>
        </nav>
        <div className="admin-side-foot">
          <Link to="/" target="_blank" rel="noreferrer">View shop</Link>
          <button className="link-btn" onClick={signOut}>Sign out</button>
        </div>
      </aside>
      <div className="admin-main">
        <Routes>
          <Route index element={<ProductsPanel products={products} reload={load} />} />
          <Route path="upload" element={<UploadPanel reload={load} />} />
          <Route path="orders" element={<OrdersPanel />} />
          <Route path="customers" element={<CustomersPanel />} />
          <Route path="settings" element={<SettingsPanel />} />
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Routes>
      </div>
    </div>
  )
}
