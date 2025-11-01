import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NavigationContainer } from '@react-navigation/native';
import { ActivityIndicator, View } from 'react-native';
import { AuthProvider, useAuthContext } from '@/context/AuthContext';
import LoginScreen from '@/screens/LoginScreen';
import SpacesScreen from '@/screens/SpacesScreen';
import ClientsScreen from '@/screens/ClientsScreen';
import ReservationsScreen from '@/screens/ReservationsScreen';
import ReservationDetailsScreen from '@/screens/ReservationDetailsScreen';
import FinanceScreen from '@/screens/FinanceScreen';
import WhatsAppInsightsScreen from '@/screens/WhatsAppInsightsScreen';
import { colors } from '@/theme/colors';

const AuthStack = createNativeStackNavigator();
const ReservationStack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const ReservationsNavigator = () => (
  <ReservationStack.Navigator>
    <ReservationStack.Screen
      name="ReservationsList"
      component={ReservationsScreen}
      options={{ title: 'Reservas' }}
    />
    <ReservationStack.Screen
      name="ReservationDetails"
      component={ReservationDetailsScreen}
      options={{ title: 'Detalhes da Reserva' }}
    />
  </ReservationStack.Navigator>
);

const AppTabs = () => (
  <Tab.Navigator
    screenOptions={{
      headerShown: false,
      tabBarActiveTintColor: colors.primary,
      tabBarInactiveTintColor: colors.muted
    }}
  >
    <Tab.Screen name="Espaços" component={SpacesScreen} />
    <Tab.Screen name="Clientes" component={ClientsScreen} />
    <Tab.Screen
      name="Reservas"
      component={ReservationsNavigator}
      options={{ headerShown: false }}
    />
    <Tab.Screen name="Financeiro" component={FinanceScreen} />
    <Tab.Screen name="Insights" component={WhatsAppInsightsScreen} />
  </Tab.Navigator>
);

const Router = () => {
  const { user, loading } = useAuthContext();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {user ? (
        <AppTabs />
      ) : (
        <AuthStack.Navigator>
          <AuthStack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
        </AuthStack.Navigator>
      )}
    </NavigationContainer>
  );
};

const AppNavigator = () => (
  <AuthProvider>
    <Router />
  </AuthProvider>
);

export default AppNavigator;
