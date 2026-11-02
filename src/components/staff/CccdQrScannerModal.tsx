import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  TouchableOpacity,
  Platform,
  Alert,
  ActivityIndicator,
  Animated,
  Dimensions,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions, BarcodeScanningResult } from 'expo-camera';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const SCAN_AREA_SIZE = Math.min(SCREEN_WIDTH * 0.72, 260);

export interface CccdQrData {
  cccdNumber: string;
  fullName?: string;
  birthDate?: string;
  gender?: string;
  address?: string;
  issueDate?: string;
  rawData: string;
}

interface CccdQrScannerModalProps {
  visible: boolean;
  onClose: () => void;
  onScanSuccess: (data: CccdQrData) => void;
}

export default function CccdQrScannerModal({
  visible,
  onClose,
  onScanSuccess,
}: CccdQrScannerModalProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [torchEnabled, setTorchEnabled] = useState<boolean>(false);
  const [scanned, setScanned] = useState<boolean>(false);

  // Hiệu ứng thanh laser quét chuyển động
  const [scanAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    if (visible) {
      setScanned(false);
      setTorchEnabled(false);

      // Chạy vòng lặp quét laser
      Animated.loop(
        Animated.sequence([
          Animated.timing(scanAnim, {
            toValue: SCAN_AREA_SIZE - 4,
            duration: 1800,
            useNativeDriver: true,
          }),
          Animated.timing(scanAnim, {
            toValue: 0,
            duration: 1800,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [visible]);

  if (!visible) return null;

  // Xử lý khi camera quét được mã QR
  const handleBarcodeScanned = (result: BarcodeScanningResult) => {
    if (scanned || !result.data) return;
    setScanned(true);

    const rawData = result.data.trim();
    console.log('CCCD QR Scanned:', rawData);

    // Chuẩn mã QR Căn cước công dân Việt Nam:
    // Cấu trúc phân tách bởi ký tự '|':
    // [0]: Số CCCD 12 chữ số
    // [1]: Số CMND cũ (nếu có)
    // [2]: Họ và tên
    // [3]: Ngày sinh (DDMMYYYY)
    // [4]: Giới tính (Nam/Nữ)
    // [5]: Nơi thường trú / Địa chỉ
    // [6]: Ngày cấp (DDMMYYYY)
    const parts = rawData.split('|');

    if (parts.length >= 6) {
      const cccdNumber = parts[0].trim().replace(/\D/g, '').slice(0, 12);
      const fullName = parts[2]?.trim() || '';
      const birthDate = parts[3]?.trim() || '';
      const gender = parts[4]?.trim() || '';
      const address = parts[5]?.trim() || '';
      const issueDate = parts[6]?.trim() || '';

      const parsed: CccdQrData = {
        cccdNumber,
        fullName,
        birthDate,
        gender,
        address,
        issueDate,
        rawData,
      };

      onScanSuccess(parsed);
      onClose();
    } else {
      // Trường hợp chuỗi chỉ chứa dãy 12 số CCCD
      const digitsOnly = rawData.replace(/\D/g, '').slice(0, 12);
      if (digitsOnly.length === 12) {
        onScanSuccess({
          cccdNumber: digitsOnly,
          rawData,
        });
        onClose();
      } else {
        Alert.alert(
          'Mã QR không đúng định dạng',
          'Vui lòng hướng camera vào ô mã QR nhỏ ở góc trên bên phải mặt trước của thẻ CCCD.',
          [
            {
              text: 'Quét lại',
              onPress: () => setScanned(false),
            },
          ]
        );
      }
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {!permission ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color="#2563EB" />
            <Text style={styles.loadingText}>Đang khởi tạo máy ảnh...</Text>
          </View>
        ) : !permission.granted ? (
          <View style={styles.permissionBox}>
            <MaterialIcons name="camera-alt" size={48} color="#2563EB" />
            <Text style={styles.permissionTitle}>Cần cấp quyền truy cập Camera</Text>
            <Text style={styles.permissionDesc}>
              Ứng dụng cần quyền sử dụng máy ảnh để quét mã QR trên thẻ CCCD nhằm tự động điền số thẻ và địa chỉ.
            </Text>
            <TouchableOpacity style={styles.grantBtn} onPress={requestPermission}>
              <Text style={styles.grantBtnText}>Cấp Quyền Máy Ảnh</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelLink} onPress={onClose}>
              <Text style={styles.cancelLinkText}>Đóng</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.cameraWrapper}>
            <CameraView
              style={StyleSheet.absoluteFill}
              facing="back"
              enableTorch={torchEnabled}
              barcodeScannerSettings={{
                barcodeTypes: ['qr'],
              }}
              onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
            />

            {/* Lớp phủ làm mờ xung quanh khung quét */}
            <View style={styles.overlay}>
              {/* Header điều khiển trên cùng */}
              <View style={styles.topBar}>
                <TouchableOpacity style={styles.iconCircleBtn} onPress={onClose}>
                  <MaterialIcons name="close" size={24} color="#FFFFFF" />
                </TouchableOpacity>

                <View style={styles.titleWrap}>
                  <Text style={styles.topBarTitle}>Quét Mã QR Trên CCCD</Text>
                  <Text style={styles.topBarSub}>Tự động trích xuất Số thẻ & Địa chỉ</Text>
                </View>

                <TouchableOpacity
                  style={[styles.iconCircleBtn, torchEnabled && styles.torchActiveBtn]}
                  onPress={() => setTorchEnabled(!torchEnabled)}
                >
                  <MaterialIcons
                    name={torchEnabled ? 'flash-on' : 'flash-off'}
                    size={22}
                    color="#FFFFFF"
                  />
                </TouchableOpacity>
              </View>

              {/* Vùng quét trung tâm */}
              <View style={styles.scanTargetContainer}>
                <View style={styles.scanFrame}>
                  {/* 4 Góc căn chỉnh màu xanh nổi bật */}
                  <View style={[styles.corner, styles.cornerTL]} />
                  <View style={[styles.corner, styles.cornerTR]} />
                  <View style={[styles.corner, styles.cornerBL]} />
                  <View style={[styles.corner, styles.cornerBR]} />

                  {/* Tia laser quét chuyển động */}
                  <Animated.View
                    style={[
                      styles.laserLine,
                      {
                        transform: [{ translateY: scanAnim }],
                      },
                    ]}
                  />
                </View>
              </View>

              {/* Hướng dẫn ở đáy màn hình */}
              <View style={styles.bottomInstructionBox}>
                <View style={styles.instructionPill}>
                  <MaterialIcons name="qr-code-scanner" size={18} color="#93C5FD" />
                  <Text style={styles.instructionText}>
                    Căn chỉnh mã QR ở góc phải mặt trước thẻ CCCD vào trong khung quét
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  centerBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0F172A',
  },
  loadingText: {
    color: '#94A3B8',
    fontSize: 14,
    marginTop: 12,
  },
  permissionBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#0F172A',
  },
  permissionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  permissionDesc: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  grantBtn: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
    width: '100%',
    alignItems: 'center',
  },
  grantBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  cancelLink: {
    marginTop: 16,
    padding: 8,
  },
  cancelLinkText: {
    color: '#94A3B8',
    fontSize: 13,
  },

  cameraWrapper: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 54 : 36,
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
  },
  iconCircleBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  torchActiveBtn: {
    backgroundColor: '#EAB308',
  },
  titleWrap: {
    alignItems: 'center',
  },
  topBarTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  topBarSub: {
    color: '#93C5FD',
    fontSize: 11,
    marginTop: 2,
  },

  scanTargetContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanFrame: {
    width: SCAN_AREA_SIZE,
    height: SCAN_AREA_SIZE,
    position: 'relative',
    backgroundColor: 'transparent',
  },

  corner: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderColor: '#38BDF8',
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 6,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 6,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 6,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 6,
  },

  laserLine: {
    height: 2,
    backgroundColor: '#38BDF8',
    width: '100%',
    shadowColor: '#38BDF8',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 5,
    elevation: 4,
  },

  bottomInstructionBox: {
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 44 : 28,
    alignItems: 'center',
  },
  instructionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(147, 197, 253, 0.3)',
  },
  instructionText: {
    color: '#F8FAFC',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    maxWidth: SCREEN_WIDTH * 0.75,
  },
});
