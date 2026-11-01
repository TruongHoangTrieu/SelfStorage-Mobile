import React, { useState, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  TouchableOpacity,
  PanResponder,
  GestureResponderEvent,
  Alert,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import Svg, { Path } from 'react-native-svg';

interface SignaturePadModalProps {
  visible: boolean;
  onClose: () => void;
  onSaveSignature: (paths: string[]) => void;
  customerName?: string;
  title?: string;
}

const CANVAS_WIDTH = 320;
const CANVAS_HEIGHT = 160;

export default function SignaturePadModal({
  visible,
  onClose,
  onSaveSignature,
  customerName,
  title = 'Ký Tên Hợp Đồng Điện Tử',
}: SignaturePadModalProps) {
  const [paths, setPaths] = useState<string[]>([]);
  const currentPathRef = useRef<string>('');
  const [currentPathState, setCurrentPathState] = useState<string>('');

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt: GestureResponderEvent) => {
        const { locationX, locationY } = evt.nativeEvent;
        const x = Math.round(locationX);
        const y = Math.round(locationY);
        const newD = `M ${x} ${y}`;
        currentPathRef.current = newD;
        setCurrentPathState(newD);
      },
      onPanResponderMove: (evt: GestureResponderEvent) => {
        const { locationX, locationY } = evt.nativeEvent;
        const x = Math.round(locationX);
        const y = Math.round(locationY);
        const updatedD = `${currentPathRef.current} L ${x} ${y}`;
        currentPathRef.current = updatedD;
        setCurrentPathState(updatedD);
      },
      onPanResponderRelease: () => {
        if (currentPathRef.current.length > 5) {
          setPaths((prev) => [...prev, currentPathRef.current]);
        }
        currentPathRef.current = '';
        setCurrentPathState('');
      },
    })
  ).current;

  const handleClear = () => {
    setPaths([]);
    currentPathRef.current = '';
    setCurrentPathState('');
  };

  const handleConfirm = () => {
    if (paths.length === 0 && !currentPathState) {
      if (Platform.OS === 'web') {
        window.alert('Vui lòng vẽ chữ ký của bạn trước khi xác nhận.');
      } else {
        Alert.alert('Chưa có chữ ký', 'Vui lòng dùng ngón tay hoặc bút vẽ chữ ký vào ô ký.');
      }
      return;
    }
    const finalPaths = [...paths];
    if (currentPathState && !finalPaths.includes(currentPathState)) {
      finalPaths.push(currentPathState);
    }
    onSaveSignature(finalPaths);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerIconWrap}>
              <MaterialIcons name="draw" size={22} color="#004AC6" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{title}</Text>
              <Text style={styles.subtitle}>
                {customerName ? `Người ký: ${customerName}` : 'Dùng ngón tay ký tên vào khung dưới'}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
              <MaterialIcons name="close" size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* Hướng dẫn */}
          <View style={styles.guideBadge}>
            <MaterialIcons name="touch-app" size={15} color="#0284C7" />
            <Text style={styles.guideText}>
              Vẽ trực tiếp chữ ký của bạn vào ô bên dưới
            </Text>
          </View>

          {/* Vùng vẽ Canvas */}
          <View style={styles.canvasContainer} {...panResponder.panHandlers}>
            <Svg width={CANVAS_WIDTH} height={CANVAS_HEIGHT} style={styles.svgCanvas}>
              {paths.map((p, index) => (
                <Path
                  key={index}
                  d={p}
                  stroke="#004AC6"
                  strokeWidth={2.8}
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ))}
              {currentPathState ? (
                <Path
                  d={currentPathState}
                  stroke="#004AC6"
                  strokeWidth={2.8}
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ) : null}
            </Svg>

            {/* Dòng kẻ chữ ký Baseline & Placeholder */}
            {paths.length === 0 && !currentPathState && (
              <View style={styles.placeholderWrap} pointerEvents="none">
                <MaterialIcons name="edit" size={24} color="#94A3B8" />
                <Text style={styles.placeholderText}>Ký tên tại đây</Text>
              </View>
            )}

            <View style={styles.baseline} pointerEvents="none" />
          </View>

          {/* Footer nút hành động */}
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={styles.clearBtn}
              onPress={handleClear}
              activeOpacity={0.7}
            >
              <MaterialIcons name="refresh" size={16} color="#DC2626" />
              <Text style={styles.clearBtnText}>Xóa & Ký lại</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.confirmBtn}
              onPress={handleConfirm}
              activeOpacity={0.85}
            >
              <MaterialIcons name="check" size={18} color="#FFFFFF" />
              <Text style={styles.confirmBtnText}>Xác Nhận Ký</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  headerIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  title: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  subtitle: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 1,
  },
  closeBtn: {
    padding: 4,
  },
  guideBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F0F9FF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  guideText: {
    fontSize: 11.5,
    color: '#0369A1',
    fontWeight: '600',
  },
  canvasContainer: {
    width: CANVAS_WIDTH,
    height: CANVAS_HEIGHT,
    backgroundColor: '#FAFAFA',
    borderRadius: 12,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#94A3B8',
    alignSelf: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  svgCanvas: {
    width: CANVAS_WIDTH,
    height: CANVAS_HEIGHT,
    backgroundColor: 'transparent',
  },
  placeholderWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 25,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  placeholderText: {
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: '600',
  },
  baseline: {
    position: 'absolute',
    bottom: 28,
    left: 20,
    right: 20,
    height: 1,
    backgroundColor: '#CBD5E1',
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
    gap: 10,
  },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  clearBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#DC2626',
  },
  confirmBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    borderRadius: 10,
    backgroundColor: '#004AC6',
  },
  confirmBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});

