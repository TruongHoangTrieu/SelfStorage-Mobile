import * as ImagePicker from 'expo-image-picker';
import { Alert, Platform, Keyboard } from 'react-native';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitForInteractions(): Promise<void> {
  await new Promise<void>((resolve) => {
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(() => resolve());
    } else {
      resolve();
    }
  });
  await delay(250);
}

async function launchLibraryWithRetry(
  options: ImagePicker.ImagePickerOptions,
): Promise<ImagePicker.ImagePickerResult> {
  if (Platform.OS === 'ios') {
    await waitForInteractions();
  }

  let lastErr: any;
  const delays = [0, 450, 800, 1200];
  for (let i = 0; i < delays.length; i++) {
    if (delays[i] > 0) {
      await delay(delays[i]);
    }
    try {
      return await ImagePicker.launchImageLibraryAsync(options);
    } catch (err: any) {
      lastErr = err;
      const msg = String(err?.message || '');
      if (Platform.OS === 'ios' && msg.includes('Cannot determine')) {
        continue;
      }
      throw err;
    }
  }
  throw lastErr;
}

async function launchCameraWithRetry(
  options: ImagePicker.ImagePickerOptions,
): Promise<ImagePicker.ImagePickerResult> {
  if (Platform.OS === 'ios') {
    await waitForInteractions();
  }

  let lastErr: any;
  const delays = [0, 450, 800, 1200];
  for (let i = 0; i < delays.length; i++) {
    if (delays[i] > 0) {
      await delay(delays[i]);
    }
    try {
      return await ImagePicker.launchCameraAsync(options);
    } catch (err: any) {
      lastErr = err;
      const msg = String(err?.message || '');
      if (Platform.OS === 'ios' && msg.includes('Cannot determine')) {
        continue;
      }
      throw err;
    }
  }
  throw lastErr;
}

export interface CapturedPhoto {
  id: string;
  uri: string;
  base64?: string;
  title: string;
  createdAt: string;
}

const DEMO_FALLBACK_PHOTO_URL =
  'https://res.cloudinary.com/micb9okr/image/upload/v1794997366/selfstorage/xcynitzxyjgnmhmbbsn1.jpg';

function promptIosFallbackPhoto(titlePrefix: string): Promise<CapturedPhoto | null> {
  const now = new Date();
  const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  return new Promise((resolve) => {
    Alert.alert(
      'Thiết bị đang bận trình xem ảnh',
      'Phiên Expo Go trên iOS đang giữ một hộp thoại trước đó. Bạn có thể đóng hẳn app Expo Go mở lại, hoặc chọn "Dùng ảnh mẫu ngay" để tiếp tục thao tác:',
      [
        {
          text: 'Dùng ảnh mẫu ngay',
          onPress: () =>
            resolve({
              id: `photo-fallback-${Date.now()}`,
              uri: DEMO_FALLBACK_PHOTO_URL,
              title: `${titlePrefix} lúc ${timeStr}`,
              createdAt: now.toISOString(),
            }),
        },
        {
          text: 'Hủy',
          style: 'cancel',
          onPress: () => resolve(null),
        },
      ],
    );
  });
}
export const CLOUDINARY_CONFIG = {
  cloudName: process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME || 'micb9okr',
  uploadPreset: process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'selfstorage_uploads',
};

/**
 * Xin quyền và Chụp ảnh trực tiếp bằng Camera
 */
export async function takePhotoWithCamera(): Promise<CapturedPhoto | null> {
  try {
    Keyboard.dismiss();
    if (Platform.OS === 'ios') {
      await new Promise((resolve) => setTimeout(resolve, 300));
    }

    // Xin quyền truy cập Camera (chỉ hỏi nếu chưa được cấp để tránh kẹt ViewController trên iOS)
    let permissionResult = await ImagePicker.getCameraPermissionsAsync();
    if (!permissionResult.granted) {
      permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      if (Platform.OS === 'ios') await delay(400);
    }
    if (!permissionResult.granted) {
      console.warn('Quyền truy cập Camera chưa được cấp.');
      return null;
    }

    const result = await launchCameraWithRetry({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 0.85,
      base64: true,
    });

    if (result.canceled || !result.assets || result.assets.length === 0) {
      return null;
    }

    const asset = result.assets[0];
    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    const formattedBase64 = asset.base64
      ? (asset.base64.startsWith('data:') ? asset.base64 : `data:image/jpeg;base64,${asset.base64}`)
      : undefined;

    return {
      id: `photo-${Date.now()}`,
      uri: asset.uri || formattedBase64 || '',
      base64: formattedBase64,
      title: `Ảnh chụp camera lúc ${timeStr}`,
      createdAt: now.toISOString(),
    };
  } catch (err: any) {
    console.warn('Không thể mở camera:', err?.message || err);
    if (String(err?.message || '').includes('Cannot determine')) {
      return await promptIosFallbackPhoto('Ảnh chụp');
    }
    return null;
  }
}

/**
 * Xin quyền và Chọn ảnh có sẵn từ Thư viện ảnh (Gallery)
 */
export async function pickPhotoFromGallery(): Promise<CapturedPhoto | null> {
  try {
    Keyboard.dismiss();
    if (Platform.OS === 'ios') {
      await new Promise((resolve) => setTimeout(resolve, 300));
    }

    let permissionResult = await ImagePicker.getMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (Platform.OS === 'ios') await delay(400);
    }
    if (!permissionResult.granted) {
      console.warn('Quyền thư viện ảnh chưa được cấp.');
      return null;
    }

    const result = await launchLibraryWithRetry({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 0.85,
      base64: true,
    });

    if (result.canceled || !result.assets || result.assets.length === 0) {
      return null;
    }

    const asset = result.assets[0];
    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    const formattedBase64 = asset.base64
      ? (asset.base64.startsWith('data:') ? asset.base64 : `data:image/jpeg;base64,${asset.base64}`)
      : undefined;

    return {
      id: `photo-${Date.now()}`,
      uri: asset.uri || formattedBase64 || '',
      base64: formattedBase64,
      title: `Ảnh từ thư viện lúc ${timeStr}`,
      createdAt: now.toISOString(),
    };
  } catch (err: any) {
    console.warn('Không thể mở thư viện ảnh:', err?.message || err);
    if (String(err?.message || '').includes('Cannot determine')) {
      return await promptIosFallbackPhoto('Ảnh thư viện');
    }
    return null;
  }
}

/**
 * Upload ảnh lên Cloudinary (nếu có cấu hình), hoặc fallback sang Base64 / Local URI
 */

/**
 * Xin quyền và Chọn NHIỀU ảnh cùng một lúc từ Thư viện ảnh (Gallery)
 */
export async function pickMultiplePhotosFromGallery(maxPhotos: number = 10): Promise<CapturedPhoto[]> {
  try {
    Keyboard.dismiss();
    let permissionResult = await ImagePicker.getMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (Platform.OS === 'ios') await delay(400);
    }
    if (!permissionResult.granted) {
      Alert.alert(
        'Quyền thư viện ảnh',
        'Ứng dụng cần quyền truy cập thư viện để chọn ảnh hiện trạng ô kho.'
      );
      return [];
    }

    const result = await launchLibraryWithRetry({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: maxPhotos,
      quality: 0.85,
      base64: true,
    });

    if (result.canceled || !result.assets || result.assets.length === 0) {
      return [];
    }

    const now = new Date();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const timeStr = hours + ':' + minutes;

    return result.assets.map((asset, index) => {
      const formattedBase64 = asset.base64
        ? (asset.base64.startsWith('data:') ? asset.base64 : 'data:image/jpeg;base64,' + asset.base64)
        : undefined;

      return {
        id: 'photo-' + Date.now() + '-' + index + '-' + Math.floor(Math.random() * 1000),
        uri: asset.uri || formattedBase64 || '',
        base64: formattedBase64,
        title: 'Ảnh #' + (index + 1) + ' lúc ' + timeStr,
        createdAt: now.toISOString(),
      };
    });
  } catch (err: any) {
    console.error('Lỗi khi chọn nhiều ảnh từ thư viện:', err);
    if (String(err?.message || '').includes('Cannot determine')) {
      const fallback = await promptIosFallbackPhoto('Ảnh hiện trạng kho');
      return fallback ? [fallback] : [];
    }
    Alert.alert('Lỗi Thư Viện', err.message || 'Không thể truy cập thư viện ảnh.');
    return [];
  }
}

export async function uploadImageToStorage(photo: CapturedPhoto): Promise<string> {
  // Nếu ảnh đã là URL online (https://res.cloudinary.com... hoặc ảnh web), không cần upload lại
  if (photo.uri && (photo.uri.startsWith('http://') || photo.uri.startsWith('https://')) && !photo.uri.startsWith('file://')) {
    return photo.uri;
  }

  // Nếu có cấu hình Cloudinary, upload lên CDN
  if (CLOUDINARY_CONFIG.cloudName && CLOUDINARY_CONFIG.uploadPreset) {
    try {
      const data = new FormData();
      // Cloudinary API hỗ trợ Base64 Data URI trực tiếp trên cả Mobile (Android/iOS) và Web,
      // giúp tránh hoàn toàn lỗi đọc file hệ thống của React Native.
      if (photo.base64) {
        data.append('file', photo.base64);
      } else {
        const uriParts = (photo.uri || '').split('.');
        const fileType = uriParts[uriParts.length - 1] || 'jpg';
        data.append('file', {
          uri: photo.uri,
          name: `upload_${Date.now()}.${fileType}`,
          type: `image/${fileType === 'png' ? 'png' : 'jpeg'}`,
        } as any);
      }
      data.append('upload_preset', CLOUDINARY_CONFIG.uploadPreset);

      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CONFIG.cloudName}/image/upload`,
        {
          method: 'POST',
          body: data,
        }
      );

      const json = await res.json();
      if (json.secure_url) {
        return json.secure_url;
      }
      if (json.error) {
        console.warn('Cloudinary upload warning:', json.error.message);
      }
    } catch (err) {
      console.warn('Upload Cloudinary thất bại, chuyển sang URI ảnh:', err);
    }
  }

  // Fallback: Ưu tiên trả về URI ảnh ngắn để KHÔNG gây lỗi HTTP 413 (Payload Too Large) ở Backend
  return photo.uri || photo.base64 || '';
}

/**
 * Upload danh sách nhiều ảnh cùng lúc lên Cloudinary / CDN
 */
export async function uploadMultipleImagesToStorage(photos: CapturedPhoto[]): Promise<string[]> {
  if (!photos || photos.length === 0) return [];
  const results = await Promise.all(photos.map((p) => uploadImageToStorage(p)));
  return results.filter(Boolean);
}
