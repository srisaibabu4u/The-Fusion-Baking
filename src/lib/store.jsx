import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { api, storage, tokens } from './api.js'

const ShopContext = createContext(null)
export const useShop = () => useContext(ShopContext)

export const CATEGORY_ORDER = ['Cakes', 'Cookies', 'Muffins', 'Brownies', 'Breads', 'Pastries']

const CART_KEY = 'fb.cart'

export function ShopProvider({ children }) {
  const [settings, setSettings] = useState(null)
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [customer, setCustomer] = useState(null)
  const [cart, setCart] = useState(() => {
    try { return JSON.parse(storage.get(CART_KEY) || '[]') } catch { return [] }
  })

  const refresh = useCallback(async () => {
    try {
      const [s, p] = await Promise.all([api('/settings', { as: 'none' }), api('/products', { as: 'none' })])
      setSettings(s)
      setProducts(p)
      setLoadError('')
    } catch (e) {
      setLoadError(e.message)
      setSettings((s) => s || { shopName: 'The Fusion Baking', currency: '$' })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { refresh() }, [refresh])

  useEffect(() => {
    if (!tokens.customer()) return
    api('/auth/me').then((r) => setCustomer(r.user)).catch(() => tokens.setCustomer(null))
  }, [])

  useEffect(() => { storage.set(CART_KEY, JSON.stringify(cart)) }, [cart])

  const categories = useMemo(() => {
    const set = new Set(products.map((p) => p.category).filter(Boolean))
    const ordered = CATEGORY_ORDER.filter((c) => set.has(c))
    const rest = [...set].filter((c) => !CATEGORY_ORDER.includes(c)).sort()
    return [...ordered, ...rest]
  }, [products])

  const cartApi = useMemo(() => ({
    add(product, qty = 1) {
      setCart((c) => {
        const found = c.find((i) => i.id === product.id)
        if (found) return c.map((i) => (i.id === product.id ? { ...i, qty: Math.min(50, i.qty + qty) } : i))
        return [...c, { id: product.id, name: product.name, price: product.price, image: product.image, qty }]
      })
    },
    setQty(id, qty) {
      setCart((c) => (qty <= 0 ? c.filter((i) => i.id !== id) : c.map((i) => (i.id === id ? { ...i, qty: Math.min(50, qty) } : i))))
    },
    remove(id) { setCart((c) => c.filter((i) => i.id !== id)) },
    clear() { setCart([]) },
  }), [])

  const cartCount = cart.reduce((s, i) => s + i.qty, 0)
  const cartTotal = cart.reduce((s, i) => s + (i.price || 0) * i.qty, 0)

  const signIn = (token, user) => { tokens.setCustomer(token); setCustomer(user) }
  const signOut = () => { tokens.setCustomer(null); setCustomer(null) }

  const value = {
    settings, setSettings, products, setProducts, categories, loading, loadError, refresh,
    customer, signIn, signOut,
    cart, cartCount, cartTotal, ...cartApi,
  }
  return <ShopContext.Provider value={value}>{children}</ShopContext.Provider>
}
