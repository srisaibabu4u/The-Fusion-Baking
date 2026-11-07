import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Link, Route, Routes } from 'react-router-dom'
import { ShopProvider } from './lib/store.jsx'
import Layout from './components/Layout.jsx'
import Home, { BulkPage } from './pages/Home.jsx'
import Shop from './pages/Shop.jsx'
import Product from './pages/Product.jsx'
import { Cart, Checkout } from './pages/Cart.jsx'
import { Account, Login, Register } from './pages/Account.jsx'
import AdminLogin from './pages/admin/AdminLogin.jsx'
import Admin from './pages/admin/Admin.jsx'
import '@fontsource/jost/300.css'
import '@fontsource/jost/400.css'
import '@fontsource/jost/500.css'
import '@fontsource/cinzel/500.css'
import '@fontsource/cinzel/600.css'
import '@fontsource/mrs-saint-delafield/400.css'
import './styles.css'

function NotFound() {
  return (
    <section className="section center narrow">
      <h1 className="script-head">This page isn’t on the menu</h1>
      <p><Link to="/" className="btn btn-ghost">Go to the home page</Link></p>
    </section>
  )
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <ShopProvider>
        <Routes>
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin/*" element={<Admin />} />
          <Route element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="shop" element={<Shop />} />
            <Route path="shop/:category" element={<Shop />} />
            <Route path="product/:id" element={<Product />} />
            <Route path="bulk-orders" element={<BulkPage />} />
            <Route path="cart" element={<Cart />} />
            <Route path="checkout" element={<Checkout />} />
            <Route path="account" element={<Account />} />
            <Route path="account/login" element={<Login />} />
            <Route path="account/register" element={<Register />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </ShopProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
