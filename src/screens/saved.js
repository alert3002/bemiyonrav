import { useEffect, useState } from 'react'
import { FlatList, Image, Modal, Pressable, ScrollView, Text, View } from 'react-native'
import { api, media } from '../api'
import { AppFrame } from '../chrome'
import { money, pick, roomsLabel } from '../format'
import { useI18n } from '../i18n'
import { usePrefs, useSaved } from '../state'
import { Btn, ListingCard, colors, useColors } from '../ui'

function SavedList({ navigation, bucket }) {
  const { t } = useI18n()
  const saved = useSaved()
  const c = useColors()
  const dark = usePrefs().theme === 'dark'
  const ink = dark ? '#fff' : colors.navy
  const rows = bucket === 'compare' ? saved.compare : saved.favorites
  const [drop, setDrop] = useState(null)
  return (
    <AppFrame navigation={navigation} title={t('navFavorites')} back>
      <FlatList
        style={{ flex: 1, backgroundColor: c.paper }}
        contentContainerStyle={{ padding: 16, paddingBottom: 28 }}
        data={rows}
        keyExtractor={(item) => String(item.id)}
        ListEmptyComponent={<Text style={{ color: ink }}>{t('favoritesText')}</Text>}
        renderItem={({ item }) => (
          <ListingCard
            item={item}
            favored={saved.favorites.some((row) => row.id === item.id)}
            chosen={saved.compare.some((row) => row.id === item.id)}
            onPress={() => navigation.navigate('Detail', { id: item.id })}
            onFav={() => setDrop(item)}
            onCompare={() => saved.toggle('compare', item)}
          />
        )}
      />
      <Modal visible={Boolean(drop)} transparent animationType="fade" onRequestClose={() => setDrop(null)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(20,40,61,0.45)', justifyContent: 'center', padding: 24 }}>
          <View style={{ backgroundColor: dark ? '#324860' : '#fff', borderRadius: 24, padding: 18 }}>
            <Text style={{ fontSize: 22, fontWeight: '700', color: ink }}>{t('favAsk')}</Text>
            <Text style={{ color: dark ? '#fff' : colors.muted, marginVertical: 10 }}>{t('favAskText')}</Text>
            <Btn title={t('compareYes')} onPress={() => { saved.toggle('favorites', drop); setDrop(null) }} />
            <Btn ghost title={t('compareNo')} onPress={() => setDrop(null)} />
          </View>
        </View>
      </Modal>
    </AppFrame>
  )
}

export function FavoritesScreen(props) {
  return <SavedList {...props} bucket="favorites" />
}

export function CompareScreen({ navigation }) {
  const { t, lang } = useI18n()
  const saved = useSaved()
  const c = useColors()
  const dark = usePrefs().theme === 'dark'
  const ink = dark ? '#e8eef5' : '#314a64'
  const labelInk = dark ? '#e8eef5' : '#1b2a3a'
  const sheet = dark ? '#324860' : '#fff'
  const head = dark ? '#15202b' : '#f7f9fb'
  const line = dark ? '#4a6278' : colors.line
  const [items, setItems] = useState([])
  const [drop, setDrop] = useState(null)
  const [shot, setShot] = useState({})
  const ids = saved.compare.map((row) => row.id).join(',')

  useEffect(() => {
    if (!ids) {
      setItems([])
      return undefined
    }
    let stop = false
    Promise.all(saved.compare.slice(0, 4).map((row) => api(`/api/listings/${row.id}/`).catch(() => row)))
      .then((rows) => { if (!stop) setItems(rows) })
    return () => { stop = true }
  }, [ids])

  const rows = [
    [t('priceLabel'), (item) => (item.price_deal ? t('priceDeal') : (item.price ? `${money(item.price)} ${t('somoniShort')}` : '—'))],
    [t('rooms'), (item) => roomsLabel(item.rooms, lang)],
    [t('floorLabel'), (item) => item.floor ?? '—'],
    [t('floorsHouse'), (item) => (item.floors_known === false ? '—' : (item.floors_total ?? '—'))],
    [t('detailArea'), (item) => (item.area != null && item.area !== '' ? `${Number(item.area)} ${t('m2')}` : '—')],
    [t('district'), (item) => pick(item.district, lang) || '—'],
    [t('street'), (item) => item.street || '—'],
    [t('furniture'), (item) => pick(item.furniture, lang) || '—'],
    [t('repairLabel'), (item) => pick(item.specs?.repair, lang) || '—'],
    [t('bathFilter'), (item) => pick(item.specs?.bathroom, lang) || '—'],
    [t('heatFilter'), (item) => pick(item.specs?.heating, lang) || '—'],
    [t('yearBuilt'), (item) => item.year || '—'],
  ]

  if (!items.length) {
    return (
      <View style={{ flex: 1, backgroundColor: c.paper, padding: 16 }}>
        <Text style={{ color: c.muted }}>{t('compareText')}</Text>
        <Pressable onPress={() => navigation.navigate('Listings')} style={{ alignSelf: 'center', marginTop: 18, minHeight: 44, paddingHorizontal: 18, borderRadius: 999, borderWidth: 1, borderColor: line, backgroundColor: sheet, justifyContent: 'center' }}>
          <Text style={{ color: dark ? '#e8eef5' : colors.navy, fontWeight: '700' }}>{t('compareAdd')}</Text>
        </Pressable>
      </View>
    )
  }

  return (
    <View style={{ flex: 1, backgroundColor: c.paper }}>
      <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 24 }}>
        <ScrollView horizontal>
          <View style={{ borderWidth: 1, borderColor: line, borderRadius: 24, overflow: 'hidden', backgroundColor: sheet }}>
            <View style={{ flexDirection: 'row', backgroundColor: sheet }}>
              <View style={{ width: 120, backgroundColor: sheet }} />
              {items.map((item) => {
                const photos = [
                  item.cover,
                  ...(item.photos || []).map((photo) => (typeof photo === 'string' ? photo : photo?.url)),
                ].filter(Boolean)
                const index = shot[item.id] || 0
                const cover = media(photos[index % (photos.length || 1)])
                return (
                  <View key={item.id} style={{ width: 220, padding: 12 }}>
                    <Pressable onPress={() => navigation.navigate('Detail', { id: item.id })} style={{ height: 148, borderRadius: 16, overflow: 'hidden', backgroundColor: dark ? '#243446' : '#e8edf3' }}>
                      {cover ? <Image source={{ uri: cover }} style={{ width: '100%', height: '100%' }} /> : null}
                      <Pressable onPress={() => setDrop(item)} style={{ position: 'absolute', right: 8, top: 8, width: 30, height: 30, borderRadius: 15, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ color: colors.navy, fontSize: 20, lineHeight: 22 }}>×</Text>
                      </Pressable>
                      {photos.length > 1 ? (
                        <View style={{ position: 'absolute', left: 8, right: 8, bottom: 8, flexDirection: 'row', justifyContent: 'space-between' }}>
                          <Pressable onPress={() => setShot((current) => ({ ...current, [item.id]: (index + photos.length - 1) % photos.length }))} style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.9)', alignItems: 'center', justifyContent: 'center' }}>
                            <Text style={{ color: colors.navy, fontWeight: '800' }}>‹</Text>
                          </Pressable>
                          <Pressable onPress={() => setShot((current) => ({ ...current, [item.id]: (index + 1) % photos.length }))} style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.9)', alignItems: 'center', justifyContent: 'center' }}>
                            <Text style={{ color: colors.navy, fontWeight: '800' }}>›</Text>
                          </Pressable>
                        </View>
                      ) : null}
                    </Pressable>
                  </View>
                )
              })}
            </View>
            {rows.map(([label, value]) => {
              const price = label === t('priceLabel')
              return (
                <View key={label} style={{ flexDirection: 'row', borderTopWidth: 1, borderTopColor: line }}>
                  <Text style={{ width: 120, padding: 14, color: labelInk, fontWeight: '700', backgroundColor: head }}>{label}</Text>
                  {items.map((item) => (
                    <Text key={item.id} style={{ width: 220, padding: 14, color: price ? (dark ? '#e8eef5' : colors.navy) : ink, fontWeight: price ? '800' : '600', fontSize: price ? 22 : 15, backgroundColor: sheet }}>{String(value(item))}</Text>
                  ))}
                </View>
              )
            })}
          </View>
        </ScrollView>
        {items.length < 4 ? (
          <Pressable onPress={() => navigation.navigate('Listings')} style={{ alignSelf: 'center', marginTop: 18, minHeight: 44, paddingHorizontal: 18, borderRadius: 999, borderWidth: 1, borderColor: line, backgroundColor: sheet, justifyContent: 'center' }}>
            <Text style={{ color: dark ? '#e8eef5' : colors.navy, fontWeight: '700' }}>{t('compareAdd')}</Text>
          </Pressable>
        ) : null}
      </ScrollView>
      <Modal visible={Boolean(drop)} transparent animationType="fade" onRequestClose={() => setDrop(null)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(20,32,48,0.55)', justifyContent: 'center', padding: 16 }}>
          <View style={{ backgroundColor: sheet, borderRadius: 28, padding: 28, alignItems: 'center' }}>
            <Text style={{ fontSize: 28, fontWeight: '700', color: dark ? '#e8eef5' : colors.navy, textAlign: 'center' }}>{t('compareAsk')}</Text>
            <Text style={{ color: c.muted, marginVertical: 12, textAlign: 'center' }}>{t('compareAskText')}</Text>
            <Pressable onPress={() => { saved.toggle('compare', drop); setDrop(null) }} style={{ alignSelf: 'stretch', minHeight: 48, borderRadius: 999, backgroundColor: colors.navy, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: '#fff', fontWeight: '700' }}>{t('compareYes')}</Text>
            </Pressable>
            <Pressable onPress={() => setDrop(null)} style={{ alignSelf: 'stretch', minHeight: 48, marginTop: 8, borderRadius: 999, borderWidth: 1, borderColor: line, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: dark ? '#e8eef5' : colors.navy, fontWeight: '700' }}>{t('compareNo')}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  )
}
