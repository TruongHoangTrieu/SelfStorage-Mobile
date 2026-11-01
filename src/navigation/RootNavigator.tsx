import React from 'react';
import { Platform, View, StatusBar as RNStatusBar } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppMode } from '../context/AppModeContext';
import { useAuth } from '../context/AuthContext';
import { useStaffAppointments } from '../hooks/useStaffAppointments';
import StaffNavigator from './StaffNavigator';
import CustomerNavigator from './CustomerNavigator';
import styles from '../styles/appStyles';

export default function RootNavigator() {
  const { appMode } = useAppMode();
  const { currentUser } = useAuth();
  const staffFacilityId =
    currentUser?.facilityId ||
    currentUser?.assignedFacility?.id ||
    currentUser?.facility?.id;
  const staffAppointmentsState = useStaffAppointments(staffFacilityId);
  const insets = useSafeAreaInsets();

  // Đảm bảo không bị che bởi StatusBar (thanh thông báo) và Bottom Navigation (thanh chuyển tab / điều hướng điện thoại)
  const topInset = Math.max(
    insets.top,
    Platform.OS === 'android' ? (RNStatusBar.currentHeight || 0) : 0
  );
  const bottomInset = Math.max(
    insets.bottom,
    Platform.OS === 'android' ? 12 : 0
  );

  return (
    <View
      style={[
        styles.safeArea,
        {
          backgroundColor: '#FFFFFF',
          paddingTop: 0,
          paddingBottom: 0,
        },
      ]}
    >
      <StatusBar style="dark" />
      {appMode === 'staff' ? (
        <StaffNavigator staffAppointmentsState={staffAppointmentsState} />
      ) : (
        <CustomerNavigator
          onRefreshStaffData={staffAppointmentsState.loadStaffData}
        />
      )}
    </View>
  );
}
