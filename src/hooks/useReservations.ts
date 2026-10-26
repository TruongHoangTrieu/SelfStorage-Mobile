import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { apiRequest, Facility, UnitType, Reservation } from '../api';
import {
  DEFAULT_FACILITY_IMAGES,
  getUnitImage,
  FALLBACK_FACILITIES,
  FALLBACK_UNIT_TYPES,
} from '../data/mockCustomerData';

export function useReservations(onReservationChanged?: () => void) {
  const [customerTab, setCustomerTab] = useState<'my_units' | 'book' | 'my_reservations'>('book');
  const [step, setStep] = useState<number>(1);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [unitTypes, setUnitTypes] = useState<UnitType[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const [selectedFacility, setSelectedFacility] = useState<Facility | null>(null);
  const [selectedUnitType, setSelectedUnitType] = useState<UnitType | null>(null);
  const [rentalPeriod, setRentalPeriod] = useState<number>(1);
  const [notes, setNotes] = useState<string>('');

  const defaultDate = new Date();
  defaultDate.setDate(defaultDate.getDate() + 1);
  const [appointmentDate, setAppointmentDate] = useState<string>(
    defaultDate.toISOString().split('T')[0]
  );

  const [myReservations, setMyReservations] = useState<Reservation[]>([]);
  const [loadingReservations, setLoadingReservations] = useState<boolean>(false);
  const [successReservation, setSuccessReservation] = useState<Reservation | null>(null);

  const loadCustomerData = useCallback(async () => {
    try {
      setLoading(true);
      const [facData, utData] = await Promise.all([
        apiRequest<any[]>('/facilities').catch(() => null),
        apiRequest<any[]>('/storage-unit-types').catch(() => null),
      ]);

      const resolvedFacilities: Facility[] = (Array.isArray(facData) && facData.length > 0)
        ? facData.map((f, i) => ({
            ...f,
            image: (Array.isArray(f.images) && f.images[0]) || f.imageUrl || f.image || DEFAULT_FACILITY_IMAGES[i % DEFAULT_FACILITY_IMAGES.length],
            rating: 4.9,
          }))
        : FALLBACK_FACILITIES;

      const resolvedUnitTypes: UnitType[] = (Array.isArray(utData) && utData.length > 0)
        ? utData.map((ut, i) => ({
            ...ut,
            price: ut.price ?? ut.monthlyRent ?? ut.pricePerMonth ?? 1200000,
            depositAmount: ut.depositAmount ?? ut.price ?? 1200000,
            image: (Array.isArray(ut.images) && ut.images[0]) || ut.imageUrl || ut.image || getUnitImage(ut.name, i),
            features: [
              
            ],
            dimensions: `${ut.size || 5}${ut.sizeUnit || 'm²'} (Cao 2.8m)`,
          }))
        : FALLBACK_UNIT_TYPES;

      setFacilities(resolvedFacilities);
      setUnitTypes(resolvedUnitTypes);
      setSelectedFacility(resolvedFacilities[0]);
      setSelectedUnitType(resolvedUnitTypes[0]);
    } catch (err: any) {
      console.warn('Lỗi tải dữ liệu khách:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const loadMyReservations = useCallback(async () => {
    try {
      setLoadingReservations(true);
      const data = await apiRequest<Reservation[]>('/reservations/my');
      setMyReservations(Array.isArray(data) ? data : []);
    } catch {
      // ignore
    } finally {
      setLoadingReservations(false);
    }
  }, []);

  const handleCreateReservation = async () => {
    if (!selectedFacility || !selectedUnitType) {
      Alert.alert('Lỗi', 'Vui lòng chọn đầy đủ cơ sở và loại kho');
      return;
    }

    try {
      setSubmitting(true);
      const isoAppointmentDate = new Date(`${appointmentDate}T09:00:00.000Z`).toISOString();
      const payload = {
        facilityId: Number(selectedFacility.id),
        unitTypeId: Number(selectedUnitType.id),
        appointmentDate: isoAppointmentDate,
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
        appointmentDate: isoAppointmentDate,
        rentalPeriod,
        rentalPeriodUnit: 'MONTHS',
        status: 'PENDING',
        createdAt: new Date().toISOString(),
      } as Reservation));

      setSuccessReservation(result);
      loadMyReservations();
      if (onReservationChanged) {
        onReservationChanged();
      }
    } catch (err: any) {
      Alert.alert('Đặt kho thất bại', err.message || 'Vui lòng thử lại');
    } finally {
      setSubmitting(false);
    }
  };

  const calculateEstimate = () => {
    if (!selectedUnitType) return { monthly: 0, deposit: 0, total: 0, discount: 0 };
    const monthly = selectedUnitType.price || 0;
    const deposit = selectedUnitType.depositAmount || monthly;
    let discountPercent = 0;
    if (rentalPeriod >= 12) discountPercent = 0.15;
    else if (rentalPeriod >= 6) discountPercent = 0.10;
    else if (rentalPeriod >= 3) discountPercent = 0.05;

    const rentSubtotal = monthly * rentalPeriod;
    const discountAmount = rentSubtotal * discountPercent;
    const total = rentSubtotal - discountAmount + deposit;
    return { monthly, deposit, total, discount: discountAmount, discountPercent };
  };

  return {
    customerTab,
    setCustomerTab,
    step,
    setStep,
    facilities,
    unitTypes,
    loading,
    submitting,
    refreshing,
    selectedFacility,
    setSelectedFacility,
    selectedUnitType,
    setSelectedUnitType,
    rentalPeriod,
    setRentalPeriod,
    notes,
    setNotes,
    appointmentDate,
    setAppointmentDate,
    myReservations,
    loadingReservations,
    successReservation,
    loadCustomerData,
    loadMyReservations,
    handleCreateReservation,
    calculateEstimate,
  };
}
