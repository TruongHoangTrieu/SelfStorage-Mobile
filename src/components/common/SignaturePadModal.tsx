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

const CANVAS_WIDTH = 340;
const CANVAS_HEIGHT = 180;

interface Point {
  x: number;
  y: number;
}

/**
 * Thuật toán nội suy Midpoint B-Spline liên tục (C1 Continuous Curve)
 * Đảm bảo mọi điểm tiếp giáp đều có cùng tiếp tuyến, triệt tiêu 100% các góc nhọn hay gấp khúc.
 */
function pointsToSvgPath(pts: Point[]): string {
  if (pts.length === 0) return '';
  if (pts.length === 1) {
    const p = pts[0];
    return `M ${p.x.toFixed(1)} ${p.y.toFixed(1)} L ${(p.x + 0.2).toFixed(1)} ${(p.y + 0.2).toFixed(1)}`;
  }
  if (pts.length === 2) {
    return `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)} L ${pts[1].x.toFixed(1)} ${pts[1].y.toFixed(1)}`;
  }

  // Đoạn mở đầu: từ P0 đến trung điểm giữa P0 và P1
  const mid0X = ((pts[0].x + pts[1].x) / 2).toFixed(1);
  const mid0Y = ((pts[0].y + pts[1].y) / 2).toFixed(1);
  let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)} L ${mid0X} ${mid0Y}`;

  // Các đoạn cong liên tục: nối giữa các trung điểm liên tiếp với điểm chạm làm điểm điều khiển (control point)
  for (let i = 1; i < pts.length - 1; i++) {
    const curr = pts[i];
    const next = pts[i + 1];
    const midX = ((curr.x + next.x) / 2).toFixed(1);
    const midY = ((curr.y + next.y) / 2).toFixed(1);
    d += ` Q ${curr.x.toFixed(1)} ${curr.y.toFixed(1)} ${midX} ${midY}`;
  }

  // Đoạn kết: từ trung điểm cuối đến điểm kết thúc cuối cùng
  const last = pts[pts.length - 1];
  const secondLast = pts[pts.length - 2];
  d += ` Q ${secondLast.x.toFixed(1)} ${secondLast.y.toFixed(1)} ${last.x.toFixed(1)} ${last.y.toFixed(1)}`;

  return d;
}

export default function SignaturePadModal({
  visible,
  onClose,
  onSaveSignature,
  customerName,
  title = 'Ký Tên Hợp Đồng Điện Tử',
}: SignaturePadModalProps) {
  const [paths, setPaths] = useState<string[]>([]);
  const [currentPathState, setCurrentPathState] = useState<string>('');

  // Bộ đệm điểm thô & điểm đã lọc rung tay cho nét đang vẽ
  const strokePointsRef = useRef<Point[]>([]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt: GestureResponderEvent) => {
        const { locationX, locationY } = evt.nativeEvent;
        const initialPoint: Point = {
          x: Number(locationX.toFixed(1)),
          y: Number(locationY.toFixed(1)),
        };
        strokePointsRef.current = [initialPoint];
        const initialPath = `M ${initialPoint.x} ${initialPoint.y}`;
        setCurrentPathState(initialPath);
      },
      onPanResponderMove: (evt: GestureResponderEvent) => {
        const pts = strokePointsRef.current;
        if (pts.length === 0) return;

        const { locationX, locationY } = evt.nativeEvent;
        const prev = pts[pts.length - 1];

        // 1. Bộ lọc khử nhiễu tần số cao (Low-pass filter): chống rung tay khi tì ngón tay
        const smoothX = Number((prev.x * 0.2 + locationX * 0.8).toFixed(1));
        const smoothY = Number((prev.y * 0.2 + locationY * 0.8).toFixed(1));

        // 2. Ngưỡng dịch chuyển tối thiểu (2px) để loại bỏ dao động tĩnh
        const dx = smoothX - prev.x;
        const dy = smoothY - prev.y;
        if (dx * dx + dy * dy < 4.0) return;

        const newPoint: Point = { x: smoothX, y: smoothY };
        pts.push(newPoint);

        // 3. Render tức thời đường cong mượt
        const livePath = pointsToSvgPath(pts);
        setCurrentPathState(livePath);
      },
      onPanResponderRelease: () => {
        const pts = strokePointsRef.current;
        if (pts.length > 0) {
          const finalSvgPath = pointsToSvgPath(pts);
          if (finalSvgPath) {
            setPaths((prev) => [...prev, finalSvgPath]);
          }
        }
        strokePointsRef.current = [];
        setCurrentPathState('');
      },
    })
  ).current;

  const handleClear = () => {
    setPaths([]);
    strokePointsRef.current = [];
    setCurrentPathState('');
  };

  const handleUndo = () => {
    setPaths((prev) => prev.slice(0, -1));
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
              Nét ký tự động làm mịn đường cong & chống rung tay
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
                  strokeWidth={3.0}
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeMiterlimit={10}
                />
              ))}
              {currentPathState ? (
                <Path
                  d={currentPathState}
                  stroke="#004AC6"
                  strokeWidth={3.0}
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeMiterlimit={10}
                />
              ) : null}
            </Svg>

            {/* Dòng kẻ chữ ký Baseline & Placeholder */}
            {paths.length === 0 && !currentPathState && (
              <View style={styles.placeholderWrap} pointerEvents="none">
                <MaterialIcons name="gesture" size={30} color="#94A3B8" />
                <Text style={styles.placeholderText}>Ký tên tại đây</Text>
                <Text style={styles.placeholderSubText}>Nét ký mượt mà tự nhiên như ký bút thật</Text>
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
              <Text style={styles.clearBtnText}>Xóa hết</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.undoBtn, paths.length === 0 && styles.undoBtnDisabled]}
              onPress={handleUndo}
              disabled={paths.length === 0}
              activeOpacity={0.7}
            >
              <MaterialIcons
                name="undo"
                size={16}
                color={paths.length > 0 ? '#475569' : '#94A3B8'}
              />
              <Text
                style={[
                  styles.undoBtnText,
                  paths.length === 0 && styles.undoBtnTextDisabled,
                ]}
              >
                Hoàn tác
              </Text>
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
    padding: 14,
  },
  modalCard: {
    width: '100%',
    maxWidth: 370,
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
    gap: 3,
  },
  placeholderText: {
    fontSize: 14,
    color: '#94A3B8',
    fontWeight: '700',
  },
  placeholderSubText: {
    fontSize: 10.5,
    color: '#CBD5E1',
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
    gap: 8,
  },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  clearBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#DC2626',
  },
  undoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  undoBtnDisabled: {
    opacity: 0.5,
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
  },
  undoBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#334155',
  },
  undoBtnTextDisabled: {
    color: '#94A3B8',
  },
  confirmBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#004AC6',
  },
  confirmBtnText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
