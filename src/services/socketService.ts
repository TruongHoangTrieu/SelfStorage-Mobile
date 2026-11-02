import { io, Socket } from 'socket.io-client';
import { API_BASE_URL } from '../api';
import { getSession } from '../utils/authStorage';

let socketInstance: Socket | null = null;

/**
 * Trích xuất URL gốc của server từ API_BASE_URL (bỏ phần /api)
 */
export function getSocketBaseUrl(): string {
  try {
    return API_BASE_URL.replace(/\/api\/?$/, '');
  } catch {
    return 'http://localhost:5000';
  }
}

/**
 * Khởi tạo hoặc lấy kết nối Socket.IO
 */
export async function getSocket(): Promise<Socket | null> {
  if (socketInstance && socketInstance.connected) {
    return socketInstance;
  }

  const session = await getSession();
  const token = session.token;

  if (!token) {
    return null;
  }

  const serverUrl = getSocketBaseUrl();

  if (!socketInstance) {
    socketInstance = io(`${serverUrl}/notifications`, {
      auth: { token },
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    socketInstance.on('connect', () => {
      console.log('Mobile Socket connected to /notifications');
    });

    socketInstance.on('disconnect', (reason) => {
      console.log('Mobile Socket disconnected:', reason);
    });

    socketInstance.on('connect_error', (error) => {
      console.warn('Mobile Socket connection error:', error.message);
    });
  } else if (!socketInstance.connected) {
    socketInstance.auth = { token };
    socketInstance.connect();
  }

  return socketInstance;
}

/**
 * Đóng kết nối Socket
 */
export function disconnectSocket() {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
  }
}

