import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppModeProvider } from './src/context/AppModeContext';
import { AuthProvider } from './src/context/AuthContext';
import RootNavigator from './src/navigation/RootNavigator';

export default function App() {
  return (
    <SafeAreaProvider>
      <AppModeProvider>
        <AuthProvider>
          <RootNavigator />
        </AuthProvider>
      </AppModeProvider>
    </SafeAreaProvider>
  );
}
