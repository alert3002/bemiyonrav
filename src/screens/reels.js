import { useEffect, useState } from 'react'
import { Dimensions, FlatList, Pressable, Share, StyleSheet, Text, View } from 'react-native'
import { useVideoPlayer, VideoView } from 'expo-video'
import { SITE, api, media } from '../api'
import { money, pick } from '../format'
import { useI18n } from '../i18n'
import { Icon } from '../icons'
import { usePrefs, useSaved } from '../state'
import { colors } from '../ui'

const H = Dimensions.get('window').height

function reelTitle(item) {
  return (item.author?.name || '').trim() || item.street || '—'
}

function Reel({ item, active, onOpen, onToast }) {
  const { t, lang } = useI18n()
  const { showPrices, theme } = usePrefs()
  const light = theme !== 'dark'
  const { favorites, toggle } = useSaved()
  const liked = favorites.some((row) => row.id === item.id)
  const player = useVideoPlayer(item.video ? media(item.video) : null, (value) => {
    value.loop = true
    value.muted = true
  })
  useEffect(() => {
    if (active && item.video) player.play()
    else player.pause()
  }, [active, item.video])
  const price = item.price_deal || !showPrices
    ? t('priceDeal')
    : `${money(item.price)} ${t('somoni')} / ${t('monthShort')}`
  const place = [item.street, pick(item.district, lang) || pick(item.city, lang)].filter(Boolean).join(' · ')
  const url = `${SITE}/listings/${item.id}`

  async function share() {
    try {
      await Share.share({ message: `${price}\n${place}\n${url}`, url })
    } catch { /* cancelled */ }
  }

  return (
    <View style={styles.slide}>
      {item.video ? <VideoView player={player} style={styles.video} contentFit="cover" nativeControls={false} /> : <View style={styles.video} />}
      <View style={styles.shade} />
      <View style={styles.meta}>
        <Text style={styles.price}>{price}</Text>
        <Text style={styles.name}>{reelTitle(item)}</Text>
        <Text style={styles.place}>{place}</Text>
      </View>
      <View style={styles.actions}>
        <Pressable onPress={() => toggle('favorites', item)} style={[styles.round, light && styles.roundLight, liked && styles.roundOn]}>
          <Icon name="heart" size={28} color={liked ? '#e11d48' : (light ? colors.navy : '#fff')} filled={liked} />
        </Pressable>
        <Pressable onPress={share} style={[styles.round, light && styles.roundLight]}>
          <Icon name="share" size={22} color={light ? colors.navy : '#fff'} />
        </Pressable>
        <Pressable onPress={async () => { await Share.share({ message: url }); onToast(t('linkCopied')) }} style={[styles.round, light && styles.roundLight]}>
          <Icon name="copy" size={22} color={light ? colors.navy : '#fff'} />
        </Pressable>
        <Pressable onPress={onOpen} style={[styles.more, light && styles.moreLight]}>
          <Text style={styles.moreText}>{t('moreDetails')}</Text>
        </Pressable>
      </View>
    </View>
  )
}

export function ReelsScreen({ navigation }) {
  const { t } = useI18n()
  const [rows, setRows] = useState(null)
  const [index, setIndex] = useState(0)
  const [toast, setToast] = useState('')
  useEffect(() => {
    api('/api/listings/?has_video=1&sort=new&page_size=40')
      .then((data) => setRows((data.results || []).filter((row) => row.video)))
      .catch(() => setRows([]))
  }, [])
  useEffect(() => {
    if (!toast) return undefined
    const timer = setTimeout(() => setToast(''), 1800)
    return () => clearTimeout(timer)
  }, [toast])
  if (!rows) return <View style={styles.empty}><Text style={{ color: colors.muted }}>{t('loading')}</Text></View>
  if (!rows.length) return <View style={styles.empty}><Text style={{ color: colors.muted }}>{t('reelsEmpty')}</Text></View>
  return (
    <View style={{ flex: 1, backgroundColor: '#101820' }}>
      <FlatList
        data={rows}
        keyExtractor={(item) => String(item.id)}
        pagingEnabled
        snapToInterval={H - 150}
        decelerationRate="fast"
        onMomentumScrollEnd={(event) => setIndex(Math.round(event.nativeEvent.contentOffset.y / (H - 150)))}
        renderItem={({ item, index: i }) => (
          <Reel item={item} active={i === index} onToast={setToast} onOpen={() => navigation.navigate('Detail', { id: item.id })} />
        )}
      />
      {toast ? <Text style={styles.toast}>{toast}</Text> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  slide: { height: H - 150, backgroundColor: '#101820', justifyContent: 'flex-end' },
  video: { ...StyleSheet.absoluteFillObject },
  shade: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(16,24,32,0.18)' },
  meta: { paddingHorizontal: 16, paddingBottom: 8, maxWidth: '72%' },
  price: { color: '#fff', fontSize: 22, fontWeight: '700' },
  name: { color: '#fff', fontSize: 16, fontWeight: '700', marginTop: 4 },
  place: { color: '#fff', opacity: 0.9, marginTop: 2 },
  actions: { position: 'absolute', right: 12, bottom: 28, alignItems: 'center', gap: 12 },
  round: { width: 58, height: 58, borderRadius: 29, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(16,24,32,0.42)' },
  roundLight: { backgroundColor: 'rgba(255,255,255,0.88)' },
  roundOn: { backgroundColor: 'rgba(255,255,255,0.92)' },
  more: { minHeight: 40, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.9)', backgroundColor: 'rgba(16,24,32,0.35)', alignItems: 'center', justifyContent: 'center' },
  moreLight: { backgroundColor: 'rgba(31,59,92,0.55)' },
  moreText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.paper },
  toast: { position: 'absolute', bottom: 24, alignSelf: 'center', backgroundColor: '#fff', color: colors.navy, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, overflow: 'hidden', fontWeight: '700' },
})
