import React, { useRef } from 'react';
import {
  StyleSheet,
  View,
  PanResponder,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

interface DraggableAiFabProps {
  onPress: () => void;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const BUTTON_SIZE = 54;
const MARGIN_BOTTOM = 86;
const MARGIN_RIGHT = 18;

export default function DraggableAiFab({ onPress }: DraggableAiFabProps) {
  // Vị trí mặc định ở góc dưới bên phải màn hình (ngay trên thanh tab bar)
  const defaultX = SCREEN_WIDTH - BUTTON_SIZE - MARGIN_RIGHT;
  const defaultY = SCREEN_HEIGHT - BUTTON_SIZE - MARGIN_BOTTOM;

  const pan = useRef(new Animated.ValueXY({ x: defaultX, y: defaultY })).current;
  const currentPos = useRef({ x: defaultX, y: defaultY });

  // Lắng nghe thay đổi vị trí
  pan.addListener((value) => {
    currentPos.current = value;
  });

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Chỉ kích hoạt drag khi ngón tay di chuyển hơn 3px
        return Math.abs(gestureState.dx) > 3 || Math.abs(gestureState.dy) > 3;
      },
      onPanResponderGrant: () => {
        pan.setOffset({
          x: currentPos.current.x,
          y: currentPos.current.y,
        });
        pan.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], {
        useNativeDriver: false,
      }),
      onPanResponderRelease: (_, gestureState) => {
        pan.flattenOffset();

        // Nếu chỉ là thao tác chạm (click / tap) mà không di chuyển nhiều
        if (Math.abs(gestureState.dx) < 6 && Math.abs(gestureState.dy) < 6) {
          onPress();
          return;
        }

        // Đảm bảo icon không bị kéo ra ngoài mép màn hình
        let targetX = currentPos.current.x;
        let targetY = currentPos.current.y;

        const minX = 12;
        const maxX = SCREEN_WIDTH - BUTTON_SIZE - 12;
        const minY = Platform.OS === 'ios' ? 50 : 36;
        const maxY = SCREEN_HEIGHT - BUTTON_SIZE - 60;

        if (targetX < minX) targetX = minX;
        if (targetX > maxX) targetX = maxX;
        if (targetY < minY) targetY = minY;
        if (targetY > maxY) targetY = maxY;

        // Tự động hít nhẹ vào cạnh trái hoặc cạnh phải gần nhất (như nút Home ảo / Messenger chathead)
        const snapToEdge = true;
        if (snapToEdge) {
          const midScreen = SCREEN_WIDTH / 2;
          targetX = targetX + BUTTON_SIZE / 2 < midScreen ? minX : maxX;
        }

        Animated.spring(pan, {
          toValue: { x: targetX, y: targetY },
          useNativeDriver: false,
          friction: 6,
          tension: 40,
        }).start();
      },
    })
  ).current;

  return (
    <Animated.View
      style={[
        styles.fabContainer,
        {
          transform: pan.getTranslateTransform(),
        },
      ]}
      {...panResponder.panHandlers}
    >
      <View style={styles.fabInner}>
        <MaterialIcons name="auto-awesome" size={26} color="#ffffff" />
        <View style={styles.onlineBadge} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  fabContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 9999,
    elevation: 10,
  },
  fabInner: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_SIZE / 2,
    backgroundColor: '#1d4ed8',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#1d4ed8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.38,
    shadowRadius: 8,
    borderWidth: 2.5,
    borderColor: '#ffffff',
    position: 'relative',
  },
  onlineBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#10b981',
    borderWidth: 2.5,
    borderColor: '#ffffff',
  },
});
