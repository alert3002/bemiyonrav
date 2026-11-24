import { useEffect, useRef, useState } from 'react'
import { Image, Linking, Pressable, Share, Switch, Text, TextInput, View } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import * as ImagePicker from 'expo-image-picker'
import { api, media, SITE } from '../api'
import { money, pick, postedWhen } from '../format'
import { errorText, useI18n } from '../i18n'
import { SvgUri } from 'react-native-svg'
import { Icon } from '../icons'
import { useAuth, usePrefs } from '../state'
import { Btn, Field, Screen, colors, useColors } from '../ui'

const PAY_MAIN = [
  { id: 'amonat', label: 'Амонат Мобайл', logo: '/banks/1.svg' },
  { id: 'alif', label: 'Alif Mobi', logo: '/banks/2.svg' },
  { id: 'eskhata', label: 'Эсхата', logo: '/banks/3.svg' },
  { id: 'ibt', label: 'IBT24', logo: '/banks/4.svg' },
  { id: 'dc', label: 'DC Next', logo: '/banks/5.svg' },
  { id: 'icb', label: 'ICB', logo: '/banks/6.svg' },
  { id: 'orien', label: 'Ориёнбонк', logo: '/banks/7.svg' },
  { id: 'arvand', label: 'Арванд', logo: '/banks/8.svg' },
  { id: 'ssb', label: 'ССБ Мобайл', logo: '/banks/9.svg' },
  { id: 'humo', label: 'Humo Online', logo: '/banks/10.png' },
]

function PayMark({ logo }) {
  const uri = `${SITE}${logo}`
  return (
    <View style={{ width: 46, height: 46, borderRadius: 12, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
      {logo.endsWith('.png') ? (
        <Image source={{ uri }} style={{ width: 46, height: 46 }} resizeMode="contain" />
      ) : (
        <SvgUri width={46} height={46} uri={uri} />
      )}
    </View>
  )
}

function coverOf(item) {
  const photo = item.photos?.[0]
  const url = item.cover || (typeof photo === 'string' ? photo : photo?.url)
  return url ? media(url) : ''
}

export function CabinetScreen({ navigation }) {
  const { t, lang } = useI18n()
  const { user, logout } = useAuth()
  const c = useColors()
  const dark = usePrefs().theme === 'dark'
  const ink = dark ? '#e8eef5' : '#1b2a3a'
  const card = dark ? '#324860' : '#fff'
  const line = dark ? '#4a6278' : c.line
  const [shareOn, setShareOn] = useState(true)
  const [ads, setAds] = useState(null)
  const [activeByListing, setActiveByListing] = useState({})
  const [busyId, setBusyId] = useState(0)
  const [okId, setOkId] = useState(0)
  const [storyError, setStoryError] = useState('')
  const posting = useRef(false)
  useEffect(() => {
    AsyncStorage.getItem('bemiyona_share').then((value) => { if (value === '0') setShareOn(false) }).catch(() => {})
  }, [])
  function loadStories() {
    api('/api/stories/', { auth: true })
      .then((groups) => {
        const map = {}
        ;(Array.isArray(groups) ? groups : []).forEach((row) => {
          if (!row.mine) return
          ;(row.stories || []).forEach((story) => {
            const listingId = story.listing?.id || row.listing_id
            if (listingId) map[listingId] = story.expires_at
          })
        })
        setActiveByListing(map)
      })
      .catch(() => setActiveByListing({}))
  }
  useEffect(() => {
    if (!user) return undefined
    api('/api/me/listings/').then((list) => {
      setAds((Array.isArray(list) ? list : []).filter((row) => row.status !== 'archived'))
    }).catch(() => setAds([]))
    loadStories()
    return undefined
  }, [user])
  async function toStory(item) {
    if (busyId || posting.current || activeByListing[item.id] || !coverOf(item)) return
    posting.current = true
    setBusyId(item.id)
    setStoryError('')
    setOkId(0)
    try {
      const story = await api('/api/stories/', { method: 'POST', body: { listing_id: item.id } })
      setOkId(item.id)
      setActiveByListing((current) => ({ ...current, [item.id]: story.expires_at || true }))
    } catch (err) {
      setStoryError(errorText(err, t))
      if (err?.code === 'story_active') loadStories()
    } finally {
      posting.current = false
      setBusyId(0)
    }
  }
  if (!user) {
    return (
      <Screen>
        <Text style={{ fontSize: 28, fontWeight: '700', color: ink, marginBottom: 12 }}>{t('navCabinet')}</Text>
        <Btn title={t('navLogin')} onPress={() => navigation.navigate('Login')} />
      </Screen>
    )
  }
  const full = [user.name, user.last_name].filter(Boolean).join(' ')
  const letter = (full || user.phone_display || 'Б').trim().charAt(0).toUpperCase()
  const limit = Number(user.listing_limit || 0)
  const active = Number(user.active_count || 0)
  const photo = user.photo ? media(user.photo) : ''
  const shareBg = dark ? '#1d3d5c' : '#d7ecff'
  const shareInk = dark ? '#e8eef5' : '#16324d'
  const menu = [
    ['user', t('myProfile'), () => navigation.navigate('Profile')],
    ['bell', t('mySubscriptions'), () => navigation.navigate('Subscriptions')],
    ['suggest', t('mySuggestions'), () => navigation.navigate('MySuggestions')],
    ['megaphone', t('reviews'), () => navigation.navigate('Reviews')],
    ['card', t('payments'), () => navigation.navigate('Payments')],
    ['gear', t('menuSettings'), () => navigation.navigate('Settings')],
    ['info', t('aboutApp'), () => navigation.navigate('About')],
  ]
  if (user.can_dashboard) menu.push(['gear', t('navDashboard'), () => navigation.navigate('Dashboard')])
  return (
    <Screen scroll>
      <View style={{ alignItems: 'center', gap: 6, marginBottom: 4 }}>
        {photo ? (
          <Image source={{ uri: photo }} style={{ width: 96, height: 96, borderRadius: 48, marginBottom: 6 }} />
        ) : (
          <View style={{ width: 96, height: 96, borderRadius: 48, marginBottom: 6, backgroundColor: dark ? '#243446' : '#e7ebf0', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="user" size={42} color={dark ? '#c5d4e4' : '#8b95a3'} />
          </View>
        )}
        <Text style={{ fontSize: 22, fontWeight: '700', color: ink }}>{full || letter}</Text>
        <Text style={{ color: c.muted, fontWeight: '600' }}>{user.phone_display}</Text>
      </View>
      <View style={{ flexDirection: 'row', gap: 12, marginTop: 14 }}>
        <Pressable onPress={() => navigation.navigate('MyListings')} style={{ flex: 1, minHeight: 108, backgroundColor: card, borderRadius: 18, borderWidth: 1, borderColor: line, padding: 16, gap: 4 }}>
          <Icon name="flag" size={22} color={ink} />
          <Text style={{ fontSize: 22, fontWeight: '700', color: ink }}>{limit > 0 ? `${active}/${limit}` : String(active)}</Text>
          <Text style={{ color: c.muted, fontWeight: '600', fontSize: 13 }}>{t('activeAds')}</Text>
        </Pressable>
        <Pressable onPress={() => navigation.navigate('Wallet')} style={{ flex: 1, minHeight: 108, backgroundColor: card, borderRadius: 18, borderWidth: 1, borderColor: line, padding: 16, gap: 4 }}>
          <Icon name="eye" size={22} color={ink} />
          <Text style={{ fontSize: 22, fontWeight: '700', color: ink }}>{money(user.balance || 0)} {t('walletUnit')}</Text>
          <Text style={{ color: c.muted, fontWeight: '600', fontSize: 13 }}>{t('myWallet')}</Text>
        </Pressable>
      </View>
      <Text style={{ color: ink, fontSize: 18, fontWeight: '700', marginTop: 16 }}>{t('myListings')}</Text>
      {storyError ? <Text style={{ color: colors.bad, marginTop: 8 }}>{storyError}</Text> : null}
      {ads === null ? <Text style={{ color: c.muted, marginTop: 8 }}>{t('loading')}</Text> : null}
      {ads?.length === 0 ? <Text style={{ color: c.muted, marginTop: 8 }}>{t('noListings')}</Text> : null}
      {(ads || []).map((item) => {
        const locked = Boolean(activeByListing[item.id])
        const readyBg = dark ? '#9ec0e0' : colors.navy
        const readyInk = dark ? '#102033' : '#fff'
        const waitBg = dark ? '#243446' : '#d9e8f7'
        const waitInk = dark ? '#9ec0e0' : colors.navy
        return (
          <View key={item.id} style={{ marginTop: 10, flexDirection: 'row', gap: 12, padding: 10, borderRadius: 18, borderWidth: 1, borderColor: line, backgroundColor: card }}>
            <Pressable onPress={() => navigation.navigate(item.status === 'published' ? 'Detail' : 'Post', { id: item.id })}>
              {coverOf(item) ? (
                <Image source={{ uri: coverOf(item) }} style={{ width: 92, height: 92, borderRadius: 14 }} />
              ) : (
                <View style={{ width: 92, height: 92, borderRadius: 14, backgroundColor: dark ? '#243446' : '#e8edf3', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name="camera" size={22} color="#8b95a3" />
                </View>
              )}
            </Pressable>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={{ color: ink, fontWeight: '700', fontSize: 16 }}>{item.price_deal ? t('priceDeal') : `${money(item.price)} ${t('perMonth')}`}</Text>
              <Text numberOfLines={1} style={{ color: ink, fontWeight: '600', fontSize: 13 }}>{[item.street, pick(item.district, lang)].filter(Boolean).join(' · ')}</Text>
              <Text style={{ color: c.muted, fontSize: 13, fontWeight: '600' }}>{t(`status_${item.status}`) || item.status}</Text>
              <Pressable
                disabled={busyId === item.id || !coverOf(item) || locked}
                onPress={() => toStory(item)}
                style={{ alignSelf: 'flex-start', marginTop: 8, minHeight: 38, paddingHorizontal: 14, borderRadius: 999, backgroundColor: locked ? waitBg : readyBg, borderWidth: locked && dark ? 1 : 0, borderColor: '#3d628c', flexDirection: 'row', alignItems: 'center', gap: 7, opacity: busyId === item.id ? 0.7 : 1 }}
              >
                <Icon name="camera" size={16} color={locked ? waitInk : readyInk} />
                <Text style={{ color: locked ? waitInk : readyInk, fontWeight: '800', fontSize: 13 }}>
                  {busyId === item.id ? t('storyUploading') : locked ? t('storyActiveWait') : t('storyFromListing')}
                </Text>
              </Pressable>
              {okId === item.id ? <Text style={{ color: dark ? '#9ed8c4' : '#1d7a4a', fontWeight: '700', fontSize: 12, marginTop: 4 }}>{t('storyAdded')}</Text> : null}
              {locked ? <Text style={{ color: dark ? '#9ec0e0' : '#5b7fa3', fontWeight: '700', fontSize: 12, marginTop: 4 }}>{t('storyActiveHint')}</Text> : null}
            </View>
          </View>
        )
      })}
      {shareOn ? (
        <View style={{ marginTop: 14, borderRadius: 18, backgroundColor: shareBg, padding: 16, flexDirection: 'row', gap: 10 }}>
          <Pressable style={{ flex: 1 }} onPress={() => Share.share({ title: t('brand'), message: `${t('shareText')} ${SITE}` })}>
            <Text style={{ color: shareInk, fontSize: 18, fontWeight: '700', marginBottom: 4 }}>{t('shareTitle')}</Text>
            <Text style={{ color: dark ? '#c5d4e4' : '#2c4d6b', fontWeight: '600', lineHeight: 20 }}>{t('shareText')}</Text>
          </Pressable>
          <Pressable onPress={() => { setShareOn(false); AsyncStorage.setItem('bemiyona_share', '0').catch(() => {}) }}>
            <Text style={{ color: dark ? '#c5d4e4' : '#16324d', fontSize: 22, fontWeight: '700' }}>×</Text>
          </Pressable>
        </View>
      ) : null}
      <View style={{ marginTop: 14, backgroundColor: card, borderRadius: 18, borderWidth: 1, borderColor: line, overflow: 'hidden' }}>
        {menu.map(([icon, title, onPress], index) => (
          <Pressable key={title} onPress={onPress} style={{ minHeight: 58, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 12, borderTopWidth: index ? 1 : 0, borderTopColor: line }}>
            <Icon name={icon} size={20} color={ink} />
            <Text style={{ flex: 1, color: ink, fontWeight: '700', fontSize: 16 }}>{title}</Text>
            <Icon name="chevron" size={18} color={c.muted} />
          </Pressable>
        ))}
      </View>
      <Pressable onPress={logout} style={{ alignSelf: 'center', padding: 12, marginTop: 4 }}>
        <Text style={{ color: '#d23b3b', fontWeight: '700' }}>{t('navLogout')}</Text>
      </Pressable>
    </Screen>
  )
}

export function MyListingsScreen({ navigation }) {
  const { t, lang } = useI18n()
  const { user, setUser } = useAuth()
  const c = useColors()
  const dark = usePrefs().theme === 'dark'
  const ink = dark ? '#e8eef5' : '#1b2a3a'
  const card = dark ? '#324860' : '#fff'
  const line = dark ? '#4a6278' : c.line
  const [rows, setRows] = useState(null)
  const [error, setError] = useState('')
  function load() {
    api('/api/me/listings/').then(setRows).catch((err) => setError(errorText(err, t)))
  }
  useEffect(load, [])
  function daysLeft(value) {
    if (!value) return 0
    const ms = new Date(value).getTime() - Date.now()
    if (!Number.isFinite(ms) || ms <= 0) return 0
    return Math.max(1, Math.ceil(ms / 86400000))
  }
  async function act(id, action) {
    setError('')
    try {
      await api(`/api/me/listings/${id}/${action}/`, { method: 'POST' })
      setUser(await api('/api/auth/me/'))
      load()
    } catch (err) {
      if (action === 'refresh' && err.code === 'refresh_simple_only') {
        navigation.navigate('Tariffs')
        return
      }
      setError(errorText(err, t))
    }
  }
  function refresh(item) {
    if (item.plan !== 'simple') {
      navigation.navigate('Tariffs')
      return
    }
    const left = daysLeft(item.plan_expires_at)
    if (item.status === 'published' && left > 0) {
      setError(t('refresh_too_early', { days: left }))
      return
    }
    act(item.id, 'refresh')
  }
  const planName = lang === 'tj' ? user?.client_plan?.name_tj : user?.client_plan?.name_ru
  const chip = { borderWidth: 1, borderColor: line, backgroundColor: dark ? '#243446' : '#fff', borderRadius: 999, paddingVertical: 8, paddingHorizontal: 14 }
  return (
    <Screen scroll>
      {user?.can_post && user.listing_count < user.listing_limit ? <Btn title={t('navPost')} onPress={() => navigation.navigate('Post')} /> : null}
      {error ? <Text style={{ color: colors.bad, marginTop: 8 }}>{error}</Text> : null}
      {rows === null ? <Text style={{ color: c.muted, marginTop: 8 }}>{t('loading')}</Text> : null}
      {rows?.length === 0 ? <Text style={{ color: c.muted, marginTop: 8 }}>{t('noListings')}</Text> : null}
      {(rows || []).map((item) => (
        <View key={item.id} style={{ marginTop: 10, backgroundColor: card, borderRadius: 18, borderWidth: 1, borderColor: line, padding: 16, gap: 6 }}>
          <Text style={{ color: ink, fontWeight: '800', fontSize: 18 }}>{item.price_deal ? t('priceDeal') : `${money(item.price)} ${t('somoniShort')}`}</Text>
          <Text style={{ color: ink, fontWeight: '600' }}>{[item.street, pick(item.district, lang)].filter(Boolean).join(' · ')}</Text>
          <Text style={{ color: c.muted, fontWeight: '600' }}>
            {(t(`status_${item.status}`) || item.status)} · {(t(`pay_${item.payment_status}`) || item.payment_status || '')}
            {item.plan_expires_at ? ` · ${t('until', { date: new Date(item.plan_expires_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }) })}` : ''}
          </Text>
          {item.rejection_reason ? <Text style={{ color: colors.bad }}>{t('reason')}: {item.rejection_reason}</Text> : null}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
            <Pressable onPress={() => navigation.navigate('Post', { id: item.id })} style={chip}>
              <Text style={{ color: ink, fontWeight: '700' }}>{t('edit')}</Text>
            </Pressable>
            {(item.status === 'expired' || item.status === 'published') ? (
              <Pressable onPress={() => refresh(item)} style={chip}>
                <Text style={{ color: ink, fontWeight: '700' }}>{t('refresh')}</Text>
              </Pressable>
            ) : null}
            {item.status !== 'archived' ? (
              <Pressable onPress={() => act(item.id, 'archive')} style={chip}>
                <Text style={{ color: ink, fontWeight: '700' }}>{t('archive')}</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      ))}
      <View style={{ marginTop: 16, backgroundColor: card, borderRadius: 18, borderWidth: 1, borderColor: line, padding: 16, gap: 4 }}>
        <Text style={{ color: c.muted, fontWeight: '600' }}>{t('yourPlan')}</Text>
        <Text style={{ color: ink, fontWeight: '800', fontSize: 18 }}>{planName || '—'}</Text>
        {user?.client_plan?.until ? <Text style={{ color: c.muted }}>{t('until', { date: postedWhen(user.client_plan.until, lang) })}</Text> : null}
        <Text style={{ color: ink }}>{t('reveals')}: {user?.reveals_used} / {user?.reveal_unlimited ? t('unlimited') : user?.reveal_limit}</Text>
        {user?.can_post ? <Text style={{ color: ink }}>{t('listingLimit', { count: user.listing_count, limit: user.listing_limit })}</Text> : null}
        <Pressable onPress={() => navigation.navigate('Tariffs')} style={{ marginTop: 6 }}>
          <Text style={{ color: dark ? '#fff' : colors.navy, fontWeight: '800' }}>{t('upgrade')}</Text>
        </Pressable>
      </View>
    </Screen>
  )
}

export function WalletScreen() {
  const { t } = useI18n()
  const { setUser } = useAuth()
  const c = useColors()
  const dark = usePrefs().theme === 'dark'
  const ink = dark ? '#e8eef5' : '#1b2a3a'
  const card = dark ? '#324860' : '#fff'
  const line = dark ? '#4a6278' : c.line
  const [balance, setBalance] = useState(0)
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState('amonat')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    api('/api/me/wallet/').then((next) => {
      setBalance(next.balance)
      setUser((current) => (current ? { ...current, balance: next.balance } : current))
    }).catch((err) => setError(errorText(err, t)))
  }, [])
  async function pay() {
    const number = Number(amount)
    if (number < 2) { setError(t('pay_min')); return }
    if (number > 5000) { setError(t('pay_max')); return }
    setBusy(true)
    setError('')
    try {
      const row = await api('/api/me/wallet/topup/', { method: 'POST', body: { amount: number, payment_method: method } })
      if (row.payment_link) await Linking.openURL(row.payment_link)
      else setError(t('pay_failed'))
    } catch (err) {
      setError(errorText(err, t))
    } finally {
      setBusy(false)
    }
  }
  return (
    <Screen scroll>
      <Text style={{ fontSize: 32, fontWeight: '700', color: ink }}>{money(balance)} {t('walletUnit')}</Text>
      <Text style={{ color: c.muted, marginVertical: 8 }}>{t('walletAmountHint')}</Text>
      <Field value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="0" />
      <Text style={{ color: ink, fontWeight: '800', fontSize: 16, marginBottom: 8 }}>{t('payMethodTitle')}</Text>
      <View style={{ borderRadius: 18, borderWidth: 1, borderColor: line, backgroundColor: card, overflow: 'hidden', marginBottom: 8 }}>
        {PAY_MAIN.map((item, index) => (
          <Pressable key={item.id} onPress={() => setMethod(item.id)} style={{ minHeight: 58, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 12, borderTopWidth: index ? 1 : 0, borderTopColor: line }}>
            <PayMark logo={item.logo} />
            <Text style={{ flex: 1, color: ink, fontWeight: '700' }}>{item.label}</Text>
            <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: method === item.id ? colors.navy : '#c5ced8', backgroundColor: method === item.id ? colors.navy : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
              {method === item.id ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#fff' }} /> : null}
            </View>
          </Pressable>
        ))}
      </View>
      {error ? <Text style={{ color: colors.bad }}>{error}</Text> : null}
      <Btn title={t('walletTopupBtn')} disabled={busy} onPress={pay} />
    </Screen>
  )
}

export function PaymentsScreen() {
  const { t, lang } = useI18n()
  const c = useColors()
  const dark = usePrefs().theme === 'dark'
  const ink = dark ? '#e8eef5' : '#1b2a3a'
  const card = dark ? '#324860' : '#fff'
  const [rows, setRows] = useState(null)
  const [error, setError] = useState('')
  useEffect(() => {
    api('/api/me/wallet/').then((data) => setRows(data.payments || [])).catch((err) => setError(errorText(err, t)))
  }, [])
  return (
    <Screen scroll>
      <Text style={{ fontSize: 26, fontWeight: '700', color: ink, marginBottom: 10 }}>{t('myPayments')}</Text>
      {error ? <Text style={{ color: colors.bad }}>{error}</Text> : null}
      {rows?.length === 0 ? <Text style={{ color: c.muted }}>{t('noPayments')}</Text> : null}
      {(rows || []).map((row) => (
        <View key={row.id} style={{ backgroundColor: card, borderRadius: 16, padding: 12, marginBottom: 8 }}>
          <Text style={{ fontWeight: '700', color: ink }}>{row.kind === 'topup' ? t('walletTopup') : (lang === 'tj' ? row.name_tj : row.name_ru)}</Text>
          <Text style={{ color: c.muted }}>{postedWhen(row.created_at, lang)} · {t(row.status === 'charged' ? 'pay_paid' : row.status === 'void' ? 'pay_void' : 'pay_unpaid')}</Text>
          <Text style={{ fontWeight: '700', color: ink }}>{money(row.amount)} {t('walletUnit')}</Text>
        </View>
      ))}
    </Screen>
  )
}

export function ReviewsScreen() {
  const { t } = useI18n()
  const c = useColors()
  const ink = usePrefs().theme === 'dark' ? '#e8eef5' : '#1b2a3a'
  return <Screen><Text style={{ fontSize: 26, fontWeight: '700', color: ink }}>{t('reviews')}</Text><Text style={{ color: c.muted, marginTop: 8 }}>{t('noReviews')}</Text></Screen>
}

export function MySuggestionsScreen({ navigation }) {
  const { t, lang } = useI18n()
  const c = useColors()
  const dark = usePrefs().theme === 'dark'
  const ink = dark ? '#e8eef5' : '#1b2a3a'
  const card = dark ? '#324860' : '#fff'
  const [rows, setRows] = useState(null)
  const [error, setError] = useState('')
  useEffect(() => { api('/api/suggestions/').then(setRows).catch((err) => setError(errorText(err, t))) }, [])
  return (
    <Screen scroll>
      <Text style={{ color: c.muted, marginBottom: 8 }}>{t('mySuggestionsLead')}</Text>
      {error ? <Text style={{ color: colors.bad }}>{error}</Text> : null}
      {rows?.length === 0 ? <Text style={{ color: c.muted }}>{t('noMySuggestions')}</Text> : null}
      {(rows || []).map((item) => (
        <View key={item.id} style={{ backgroundColor: card, borderRadius: 16, padding: 12, marginBottom: 8 }}>
          <Text style={{ color: c.muted }}>{postedWhen(item.created_at, lang)} · {t(item.status === 'done' ? 'suggestStatusDone' : item.status === 'read' ? 'suggestStatusRead' : 'suggestStatusNew')}</Text>
          <Text style={{ color: ink, marginTop: 6 }}>{item.text}</Text>
        </View>
      ))}
      <Btn title={t('suggestNew')} onPress={() => navigation.navigate('Suggest')} />
    </Screen>
  )
}

export function SubscriptionsScreen({ navigation }) {
  const { t, lang } = useI18n()
  const c = useColors()
  const dark = usePrefs().theme === 'dark'
  const ink = dark ? '#e8eef5' : '#1b2a3a'
  const card = dark ? '#324860' : '#fff'
  const [rows, setRows] = useState(null)
  const [geo, setGeo] = useState({ districts: [] })
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  function load() { api('/api/me/subscriptions/').then(setRows).catch((err) => setError(errorText(err, t))) }
  useEffect(() => { load(); api('/api/geo/').then(setGeo).catch(() => {}) }, [])
  return (
    <Screen scroll>
      <Text style={{ color: c.muted, marginBottom: 8 }}>{t('mySubscriptionsLead')}</Text>
      {error ? <Text style={{ color: colors.bad }}>{error}</Text> : null}
      {message ? <Text style={{ color: ink }}>{message}</Text> : null}
      {rows?.length === 0 ? <Text style={{ color: c.muted }}>{t('noSubscriptions')}</Text> : null}
      {(rows || []).map((item) => {
        const district = geo.districts?.find((row) => String(row.id) === String(item.filters?.district))
        return (
          <View key={item.id} style={{ backgroundColor: card, borderRadius: 16, padding: 12, marginBottom: 8 }}>
            <Text style={{ fontWeight: '700', color: ink }}>{item.title || [district ? pick(district, lang) : '', item.filters?.rooms].filter(Boolean).join(' · ') || t('subAllListings')}</Text>
            <Text style={{ color: c.muted }}>{postedWhen(item.created_at, lang)}</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
              <Text style={{ color: ink }}>{t('subNotify')}</Text>
              <Switch value={Boolean(item.notify)} onValueChange={async () => {
                const next = await api(`/api/me/subscriptions/${item.id}/`, { method: 'PATCH', body: { notify: !item.notify } })
                setRows((list) => list.map((row) => (row.id === item.id ? next : row)))
                setMessage(t('subUpdated'))
              }} />
            </View>
            <Btn ghost title={t('openSearch')} onPress={() => navigation.navigate('Listings', { filters: item.filters || {}, stamp: Date.now() })} />
            <Btn ghost title={t('subDelete')} onPress={async () => { await api(`/api/me/subscriptions/${item.id}/`, { method: 'DELETE' }); setRows((list) => list.filter((row) => row.id !== item.id)); setMessage(t('subRemoved')) }} />
          </View>
        )
      })}
      <Btn title={t('subscribeFromSearch')} onPress={() => navigation.navigate('Listings')} />
    </Screen>
  )
}

function birthLimit() {
  const day = new Date()
  day.setHours(12, 0, 0, 0)
  day.setFullYear(day.getFullYear() - 16)
  return `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`
}

function isoDay(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function dots(iso) {
  return iso && iso.includes('-') ? iso.split('-').reverse().join('.') : ''
}

function typedIso(raw) {
  const digits = String(raw || '').replace(/\D/g, '')
  if (digits.length !== 8) return ''
  const iso = `${digits.slice(4, 8)}-${digits.slice(2, 4)}-${digits.slice(0, 2)}`
  const date = new Date(`${iso}T12:00:00`)
  if (Number.isNaN(date.getTime())) return ''
  if (isoDay(date.getFullYear(), date.getMonth(), date.getDate()) !== iso) return ''
  return iso
}

function BirthDate({ value, onChange, dark, ink }) {
  const { lang } = useI18n()
  const max = birthLimit()
  const [open, setOpen] = useState(false)
  const [text, setText] = useState(dots(value))
  const start = value || max
  const [cursor, setCursor] = useState({ year: Number(start.slice(0, 4)), month: Number(start.slice(5, 7)) - 1 })
  const locale = lang === 'tj' ? 'ru' : lang === 'zh' ? 'zh-CN' : 'ru'
  const rawTitle = new Date(cursor.year, cursor.month, 1).toLocaleDateString(locale, { month: 'long', year: 'numeric' })
  const title = rawTitle.charAt(0).toUpperCase() + rawTitle.slice(1).replace(' г.', '')
  const week = Array.from({ length: 7 }, (_, index) => new Date(2024, 0, 1 + index).toLocaleDateString(locale, { weekday: 'short' }))
  const lead = (new Date(cursor.year, cursor.month, 1).getDay() + 6) % 7
  const count = new Date(cursor.year, cursor.month + 1, 0).getDate()
  const days = [...Array(lead).fill(null), ...Array.from({ length: count }, (_, index) => index + 1)]
  const fieldBg = dark ? '#324860' : '#fff'
  const line = dark ? '#4a6278' : '#e3e8ee'
  function typeDate(raw) {
    const digits = raw.replace(/\D/g, '').slice(0, 8)
    let view = digits
    if (digits.length > 4) view = `${digits.slice(0, 2)}.${digits.slice(2, 4)}.${digits.slice(4)}`
    else if (digits.length > 2) view = `${digits.slice(0, 2)}.${digits.slice(2)}`
    setText(view)
    onChange(digits.length === 8 ? (typedIso(view) || view) : view)
  }
  return (
    <View>
      <View style={{ minHeight: 48, borderRadius: 16, borderWidth: 1, borderColor: line, backgroundColor: fieldBg, flexDirection: 'row', alignItems: 'center' }}>
        <TextInput
          value={text}
          onChangeText={typeDate}
          placeholder="дд.мм.гггг"
          placeholderTextColor={dark ? '#a9b8c8' : '#5d6e80'}
          keyboardType="number-pad"
          maxLength={10}
          style={{ flex: 1, minHeight: 48, color: ink, fontWeight: '600', paddingHorizontal: 16 }}
        />
        <Pressable onPress={() => setOpen((current) => !current)} hitSlop={8} style={{ width: 44, height: 48, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="calendar" size={18} color={ink} />
        </Pressable>
      </View>
      {open ? (
        <View style={{ marginTop: 8, width: 292, padding: 12, borderRadius: 16, borderWidth: 1, borderColor: line, backgroundColor: fieldBg }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ color: ink, fontWeight: '700', fontSize: 15 }}>{title}</Text>
            <View style={{ flexDirection: 'row' }}>
              <Pressable onPress={() => setCursor((current) => { const next = new Date(current.year, current.month - 1, 1); return { year: next.getFullYear(), month: next.getMonth() } })} style={{ width: 32, height: 32, alignItems: 'center', justifyContent: 'center' }}>
                <View style={{ transform: [{ rotate: '180deg' }] }}><Icon name="chevron" size={16} color={ink} /></View>
              </Pressable>
              <Pressable onPress={() => setCursor((current) => { const next = new Date(current.year, current.month + 1, 1); return { year: next.getFullYear(), month: next.getMonth() } })} style={{ width: 32, height: 32, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="chevron" size={16} color={ink} />
              </Pressable>
            </View>
          </View>
          <View style={{ flexDirection: 'row', marginTop: 8 }}>
            {week.map((name, index) => <Text key={index} style={{ width: 38, textAlign: 'center', color: dark ? '#a9b8c8' : '#5d6e80', fontSize: 12, fontWeight: '600' }}>{name}</Text>)}
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {days.map((day, index) => {
              if (!day) return <View key={`e-${index}`} style={{ width: 38, height: 32 }} />
              const iso = isoDay(cursor.year, cursor.month, day)
              const blocked = iso > max || iso < '1900-01-01'
              const on = iso === value
              return (
                <Pressable key={iso} disabled={blocked} onPress={() => { onChange(iso); setText(dots(iso)); setOpen(false) }} style={{ width: 38, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? colors.navy : 'transparent', opacity: blocked ? 0.28 : 1 }}>
                  <Text style={{ color: on ? '#fff' : ink }}>{day}</Text>
                </Pressable>
              )
            })}
          </View>
        </View>
      ) : null}
    </View>
  )
}

export function ProfileScreen() {
  const { t } = useI18n()
  const { user, setUser } = useAuth()
  const dark = usePrefs().theme === 'dark'
  const ink = dark ? '#e8eef5' : '#1b2a3a'
  const card = dark ? '#324860' : '#fff'
  const line = dark ? '#4a6278' : '#e3e8ee'
  const muted = dark ? '#a9b8c8' : '#5d6e80'
  const [name, setName] = useState(user?.name || '')
  const [lastName, setLastName] = useState(user?.last_name || '')
  const [birth, setBirth] = useState(user?.birth_date || '')
  const [file, setFile] = useState(null)
  const [cleared, setCleared] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const shown = file?.uri || (!cleared && user?.photo ? media(user.photo) : '')
  const letter = (name || user?.phone_display || 'Б').trim().charAt(0).toUpperCase()
  async function pickPhoto() {
    const picked = await ImagePicker.launchImageLibraryAsync({ quality: 0.8 })
    if (!picked.canceled) {
      setFile(picked.assets[0])
      setCleared(false)
    }
  }
  async function save() {
    const typed = /^\d{4}-\d{2}-\d{2}$/.test(birth) ? birth : typedIso(birth)
    if (String(birth || '').trim() && !typed) {
      setError(t('bad_date'))
      return
    }
    if (typed && (typed > birthLimit() || typed < '1900-01-01')) {
      setError(t('bad_date'))
      return
    }
    setBusy(true)
    setError('')
    setMessage('')
    const form = new FormData()
    form.append('name', name.trim())
    form.append('last_name', lastName.trim())
    form.append('birth_date', typed || '')
    if (file) {
      form.append('photo', {
        uri: file.uri,
        name: 'avatar.jpg',
        type: file.mimeType || 'image/jpeg',
      })
    } else if (cleared) form.append('remove_photo', '1')
    try {
      const next = await api('/api/auth/me/', { method: 'PATCH', form })
      setUser(next)
      setMessage(t('saved'))
      setFile(null)
      setCleared(false)
    } catch (err) {
      setError(errorText(err, t))
    } finally {
      setBusy(false)
    }
  }
  const input = { minHeight: 48, borderRadius: 999, borderWidth: 1, borderColor: line, backgroundColor: card, color: ink, paddingHorizontal: 16, fontSize: 16 }
  return (
    <Screen scroll>
      <Text style={{ color: muted, marginBottom: 12 }}>{t('settingsLead')}</Text>
      {error ? <Text style={{ color: dark ? '#f0b4b4' : '#9a3b3b', backgroundColor: dark ? '#3a2222' : '#fdecec', borderRadius: 20, padding: 12, marginBottom: 10 }}>{error}</Text> : null}
      {message ? <Text style={{ color: dark ? '#9ed8c4' : '#1d7a4a', backgroundColor: dark ? '#16352a' : '#e5f6ee', borderRadius: 20, padding: 12, marginBottom: 10 }}>{message}</Text> : null}
      <View style={{ backgroundColor: card, borderRadius: 28, borderWidth: 1, borderColor: line, padding: 22, gap: 12 }}>
        <Pressable onPress={pickPhoto} style={{ width: 96, height: 96, borderRadius: 48, overflow: 'hidden', backgroundColor: colors.navy, alignItems: 'center', justifyContent: 'center' }}>
          {shown ? <Image source={{ uri: shown }} style={{ width: 96, height: 96 }} /> : <Text style={{ color: '#fff', fontWeight: '800', fontSize: 32 }}>{letter}</Text>}
        </Pressable>
        <Text style={{ color: muted, fontSize: 13 }}>{t('choosePhoto')}</Text>
        {shown ? (
          <Pressable onPress={() => { setFile(null); setCleared(true) }} style={{ alignSelf: 'flex-start', minHeight: 42, paddingHorizontal: 16, borderRadius: 999, borderWidth: 1, borderColor: line, justifyContent: 'center' }}>
            <Text style={{ color: ink, fontWeight: '700' }}>{t('removePhoto')}</Text>
          </Pressable>
        ) : null}
        <Text style={{ color: muted, fontWeight: '600' }}>{user?.phone_display}</Text>
        <View style={{ gap: 6 }}>
          <Text style={{ color: muted, fontWeight: '600', fontSize: 13 }}>{t('name')}</Text>
          <TextInput value={name} onChangeText={setName} maxLength={120} style={input} />
        </View>
        <View style={{ gap: 6 }}>
          <Text style={{ color: muted, fontWeight: '600', fontSize: 13 }}>{t('lastName')}</Text>
          <TextInput value={lastName} onChangeText={setLastName} maxLength={80} style={input} />
        </View>
        <View style={{ gap: 6 }}>
          <Text style={{ color: muted, fontWeight: '600', fontSize: 13 }}>{t('birthDate')}</Text>
          <BirthDate value={birth} onChange={setBirth} dark={dark} ink={ink} />
        </View>
        <Pressable disabled={busy} onPress={save} style={{ minHeight: 48, borderRadius: 999, backgroundColor: colors.navy, alignItems: 'center', justifyContent: 'center', opacity: busy ? 0.6 : 1 }}>
          <Text style={{ color: '#fff', fontWeight: '700' }}>{t('saveProfile')}</Text>
        </Pressable>
      </View>
    </Screen>
  )
}

export function SettingsScreen({ navigation }) {
  const { t, lang, setLang } = useI18n()
  const { user, logout } = useAuth()
  const prefs = usePrefs()
  const c = useColors()
  const dark = prefs.theme === 'dark'
  const ink = dark ? '#e8eef5' : '#1b2a3a'
  const card = dark ? '#324860' : '#fff'
  const [ask, setAsk] = useState(false)
  const [error, setError] = useState('')
  async function wipe() {
    try {
      await api('/api/auth/me/', { method: 'DELETE' })
      logout()
      navigation.navigate('Tabs')
    } catch (err) {
      setError(errorText(err, t))
    }
  }
  return (
    <Screen scroll>
      <Text style={{ fontSize: 26, fontWeight: '700', color: ink, marginBottom: 10 }}>{t('menuSettings')}</Text>
      {error ? <Text style={{ color: colors.bad }}>{error}</Text> : null}
      {['ru', 'tj', 'zh'].map((code) => (
        <Pressable key={code} onPress={() => setLang(code)} style={{ padding: 12, backgroundColor: lang === code ? colors.navy : card, borderRadius: 14, marginBottom: 6 }}>
          <Text style={{ color: lang === code ? '#fff' : ink, fontWeight: '700' }}>{t(code === 'ru' ? 'langRu' : code === 'tj' ? 'langTj' : 'langZh')}</Text>
        </Pressable>
      ))}
      <Pressable onPress={() => prefs.setTheme(prefs.theme === 'dark' ? 'light' : 'dark')} style={{ padding: 12, backgroundColor: card, borderRadius: 14, marginVertical: 8 }}>
        <Text style={{ fontWeight: '700', color: ink }}>{t('appearance')}: {t(prefs.theme === 'dark' ? 'themeDark' : 'themeLight')}</Text>
      </Pressable>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <Text style={{ color: ink }}>{t('showPrices')}</Text>
        <Switch value={prefs.showPrices} onValueChange={prefs.setShowPrices} />
      </View>
      <Btn ghost title={t('notifySettings')} onPress={() => navigation.navigate('Notifications')} />
      {!user?.can_dashboard && <Btn ghost title={t('deleteAccount')} onPress={() => setAsk(true)} />}
      {ask && (
        <View>
          <Text style={{ fontWeight: '700', marginTop: 8, color: ink }}>{t('deleteAsk')}</Text>
          <Text style={{ color: c.muted }}>{t('deleteAskText')}</Text>
          <Btn title={t('deleteYes')} onPress={wipe} />
          <Btn ghost title={t('compareNo')} onPress={() => setAsk(false)} />
        </View>
      )}
    </Screen>
  )
}

export function NotificationsScreen({ navigation }) {
  const { t } = useI18n()
  const prefs = usePrefs()
  const ink = prefs.theme === 'dark' ? '#e8eef5' : '#1b2a3a'
  return (
    <Screen>
      <Text style={{ fontSize: 26, fontWeight: '700', color: ink, marginBottom: 12 }}>{t('notifySettings')}</Text>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <Text style={{ color: ink }}>{t('notifyPush')}</Text>
        <Switch value={prefs.notifyPush} onValueChange={prefs.setNotifyPush} />
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <Text style={{ color: ink }}>{t('notifyChat')}</Text>
        <Switch value={prefs.notifyChat} onValueChange={prefs.setNotifyChat} />
      </View>
      <Btn ghost title={t('mySubscriptions')} onPress={() => navigation.navigate('Subscriptions')} />
    </Screen>
  )
}

export function AboutScreen() {
  const { t } = useI18n()
  const c = useColors()
  const ink = usePrefs().theme === 'dark' ? '#e8eef5' : '#1b2a3a'
  return (
    <Screen>
      <Text style={{ fontSize: 28, fontWeight: '700', color: ink }}>{t('brand')}</Text>
      <Text style={{ color: ink, marginVertical: 10, lineHeight: 22 }}>{t('aboutText')}</Text>
      <Text style={{ color: c.muted }}>{t('aboutVersion', { version: '1.0' })}</Text>
      <Pressable onPress={() => Linking.openURL('https://bemiyonrav.tj/privacy')} style={{ marginTop: 16 }}>
        <Text style={{ color: colors.navy, fontWeight: '700', textDecorationLine: 'underline' }}>{t('privacy')}</Text>
      </Pressable>
    </Screen>
  )
}
