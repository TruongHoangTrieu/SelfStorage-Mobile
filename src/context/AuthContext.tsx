import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Alert, Platform } from 'react-native';
import { apiRequest, setAuthToken, getAuthToken } from '../api';
import { saveSession, getSession, clearSession } from '../utils/authStorage';
import { useAppMode } from './AppModeContext';

export function isStaffRole(user: any): boolean {
  if (!user) return false;
  const role = String(user.role || '').toUpperCase();
  const email = String(user.email || '').toLowerCase();
  return (
    role === 'FACILITY_STAFF' ||
    role === 'FACILITY_MANAGER' ||
    role === 'ADMIN' ||
    role === 'SYSTEM_ADMINISTRATOR' ||
    role === 'BUSINESS_OPERATIONS_MANAGER' ||
    role === 'STAFF' ||
    role === 'MANAGER' ||
    role.includes('STAFF') ||
    role.includes('MANAGER') ||
    role.includes('ADMIN') ||
    email.includes('staff') ||
    email.includes('manager')
  );
}

interface AuthContextType {
  isLoggedIn: boolean;
  currentUser: any;
  showAuthModal: boolean;
  submitting: boolean;
  setIsLoggedIn: (logged: boolean) => void;
  setCurrentUser: (user: any) => void;
  setShowAuthModal: (show: boolean) => void;
  handleQuickLogin: (onSuccessCallback?: () => void) => Promise<void>;
  handleLoginSuccess: (
    user: any,
    onRoleDetermined?: (role: 'staff' | 'customer') => void,
    token?: string
  ) => void;
  handleLogout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { setAppMode } = useAppMode();
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Khôi phục phiên đăng nhập khi mở lại ứng dụng (hỗ trợ cả Mobile Native iOS/Android & Web)
  useEffect(() => {
    getSession().then(({ token, user }) => {
      if (user) {
        setCurrentUser(user);
        setIsLoggedIn(true);
        if (isStaffRole(user)) {
          setAppMode('staff');
        } else {
          setAppMode('customer');
        }
      }
    });
  }, [setAppMode]);

  const handleQuickLogin = async (onSuccessCallback?: () => void) => {
    try {
      setSubmitting(true);
      const res = await apiRequest<any>('/auth/google', {
        method: 'POST',
        body: JSON.stringify({
          credential: 'demo-google-token-mobile-' + Date.now(),
        }),
      });

      if (res?.accessToken) {
        const user = res.user || {
          email: 'customer.google@selfstorage.vn',
          fullName: 'Khách hàng Google',
          role: 'STORAGE_CUSTOMER',
        };
        await saveSession(res.accessToken, user);
        setCurrentUser(user);
        setIsLoggedIn(true);
        setShowAuthModal(false);

        const role: 'staff' | 'customer' = isStaffRole(user) ? 'staff' : 'customer';
        setAppMode(role);

        Alert.alert('Thành công', `Đăng nhập: ${user.fullName || user.email}`);
        if (onSuccessCallback) {
          onSuccessCallback();
        }
      }
    } catch (err: any) {
      Alert.alert('Thông báo', err.message || 'Lỗi đăng nhập');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLoginSuccess = async (
    user: any,
    onRoleDetermined?: (role: 'staff' | 'customer') => void,
    token?: string
  ) => {
    setCurrentUser(user);
    setIsLoggedIn(true);
    setShowAuthModal(false);

    // Lưu session bền vững vào Storage
    const effectiveToken = token || getAuthToken();
    await saveSession(effectiveToken, user);

    const role: 'staff' | 'customer' = isStaffRole(user) ? 'staff' : 'customer';
    setAppMode(role);

    if (onRoleDetermined) {
      onRoleDetermined(role);
    }
  };

  const handleLogout = async () => {
    await clearSession();
    setCurrentUser(null);
    setIsLoggedIn(false);
    setAppMode('customer');
  };

  return (
    <AuthContext.Provider
      value={{
        isLoggedIn,
        currentUser,
        showAuthModal,
        submitting,
        setIsLoggedIn,
        setCurrentUser,
        setShowAuthModal,
        handleQuickLogin,
        handleLoginSuccess,
        handleLogout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
