import React, { createContext, useContext, useState, ReactNode } from 'react';

export type AppMode = 'customer' | 'staff';

interface AppModeContextType {
  appMode: AppMode;
  setAppMode: (mode: AppMode) => void;
  switchToStaff: () => void;
  switchToCustomer: () => void;
}

const AppModeContext = createContext<AppModeContextType | undefined>(undefined);

export function AppModeProvider({ children }: { children: ReactNode }) {
  // Mặc định mở Customer Portal để dev trực tiếp trang Đặt kho
  const [appMode, setAppMode] = useState<AppMode>('customer');

  const switchToStaff = () => setAppMode('staff');
  const switchToCustomer = () => setAppMode('customer');

  return (
    <AppModeContext.Provider
      value={{
        appMode,
        setAppMode,
        switchToStaff,
        switchToCustomer,
      }}
    >
      {children}
    </AppModeContext.Provider>
  );
}

export function useAppMode(): AppModeContextType {
  const context = useContext(AppModeContext);
  if (!context) {
    throw new Error('useAppMode must be used within an AppModeProvider');
  }
  return context;
}
