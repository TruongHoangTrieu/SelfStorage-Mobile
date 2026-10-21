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

export type CustomerTabType = 'search' | 'my-storage' | 'support' | 'account';

interface CustomerBottomNavBarProps {
  activeTab: CustomerTabType;
  onSelectTab: (tab: CustomerTabType) => void;
}

export default function CustomerBottomNavBar({
  activeTab,
  onSelectTab,
}: CustomerBottomNavBarProps) {
  return (
    <View style={s.container}>
      {/* Tab 1: Thuê / Tìm kho */}
      <TouchableOpacity
        style={s.tab}
        onPress={() => onSelectTab('search')}
        activeOpacity={0.7}
      >
        <MaterialIcons
          name="search"
          size={24}
          color={activeTab === 'search' ? T.primary : T.outline}
        />
        <Text
          style={[
            s.tabLabel,
            activeTab === 'search' ? s.tabLabelActive : s.tabLabelInactive,
          ]}
        >
          Thuê kho
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
          name="inventory-2"
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

      {/* Tab 3: Hỗ trợ */}
      <TouchableOpacity
        style={s.tab}
        onPress={() => onSelectTab('support')}
        activeOpacity={0.7}
      >
        <MaterialIcons
          name="support-agent"
          size={24}
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

      {/* Tab 4: Quản lý tài khoản */}
      <TouchableOpacity
        style={s.tab}
        onPress={() => onSelectTab('account')}
        activeOpacity={0.7}
      >
        <MaterialIcons
          name="person-outline"
          size={24}
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
  );
}

const s = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 14 : 8,
    backgroundColor: T.surfaceLowest,
    borderTopWidth: 1,
    borderTopColor: T.outlineVariant,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 8,
    width: '100%',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
  },
  tabLabel: {
    fontSize: 11,
    marginTop: 2,
    letterSpacing: 0.1,
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
    width: 16,
    height: 2,
    borderRadius: 1,
    marginTop: 3,
  },
});
