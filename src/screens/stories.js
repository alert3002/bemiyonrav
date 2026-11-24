import { useEffect, useRef, useState } from 'react'
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { api, media } from '../api'
import { money, pick, roomsLabel } from '../format'
import { useI18n } from '../i18n'
import { useAuth, usePrefs } from '../state'
import { colors } from '../ui'

function StoryRing({ seen, gid, children }) {
  const grad = `storyRing${gid}`
  return (
    <View style={{ width: 68, height: 68, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={68} height={68} style={{ position: 'absolute' }}>
        <Defs>
          <LinearGradient id={grad} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#f58529" />
            <Stop offset="0.45" stopColor="#dd2a7b" />
            <Stop offset="0.75" stopColor="#8134af" />
            <Stop offset="1" stopColor="#515bd4" />
          </LinearGradient>
        </Defs>
        <Circle cx={34} cy={34} r={32} stroke={seen ? '#c5ccd6' : `url(#${grad})`} strokeWidth={3} fill="none" />
      </Svg>
      <View style={styles.avaWrap}>{children}</View>
    </View>
  )
}

const SEEN = 'bemiyona_story_seen'
const HOLD = 5000

export function StoriesRail({ navigation }) {
  const { t, lang } = useI18n()
  const { user } = useAuth()
  const dark = usePrefs().theme === 'dark'
  const insets = useSafeAreaInsets()
  const [groups, setGroups] = useState([])
  const [open, setOpen] = useState(null)
  const [index, setIndex] = useState(0)
  const [progress, setProgress] = useState(0)
  const paused = useRef(false)
  const started = useRef(0)

  function load() {
    api('/api/stories/', { auth: Boolean(user) })
      .then(async (rows) => {
        const seen = new Set(JSON.parse((await AsyncStorage.getItem(SEEN)) || '[]'))
        const list = (Array.isArray(rows) ? rows : []).map((group) => {
          const stories = (group.stories || []).map((story) => ({ ...story, seen: story.seen || seen.has(story.id) }))
          return { ...group, stories, seen: stories.length ? stories.every((story) => story.seen) : true }
        }).filter((group) => group.stories?.length)
        setGroups(list)
      })
      .catch(() => setGroups([]))
  }

  useEffect(() => { load() }, [user?.id])

  const story = open?.stories?.[index]
  const listing = story?.listing

  useEffect(() => {
    if (!story) return undefined
    let stop = false
    AsyncStorage.getItem(SEEN).then((raw) => {
      const seen = new Set(JSON.parse(raw || '[]'))
      seen.add(story.id)
      AsyncStorage.setItem(SEEN, JSON.stringify([...seen].slice(-400)))
    })
    api(`/api/stories/${story.id}/view/`, { method: 'POST', body: {} }).catch(() => {})
    setGroups((rows) => rows.map((group) => {
      if ((group.id || group.name) !== (open.id || open.name)) return group
      const stories = group.stories.map((row) => (row.id === story.id ? { ...row, seen: true } : row))
      return { ...group, stories, seen: stories.every((row) => row.seen) }
    }))
    started.current = Date.now()
    paused.current = false
    setProgress(0)
    const timer = setInterval(() => {
      if (stop) return
      if (paused.current) {
        started.current += 80
        return
      }
      const ratio = Math.min(1, (Date.now() - started.current) / HOLD)
      setProgress(ratio)
      if (ratio >= 1) {
        clearInterval(timer)
        if (index + 1 >= open.stories.length) setOpen(null)
        else setIndex(index + 1)
      }
    }, 80)
    return () => { stop = true; clearInterval(timer) }
  }, [story?.id, index])

  if (!groups.length) return null
  const title = listing
    ? [listing.street, listing.district ? pick(listing.district, lang) : ''].filter(Boolean).join(' · ')
    : (open?.name || '')
  const meta = listing
    ? [
      listing.price_deal ? t('priceDeal') : `${money(listing.price)} ${t('perMonth')}`,
      listing.rooms ? roomsLabel(listing.rooms, lang) : '',
    ].filter(Boolean).join(' · ')
    : ''

  function go(next) {
    if (!open) return
    if (next < 0 || next >= open.stories.length) setOpen(null)
    else setIndex(next)
  }

  return (
    <>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {groups.map((group, place) => {
          const label = group.stories?.[0]?.listing?.street || group.name || t('storiesTitle')
          const photo = group.photo || group.stories?.[0]?.image
          return (
            <Pressable key={group.id || group.name} onPress={() => { setOpen(group); setIndex(0) }} style={styles.chip}>
              <StoryRing seen={group.seen} gid={place}>
                {photo ? <Image source={{ uri: media(photo) }} style={styles.ava} /> : <Text style={[styles.letter, dark && { color: '#c5d4e4' }]}>{label.slice(0, 1).toUpperCase()}</Text>}
              </StoryRing>
              <Text numberOfLines={1} style={[styles.name, { color: dark ? '#e8eef5' : colors.ink }]}>{label}</Text>
            </Pressable>
          )
        })}
      </ScrollView>
      <Modal visible={Boolean(open)} animationType="fade" onRequestClose={() => setOpen(null)}>
        <View style={[styles.viewer, { paddingTop: insets.top + 8, paddingBottom: Math.max(insets.bottom, 12) }]}>
          <View style={styles.bars}>
            {(open?.stories || []).map((row, i) => (
              <View key={row.id} style={styles.bar}>
                <View style={[styles.barFill, { width: i < index ? '100%' : i === index ? `${progress * 100}%` : '0%' }]} />
              </View>
            ))}
          </View>
          <View style={styles.head}>
            <View style={styles.user}>
              <View style={styles.avaSm}>
                {(open?.photo || story?.image) ? <Image source={{ uri: media(open?.photo || story?.image) }} style={styles.avaSmImg} /> : <Text style={styles.letterSm}>{title.slice(0, 1).toUpperCase()}</Text>}
              </View>
              <View style={{ flex: 1 }}>
                <Text numberOfLines={1} style={styles.caption}>{title}</Text>
                {meta ? <Text numberOfLines={1} style={styles.meta}>{meta}</Text> : null}
              </View>
            </View>
            <Pressable onPress={() => setOpen(null)} hitSlop={8}><Text style={styles.x}>×</Text></Pressable>
          </View>
          <View style={styles.media}>
            {story?.image ? <Image source={{ uri: media(story.image) }} style={styles.full} resizeMode="contain" /> : null}
            {meta ? (
              <View style={styles.card} pointerEvents="none">
                <Text style={styles.cardTitle}>{title}</Text>
                <Text style={styles.cardMeta}>{meta}</Text>
              </View>
            ) : null}
            <View style={styles.hits}>
              <Pressable style={styles.hit} onPress={() => go(index - 1)} onPressIn={() => { paused.current = true }} onPressOut={() => { paused.current = false }} />
              <Pressable style={styles.hit} onPress={() => go(index + 1)} onPressIn={() => { paused.current = true }} onPressOut={() => { paused.current = false }} />
            </View>
          </View>
          {listing?.id ? (
            <Pressable style={styles.open} onPress={() => { setOpen(null); navigation.navigate('Detail', { id: listing.id }) }}>
              <Text style={styles.openText}>{t('storyOpenListing')}</Text>
            </Pressable>
          ) : null}
        </View>
      </Modal>
    </>
  )
}

const styles = StyleSheet.create({
  row: { gap: 12, paddingVertical: 4, paddingHorizontal: 2 },
  chip: { width: 76, alignItems: 'center', gap: 6 },
  avaWrap: { width: 58, height: 58, borderRadius: 29, overflow: 'hidden', backgroundColor: '#e8edf3', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#101820' },
  ava: { width: 58, height: 58 },
  letter: { fontWeight: '800', color: '#6b7785', fontSize: 20 },
  name: { width: 76, fontSize: 12, fontWeight: '700', textAlign: 'center' },
  viewer: { flex: 1, backgroundColor: '#0b1016', paddingHorizontal: 10 },
  bars: { flexDirection: 'row', gap: 4, paddingBottom: 8 },
  bar: { flex: 1, height: 3, borderRadius: 99, backgroundColor: 'rgba(255,255,255,0.28)', overflow: 'hidden' },
  barFill: { height: 3, backgroundColor: '#fff' },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 4, paddingBottom: 10 },
  user: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  avaSm: { width: 32, height: 32, borderRadius: 16, overflow: 'hidden', backgroundColor: '#243446', alignItems: 'center', justifyContent: 'center' },
  avaSmImg: { width: 32, height: 32 },
  letterSm: { color: '#fff', fontWeight: '800', fontSize: 13 },
  caption: { color: '#fff', fontSize: 15, fontWeight: '700' },
  meta: { color: 'rgba(255,255,255,0.78)', fontSize: 12, fontWeight: '600', marginTop: 2 },
  x: { color: '#fff', fontSize: 28, width: 36, textAlign: 'center' },
  media: { flex: 1, borderRadius: 18, overflow: 'hidden', backgroundColor: '#151b24' },
  full: { width: '100%', height: '100%' },
  card: { position: 'absolute', left: 12, right: 12, bottom: 14, borderRadius: 14, padding: 12, backgroundColor: 'rgba(11,16,22,0.72)', gap: 4 },
  cardTitle: { color: '#fff', fontSize: 15, fontWeight: '700' },
  cardMeta: { color: 'rgba(255,255,255,0.86)', fontSize: 13, fontWeight: '600' },
  hits: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, flexDirection: 'row', justifyContent: 'space-between' },
  hit: { width: '42%' },
  open: { marginTop: 10, minHeight: 46, borderRadius: 14, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  openText: { color: colors.navy, fontWeight: '800' },
})
