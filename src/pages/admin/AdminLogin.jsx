import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api, imageUrl, tokens } from '../../lib/api.js'
import { Notice, PasswordField } from '../../components/ui.jsx'
import { useShop } from '../../lib/store.jsx'

export default function AdminLogin() {
  const { settings } = useShop()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true); setError('')
    try {
      const r = await api('/auth/admin', { method: 'POST', body: { password }, as: 'none' })
      tokens.setAdmin(r.token)
      navigate('/admin')
    } catch (err) { setError(err.message) } finally { setBusy(false) }
  }

  return (
    <div className="admin-login">
      <form className="admin-login-card" onSubmit={submit}>
        <img className="admin-login-logo" alt=""
          src={!settings?.logo || settings.logo === '/brand/logo-apron.png' ? '/brand/logo-badge.png' : imageUrl(settings.logo)} />
        <h1>{settings?.shopName || 'The Fusion Baking'}</h1>
        <p className="muted">Admin sign in</p>
        <PasswordField id="admin-pass" label="Admin password" value={password} onChange={setPassword} autoFocus />
        <Notice>{error}</Notice>
        <button className="btn btn-primary btn-block" disabled={busy || !password}>{busy ? 'Checking…' : 'Sign in'}</button>
        <p className="small center"><Link to="/">Back to the shop</Link></p>
      </form>
    </div>
  )
}
