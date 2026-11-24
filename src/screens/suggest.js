import { useEffect, useRef, useState } from 'react'
import { Pressable, Text, TextInput, View } from 'react-native'
import { api, saveSession } from '../api'
import { errorText, useI18n } from '../i18n'
import { useAuth, usePrefs } from '../state'
import { Screen, colors, useColors } from '../ui'

function localDigits(value) {
  let digits = String(value || '').replace(/\D/g, '')
  while (digits.startsWith('992') && digits.length > 9) digits = digits.slice(3)
  return digits.slice(0, 9)
}

function formatLocal(digits) {
  return [digits.slice(0, 2), digits.slice(2, 5), digits.slice(5, 7), digits.slice(7, 9)].filter(Boolean).join(' ')
}

export function SuggestScreen({ navigation }) {
  const { t } = useI18n()
  const { user, setUser } = useAuth()
  const c = useColors()
  const dark = usePrefs().theme === 'dark'
  const ink = dark ? '#e8eef5' : '#1b2a3a'
  const line = dark ? '#4a6278' : '#e3e8ee'
  const fieldBg = dark ? '#324860' : '#fff'
  const phoneBg = dark ? '#121c27' : '#f3f5f8'
  const prefixBg = dark ? '#243446' : '#e7ebf0'
  const [name, setName] = useState(() => [user?.name, user?.last_name].filter(Boolean).join(' '))
  const [local, setLocal] = useState(() => localDigits(user?.phone_display || user?.phone || ''))
  const [text, setText] = useState('')
  const [step, setStep] = useState('form')
  const [digits, setDigits] = useState(['', '', '', ''])
  const [devCode, setDevCode] = useState('')
  const [isNew, setIsNew] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)
  const boxes = useRef([])
  const phone = `+992${local}`
  const shownPhone = `+992 ${formatLocal(local)}`.trim()
  const ready = name.trim().length > 0 && local.length === 9 && text.trim().length >= 5

  useEffect(() => {
    if (!user) return
    setName((prev) => prev || [user.name, user.last_name].filter(Boolean).join(' '))
    setLocal((prev) => prev || localDigits(user.phone_display || user.phone || ''))
  }, [user])

  useEffect(() => {
    if (seconds <= 0) return undefined
    const timer = setTimeout(() => setSeconds((value) => value - 1), 1000)
    return () => clearTimeout(timer)
  }, [seconds])

  async function requestCode() {
    if (!name.trim()) {
      setError(t('nameRequired'))
      return
    }
    if (local.length < 9) {
      setError(t('invalid_phone'))
      return
    }
    if (text.trim().length < 5) {
      setError(t('text_required'))
      return
    }
    if (user) {
      setBusy(true)
      setError('')
      setSent(false)
      try {
        await api('/api/suggestions/', {
          method: 'POST',
          body: { name: name.trim(), phone: `992${local}`, text: text.trim() },
        })
        setText('')
        setSent(true)
      } catch (err) {
        setError(errorText(err, t))
      } finally {
        setBusy(false)
      }
      return
    }
    setBusy(true)
    setError('')
    try {
      const data = await api('/api/auth/request-code/', { method: 'POST', auth: false, body: { phone } })
      setIsNew(Boolean(data.is_new))
      setDevCode(data.dev_code || '')
      setSeconds(30)
      setDigits(['', '', '', ''])
      setStep('code')
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
      const data = await api('/api/auth/request-code/', { method: 'POST', auth: false, body: { phone } })
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
    if (only && boxes.current[index + 1]) boxes.current[index + 1].focus()
  }

  async function confirmCode() {
    const code = digits.join('')
    if (code.length < 4 || busy) return
    setBusy(true)
    setError('')
    try {
      const data = await api('/api/auth/verify/', {
        method: 'POST',
        auth: false,
        body: {
          phone,
          code,
          role: isNew ? 'client' : undefined,
          name: isNew ? name.trim() : undefined,
        },
      })
      await saveSession(data)
      setUser(data.user)
      await api('/api/suggestions/', {
        method: 'POST',
        body: { name: name.trim(), phone: `992${local}`, text: text.trim() },
      })
      navigation.navigate('Tabs', { screen: 'Cabinet' })
    } catch (err) {
      setError(errorText(err, t))
    } finally {
      setBusy(false)
    }
  }

  const labelStyle = { color: c.muted, fontSize: 13, fontWeight: '600', marginBottom: 6 }
  const inputStyle = {
    backgroundColor: fieldBg,
    color: ink,
    borderWidth: 1,
    borderColor: line,
    borderRadius: 999,
    minHeight: 48,
    paddingHorizontal: 16,
    fontSize: 16,
  }

  return (
    <Screen scroll>
      <Text style={{ color: c.muted, fontSize: 17, lineHeight: 26, marginBottom: 18 }}>
        {step === 'code' ? t('codeSent', { phone: shownPhone }) : t('assistText')}
      </Text>
      {sent ? <Text style={{ color: '#1f7a4d', marginBottom: 10 }}>{t('suggestOk')}</Text> : null}
      {error ? <Text style={{ color: dark ? '#f0b4b4' : colors.bad, marginBottom: 10 }}>{error}</Text> : null}
      {step === 'form' ? (
        <View style={{ backgroundColor: fieldBg, borderWidth: 1, borderColor: line, borderRadius: 28, padding: 22, gap: 12 }}>
          <View>
            <Text style={labelStyle}>{t('suggestName')} *</Text>
            <TextInput value={name} onChangeText={setName} maxLength={120} autoComplete="name" placeholderTextColor="#8aa0b8" style={inputStyle} />
          </View>
          <View>
            <Text style={labelStyle}>{t('suggestPhone')} *</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: phoneBg, borderRadius: 16, overflow: 'hidden' }}>
              <Text style={{ backgroundColor: prefixBg, color: ink, fontWeight: '700', paddingHorizontal: 14, height: 52, lineHeight: 52 }}>+992</Text>
              <TextInput
                value={formatLocal(local)}
                onChangeText={(value) => setLocal(localDigits(value))}
                placeholder="92 123 45 67"
                placeholderTextColor="#8aa0b8"
                keyboardType="phone-pad"
                style={{ flex: 1, height: 52, paddingHorizontal: 14, color: ink, fontSize: 16 }}
              />
            </View>
          </View>
          <View>
            <Text style={labelStyle}>{t('suggestText')} *</Text>
            <TextInput
              value={text}
              onChangeText={setText}
              multiline
              maxLength={4000}
              placeholder={t('suggestPlaceholder')}
              placeholderTextColor="#8aa0b8"
              style={[inputStyle, { borderRadius: 24, minHeight: 140, paddingTop: 14, textAlignVertical: 'top' }]}
            />
          </View>
          <Pressable onPress={requestCode} disabled={busy || !ready} style={{ backgroundColor: colors.navy, borderRadius: 999, minHeight: 48, alignItems: 'center', justifyContent: 'center', opacity: busy || !ready ? 0.6 : 1 }}>
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>{busy ? t('sending') : t('suggestSend')}</Text>
          </Pressable>
        </View>
      ) : (
        <View style={{ backgroundColor: fieldBg, borderWidth: 1, borderColor: line, borderRadius: 28, padding: 22, gap: 12 }}>
          <Text style={{ color: ink, fontSize: 22, fontWeight: '700' }}>{t('confirmTitle')}</Text>
          <Text style={{ color: c.muted, lineHeight: 20 }}>{t('suggestSmsHint')}</Text>
          {devCode ? <Text style={{ color: '#1f7a4d' }}>{t('devCode', { code: devCode })}</Text> : null}
          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 18, backgroundColor: phoneBg, borderRadius: 16, height: 64, alignItems: 'center' }}>
            {digits.map((digit, index) => (
              <TextInput
                key={index}
                ref={(node) => { boxes.current[index] = node }}
                value={digit}
                placeholder="0"
                placeholderTextColor="#c5ced8"
                keyboardType="number-pad"
                inputMode="numeric"
                autoComplete={index === 0 ? 'sms-otp' : 'off'}
                textContentType={index === 0 ? 'oneTimeCode' : 'none'}
                importantForAutofill={index === 0 ? 'yes' : 'no'}
                autoFocus={index === 0}
                maxLength={index === 0 ? 4 : 1}
                onChangeText={(value) => typeDigit(index, value)}
                onKeyPress={({ nativeEvent }) => {
                  if (nativeEvent.key === 'Backspace' && !digits[index] && index > 0) boxes.current[index - 1]?.focus()
                }}
                style={{ width: 28, textAlign: 'center', fontSize: 28, fontWeight: '700', color: ink, padding: 0 }}
              />
            ))}
          </View>
          <Pressable onPress={confirmCode} disabled={busy || digits.join('').length < 4} style={{ backgroundColor: colors.navy, borderRadius: 999, minHeight: 48, alignItems: 'center', justifyContent: 'center', opacity: busy || digits.join('').length < 4 ? 0.6 : 1 }}>
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>{busy ? t('sending') : t('suggestConfirm')}</Text>
          </Pressable>
          <Pressable onPress={resend} disabled={busy || seconds > 0} style={{ minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 999, borderWidth: 1, borderColor: line, opacity: busy || seconds > 0 ? 0.6 : 1 }}>
            <Text style={{ color: ink, fontWeight: '700' }}>{seconds > 0 ? t('resendIn', { sec: seconds }) : t('resend')}</Text>
          </Pressable>
          <Pressable onPress={() => { setStep('form'); setError(''); setDigits(['', '', '', '']) }} disabled={busy}>
            <Text style={{ color: dark ? '#fff' : colors.navy, fontWeight: '700', textDecorationLine: 'underline' }}>{t('changePhone')}</Text>
          </Pressable>
        </View>
      )}
    </Screen>
  )
}
