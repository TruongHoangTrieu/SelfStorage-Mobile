import React, { useEffect, useMemo } from 'react';
import { View } from 'react-native';
import CheckInQueueScreen from '../screens/staff/CheckInQueueScreen';
import HandoverDetailScreen from '../screens/staff/HandoverDetailScreen';
import HandoverSuccessScreen from '../screens/staff/HandoverSuccessScreen';
import StaffDashboardScreen from '../screens/staff/StaffDashboardScreen';
import UnitMapScreen from '../screens/staff/UnitMapScreen';
import StaffSettingsScreen from '../screens/staff/StaffSettingsScreen';
import StaffReturnQueueScreen from '../screens/staff/StaffReturnQueueScreen';
import StaffSupportScreen from '../screens/staff/StaffSupportScreen';
import PrintReceiptModal from '../components/staff/PrintReceiptModal';
import NotificationsModal from '../components/common/NotificationsModal';
import { useNotifications } from '../hooks/useNotifications';
import { CURRENT_STAFF_USER } from '../data/mockStaffData';
import { useStaffAppointments } from '../hooks/useStaffAppointments';
import { useAppMode } from '../context/AppModeContext';
import { useAuth } from '../context/AuthContext';
import { StaffTab } from '../types/handover';

interface StaffNavigatorProps {
  staffAppointmentsState?: ReturnType<typeof useStaffAppointments>;
}

export default function StaffNavigator({ staffAppointmentsState }: StaffNavigatorProps) {
  const { currentUser, handleLogout } = useAuth();
  const defaultStaffState = useStaffAppointments(
    currentUser?.facilityId || currentUser?.assignedFacility?.id || currentUser?.facility?.id
  );
  const staffState = staffAppointmentsState || defaultStaffState;
  const { switchToCustomer } = useAppMode();

  const handleSwitchToCustomerAndLogout = async () => {
    await handleLogout();
  };

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

  // Điều hướng về Trang Home Nhân Viên
  const handleBackToHome = () => {
    setStaffTab('dashboard');
  };

  const handleNavigateTab = (tab: StaffTab) => {
    setStaffTab(tab);
    if (tab === 'queue') setFlowStep('queue');
  };

  // Trung tâm thông báo Nhân viên
  const [showStaffNotifModal, setShowStaffNotifModal] = React.useState<boolean>(false);
  const staffNotifState = useNotifications('staff');

  // Luôn mặc định mở Trang Home Nhân Viên khi tài khoản đăng nhập
  useEffect(() => {
    setStaffTab('dashboard');
  }, [currentUser?.id]);

  useEffect(() => {
    loadStaffData();
  }, [loadStaffData]);

  return (
    <View style={{ flex: 1 }}>
      {/* ─── Render Nội Dung Staff Theo Tab & FlowStep (Không dùng tab menu / sidebar) ─── */}
      {staffTab === 'dashboard' ? (
        /* TRANG CHÍNH: Home Nhân Viên (Dashboard có đầy đủ các nút chức năng) */
        <StaffDashboardScreen
          appointments={appointments}
          onNavigateTab={handleNavigateTab}
          facilityName={dynamicStaffUser.facilityName}
          currentUser={dynamicStaffUser}
          onOpenNotifications={() => setShowStaffNotifModal(true)}
          unreadNotifCount={staffNotifState.unreadCount}
          onLogout={handleLogout}
          onSwitchToCustomer={handleSwitchToCustomerAndLogout}
          onRefresh={loadStaffData}
          isRefreshing={isStaffLoading}
        />
      ) : staffTab === 'queue' ? (
        flowStep === 'queue' ? (
          /* MỤC 1: Lịch nhận & trả kho hợp nhất */
          <CheckInQueueScreen
            appointments={appointments}
            onStartHandover={handleStartHandover}
            onOpenReturnOrder={(order) => setStaffTab('checkout')}
            onRefresh={loadStaffData}
            isRefreshing={isStaffLoading}
            onOpenSidebar={handleBackToHome}
            facilityName={dynamicStaffUser.facilityName}
            onOpenNotifications={() => setShowStaffNotifModal(true)}
            unreadNotifCount={staffNotifState.unreadCount}
          />
        ) : flowStep === 'handover' && selectedAppointment ? (
          /* Xác thực khách hàng & Bàn giao kho */
          <HandoverDetailScreen
            appointment={selectedAppointment}
            availableUnits={availableUnits}
            onBackToQueue={() => setFlowStep('queue')}
            onCompleteHandover={handleCompleteHandover}
            isSubmitting={isSubmittingHandover}
          />
        ) : flowStep === 'success' && selectedAppointment ? (
          /* Hoàn tất Bàn giao */
          <HandoverSuccessScreen
            appointment={selectedAppointment}
            assignedUnitCode={selectedAppointment.assignedUnit}
            contractCode={selectedAppointment.contractCode}
            accessPin={selectedAppointment.accessPin}
            signature={selectedAppointment.signature}
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
            onOpenSidebar={handleBackToHome}
            facilityName={dynamicStaffUser.facilityName}
            onOpenNotifications={() => setShowStaffNotifModal(true)}
            unreadNotifCount={staffNotifState.unreadCount}
          />
        )
      ) : staffTab === 'facility' ? (
        /* MỤC 3: Sơ đồ cơ sở & Trạng thái ô kho */
        <UnitMapScreen
          availableUnits={availableUnits}
          onOpenSidebar={handleBackToHome}
          facilityName={dynamicStaffUser.facilityName}
        />
      ) : staffTab === 'checkout' ? (
        /* MỤC 2: Trả kho & Thanh lý hợp đồng */
        <StaffReturnQueueScreen
          facilityId={dynamicStaffUser.facilityId}
          facilityName={dynamicStaffUser.facilityName}
          onOpenSidebar={handleBackToHome}
          onOpenNotifications={() => setShowStaffNotifModal(true)}
          unreadNotifCount={staffNotifState.unreadCount}
        />
      ) : staffTab === 'settings' ? (
        /* MỤC 5: Cài đặt nhân viên & Giao ca */
        <StaffSettingsScreen
          currentUser={dynamicStaffUser}
          onOpenSidebar={handleBackToHome}
          onSwitchToCustomer={handleSwitchToCustomerAndLogout}
        />
      ) : staffTab === 'support' ? (
        /* MỤC 4: Hỗ trợ & Xử lý sự cố tại chỗ (Tickets) */
        <StaffSupportScreen
          facilityId={dynamicStaffUser.facilityId}
          facilityName={dynamicStaffUser.facilityName}
          staffUser={dynamicStaffUser}
          onOpenSidebar={handleBackToHome}
          onOpenNotifications={() => setShowStaffNotifModal(true)}
          unreadNotifCount={staffNotifState.unreadCount}
        />
      ) : (
        /* Fallback về Trang Home Nhân Viên */
        <StaffDashboardScreen
          appointments={appointments}
          onNavigateTab={handleNavigateTab}
          facilityName={dynamicStaffUser.facilityName}
          currentUser={dynamicStaffUser}
          onOpenNotifications={() => setShowStaffNotifModal(true)}
          unreadNotifCount={staffNotifState.unreadCount}
          onLogout={handleLogout}
          onSwitchToCustomer={handleSwitchToCustomerAndLogout}
          onRefresh={loadStaffData}
          isRefreshing={isStaffLoading}
        />
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

      {/* ─── MODAL TRUNG TÂM THÔNG BÁO NHÂN VIÊN ─── */}
      <NotificationsModal
        visible={showStaffNotifModal}
        onClose={() => setShowStaffNotifModal(false)}
        notifications={staffNotifState.notifications}
        unreadCount={staffNotifState.unreadCount}
        isLoading={staffNotifState.loading}
        isRefreshing={staffNotifState.refreshing}
        onRefresh={() => staffNotifState.loadNotifications(true)}
        onMarkAsRead={staffNotifState.markAsRead}
        onMarkAllAsRead={staffNotifState.markAllAsRead}
        onDeleteNotification={staffNotifState.deleteNotification}
        role="staff"
      />
    </View>
  );
}
