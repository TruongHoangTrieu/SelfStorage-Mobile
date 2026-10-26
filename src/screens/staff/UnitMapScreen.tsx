import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { AvailableUnit } from '../../types/handover';

interface UnitMapScreenProps {
  availableUnits: AvailableUnit[];
  onOpenSidebar: () => void;
  facilityName?: string;
}

export default function UnitMapScreen({
  availableUnits,
  onOpenSidebar,
  facilityName = 'Trụ sở chính Thủ Đức',
}: UnitMapScreenProps) {
  const [selectedFloor, setSelectedFloor] = useState<string>('Tất cả');

  const floors = ['Tất cả', 'Tầng 1', 'Tầng 2', 'Tầng 3', 'Tầng 4'];

  const filteredUnits = selectedFloor === 'Tất cả'
    ? availableUnits
    : availableUnits.filter((u) => u.floor.indexOf(selectedFloor) !== -1);

  return (
    <View style={styles.container}>
      {/* Top Bar (Dàn trải rộng, bỏ icon, tên cơ sở nổi bật) */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.menuBtn} onPress={onOpenSidebar} activeOpacity={0.7}>
          <MaterialIcons name="menu" size={22} color="#0F172A" />
        </TouchableOpacity>
        <View style={styles.topBarTitleCol}>
          <Text style={styles.subTitle} numberOfLines={1}>
            {facilityName}
          </Text>
          <Text style={styles.mainTitle} numberOfLines={1}>
            Sơ đồ cơ sở & Ô kho
          </Text>
        </View>
      </View>

      {/* Floor Filter Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterBar} contentContainerStyle={styles.filterPadding}>
        {floors.map((fl) => (
          <TouchableOpacity
            key={fl}
            style={[styles.floorPill, selectedFloor === fl && styles.floorPillActive]}
            onPress={() => setSelectedFloor(fl)}
          >
            <Text style={[styles.floorText, selectedFloor === fl && styles.floorTextActive]}>{fl}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Grid of Units */}
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollPadding}>
        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#10B981' }]} />
            <Text style={styles.legendText}>Trống (Vacant)</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#2563EB' }]} />
            <Text style={styles.legendText}>Đang thuê (Occupied)</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#F59E0B' }]} />
            <Text style={styles.legendText}>Bảo trì (Maintenance)</Text>
          </View>
        </View>

        <View style={styles.unitGrid}>
          {filteredUnits.map((u) => (
            <View key={u.id} style={styles.unitCard}>
              <View style={styles.unitCardTop}>
                <Text style={styles.unitCode}>{u.code}</Text>
                <View style={styles.statusDot} />
              </View>
              <Text style={styles.unitType} numberOfLines={1}>{u.type}</Text>
              <Text style={styles.unitDetail}>{u.size} • {u.floor}</Text>
              <Text style={styles.unitFeatures} numberOfLines={1}>✓ {u.features}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F1F5F9',
  },
  topBar: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  topBarTitleCol: {
    flex: 1,
    justifyContent: 'center',
  },
  subTitle: {
    color: '#1D4ED8',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  mainTitle: {
    color: '#0F172A',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: -0.4,
    marginTop: 2,
  },
  filterBar: {
    backgroundColor: '#FFFFFF',
    maxHeight: 50,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  filterPadding: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    flexDirection: 'row',
  },
  floorPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  floorPillActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  floorText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  floorTextActive: {
    color: '#FFFFFF',
  },
  scroll: {
    flex: 1,
  },
  scrollPadding: {
    padding: 16,
    paddingBottom: 40,
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  unitGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  unitCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  unitCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  unitCode: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0F172A',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  unitType: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2563EB',
    marginBottom: 2,
  },
  unitDetail: {
    fontSize: 10,
    color: '#64748B',
    marginBottom: 4,
  },
  unitFeatures: {
    fontSize: 9,
    color: '#059669',
    marginTop: 2,
  },
});
