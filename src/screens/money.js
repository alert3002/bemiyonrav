import { useEffect, useState } from 'react'
import { Linking, Pressable, Text, View } from 'react-native'
import { api } from '../api'
import { money, pick } from '../format'
import { errorText, useI18n } from '../i18n'
import { useAuth } from '../state'
import { Btn, Screen, colors } from '../ui'

export function TariffsScreen({ navigation }) {
  const { t, lang } = useI18n()
  const { user } = useAuth()
  const [plans, setPlans] = useState({ owner: [], client: [] })
  const [role, setRole] = useState(user?.can_post && user?.role !== 'client' ? 'owner' : 'client')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState('')

  useEffect(() => { api('/api/tariffs/').then(setPlans).catch(() => {}) }, [])
  const items = plans[role] || []

  async function buy(plan) {
    if (!user) {
      navigation.navigate('Login')
      return
    }
    if (Number(plan.price) <= 0) return
    setBusy(plan.code)
    setError('')
    try {
      const data = await api('/api/payments/tariff/', { method: 'POST', body: { audience: role, code: plan.code } })
      if (data.order_id) navigation.navigate('PayResult', { orderId: data.order_id })
      if (data.payment_link) await Linking.openURL(data.payment_link)
      else if (!data.order_id) setError(t('pay_failed'))
    } catch (err) {
      setError(errorText(err, t))
    }
    setBusy('')
  }

  return (
    <Screen scroll>
      <Text style={{ color: colors.muted, marginBottom: 12 }}>{t('payHint')}</Text>
      {error ? <Text style={{ color: colors.bad, marginBottom: 8 }}>{error}</Text> : null}
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
        {['owner', 'client'].map((key) => (
          <Pressable key={key} onPress={() => setRole(key)} style={{ flex: 1, borderRadius: 999, paddingVertical: 10, alignItems: 'center', backgroundColor: role === key ? colors.navy : '#fff' }}>
            <Text style={{ color: role === key ? '#fff' : colors.navy, fontWeight: '700' }}>{key === 'owner' ? t('tariffOwners') : t('tariffClients')}</Text>
          </Pressable>
        ))}
      </View>
      {items.map((plan) => {
        const current = role === 'client' && user?.client_plan?.code === plan.code
        const paid = Number(plan.price) > 0
        return (
          <View key={plan.code} style={{ backgroundColor: '#fff', borderRadius: 22, padding: 16, marginBottom: 10, borderWidth: current ? 2 : 0, borderColor: colors.navy }}>
            <Text style={{ fontWeight: '700', color: colors.navy, fontSize: 18 }}>{lang === 'tj' ? plan.name_tj : plan.name_ru}</Text>
            <Text style={{ color: colors.ink, fontSize: 22, fontWeight: '700', marginVertical: 6 }}>
              {Number(plan.price) === 0 ? t('free') : `${money(plan.price)} ${t('somoni')}`}
            </Text>
            <Text style={{ color: colors.muted }}>
              {role === 'owner'
                ? (plan.duration_days ? t('days', { n: plan.duration_days }) : t('noExpiry'))
                : (plan.phone_limit == null ? t('unlimited') : plan.phone_limit)}
            </Text>
            <Text style={{ color: colors.ink, marginTop: 8 }}>{lang === 'tj' ? plan.description_tj : plan.description_ru}</Text>
            {paid ? <Btn title={current ? t('currentPlan') : (busy === plan.code ? t('loading') : t('payNow'))} disabled={current || busy === plan.code} onPress={() => buy(plan)} /> : null}
          </View>
        )
      })}
    </Screen>
  )
}

export function PayResultScreen({ route, navigation }) {
  const { t, lang } = useI18n()
  const { user, ready } = useAuth()
  const orderId = route.params?.orderId || ''
  const [payment, setPayment] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!orderId || !ready) return undefined
    if (!user) {
      navigation.navigate('Login')
      return undefined
    }
    let stop = false
    let tries = 0
    const tick = () => {
      api(`/api/payments/tariff/${orderId}/`)
        .then((data) => {
          if (stop) return
          setPayment(data)
          if (data.status !== 'charged' && tries < 5) {
            tries += 1
            setTimeout(tick, 2000)
          }
        })
        .catch((err) => { if (!stop) setError(errorText(err, t)) })
    }
    tick()
    return () => { stop = true }
  }, [orderId, user, ready])

  const done = payment?.status === 'charged'
  return (
    <Screen>
      <Text style={{ fontSize: 26, fontWeight: '700', color: colors.navy, marginBottom: 12 }}>{t('payTitle')}</Text>
      {error ? <Text style={{ color: colors.bad }}>{error}</Text> : null}
      {payment ? <Text style={{ fontWeight: '700', color: colors.ink }}>{lang === 'tj' ? payment.name_tj : payment.name_ru}</Text> : <Text style={{ color: colors.muted }}>{t('payLead')}</Text>}
      {payment ? <Text style={{ fontSize: 28, fontWeight: '700', color: colors.navy, marginVertical: 8 }}>{money(payment.amount)} {t('somoni')}</Text> : null}
      {payment ? <Text style={{ color: done ? colors.navy : colors.muted }}>{done ? t('paySuccess') : t('payWait')}</Text> : null}
      <Btn ghost title={t('payBack')} onPress={() => navigation.navigate('Tariffs')} />
    </Screen>
  )
}
