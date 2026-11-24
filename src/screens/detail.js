import { useEffect, useState } from 'react'
import { Dimensions, Image, Linking, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { WebView } from 'react-native-webview'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useVideoPlayer, VideoView } from 'expo-video'
import { api, media } from '../api'
import { floorText, money, pick, postedWhen } from '../format'
import { errorText, useI18n } from '../i18n'
import { BackButton } from '../chrome'
import { Icon } from '../icons'
import { useAuth, usePrefs, useSaved } from '../state'
import { DetailSkeleton } from '../skeleton'
import { Btn, ListingCard, VerifyBadge, colors, useColors } from '../ui'

const W = Dimensions.get('window').width

export function DetailScreen({ route, navigation }) {
  const { id } = route.params
  const { t, lang } = useI18n()
  const { user } = useAuth()
  const { showPrices, theme } = usePrefs()
  const dark = theme === 'dark'
  const c = useColors()
  const insets = useSafeAreaInsets()
  const { favorites, compare, toggle } = useSaved()
  const ink = dark ? '#e8eef5' : '#1b2a3a'
  const muted = dark ? '#9aabbd' : '#7b8794'
  const card = dark ? '#324860' : '#fff'
  const dockBg = dark ? '#1b2836' : '#fff'
  const dockInk = dark ? '#fff' : colors.navy
  const [item, setItem] = useState(null)
  const [similar, setSimilar] = useState([])
  const [error, setError] = useState('')
  const [photo, setPhoto] = useState(0)
  const [busy, setBusy] = useState(false)
  const [limitOpen, setLimitOpen] = useState(false)

  useEffect(() => {
    setItem(null)
    setPhoto(0)
    api(`/api/listings/${id}/`).then((data) => {
      setItem(data)
      if (data.district?.id) {
        api(`/api/listings/?district=${data.district.id}&page_size=9`).then((list) => {
          setSimilar((list.results || []).filter((row) => row.id !== data.id).slice(0, 8))
        }).catch(() => {})
      }
    }).catch(() => setError(t('notFound')))
  }, [id])

  if (!item) {
    return (
      <View style={[styles.page, { backgroundColor: c.paper, paddingTop: insets.top }]}>
        <DetailHead navigation={navigation} title="" dark={dark} />
        {error ? <Text style={[styles.muted, { color: muted }]}>{error}</Text> : <DetailSkeleton />}
      </View>
    )
  }

  const photos = (item.photos || []).map((row) => media(typeof row === 'string' ? row : row.url)).filter(Boolean)
  const liked = favorites.some((row) => row.id === item.id)
  const digits = item.contact?.opened ? String(item.contact.phone_display || '').replace(/\D/g, '') : ''
  const roomBit = item.rooms
    ? `${item.rooms}-${lang === 'tj' ? 'ҳуҷра' : lang === 'zh' ? '室' : 'комн.'}`
    : ''
  const title = [
    [roomBit, t('flatWord')].filter(Boolean).join(' '),
    item.floor ? `${item.floor} ${t('floor')}` : '',
    item.area ? `${Number(item.area)} ${t('m2')}` : '',
    pick(item.district, lang) || item.street,
  ].filter(Boolean).join(', ')
  const specs = [
    [t('floor'), item.floor ? floorText(item) : ''],
    [t('detailArea'), item.area ? `${Number(item.area)} ${t('m2')}` : ''],
    [t('furniture'), pick(item.furniture, lang)],
    [t('repairLabel'), pick(item.specs?.repair, lang)],
    [t('heatFilter'), pick(item.specs?.heating, lang)],
    [t('bathFilter'), pick(item.specs?.bathroom, lang)],
    [t('detailUtilities'), pick(item.utilities, lang)],
    [t('detailAudience'), pick(item.audience, lang)],
    [t('detailPrepay'), item.prepayment ? `${money(item.prepayment)} ${t('somoniShort')}` : ''],
    [t('detailAvailable'), item.available_from || ''],
    [t('district'), pick(item.district, lang)],
    [t('street'), item.street],
    item.contact?.opened && item.contact.house_number ? [t('house'), item.contact.house_number] : null,
    item.contact?.opened && item.contact.landmark ? [t('landmark'), item.contact.landmark] : null,
  ].filter((row) => row && row[1])
  const description = lang === 'tj' ? (item.description_tj || item.description_ru) : (item.description_ru || item.description_tj)

  async function reveal() {
    if (!user) {
      navigation.navigate('Login')
      return
    }
    const quota = item.quota
    if (quota && !quota.unlimited && !item.contact?.opened && quota.limit != null && quota.used >= quota.limit) {
      setLimitOpen(true)
      return
    }
    setBusy(true)
    setError('')
    try {
      const data = await api(`/api/listings/${id}/reveal/`, { method: 'POST' })
      setItem((current) => ({
        ...current,
        contact: {
          ...current.contact,
          opened: true,
          phone_display: data.phone_display,
          house_number: data.house_number,
          landmark: data.landmark,
        },
        quota: { used: data.used, limit: data.limit, unlimited: data.unlimited },
      }))
    } catch (err) {
      if (err.code === 'tariff_required') setLimitOpen(true)
      else setError(errorText(err, t))
    } finally {
      setBusy(false)
    }
  }

  function fav() {
    const added = !liked
    toggle('favorites', item)
    setItem((current) => current ? { ...current, favorite_count: Math.max(0, (current.favorite_count || 0) + (added ? 1 : -1)) } : current)
  }

  const tabSpace = 64 + insets.bottom
  return (
    <View style={[styles.page, { backgroundColor: c.paper, paddingTop: insets.top }]}>
      <DetailHead navigation={navigation} title={title} dark={dark} />
      <ScrollView contentContainerStyle={{ paddingBottom: tabSpace + 72 }}>
        <View style={styles.pad}>
          <View style={styles.bar}>
            <View style={styles.meta}>
              <Text style={[styles.metaText, { color: muted }]}>{postedWhen(item.published_at || item.created_at, lang)}</Text>
              <Text style={[styles.metaText, { color: muted }]}>{item.view_count || 0}</Text>
              <Text style={[styles.metaText, { color: muted }]}>ID: {item.id}</Text>
              <Pressable onPress={fav} style={styles.fav}>
                <Text style={{ color: liked ? '#d23b3b' : '#1b2a3a', fontWeight: '800' }}>{liked ? '♥' : '♡'} {item.favorite_count || 0}</Text>
              </Pressable>
            </View>
            <Text style={[styles.price, { color: ink }]}>
              {item.price_deal || !showPrices ? (item.price_deal ? t('priceDeal') : t('priceHidden')) : money(item.price)}
              {!item.price_deal && showPrices ? <Text style={[styles.per, { color: c.muted }]}> {t('perMonth')}</Text> : null}
            </Text>
          </View>
        </View>
        <View style={styles.gallery}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(event) => setPhoto(Math.round(event.nativeEvent.contentOffset.x / (W - 32)))}
          >
            {(photos.length ? photos : ['']).map((url, index) => (
              <View key={`${url}-${index}`} style={{ width: W - 32, height: 280 }}>
                {url ? <Image source={{ uri: url }} style={StyleSheet.absoluteFill} blurRadius={28} /> : null}
                {url ? <Image source={{ uri: url }} style={{ width: '100%', height: 280 }} resizeMode="contain" /> : null}
              </View>
            ))}
          </ScrollView>
          {photos.length > 1 ? (
            <View style={styles.dots}>
              {photos.map((url, index) => <View key={url} style={[styles.dot, photo % photos.length === index && styles.dotOn]} />)}
            </View>
          ) : null}
        </View>
        {photos.length > 1 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.thumbs}>
            {photos.map((url, index) => (
              <Pressable key={url} onPress={() => setPhoto(index)}>
                <Image source={{ uri: url }} style={[styles.thumb, photo % photos.length === index && styles.thumbOn]} />
              </Pressable>
            ))}
          </ScrollView>
        )}
        <View style={styles.specs}>
          {specs.map(([label, value]) => (
            <View key={label} style={styles.spec}>
              <Text style={[styles.dt, { color: dark ? '#a9b8c8' : '#8aa0b8' }]}>{label}</Text>
              <Text style={[styles.dd, { color: ink }]}>{value}</Text>
            </View>
          ))}
        </View>
        {description ? (
          <View style={styles.pad}>
            <Text style={[styles.h2, { color: ink }]}>{t('detailDesc')}</Text>
            <Text style={[styles.prose, { color: dark ? '#e8eef5' : '#3e556b' }]}>{description}</Text>
          </View>
        ) : null}
        {item.point?.lat != null && (
          <View style={styles.pad}>
            <Text style={[styles.h2, { color: ink }]}>{t('map')}</Text>
            <DetailMap
              lat={item.point.lat}
              lon={item.point.lon}
              address={[item.street, item.contact?.opened ? item.contact.house_number : '', pick(item.district, lang)].filter(Boolean).join(', ')}
              route={t('route')}
            />
          </View>
        )}
        {item.video ? (
          <View style={styles.pad}>
            <Text style={[styles.h2, { color: ink }]}>{t('video')}</Text>
            <Clip url={media(item.video)} />
          </View>
        ) : null}
        <View style={[styles.phone, { backgroundColor: card, borderColor: c.line }]}>
          {item.author?.name ? <Text style={[styles.phoneName, { color: dark ? '#fff' : '#1b2a3a' }]}>{item.author.name}</Text> : null}
          {!item.contact?.opened ? (
            <Btn title={user ? t('showPhone') : t('loginToPhone')} disabled={busy} onPress={reveal} />
          ) : null}
          {item.contact?.opened ? (
            <Pressable onPress={() => Linking.openURL(`tel:+${digits}`)}>
              <Text style={[styles.phoneBig, { color: dark ? '#fff' : '#314a64' }]}>{item.contact.phone_display}</Text>
            </Pressable>
          ) : (
            <Text style={[styles.phoneBig, { color: dark ? '#fff' : '#314a64' }]}>{item.contact?.masked || ''}</Text>
          )}
          {item.author?.id ? (
            <Pressable onPress={() => navigation.navigate('Listings', { owner: item.author.id })}>
              <Text style={[styles.author, { color: dark ? '#fff' : '#314a64' }]}>{t('authorListings')}</Text>
            </Pressable>
          ) : null}
          <Btn ghost title={t('writeMessage')} onPress={() => navigation.navigate('Messages', { listingId: item.id })} />
          <View style={styles.msgs}>
            {item.whatsapp ? <Pressable onPress={() => digits && Linking.openURL(`https://wa.me/${digits}`)}><Text style={styles.wa}>WhatsApp</Text></Pressable> : null}
            {item.telegram ? <Pressable onPress={() => digits && Linking.openURL(`https://t.me/+${digits}`)}><Text style={styles.tg}>Telegram</Text></Pressable> : null}
          </View>
          {!item.contact?.opened ? <Text style={[styles.hint, { color: dark ? '#a9b8c8' : '#51667a' }]}>{t('houseHidden')}</Text> : null}
          <VerifyBadge item={item} />
          {item.quota && !item.quota.unlimited ? <Text style={[styles.hint, { color: dark ? '#a9b8c8' : '#51667a' }]}>{t('phoneLeft', { used: item.quota.used, limit: item.quota.limit ?? '—' })}</Text> : null}
          {error ? <Text style={styles.err}>{error}</Text> : null}
        </View>
        {similar.length > 0 && (
          <View style={styles.pad}>
            <Text style={[styles.h2, { color: ink }]}>{t('similar')}</Text>
            {similar.map((row) => (
              <ListingCard
                key={row.id}
                item={row}
                favored={favorites.some((saved) => saved.id === row.id)}
                chosen={compare.some((saved) => saved.id === row.id)}
                onPress={() => navigation.push('Detail', { id: row.id })}
                onFav={() => toggle('favorites', row)}
                onCompare={() => toggle('compare', row)}
              />
            ))}
          </View>
        )}
      </ScrollView>
      <Pressable style={[styles.dock, { bottom: tabSpace + 8, backgroundColor: dockBg }]} onPress={item.contact?.opened ? () => Linking.openURL(`tel:+${digits}`) : reveal}>
        <Text style={[styles.dockText, { color: dockInk }]}>{item.contact?.opened ? item.contact.phone_display : item.contact?.masked}</Text>
      </Pressable>
      <DetailTabs navigation={navigation} />
      <Modal visible={limitOpen} transparent animationType="fade" onRequestClose={() => setLimitOpen(false)}>
        <Pressable style={styles.veil} onPress={() => setLimitOpen(false)}>
          <Pressable style={[styles.card, { backgroundColor: card }]} onPress={() => {}}>
            <Text style={[styles.h2, { color: ink }]}>{t('limitTitle')}</Text>
            <Text style={[styles.prose, { color: dark ? '#e8eef5' : '#3e556b' }]}>{t('tariff_required')}</Text>
            <Btn title={t('upgrade')} onPress={() => { setLimitOpen(false); navigation.navigate('Tariffs') }} />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  )
}

function DetailHead({ navigation, title, dark }) {
  const ink = dark ? '#e8eef5' : '#1b2a3a'
  return (
    <View style={styles.head}>
      <BackButton dark={dark} onPress={() => navigation.goBack()} />
      <Text numberOfLines={2} style={[styles.headTitle, { color: ink }]}>{title}</Text>
    </View>
  )
}

function DetailTabs({ navigation }) {
  const { t } = useI18n()
  const { user } = useAuth()
  const { favorites } = useSaved()
  const dark = usePrefs().theme === 'dark'
  const c = useColors()
  const insets = useSafeAreaInsets()
  const muted = dark ? '#a9b8c8' : c.muted
  const items = [
    ['Home', t('footHome'), 'home'],
    ['Favorites', t('navFavorites'), 'heart'],
    ['Add', t('navAdd'), 'plus'],
    ['Offers', t('navOffers'), 'suggest'],
    ['Cabinet', user ? t('navProfile') : t('navLogin'), 'user'],
  ]
  function go(key) {
    if (key === 'Add') {
      if (!user) navigation.navigate('Login', { after: 'Add' })
      else if (user.can_post) navigation.navigate('Post')
      else navigation.navigate('Tariffs')
      return
    }
    if (key === 'Cabinet' && !user) {
      navigation.navigate('Login', { after: 'Cabinet' })
      return
    }
    navigation.navigate('Tabs', { screen: key })
  }
  return (
    <View style={[styles.tabs, { backgroundColor: dark ? 'rgba(16,24,32,0.96)' : 'rgba(255,255,255,0.96)', borderTopColor: c.line, paddingBottom: Math.max(insets.bottom, 6) }]}>
      {items.map(([key, label, icon]) => (
        <Pressable key={key} onPress={() => go(key)} style={styles.tab}>
          {key === 'Add' ? (
            <View style={[styles.plus, { backgroundColor: dark ? '#fff' : colors.navy }]}>
              <Icon name="plus" size={22} color={dark ? colors.navy : '#fff'} />
            </View>
          ) : (
            <View>
              <Icon name={icon} size={22} color={muted} filled={key === 'Favorites' && favorites.length > 0} />
              {key === 'Favorites' && favorites.length > 0 ? (
                <View style={[styles.badge, { backgroundColor: dark ? '#fff' : colors.navy }]}>
                  <Text style={{ color: dark ? colors.navy : '#fff', fontSize: 10, fontWeight: '800' }}>{favorites.length}</Text>
                </View>
              ) : null}
            </View>
          )}
          <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={{ color: muted, fontSize: 11, fontWeight: '700', marginTop: key === 'Add' ? 0 : 2, textAlign: 'center' }}>{label}</Text>
        </Pressable>
      ))}
    </View>
  )
}

function mapText(value) {
  return String(value || '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]))
}

function detailMapHtml(lat, lon, address, route) {
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
<style>
html,body,#m{height:100%;margin:0}
.leaflet-control-attribution{display:none}
.pin-tip{background:#fff;border:0;border-radius:14px;color:#1b2a3a;box-shadow:0 8px 20px rgba(20,40,61,.16);padding:8px 10px}
.pin-tip strong{display:block}
.pin-tip span{display:block;margin-top:2px;color:#5c7590;font-size:12px;font-weight:600}
</style></head><body><div id="m"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
const map = L.map('m', { scrollWheelZoom: false }).setView([${lat}, ${lon}], 15);
L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', { maxZoom: 19 }).addTo(map);
const icon = L.divIcon({
  className: 'map-pin',
  html: '<svg viewBox="0 0 32 42" width="32" height="42"><path fill="#1F3B5C" d="M16 0C7.2 0 0 7.2 0 16c0 12 16 26 16 26s16-14 16-26C32 7.2 24.8 0 16 0z"/><circle cx="16" cy="15" r="6" fill="#fff"/></svg>',
  iconSize: [32, 42],
  iconAnchor: [16, 42],
});
const marker = L.marker([${lat}, ${lon}], { icon }).addTo(map);
marker.bindTooltip('<strong>${mapText(address)}</strong><span>${mapText(route)}</span>', { direction: 'top', offset: [0, -36], opacity: 1, className: 'pin-tip', permanent: true }).openTooltip();
marker.on('click', () => window.ReactNativeWebView.postMessage('route'));
setTimeout(() => map.invalidateSize(), 200);
</script></body></html>`
}

function DetailMap({ lat, lon, address, route }) {
  return (
    <View style={styles.map}>
      <WebView
        originWhitelist={['*']}
        source={{ html: detailMapHtml(lat, lon, address, route) }}
        style={{ flex: 1, backgroundColor: '#e7eef3' }}
        onMessage={() => Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}`)}
        scrollEnabled={false}
      />
    </View>
  )
}

function Clip({ url }) {
  const player = useVideoPlayer(url, (value) => { value.loop = false })
  return (
    <VideoView
      player={player}
      nativeControls
      contentFit="contain"
      style={styles.player}
    />
  )
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.paper },
  head: { flexDirection: 'row', alignItems: 'center', paddingRight: 12, paddingLeft: 4, minHeight: 48 },
  back: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headTitle: { flex: 1, fontSize: 16, fontWeight: '700', lineHeight: 20 },
  tabs: { position: 'absolute', left: 0, right: 0, bottom: 0, borderTopWidth: 1, flexDirection: 'row', paddingTop: 6 },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', minHeight: 48 },
  plus: { width: 46, height: 46, marginTop: -18, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  badge: { position: 'absolute', top: -4, right: -10, minWidth: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
  pad: { paddingHorizontal: 16, paddingTop: 8 },
  map: { height: 400, marginTop: 4, borderRadius: 22, overflow: 'hidden', borderWidth: 1, borderColor: '#d7e0e8' },
  player: { width: '100%', height: 220, marginTop: 8, borderRadius: 22, overflow: 'hidden', backgroundColor: '#000' },
  title: { fontSize: 22, fontWeight: '600', color: '#1b2a3a', letterSpacing: -0.3, lineHeight: 28 },
  bar: { marginTop: 8, marginBottom: 10 },
  meta: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10 },
  metaText: { color: '#7b8794', fontSize: 13, fontWeight: '600' },
  fav: { backgroundColor: '#fff', minHeight: 32, borderRadius: 999, paddingHorizontal: 10, justifyContent: 'center' },
  price: { marginTop: 8, fontSize: 22, fontWeight: '700', color: '#1b2a3a' },
  per: { fontSize: 12, fontWeight: '600', color: colors.muted },
  gallery: { marginHorizontal: 16, height: 280, borderRadius: 28, overflow: 'hidden', backgroundColor: '#d5dde6' },
  dots: { position: 'absolute', bottom: 12, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 4 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.75)' },
  dotOn: { width: 14, backgroundColor: '#fff' },
  thumbs: { gap: 8, paddingHorizontal: 16, paddingTop: 8 },
  thumb: { width: 84, height: 64, borderRadius: 16 },
  thumbOn: { borderWidth: 2, borderColor: '#8aa0b8' },
  specs: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, marginTop: 14 },
  spec: { width: '50%', paddingVertical: 8, paddingRight: 10 },
  dt: { color: '#8aa0b8', fontSize: 13 },
  dd: { color: '#1b2a3a', fontWeight: '600', marginTop: 3 },
  h2: { fontSize: 22, fontWeight: '600', color: '#1b2a3a', marginBottom: 8, marginTop: 8 },
  prose: { color: '#3e556b', lineHeight: 24, fontWeight: '500' },
  phone: { margin: 16, backgroundColor: '#fff', borderRadius: 28, padding: 18, borderWidth: 1, borderColor: colors.line },
  phoneName: { fontSize: 18, fontWeight: '700', color: '#1b2a3a', marginBottom: 6 },
  phoneBig: { fontSize: 24, fontWeight: '600', color: '#314a64', marginVertical: 6 },
  author: { color: '#314a64', fontWeight: '600', marginBottom: 8 },
  msgs: { flexDirection: 'row', gap: 16, marginTop: 8 },
  wa: { color: '#25D366', fontWeight: '800' },
  tg: { color: '#2AABEE', fontWeight: '800' },
  hint: { color: '#51667a', marginTop: 8, lineHeight: 20 },
  err: { color: colors.bad, marginTop: 8 },
  dock: {
    position: 'absolute', left: 12, right: 12, bottom: 12, minHeight: 52, borderRadius: 18,
    backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#14283d', shadowOpacity: 0.18, shadowRadius: 12, elevation: 6,
  },
  dockText: { color: colors.navy, fontSize: 22, fontWeight: '700' },
  veil: { flex: 1, backgroundColor: 'rgba(20,40,61,0.45)', justifyContent: 'center', padding: 24 },
  card: { backgroundColor: '#fff', borderRadius: 24, padding: 18 },
  muted: { color: colors.muted, padding: 20 },
})
