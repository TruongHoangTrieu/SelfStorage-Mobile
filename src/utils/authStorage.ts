import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { setAuthToken } from '../api';

const TOKEN_KEY = '@selfstorage_token';
const USER_KEY = '@selfstorage_user';

export interface StoredSession {
  token: string | null;
  user: any | null;
}

/**
 * Lưu phiên đăng nhập (JWT token & thông tin người dùng) an toàn, bền vững
 * Hỗ trợ cả Native Mobile (iOS/Android qua AsyncStorage) và Web (localStorage + cookie)
 */
export async function saveSession(
  token?: string | null,
  user?: any | null
): Promise<void> {
  try {
    if (token) {
      setAuthToken(token);
      await AsyncStorage.setItem(TOKEN_KEY, token);
    } else {
      await AsyncStorage.removeItem(TOKEN_KEY);
    }

    if (user) {
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
    } else {
      await AsyncStorage.removeItem(USER_KEY);
    }

    // Dự phòng thêm cho Web Browser
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
      try {
        if (token) {
          window.localStorage.setItem('token', token);
          window.localStorage.setItem(TOKEN_KEY, token);
        } else {
          window.localStorage.removeItem('token');
          window.localStorage.removeItem(TOKEN_KEY);
        }
        if (user) {
          window.localStorage.setItem('user', JSON.stringify(user));
          window.localStorage.setItem(USER_KEY, JSON.stringify(user));
        } else {
          window.localStorage.removeItem('user');
          window.localStorage.removeItem(USER_KEY);
        }
      } catch (e) {
        // Ignored
      }
    }
  } catch (err) {
    console.warn('Lỗi lưu phiên đăng nhập:', err);
  }
}

/**
 * Khôi phục phiên đăng nhập khi khởi động ứng dụng
 */
export async function getSession(): Promise<StoredSession> {
  let token: string | null = null;
  let user: any = null;

  try {
    token = await AsyncStorage.getItem(TOKEN_KEY);
    const userStr = await AsyncStorage.getItem(USER_KEY);
    if (userStr) {
      try {
        user = JSON.parse(userStr);
      } catch {
        user = null;
      }
    }
  } catch (err) {
    console.warn('Lỗi đọc AsyncStorage:', err);
  }

  // Fallback đọc từ localStorage nếu Web
  if ((!token || !user) && Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
    try {
      if (!token) {
        token = window.localStorage.getItem(TOKEN_KEY) || window.localStorage.getItem('token');
      }
      if (!user) {
        const localUserStr = window.localStorage.getItem(USER_KEY) || window.localStorage.getItem('user');
        if (localUserStr) {
          user = JSON.parse(localUserStr);
        }
      }
    } catch (e) {
      // Ignored
    }
  }

  if (token) {
    setAuthToken(token);
  }

  return { token, user };
}

/**
 * Xóa sạch phiên đăng nhập khi Logout
 */
export async function clearSession(): Promise<void> {
  try {
    setAuthToken(null);
    await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);

    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.removeItem(TOKEN_KEY);
        window.localStorage.removeItem(USER_KEY);
        window.localStorage.removeItem('token');
        window.localStorage.removeItem('user');
      } catch {
        // Ignored
      }
    }
  } catch (err) {
    console.warn('Lỗi xóa phiên đăng nhập:', err);
  }
}
