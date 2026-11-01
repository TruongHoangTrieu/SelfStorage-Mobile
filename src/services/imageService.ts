import * as ImagePicker from 'expo-image-picker';
import { Alert, Platform, Keyboard } from 'react-native';

export interface CapturedPhoto {
  id: string;
  uri: string;
  base64?: string;
  title: string;
  createdAt: string;
}

/**
 * Cấu hình Cloudinary (Tùy chọn)
 * Nếu bạn có Cloudinary, điền Cloud Name và Upload Preset không ký (unsigned preset) vào đây.
 * Nếu để trống, hệ thống sẽ tự động dùng ảnh Base64 / Local URI mà không cần tài khoản thứ 3!
 */
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

    // Xin quyền truy cập Camera
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    if (!permissionResult.granted) {
      console.warn('Quyền truy cập Camera chưa được cấp.');
      return null;
    }

    if (Platform.OS === 'ios') {
      await new Promise((resolve) => setTimeout(resolve, 350));
    }

    let result: ImagePicker.ImagePickerResult;
    try {
      result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.85,
        base64: true,
      });
    } catch (launchErr: any) {
      if (Platform.OS === 'ios' && launchErr?.message?.includes('Cannot determine')) {
        await new Promise((resolve) => setTimeout(resolve, 500));
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ['images'],
          allowsEditing: false,
          quality: 0.85,
          base64: true,
        });
      } else {
        throw launchErr;
      }
    }

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

    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      console.warn('Quyền thư viện ảnh chưa được cấp.');
      return null;
    }

    if (Platform.OS === 'ios') {
      await new Promise((resolve) => setTimeout(resolve, 350));
    }

    let result: ImagePicker.ImagePickerResult;
    try {
      result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.85,
        base64: true,
      });
    } catch (launchErr: any) {
      if (Platform.OS === 'ios' && launchErr?.message?.includes('Cannot determine')) {
        await new Promise((resolve) => setTimeout(resolve, 500));
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsEditing: false,
          quality: 0.85,
          base64: true,
        });
      } else {
        throw launchErr;
      }
    }

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
    return null;
  }
}

/**
 * Upload ảnh lên Cloudinary (nếu có cấu hình), hoặc fallback sang Base64 / Local URI
 */
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
