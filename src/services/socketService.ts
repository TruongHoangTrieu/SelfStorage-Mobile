import { io, Socket } from 'socket.io-client';
import { API_BASE_URL } from '../api';
import { getSession } from '../utils/authStorage';

let socketInstance: Socket | null = null;
let currentSocketToken: string | null = null;

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
  const session = await getSession();
  const token = session.token;
  const user = session.user;

  if (!token) {
    disconnectSocket();
    return null;
  }

  // Nếu đổi tài khoản / token khác, đóng kết nối cũ để tránh giữ room của user trước
  if (socketInstance && currentSocketToken && currentSocketToken !== token) {
    disconnectSocket();
  }

  const authPayload = {
    token,
    userId: user?.id ? String(user.id) : undefined,
    role: user?.role ? String(user.role) : undefined,
    facilityId: user?.facilityId ? String(user.facilityId) : undefined,
  };

  if (socketInstance && socketInstance.connected) {
    return socketInstance;
  }

  const serverUrl = getSocketBaseUrl();

  if (!socketInstance) {
    currentSocketToken = token;
    socketInstance = io(`${serverUrl}/notifications`, {
      auth: authPayload,
      // Dùng polling -> websocket để vượt qua reverse proxy & cold-start của Render ổn định trên Mobile/Web
      transports: ['polling', 'websocket'],
      withCredentials: false,
      timeout: 45000,
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    socketInstance.on('connect', () => {
      console.log('Mobile Socket connected to /notifications:', socketInstance?.id);
      if (user?.facilityId) {
        socketInstance?.emit('join_facility', String(user.facilityId));
      }
    });

    socketInstance.on('disconnect', (reason) => {
      console.log('Mobile Socket disconnected:', reason);
    });

    socketInstance.on('connect_error', (error) => {
      console.warn('Mobile Socket connection error:', error.message);
    });
  } else if (!socketInstance.connected) {
    currentSocketToken = token;
    socketInstance.auth = authPayload;
    socketInstance.connect();
  }

  return socketInstance;
}

/**
 * Đóng kết nối Socket
 */
export function disconnectSocket() {
  currentSocketToken = null;
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
  }
}

