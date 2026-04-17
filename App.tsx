import { Ionicons } from '@expo/vector-icons';
import { useFonts } from 'expo-font';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { SpaceGrotesk_700Bold } from '@expo-google-fonts/space-grotesk';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AIAssistantScreen } from './src/screens/AIAssistantScreen';
import { LiveMapScreen } from './src/screens/LiveMapScreen';
import { VehicleProfileScreen } from './src/screens/VehicleProfileScreen';
import { initializeBackgroundStateTracking } from './src/services/backgroundStateTracking';
import { colors } from './src/theme/colors';

const Tab = createBottomTabNavigator();

const appDarkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.background,
    card: '#0A0F1F',
    text: colors.textPrimary,
    border: 'rgba(148, 163, 184, 0.2)',
    primary: colors.accent,
  },
};

export default function App() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    SpaceGrotesk_700Bold,
  });

  useEffect(() => {
    void initializeBackgroundStateTracking();
  }, []);

  if (!fontsLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={colors.accentStrong} size="large" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer theme={appDarkTheme}>
        <StatusBar style="light" />
        <Tab.Navigator
          initialRouteName="Live Map"
          screenOptions={({ route }) => ({
            headerShown: false,
            tabBarShowLabel: true,
            tabBarStyle: styles.tabBar,
            tabBarActiveTintColor: colors.accentStrong,
            tabBarInactiveTintColor: colors.textSecondary,
            tabBarIcon: ({ color, size }) => {
              let iconName: keyof typeof Ionicons.glyphMap = 'ellipse';

              if (route.name === 'Live Map') {
                iconName = 'map';
              } else if (route.name === 'AI Assistant') {
                iconName = 'sparkles';
              } else if (route.name === 'Vehicle Profile') {
                iconName = 'car-sport';
              }

              return <Ionicons name={iconName} size={size} color={color} />;
            },
          })}
        >
          <Tab.Screen name="Live Map" component={LiveMapScreen} />
          <Tab.Screen name="AI Assistant" component={AIAssistantScreen} />
          <Tab.Screen name="Vehicle Profile" component={VehicleProfileScreen} />
        </Tab.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  tabBar: {
    backgroundColor: '#070D1A',
    borderTopColor: 'rgba(148, 163, 184, 0.2)',
    height: 74,
    paddingBottom: 10,
    paddingTop: 8,
  },
});
