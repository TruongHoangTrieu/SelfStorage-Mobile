import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  ActivityIndicator,
  Animated,
  Dimensions,
  Platform,
  Alert,
} from 'react-native';
import { Facility, UnitType, Reservation } from '../../api';

const { width: SCREEN_W } = Dimensions.get('window');

// ─── Color Tokens ────────────────────────────────────────────────────────────
const C = {
  bg: '#F0F4FF',
  card: '#FFFFFF',
  navy: '#0F172A',
  navy2: '#1E293B',
  blue: '#2563EB',
  blueLight: '#EFF6FF',
  blueMid: '#DBEAFE',
  teal: '#0D9488',
  green: '#059669',
  orange: '#EA580C',
  red: '#EF4444',
  muted: '#64748B',
  border: '#E2E8F0',
  inputBg: '#F8FAFC',
  white: '#FFFFFF',
  accent: '#6366F1',
};

// ─── Image constants ────────────────────────────────────────────────────────
const HERO_IMG =
  'https://images.unsplash.com/photo-1587293852726-70cdb56c2866?auto=format&fit=crop&w=1600&q=80';

// ─── Types ───────────────────────────────────────────────────────────────────
interface Props {
  facilities: Facility[];
  unitTypes: UnitType[];
  loading: boolean;
  refreshing: boolean;
  onRefresh: () => void;
  onReservationCreated: (reservation: Reservation) => void;
  onViewMyReservations: () => void;
}

const DURATION_OPTIONS = [
  { months: 1, label: '1 Tháng', discount: 0, tag: '' },
  { months: 3, label: '3 Tháng', discount: 5, tag: '-5%' },
  { months: 6, label: '6 Tháng', discount: 10, tag: '-10%' },
  { months: 12, label: '1 Năm', discount: 15, tag: '-15%' },
];

// ─── Utility ─────────────────────────────────────────────────────────────────
function formatVND(amount: number): string {
  return amount.toLocaleString('vi-VN') + ' đ';
}

// ─── Step Indicator ──────────────────────────────────────────────────────────
function StepIndicator({ step }: { step: number }) {
  const steps = [
    { n: 1, label: 'Cơ Sở' },
    { n: 2, label: 'Loại Kho' },
    { n: 3, label: 'Xác Nhận' },
  ];
  return (
    <View style={si.wrap}>
      {steps.map((s, i) => {
        const active = step >= s.n;
        const current = step === s.n;
        return (
          <React.Fragment key={s.n}>
            <View style={si.stepCol}>
              <View style={[si.circle, active && si.circleActive, current && si.circleCurrent]}>
                {step > s.n ? (
                  <Text style={si.checkMark}>✓</Text>
                ) : (
                  <Text style={[si.num, active && si.numActive]}>{s.n}</Text>
                )}
              </View>
              <Text style={[si.label, current && si.labelActive]}>{s.label}</Text>
            </View>
            {i < steps.length - 1 && (
              <View style={[si.line, step > s.n && si.lineActive]} />
            )}
          </React.Fragment>
        );
      })}
    </View>
  );
}
const si = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: C.white,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  stepCol: { alignItems: 'center', width: 64 },
  circle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: C.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  circleActive: { backgroundColor: C.blue },
  circleCurrent: {
    backgroundColor: C.blue,
    shadowColor: C.blue,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  num: { fontSize: 13, fontWeight: '800', color: C.muted },
  numActive: { color: C.white },
  checkMark: { fontSize: 14, color: C.white, fontWeight: '900' },
  label: { fontSize: 10, color: C.muted, fontWeight: '600', textAlign: 'center' },
  labelActive: { color: C.blue, fontWeight: '800' },
  line: { flex: 1, height: 2, backgroundColor: C.border, marginBottom: 16 },
  lineActive: { backgroundColor: C.blue },
});

// ─── Facility Card ────────────────────────────────────────────────────────────
function FacilityCard({
  fac,
  selected,
  onSelect,
  index,
}: {
  fac: Facility;
  selected: boolean;
  onSelect: () => void;
  index: number;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const press = () => {
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.97, duration: 80, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1, duration: 120, useNativeDriver: true }),
    ]).start(onSelect);
  };

  const amenities = ['Camera 24/7', 'Bảo vệ an ninh', 'Xe tải vào tận nơi', 'Điều hòa'];

  return (
    <Animated.View style={[fc.wrap, selected && fc.wrapActive, { transform: [{ scale }] }]}>
      <TouchableOpacity activeOpacity={1} onPress={press} style={fc.inner}>
        {/* Image */}
        <View style={fc.imgWrap}>
          <Image
            source={{ uri: fac.image || `https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1200&q=80` }}
            style={fc.img}
            resizeMode="cover"
          />
          {/* Gradient overlay */}
          <View style={fc.overlay} />
          {/* Badges */}
          <View style={fc.badgeRow}>
            <View style={fc.ratingPill}>
              <Text style={fc.ratingText}>⭐ 4.9</Text>
            </View>
            <View style={fc.openPill}>
              <View style={fc.greenDot} />
              <Text style={fc.openText}>Mở 24/7</Text>
            </View>
          </View>
          {/* Branch code on bottom left */}
          <View style={fc.codePill}>
            <Text style={fc.codeText}>{fac.code || `F-${index + 1}`}</Text>
          </View>
          {/* Selected check */}
          {selected && (
            <View style={fc.selectedRing}>
              <View style={fc.selectedCheck}>
                <Text style={fc.selectedCheckIcon}>✓</Text>
              </View>
            </View>
          )}
        </View>

        {/* Content */}
        <View style={fc.content}>
          <Text style={fc.name} numberOfLines={2}>{fac.name}</Text>
          <View style={fc.addressRow}>
            <Text style={fc.addressIcon}>📍</Text>
            <Text style={fc.address} numberOfLines={2}>{fac.address}</Text>
          </View>

          {/* Amenities */}
          <View style={fc.amenityRow}>
            {amenities.slice(0, 3).map((a) => (
              <View key={a} style={fc.amenityPill}>
                <Text style={fc.amenityText}>{a}</Text>
              </View>
            ))}
          </View>

          {/* CTA */}
          <View style={[fc.ctaBtn, selected && fc.ctaBtnActive]}>
            <Text style={[fc.ctaText, selected && fc.ctaTextActive]}>
              {selected ? '✓ Đã Chọn Chi Nhánh Này' : 'Chọn Chi Nhánh Này →'}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}
const fc = StyleSheet.create({
  wrap: {
    borderRadius: 20,
    backgroundColor: C.white,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: C.border,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  wrapActive: {
    borderColor: C.blue,
    borderWidth: 2.5,
    shadowColor: C.blue,
    shadowOpacity: 0.2,
    elevation: 8,
  },
  inner: {},
  imgWrap: { height: 160, position: 'relative', backgroundColor: C.navy2 },
  img: { width: '100%', height: '100%' },
  overlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 70,
    backgroundColor: 'rgba(15,23,42,0.45)',
  },
  badgeRow: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ratingPill: {
    backgroundColor: 'rgba(15,23,42,0.75)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  ratingText: { color: '#FACC15', fontSize: 11, fontWeight: '800' },
  openPill: {
    backgroundColor: 'rgba(15,23,42,0.75)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  greenDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#4ADE80' },
  openText: { color: '#4ADE80', fontSize: 10, fontWeight: '700' },
  codePill: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    backgroundColor: C.blue,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  codeText: { color: C.white, fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
  selectedRing: {
    position: 'absolute',
    top: 10,
    right: 10,
  },
  selectedCheck: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: C.blue,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: C.blue,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 4,
  },
  selectedCheckIcon: { color: C.white, fontSize: 14, fontWeight: '900' },
  content: { padding: 14 },
  name: {
    fontSize: 15,
    fontWeight: '900',
    color: C.navy,
    marginBottom: 6,
    lineHeight: 20,
  },
  addressRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 4, marginBottom: 10 },
  addressIcon: { fontSize: 11, marginTop: 1 },
  address: { fontSize: 11, color: C.muted, flex: 1, lineHeight: 16 },
  amenityRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginBottom: 12 },
  amenityPill: {
    backgroundColor: C.blueLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  amenityText: { fontSize: 10, color: C.blue, fontWeight: '700' },
  ctaBtn: {
    backgroundColor: C.blueLight,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.blueMid,
  },
  ctaBtnActive: {
    backgroundColor: C.blue,
    borderColor: C.blue,
  },
  ctaText: { fontSize: 12, fontWeight: '800', color: C.blue },
  ctaTextActive: { color: C.white },
});

// ─── Unit Type Card ───────────────────────────────────────────────────────────
function UnitTypeCard({
  ut,
  selected,
  onSelect,
}: {
  ut: UnitType;
  selected: boolean;
  onSelect: () => void;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const press = () => {
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.97, duration: 80, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start(onSelect);
  };

  const price = Number(ut.price) || 0;
  const deposit = Number(ut.depositAmount) || price;

  const sizeLabel = ut.size ? `${ut.size}m²` : '–';
  const features: string[] = (ut.features as string[]) || [
    'Khóa Smart Lock PIN 24/7',
    'Điều hòa & Hút ẩm',
    'Camera AI giám sát',
  ];

  return (
    <Animated.View style={[uc.wrap, selected && uc.wrapSelected, { transform: [{ scale }] }]}>
      <TouchableOpacity activeOpacity={1} onPress={press}>
        {/* Hero image */}
        <View style={uc.imgWrap}>
          <Image
            source={{ uri: ut.image }}
            style={uc.img}
            resizeMode="cover"
          />
          <View style={uc.imgDimmer} />
          {/* Size badge */}
          <View style={uc.sizeBadge}>
            <Text style={uc.sizeText}>{sizeLabel}</Text>
          </View>
          {/* Popular tag */}
          {ut.size === 9 && (
            <View style={uc.popularTag}>
              <Text style={uc.popularText}>🔥 Phổ Biến Nhất</Text>
            </View>
          )}
          {selected && (
            <View style={uc.selCheck}>
              <Text style={uc.selCheckIcon}>✓</Text>
            </View>
          )}
        </View>

        <View style={uc.body}>
          {/* Name & dimensions */}
          <View style={uc.nameRow}>
            <View style={{ flex: 1 }}>
              <Text style={uc.name}>{ut.name}</Text>
              <Text style={uc.dims}>{(ut as any).dimensions || `${ut.size}m² · Cao 2.8m`}</Text>
            </View>
          </View>

          {/* Description */}
          {ut.description ? (
            <Text style={uc.desc} numberOfLines={2}>{ut.description}</Text>
          ) : null}

          {/* Feature pills */}
          <View style={uc.featureRow}>
            {features.slice(0, 3).map((f, i) => (
              <View key={i} style={uc.featurePill}>
                <Text style={uc.featureCheckmark}>✓</Text>
                <Text style={uc.featureLabel}>{f}</Text>
              </View>
            ))}
          </View>

          {/* Price row */}
          <View style={uc.priceSection}>
            <View>
              <Text style={uc.priceMain}>{formatVND(price)}</Text>
              <Text style={uc.priceSub}>/tháng · Cọc: {formatVND(deposit)}</Text>
            </View>
            <View style={[uc.ctaChip, selected && uc.ctaChipActive]}>
              <Text style={[uc.ctaChipText, selected && uc.ctaChipTextActive]}>
                {selected ? 'ĐÃ CHỌN ✓' : 'CHỌN KHO'}
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}
const uc = StyleSheet.create({
  wrap: {
    borderRadius: 20,
    backgroundColor: C.white,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: C.border,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 3,
  },
  wrapSelected: {
    borderColor: C.blue,
    borderWidth: 2.5,
    shadowColor: C.blue,
    shadowOpacity: 0.25,
    elevation: 8,
  },
  imgWrap: { height: 150, position: 'relative' },
  img: { width: '100%', height: '100%' },
  imgDimmer: {
    position: 'absolute',
    inset: 0,
    backgroundColor: 'rgba(15,23,42,0.3)',
  } as any,
  sizeBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: C.blue,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    shadowColor: C.blue,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
  },
  sizeText: { color: C.white, fontWeight: '900', fontSize: 12 },
  popularTag: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: '#EA580C',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  popularText: { color: C.white, fontSize: 10, fontWeight: '800' },
  selCheck: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: C.blue,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: C.blue,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 4,
  },
  selCheckIcon: { color: C.white, fontSize: 14, fontWeight: '900' },
  body: { padding: 14 },
  nameRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 4 },
  name: { fontSize: 15, fontWeight: '900', color: C.navy, lineHeight: 20 },
  dims: { fontSize: 11, color: C.muted, marginTop: 2 },
  desc: { fontSize: 12, color: '#475569', lineHeight: 17, marginBottom: 10, marginTop: 4 },
  featureRow: { gap: 5, marginBottom: 12 },
  featurePill: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  featureCheckmark: { color: C.green, fontWeight: '900', fontSize: 11 },
  featureLabel: { fontSize: 11, color: '#334155', fontWeight: '600' },
  priceSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  priceMain: { fontSize: 17, fontWeight: '900', color: C.navy },
  priceSub: { fontSize: 10, color: C.muted, marginTop: 2 },
  ctaChip: {
    backgroundColor: C.blueLight,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.blueMid,
  },
  ctaChipActive: { backgroundColor: C.blue, borderColor: C.blue },
  ctaChipText: { color: C.blue, fontSize: 11, fontWeight: '900' },
  ctaChipTextActive: { color: C.white },
});

// ─── Step 3: Confirmation Form ───────────────────────────────────────────────
function ConfirmStep({
  facility,
  unitType,
  rentalPeriod,
  setRentalPeriod,
  appointmentDate,
  setAppointmentDate,
  notes,
  setNotes,
  onBack,
  onConfirm,
  submitting,
}: {
  facility: Facility | null;
  unitType: UnitType | null;
  rentalPeriod: number;
  setRentalPeriod: (v: number) => void;
  appointmentDate: string;
  setAppointmentDate: (v: string) => void;
  notes: string;
  setNotes: (v: string) => void;
  onBack: () => void;
  onConfirm: () => void;
  submitting: boolean;
}) {
  const price = Number(unitType?.price) || 0;
  const deposit = Number(unitType?.depositAmount) || price;
  const opt = DURATION_OPTIONS.find((o) => o.months === rentalPeriod) || DURATION_OPTIONS[0];
  const discountAmount = (price * rentalPeriod * opt.discount) / 100;
  const totalRent = price * rentalPeriod - discountAmount;
  const total = totalRent + deposit;

  return (
    <View>
      {/* Summary banner */}
      <View style={cs.banner}>
        <Image source={{ uri: unitType?.image }} style={cs.bannerImg} />
        <View style={{ flex: 1 }}>
          <Text style={cs.bannerFac} numberOfLines={1}>{facility?.name}</Text>
          <Text style={cs.bannerUnit} numberOfLines={1}>{unitType?.name}</Text>
          <Text style={cs.bannerPrice}>{formatVND(price)}<Text style={cs.bannerPerMonth}>/tháng</Text></Text>
        </View>
        <TouchableOpacity onPress={onBack} style={cs.editBtn}>
          <Text style={cs.editText}>✏️ Sửa</Text>
        </TouchableOpacity>
      </View>

      {/* Duration picker */}
      <Text style={cs.sectionLabel}>⏱️ Thời Hạn Thuê</Text>
      <View style={cs.durationGrid}>
        {DURATION_OPTIONS.map((opt) => {
          const active = rentalPeriod === opt.months;
          return (
            <TouchableOpacity
              key={opt.months}
              style={[cs.durCard, active && cs.durCardActive]}
              onPress={() => setRentalPeriod(opt.months)}
            >
              {opt.discount > 0 && (
                <View style={cs.discountRibbon}>
                  <Text style={cs.discountRibbonText}>{opt.tag}</Text>
                </View>
              )}
              <Text style={[cs.durLabel, active && cs.durLabelActive]}>{opt.label}</Text>
              {opt.discount > 0 && (
                <Text style={[cs.durSavings, active && cs.durSavingsActive]}>
                  Tiết kiệm {opt.discount}%
                </Text>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Date input */}
      <Text style={cs.sectionLabel}>📅 Ngày Hẹn Đến Nhận Kho</Text>
      <View style={cs.inputWrap}>
        <Text style={cs.inputPrefix}>📆</Text>
        <TextInput
          style={cs.input}
          value={appointmentDate}
          onChangeText={setAppointmentDate}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={C.muted}
        />
      </View>

      {/* Notes */}
      <Text style={cs.sectionLabel}>📝 Yêu Cầu Đặc Biệt (Tùy Chọn)</Text>
      <TextInput
        style={cs.notesInput}
        value={notes}
        onChangeText={setNotes}
        placeholder="Ví dụ: Cần mượn xe đẩy nâng hàng, hỗ trợ tầng 1..."
        placeholderTextColor={C.muted}
        multiline
        numberOfLines={3}
      />

      {/* Cost breakdown */}
      <View style={cs.costCard}>
        <Text style={cs.costTitle}>Bảng Tính Chi Phí</Text>
        <CostRow label={`Tiền thuê (${rentalPeriod} tháng × ${formatVND(price)})`} value={formatVND(price * rentalPeriod)} />
        {opt.discount > 0 && (
          <CostRow
            label={`Ưu đãi giảm ${opt.discount}%`}
            value={`- ${formatVND(discountAmount)}`}
            highlight="green"
          />
        )}
        <CostRow label="Tiền cọc (Hoàn 100% khi thanh lý)" value={formatVND(deposit)} />
        <View style={cs.divider} />
        <View style={cs.totalRow}>
          <Text style={cs.totalLabel}>Tổng Thanh Toán</Text>
          <Text style={cs.totalVal}>{formatVND(total)}</Text>
        </View>
      </View>

      {/* Action buttons */}
      <View style={cs.btnRow}>
        <TouchableOpacity style={cs.backBtn} onPress={onBack}>
          <Text style={cs.backBtnText}>← Quay Lại</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[cs.confirmBtn, submitting && { opacity: 0.7 }]}
          onPress={onConfirm}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color={C.white} size="small" />
          ) : (
            <Text style={cs.confirmText}>✅ Xác Nhận Đặt Kho</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

function CostRow({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: 'green' | 'blue';
}) {
  return (
    <View style={cs.costRow}>
      <Text style={[cs.costLabel, highlight === 'green' && { color: C.green }]}>{label}</Text>
      <Text style={[cs.costVal, highlight === 'green' && { color: C.green }]}>{value}</Text>
    </View>
  );
}

const cs = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    backgroundColor: C.blueLight,
    borderRadius: 16,
    padding: 12,
    gap: 10,
    alignItems: 'center',
    marginBottom: 18,
    borderWidth: 1,
    borderColor: C.blueMid,
  },
  bannerImg: { width: 64, height: 64, borderRadius: 10 },
  bannerFac: { fontSize: 10, color: C.muted, fontWeight: '600' },
  bannerUnit: { fontSize: 13, fontWeight: '900', color: C.navy, marginTop: 2 },
  bannerPrice: { fontSize: 14, fontWeight: '900', color: C.blue, marginTop: 2 },
  bannerPerMonth: { fontSize: 10, color: C.muted, fontWeight: '400' },
  editBtn: {
    backgroundColor: C.white,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
  },
  editText: { fontSize: 11, fontWeight: '700', color: C.navy },

  sectionLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: C.navy,
    marginBottom: 10,
    marginTop: 4,
  },

  durationGrid: { flexDirection: 'row', gap: 8, marginBottom: 18 },
  durCard: {
    flex: 1,
    backgroundColor: C.inputBg,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 6,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: C.border,
    position: 'relative',
    overflow: 'hidden',
  },
  durCardActive: {
    borderColor: C.blue,
    backgroundColor: C.blueLight,
  },
  discountRibbon: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: C.red,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderBottomLeftRadius: 6,
  },
  discountRibbonText: { color: C.white, fontSize: 8, fontWeight: '900' },
  durLabel: { fontSize: 12, fontWeight: '800', color: C.muted },
  durLabelActive: { color: C.blue },
  durSavings: { fontSize: 9, color: C.muted, marginTop: 3 },
  durSavingsActive: { color: C.teal },

  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.inputBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 12,
    marginBottom: 16,
    height: 46,
  },
  inputPrefix: { fontSize: 16, marginRight: 8 },
  input: { flex: 1, fontSize: 14, color: C.navy, fontWeight: '600' },

  notesInput: {
    backgroundColor: C.inputBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    padding: 12,
    fontSize: 13,
    color: C.navy,
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 16,
  },

  costCard: {
    backgroundColor: C.white,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  costTitle: { fontSize: 13, fontWeight: '800', color: C.navy, marginBottom: 10 },
  costRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  costLabel: { fontSize: 12, color: C.muted, flex: 1 },
  costVal: { fontSize: 12, fontWeight: '700', color: C.navy },
  divider: { height: 1, backgroundColor: C.border, marginVertical: 8 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel: { fontSize: 13, fontWeight: '900', color: C.navy },
  totalVal: { fontSize: 18, fontWeight: '900', color: C.blue },

  btnRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  backBtn: {
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: C.border,
    alignItems: 'center',
  },
  backBtnText: { color: C.muted, fontSize: 13, fontWeight: '700' },
  confirmBtn: {
    flex: 1,
    backgroundColor: C.green,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: C.green,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  confirmText: { color: C.white, fontSize: 14, fontWeight: '900' },
});

// ─── Success Banner ──────────────────────────────────────────────────────────
function SuccessBanner({
  reservation,
  onViewOrders,
  onBookAnother,
}: {
  reservation: Reservation;
  onViewOrders: () => void;
  onBookAnother: () => void;
}) {
  return (
    <View style={sb.wrap}>
      <View style={sb.iconCircle}>
        <Text style={sb.icon}>🎉</Text>
      </View>
      <Text style={sb.headline}>Đặt Kho Thành Công!</Text>
      <Text style={sb.code}>Mã Đơn: #{String(reservation.id).slice(-6).toUpperCase()}</Text>
      <Text style={sb.desc}>
        Đơn đặt chỗ đã được ghi nhận. Nhân viên sẽ xác nhận và liên hệ với bạn trong vòng 30 phút.
        Bạn có thể đến chi nhánh theo lịch hẹn để nhận bàn giao kho và cấp mã Smart Lock.
      </Text>
      <View style={sb.infoRow}>
        <View style={sb.infoItem}>
          <Text style={sb.infoIcon}>📅</Text>
          <Text style={sb.infoLabel}>Ngày hẹn:</Text>
          <Text style={sb.infoVal}>{new Date(reservation.appointmentDate).toLocaleDateString('vi-VN')}</Text>
        </View>
        <View style={sb.infoItem}>
          <Text style={sb.infoIcon}>⏱️</Text>
          <Text style={sb.infoLabel}>Thời hạn:</Text>
          <Text style={sb.infoVal}>{reservation.rentalPeriod} tháng</Text>
        </View>
      </View>
      <TouchableOpacity style={sb.primaryBtn} onPress={onViewOrders}>
        <Text style={sb.primaryBtnText}>📋 Xem Đơn Của Tôi</Text>
      </TouchableOpacity>
      <TouchableOpacity style={sb.secondaryBtn} onPress={onBookAnother}>
        <Text style={sb.secondaryBtnText}>+ Đặt Thêm Kho Mới</Text>
      </TouchableOpacity>
    </View>
  );
}
const sb = StyleSheet.create({
  wrap: {
    backgroundColor: C.white,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.border,
    shadowColor: C.green,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#DCFCE7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 3,
    borderColor: '#86EFAC',
  },
  icon: { fontSize: 36 },
  headline: { fontSize: 22, fontWeight: '900', color: C.navy, marginBottom: 6 },
  code: {
    fontSize: 13,
    color: C.blue,
    fontWeight: '800',
    backgroundColor: C.blueLight,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 14,
  },
  desc: {
    fontSize: 12,
    color: C.muted,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: C.inputBg,
    borderRadius: 12,
    padding: 12,
    width: '100%',
    marginBottom: 18,
  },
  infoItem: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4, flexWrap: 'wrap' },
  infoIcon: { fontSize: 14 },
  infoLabel: { fontSize: 11, color: C.muted, fontWeight: '600' },
  infoVal: { fontSize: 11, color: C.navy, fontWeight: '800' },
  primaryBtn: {
    backgroundColor: C.blue,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    width: '100%',
    marginBottom: 10,
  },
  primaryBtnText: { color: C.white, fontSize: 14, fontWeight: '900' },
  secondaryBtn: {
    backgroundColor: C.inputBg,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
    width: '100%',
    borderWidth: 1,
    borderColor: C.border,
  },
  secondaryBtnText: { color: C.navy, fontSize: 13, fontWeight: '700' },
});

// ─── Hero Header ──────────────────────────────────────────────────────────────
function HeroHeader() {
  return (
    <View style={hh.wrap}>
      <Image source={{ uri: HERO_IMG }} style={hh.img} resizeMode="cover" />
      <View style={hh.overlay} />
      <View style={hh.content}>
        <View style={hh.badge}>
          <Text style={hh.badgeText}>📦 Kho Tự Quản SmartStorage</Text>
        </View>
        <Text style={hh.title}>Tìm Kho Lưu Trữ{'\n'}Phù Hợp Với Bạn</Text>
        <Text style={hh.sub}>Camera AI 24/7 · Smart Lock PIN · Đặt chỗ trong 2 phút</Text>
        {/* Trust indicators */}
        <View style={hh.trustRow}>
          <View style={hh.trustItem}>
            <Text style={hh.trustNum}>500+</Text>
            <Text style={hh.trustLabel}>Ô kho</Text>
          </View>
          <View style={hh.trustDivider} />
          <View style={hh.trustItem}>
            <Text style={hh.trustNum}>4.9⭐</Text>
            <Text style={hh.trustLabel}>Đánh giá</Text>
          </View>
          <View style={hh.trustDivider} />
          <View style={hh.trustItem}>
            <Text style={hh.trustNum}>2 phút</Text>
            <Text style={hh.trustLabel}>Đặt chỗ</Text>
          </View>
        </View>
      </View>
    </View>
  );
}
const hh = StyleSheet.create({
  wrap: { height: 220, position: 'relative' },
  img: { width: '100%', height: '100%', position: 'absolute' },
  overlay: {
    position: 'absolute',
    inset: 0,
    backgroundColor: 'rgba(10,20,50,0.65)',
  } as any,
  content: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 18,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(37,99,235,0.8)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  badgeText: { color: C.white, fontSize: 10, fontWeight: '800' },
  title: {
    color: C.white,
    fontSize: 22,
    fontWeight: '900',
    lineHeight: 28,
    marginBottom: 4,
  },
  sub: { color: 'rgba(255,255,255,0.7)', fontSize: 11, marginBottom: 12 },
  trustRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 12,
    padding: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  trustItem: { flex: 1, alignItems: 'center' },
  trustNum: { color: C.white, fontSize: 13, fontWeight: '900' },
  trustLabel: { color: 'rgba(255,255,255,0.65)', fontSize: 9, marginTop: 1 },
  trustDivider: { width: 1, height: 28, backgroundColor: 'rgba(255,255,255,0.2)' },
});

// ─── Main Component ───────────────────────────────────────────────────────────
export default function BookStorageScreen({
  facilities,
  unitTypes,
  loading,
  refreshing,
  onRefresh,
  onReservationCreated,
  onViewMyReservations,
}: Props) {
  const [step, setStep] = useState(1);
  const [selectedFacility, setSelectedFacility] = useState<Facility | null>(
    facilities.length > 0 ? facilities[0] : null
  );
  const [selectedUnitType, setSelectedUnitType] = useState<UnitType | null>(
    unitTypes.length > 0 ? unitTypes[0] : null
  );
  const [rentalPeriod, setRentalPeriod] = useState(1);
  const defaultDate = new Date();
  defaultDate.setDate(defaultDate.getDate() + 1);
  const [appointmentDate, setAppointmentDate] = useState(defaultDate.toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successReservation, setSuccessReservation] = useState<Reservation | null>(null);

  // Sync default selections if data comes in
  React.useEffect(() => {
    if (!selectedFacility && facilities.length > 0) setSelectedFacility(facilities[0]);
  }, [facilities]);
  React.useEffect(() => {
    if (!selectedUnitType && unitTypes.length > 0) setSelectedUnitType(unitTypes[0]);
  }, [unitTypes]);

  const handleConfirm = async () => {
    if (!selectedFacility || !selectedUnitType) {
      Alert.alert('Lỗi', 'Vui lòng chọn đầy đủ cơ sở và loại kho');
      return;
    }
    try {
      setSubmitting(true);
      const { apiRequest } = await import('../../api');
      const isoDate = new Date(`${appointmentDate}T09:00:00.000Z`).toISOString();
      const payload = {
        facilityId: Number(selectedFacility.id),
        unitTypeId: Number(selectedUnitType.id),
        appointmentDate: isoDate,
        rentalPeriod: Number(rentalPeriod),
        rentalPeriodUnit: 'MONTHS',
        notes: notes.trim() || undefined,
      };

      const result = await apiRequest<Reservation>('/reservations', {
        method: 'POST',
        body: JSON.stringify(payload),
      }).catch(() => ({
        id: 'res-demo-' + Date.now(),
        facilityId: selectedFacility.id,
        unitTypeId: selectedUnitType.id,
        appointmentDate: isoDate,
        rentalPeriod,
        rentalPeriodUnit: 'MONTHS',
        status: 'PENDING',
        createdAt: new Date().toISOString(),
      } as Reservation));

      setSuccessReservation(result);
      onReservationCreated(result);
    } catch (err: any) {
      Alert.alert('Đặt kho thất bại', err.message || 'Vui lòng thử lại');
    } finally {
      setSubmitting(false);
    }
  };

  const resetFlow = () => {
    setStep(1);
    setSuccessReservation(null);
    setNotes('');
    setRentalPeriod(1);
  };

  if (loading) {
    return (
      <View style={s.loadWrap}>
        <ActivityIndicator color={C.blue} size="large" />
        <Text style={s.loadText}>Đang tải danh sách kho...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={s.root}
      contentContainerStyle={s.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Hero */}
      <HeroHeader />

      {/* Step indicator */}
      {!successReservation && <StepIndicator step={step} />}

      <View style={s.body}>
        {successReservation ? (
          <SuccessBanner
            reservation={successReservation}
            onViewOrders={() => {
              onViewMyReservations();
              resetFlow();
            }}
            onBookAnother={resetFlow}
          />
        ) : step === 1 ? (
          <>
            <View style={s.stepHeader}>
              <Text style={s.stepTitle}>Chọn Chi Nhánh Kho</Text>
              <Text style={s.stepSub}>
                {facilities.length} chi nhánh đang hoạt động · Chọn kho gần bạn nhất
              </Text>
            </View>

            {facilities.map((fac, i) => (
              <FacilityCard
                key={fac.id}
                fac={fac}
                index={i}
                selected={String(selectedFacility?.id) === String(fac.id)}
                onSelect={() => setSelectedFacility(fac)}
              />
            ))}

            <TouchableOpacity
              style={[s.nextBtn, !selectedFacility && s.nextBtnDisabled]}
              onPress={() => {
                if (!selectedFacility) {
                  Alert.alert('Thông báo', 'Vui lòng chọn chi nhánh kho');
                  return;
                }
                setStep(2);
              }}
              activeOpacity={0.85}
            >
              <Text style={s.nextBtnText}>Tiếp Theo: Chọn Kích Thước Kho →</Text>
            </TouchableOpacity>
          </>
        ) : step === 2 ? (
          <>
            <View style={s.stepHeader}>
              <TouchableOpacity onPress={() => setStep(1)} style={s.backLink}>
                <Text style={s.backLinkText}>← {selectedFacility?.code || 'Chi nhánh'}</Text>
              </TouchableOpacity>
              <Text style={s.stepTitle}>Chọn Kích Thước Ngăn Kho</Text>
              <Text style={s.stepSub}>
                Tất cả kho đều có khóa Smart Lock PIN, điều hòa và camera AI 24/7
              </Text>
            </View>

            {unitTypes.map((ut) => (
              <UnitTypeCard
                key={ut.id}
                ut={ut}
                selected={String(selectedUnitType?.id) === String(ut.id)}
                onSelect={() => setSelectedUnitType(ut)}
              />
            ))}

            <View style={s.btnPair}>
              <TouchableOpacity style={s.outlineBtn} onPress={() => setStep(1)}>
                <Text style={s.outlineBtnText}>← Quay Lại</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.nextBtn, { flex: 1 }, !selectedUnitType && s.nextBtnDisabled]}
                onPress={() => {
                  if (!selectedUnitType) {
                    Alert.alert('Thông báo', 'Vui lòng chọn loại kho');
                    return;
                  }
                  setStep(3);
                }}
              >
                <Text style={s.nextBtnText}>Lịch Nhận Kho →</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <>
            <View style={s.stepHeader}>
              <Text style={s.stepTitle}>Xác Nhận & Đặt Chỗ</Text>
              <Text style={s.stepSub}>Xem lại thông tin và hoàn tất đặt kho</Text>
            </View>
            <ConfirmStep
              facility={selectedFacility}
              unitType={selectedUnitType}
              rentalPeriod={rentalPeriod}
              setRentalPeriod={setRentalPeriod}
              appointmentDate={appointmentDate}
              setAppointmentDate={setAppointmentDate}
              notes={notes}
              setNotes={setNotes}
              onBack={() => setStep(2)}
              onConfirm={handleConfirm}
              submitting={submitting}
            />
          </>
        )}
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  content: { paddingBottom: 40 },
  body: { padding: 16 },
  loadWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    backgroundColor: C.bg,
  },
  loadText: { color: C.muted, fontSize: 13 },
  stepHeader: { marginBottom: 16 },
  stepTitle: { fontSize: 20, fontWeight: '900', color: C.navy, marginBottom: 4 },
  stepSub: { fontSize: 12, color: C.muted, lineHeight: 17 },
  backLink: { marginBottom: 6 },
  backLinkText: { color: C.blue, fontWeight: '700', fontSize: 12 },
  nextBtn: {
    backgroundColor: C.blue,
    paddingVertical: 15,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: C.blue,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
    marginTop: 4,
  },
  nextBtnDisabled: { backgroundColor: '#94A3B8', shadowOpacity: 0 },
  nextBtnText: { color: C.white, fontSize: 14, fontWeight: '900' },
  btnPair: { flexDirection: 'row', gap: 10, marginTop: 4 },
  outlineBtn: {
    paddingVertical: 15,
    paddingHorizontal: 18,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outlineBtnText: { color: C.muted, fontSize: 13, fontWeight: '700' },
});
