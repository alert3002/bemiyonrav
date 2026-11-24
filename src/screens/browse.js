import { useEffect, useLayoutEffect, useState } from 'react'
import { FlatList, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { WebView } from 'react-native-webview'
import { api } from '../api'
import { pick, qs } from '../format'
import { errorText, useI18n } from '../i18n'
import { Icon } from '../icons'
import { useAuth, useMenu, usePrefs, useSaved } from '../state'
import { Btn, Field, ListingCard, Screen, colors, useColors } from '../ui'
import { FeedSkeleton } from '../skeleton'
import { StoriesRail } from './stories'

const logo = require('../../assets/logo-classic.png')

function useFeed(query) {
  const street = (query.street || '').trim().toLowerCase()
  const server = { ...query }
  delete server.street
  const [items, setItems] = useState([])
  const [count, setCount] = useState(0)
  const [page, setPage] = useState(1)
  const [ready, setReady] = useState(false)
  const key = JSON.stringify(server)

  useEffect(() => {
    let stop = false
    setReady(false)
    api(`/api/listings/${qs({ ...server, page: 1, page_size: 10 })}`)
      .then((data) => {
        if (stop) return
        setItems(data.results || [])
        setCount(data.count || 0)
        setPage(1)
      })
      .catch(() => {})
      .finally(() => { if (!stop) setReady(true) })
    return () => { stop = true }
  }, [key])

  async function more() {
    if (items.length >= count) return
    const next = page + 1
    const data = await api(`/api/listings/${qs({ ...server, page: next, page_size: 10 })}`)
    setPage(next)
    setItems((rows) => {
      const seen = new Set(rows.map((row) => row.id))
      return [...rows, ...(data.results || []).filter((row) => !seen.has(row.id))]
    })
    setCount(data.count || 0)
  }

  const shown = street ? items.filter((item) => `${item.street || ''} ${item.district?.name_ru || ''}`.toLowerCase().includes(street)) : items
  return { items: shown, ready, more, count }
}

function Feed({ navigation, query, header, footer, padBottom = 28 }) {
  const { favorites, compare, toggle } = useSaved()
  const c = useColors()
  const { items, ready, more } = useFeed(query)
  return (
    <FlatList
      style={{ flex: 1, backgroundColor: c.paper }}
      contentContainerStyle={{ padding: 16, paddingBottom: padBottom }}
      data={items}
      keyExtractor={(item) => String(item.id)}
      ListHeaderComponent={header}
      ListFooterComponent={footer}
      ListEmptyComponent={ready ? <Text style={{ color: colors.muted }} /> : <FeedSkeleton />}
      onEndReached={more}
      onEndReachedThreshold={0.4}
      renderItem={({ item }) => (
        <ListingCard
          item={item}
          favored={favorites.some((row) => row.id === item.id)}
          chosen={compare.some((row) => row.id === item.id)}
          onPress={() => navigation.navigate('Detail', { id: item.id })}
          onFav={() => toggle('favorites', item)}
          onCompare={() => toggle('compare', item)}
        />
      )}
    />
  )
}

const ROOM_NAMES = {
  ru: { 1: '1-комнатные', 2: '2-комнатные', 3: '3-комнатные', 4: '4-комнатные', 5: '5-комнатные', 6: '6 и более комнат' },
  tj: { 1: '1-ҳуҷра', 2: '2-ҳуҷра', 3: '3-ҳуҷра', 4: '4-ҳуҷра', 5: '5-ҳуҷра', 6: '6 ва бештар' },
  zh: { 1: '1室', 2: '2室', 3: '3室', 4: '4室', 5: '5室', 6: '6室及以上' },
}

export function HomeScreen({ navigation }) {
  const { t, lang } = useI18n()
  const { user } = useAuth()
  const [rooms, setRooms] = useState('')
  const [catalog, setCatalog] = useState([])
  const [counts, setCounts] = useState({})
  const [total, setTotal] = useState(0)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [draft, setDraft] = useState({ district: '', rooms: '', sort: 'random', price_min: '', price_max: '' })
  const [applied, setApplied] = useState({ sort: 'random' })
  const [geo, setGeo] = useState({ districts: [] })
  const [somonUrl, setSomonUrl] = useState('')
  const [somonNote, setSomonNote] = useState('')
  const [menu, setMenu] = useState(false)
  const [pushOpen, setPushOpen] = useState(false)
  const [pushes, setPushes] = useState([])
  const [seed] = useState(() => Math.floor(Math.random() * 1000003) + 1)
  const insets = useSafeAreaInsets()
  const c = useColors()
  const dark = usePrefs().theme === 'dark'
  const { favorites, compare } = useSaved()
  const { setOpen } = useMenu()
  const ink = dark ? '#fff' : colors.navy
  function closeMenu() {
    setMenu(false)
    setOpen(false)
  }
  function toggleMenu() {
    setPushOpen(false)
    setMenu((value) => !value)
  }
  useEffect(() => { setOpen(menu) }, [menu, setOpen])
  useEffect(() => {
    api('/api/listings/room-counts/').then((data) => {
      const next = {}
      Object.entries(data.rooms || {}).forEach(([key, value]) => { next[Number(key)] = value })
      setCounts(next)
      setTotal(data.total || 0)
    }).catch(() => {})
    api('/api/geo/').then(setGeo).catch(() => {})
    api('/api/catalog/').then((data) => setCatalog(data.rooms || [])).catch(() => {})
  }, [])
  const names = ROOM_NAMES[lang] || ROOM_NAMES.ru
  const roomLabel = (value) => pick(catalog.find((item) => Number(item.value) === Number(value)), lang) || names[value]
  const sortKey = { random: 'sortRandom', new: 'sortNew', price_asc: 'sortPriceAsc', price_desc: 'sortPriceDesc' }
  return (
    <View style={{ flex: 1, backgroundColor: c.paper, paddingTop: insets.top }}>
    {user?.somon_enabled && (
      <View style={[styles.somon, dark && { backgroundColor: '#15202b' }]}>
        <TextInput value={somonUrl} onChangeText={setSomonUrl} placeholder="https://somon.tj/adv/..." placeholderTextColor="#8aa0b8" style={[styles.somonInput, dark && { backgroundColor: '#121c27', color: '#e8eef5', borderColor: '#3d5268' }]} />
        <Pressable style={styles.somonBtn} onPress={async () => {
          try {
            const result = await api('/api/me/somon/', { method: 'POST', body: { url: somonUrl } })
            setSomonNote(result.path || 'OK')
            setSomonUrl('')
            if (result.path) {
              const id = String(result.path).split('/').filter(Boolean).pop()
              if (id) navigation.navigate('Detail', { id: Number(id) })
            }
          } catch (err) {
            setSomonNote(err.code === 'need_phone' ? t('somonNoPhone') : (String(err.code || '').includes(' ') ? err.code : t('somonFail')))
          }
        }}>
          <Text style={styles.mapFabText}>OK</Text>
        </Pressable>
      </View>
    )}
    {somonNote ? <Text style={[styles.lead, { paddingHorizontal: 16 }]}>{somonNote}</Text> : null}
    <View style={[styles.top, { backgroundColor: dark ? 'rgba(16,24,32,0.92)' : 'rgba(255,255,255,0.92)', borderBottomColor: c.line }]}>
      <Image source={logo} style={styles.logo} />
      <Text style={[styles.word, { color: dark ? '#e8eef5' : colors.navy }]} numberOfLines={1}>{t('brand')}</Text>
      <Pressable style={[styles.round, dark && { backgroundColor: '#fff', borderColor: '#fff' }]} onPress={async () => {
        closeMenu()
        setPushOpen((value) => !value)
        if (!user) return
        try { setPushes((await api('/api/me/pushes/')).results || []) } catch { setPushes([]) }
      }}>
        <Icon name="bell" size={20} color="#111" />
      </Pressable>
      <Pressable style={[styles.round, dark && { backgroundColor: '#fff', borderColor: menu ? '#fff' : '#fff' }, menu && styles.roundOn]} onPress={toggleMenu}>
        {menu ? <Icon name="x" size={20} color="#fff" /> : (
          <View style={styles.bars}>
            <View style={styles.bar} />
            <View style={styles.bar} />
            <View style={styles.bar} />
          </View>
        )}
      </Pressable>
    </View>
    <View style={{ flex: 1 }}>
    <Feed
      navigation={navigation}
      padBottom={96}
      query={{ rooms, ...applied, ...(applied.sort === 'random' || !applied.sort ? { seed } : {}) }}
      header={(
        <View style={{ marginBottom: 12 }}>
          <View>
          <StoriesRail navigation={navigation} />
          <View style={styles.hero}>
            <Image source={logo} style={styles.heroMark} />
            <Text style={styles.heroLine}>{t('heroLine1')}</Text>
            <Text style={styles.heroLine}>{t('heroLine2')}</Text>
          </View>
          <View style={styles.boardHead}>
            <Text style={[styles.rent, { color: c.ink }]}>{t('rentTitle')}</Text>
            <Text style={[styles.rent, { color: c.ink }]}>{total}</Text>
            <Pressable onPress={() => setFiltersOpen((value) => !value)} style={[styles.filterOpen, dark && { backgroundColor: '#1b2836', borderColor: c.line }]}>
              <Text style={[styles.chipText, dark && { color: c.ink }]}>{t('filters')}</Text>
            </Pressable>
          </View>
          <View style={styles.roomGrid}>
            {[[1, 2, 3], [4, 5, 6]].map((column) => (
              <View key={column[0]} style={{ flex: 1 }}>
                {column.map((value) => {
                  const on = rooms === String(value)
                  return (
                    <Pressable key={value} onPress={() => setRooms(on ? '' : String(value))} style={[styles.roomCell, on && { backgroundColor: dark ? 'rgba(255,255,255,0.08)' : 'rgba(31,59,92,0.08)' }]}>
                      <View style={[styles.radio, { borderColor: dark ? '#6d7f93' : '#c3ccd6', backgroundColor: dark ? 'transparent' : '#fff' }, on && { borderWidth: 5, borderColor: dark ? '#fff' : colors.navy }]} />
                      <Text style={[styles.roomName, { color: on ? (dark ? '#fff' : colors.navy) : c.ink }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.62}>{roomLabel(value)}</Text>
                      <Text style={[styles.roomCount, { color: on ? (dark ? '#fff' : colors.navy) : (dark ? '#9aabbd' : '#8b97a6') }]}>{counts[value] || 0}</Text>
                    </Pressable>
                  )
                })}
              </View>
            ))}
          </View>
          </View>
          {filtersOpen && (
            <View style={styles.sheet}>
              <Text style={styles.rent}>{t('filters')}</Text>
              <Text style={styles.lead}>{t('district')}</Text>
              <View style={styles.chips}>
                <Pressable onPress={() => setDraft((d) => ({ ...d, district: '' }))} style={[styles.chip, !draft.district && styles.chipOn]}>
                  <Text style={[styles.chipText, !draft.district && styles.chipTextOn]}>{t('allDistricts')}</Text>
                </Pressable>
                {(geo.districts || []).map((item) => (
                  <Pressable key={item.id} onPress={() => setDraft((d) => ({ ...d, district: String(item.id) }))} style={[styles.chip, String(draft.district) === String(item.id) && styles.chipOn]}>
                    <Text style={[styles.chipText, String(draft.district) === String(item.id) && styles.chipTextOn]}>{pick(item, lang)}</Text>
                  </Pressable>
                ))}
              </View>
              <Text style={styles.lead}>{t('rooms')}</Text>
              <View style={styles.chips}>
                {['', '1', '2', '3', '4', '5', '6'].map((value) => (
                  <Pressable key={value || 'any'} onPress={() => setDraft((d) => ({ ...d, rooms: value }))} style={[styles.chip, draft.rooms === value && styles.chipOn]}>
                    <Text style={[styles.chipText, draft.rooms === value && styles.chipTextOn]}>{value ? roomLabel(value) : t('anyRooms')}</Text>
                  </Pressable>
                ))}
              </View>
              <Text style={styles.lead}>{t('sortLabel')}</Text>
              <View style={styles.chips}>
                {['random', 'new', 'price_asc', 'price_desc'].map((sort) => (
                  <Pressable key={sort} onPress={() => setDraft((d) => ({ ...d, sort }))} style={[styles.chip, draft.sort === sort && styles.chipOn]}>
                    <Text style={[styles.chipText, draft.sort === sort && styles.chipTextOn]}>{t(sortKey[sort])}</Text>
                  </Pressable>
                ))}
              </View>
              <Field placeholder={t('from')} value={draft.price_min} onChangeText={(value) => setDraft((d) => ({ ...d, price_min: value.replace(/\D/g, '') }))} keyboardType="number-pad" />
              <Field placeholder={t('to')} value={draft.price_max} onChangeText={(value) => setDraft((d) => ({ ...d, price_max: value.replace(/\D/g, '') }))} keyboardType="number-pad" />
              <Btn title={t('apply')} onPress={() => { setRooms(draft.rooms); setApplied(draft); setFiltersOpen(false) }} />
              <Btn ghost title={t('reset')} onPress={() => { const empty = { district: '', rooms: '', sort: 'random', price_min: '', price_max: '' }; setDraft(empty); setApplied(empty); setRooms(''); setFiltersOpen(false) }} />
            </View>
          )}
        </View>
      )}
      footer={(
        <View style={{ marginTop: 8 }}>
          <Text style={styles.rent}>{t('howTitle')}</Text>
          {['1', '2', '3'].map((n) => (
            <View key={n} style={[styles.step, n === '2' && { backgroundColor: '#2a4d73' }, n === '3' && { backgroundColor: colors.navy900 }]}>
              <Text style={styles.stepN}>{n}</Text>
              <Text style={styles.stepT}>{t(`step${n}t`)}</Text>
              <Text style={styles.stepD}>{t(`step${n}d`)}</Text>
            </View>
          ))}
          <View style={styles.cta}>
            <Text style={styles.stepT}>{t('ctaTitle')}</Text>
            <Text style={styles.stepD}>{t('ctaText')}</Text>
            <Pressable style={styles.ctaBtn} onPress={() => navigation.navigate(user ? 'Post' : 'Login', user ? undefined : { after: 'Add' })}>
              <Text style={styles.chipText}>{t('ctaButton')}</Text>
            </Pressable>
          </View>
        </View>
      )}
    />
      {!menu && (
        <Pressable style={[styles.mapFab, dark && { backgroundColor: '#fff' }]} onPress={() => navigation.navigate('Map')}>
          <Icon name="pin" size={18} color={dark ? colors.navy : '#fff'} />
          <Text style={[styles.mapFabText, dark && { color: colors.navy }]}>{t('mapFab')}</Text>
        </Pressable>
      )}
      {menu && (
        <View style={[styles.sheetFull, { backgroundColor: dark ? '#101820' : '#fff' }]}>
          <View style={styles.sheetPanel}>
            <Pressable style={[styles.assist, { backgroundColor: dark ? '#243446' : '#e7eef6' }]} onPress={() => { closeMenu(); navigation.navigate('Offers') }}>
              <View style={[styles.assistBadge, { backgroundColor: dark ? 'rgba(255,255,255,0.16)' : '#fff' }]}>
                <Icon name="assist" size={18} color={ink} />
              </View>
              <View style={{ alignItems: 'center' }}>
                <Text style={{ color: ink, fontWeight: '700', fontSize: 13 }}>{t('navAssist')}</Text>
                <Text style={{ color: dark ? '#a9b8c8' : colors.muted, fontWeight: '600', fontSize: 11 }}>{t('navAssistHint')}</Text>
              </View>
            </Pressable>
            {[
              ['home', t('navListings'), () => navigation.navigate('Listings')],
              ['message', t('navMessages'), () => navigation.navigate('Messages')],
              ['scale', compare.length ? `${t('navCompare')} (${compare.length})` : t('navCompare'), () => navigation.navigate('Compare')],
              ['reels', t('navReels'), () => navigation.navigate('Reels')],
              ['heart', favorites.length ? `${t('navFavorites')} (${favorites.length})` : t('navFavorites'), () => navigation.navigate('Favorites'), favorites.length > 0],
              ['user', user ? t('navProfile') : t('navLogin'), () => navigation.navigate(user ? 'Cabinet' : 'Login', user ? undefined : { after: 'Cabinet' })],
            ].map(([icon, label, go, filled]) => (
              <Pressable key={label} style={[styles.sheetLink, { backgroundColor: dark ? '#1b2836' : '#f3f6fa' }]} onPress={() => { closeMenu(); go() }}>
                <Icon name={icon} size={20} color={ink} filled={Boolean(filled)} />
                <Text style={{ color: ink, fontWeight: '700', fontSize: 16 }}>{label}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}
      {pushOpen && (
        <View style={[styles.push, { top: 8, backgroundColor: dark ? '#1b2836' : '#fff', borderColor: c.line }]}>
          {!user ? <Text style={{ color: c.muted, padding: 16, textAlign: 'center' }}>{t('pushLogin')}</Text> : null}
          {user && !pushes.length ? <Text style={{ color: c.muted, padding: 16, textAlign: 'center' }}>{t('pushEmpty')}</Text> : null}
          {pushes.map((item) => (
            <Text key={item.id} style={{ color: c.ink, fontWeight: '700', paddingHorizontal: 14, paddingVertical: 10 }}>{item.title}</Text>
          ))}
          <Pressable onPress={() => { setPushOpen(false); navigation.navigate(user ? 'Notifications' : 'Login', user ? undefined : { after: 'Notifications' }) }}>
            <Text style={{ color: dark ? '#fff' : colors.navy, textAlign: 'center', fontWeight: '700', padding: 12 }}>{t('pushSettings')}</Text>
          </Pressable>
        </View>
      )}
    </View>
    </View>
  )
}

const EMPTY_FILTERS = {
  district: '', rooms: '', plan: '', sort: '', price_min: '', price_max: '',
  area_min: '', area_max: '', floor_min: '', floor_max: '',
  build: '', prepay: '', heating: '', bathroom: '', street: '',
}

const FILTER_KEYS = ['district', 'rooms', 'plan', 'sort', 'price_min', 'price_max', 'area_min', 'area_max', 'floor_min', 'floor_max', 'build', 'prepay', 'heating', 'bathroom']

function FilterMenu({ label, value, options, open, onToggle, onPick, dark, ink }) {
  const current = options.find((item) => item.value === value) || options[0]
  const field = dark ? '#121c27' : '#f7f9fb'
  const border = dark ? '#3d5268' : '#e3e8ee'
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={{ color: ink, fontWeight: '700', fontSize: 13, marginBottom: 6 }}>{label}</Text>
      <Pressable onPress={onToggle} style={{ minHeight: 46, borderRadius: 14, borderWidth: 1, borderColor: border, backgroundColor: field, paddingLeft: 14, paddingRight: 34, justifyContent: 'center' }}>
        <Text numberOfLines={1} style={{ color: dark ? '#e8eef5' : '#2f455c', fontWeight: '500' }}>{current?.label}</Text>
        <View style={{ position: 'absolute', right: 16, top: 18, width: 8, height: 8, borderRightWidth: 2, borderBottomWidth: 2, borderColor: dark ? '#c5d4e4' : '#6d8296', transform: [{ rotate: '45deg' }] }} />
      </Pressable>
      {open ? (
        <View style={{ marginTop: 6, borderRadius: 16, borderWidth: 1, borderColor: border, backgroundColor: dark ? '#1b2836' : '#fff', padding: 6 }}>
          {options.map((item) => {
            const on = item.value === value
            return (
              <Pressable key={item.value || 'all'} onPress={() => onPick(item.value)} style={{ minHeight: 40, borderRadius: 10, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', backgroundColor: on ? (dark ? '#2a4460' : '#eef3f7') : 'transparent' }}>
                <Text style={{ flex: 1, color: dark ? '#e8eef5' : '#34506a', fontWeight: '500' }}>{item.label}</Text>
                {on ? <Text style={{ color: dark ? '#fff' : '#1f3b5c', fontWeight: '700' }}>✓</Text> : null}
              </Pressable>
            )
          })}
        </View>
      ) : null}
    </View>
  )
}

export function ListingsScreen({ navigation, route }) {
  const { t, lang } = useI18n()
  const { user } = useAuth()
  const c = useColors()
  const dark = usePrefs().theme === 'dark'
  const ink = dark ? '#e8eef5' : '#1b2a3a'
  const [geo, setGeo] = useState({ districts: [] })
  const [draft, setDraft] = useState(EMPTY_FILTERS)
  const [applied, setApplied] = useState({})
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [openMenu, setOpenMenu] = useState('')
  const [note, setNote] = useState('')
  const [subs, setSubs] = useState([])
  const count = FILTER_KEYS.filter((key) => applied[key]).length
  const currentKey = FILTER_KEYS.map((key) => `${key}=${draft[key] || ''}`).join('&')
  const already = subs.some((row) => FILTER_KEYS.map((key) => `${key}=${row.filters?.[key] || ''}`).join('&') === currentKey)
  useEffect(() => { api('/api/geo/').then(setGeo).catch(() => {}) }, [])
  useEffect(() => {
    if (!user) {
      setSubs([])
      return undefined
    }
    api('/api/me/subscriptions/').then((rows) => setSubs(Array.isArray(rows) ? rows : [])).catch(() => setSubs([]))
    return undefined
  }, [user])
  useEffect(() => {
    const incoming = route.params?.filters
    if (!incoming || typeof incoming !== 'object') return undefined
    const next = { ...EMPTY_FILTERS }
    FILTER_KEYS.forEach((key) => {
      if (incoming[key] != null && incoming[key] !== '') next[key] = String(incoming[key])
    })
    setDraft(next)
    setApplied(next)
    return undefined
  }, [route.params?.stamp])
  useLayoutEffect(() => {
    navigation.setOptions({
      headerRightContainerStyle: { paddingRight: 12 },
      headerRight: () => (
        <Pressable onPress={() => setFiltersOpen(true)} style={{ minHeight: 36, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1, borderColor: dark ? c.line : colors.line, backgroundColor: dark ? '#1b2836' : '#fff', flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Icon name="filter" size={16} color={dark ? '#e8eef5' : colors.navy} />
          <Text style={{ color: dark ? '#e8eef5' : colors.navy, fontWeight: '700' }}>{t('filters')}</Text>
          {count > 0 ? (
            <View style={{ minWidth: 18, height: 18, borderRadius: 9, backgroundColor: colors.navy, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 }}>
              <Text style={{ color: '#fff', fontSize: 11, fontWeight: '800' }}>{count}</Text>
            </View>
          ) : null}
        </Pressable>
      ),
    })
  }, [navigation, dark, c.line, t, count])
  function set(key, value) {
    setDraft((current) => ({ ...current, [key]: value }))
    setNote('')
  }
  function toggleMenu(key) { setOpenMenu((current) => (current === key ? '' : key)) }
  async function subscribe() {
    if (!user) {
      setFiltersOpen(false)
      navigation.navigate('Login')
      return
    }
    try {
      if (already) return
      const filters = {}
      FILTER_KEYS.forEach((key) => { if (draft[key]) filters[key] = draft[key] })
      const row = await api('/api/me/subscriptions/', { method: 'POST', body: { filters, notify: true } })
      setSubs((list) => (list.some((item) => item.id === row.id) ? list : [row, ...list]))
      setNote(t('alreadySubscribed'))
    } catch (err) {
      setNote(errorText(err, t))
    }
  }
  const menu = (key, label, options) => (
    <FilterMenu
      label={label}
      value={draft[key]}
      options={options}
      open={openMenu === key}
      dark={dark}
      ink={ink}
      onToggle={() => toggleMenu(key)}
      onPick={(value) => { set(key, value); setOpenMenu('') }}
    />
  )
  const fieldBg = dark ? '#121c27' : '#f7f9fb'
  const fieldBorder = dark ? '#3d5268' : '#e3e8ee'
  const sheet = dark ? '#1b2836' : '#fff'
  return (
    <View style={{ flex: 1 }}>
      <Feed navigation={navigation} query={{ ...applied, owner: route.params?.owner || '' }} />
      {filtersOpen ? (
        <View style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, zIndex: 20 }}>
          <Pressable style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(20,40,61,0.45)' }} onPress={() => setFiltersOpen(false)} />
          <View style={{ position: 'absolute', left: 6, right: 6, top: 8, bottom: 8, backgroundColor: sheet, borderRadius: 28, borderWidth: 1, borderColor: dark ? c.line : colors.line, padding: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text style={{ color: ink, fontSize: 18, fontWeight: '700' }}>{t('filters')}</Text>
              <Pressable onPress={() => setFiltersOpen(false)} style={{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: dark ? '#243446' : '#eef3f8' }}>
                <Icon name="x" size={18} color={dark ? '#e8eef5' : colors.navy} />
              </Pressable>
            </View>
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 8 }}>
              {menu('district', t('district'), [{ value: '', label: t('allDistricts') }, ...(geo.districts || []).map((item) => ({ value: String(item.id), label: pick(item, lang) }))])}
              {menu('rooms', t('anyRooms'), [{ value: '', label: t('anyRooms') }, ...[1, 2, 3, 4, 5, 6].map((value) => ({ value: String(value), label: String(value) }))])}
              {menu('plan', t('planFilter'), [{ value: '', label: t('anyPlan') }, { value: 'top', label: t('planTop') }, { value: 'vip', label: t('planVip') }])}
              {menu('sort', t('sortLabel'), [
                { value: '', label: t('sortRecommended') },
                { value: 'new', label: t('sortNew') },
                { value: 'price_asc', label: t('sortPriceAsc') },
                { value: 'price_desc', label: t('sortPriceDesc') },
              ])}
              {[[t('priceLabel'), 'price_min', 'price_max'], [t('areaLabel'), 'area_min', 'area_max'], [t('floorLabel'), 'floor_min', 'floor_max']].map(([label, fromKey, toKey]) => (
                <View key={label} style={{ marginBottom: 12 }}>
                  <Text style={{ color: ink, fontWeight: '700', fontSize: 13, marginBottom: 6 }}>{label}</Text>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    {[fromKey, toKey].map((key, index) => (
                      <TextInput
                        key={key}
                        value={draft[key]}
                        onChangeText={(value) => set(key, value.replace(/\D/g, ''))}
                        placeholder={index ? t('to') : t('from')}
                        placeholderTextColor={dark ? '#8ea3b8' : '#8b97a6'}
                        keyboardType="number-pad"
                        style={{ flex: 1, minHeight: 46, borderRadius: 14, borderWidth: 1, borderColor: fieldBorder, backgroundColor: fieldBg, color: ink, paddingHorizontal: 14 }}
                      />
                    ))}
                  </View>
                </View>
              ))}
              {menu('build', t('buildType'), [{ value: '', label: t('buildAll') }, { value: 'soviet', label: t('buildSoviet') }, { value: 'new', label: t('buildNew') }])}
              {menu('prepay', t('prepayTerm'), [
                { value: '', label: t('buildAll') },
                { value: '0', label: t('prepayNone') },
                { value: '2', label: t('prepay2') },
                { value: '3', label: t('prepay3') },
                { value: '6', label: t('prepay6') },
                { value: '12', label: t('prepay12') },
              ])}
              {menu('heating', t('heatFilter'), [{ value: '', label: t('buildAll') }, { value: 'yes', label: t('heatYes') }, { value: 'no', label: t('heatNo') }])}
              {menu('bathroom', t('bathFilter'), [{ value: '', label: t('buildAll') }, { value: 'separate', label: t('bathSeparate') }, { value: 'combined', label: t('bathCombined') }])}
            </ScrollView>
            <View style={{ flexDirection: 'row', gap: 8, paddingTop: 8 }}>
              <Pressable onPress={() => { setApplied({ ...draft }); setFiltersOpen(false) }} style={{ flex: 1, minHeight: 46, borderRadius: 999, backgroundColor: colors.navy, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: '#fff', fontWeight: '700' }}>{t('showListings')}</Text>
              </Pressable>
              <Pressable disabled={already} onPress={subscribe} style={{ flex: 1, minHeight: 46, borderRadius: 999, borderWidth: 1, borderColor: already ? colors.navy : (dark ? c.line : colors.line), backgroundColor: already ? colors.navy : 'transparent', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6, paddingHorizontal: 8 }}>
                <Icon name="bell" size={16} color={already ? '#fff' : ink} />
                <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={{ color: already ? '#fff' : ink, fontWeight: '700' }}>{already ? t('alreadySubscribed') : t('subscribe')}</Text>
              </Pressable>
            </View>
            {note ? <Text style={{ color: c.muted, textAlign: 'center', marginTop: 6 }}>{note}</Text> : null}
          </View>
        </View>
      ) : null}
    </View>
  )
}

function mapHtml(rows) {
  const points = rows.filter((row) => row.point?.lat != null).map((row) => ({
    id: row.id,
    lat: Number(row.point.lat),
    lon: Number(row.point.lon),
    title: row.street || '',
  }))
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
<style>html,body,#m{height:100%;margin:0}</style></head><body><div id="m"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
const map = L.map('m').setView([38.5598, 68.787], 12);
L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', { maxZoom: 19 }).addTo(map);
const rows = ${JSON.stringify(points)};
rows.forEach((row) => L.marker([row.lat, row.lon]).addTo(map).bindPopup(row.title).on('click', () => {
  window.ReactNativeWebView.postMessage(String(row.id));
}));
</script></body></html>`
}

export function MapScreen({ navigation }) {
  const [rows, setRows] = useState([])
  useEffect(() => {
    api('/api/listings/?page_size=100').then((data) => setRows(data.results || [])).catch(() => {})
  }, [])
  return (
    <View style={{ flex: 1 }}>
      <WebView
        originWhitelist={['*']}
        source={{ html: mapHtml(rows) }}
        onMessage={(event) => {
          const id = Number(event.nativeEvent.data)
          if (id) navigation.navigate('Detail', { id })
        }}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 64, paddingHorizontal: 16, marginBottom: 6, backgroundColor: 'rgba(255,255,255,0.92)', borderBottomWidth: 1, borderBottomColor: colors.line },
  logo: { width: 44, height: 44, borderRadius: 12 },
  somon: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#f4f7fb' },
  somonBtn: { backgroundColor: colors.navy, borderRadius: 999, minHeight: 36, paddingHorizontal: 16, justifyContent: 'center' },
  somonInput: { flex: 1, height: 36, borderWidth: 1, borderColor: colors.line, borderRadius: 999, paddingHorizontal: 14, backgroundColor: '#fff', color: colors.ink },
  sheet: { marginHorizontal: 16, marginTop: 8, backgroundColor: '#fff', borderRadius: 22, padding: 14, borderWidth: 1, borderColor: colors.line },
  word: { flex: 1, fontWeight: '800', fontSize: 16, letterSpacing: -0.6 },
  round: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: '#111', backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  roundOn: { backgroundColor: '#111', borderColor: '#111' },
  bars: { width: 18, gap: 4 },
  bar: { height: 2, borderRadius: 1, backgroundColor: '#111' },
  sheetFull: { position: 'absolute', left: 0, right: 0, bottom: 0, top: 0, zIndex: 20, paddingHorizontal: 16, justifyContent: 'center' },
  sheetPanel: { width: '100%', maxWidth: 360, alignSelf: 'center', gap: 10 },
  assist: { minHeight: 54, borderRadius: 16, paddingVertical: 10, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  assistBadge: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  sheetLink: { minHeight: 48, borderRadius: 14, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  push: { position: 'absolute', right: 12, width: 280, borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  hero: { backgroundColor: colors.navy, borderRadius: 18, paddingVertical: 16, paddingHorizontal: 18, marginTop: 8, marginBottom: 14, overflow: 'hidden', alignItems: 'center' },
  heroMark: { position: 'absolute', right: -6, top: 6, width: 72, height: 72, opacity: 0.1 },
  heroLine: { color: '#fff', fontSize: 18, fontWeight: '700', lineHeight: 24, letterSpacing: -0.36, textAlign: 'center' },
  rent: { fontSize: 22, fontWeight: '800', color: colors.ink, letterSpacing: -0.4 },
  lead: { color: colors.muted, marginTop: 4, marginBottom: 8 },
  roomGrid: { flexDirection: 'row', marginBottom: 8 },
  roomCell: { minHeight: 40, flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6, paddingHorizontal: 8, borderRadius: 12 },
  roomOn: { backgroundColor: 'rgba(31,59,92,0.08)' },
  radio: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: '#c3ccd6', backgroundColor: '#fff' },
  radioOn: { borderWidth: 5, borderColor: colors.navy },
  roomName: { flex: 1, flexShrink: 1, color: colors.ink, fontWeight: '600', fontSize: 14 },
  roomNameOn: { color: colors.navy },
  roomCount: { flexShrink: 0, color: '#8b97a6', fontWeight: '700', fontSize: 14 },
  mapFab: { position: 'absolute', alignSelf: 'center', bottom: 16, backgroundColor: colors.navy, borderRadius: 999, minHeight: 44, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', gap: 8 },
  mapFabText: { color: '#fff', fontWeight: '700' },
  step: { backgroundColor: colors.navy, borderRadius: 28, padding: 22, marginTop: 12 },
  stepN: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.16)', color: '#fff', textAlign: 'center', lineHeight: 42, fontWeight: '700', overflow: 'hidden', marginBottom: 12 },
  stepT: { color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: 6 },
  stepD: { color: 'rgba(255,255,255,0.82)', lineHeight: 20 },
  cta: { backgroundColor: colors.navy, borderRadius: 28, padding: 22, marginTop: 16 },
  ctaBtn: { alignSelf: 'flex-start', backgroundColor: '#fff', borderRadius: 999, minHeight: 44, paddingHorizontal: 16, justifyContent: 'center', marginTop: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginVertical: 8 },
  chip: { backgroundColor: '#fff', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: colors.line },
  chipOn: { backgroundColor: colors.navy, borderColor: colors.navy },
  chipText: { color: colors.navy, fontWeight: '700' },
  chipTextOn: { color: '#fff' },
  mapRow: { backgroundColor: '#fff', borderRadius: 18, padding: 14, marginBottom: 10 },
  mapTitle: { color: colors.ink, fontWeight: '700', fontSize: 16 },
  boardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  filterOpen: { minHeight: 36, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1, borderColor: colors.line, backgroundColor: '#fff', justifyContent: 'center' },
  roomRow: { backgroundColor: '#fff', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 8, flexDirection: 'row', justifyContent: 'space-between', borderWidth: 1, borderColor: colors.line },
})
