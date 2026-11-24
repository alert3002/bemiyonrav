import { useState } from 'react'
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { media } from './api'
import { floorText, money, pick, postedWhen } from './format'
import { useI18n } from './i18n'
import { Icon } from './icons'
import { palette, usePrefs } from './state'

export function useColors() {
  const prefs = usePrefs()
  return { ...colors, ...(palette(prefs?.theme) || {}) }
}

export const colors = {
  navy: '#1F3B5C',
  navy900: '#14283d',
  ink: '#1b2a3a',
  muted: '#5d6e80',
  line: '#e3e8ee',
  paper: '#f4f6f8',
  white: '#ffffff',
  gold: '#8d6a32',
  bad: '#b42318',
}

export function Screen({ children, scroll, pad = 16 }) {
  const c = useColors()
  if (scroll) {
    return <ScrollView style={[styles.screen, { backgroundColor: c.paper }]} contentContainerStyle={{ padding: pad, paddingBottom: 32 }}>{children}</ScrollView>
  }
  return <View style={[styles.screen, { padding: pad, backgroundColor: c.paper }]}>{children}</View>
}

export function H1({ children }) {
  return <Text style={styles.h1}>{children}</Text>
}

export function Muted({ children }) {
  return <Text style={styles.muted}>{children}</Text>
}

export function Btn({ title, onPress, ghost, disabled }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} style={[styles.btn, ghost && styles.ghost, disabled && styles.disabled]}>
      <Text style={[styles.btnText, ghost && styles.ghostText]}>{title}</Text>
    </Pressable>
  )
}

export function Field({ label, value, onChangeText, placeholder, keyboardType, multiline }) {
  return (
    <View style={styles.field}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#8aa0b8"
        keyboardType={keyboardType}
        multiline={multiline}
        style={[styles.input, multiline && styles.area]}
      />
    </View>
  )
}

export function LangSwitch() {
  const { lang, setLang } = useI18n()
  return (
    <View style={styles.langs}>
      {['ru', 'tj', 'zh'].map((code) => (
        <Pressable key={code} onPress={() => setLang(code)} style={[styles.lang, lang === code && styles.langOn]}>
          <Text style={[styles.langText, lang === code && styles.langTextOn]}>{code === 'zh' ? '中文' : code.toUpperCase()}</Text>
        </Pressable>
      ))}
    </View>
  )
}

function freshListing(item) {
  const raw = item.refreshed_at || item.created_at
  if (!raw) return false
  const age = Date.now() - new Date(raw).getTime()
  return age >= 0 && age < 3 * 24 * 60 * 60 * 1000
}

function feedFacts(item, lang, t) {
  const parts = []
  if (item.rooms != null) {
    if (lang === 'zh') parts.push(`${item.rooms}室`)
    else if (lang === 'tj') parts.push(`${item.rooms}-ҳуҷра`)
    else parts.push(`${item.rooms}-комн.`)
  }
  if (item.floor != null && item.floor !== '') parts.push(`${floorText(item)} ${t('floor')}`)
  if (item.area) parts.push(`${Number(item.area)} м²`)
  if (item.street) parts.push(item.street)
  return parts.join(', ')
}

export function VerifyBadge({ item }) {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const verified = item.verified !== false && item.ownership_confirmed !== false
  const label = !verified
    ? t('notVerified')
    : item.badge === 'agency' ? t('verifiedAgency') : t('verifiedOwner')
  return (
    <Pressable
      onPress={() => setOpen((value) => !value)}
      style={[styles.badge, verified ? styles.badgeOk : styles.badgeBad, open && styles.badgeOpen]}
    >
      <Icon name={verified ? 'check' : 'x'} size={15} color="#fff" />
      {open ? <Text style={styles.badgeText}>{label}</Text> : null}
    </Pressable>
  )
}

export function ListingCard({ item, onPress, onFav, onCompare, favored, chosen }) {
  const { lang, t } = useI18n()
  const { showPrices, theme } = usePrefs()
  const c = useColors()
  const dark = theme === 'dark'
  const photos = (item.photos?.length ? item.photos : (item.cover ? [item.cover] : []))
    .map((photo) => media(typeof photo === 'string' ? photo : photo?.url || photo))
    .filter(Boolean)
  const [index, setIndex] = useState(0)
  const safe = photos.length ? index % photos.length : 0
  const cover = photos[safe]
  const fresh = freshListing(item)
  return (
    <View style={[styles.card, { backgroundColor: c.white, borderColor: 'rgba(31,59,92,0.22)' }]}>
      <Pressable onPress={onPress} style={styles.media}>
        {cover ? <Image source={{ uri: cover }} style={styles.photo} /> : <View style={[styles.photo, { backgroundColor: '#62759A' }]} />}
        {item.plan === 'vip' ? <Text style={styles.flagVip}>VIP</Text> : null}
        {item.plan === 'top' ? <Text style={[styles.flagTop, item.plan === 'vip' && { left: 64 }]}>ТОП</Text> : null}
        {fresh ? <Text style={styles.flagNew}>{t('listingNew')}</Text> : null}
        {photos.length > 0 ? (
          <View style={styles.count}>
            <Icon name="camera" size={15} color="#24364c" />
            <Text style={styles.countText}>{photos.length}</Text>
          </View>
        ) : null}
        {photos.length > 1 ? (
          <>
            <Pressable style={[styles.arrow, styles.arrowL]} onPress={() => setIndex((n) => (n - 1 + photos.length) % photos.length)}>
              <View style={{ transform: [{ rotate: '180deg' }] }}><Icon name="chevron" size={16} color="#fff" /></View>
            </Pressable>
            <Pressable style={[styles.arrow, styles.arrowR]} onPress={() => setIndex((n) => (n + 1) % photos.length)}>
              <Icon name="chevron" size={16} color="#fff" />
            </Pressable>
            <View style={styles.dots}>
              {photos.map((_, dot) => <View key={dot} style={[styles.dot, dot === safe && styles.dotOn]} />)}
            </View>
          </>
        ) : null}
      </Pressable>
      <View style={styles.tools}>
        <Pressable onPress={onCompare} style={[styles.tool, chosen && styles.toolOn]}>
          <Icon name="scale" size={16} color={chosen ? '#fff' : '#24364c'} />
        </Pressable>
        <Pressable onPress={onFav} style={styles.tool}>
          <Icon name="heart" size={16} color={favored ? colors.navy : '#24364c'} filled={favored} />
        </Pressable>
      </View>
      <View style={styles.body}>
        <View style={styles.priceRow}>
          <Pressable onPress={onPress} style={{ flex: 1 }}>
            <Text style={[styles.price, { color: c.ink }]}>
              {item.price_deal ? t('priceDeal') : (!showPrices ? t('priceHidden') : money(item.price))}
              {!item.price_deal && showPrices ? <Text style={[styles.per, { color: c.muted }]}> {t('perMonth')}</Text> : null}
            </Text>
          </Pressable>
          <VerifyBadge item={item} />
        </View>
        <Pressable onPress={onPress}>
          <Text style={[styles.facts, { color: dark ? '#fff' : c.ink }]} numberOfLines={2}>{feedFacts(item, lang, t)}</Text>
        </Pressable>
        <Text style={[styles.when, { color: c.muted }]}>
          {item.district ? pick(item.district, lang) : ''}
          {item.district ? ' · ' : ''}
          {postedWhen(item.refreshed_at || item.created_at, lang)}
        </Text>
        <View style={styles.msgs}>
          {item.whatsapp ? <Icon name="whatsapp" size={18} color="#25D366" /> : null}
          {item.telegram ? <Icon name="telegram" size={18} color="#2AABEE" /> : null}
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  h1: { fontSize: 28, fontWeight: '700', color: colors.navy, marginBottom: 8 },
  muted: { color: colors.muted, fontSize: 14, lineHeight: 20, marginBottom: 12 },
  btn: { backgroundColor: colors.navy, borderRadius: 999, minHeight: 48, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18, marginTop: 8 },
  ghost: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line },
  disabled: { opacity: 0.6 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  ghostText: { color: colors.navy },
  field: { marginBottom: 12 },
  label: { color: colors.muted, fontWeight: '600', marginBottom: 6 },
  input: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, borderRadius: 16, minHeight: 48, paddingHorizontal: 14, color: colors.ink, fontSize: 16 },
  area: { minHeight: 110, textAlignVertical: 'top', paddingVertical: 12 },
  langs: { flexDirection: 'row', gap: 6 },
  lang: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: '#e7eef6' },
  langOn: { backgroundColor: colors.navy },
  langText: { color: colors.navy, fontWeight: '700', fontSize: 12 },
  langTextOn: { color: '#fff' },
  card: { backgroundColor: colors.white, borderRadius: 18, overflow: 'hidden', marginBottom: 16, borderWidth: 1.5 },
  media: { aspectRatio: 16 / 10, backgroundColor: '#62759A' },
  photo: { width: '100%', height: '100%' },
  tools: { position: 'absolute', top: 8, right: 8, gap: 6 },
  tool: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  toolOn: { backgroundColor: '#24364c' },
  body: { paddingHorizontal: 14, paddingTop: 12, paddingBottom: 14, gap: 6 },
  priceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  price: { color: colors.ink, fontSize: 22, fontWeight: '800', letterSpacing: -0.4 },
  badge: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  badgeOpen: { width: 'auto', minHeight: 32, paddingHorizontal: 10, borderRadius: 999, flexDirection: 'row', gap: 4 },
  badgeOk: { backgroundColor: '#1c8c4e' },
  badgeBad: { backgroundColor: '#d23b3b' },
  badgeText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  per: { fontSize: 12, fontWeight: '700', color: colors.muted },
  facts: { fontSize: 14, fontWeight: '600', lineHeight: 19 },
  when: { color: colors.muted, fontSize: 12, fontWeight: '500' },
  msgs: { flexDirection: 'row', gap: 12, marginTop: 2 },
  wa: { color: '#25D366', fontWeight: '800', fontSize: 13 },
  tg: { color: '#2AABEE', fontWeight: '800', fontSize: 13 },
  flagVip: { position: 'absolute', top: 10, left: 10, backgroundColor: '#f8f1e3', color: '#8d6a32', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5, fontWeight: '800', fontSize: 12, overflow: 'hidden' },
  flagTop: { position: 'absolute', top: 10, left: 10, backgroundColor: '#fff', color: colors.navy, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5, fontWeight: '800', fontSize: 12, overflow: 'hidden' },
  flagNew: { position: 'absolute', bottom: 10, left: 10, backgroundColor: '#1f7a4d', color: '#fff', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5, fontWeight: '800', fontSize: 12, overflow: 'hidden' },
  count: { position: 'absolute', right: 8, bottom: 8, backgroundColor: '#fff', borderRadius: 999, paddingHorizontal: 7, paddingVertical: 3, flexDirection: 'row', alignItems: 'center', gap: 4 },
  countText: { color: '#24364c', fontWeight: '800', fontSize: 12 },
  arrow: { position: 'absolute', top: '42%', width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(20,32,48,0.42)', alignItems: 'center', justifyContent: 'center' },
  arrowL: { left: 8 },
  arrowR: { right: 8 },
  dots: { position: 'absolute', left: 0, right: 0, bottom: 12, flexDirection: 'row', justifyContent: 'center', gap: 4 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.75)' },
  dotOn: { width: 14, borderRadius: 999, backgroundColor: '#fff' },
})
