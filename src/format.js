const MONTHS = {
  ru: ['янв.', 'февр.', 'мар.', 'апр.', 'мая', 'июн.', 'июл.', 'авг.', 'сент.', 'окт.', 'нояб.', 'дек.'],
  tj: ['январ', 'феврал', 'март', 'апрел', 'май', 'июн', 'июл', 'август', 'сентябр', 'октябр', 'ноябр', 'декабр'],
  zh: ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'],
}

export function money(value) {
  const n = Number(value)
  if (!Number.isFinite(n)) return '—'
  return new Intl.NumberFormat('ru-RU').format(Math.round(n))
}

export function pick(item, lang) {
  if (!item) return ''
  if (typeof item === 'string') return item
  if (lang === 'tj') return item.name_tj || item.name_ru || ''
  if (lang === 'zh') return item.name_ru || item.name_tj || ''
  return item.name_ru || item.name_tj || ''
}

export function roomsLabel(count, lang) {
  const n = Number(count)
  if (!Number.isFinite(n)) return '—'
  if (lang === 'tj') return `${n} ҳуҷра`
  if (lang === 'zh') return `${n}室`
  const n10 = n % 10
  const n100 = n % 100
  if (n10 === 1 && n100 !== 11) return `${n} комната`
  if ([2, 3, 4].includes(n10) && ![12, 13, 14].includes(n100)) return `${n} комнаты`
  return `${n} комнат`
}

export function floorText(item) {
  if (item?.floor == null || item.floor === '') return ''
  if (item.floors_known === false || item.floors_total == null || item.floors_total === '') return String(item.floor)
  return `${item.floor}/${item.floors_total}`
}

export function postedWhen(value, lang = 'ru') {
  if (!value) return ''
  const then = new Date(value)
  if (Number.isNaN(then.getTime())) return ''
  const diff = Math.max(0, Date.now() - then.getTime())
  const min = Math.floor(diff / 60000)
  const hour = Math.floor(diff / 3600000)
  const day = Math.floor(diff / 86400000)
  if (day > 5) {
    const names = MONTHS[lang] || MONTHS.ru
    const month = names[then.getMonth()]
    return lang === 'zh' ? `${month}${then.getDate()}日` : `${then.getDate()} ${month}`
  }
  if (lang === 'tj') {
    if (min < 1) return 'ҳозир'
    if (hour < 1) return `${min} дақиқа`
    if (hour < 24) return `${hour} соат`
    return `${day} рӯз`
  }
  if (lang === 'zh') {
    if (min < 1) return '刚刚'
    if (hour < 1) return `${min}分钟`
    if (hour < 24) return `${hour}小时`
    return `${day}天`
  }
  if (min < 1) return 'только что'
  if (hour < 1) return `${min} мин.`
  if (hour < 24) return `${hour} ч.`
  return `${day} дн.`
}

export function qs(params) {
  const search = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') search.set(key, String(value))
  })
  const text = search.toString()
  return text ? `?${text}` : ''
}
