import { useEffect, useRef } from 'react'
import { Animated, Easing, StyleSheet, View } from 'react-native'

export function Shimmer({ style }) {
  const shift = useRef(new Animated.Value(0)).current
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(shift, {
        toValue: 1,
        duration: 1300,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    )
    loop.start()
    return () => loop.stop()
  }, [shift])
  const travel = shift.interpolate({ inputRange: [0, 1], outputRange: [-240, 420] })
  return (
    <View style={[styles.base, style]}>
      <Animated.View style={[styles.band, styles.dim, { transform: [{ translateX: travel }, { skewX: '-18deg' }] }]} />
      <Animated.View style={[styles.band, styles.bright, { transform: [{ translateX: travel }, { skewX: '-18deg' }] }]} />
      <Animated.View style={[styles.band, styles.white, { transform: [{ translateX: travel }, { skewX: '-18deg' }] }]} />
    </View>
  )
}

export function FeedSkeleton() {
  return (
    <View style={{ gap: 18, marginTop: 6 }}>
      {[0, 1, 2].map((key) => (
        <View key={key}>
          <Shimmer style={styles.photo} />
          <Shimmer style={[styles.line, { width: '42%', marginTop: 12 }]} />
          <Shimmer style={[styles.line, { width: '78%' }]} />
          <Shimmer style={[styles.line, { width: '56%' }]} />
        </View>
      ))}
    </View>
  )
}

export function DetailSkeleton() {
  return (
    <View style={{ padding: 16, gap: 12 }}>
      <Shimmer style={[styles.line, { width: '62%', height: 18 }]} />
      <Shimmer style={{ height: 280, borderRadius: 18 }} />
      <Shimmer style={[styles.line, { width: '48%', height: 22 }]} />
      <Shimmer style={[styles.line, { width: '86%' }]} />
      <Shimmer style={[styles.line, { width: '70%' }]} />
    </View>
  )
}

const styles = StyleSheet.create({
  base: { overflow: 'hidden', backgroundColor: '#c5ced6' },
  band: { position: 'absolute', top: -40, bottom: -40 },
  dim: { width: 70, backgroundColor: '#aeb8c2' },
  bright: { width: 54, marginLeft: 78, backgroundColor: '#eef2f6' },
  white: { width: 28, marginLeft: 118, backgroundColor: '#ffffff' },
  photo: { width: '100%', aspectRatio: 16 / 10, borderRadius: 18 },
  line: { height: 14, borderRadius: 999, marginTop: 8 },
})
