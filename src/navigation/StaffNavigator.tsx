import React, { useEffect, useMemo } from 'react';
import { View, AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CheckInQueueScreen from '../screens/staff/CheckInQueueScreen';
import HandoverDetailScreen from '../screens/staff/HandoverDetailScreen';
import HandoverSuccessScreen from '../screens/staff/HandoverSuccessScreen';
import StaffDashboardScreen from '../screens/staff/StaffDashboardScreen';
import UnitMapScreen from '../screens/staff/UnitMapScreen';
import StaffSettingsScreen from '../screens/staff/StaffSettingsScreen';
import StaffReturnQueueScreen from '../screens/staff/StaffReturnQueueScreen';
import StaffLiquidationScreen from '../screens/staff/StaffLiquidationScreen';
import StaffSupportScreen from '../screens/staff/StaffSupportScreen';
import PrintReceiptModal from '../components/staff/PrintReceiptModal';
import NotificationsModal from '../components/common/NotificationsModal';
import NotificationDetailScreen from '../screens/common/NotificationDetailScreen';
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
    setSelectedAppointment,
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
  const [selectedStaffNotificationId, setSelectedStaffNotificationId] = React.useState<string | null>(null);
  const [selectedStaffNotification, setSelectedStaffNotification] = React.useState<any | null>(null);
  const staffNotifState = useNotifications('staff');

  // Khôi phục màn hình bàn giao nhận kho hoặc nghiệm thu trả kho (khi chuyển qua app ngân hàng quay lại hoặc reload)
  useEffect(() => {
    let isSubscribed = true;

    const restoreActiveState = async () => {
      try {
        const savedHandover = await AsyncStorage.getItem('@selfstorage_active_handover');
        if (savedHandover && isSubscribed) {
          const parsed = JSON.parse(savedHandover);
          if (parsed?.appointmentId) {
            const target = appointments.find((a) => a.id === parsed.appointmentId) || parsed.appointment;
            if (target) {
              setSelectedAppointment(target);
            }
            setStaffTab('queue');
            setFlowStep('handover');
            return;
          }
        }

        const activeOrderId = await AsyncStorage.getItem('active_return_inspection_order_id');
        if (activeOrderId && isSubscribed) {
          setStaffTab('queue');
          setFlowStep('queue');
          return;
        }

        if (isSubscribed) {
          setStaffTab((prev) => (prev === 'queue' ? 'queue' : 'dashboard'));
        }
      } catch {
        if (isSubscribed) setStaffTab('dashboard');
      }
    };

    restoreActiveState();

    const appStateSub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        restoreActiveState();
      }
    });

    return () => {
      isSubscribed = false;
      appStateSub.remove();
    };
  }, [currentUser?.id, appointments]);

  useEffect(() => {
    loadStaffData();
  }, [loadStaffData]);

  const handleSelectStaffNotification = (notif: any) => {
    setShowStaffNotifModal(false);
    setSelectedStaffNotification(notif);
    setSelectedStaffNotificationId(notif.id);
  };
  return (
    <View style={{ flex: 1 }}>
      {/* ─── Render Nội Dung Staff Theo Tab & FlowStep (Không dùng tab menu / sidebar) ─── */}
      {selectedStaffNotificationId ? (
        <NotificationDetailScreen
          notificationId={selectedStaffNotificationId}
          initialData={selectedStaffNotification}
          onBack={() => {
            setSelectedStaffNotificationId(null);
            setSelectedStaffNotification(null);
            setSelectedStaffNotification(null);
          }}
          onNavigateRelated={(target) => {
            setSelectedStaffNotificationId(null);
            setStaffTab(target.tab as any);
            if (target.tab === 'queue') setFlowStep('queue');
          }}
          role="staff"
        />
      ) : staffTab === 'dashboard' ? (
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
            facilityId={dynamicStaffUser.facilityId}
            facilityName={dynamicStaffUser.facilityName}
            onOpenNotifications={() => setShowStaffNotifModal(true)}
            unreadNotifCount={staffNotifState.unreadCount}
          />
        ) : flowStep === 'handover' && selectedAppointment ? (
          /* Xác thực khách hàng & Bàn giao kho */
          <HandoverDetailScreen
            appointment={selectedAppointment}
            availableUnits={availableUnits}
            onBackToQueue={() => {
              AsyncStorage.removeItem('@selfstorage_active_handover').catch(() => null);
              if (selectedAppointment) {
                AsyncStorage.removeItem(`@selfstorage_handover_step_${selectedAppointment.id}`).catch(() => null);
              }
              setFlowStep('queue');
            }}
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
            isEditing={selectedAppointment.status === 'completed' || Boolean(selectedAppointment.contractCode)}
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
            facilityId={dynamicStaffUser.facilityId}
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
      ) : staffTab === 'liquidation' ? (
        /* MỤC RIÊNG: Thanh lý kho quá hạn */
        <StaffLiquidationScreen
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
      {selectedAppointment && showQuickPrintModal && (
        <PrintReceiptModal
          visible={showQuickPrintModal}
          onClose={() => setShowQuickPrintModal(false)}
          appointment={selectedAppointment}
          assignedUnitCode={selectedAppointment.assignedUnit}
        />
      )}

      {/* ─── MODAL TRUNG TÂM THÔNG BÁO NHÂN VIÊN ─── */}
      {showStaffNotifModal && (
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
          onSelectNotification={handleSelectStaffNotification}
        />
      )}
    </View>
  );
}
