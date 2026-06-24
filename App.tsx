import { DarkTheme, NavigationContainer, Theme } from '@react-navigation/native';
import { navigationRef } from './src/lib/navigationRef';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { PrivacyProvider } from './src/context/PrivacyContext';
import { PurchasesProvider } from './src/context/PurchasesContext';
import AuthenticatedApp from './src/navigation/AuthenticatedApp';
import AdminNavigator from './src/navigation/AdminNavigator';
import LoginScreen from './src/screens/LoginScreen';
import { colors } from './src/theme';

const navigationTheme: Theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.background,
    card: colors.card,
    text: colors.text,
    border: colors.cardBorder,
    primary: colors.accentPink,
  },
};

function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <NavigationContainer ref={navigationRef} theme={navigationTheme}>
      {children}
      <StatusBar style="light" />
    </NavigationContainer>
  );
}

function AppRoutes() {
  const { session, isReady, isPlatformAdmin } = useAuth();

  if (!isReady) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.accentPink} />
      </View>
    );
  }

  if (!session) {
    return <LoginScreen />;
  }

  if (isPlatformAdmin) {
    return <AdminNavigator />;
  }

  return <AuthenticatedApp />;
}

export default function App() {
  const [fontsLoaded] = useFonts({
    SpaceGrotesk_300Light: require('./assets/fonts/SpaceGrotesk_300Light.ttf'),
    SpaceGrotesk_500Medium: require('./assets/fonts/SpaceGrotesk_500Medium.ttf'),
    SpaceGrotesk_700Bold: require('./assets/fonts/SpaceGrotesk_700Bold.ttf'),
  });

  if (!fontsLoaded) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.accentPink} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <PurchasesProvider>
          <PrivacyProvider>
            <AppShell>
              <AppRoutes />
            </AppShell>
          </PrivacyProvider>
        </PurchasesProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
});
