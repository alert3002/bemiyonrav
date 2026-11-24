import { useEffect, useState } from 'react'
import { Image, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native'
import { WebView } from 'react-native-webview'
import * as ImagePicker from 'expo-image-picker'
import * as DocumentPicker from 'expo-document-picker'
import * as Location from 'expo-location'
import { api } from '../api'
import { money, pick } from '../format'
import { errorText, useI18n } from '../i18n'
import { Icon } from '../icons'
import { useAuth, usePrefs } from '../state'
import { Btn, colors, useColors } from '../ui'

const FLOORS = Array.from({ length: 30 }, (_, index) => index + 1)
const INVENTORY_ICON = { ac: 'ac', fridge: 'fridge', furniture: 'sofa', washer: 'washer', tv: 'tv' }
const REQUIRED = ['housing', 'audience', 'rooms', 'floor', 'floors_total', 'condition', 'repair', 'bathroom', 'elevator', 'papers', 'district']

const EMPTY = {
  city: '', district: '', street: '', house_number: '', landmark: '',
  housing: '', rooms: '', floor: '', floors_total: '', price: '', price_deal: false,
  prepayment: '0', area: '', year: '', audience: '', condition: '', repair: '',
  bathroom: '', elevator: '', walls: '', balcony: '', chute: '', windows: '',
  power: '', water: '', sewage: '', heating: '', papers: '', inventory: [],
  bargain: 'usual', description_ru: '', description_tj: '', contact_phone: '',
  whatsapp: false, telegram: false, ownership_confirmed: false, tariff_code: 'simple', payment_note: '',
}

function mapHtml(point) {
  const marker = point ? `L.marker([${point.lat}, ${point.lon}]).addTo(map); map.setView([${point.lat}, ${point.lon}], 16);` : ''
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
<style>html,body,#m{height:100%;margin:0} .leaflet-control-attribution{display:none}</style></head><body><div id="m"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
const map = L.map('m', { zoomControl: false }).setView([38.5598, 68.787], 13);
L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', { maxZoom: 19 }).addTo(map);
${marker}
map.on('click', (event) => window.ReactNativeWebView.postMessage(JSON.stringify({ lat: event.latlng.lat, lon: event.latlng.lng })));
</script></body></html>`
}

export function PostScreen({ navigation, route }) {
  const editId = route.params?.id
  const { t, lang } = useI18n()
  const { user } = useAuth()
  const c = useColors()
  const dark = usePrefs().theme === 'dark'
  const L = (ru, tj) => (lang === 'tj' ? tj : ru)
  const ink = dark ? '#fff' : '#314a64'
  const label = dark ? '#fff' : '#3e556b'
  const fieldBg = dark ? '#243446' : '#fbfcfd'
  const fieldLine = dark ? '#4a6278' : '#d7e0e8'
  const [geo, setGeo] = useState({ cities: [], districts: [] })
  const [catalog, setCatalog] = useState({})
  const [tariffs, setTariffs] = useState([])
  const [form, setForm] = useState({ ...EMPTY, contact_phone: user?.phone_display || user?.phone || '' })
  const [photos, setPhotos] = useState([])
  const [video, setVideo] = useState(null)
  const [documentFile, setDocumentFile] = useState(null)
  const [existing, setExisting] = useState([])
  const [point, setPoint] = useState(null)
  const [openName, setOpenName] = useState('')
  const [missing, setMissing] = useState('')
  const [geoNote, setGeoNote] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    Promise.all([api('/api/geo/'), api('/api/catalog/'), api('/api/tariffs/')]).then(([g, catalogData, plans]) => {
      setGeo(g)
      setCatalog(catalogData)
      setTariffs(plans.owner || [])
      setForm((current) => ({
        ...current,
        city: current.city || (g.cities?.[0] ? String(g.cities[0].id) : ''),
        housing: current.housing || (catalogData.housing?.[0] ? String(catalogData.housing[0].id) : ''),
      }))
    }).catch(() => {})
    if (!editId) return undefined
    api(`/api/me/listings/${editId}/`).then((data) => {
      const details = data.details || {}
      setExisting(data.photos || [])
      if (details.lat && details.lon) setPoint({ lat: Number(details.lat), lon: Number(details.lon) })
      setForm((current) => ({
        ...current,
        street: data.street || '',
        house_number: data.contact?.house_number || '',
        landmark: data.contact?.landmark || '',
        floor: data.floor == null ? '' : String(data.floor),
        floors_total: data.floors_total == null ? '' : String(data.floors_total),
        price: data.price == null ? '' : String(data.price),
        area: data.area == null ? '' : String(data.area),
        year: details.year == null ? '' : String(details.year),
        district: String(data.district_id || data.district?.id || ''),
        description_ru: data.description_ru || '',
        description_tj: data.description_tj || '',
        contact_phone: data.contact?.phone_display || current.contact_phone,
        price_deal: Boolean(details.price_deal),
        whatsapp: Boolean(details.whatsapp),
        telegram: Boolean(details.telegram),
        inventory: (details.inventory || []).map(String),
        tariff_code: data.plan || 'simple',
      }))
    }).catch(() => {})
    return undefined
  }, [editId])

  function set(key, value) {
    setForm((current) => ({ ...current, [key]: value }))
    setMissing('')
  }

  function digits(key, value, decimal) {
    let next = value.replace(decimal ? /[^\d.,]/g : /\D/g, '')
    if (decimal) {
      next = next.replace(',', '.')
      const [whole, ...rest] = next.split('.')
      next = rest.length ? `${whole}.${rest.join('').slice(0, 2)}` : whole
    }
    set(key, next)
  }

  async function applyPoint(lat, lon) {
    setPoint({ lat, lon })
    setGeoNote('')
    try {
      const data = await api(`/api/geo/reverse/?lat=${lat}&lon=${lon}`, { auth: false })
      setForm((current) => ({
        ...current,
        city: data.city_id ? String(data.city_id) : current.city,
        district: data.district_id ? String(data.district_id) : current.district,
        street: data.street || current.street,
        house_number: data.house_number || current.house_number,
      }))
      if (!data.street) setGeoNote(L('Улица не найдена, укажите её сами.', 'Кӯча ёфт нашуд, худатон нависед.'))
    } catch {
      setGeoNote(L('Адрес не определился. Выберите точку ещё раз.', 'Суроға муайян нашуд. Нуқтаро боз интихоб кунед.'))
    }
  }

  async function useHere() {
    const permit = await Location.requestForegroundPermissionsAsync()
    if (permit.status !== 'granted') {
      setGeoNote(L('Разрешите доступ к месту, чтобы заполнить адрес.', 'Ба ҷой иҷозат диҳед, то суроға пур шавад.'))
      return
    }
    setGeoNote(L('Определяем место…', 'Ҷой муайян мешавад…'))
    const loc = await Location.getCurrentPositionAsync({})
    applyPoint(loc.coords.latitude, loc.coords.longitude)
  }

  function pushPhotos(assets) {
    setPhotos((current) => [...current, ...assets].slice(0, 5))
  }

  async function addPhotos() {
    const picked = await ImagePicker.launchImageLibraryAsync({ allowsMultipleSelection: true, selectionLimit: 5, quality: 0.8 })
    if (picked.canceled) return
    pushPhotos(picked.assets)
  }

  async function takePhoto() {
    const permit = await ImagePicker.requestCameraPermissionsAsync()
    if (permit.status !== 'granted') {
      setError(t('cameraDenied'))
      return
    }
    const picked = await ImagePicker.launchCameraAsync({ quality: 0.8 })
    if (picked.canceled) return
    setError('')
    pushPhotos(picked.assets)
  }

  function toggleInventory(id) {
    const value = String(id)
    setForm((current) => ({
      ...current,
      inventory: current.inventory.includes(value)
        ? current.inventory.filter((item) => item !== value)
        : [...current.inventory, value],
    }))
  }

  async function submit() {
    const missed = REQUIRED.find((key) => !String(form[key] || '').trim())
    if (missed || !form.street || (!form.price_deal && !form.price) || !form.area || !form.year || (!photos.length && !existing.length)) {
      setMissing(missed || 'street')
      setError(t('field_required'))
      return
    }
    const data = new FormData()
    Object.entries(form).forEach(([key, value]) => {
      if (key === 'inventory') {
        value.forEach((id) => data.append('inventory', id))
        return
      }
      if (typeof value === 'boolean') {
        data.append(key, value ? 'true' : 'false')
        return
      }
      data.append(key, value ?? '')
    })
    if (point) {
      data.append('lat', String(point.lat))
      data.append('lon', String(point.lon))
    }
    photos.forEach((file, index) => {
      data.append('photos', { uri: file.uri, name: file.fileName || `photo-${index}.jpg`, type: file.mimeType || 'image/jpeg' })
    })
    if (video) data.append('video', { uri: video.uri, name: 'video.mp4', type: video.mimeType || 'video/mp4' })
    if (documentFile) data.append('document', { uri: documentFile.uri, name: documentFile.name || 'document', type: documentFile.mimeType || 'application/octet-stream' })
    setBusy(true)
    setError('')
    try {
      if (editId) await api(`/api/me/listings/${editId}/`, { method: 'PATCH', form: data })
      else await api('/api/me/listings/', { method: 'POST', form: data })
      navigation.goBack()
    } catch (err) {
      setError(errorText(err, t))
    } finally {
      setBusy(false)
    }
  }

  function Heading({ children }) {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 }}>
        <View style={{ width: 4, height: 18, borderRadius: 99, backgroundColor: '#8aa0b8' }} />
        <Text style={{ color: ink, fontSize: 18, fontWeight: '600' }}>{children}</Text>
      </View>
    )
  }

  function MenuField({ name, title, options, required, placeholder }) {
    const open = openName === name
    const current = options.find((item) => String(item.value) === String(form[name]))
    return (
      <View style={{ gap: 6, flex: 1 }}>
        <Text style={{ color: label, fontWeight: '500' }}>{title}{required ? ' *' : ''}</Text>
        <Pressable
          onPress={() => setOpenName(open ? '' : name)}
          style={{ minHeight: 52, borderRadius: 999, borderWidth: 1, borderColor: missing === name ? '#d7b4b4' : fieldLine, backgroundColor: fieldBg, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
        >
          <Text style={{ color: current ? (dark ? '#fff' : '#2f455c') : (dark ? '#a9b8c8' : '#7d8fa1'), fontSize: 16, flex: 1 }} numberOfLines={1}>{current ? current.label : (placeholder || `-- ${t('choose')} --`)}</Text>
          <View style={{ width: 8, height: 8, borderRightWidth: 1.5, borderBottomWidth: 1.5, borderColor: dark ? '#fff' : '#8aa0b8', transform: [{ rotate: open ? '-135deg' : '45deg' }, { translateY: open ? 2 : -1 }] }} />
        </Pressable>
        <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpenName('')}>
          <Pressable onPress={() => setOpenName('')} style={{ flex: 1, backgroundColor: 'rgba(16,24,32,0.55)', justifyContent: 'flex-end' }}>
            <Pressable onPress={() => {}} style={{ maxHeight: '72%', backgroundColor: dark ? '#1b2836' : '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingTop: 10, paddingBottom: 24 }}>
              <View style={{ alignSelf: 'center', width: 42, height: 4, borderRadius: 99, backgroundColor: dark ? '#4a6278' : '#d7e0e8', marginBottom: 12 }} />
              <Text style={{ color: ink, fontSize: 18, fontWeight: '700', paddingHorizontal: 20, marginBottom: 8 }}>{title}</Text>
              <ScrollView>
                {options.map((item) => {
                  const on = String(form[name]) === String(item.value)
                  return (
                    <Pressable key={item.value || 'empty'} onPress={() => { set(name, item.value); setOpenName('') }} style={{ marginHorizontal: 12, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 14, backgroundColor: on ? (dark ? '#3d628c' : '#eef3f7') : 'transparent' }}>
                      <Text style={{ color: dark ? '#fff' : '#2a4358', fontSize: 16, fontWeight: on ? '700' : '500' }}>{item.label}</Text>
                    </Pressable>
                  )
                })}
              </ScrollView>
            </Pressable>
          </Pressable>
        </Modal>
      </View>
    )
  }

  function SelectField({ name, title, items, required }) {
    return <MenuField name={name} title={title} required={required} options={(items || []).map((item) => ({ value: String(item.id), label: pick(item, lang) }))} />
  }

  function Input({ title, value, onChangeText, placeholder, keyboardType, required, multiline }) {
    return (
      <View style={{ gap: 6, flex: 1 }}>
        <Text style={{ color: label, fontWeight: '500' }}>{title}{required ? ' *' : ''}</Text>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={dark ? '#fff' : '#7d8fa1'}
          keyboardType={keyboardType}
          multiline={multiline}
          style={{ minHeight: multiline ? 120 : 52, borderRadius: multiline ? 18 : 999, borderWidth: 1, borderColor: fieldLine, backgroundColor: fieldBg, paddingHorizontal: 18, paddingVertical: multiline ? 12 : 0, color: dark ? '#fff' : '#2f455c', fontSize: 16, textAlignVertical: multiline ? 'top' : 'center' }}
        />
      </View>
    )
  }

  function Pair({ children }) {
    return <View style={{ flexDirection: 'row', gap: 10 }}>{children}</View>
  }

  const districts = (geo.districts || []).filter((item) => !form.city || String(item.city) === String(form.city))
  const selected = tariffs.find((item) => item.code === form.tariff_code)
  const mustConfirm = user?.role === 'owner'

  return (
    <ScrollView style={{ flex: 1, backgroundColor: c.paper }} contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 14 }} keyboardShouldPersistTaps="handled">
      <Heading>{L('Детали объявления', 'Тафсилоти эълон')}</Heading>
      <SelectField name="housing" title={L('Тип жилья', 'Намуди хона')} items={catalog.housing} required />
      <SelectField name="audience" title={L('Кому сдаётся', 'Ба кӣ иҷора')} items={catalog.audience} required />
      <SelectField name="rooms" title={L('Комнат', 'Ҳуҷра')} items={catalog.rooms} required />
      <Pair>
        <MenuField name="floor" title={L('Этаж', 'Ошёна')} required placeholder="--" options={FLOORS.map((n) => ({ value: String(n), label: String(n) }))} />
        <MenuField name="floors_total" title={L('Этажность дома', 'Ошёнаҳои хона')} required placeholder="--" options={FLOORS.map((n) => ({ value: String(n), label: L(`${n} этажный`, `${n} ошёна`) }))} />
      </Pair>
      <Pair>
        <Input title={`${L('Площадь (м²)', 'Масоҳат (м²)')}`} required value={form.area} onChangeText={(value) => digits('area', value, true)} keyboardType="decimal-pad" />
        <Input title={L('Год постройки', 'Соли сохтмон')} required value={form.year} onChangeText={(value) => digits('year', value)} keyboardType="number-pad" placeholder="2010" />
      </Pair>
      <Pair>
        <SelectField name="condition" title={L('Состояние дома', 'Ҳолати хона')} items={catalog.condition} required />
        <SelectField name="repair" title={L('Ремонт', 'Таъмир')} items={catalog.repair} required />
      </Pair>
      <Pair>
        <SelectField name="bathroom" title={L('Санузел', 'Ҳоҷатхона')} items={catalog.bathroom} required />
        <SelectField name="elevator" title={L('Лифт', 'Лифт')} items={catalog.elevator} required />
      </Pair>
      <Text style={{ color: label, fontWeight: '500' }}>{L('Инвентарь', 'Ашё')}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {(catalog.inventory || []).map((item) => {
          const on = form.inventory.includes(String(item.id))
          return (
            <Pressable key={item.id} onPress={() => toggleInventory(item.id)} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 999, borderWidth: 1, borderColor: on ? '#c5d3e0' : fieldLine, backgroundColor: on ? (dark ? '#3d628c' : '#eef3f7') : fieldBg, paddingHorizontal: 12, paddingVertical: 8 }}>
              <Icon name={INVENTORY_ICON[item.code] || 'sofa'} size={18} color={dark ? '#fff' : '#5c7590'} />
              <Text style={{ color: dark ? '#fff' : '#34506a', fontWeight: '500' }}>{pick(item, lang)}</Text>
            </Pressable>
          )
        })}
      </View>
      <Pair>
        <SelectField name="walls" title={L('Материал стен', 'Маводи девор')} items={catalog.walls} />
        <SelectField name="balcony" title={L('Балкон', 'Балкон')} items={catalog.balcony} />
      </Pair>
      <Pair>
        <SelectField name="windows" title={L('Куда смотрят окна', 'Тирезаҳо ба куҷо')} items={catalog.windows} />
        <SelectField name="chute" title={L('Мусоропровод', 'Партовбаро')} items={catalog.chute} />
      </Pair>
      <Pair>
        <SelectField name="power" title={L('Электричество', 'Барқ')} items={catalog.power} />
        <SelectField name="water" title={L('Вода', 'Об')} items={(catalog.water || []).filter((item) => !['1', '2', '3'].includes(String(item.code)) && !['1', '2', '3'].includes(String(item.name_ru)))} />
      </Pair>
      <Pair>
        <SelectField name="sewage" title={L('Канализация', 'Канализатсия')} items={catalog.sewage} />
        <SelectField name="heating" title={L('Отопление', 'Гармидиҳӣ')} items={catalog.heating} />
      </Pair>
      <SelectField name="papers" title={L('Наличие документов', 'Ҳуҷҷатҳо')} items={catalog.papers} required />
      <View style={{ flexDirection: 'row', gap: 16 }}>
        {[[false, L('Цена', 'Нарх')], [true, L('Договорная', 'Шартномавӣ')]].map(([value, text]) => (
          <Pressable key={String(value)} onPress={() => set('price_deal', value)} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={{ width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: '#5c7590', backgroundColor: form.price_deal === value ? '#5c7590' : 'transparent' }} />
            <Text style={{ color: dark ? '#fff' : '#34506a' }}>{text}</Text>
          </Pressable>
        ))}
      </View>
      <Pair>
        {!form.price_deal ? <Input title={`${L('Цена в месяц', 'Нарх дар як моҳ')}, ${t('somoniShort')}`} required value={String(form.price)} onChangeText={(value) => digits('price', value, true)} keyboardType="decimal-pad" /> : <View style={{ flex: 1 }} />}
        <Input title={`${t('detailPrepay')}, ${t('somoniShort')}`} value={String(form.prepayment)} onChangeText={(value) => digits('prepayment', value, true)} keyboardType="decimal-pad" />
      </Pair>
      {!form.price_deal ? (
        <View style={{ flexDirection: 'row', gap: 16 }}>
          {[['usual', L('Обычно', 'Одатан')], ['haggle', L('Торг', 'Савдо')]].map(([value, text]) => (
            <Pressable key={value} onPress={() => set('bargain', value)} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={{ width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: '#5c7590', backgroundColor: form.bargain === value ? '#5c7590' : 'transparent' }} />
              <Text style={{ color: dark ? '#fff' : '#34506a' }}>{text}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
      <Input
        title={`${L('Описание', 'Тавсиф')} (${t('optional')})`}
        multiline
        value={lang === 'tj' ? form.description_tj : form.description_ru}
        onChangeText={(value) => set(lang === 'tj' ? 'description_tj' : 'description_ru', value)}
        placeholder={L('Расскажите о жилье…', 'Дар бораи хона нависед…')}
      />

      <Heading>{L('Фото', 'Акс')}</Heading>
      <Text style={{ color: label }}>{t('photos')} *</Text>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 1 }}><Btn ghost title={t('chooseFiles')} onPress={addPhotos} /></View>
        <View style={{ flex: 1 }}><Btn ghost title={t('takePhoto')} onPress={takePhoto} /></View>
      </View>
      <Text style={{ color: c.muted }}>{t('photosHelp')}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {existing.map((photo) => <Image key={photo.id} source={{ uri: photo.url }} style={{ width: 84, height: 64, borderRadius: 16 }} />)}
        {photos.map((file) => <Image key={file.uri} source={{ uri: file.uri }} style={{ width: 84, height: 64, borderRadius: 16 }} />)}
      </View>
      <Pair>
        <View style={{ flex: 1, gap: 6 }}>
          <Text style={{ color: label }}>{t('video')} ({t('optional')})</Text>
          <Btn ghost title={video ? video.fileName || t('video') : t('chooseFiles')} onPress={async () => {
            const picked = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['videos'] })
            if (!picked.canceled) setVideo(picked.assets[0])
          }} />
          <Text style={{ color: c.muted }}>{t('videoHelp')}</Text>
        </View>
        <View style={{ flex: 1, gap: 6 }}>
          <Text style={{ color: label }}>{t('document')} ({t('optional')})</Text>
          <Btn ghost title={documentFile ? documentFile.name : t('chooseFiles')} onPress={async () => {
            const picked = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true })
            if (!picked.canceled) setDocumentFile(picked.assets[0])
          }} />
          <Text style={{ color: c.muted }}>{t('documentHelp')}</Text>
        </View>
      </Pair>

      <Heading>{L('Расположение', 'Ҷойгиршавӣ')}</Heading>
      <View style={{ height: 240, borderRadius: 22, overflow: 'hidden', borderWidth: 1, borderColor: fieldLine }}>
        <WebView originWhitelist={['*']} source={{ html: mapHtml(point) }} onMessage={(event) => {
          try {
            const next = JSON.parse(event.nativeEvent.data)
            if (next.lat) applyPoint(next.lat, next.lon)
          } catch { /* ignore map noise */ }
        }} />
        <Pressable onPress={useHere} style={{ position: 'absolute', top: 12, right: 12, width: 42, height: 42, borderRadius: 21, backgroundColor: dark ? '#243446' : '#fff', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="locate" size={18} color={dark ? '#fff' : '#314a64'} />
        </Pressable>
      </View>
      <Text style={{ color: c.muted }}>{geoNote || L('Значок места подставит ваш адрес.', 'Нишони ҷой суроғаи шуморо мегузорад.')}</Text>
      {(geo.cities || []).length > 1 ? (
        <MenuField name="city" title={L('Город', 'Шаҳр')} options={(geo.cities || []).map((item) => ({ value: String(item.id), label: pick(item, lang) }))} />
      ) : null}
      <MenuField name="district" title={L('Город/Район', 'Шаҳр/Ноҳия')} required options={districts.map((item) => ({ value: String(item.id), label: pick(item, lang) }))} />
      <Pair>
        <Input title={t('street')} required value={form.street} onChangeText={(value) => set('street', value)} placeholder={L('улица Айни', 'кӯчаи Айнӣ')} />
        <Input title={t('house')} value={form.house_number} onChangeText={(value) => set('house_number', value)} placeholder="45, кв. 12" />
      </Pair>
      <Input title={`${t('landmark')} (${t('optional')})`} value={form.landmark} onChangeText={(value) => set('landmark', value)} placeholder={L('возле рынка Шохмансур', 'назди бозори Шоҳмансур')} />
      <Text style={{ color: c.muted }}>{t('landmarkHelp')}</Text>

      <Heading>{t('tariffTitle')}</Heading>
      <Input title={t('contactPhone')} required value={form.contact_phone} onChangeText={(value) => set('contact_phone', value)} placeholder="+992 90 000 00 01" />
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {[['whatsapp', 'WhatsApp', '#25D366'], ['telegram', 'Telegram', '#2AABEE']].map(([key, text, color]) => (
          <Pressable key={key} onPress={() => set(key, !form[key])} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 999, borderWidth: 1, borderColor: fieldLine, backgroundColor: form[key] ? (dark ? '#3d628c' : '#eef3f7') : fieldBg, paddingHorizontal: 12, paddingVertical: 8 }}>
            <Icon name={key} size={18} color={color} />
            <Text style={{ color: dark ? '#fff' : colors.navy, fontWeight: '700' }}>{text}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={{ color: c.muted }}>{L('Если отметить, значок появится в объявлении.', 'Агар қайд кунед, нишон дар эълон мебарояд.')}</Text>
      {tariffs.map((plan) => {
        const on = form.tariff_code === plan.code
        return (
          <Pressable key={plan.code} onPress={() => set('tariff_code', plan.code)} style={{ borderRadius: 22, borderWidth: 1, borderColor: on ? colors.navy : fieldLine, backgroundColor: dark ? '#324860' : '#fff', padding: 14, gap: 4 }}>
            <Text style={{ color: ink, fontWeight: '700' }}>{lang === 'tj' ? plan.name_tj : plan.name_ru}</Text>
            <Text style={{ color: ink, fontWeight: '800' }}>{Number(plan.price) === 0 ? t('free') : `${money(plan.price)} ${t('somoni')}`}</Text>
            {plan.duration_days ? <Text style={{ color: c.muted }}>{t('days', { n: plan.duration_days })}</Text> : null}
            <Text style={{ color: c.muted }}>{lang === 'tj' ? plan.description_tj : plan.description_ru}</Text>
          </Pressable>
        )
      })}
      {selected && Number(selected.price) > 0 ? (
        <Input title={t('paymentNote')} value={form.payment_note} onChangeText={(value) => set('payment_note', value)} />
      ) : null}
      {mustConfirm ? (
        <Pressable onPress={() => set('ownership_confirmed', !form.ownership_confirmed)} style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
          <View style={{ width: 18, height: 18, borderRadius: 4, borderWidth: 1.5, borderColor: '#5c7590', backgroundColor: form.ownership_confirmed ? '#5c7590' : 'transparent', marginTop: 2 }} />
          <Text style={{ flex: 1, color: dark ? '#fff' : '#34506a' }}>{t('confirmOwner')}</Text>
        </Pressable>
      ) : null}
      {error ? <Text style={{ color: colors.bad }}>{error}</Text> : null}
      <Btn title={busy ? t('loading') : t('sendReview')} disabled={busy} onPress={submit} />
    </ScrollView>
  )
}
