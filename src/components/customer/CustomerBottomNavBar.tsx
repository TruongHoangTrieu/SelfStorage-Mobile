import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

// ─── Design Tokens ────────────────────────────────────────────────────────
const T = {
  surfaceLowest: '#ffffff',
  outlineVariant: 'rgba(195, 198, 215, 0.4)',
  primary: '#1d4ed8',
  onSurface: '#131b2e',
  onSurfaceVariant: '#434655',
  outline: '#737686',
};

export type CustomerTabType = 'search' | 'my-storage' | 'book-new' | 'support' | 'account';

interface CustomerBottomNavBarProps {
  activeTab: CustomerTabType;
  onSelectTab: (tab: CustomerTabType) => void;
}

export default function CustomerBottomNavBar({
  activeTab,
  onSelectTab,
}: CustomerBottomNavBarProps) {
  return (
    <View style={s.wrapper}>
      <View style={s.container}>
        {/* Tab 1: Trang chủ / Khám phá */}
        <TouchableOpacity
          style={s.tab}
          onPress={() => onSelectTab('search')}
          activeOpacity={0.7}
        >
          <MaterialIcons
            name="explore"
            size={23}
            color={activeTab === 'search' ? T.primary : T.outline}
          />
          <Text
            style={[
              s.tabLabel,
              activeTab === 'search' ? s.tabLabelActive : s.tabLabelInactive,
            ]}
          >
            Khám phá
          </Text>
          <View
            style={[
              s.activeIndicator,
              { backgroundColor: activeTab === 'search' ? T.primary : 'transparent' },
            ]}
          />
        </TouchableOpacity>

        {/* Tab 2: Kho của tôi */}
        <TouchableOpacity
          style={s.tab}
          onPress={() => onSelectTab('my-storage')}
          activeOpacity={0.7}
        >
          <MaterialIcons
            name="lock-clock"
            size={23}
            color={activeTab === 'my-storage' ? T.primary : T.outline}
          />
          <Text
            style={[
              s.tabLabel,
              activeTab === 'my-storage' ? s.tabLabelActive : s.tabLabelInactive,
            ]}
          >
            Kho của tôi
          </Text>
          <View
            style={[
              s.activeIndicator,
              { backgroundColor: activeTab === 'my-storage' ? T.primary : 'transparent' },
            ]}
          />
        </TouchableOpacity>

        {/* Nút giữa: THUÊ KHO MỚI (Lồi lên nổi bật phong cách FAB) */}
        <View style={s.centerButtonContainer}>
          <TouchableOpacity
            style={s.centerButtonRing}
            onPress={() => onSelectTab('book-new')}
            activeOpacity={0.88}
          >
            <View style={s.centerButtonInner}>
              <MaterialIcons name="add" size={28} color="#ffffff" />
            </View>
          </TouchableOpacity>
          <Text style={s.centerButtonLabel}>Thuê kho</Text>
        </View>

        {/* Tab 4: Hỗ trợ CSKH */}
        <TouchableOpacity
          style={s.tab}
          onPress={() => onSelectTab('support')}
          activeOpacity={0.7}
        >
          <MaterialIcons
            name="support-agent"
            size={23}
            color={activeTab === 'support' ? T.primary : T.outline}
          />
          <Text
            style={[
              s.tabLabel,
              activeTab === 'support' ? s.tabLabelActive : s.tabLabelInactive,
            ]}
          >
            Hỗ trợ
          </Text>
          <View
            style={[
              s.activeIndicator,
              { backgroundColor: activeTab === 'support' ? T.primary : 'transparent' },
            ]}
          />
        </TouchableOpacity>

        {/* Tab 5: Tài khoản */}
        <TouchableOpacity
          style={s.tab}
          onPress={() => onSelectTab('account')}
          activeOpacity={0.7}
        >
          <MaterialIcons
            name="person-outline"
            size={23}
            color={activeTab === 'account' ? T.primary : T.outline}
          />
          <Text
            style={[
              s.tabLabel,
              activeTab === 'account' ? s.tabLabelActive : s.tabLabelInactive,
            ]}
          >
            Tài khoản
          </Text>
          <View
            style={[
              s.activeIndicator,
              { backgroundColor: activeTab === 'account' ? T.primary : 'transparent' },
            ]}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrapper: {
    backgroundColor: 'transparent',
    width: '100%',
  },
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 14 : 8,
    backgroundColor: T.surfaceLowest,
    borderTopWidth: 1,
    borderTopColor: T.outlineVariant,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 10,
    width: '100%',
    minHeight: 58,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
  },
  tabLabel: {
    fontSize: 10.5,
    marginTop: 2,
    letterSpacing: -0.2,
  },
  tabLabelActive: {
    color: T.primary,
    fontWeight: '700',
  },
  tabLabelInactive: {
    color: T.outline,
    fontWeight: '500',
  },
  activeIndicator: {
    width: 14,
    height: 2,
    borderRadius: 1,
    marginTop: 2,
  },

  // ─── Center Floating Action Button (Nút tròn lồi) ────────────────────────
  centerButtonContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -22, // Kéo lồi lên trên thanh navbar
  },
  centerButtonRing: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#ffffff',
    padding: 3,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 7,
    elevation: 8,
  },
  centerButtonInner: {
    width: '100%',
    height: '100%',
    borderRadius: 24,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerButtonLabel: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#1d4ed8',
    marginTop: 2,
    letterSpacing: -0.2,
  },
});
