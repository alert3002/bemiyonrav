import AsyncStorage from '@react-native-async-storage/async-storage'

export const SITE = 'https://bemiyonrav.tj'
const ACCESS = 'bemiyona_access'
const REFRESH = 'bemiyona_refresh'

export class ApiError extends Error {
  constructor(status, body) {
    super(body?.code || body?.detail || 'error')
    this.status = status
    this.body = body || {}
    this.code = body?.code || body?.detail || 'error'
  }
}

async function read(res) {
  const text = await res.text()
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return { detail: text }
  }
}

export async function saveSession(data) {
  await AsyncStorage.setItem(ACCESS, data.access)
  await AsyncStorage.setItem(REFRESH, data.refresh)
}

export async function clearSession() {
  await AsyncStorage.multiRemove([ACCESS, REFRESH])
}

export async function hasSession() {
  return Boolean(await AsyncStorage.getItem(ACCESS))
}

async function refreshToken() {
  const refresh = await AsyncStorage.getItem(REFRESH)
  if (!refresh) return false
  const res = await fetch(`${SITE}/api/auth/refresh/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh }),
  })
  if (!res.ok) {
    await clearSession()
    return false
  }
  const data = await res.json()
  await AsyncStorage.setItem(ACCESS, data.access)
  if (data.refresh) await AsyncStorage.setItem(REFRESH, data.refresh)
  return true
}

function skipRefresh(path) {
  return /\/auth\/(refresh|request-code|verify)\//.test(path)
}

function sendXhr(url, method, headers, body) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open(method, url)
    Object.entries(headers).forEach(([key, value]) => xhr.setRequestHeader(key, value))
    xhr.onload = () => resolve({
      status: xhr.status,
      ok: xhr.status >= 200 && xhr.status < 300,
      text: async () => xhr.responseText || '',
    })
    xhr.onerror = () => reject(new TypeError('Network request failed'))
    xhr.send(body)
  })
}

export async function api(path, { method = 'GET', body, form, auth = true, retry = true } = {}) {
  const headers = { Accept: 'application/json' }
  const token = auth ? await AsyncStorage.getItem(ACCESS) : null
  if (token) headers.Authorization = `Bearer ${token}`
  let payload
  if (form) payload = form
  else if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
    payload = JSON.stringify(body)
  }
  const url = `${SITE}${path}`
  const res = form && (method === 'PATCH' || method === 'PUT')
    ? await sendXhr(url, method, headers, payload)
    : await fetch(url, { method, headers, body: payload })
  if (res.status === 401 && auth && retry && !skipRefresh(path)) {
    const ok = await refreshToken()
    if (ok) return api(path, { method, body, form, auth, retry: false })
  }
  const data = await read(res)
  if (!res.ok) throw new ApiError(res.status, data)
  return data
}

export function media(url) {
  if (!url) return null
  const value = String(url)
  if (value.startsWith('http')) return value
  return `${SITE}${value.startsWith('/') ? '' : '/'}${value}`
}
