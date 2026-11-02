import React, { useState, useMemo } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
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
  facilityName = 'Kho Tự Quản Trụ Sở Chính Võ Nguyên Giáp',
}: UnitMapScreenProps) {
  const insets = useSafeAreaInsets();
  const [selectedFloor, setSelectedFloor] = useState<string>('Tất cả');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const floors = ['Tất cả', 'Tầng 1', 'Tầng 2', 'Tầng 3', 'Tầng 4'];

  // Thống kê nhanh trạng thái ô kho
  const stats = useMemo(() => {
    return {
      total: availableUnits.length,
      vacant: availableUnits.filter((u) => u.status === 'vacant').length,
      occupied: availableUnits.filter((u) => u.status === 'occupied').length,
      maintenance: availableUnits.filter((u) => u.status === 'maintenance').length,
    };
  }, [availableUnits]);

  // Lọc theo tầng và tìm kiếm
  const filteredUnits = useMemo(() => {
    return availableUnits.filter((u) => {
      if (selectedFloor !== 'Tất cả' && (!u.floor || u.floor.indexOf(selectedFloor) === -1)) {
        return false;
      }
      if (!searchQuery.trim()) return true;
      const q = searchQuery.trim().toLowerCase();
      return (
        u.code.toLowerCase().includes(q) ||
        u.type.toLowerCase().includes(q) ||
        (u.floor && u.floor.toLowerCase().includes(q))
      );
    });
  }, [availableUnits, selectedFloor, searchQuery]);

  return (
    <View style={styles.container}>
      {/* ─── Top Bar ─── */}
      <View style={[styles.topBar, { paddingTop: insets.top > 0 ? insets.top + 6 : 14 }]}>
        <TouchableOpacity style={styles.menuBtn} onPress={onOpenSidebar} activeOpacity={0.7}>
          <MaterialIcons name="arrow-back" size={22} color="#0F172A" />
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

      {/* ─── Search Bar ─── */}
      <View style={styles.searchBarWrap}>
        <View style={styles.searchRow}>
          <MaterialIcons name="search" size={18} color="#94A3B8" style={{ marginLeft: 10 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm theo mã kho (A-101, VNG-102), loại kho..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={{ padding: 6 }}>
              <MaterialIcons name="close" size={16} color="#64748B" />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* ─── Floor Filter Tabs ─── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterBar}
        contentContainerStyle={styles.filterPadding}
      >
        {floors.map((fl) => (
          <TouchableOpacity
            key={fl}
            style={[styles.floorPill, selectedFloor === fl && styles.floorPillActive]}
            onPress={() => setSelectedFloor(fl)}
          >
            <Text style={[styles.floorText, selectedFloor === fl && styles.floorTextActive]}>
              {fl}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* ─── Main Content: Legend + Grid ─── */}
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollPadding}>
        {/* Hộp chú thích chia làm 2 hàng cân đối, không bị lồi ra ngoài */}
        <View style={styles.legendContainer}>
          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#10B981' }]} />
              <Text style={styles.legendText}>
                Trống <Text style={styles.legendCount}>({stats.vacant})</Text>
              </Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#2563EB' }]} />
              <Text style={styles.legendText}>
                Đang thuê <Text style={styles.legendCount}>({stats.occupied})</Text>
              </Text>
            </View>
          </View>

          <View style={styles.legendDivider} />

          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#F59E0B' }]} />
              <Text style={styles.legendText}>
                Bảo trì <Text style={styles.legendCount}>({stats.maintenance})</Text>
              </Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#8B5CF6' }]} />
              <Text style={styles.legendText}>Đã giữ chỗ</Text>
            </View>
          </View>
        </View>

        {/* Danh sách ô kho theo lưới 2 cột */}
        <View style={styles.unitGrid}>
          {filteredUnits.length === 0 ? (
            <View style={styles.emptyWrap}>
              <MaterialIcons name="meeting-room" size={40} color="#CBD5E1" />
              <Text style={styles.emptyText}>Không tìm thấy ô kho phù hợp</Text>
            </View>
          ) : (
            filteredUnits.map((u) => {
              const isOccupied = u.status === 'occupied';
              const isMaintenance = u.status === 'maintenance';

              const statusColor = isOccupied
                ? '#2563EB'
                : isMaintenance
                ? '#D97706'
                : '#059669';

              const statusBg = isOccupied
                ? '#EFF6FF'
                : isMaintenance
                ? '#FFFBEB'
                : '#ECFDF5';

              const statusBorder = isOccupied
                ? '#BFDBFE'
                : isMaintenance
                ? '#FDE68A'
                : '#A7F3D0';

              const statusLabel = isOccupied
                ? 'Đang thuê'
                : isMaintenance
                ? 'Bảo trì'
                : 'Trống';

              return (
                <View
                  key={u.id}
                  style={[
                    styles.unitCard,
                    isOccupied && styles.unitCardOccupied,
                    isMaintenance && styles.unitCardMaintenance,
                  ]}
                >
                  <Text style={styles.unitCode}>{u.code}</Text>

                  <View
                    style={[
                      styles.statusBadgePill,
                      { backgroundColor: statusBg, borderColor: statusBorder },
                    ]}
                  >
                    <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                    <Text style={[styles.statusBadgeText, { color: statusColor }]}>
                      {statusLabel}
                    </Text>
                  </View>

                  <Text style={styles.unitType} numberOfLines={1}>
                    {u.type}
                  </Text>
                  <Text style={styles.unitDetail}>
                    {u.size} • {u.floor}
                  </Text>
                  <Text style={styles.unitFeatures} numberOfLines={1}>
                    ✓ {u.features}
                  </Text>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
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
  searchBarWrap: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    height: 38,
  },
  searchInput: {
    flex: 1,
    fontSize: 12.5,
    color: '#0F172A',
    paddingHorizontal: 8,
  },
  filterBar: {
    backgroundColor: '#FFFFFF',
    maxHeight: 46,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  filterPadding: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    gap: 8,
    flexDirection: 'row',
  },
  floorPill: {
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  floorPillActive: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
  floorText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  floorTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  scroll: {
    flex: 1,
  },
  scrollPadding: {
    padding: 16,
    paddingBottom: 40,
  },
  // Chú thích 2 hàng gọn gàng, không bị tràn màn hình
  legendContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginBottom: 16,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  legendDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 4,
  },
  legendItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 12,
    color: '#334155',
    fontWeight: '600',
  },
  legendCount: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
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
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  unitCardOccupied: {
    borderColor: '#BFDBFE',
    backgroundColor: '#FAFCFF',
  },
  unitCardMaintenance: {
    borderColor: '#FDE68A',
    backgroundColor: '#FFFEFA',
  },
  unitCode: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0F172A',
  },
  statusBadgePill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 4,
    marginBottom: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusBadgeText: {
    fontSize: 9.5,
    fontWeight: '700',
  },
  unitType: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2563EB',
    marginBottom: 3,
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
  emptyWrap: {
    width: '100%',
    paddingVertical: 40,
    alignItems: 'center',
    gap: 8,
  },
  emptyText: {
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: '600',
  },
});
