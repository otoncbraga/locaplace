import React from 'react';
import { StatusBar } from 'expo-status-bar';
import AppNavigator from '@/navigation/AppNavigator';

const App = () => (
  <>
    <StatusBar style="light" />
    <AppNavigator />
  </>
);

export default App;
