import { createContext, useContext, useEffect, useState } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { api, clearSession, hasSession } from './api'

const AuthContext = createContext(null)
const SavedContext = createContext(null)
const FAV = 'bemiyona_fav'
const CMP = 'bemiyona_cmp'

async function readList(key) {
  try {
    const rows = JSON.parse((await AsyncStorage.getItem(key)) || '[]')
    return Array.isArray(rows) ? rows : []
  } catch {
    return []
  }
}

async function writeList(key, rows) {
  await AsyncStorage.setItem(key, JSON.stringify(rows))
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [ready, setReady] = useState(false)

  async function load() {
    if (!(await hasSession())) {
      setUser(null)
      setReady(true)
      return
    }
    try {
      setUser(await api('/api/auth/me/'))
    } catch {
      await clearSession()
      setUser(null)
    } finally {
      setReady(true)
    }
  }

  useEffect(() => { load() }, [])

  async function logout() {
    await clearSession()
    setUser(null)
  }

  return <AuthContext.Provider value={{ user, setUser, ready, logout, reload: load }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}

export function SavedProvider({ children }) {
  const { user } = useAuth()
  const [favorites, setFavorites] = useState([])
  const [compare, setCompare] = useState([])

  async function hydrate() {
    const [fav, cmp] = await Promise.all([readList(FAV), readList(CMP)])
    setFavorites(fav)
    setCompare(cmp)
    if (!(await hasSession())) return
    try {
      const data = await api('/api/me/bookmarks/', {
        method: 'POST',
        body: { sync: true, favorites: fav.map((row) => row.id), compare: cmp.map((row) => row.id) },
      })
      setFavorites(data.favorites || [])
      setCompare(data.compare || [])
      await writeList(FAV, data.favorites || [])
      await writeList(CMP, data.compare || [])
    } catch {
      /* the phone list stays */
    }
  }

  useEffect(() => { hydrate() }, [user?.id])

  async function toggle(bucket, item) {
    const key = bucket === 'compare' ? CMP : FAV
    const current = bucket === 'compare' ? compare : favorites
    const set = bucket === 'compare' ? setCompare : setFavorites
    const exists = current.some((row) => row.id === item.id)
    if (!exists && bucket === 'compare' && current.length >= 4) return 'full'
    const next = exists ? current.filter((row) => row.id !== item.id) : [item, ...current]
    set(next)
    await writeList(key, next)
    if (await hasSession()) {
      api('/api/me/bookmarks/', {
        method: 'POST',
        body: { kind: bucket === 'compare' ? 'compare' : 'favorite', id: item.id, on: !exists },
      }).catch(() => {})
    }
    if (bucket !== 'compare') {
      const client = (await AsyncStorage.getItem('bemiyona_client')) || `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`
      await AsyncStorage.setItem('bemiyona_client', client)
      api(`/api/listings/${item.id}/favorite/`, { method: 'POST', body: { on: !exists, client } }).catch(() => {})
    }
    return exists ? 'off' : 'on'
  }

  return (
    <SavedContext.Provider value={{ favorites, compare, toggle }}>
      {children}
    </SavedContext.Provider>
  )
}

export function useSaved() {
  return useContext(SavedContext)
}

const PrefsContext = createContext(null)

export function PrefsProvider({ children }) {
  const [theme, setThemeState] = useState('light')
  const [showPrices, setShowPricesState] = useState(true)
  const [notifyPush, setNotifyPush] = useState(true)
  const [notifyChat, setNotifyChat] = useState(true)

  useEffect(() => {
    AsyncStorage.multiGet(['bemiyona_theme', 'bemiyona_show_prices', 'bemiyona_notify_push', 'bemiyona_notify_chat']).then((rows) => {
      const map = Object.fromEntries(rows)
      if (map.bemiyona_theme === 'dark' || map.bemiyona_theme === 'light') setThemeState(map.bemiyona_theme)
      if (map.bemiyona_show_prices === '0') setShowPricesState(false)
      if (map.bemiyona_notify_push === '0') setNotifyPush(false)
      if (map.bemiyona_notify_chat === '0') setNotifyChat(false)
    }).catch(() => {})
  }, [])

  function setTheme(value) {
    const next = value === 'dark' ? 'dark' : 'light'
    setThemeState(next)
    AsyncStorage.setItem('bemiyona_theme', next).catch(() => {})
  }
  function setShowPrices(value) {
    setShowPricesState(value)
    AsyncStorage.setItem('bemiyona_show_prices', value ? '1' : '0').catch(() => {})
  }
  function setFlag(key, setter, value) {
    setter(value)
    AsyncStorage.setItem(key, value ? '1' : '0').catch(() => {})
  }

  return (
    <PrefsContext.Provider value={{
      theme, setTheme, showPrices, setShowPrices, notifyPush, notifyChat,
      setNotifyPush: (value) => setFlag('bemiyona_notify_push', setNotifyPush, value),
      setNotifyChat: (value) => setFlag('bemiyona_notify_chat', setNotifyChat, value),
    }}>
      {children}
    </PrefsContext.Provider>
  )
}

export function usePrefs() {
  return useContext(PrefsContext)
}

const MenuContext = createContext({ open: false, setOpen: () => {} })

export function MenuProvider({ children }) {
  const [open, setOpen] = useState(false)
  return <MenuContext.Provider value={{ open, setOpen }}>{children}</MenuContext.Provider>
}

export function useMenu() {
  return useContext(MenuContext)
}

export function palette(theme) {
  if (theme !== 'dark') return null
  return {
    navy: '#1f3b5c',
    navy900: '#14283d',
    ink: '#e8eef5',
    muted: '#a9b8c8',
    line: '#4a6278',
    paper: '#101820',
    white: '#324860',
    gold: '#d7b56d',
    bad: '#f0b4b4',
    header: 'rgba(16,24,32,0.92)',
    tab: 'rgba(16,24,32,0.96)',
  }
}
