import { useEffect, useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { api } from './api'
import { useI18n } from './i18n'
import { Icon } from './icons'
import { useAuth, useMenu, usePrefs, useSaved } from './state'
import { colors, useColors } from './ui'

export function AppFrame({ navigation, title, back, children }) {
  const { t } = useI18n()
  const { user } = useAuth()
  const { favorites, compare } = useSaved()
  const { setOpen } = useMenu()
  const c = useColors()
  const dark = usePrefs().theme === 'dark'
  const insets = useSafeAreaInsets()
  const [menu, setMenu] = useState(false)
  const [pushOpen, setPushOpen] = useState(false)
  const [pushes, setPushes] = useState([])
  const ink = dark ? '#fff' : colors.navy

  function closeMenu() {
    setMenu(false)
    setOpen(false)
  }
  useEffect(() => { setOpen(menu) }, [menu, setOpen])

  const links = [
    ['home', t('navListings'), () => navigation.navigate('Listings')],
    ['message', t('navMessages'), () => navigation.navigate('Messages')],
    ['scale', compare.length ? `${t('navCompare')} (${compare.length})` : t('navCompare'), () => navigation.navigate('Compare')],
    ['reels', t('navReels'), () => navigation.navigate('Reels')],
    ['heart', favorites.length ? `${t('navFavorites')} (${favorites.length})` : t('navFavorites'), () => navigation.navigate('Favorites'), favorites.length > 0],
    ['user', user ? t('navProfile') : t('navLogin'), () => navigation.navigate(user ? 'Cabinet' : 'Login', user ? undefined : { after: 'Cabinet' })],
  ]

  return (
    <View style={{ flex: 1, backgroundColor: c.paper }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 64, paddingHorizontal: 16, paddingTop: insets.top, backgroundColor: dark ? 'rgba(16,24,32,0.92)' : 'rgba(255,255,255,0.92)', borderBottomWidth: 1, borderBottomColor: c.line }}>
        {back ? (
          <BackButton
            dark={dark}
            onPress={() => {
              closeMenu()
              if (navigation.canGoBack()) navigation.goBack()
              else navigation.navigate('Home')
            }}
          />
        ) : null}
        <Text style={{ flex: 1, fontWeight: '800', fontSize: 16, color: dark ? '#fff' : colors.navy }} numberOfLines={1}>{title}</Text>
        <Pressable style={[round, dark && { backgroundColor: '#fff', borderColor: '#fff' }]} onPress={async () => {
          closeMenu()
          setPushOpen((value) => !value)
          if (!user) return
          try { setPushes((await api('/api/me/pushes/')).results || []) } catch { setPushes([]) }
        }}>
          <Icon name="bell" size={20} color="#111" />
        </Pressable>
        <Pressable style={[round, dark && { backgroundColor: '#fff', borderColor: '#fff' }, menu && { backgroundColor: '#111', borderColor: '#111' }]} onPress={() => { setPushOpen(false); setMenu((value) => !value) }}>
          {menu ? <Icon name="x" size={20} color="#fff" /> : (
            <View style={{ width: 18, gap: 4 }}>
              <View style={bar} />
              <View style={bar} />
              <View style={bar} />
            </View>
          )}
        </Pressable>
      </View>
      <View style={{ flex: 1 }}>
        {children}
        {menu ? (
          <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, zIndex: 20, backgroundColor: dark ? '#101820' : '#fff', justifyContent: 'center', paddingHorizontal: 16 }}>
            <View style={{ width: '100%', maxWidth: 360, alignSelf: 'center', gap: 10 }}>
              <Pressable style={{ minHeight: 54, borderRadius: 16, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: dark ? '#243446' : '#e7eef6' }} onPress={() => { closeMenu(); navigation.navigate('Offers') }}>
                <View style={{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: dark ? 'rgba(255,255,255,0.16)' : '#fff' }}>
                  <Icon name="assist" size={18} color={ink} />
                </View>
                <View style={{ alignItems: 'center' }}>
                  <Text style={{ color: ink, fontWeight: '700', fontSize: 13 }}>{t('navAssist')}</Text>
                  <Text style={{ color: dark ? '#a9b8c8' : colors.muted, fontWeight: '600', fontSize: 11 }}>{t('navAssistHint')}</Text>
                </View>
              </Pressable>
              {links.map(([icon, label, go, filled]) => (
                <Pressable key={label} style={{ minHeight: 48, borderRadius: 14, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: dark ? '#1b2836' : '#f3f6fa' }} onPress={() => { closeMenu(); go() }}>
                  <Icon name={icon} size={20} color={ink} filled={Boolean(filled)} />
                  <Text style={{ color: ink, fontWeight: '700', fontSize: 16 }}>{label}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}
        {pushOpen ? (
          <View style={{ position: 'absolute', right: 12, top: 8, width: 280, zIndex: 30, borderRadius: 16, borderWidth: 1, overflow: 'hidden', backgroundColor: dark ? '#1b2836' : '#fff', borderColor: c.line }}>
            {!user ? <Text style={{ color: c.muted, padding: 16, textAlign: 'center' }}>{t('pushLogin')}</Text> : null}
            {user && !pushes.length ? <Text style={{ color: c.muted, padding: 16, textAlign: 'center' }}>{t('pushEmpty')}</Text> : null}
            {pushes.map((item) => (
              <Text key={item.id} style={{ color: dark ? '#fff' : c.ink, fontWeight: '700', paddingHorizontal: 14, paddingVertical: 10 }}>{item.title}</Text>
            ))}
            <Pressable onPress={() => { setPushOpen(false); navigation.navigate(user ? 'Notifications' : 'Login', user ? undefined : { after: 'Notifications' }) }}>
              <Text style={{ color: dark ? '#fff' : colors.navy, textAlign: 'center', fontWeight: '700', padding: 12 }}>{t('pushSettings')}</Text>
            </Pressable>
          </View>
        ) : null}
      </View>
    </View>
  )
}

export function BackButton({ onPress, dark }) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      style={{
        width: 36,
        height: 36,
        flexGrow: 0,
        flexShrink: 0,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: dark ? '#3d4c5e' : '#e4eaf0',
      }}
    >
      <View style={{ transform: [{ rotate: '180deg' }] }}>
        <Icon name="chevron" size={18} color={dark ? '#fff' : '#1f3b5c'} />
      </View>
    </Pressable>
  )
}

const round = {
  width: 44,
  height: 44,
  borderRadius: 22,
  borderWidth: 1,
  borderColor: '#111',
  backgroundColor: '#fff',
  alignItems: 'center',
  justifyContent: 'center',
}
const bar = { height: 2, borderRadius: 1, backgroundColor: '#111' }
