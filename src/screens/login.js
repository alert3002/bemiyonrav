import { useEffect, useRef, useState } from 'react'
import { KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View } from 'react-native'
import Svg, { Path } from 'react-native-svg'
import { api, saveSession } from '../api'
import { errorText, useI18n } from '../i18n'
import { useAuth, usePrefs } from '../state'
import { colors } from '../ui'

function localDigits(value) {
  return value.replace(/\D/g, '').slice(0, 9)
}

function formatLocal(digits) {
  return [digits.slice(0, 2), digits.slice(2, 5), digits.slice(5, 7), digits.slice(7, 9)].filter(Boolean).join(' ')
}

export function LoginScreen({ navigation, route }) {
  const { t } = useI18n()
  const { setUser } = useAuth()
  const dark = usePrefs().theme === 'dark'
  const [local, setLocal] = useState('')
  const [name, setName] = useState('')
  const [digits, setDigits] = useState(['', '', '', ''])
  const [devCode, setDevCode] = useState('')
  const [isNew, setIsNew] = useState(false)
  const [profile, setProfile] = useState(false)
  const [role, setRole] = useState('client')
  const [step, setStep] = useState('phone')
  const [seconds, setSeconds] = useState(0)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const boxes = [useRef(null), useRef(null), useRef(null), useRef(null)]
  const phone = `+992${local}`
  const shownPhone = `+992 ${formatLocal(local)}`.trim()

  useEffect(() => {
    if (seconds <= 0) return undefined
    const timer = setTimeout(() => setSeconds((value) => value - 1), 1000)
    return () => clearTimeout(timer)
  }, [seconds])

  async function requestCode() {
    if (local.length < 9) {
      setError(t('invalid_phone'))
      return
    }
    if (profile) {
      if (!name.trim()) {
        setError(t('nameRequired'))
        return
      }
      setStep('code')
      setError('')
      return
    }
    setBusy(true)
    setError('')
    try {
      const data = await api('/api/auth/request-code/', { method: 'POST', body: { phone }, auth: false })
      setIsNew(Boolean(data.is_new))
      setDevCode(data.dev_code || '')
      setSeconds(30)
      if (data.is_new) setProfile(true)
      else setStep('code')
    } catch (err) {
      setError(errorText(err, t))
    } finally {
      setBusy(false)
    }
  }

  async function resend() {
    if (seconds > 0 || busy) return
    setBusy(true)
    setError('')
    try {
      const data = await api('/api/auth/request-code/', { method: 'POST', body: { phone }, auth: false })
      setDevCode(data.dev_code || '')
      setSeconds(30)
    } catch (err) {
      setError(errorText(err, t))
    } finally {
      setBusy(false)
    }
  }

  function typeDigit(index, raw) {
    const only = raw.replace(/\D/g, '')
    if (only.length > 1) {
      const next = ['', '', '', '']
      only.slice(0, 4).split('').forEach((char, place) => { next[place] = char })
      setDigits(next)
      return
    }
    const next = [...digits]
    next[index] = only.slice(-1)
    setDigits(next)
    if (only && boxes[index + 1]) boxes[index + 1].current?.focus()
  }

  async function verify() {
    const code = digits.join('')
    if (code.length < 4) return
    setBusy(true)
    setError('')
    try {
      const data = await api('/api/auth/verify/', {
        method: 'POST',
        auth: false,
        body: { phone, code, role: isNew ? role : undefined, name: isNew ? name.trim() : undefined },
      })
      await saveSession(data)
      setUser(data.user)
      const after = route.params?.after
      if (after === 'Cabinet') {
        navigation.navigate('Tabs', { screen: 'Cabinet' })
        return
      }
      if (after === 'Add') {
        const dest = data.user?.can_post ? 'Post' : 'Tariffs'
        navigation.goBack()
        setTimeout(() => navigation.navigate(dest), 40)
        return
      }
      if (after === 'Notifications') {
        navigation.goBack()
        setTimeout(() => navigation.navigate('Notifications'), 40)
        return
      }
      navigation.goBack()
    } catch (err) {
      setError(errorText(err, t))
    } finally {
      setBusy(false)
    }
  }

  const card = dark ? '#324860' : '#fff'
  const ink = dark ? '#e8eef5' : colors.navy
  const muted = dark ? '#a9b8c8' : colors.muted
  const lineBg = dark ? '#121c27' : '#f3f5f8'
  const prefixBg = dark ? '#243446' : '#e7ebf0'

  return (
    <View style={{ flex: 1, backgroundColor: 'rgba(20,32,48,0.55)', justifyContent: 'center', paddingHorizontal: 16 }}>
      <Pressable style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }} onPress={() => navigation.goBack()} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={{ backgroundColor: card, borderRadius: 28, paddingTop: 36, paddingHorizontal: 28, paddingBottom: 28, shadowColor: '#142030', shadowOpacity: 0.28, shadowRadius: 24, elevation: 8 }}>
          <Pressable onPress={() => navigation.goBack()} hitSlop={10} style={{ position: 'absolute', top: 14, right: 14, width: 32, height: 32, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: '#8b97a6', fontSize: 26, lineHeight: 28 }}>×</Text>
          </Pressable>
          {step === 'phone' ? (
            <>
              <Text style={{ fontSize: 28, fontWeight: '700', color: ink, textAlign: 'center' }}>{t('loginTitle')}</Text>
              <Text style={{ color: muted, textAlign: 'center', marginTop: 8, marginBottom: 18 }}>{profile ? t('newUser') : t('loginLead')}</Text>
              {error ? <Text style={{ color: colors.bad, textAlign: 'center', marginBottom: 10 }}>{error}</Text> : null}
              {profile && (
                <>
                  <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
                    {['client', 'owner'].map((key) => (
                      <Pressable key={key} onPress={() => setRole(key)} style={{ flex: 1, borderRadius: 999, minHeight: 44, alignItems: 'center', justifyContent: 'center', backgroundColor: role === key ? colors.navy : (dark ? '#243446' : '#e7eef6') }}>
                        <Text style={{ color: role === key ? '#fff' : ink, fontWeight: '700', textAlign: 'center' }}>{key === 'client' ? t('roleClient') : t('roleOwner')}</Text>
                      </Pressable>
                    ))}
                  </View>
                  <TextInput
                    value={name}
                    onChangeText={setName}
                    placeholder={t('name')}
                    placeholderTextColor={muted}
                    style={{ minHeight: 52, borderRadius: 16, backgroundColor: lineBg, color: ink, paddingHorizontal: 14, marginBottom: 10, fontSize: 16 }}
                  />
                </>
              )}
              <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: lineBg, borderRadius: 16, overflow: 'hidden', marginBottom: 16 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, height: 52, paddingHorizontal: 14, backgroundColor: prefixBg }}>
                  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                    <Path d="M22 16.9v2a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h2a2 2 0 0 1 2 1.7c.1.9.3 1.8.6 2.6a2 2 0 0 1-.5 2.1L7.1 9.5a16 16 0 0 0 6 6l1.1-1.1a2 2 0 0 1 2.1-.5c.8.3 1.7.5 2.6.6a2 2 0 0 1 1.7 2Z" stroke={ink} strokeWidth={1.75} />
                  </Svg>
                  <Text style={{ color: ink, fontWeight: '700' }}>+992</Text>
                </View>
                <TextInput
                  value={formatLocal(local)}
                  onChangeText={(value) => { setLocal(localDigits(value)); setProfile(false); setIsNew(false); setError('') }}
                  placeholder="92 123 45 67"
                  placeholderTextColor="#8b97a6"
                  keyboardType="number-pad"
                  inputMode="numeric"
                  autoComplete="tel"
                  style={{ flex: 1, color: ink, fontSize: 16, height: 52, paddingHorizontal: 14 }}
                />
              </View>
              <Pressable disabled={busy} onPress={requestCode} style={{ minHeight: 52, borderRadius: 999, backgroundColor: colors.navy, alignItems: 'center', justifyContent: 'center', opacity: busy ? 0.6 : 1 }}>
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>{profile ? t('continue') : t('getCode')}</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Text style={{ fontSize: 28, fontWeight: '700', color: ink, textAlign: 'center' }}>{t('confirmTitle')}</Text>
              <Text style={{ color: muted, textAlign: 'center', marginTop: 8, marginBottom: 18 }}>{t('codeSent', { phone: shownPhone })}</Text>
              {error ? <Text style={{ color: colors.bad, textAlign: 'center', marginBottom: 8 }}>{error}</Text> : null}
              {devCode ? <Text style={{ color: ink, textAlign: 'center', marginBottom: 8 }}>{t('devCode', { code: devCode })}</Text> : null}
              <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 18, backgroundColor: lineBg, borderRadius: 16, height: 64, alignItems: 'center', marginBottom: 16 }}>
                {digits.map((digit, index) => (
                  <TextInput
                    key={index}
                    ref={boxes[index]}
                    value={digit}
                    placeholder="0"
                    placeholderTextColor="#c5ced8"
                    onChangeText={(value) => typeDigit(index, value)}
                    keyboardType="number-pad"
                    inputMode="numeric"
                    autoComplete={index === 0 ? 'sms-otp' : 'off'}
                    textContentType={index === 0 ? 'oneTimeCode' : 'none'}
                    importantForAutofill={index === 0 ? 'yes' : 'no'}
                    autoFocus={index === 0}
                    maxLength={index === 0 ? 4 : 1}
                    style={{ width: 28, textAlign: 'center', fontSize: 28, fontWeight: '700', color: ink, padding: 0 }}
                  />
                ))}
              </View>
              <Pressable disabled={busy} onPress={verify} style={{ minHeight: 52, borderRadius: 999, backgroundColor: colors.navy, alignItems: 'center', justifyContent: 'center', opacity: busy ? 0.6 : 1 }}>
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>{t('enter')}</Text>
              </Pressable>
              <Pressable disabled={seconds > 0 || busy} onPress={resend}>
                <Text style={{ color: muted, textAlign: 'center', marginTop: 14 }}>{seconds > 0 ? t('resendIn', { sec: seconds }) : t('resend')}</Text>
              </Pressable>
              <Pressable onPress={() => { setStep('phone'); setDigits(['', '', '', '']); setProfile(false) }}>
                <Text style={{ color: colors.navy, textAlign: 'center', marginTop: 8, fontWeight: '700', textDecorationLine: 'underline' }}>{t('changePhone')}</Text>
              </Pressable>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </View>
  )
}
