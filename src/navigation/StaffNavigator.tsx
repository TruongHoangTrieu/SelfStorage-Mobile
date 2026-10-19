import React, { useEffect, useMemo } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import StaffSidebar from '../components/staff/StaffSidebar';
import CheckInQueueScreen from '../screens/staff/CheckInQueueScreen';
import HandoverDetailScreen from '../screens/staff/HandoverDetailScreen';
import HandoverSuccessScreen from '../screens/staff/HandoverSuccessScreen';
import StaffDashboardScreen from '../screens/staff/StaffDashboardScreen';
import UnitMapScreen from '../screens/staff/UnitMapScreen';
import StaffSettingsScreen from '../screens/staff/StaffSettingsScreen';
import PrintReceiptModal from '../components/staff/PrintReceiptModal';
import { CURRENT_STAFF_USER } from '../data/mockStaffData';
import { useStaffAppointments } from '../hooks/useStaffAppointments';
import { useAppMode } from '../context/AppModeContext';
import { useAuth } from '../context/AuthContext';
import styles from '../styles/appStyles';

interface StaffNavigatorProps {
  staffAppointmentsState?: ReturnType<typeof useStaffAppointments>;
}

export default function StaffNavigator({ staffAppointmentsState }: StaffNavigatorProps) {
  const { currentUser } = useAuth();
  const defaultStaffState = useStaffAppointments(
    currentUser?.facilityId || currentUser?.assignedFacility?.id || currentUser?.facility?.id
  );
  const staffState = staffAppointmentsState || defaultStaffState;
  const { switchToCustomer } = useAppMode();

  const dynamicStaffUser = useMemo(() => {
    const facilityName =
      currentUser?.assignedFacility?.name ||
      currentUser?.facility?.name ||
      (currentUser?.facilityId ? `Cơ sở #${currentUser.facilityId}` : CURRENT_STAFF_USER.facilityName);
    const facilityId =
      currentUser?.facilityId ||
      currentUser?.assignedFacility?.id ||
      currentUser?.facility?.id ||
      CURRENT_STAFF_USER.facilityId;

    return {
      id: currentUser?.id || CURRENT_STAFF_USER.id,
      fullName: currentUser?.fullName || currentUser?.name || CURRENT_STAFF_USER.fullName,
      email: currentUser?.email || CURRENT_STAFF_USER.email,
      phone: currentUser?.phone || CURRENT_STAFF_USER.phone,
      role: currentUser?.role || CURRENT_STAFF_USER.role,
      facilityId,
      facilityName,
    };
  }, [currentUser]);

  const {
    staffTab,
    setStaffTab,
    flowStep,
    setFlowStep,
    isSidebarVisible,
    setIsSidebarVisible,
    appointments,
    availableUnits,
    selectedAppointment,
    isStaffLoading,
    isSubmittingHandover,
    showQuickPrintModal,
    setShowQuickPrintModal,
    loadStaffData,
    handleStartHandover,
    handleCompleteHandover,
  } = staffState;

  useEffect(() => {
    loadStaffData();
  }, [loadStaffData]);

  return (
    <View style={{ flex: 1 }}>
      {/* Thanh Sidebar (Drawer) 6 mục */}
      <StaffSidebar
        visible={isSidebarVisible}
        onClose={() => setIsSidebarVisible(false)}
        activeTab={staffTab}
        onSelectTab={(tab) => {
          setStaffTab(tab);
          if (tab === 'queue') setFlowStep('queue');
        }}
        currentUser={dynamicStaffUser}
        pendingCount={appointments.filter((a) => a.status === 'pending' || a.status === 'arrived').length}
        onSwitchToCustomer={switchToCustomer}
      />

      {/* Render Nội Dung Staff Theo Tab & FlowStep */}
      {staffTab === 'queue' ? (
        flowStep === 'queue' ? (
          /* TRANG A: Hàng đợi Nhận kho trong ngày */
          <CheckInQueueScreen
            appointments={appointments}
            onStartHandover={handleStartHandover}
            onRefresh={loadStaffData}
            isRefreshing={isStaffLoading}
            onOpenSidebar={() => setIsSidebarVisible(true)}
            facilityName={dynamicStaffUser.facilityName}
          />
        ) : flowStep === 'handover' && selectedAppointment ? (
          /* TRANG B: Xác thực khách hàng & Bàn giao kho */
          <HandoverDetailScreen
            appointment={selectedAppointment}
            availableUnits={availableUnits}
            onBackToQueue={() => setFlowStep('queue')}
            onCompleteHandover={handleCompleteHandover}
            isSubmitting={isSubmittingHandover}
          />
        ) : flowStep === 'success' && selectedAppointment ? (
          /* TRANG C: Hoàn tất Bàn giao */
          <HandoverSuccessScreen
            appointment={selectedAppointment}
            assignedUnitCode={selectedAppointment.assignedUnit}
            contractCode={selectedAppointment.contractCode}
            accessPin={selectedAppointment.accessPin}
            onBackToQueue={() => {
              setFlowStep('queue');
              setStaffTab('queue');
              loadStaffData();
            }}
            onPrintAgain={() => setShowQuickPrintModal(true)}
          />
        ) : (
          <CheckInQueueScreen
            appointments={appointments}
            onStartHandover={handleStartHandover}
            onRefresh={loadStaffData}
            isRefreshing={isStaffLoading}
            onOpenSidebar={() => setIsSidebarVisible(true)}
            facilityName={dynamicStaffUser.facilityName}
          />
        )
      ) : staffTab === 'dashboard' ? (
        /* TAB 1: Bảng điều khiển (Tổng quan hôm nay) */
        <StaffDashboardScreen
          appointments={appointments}
          onGoToQueue={() => {
            setStaffTab('queue');
            setFlowStep('queue');
          }}
          onOpenSidebar={() => setIsSidebarVisible(true)}
          facilityName={dynamicStaffUser.facilityName}
        />
      ) : staffTab === 'facility' ? (
        /* TAB 4: Sơ đồ cơ sở & Trạng thái ô kho */
        <UnitMapScreen
          availableUnits={availableUnits}
          onOpenSidebar={() => setIsSidebarVisible(true)}
          facilityName={dynamicStaffUser.facilityName}
        />
      ) : staffTab === 'settings' ? (
        /* TAB 6: Cài đặt nhân viên */
        <StaffSettingsScreen
          currentUser={dynamicStaffUser}
          onOpenSidebar={() => setIsSidebarVisible(true)}
          onSwitchToCustomer={switchToCustomer}
        />
      ) : (
        /* Các tab khác: Checkout / Support */
        <View style={styles.otherTabContainer}>
          <View style={styles.otherTabTopBar}>
            <TouchableOpacity
              style={styles.menuIconBtn}
              onPress={() => setIsSidebarVisible(true)}
            >
              <Text style={{ color: '#fff', fontSize: 20 }}>☰</Text>
            </TouchableOpacity>
            <Text style={styles.otherTabTitle}>
              {staffTab === 'checkout' ? '📤 TRẢ KHO / THANH LÝ' : '🛠️ HỖ TRỢ & SỰ CỐ'}
            </Text>
          </View>
          <View style={styles.otherTabBody}>
            <Text style={{ fontSize: 40, marginBottom: 10 }}>
              {staffTab === 'checkout' ? '📤' : '🛠️'}
            </Text>
            <Text style={styles.otherTabHeadline}>
              {staffTab === 'checkout'
                ? 'Phân hệ Trả kho & Nghiệm thu hoàn cọc'
                : 'Phân hệ Xử lý sự cố tại chỗ (Ticket)'}
            </Text>
            <Text style={styles.otherTabDesc}>
              Tính năng đang kết nối với hệ thống Backend. Bạn có thể chuyển sang Hàng Đợi Nhận Kho (Luồng 2) để tiếp tục thao tác.
            </Text>
            <TouchableOpacity
              style={styles.backToQueueActionBtn}
              onPress={() => {
                setStaffTab('queue');
                setFlowStep('queue');
              }}
            >
              <Text style={styles.backToQueueActionText}>Vào Hàng Đợi Nhận Kho (Luồng 2) →</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Quick Print Modal khi in lại ở Trang C */}
      {selectedAppointment && (
        <PrintReceiptModal
          visible={showQuickPrintModal}
          onClose={() => setShowQuickPrintModal(false)}
          appointment={selectedAppointment}
          assignedUnitCode={selectedAppointment.assignedUnit}
        />
      )}
    </View>
  );
}
