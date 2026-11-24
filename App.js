import { Text, View } from 'react-native'
import { NavigationContainer } from '@react-navigation/native'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { StatusBar } from 'expo-status-bar'
import { I18nProvider, useI18n } from './src/i18n'
import { Icon } from './src/icons'
import { AuthProvider, MenuProvider, PrefsProvider, SavedProvider, useAuth, useMenu, usePrefs, useSaved } from './src/state'
import { BackButton } from './src/chrome'
import { colors, useColors } from './src/ui'
import { HomeScreen, ListingsScreen, MapScreen } from './src/screens/browse'
import { DetailScreen } from './src/screens/detail'
import { FavoritesScreen, CompareScreen } from './src/screens/saved'
import { ReelsScreen } from './src/screens/reels'
import { LoginScreen } from './src/screens/login'
import { AboutScreen, CabinetScreen, MyListingsScreen, MySuggestionsScreen, NotificationsScreen, PaymentsScreen, ProfileScreen, ReviewsScreen, SettingsScreen, SubscriptionsScreen, WalletScreen } from './src/screens/cabinet'
import { PostScreen } from './src/screens/post'
import { MessagesScreen } from './src/screens/messages'
import { PayResultScreen, TariffsScreen } from './src/screens/money'
import { SuggestScreen } from './src/screens/suggest'
import { DashboardScreen, DashDictsScreen, DashGeoScreen, DashListingScreen, DashListingsScreen, DashSettingsScreen, DashSuggestionsScreen, DashTariffsScreen, DashUsersScreen } from './src/screens/dashboard'

const Stack = createNativeStackNavigator()
const Tab = createBottomTabNavigator()

function AddScreen() {
  return null
}

function Tabs() {
  const { t } = useI18n()
  const c = useColors()
  const { user } = useAuth()
  const { favorites } = useSaved()
  const { open } = useMenu()
  const dark = usePrefs().theme === 'dark'
  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: c.paper },
        headerTintColor: dark ? '#e8eef5' : colors.navy,
        headerTitleStyle: { fontWeight: '700' },
        tabBarActiveTintColor: dark ? '#fff' : colors.navy,
        tabBarInactiveTintColor: c.muted,
        tabBarStyle: open
          ? { display: 'none' }
          : { backgroundColor: dark ? 'rgba(16,24,32,0.96)' : 'rgba(255,255,255,0.96)', borderTopColor: c.line, overflow: 'visible' },
        tabBarLabel: ({ color, children }) => (
          <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={{ color, fontSize: 11, fontWeight: '700', marginTop: 2, textAlign: 'center' }}>{children}</Text>
        ),
      }}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: t('footHome'), headerShown: false, tabBarIcon: ({ color }) => <Icon name="home" size={22} color={color} /> }} />
      <Tab.Screen
        name="Favorites"
        component={FavoritesScreen}
        options={{
          title: t('navFavorites'),
          headerShown: false,
          tabBarBadge: favorites.length || undefined,
          tabBarBadgeStyle: { backgroundColor: dark ? '#fff' : colors.navy, color: dark ? colors.navy : '#fff', fontSize: 10, fontWeight: '800' },
          tabBarIcon: ({ color }) => <Icon name="heart" size={22} color={color} filled={favorites.length > 0} />,
        }}
      />
      <Tab.Screen
        name="Add"
        component={AddScreen}
        listeners={({ navigation }) => ({
          tabPress: (event) => {
            event.preventDefault()
            if (!user) navigation.navigate('Login', { after: 'Add' })
            else if (user.can_post) navigation.navigate('Post')
            else navigation.navigate('Tariffs')
          },
        })}
        options={{
          title: t('navAdd'),
          tabBarIcon: () => (
            <View style={{ width: 46, height: 46, marginTop: -18, borderRadius: 23, backgroundColor: dark ? '#fff' : colors.navy, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="plus" size={22} color={dark ? colors.navy : '#fff'} />
            </View>
          ),
        }}
      />
      <Tab.Screen name="Offers" component={SuggestScreen} options={{ title: t('navOffers'), tabBarIcon: ({ color }) => <Icon name="suggest" size={22} color={color} /> }} />
      <Tab.Screen
        name="Cabinet"
        component={CabinetScreen}
        listeners={({ navigation }) => ({
          tabPress: (event) => {
            if (user) return
            event.preventDefault()
            navigation.navigate('Login', { after: 'Cabinet' })
          },
        })}
        options={{ title: user ? t('navProfile') : t('navLogin'), tabBarIcon: ({ color }) => <Icon name="user" size={22} color={color} /> }}
      />
    </Tab.Navigator>
  )
}

function Root() {
  const { t } = useI18n()
  const c = useColors()
  const dark = usePrefs().theme === 'dark'
  const screen = ({ navigation }) => ({
    headerStyle: { backgroundColor: c.paper },
    headerTintColor: dark ? '#e8eef5' : colors.navy,
    headerTitleStyle: { fontWeight: '700' },
    contentStyle: { backgroundColor: c.paper },
    headerBackVisible: false,
    headerLeftContainerStyle: { paddingLeft: 12, justifyContent: 'center' },
    headerLeft: ({ canGoBack }) => canGoBack ? (
      <BackButton dark={dark} onPress={() => navigation.goBack()} />
    ) : null,
  })
  return (
    <Stack.Navigator screenOptions={screen}>
      <Stack.Screen name="Tabs" component={Tabs} options={{ headerShown: false }} />
      <Stack.Screen name="Listings" component={ListingsScreen} options={{ title: t('navListings') }} />
      <Stack.Screen name="Reels" component={ReelsScreen} options={{ title: t('navReels'), headerShown: false }} />
      <Stack.Screen name="Detail" component={DetailScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false, presentation: 'transparentModal', animation: 'fade', contentStyle: { backgroundColor: 'transparent' } }} />
      <Stack.Screen name="Compare" component={CompareScreen} options={{ title: t('navCompare') }} />
      <Stack.Screen name="Messages" component={MessagesScreen} options={{ title: t('navMessages') }} />
      <Stack.Screen name="Post" component={PostScreen} options={{ title: t('navPost') }} />
      <Stack.Screen name="Tariffs" component={TariffsScreen} options={{ title: t('navTariffs') }} />
      <Stack.Screen name="PayResult" component={PayResultScreen} options={{ title: t('payTitle') }} />
      <Stack.Screen name="Suggest" component={SuggestScreen} options={{ title: t('navAssist') }} />
      <Stack.Screen name="Map" component={MapScreen} options={{ title: t('map') || 'Карта' }} />
      <Stack.Screen name="MyListings" component={MyListingsScreen} options={{ title: t('myListings') }} />
      <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: t('myProfile') }} />
      <Stack.Screen name="Wallet" component={WalletScreen} options={{ title: t('myWallet') }} />
      <Stack.Screen name="Payments" component={PaymentsScreen} options={{ title: t('payments') }} />
      <Stack.Screen name="Reviews" component={ReviewsScreen} options={{ title: t('reviews') }} />
      <Stack.Screen name="MySuggestions" component={MySuggestionsScreen} options={{ title: t('mySuggestions') }} />
      <Stack.Screen name="Subscriptions" component={SubscriptionsScreen} options={{ title: t('mySubscriptions') }} />
      <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: t('menuSettings') }} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ title: t('notifySettings') }} />
      <Stack.Screen name="About" component={AboutScreen} options={{ title: t('aboutApp') }} />
      <Stack.Screen name="Dashboard" component={DashboardScreen} options={{ title: t('navDashboard') }} />
      <Stack.Screen name="DashListings" component={DashListingsScreen} options={{ title: t('navListings') }} />
      <Stack.Screen name="DashListing" component={DashListingScreen} options={{ title: t('moreDetails') }} />
      <Stack.Screen name="DashSuggestions" component={DashSuggestionsScreen} options={{ title: t('navOffers') }} />
      <Stack.Screen name="DashUsers" component={DashUsersScreen} options={{ title: t('navDashboard') }} />
      <Stack.Screen name="DashTariffs" component={DashTariffsScreen} options={{ title: t('navTariffs') }} />
      <Stack.Screen name="DashGeo" component={DashGeoScreen} options={{ title: t('district') }} />
      <Stack.Screen name="DashDicts" component={DashDictsScreen} options={{ title: t('filters') }} />
      <Stack.Screen name="DashSettings" component={DashSettingsScreen} options={{ title: t('menuSettings') }} />
    </Stack.Navigator>
  )
}

function ThemeBar() {
  const dark = usePrefs().theme === 'dark'
  return <StatusBar style={dark ? 'light' : 'dark'} />
}

export default function App() {
  return (
    <SafeAreaProvider>
      <I18nProvider>
        <PrefsProvider>
        <AuthProvider>
          <SavedProvider>
            <MenuProvider>
            <NavigationContainer>
              <ThemeBar />
              <Root />
            </NavigationContainer>
            </MenuProvider>
          </SavedProvider>
        </AuthProvider>
        </PrefsProvider>
      </I18nProvider>
    </SafeAreaProvider>
  )
}
