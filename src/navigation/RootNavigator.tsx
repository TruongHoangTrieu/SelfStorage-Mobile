import React from 'react';
import { StatusBar, Platform, View } from 'react-native';
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
    Platform.OS === 'android' ? (StatusBar.currentHeight || 0) : 0
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
          paddingTop: topInset,
          paddingBottom: bottomInset,
        },
      ]}
    >
      <StatusBar
        barStyle="dark-content"
        backgroundColor="#FFFFFF"
        translucent={Platform.OS === 'android'}
      />
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
