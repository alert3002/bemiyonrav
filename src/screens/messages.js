import { useEffect, useRef, useState } from 'react'
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native'
import { api } from '../api'
import { errorText, useI18n } from '../i18n'
import { Icon } from '../icons'
import { useAuth, usePrefs } from '../state'
import { colors, useColors } from '../ui'

function peerLabel(peer, t) {
  if (peer?.name) return peer.name
  return peer?.side === 'owner' ? t('peerOwner') : t('peerClient')
}

function clock(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

function whenShort(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  if (date.toDateString() === new Date().toDateString()) return clock(value)
  return `${date.getDate()}.${date.getMonth() + 1}`
}

export function MessagesScreen({ route, navigation }) {
  const { t } = useI18n()
  const { user } = useAuth()
  const c = useColors()
  const dark = usePrefs().theme === 'dark'
  const ink = dark ? '#e8eef5' : '#1b2a3a'
  const card = dark ? '#324860' : '#fff'
  const line = dark ? '#4a6278' : c.line
  const muted = dark ? '#a9b8c8' : c.muted
  const listingId = route.params?.listingId
  const [threads, setThreads] = useState([])
  const [active, setActive] = useState(null)
  const [messages, setMessages] = useState([])
  const [draft, setDraft] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const [own, setOwn] = useState(false)
  const [busy, setBusy] = useState(false)
  const [ready, setReady] = useState(false)
  const log = useRef(null)

  useEffect(() => {
    if (!user) return undefined
    let stop = false
    setReady(false)
    setError('')
    setNote('')
    async function start() {
      try {
        if (listingId) {
          const data = await api('/api/messages/threads/', { method: 'POST', body: { listing_id: Number(listingId) } })
          if (stop) return
          if (data.owner) {
            setOwn(true)
            setThreads(data.threads || [])
            setActive(null)
            setMessages([])
          } else {
            setOwn(false)
            setActive(data.thread)
            setMessages(data.messages || [])
            const list = await api('/api/messages/threads/')
            if (!stop) setThreads(list.results || [])
          }
        } else {
          const list = await api('/api/messages/threads/')
          if (stop) return
          setOwn(false)
          setThreads(list.results || [])
          setActive(null)
          setMessages([])
        }
      } catch (err) {
        if (!stop) setError(errorText(err, t))
      } finally {
        if (!stop) setReady(true)
      }
    }
    start()
    return () => { stop = true }
  }, [user, listingId])

  useEffect(() => {
    if (!active?.id) return undefined
    let stop = false
    const timer = setInterval(() => {
      api(`/api/messages/threads/${active.id}/`)
        .then((data) => {
          if (stop) return
          setMessages(data.messages || [])
          if (data.thread) setActive(data.thread)
        })
        .catch(() => {})
    }, 4000)
    return () => { stop = true; clearInterval(timer) }
  }, [active?.id])

  async function openThread(row) {
    setError('')
    setNote('')
    setActive(row)
    try {
      const data = await api(`/api/messages/threads/${row.id}/`)
      setActive(data.thread)
      setMessages(data.messages || [])
      setThreads((current) => current.map((item) => (item.id === row.id ? { ...item, unread: 0 } : item)))
    } catch (err) {
      setError(errorText(err, t))
    }
  }

  async function send() {
    const text = draft.trim()
    if (!text || !active || busy) return
    setBusy(true)
    setError('')
    try {
      const data = await api(`/api/messages/threads/${active.id}/`, { method: 'POST', body: { text } })
      setMessages((current) => [...current, data.message])
      setDraft('')
      setNote(data.phones_removed ? t('messagesPhoneCut') : '')
      setThreads((current) => current.map((item) => (item.id === active.id ? { ...item, last: data.message?.body } : item)))
    } catch (err) {
      setNote('')
      setError(errorText(err, t))
    } finally {
      setBusy(false)
    }
  }

  if (!user) {
    return (
      <View style={{ flex: 1, backgroundColor: c.paper, justifyContent: 'center', padding: 24 }}>
        <Pressable onPress={() => navigation.navigate('Login')} style={{ minHeight: 48, borderRadius: 999, backgroundColor: colors.navy, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: '#fff', fontWeight: '700' }}>{t('navLogin')}</Text>
        </Pressable>
      </View>
    )
  }

  return (
    <View style={{ flex: 1, backgroundColor: c.paper, padding: 12 }}>
      {!active ? (
        <>
          <Text style={{ color: ink, fontSize: 22, fontWeight: '800', marginBottom: 4 }}>{t('messagesTitle')}</Text>
          <Text style={{ color: muted, fontSize: 13, marginBottom: 10 }}>{own ? t('self_chat') : t('messagesLead')}</Text>
        </>
      ) : null}
      {error ? <Text style={{ color: colors.bad, marginBottom: 8 }}>{error}</Text> : null}
      {!active ? (
        <ScrollView style={{ flex: 1, backgroundColor: card, borderRadius: 28, borderWidth: 1, borderColor: line }} contentContainerStyle={{ padding: 8, gap: 4 }}>
          {!ready ? <Text style={{ color: muted, padding: 16 }}>{t('loading')}</Text> : null}
          {ready && !threads.length ? <Text style={{ color: muted, padding: 16 }}>{t('messagesEmpty')}</Text> : null}
          {threads.map((row) => {
            const on = false
            const name = peerLabel(row.peer, t)
            return (
              <Pressable key={row.id} onPress={() => openThread(row)} style={{ minHeight: 68, borderRadius: 16, paddingVertical: 10, paddingHorizontal: 12, paddingRight: row.unread > 0 ? 36 : 12, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: on ? (dark ? '#3d628c' : '#e7eef6') : 'transparent' }}>
                <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: colors.navy, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ color: '#fff', fontWeight: '800', fontSize: 16 }}>{name.slice(0, 1)}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
                    <Text numberOfLines={1} style={{ flex: 1, color: ink, fontWeight: '700', fontSize: 15 }}>{name}</Text>
                    <Text style={{ color: muted, fontSize: 12, fontWeight: '600' }}>{whenShort(row.updated_at)}</Text>
                  </View>
                  <Text numberOfLines={1} style={{ color: muted, fontWeight: '600', fontSize: 13 }}>{row.listing?.street}</Text>
                  <Text numberOfLines={1} style={{ color: muted, fontWeight: '600', fontSize: 13 }}>{row.last || t('messagesStart')}</Text>
                </View>
                {row.unread > 0 ? (
                  <View style={{ position: 'absolute', right: 10, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: '#d23b3b', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 }}>
                    <Text style={{ color: '#fff', fontSize: 11, fontWeight: '800' }}>{row.unread}</Text>
                  </View>
                ) : null}
              </Pressable>
            )
          })}
        </ScrollView>
      ) : (
        <View style={{ flex: 1, backgroundColor: card, borderRadius: 28, borderWidth: 1, borderColor: line, overflow: 'hidden' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderBottomWidth: 1, borderBottomColor: line, flexWrap: 'wrap' }}>
            <Pressable onPress={() => { setActive(null); setMessages([]) }} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: dark ? '#243446' : '#eef3f8', alignItems: 'center', justifyContent: 'center' }}>
              <View style={{ transform: [{ rotate: '180deg' }] }}>
                <Icon name="chevron" size={18} color={dark ? '#fff' : colors.navy} />
              </View>
            </Pressable>
            <Text style={{ color: ink, fontWeight: '800', fontSize: 16 }}>{peerLabel(active.peer, t)}</Text>
            {active.listing?.id ? (
              <Pressable onPress={() => navigation.navigate('Detail', { id: active.listing.id })} style={{ width: '100%', marginLeft: 44 }}>
                <Text style={{ color: muted, fontWeight: '700' }}>{active.listing.street}</Text>
              </Pressable>
            ) : null}
          </View>
          <ScrollView ref={log} style={{ flex: 1 }} contentContainerStyle={{ padding: 16, gap: 8 }} onContentSizeChange={() => log.current?.scrollToEnd({ animated: false })}>
            {!messages.length ? <Text style={{ color: muted }}>{t('messagesStart')}</Text> : null}
            {messages.map((row) => (
              <View key={row.id} style={{ maxWidth: '78%', alignSelf: row.mine ? 'flex-end' : 'flex-start', backgroundColor: row.mine ? colors.navy : (dark ? '#243446' : '#eef3f8'), borderRadius: 18, borderBottomRightRadius: row.mine ? 6 : 18, paddingVertical: 10, paddingHorizontal: 14 }}>
                <Text style={{ color: row.mine || dark ? '#fff' : ink, lineHeight: 20 }}>{row.body}</Text>
                <Text style={{ color: row.mine ? 'rgba(255,255,255,0.72)' : (dark ? '#d5e2ef' : '#7d8fa1'), fontSize: 11, fontWeight: '600', marginTop: 4 }}>{clock(row.created_at)}</Text>
              </View>
            ))}
          </ScrollView>
          {note ? <Text style={{ color: colors.gold || '#8d6a32', fontWeight: '700', fontSize: 13, marginHorizontal: 16, marginBottom: 8 }}>{note}</Text> : null}
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-end', padding: 12, borderTopWidth: 1, borderTopColor: line }}>
            <TextInput
              value={draft}
              onChangeText={(value) => { setDraft(value); setError('') }}
              placeholder={t('messagesPlaceholder')}
              placeholderTextColor={muted}
              multiline
              maxLength={2000}
              style={{ flex: 1, minHeight: 52, maxHeight: 120, borderWidth: 1, borderColor: line, borderRadius: 18, backgroundColor: dark ? '#243446' : '#fff', color: ink, paddingHorizontal: 14, paddingVertical: 12 }}
            />
            <Pressable disabled={busy || !draft.trim()} onPress={send} style={{ minHeight: 48, paddingHorizontal: 16, borderRadius: 999, backgroundColor: colors.navy, alignItems: 'center', justifyContent: 'center', opacity: busy || !draft.trim() ? 0.5 : 1 }}>
              <Text style={{ color: '#fff', fontWeight: '700' }}>{t('messagesSend')}</Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  )
}
