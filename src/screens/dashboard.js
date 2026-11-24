import { useEffect, useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { api } from '../api'
import { dashText } from '../dash-text'
import { money } from '../format'
import { errorText, useI18n } from '../i18n'
import { useAuth } from '../state'
import { Btn, Field, Screen, colors } from '../ui'

export function DashboardScreen({ navigation }) {
  const { lang } = useI18n()
  const s = (key) => dashText(lang, key)
  const [data, setData] = useState(null)
  useEffect(() => { api('/api/manage/stats/').then(setData).catch(() => {}) }, [])
  if (!data) return <Screen><Text>{s('loading')}</Text></Screen>
  return (
    <Screen scroll>
      <Text style={{ fontSize: 26, fontWeight: '700', color: colors.navy }}>{s('overview')}</Text>
      <Text style={{ color: colors.ink, marginVertical: 8 }}>{s('onSite')}: {data.published} · {s('pending')}: {data.pending}</Text>
      <Btn title={s('listings')} onPress={() => navigation.navigate('DashListings')} />
      <Btn ghost title={s('suggestions')} onPress={() => navigation.navigate('DashSuggestions')} />
      <Btn ghost title={s('users')} onPress={() => navigation.navigate('DashUsers')} />
      <Btn ghost title={s('tariffs')} onPress={() => navigation.navigate('DashTariffs')} />
      <Btn ghost title={s('geo')} onPress={() => navigation.navigate('DashGeo')} />
      <Btn ghost title={s('dicts')} onPress={() => navigation.navigate('DashDicts')} />
      <Btn ghost title={s('settings')} onPress={() => navigation.navigate('DashSettings')} />
      {(data.latest_pending || []).map((item) => (
        <Pressable key={item.id} onPress={() => navigation.navigate('DashListing', { id: item.id })} style={{ backgroundColor: '#fff', borderRadius: 16, padding: 12, marginTop: 8 }}>
          <Text style={{ fontWeight: '700' }}>{item.street} · {money(item.price)}</Text>
        </Pressable>
      ))}
    </Screen>
  )
}

const STATUS_KEYS = ['', 'pending', 'published', 'rejected', 'expired', 'archived', 'draft']

export function DashListingsScreen({ navigation }) {
  const { lang } = useI18n()
  const s = (key) => dashText(lang, key)
  const [status, setStatus] = useState('pending')
  const [q, setQ] = useState('')
  const [query, setQuery] = useState('')
  const [somonUrl, setSomonUrl] = useState('')
  const [note, setNote] = useState('')
  const [rows, setRows] = useState([])
  function load() {
    const search = new URLSearchParams()
    if (status) search.set('status', status)
    if (query) search.set('q', query)
    api(`/api/manage/listings/?${search}`).then(setRows).catch(() => setRows([]))
  }
  useEffect(load, [status, query])
  const list = Array.isArray(rows) ? rows : (rows.results || [])
  return (
    <Screen scroll>
      <Field label={s('somonLink')} value={somonUrl} onChangeText={setSomonUrl} placeholder="https://somon.tj/adv/..." />
      <Btn title={s('fetch')} onPress={async () => {
        try {
          const result = await api('/api/manage/somon/', { method: 'POST', body: { url: somonUrl } })
          setNote(result.created ? `${s('added')} ${result.path || ''}` : `${s('already')} ${result.path || ''}`)
          setSomonUrl('')
          load()
        } catch (err) {
          setNote(err.code === 'need_phone' ? s('needPhone') : (String(err.code || '').includes(' ') ? err.code : s('error')))
        }
      }} />
      {note ? <Text style={{ color: colors.muted, marginTop: 6 }}>{note}</Text> : null}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginVertical: 10 }}>
        {STATUS_KEYS.map((key) => (
          <Pressable key={key || 'all'} onPress={() => setStatus(key)} style={{ borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: status === key ? colors.navy : '#fff' }}>
            <Text style={{ color: status === key ? '#fff' : colors.navy, fontWeight: '700' }}>{key ? s(key) : s('allStatuses')}</Text>
          </Pressable>
        ))}
      </View>
      <Field value={q} onChangeText={setQ} placeholder={s('searchPlace')} />
      <Btn ghost title={s('show')} onPress={() => setQuery(q)} />
      {list.map((item) => (
        <Pressable key={item.id} onPress={() => navigation.navigate('DashListing', { id: item.id })} style={{ backgroundColor: '#fff', borderRadius: 16, padding: 12, marginBottom: 8 }}>
          <Text style={{ fontWeight: '700', color: colors.ink }}>#{item.id} {item.street}</Text>
          <Text>{money(item.price)} · {s(item.status)} · {item.owner?.phone_display || ''}</Text>
        </Pressable>
      ))}
    </Screen>
  )
}

export function DashListingScreen({ route, navigation }) {
  const { id } = route.params
  const { lang } = useI18n()
  const { user } = useAuth()
  const s = (key) => dashText(lang, key)
  const [item, setItem] = useState(null)
  const [reason, setReason] = useState('')
  const [note, setNote] = useState('')
  const manager = user?.role === 'admin' || user?.role === 'chief_admin'
  function load() { api(`/api/manage/listings/${id}/`).then(setItem).catch(() => {}) }
  useEffect(load, [id])
  async function run(action, body = {}) {
    try {
      await api(`/api/manage/listings/${id}/${action}/`, { method: 'POST', body })
      setNote(s('done'))
      load()
    } catch (err) {
      setNote(errorText(err, (key) => key))
    }
  }
  if (!item) return <Screen><Text>{s('loading')}</Text></Screen>
  return (
    <Screen scroll>
      <Text style={{ fontSize: 22, fontWeight: '700', color: colors.navy }}>{item.street}</Text>
      <Text style={{ color: colors.muted, marginVertical: 6 }}>{s(item.status)} · {s(item.payment_status)} · {item.plan} · {item.owner?.phone_display}</Text>
      {item.rejection_reason ? <Text style={{ color: colors.bad }}>{s('rejectReason')} {item.rejection_reason}</Text> : null}
      {note ? <Text style={{ color: colors.navy }}>{note}</Text> : null}
      <Btn title={s('publish')} onPress={() => run('publish')} />
      {manager && item.payment_status === 'unpaid' ? <Btn ghost title={s('paidGot')} onPress={() => run('pay')} /> : null}
      <Field label={s('rejectWhy')} value={reason} onChangeText={setReason} />
      <Btn ghost title={s('reject')} onPress={() => run('reject', { reason })} />
      {manager ? <Btn ghost title={s('remove')} onPress={async () => { await api(`/api/manage/listings/${id}/`, { method: 'DELETE' }); navigation.goBack() }} /> : null}
      <Btn ghost title={s('edit')} onPress={() => navigation.navigate('Post', { id: item.id })} />
      <Text style={{ fontWeight: '700', color: colors.navy, marginTop: 12 }}>{s('history')}</Text>
      {(item.events || []).map((event) => <Text key={event.id} style={{ color: colors.ink, marginTop: 4 }}>{event.action}{event.note ? ` · ${event.note}` : ''}</Text>)}
    </Screen>
  )
}

export function DashSuggestionsScreen() {
  const { lang } = useI18n()
  const s = (key) => dashText(lang, key)
  const [rows, setRows] = useState([])
  function load() {
    api('/api/manage/suggestions/?status=new').then((data) => setRows(Array.isArray(data) ? data : (data.results || []))).catch(() => {})
  }
  useEffect(load, [])
  return (
    <Screen scroll>
      {rows.map((item) => (
        <View key={item.id} style={{ backgroundColor: '#fff', borderRadius: 16, padding: 12, marginBottom: 8 }}>
          <Text style={{ fontWeight: '700' }}>{item.name} · {item.phone}</Text>
          <Text style={{ marginVertical: 6 }}>{item.text}</Text>
          <Btn title={s('read')} onPress={async () => { await api(`/api/manage/suggestions/${item.id}/`, { method: 'POST', body: { action: 'read' } }); load() }} />
          <Btn ghost title={s('close')} onPress={async () => { await api(`/api/manage/suggestions/${item.id}/`, { method: 'POST', body: { action: 'done' } }); load() }} />
        </View>
      ))}
    </Screen>
  )
}

const ROLE_KEYS = ['chief_admin', 'admin', 'moderator', 'owner', 'client', 'agency']
const CLIENT_PLANS = ['simple', 'top', 'vip']

export function DashUsersScreen() {
  const { lang } = useI18n()
  const { user } = useAuth()
  const s = (key) => dashText(lang, key)
  const [rows, setRows] = useState([])
  const [days, setDays] = useState({})
  const [limits, setLimits] = useState({})
  function load() { api('/api/manage/users/').then((data) => setRows(Array.isArray(data) ? data : [])).catch(() => {}) }
  useEffect(load, [])
  async function patch(id, body) { await api(`/api/manage/users/${id}/`, { method: 'PATCH', body }); load() }
  if (user?.role === 'moderator') return <Screen><Text>{s('noRights')}</Text></Screen>
  return (
    <Screen scroll>
      {rows.map((item) => (
        <View key={item.id} style={{ backgroundColor: '#fff', borderRadius: 16, padding: 12, marginBottom: 8 }}>
          <Text style={{ fontWeight: '700' }}>{item.phone_display} · {item.name || '—'}</Text>
          <Text>{s(item.role)} · Somon {item.somon_enabled ? s('active') : s('inactive')}</Text>
          <Text style={{ color: colors.muted }}>{s('numbers')}: {item.reveals_used}/{item.reveal_unlimited ? '∞' : item.reveal_limit}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
            {ROLE_KEYS.filter((key) => key !== 'chief_admin' || user?.role === 'chief_admin').map((key) => (
              <Pressable key={key} onPress={() => patch(item.id, { role: key })} style={{ borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4, backgroundColor: item.role === key ? colors.navy : '#e7eef6' }}>
                <Text style={{ color: item.role === key ? '#fff' : colors.navy, fontSize: 12 }}>{s(key)}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={{ marginTop: 8, color: colors.muted }}>{s('clientTariff')}</Text>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {CLIENT_PLANS.map((code) => (
              <Pressable key={code} onPress={() => patch(item.id, { client_tariff: code })} style={{ borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, backgroundColor: (item.client_plan?.code || 'simple') === code ? colors.navy : '#e7eef6' }}>
                <Text style={{ color: (item.client_plan?.code || 'simple') === code ? '#fff' : colors.navy }}>{code === 'simple' ? s('simple') : code.toUpperCase()}</Text>
              </Pressable>
            ))}
          </View>
          <Field label={s('days')} value={days[item.id] || ''} keyboardType="number-pad" onChangeText={(value) => setDays((current) => ({ ...current, [item.id]: value }))} />
          <Btn ghost title={s('save')} onPress={() => { if (days[item.id]) patch(item.id, { client_tariff: item.client_plan?.code || 'simple', client_days: Number(days[item.id]) }) }} />
          {item.role === 'owner' ? (
            <>
              <Field label={s('listingLimit')} value={limits[item.id] ?? String(item.listing_limit || '')} keyboardType="number-pad" onChangeText={(value) => setLimits((current) => ({ ...current, [item.id]: value }))} />
              <Btn ghost title={s('save')} onPress={() => patch(item.id, { listing_limit: Number(limits[item.id] || item.listing_limit) })} />
            </>
          ) : null}
          <Btn ghost title="Somon" onPress={() => patch(item.id, { somon_enabled: !item.somon_enabled })} />
          <Btn ghost title={item.is_active ? s('yes') : s('no')} onPress={() => patch(item.id, { is_active: !item.is_active })} />
        </View>
      ))}
    </Screen>
  )
}

export function DashTariffsScreen() {
  const { lang } = useI18n()
  const s = (key) => dashText(lang, key)
  const [plans, setPlans] = useState([])
  const [requests, setRequests] = useState([])
  function load() {
    api('/api/manage/tariffs/').then((data) => setPlans(Array.isArray(data) ? data : [])).catch(() => {})
    api('/api/manage/requests/').then((data) => setRequests(Array.isArray(data) ? data : [])).catch(() => {})
  }
  useEffect(load, [])
  return (
    <Screen scroll>
      {requests.filter((item) => item.status === 'pending').map((item) => (
        <View key={item.id} style={{ backgroundColor: '#fff', borderRadius: 16, padding: 12, marginBottom: 8 }}>
          <Text>{item.phone} · {item.plan?.name_ru}</Text>
          <Btn title={s('confirm')} onPress={async () => { await api(`/api/manage/requests/${item.id}/approve/`, { method: 'POST', body: {} }); load() }} />
          <Btn ghost title={s('reject')} onPress={async () => { await api(`/api/manage/requests/${item.id}/reject/`, { method: 'POST', body: {} }); load() }} />
        </View>
      ))}
      {plans.map((plan) => (
        <PlanEditor key={plan.id} plan={plan} s={s} onSaved={load} />
      ))}
    </Screen>
  )
}

function PlanEditor({ plan, s, onSaved }) {
  const [price, setPrice] = useState(String(plan.price ?? ''))
  const [days, setDays] = useState(String(plan.duration_days ?? ''))
  const [limit, setLimit] = useState(plan.phone_limit == null ? '' : String(plan.phone_limit))
  const [nameRu, setNameRu] = useState(plan.name_ru || '')
  const [nameTj, setNameTj] = useState(plan.name_tj || '')
  return (
    <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 12, marginBottom: 10 }}>
      <Text style={{ fontWeight: '700' }}>{plan.audience === 'owner' ? s('ownerWord') : s('clientWord')} · {plan.code}</Text>
      <Field label={s('nameRu')} value={nameRu} onChangeText={setNameRu} />
      <Field label={s('nameTj')} value={nameTj} onChangeText={setNameTj} />
      <Field label={s('priceSom')} value={price} onChangeText={setPrice} keyboardType="numeric" />
      <Field label={s('daysZero')} value={days} onChangeText={setDays} keyboardType="number-pad" />
      <Field label={s('phoneLimit')} value={limit} onChangeText={setLimit} keyboardType="number-pad" />
      <Btn title={s('save')} onPress={async () => {
        await api(`/api/manage/tariffs/${plan.id}/`, {
          method: 'PATCH',
          body: { name_ru: nameRu, name_tj: nameTj, price, duration_days: days, phone_limit: limit === '' ? null : limit, is_active: plan.is_active },
        })
        onSaved()
      }} />
      <Btn ghost title={plan.is_active ? s('hide') : s('show')} onPress={async () => {
        await api(`/api/manage/tariffs/${plan.id}/`, { method: 'PATCH', body: { is_active: !plan.is_active } })
        onSaved()
      }} />
    </View>
  )
}

export function DashGeoScreen() {
  const { lang } = useI18n()
  const s = (key) => dashText(lang, key)
  const [cities, setCities] = useState([])
  const [districts, setDistricts] = useState([])
  const [nameRu, setNameRu] = useState('')
  const [nameTj, setNameTj] = useState('')
  const [cityId, setCityId] = useState('')
  const [dRu, setDRu] = useState('')
  const [dTj, setDTj] = useState('')
  const [note, setNote] = useState('')
  function load() {
    api('/api/manage/cities/').then((data) => setCities(Array.isArray(data) ? data : [])).catch(() => {})
    api('/api/manage/districts/').then((data) => setDistricts(Array.isArray(data) ? data : [])).catch(() => {})
  }
  useEffect(load, [])
  return (
    <Screen scroll>
      <Field label={s('nameRu')} value={nameRu} onChangeText={setNameRu} />
      <Field label={s('nameTj')} value={nameTj} onChangeText={setNameTj} />
      {note ? <Text style={{ color: colors.navy }}>{note}</Text> : null}
      <Btn title={s('addCity')} onPress={async () => { await api('/api/manage/cities/', { method: 'POST', body: { name_ru: nameRu, name_tj: nameTj } }); setNameRu(''); setNameTj(''); setNote(s('cityAdded')); load() }} />
      {cities.map((city) => (
        <Btn key={city.id} ghost title={`${city.name_ru} · ${city.is_active ? s('hide') : s('show')}`} onPress={async () => { await api(`/api/manage/cities/${city.id}/`, { method: 'PATCH', body: { is_active: !city.is_active } }); load() }} />
      ))}
      <Text style={{ fontWeight: '700', color: colors.navy, marginTop: 16 }}>{s('districts')}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {cities.map((city) => (
          <Pressable key={city.id} onPress={() => setCityId(String(city.id))} style={{ borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: cityId === String(city.id) ? colors.navy : '#fff' }}>
            <Text style={{ color: cityId === String(city.id) ? '#fff' : colors.navy }}>{city.name_ru}</Text>
          </Pressable>
        ))}
      </View>
      <Field label={s('nameRu')} value={dRu} onChangeText={setDRu} />
      <Field label={s('nameTj')} value={dTj} onChangeText={setDTj} />
      <Btn title={s('addDistrict')} onPress={async () => {
        if (!cityId) return
        await api('/api/manage/districts/', { method: 'POST', body: { city: Number(cityId), name_ru: dRu, name_tj: dTj } })
        setDRu(''); setDTj(''); setNote(s('districtAdded')); load()
      }} />
      {districts.map((district) => (
        <Btn key={district.id} ghost title={`${district.name_ru} / ${district.name_tj} · ${district.is_active ? s('hide') : s('show')}`} onPress={async () => { await api(`/api/manage/districts/${district.id}/`, { method: 'PATCH', body: { is_active: !district.is_active } }); load() }} />
      ))}
    </Screen>
  )
}

const GROUP_KEYS = ['rooms', 'housing', 'audience', 'condition', 'repair', 'bathroom', 'elevator', 'inventory', 'walls', 'balcony', 'chute', 'windows', 'power', 'water', 'sewage', 'heating', 'papers', 'utilities', 'furniture']

export function DashDictsScreen() {
  const { lang } = useI18n()
  const s = (key) => dashText(lang, key)
  const [group, setGroup] = useState('rooms')
  const [rows, setRows] = useState([])
  const [nameRu, setNameRu] = useState('')
  const [nameTj, setNameTj] = useState('')
  const [value, setValue] = useState('')
  const [note, setNote] = useState('')
  function load() { api(`/api/manage/dictionaries/?group=${group}`).then((data) => setRows(Array.isArray(data) ? data : [])).catch(() => {}) }
  useEffect(load, [group])
  return (
    <Screen scroll>
      <Text style={{ color: colors.muted }}>{s('dictHint')}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginVertical: 8 }}>
        {GROUP_KEYS.map((key) => (
          <Pressable key={key} onPress={() => setGroup(key)} style={{ borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: group === key ? colors.navy : '#fff' }}>
            <Text style={{ color: group === key ? '#fff' : colors.navy, fontSize: 12 }}>{s(key)}</Text>
          </Pressable>
        ))}
      </View>
      <Field label={s('nameRu')} value={nameRu} onChangeText={setNameRu} />
      <Field label={s('nameTj')} value={nameTj} onChangeText={setNameTj} />
      {group === 'rooms' ? <Field label={s('roomCount')} value={value} onChangeText={setValue} keyboardType="number-pad" /> : null}
      <Btn title={s('add')} onPress={async () => {
        await api('/api/manage/dictionaries/', { method: 'POST', body: { group, name_ru: nameRu, name_tj: nameTj, ...(group === 'rooms' ? { value } : {}) } })
        setNameRu(''); setNameTj(''); setValue(''); setNote(s('addedShort')); load()
      }} />
      {note ? <Text style={{ color: colors.navy }}>{note}</Text> : null}
      {rows.map((item) => (
        <Btn key={item.id} ghost title={`${item.name_ru} / ${item.name_tj}${item.value ? ` · ${item.value}` : ''} · ${item.is_active ? s('hide') : s('show')}`} onPress={async () => {
          await api(`/api/manage/dictionaries/${item.id}/`, { method: 'PATCH', body: { is_active: !item.is_active } })
          load()
        }} />
      ))}
    </Screen>
  )
}

export function DashSettingsScreen() {
  const { lang } = useI18n()
  const s = (key) => dashText(lang, key)
  const [phone, setPhone] = useState('')
  const [message, setMessage] = useState('')
  useEffect(() => { api('/api/manage/settings/').then((data) => setPhone(data.support_phone_display || '')).catch(() => {}) }, [])
  return (
    <Screen>
      <Field label={s('supportPhone')} value={phone} onChangeText={setPhone} />
      {message ? <Text>{message}</Text> : null}
      <Btn title={s('save')} onPress={async () => { await api('/api/manage/settings/', { method: 'PATCH', body: { support_phone: phone } }); setMessage(s('saved')) }} />
    </Screen>
  )
}
