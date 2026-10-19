import React, { useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Modal,
  Platform,
  Image,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import CustomerSidebar from '../components/customer/CustomerSidebar';
import MyUnitsDashboardScreen from '../screens/customer/MyUnitsDashboardScreen';
import UnitDetailManageScreen from '../screens/customer/UnitDetailManageScreen';
import CreateGuestPinModal from '../components/customer/CreateGuestPinModal';
import RenewContractModal from '../components/customer/RenewContractModal';
import UpgradeUnitModal from '../components/customer/UpgradeUnitModal';
import ReportIssueModal from '../components/customer/ReportIssueModal';
import ChangePinModal from '../components/customer/ChangePinModal';
import {
  CustomerPaymentsScreen,
  CustomerDocumentsScreen,
  CustomerProfileScreen,
} from '../screens/customer/CustomerPortalSubScreens';
import CustomerSupportScreen from '../screens/customer/CustomerSupportScreen';
import CustomerBottomNavBar, { CustomerTabType } from '../components/customer/CustomerBottomNavBar';
import BookStorageScreen from '../screens/customer/BookStorageScreen';
import LoginScreen from '../screens/auth/LoginScreen';
import { CURRENT_CUSTOMER_USER } from '../data/mockCustomerStorageData';
import { useCustomerContracts } from '../hooks/useCustomerContracts';
import { useReservations } from '../hooks/useReservations';
import { useAuth } from '../context/AuthContext';
import { useAppMode } from '../context/AppModeContext';
import styles from '../styles/appStyles';

interface CustomerNavigatorProps {
  onRefreshStaffData?: () => void;
}

export default function CustomerNavigator({ onRefreshStaffData }: CustomerNavigatorProps) {
  const { setAppMode } = useAppMode();
  const {
    isLoggedIn,
    currentUser,
    showAuthModal,
    setShowAuthModal,
    handleLoginSuccess,
  } = useAuth();

  const customerContractsState = useCustomerContracts();
  const {
    customerNavTab,
    setCustomerNavTab,
    customerFlowStep,
    setCustomerFlowStep,
    isCustomerSidebarVisible,
    setIsCustomerSidebarVisible,
    rentedUnits,
    selectedRentedUnit,
    setSelectedRentedUnit,
    isCustomerLoading,
    showGuestPinModal,
    setShowGuestPinModal,
    showRenewModal,
    setShowRenewModal,
    showUpgradeModal,
    setShowUpgradeModal,
    showReportIssueModal,
    setShowReportIssueModal,
    showChangePinModal,
    setShowChangePinModal,
    loadCustomerContracts,
    handleGuestPinCreated,
    handleRenewSuccess,
    handleTicketCreated,
    handlePinChanged,
  } = customerContractsState;

  const reservationsState = useReservations(() => {
    if (onRefreshStaffData) {
      onRefreshStaffData();
    }
  });

  const {
    customerTab,
    setCustomerTab,
    facilities,
    unitTypes,
    loading,
    refreshing,
    myReservations,
    loadingReservations,
    loadCustomerData,
    loadMyReservations,
  } = reservationsState;

  useEffect(() => {
    loadCustomerData();
    loadCustomerContracts();
  }, [loadCustomerData, loadCustomerContracts]);

  // Điều hướng thanh dưới đáy & kiểm tra bắt buộc đăng nhập
  const handleNavigateBottomTab = (tab: CustomerTabType) => {
    if (tab === 'search') {
      setCustomerTab('book');
      return;
    }
    // Bắt buộc đăng nhập khi nhấn qua Kho của tôi hoặc Hỗ trợ
    if ((tab === 'my-storage' || tab === 'support') && (!isLoggedIn || !currentUser)) {
      setShowAuthModal(true);
      return;
    }
    if (tab === 'my-storage') {
      setCustomerTab('my_units');
      setCustomerNavTab('my_units');
      setCustomerFlowStep('dashboard');
    } else if (tab === 'support') {
      setCustomerTab('my_units');
      setCustomerNavTab('support');
    }
  };

  return (
    <View style={{ flex: 1 }}>
      {/* Thanh Sidebar (Drawer) Cổng Khách Hàng */}
      <CustomerSidebar
        visible={isCustomerSidebarVisible}
        onClose={() => setIsCustomerSidebarVisible(false)}
        activeTab={customerNavTab}
        onSelectTab={(tab) => {
          setIsCustomerSidebarVisible(false);
          if ((tab === 'my_units' || tab === 'support' || tab === 'payments' || tab === 'documents') && (!isLoggedIn || !currentUser)) {
            setShowAuthModal(true);
            return;
          }
          setCustomerNavTab(tab);
          if (tab === 'my_units') {
            setCustomerTab('my_units');
            setCustomerFlowStep('dashboard');
          } else {
            setCustomerTab('my_units');
          }
        }}
        rentedUnitsCount={rentedUnits.length}
      />

      {/* Nội dung theo Tab chính: Kiểm tra nếu chưa đăng nhập thì buộc đăng nhập */}
      {customerTab === 'my_units' && (!isLoggedIn || !currentUser) ? (
        <View style={{ flex: 1, backgroundColor: '#f7f9fd' }}>
          {/* Top Logo Bar */}
          <View
            style={{
              paddingTop: Platform.OS === 'ios' ? 44 : 16,
              paddingBottom: 14,
              paddingHorizontal: 20,
              backgroundColor: '#ffffff',
              borderBottomWidth: 1,
              borderBottomColor: '#e2e8f0',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Image
              source={require('../../assets/logo.png')}
              style={{ height: 48, width: 180 }}
              resizeMode="contain"
            />
          </View>

          {/* Centered Auth Required Card */}
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
            <View
              style={{
                width: 72,
                height: 72,
                borderRadius: 36,
                backgroundColor: '#eff6ff',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 16,
                borderWidth: 2,
                borderColor: '#dbeafe',
              }}
            >
              <MaterialIcons name="lock-outline" size={36} color="#1d4ed8" />
            </View>
            <Text
              style={{
                fontSize: 19,
                fontWeight: '800',
                color: '#131b2e',
                marginBottom: 8,
                textAlign: 'center',
              }}
            >
              {customerNavTab === 'support'
                ? 'Yêu Cầu Đăng Nhập Để Nhận Hỗ Trợ'
                : 'Yêu Cầu Đăng Nhập Để Xem Kho Của Tôi'}
            </Text>
            <Text
              style={{
                fontSize: 13,
                color: '#64748b',
                textAlign: 'center',
                lineHeight: 20,
                marginBottom: 24,
                paddingHorizontal: 16,
              }}
            >
              {customerNavTab === 'support'
                ? 'Vui lòng đăng nhập tài khoản để gửi yêu cầu hỗ trợ kỹ thuật buồng kho và theo dõi tiến độ xử lý 24/7.'
                : 'Vui lòng đăng nhập tài khoản để quản lý buồng kho tự quản, xem mã PIN mở khóa và hợp đồng lưu trữ.'}
            </Text>
            <TouchableOpacity
              onPress={() => setShowAuthModal(true)}
              activeOpacity={0.85}
              style={{
                backgroundColor: '#2563eb',
                paddingVertical: 14,
                paddingHorizontal: 36,
                borderRadius: 14,
                shadowColor: '#2563eb',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.25,
                shadowRadius: 8,
                elevation: 3,
                marginBottom: 12,
              }}
            >
              <Text style={{ color: '#ffffff', fontSize: 15, fontWeight: '800' }}>
                Đăng Nhập Ngay
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setCustomerTab('book')}
              activeOpacity={0.7}
              style={{ paddingVertical: 10, paddingHorizontal: 20 }}
            >
              <Text style={{ color: '#1d4ed8', fontSize: 13, fontWeight: '700' }}>
                ← Quay lại Khám phá buồng kho
              </Text>
            </TouchableOpacity>
          </View>

          {/* Bottom Nav Bar */}
          <CustomerBottomNavBar
            activeTab={customerNavTab === 'support' ? 'support' : 'my-storage'}
            onSelectTab={handleNavigateBottomTab}
          />
        </View>
      ) : customerTab === 'my_units' ? (
        customerNavTab === 'my_units' || customerNavTab === 'access' ? (
          customerFlowStep === 'dashboard' ? (
            /* TRANG A: Bảng điều khiển Ô kho của tôi (Unit Cards Grid & Smart Lock Control) */
            <MyUnitsDashboardScreen
              units={rentedUnits}
              onViewDetail={(unit) => {
                setSelectedRentedUnit(unit);
                setCustomerFlowStep('detail');
              }}
              onOpenGuestPin={(unit) => {
                setSelectedRentedUnit(unit);
                setShowGuestPinModal(true);
              }}
              onOpenRenew={(unit) => {
                setSelectedRentedUnit(unit);
                setShowRenewModal(true);
              }}
              onOpenReportIssue={(unit) => {
                setSelectedRentedUnit(unit);
                setShowReportIssueModal(true);
              }}
              onOpenChangePin={(unit) => {
                setSelectedRentedUnit(unit);
                setShowChangePinModal(true);
              }}
              onRentMoreUnits={() => setCustomerTab('book')}
              onOpenSidebar={() => setIsCustomerSidebarVisible(true)}
              onRefresh={loadCustomerContracts}
              isRefreshing={isCustomerLoading}
              customerName={currentUser?.fullName || CURRENT_CUSTOMER_USER.fullName}
              onOpenLogin={() => setShowAuthModal(true)}
              currentUser={currentUser}
              onNavigateBottomTab={handleNavigateBottomTab}
            />
          ) : selectedRentedUnit ? (
            /* TRANG B: Chi tiết & Quản lý Ô kho */
            <UnitDetailManageScreen
              unit={selectedRentedUnit}
              onBackToDashboard={() => setCustomerFlowStep('dashboard')}
              onOpenGuestPinModal={() => setShowGuestPinModal(true)}
              onOpenRenewModal={() => setShowRenewModal(true)}
              onOpenUpgradeModal={() => setShowUpgradeModal(true)}
              onOpenReportIssueModal={() => setShowReportIssueModal(true)}
              onOpenChangePinModal={() => setShowChangePinModal(true)}
            />
          ) : null
        ) : customerNavTab === 'payments' ? (
          /* TAB 2: Thanh toán & Hóa đơn */
          <CustomerPaymentsScreen
            units={rentedUnits}
            onBackToUnits={() => {
              setCustomerNavTab('my_units');
              setCustomerFlowStep('dashboard');
            }}
            onOpenSidebar={() => setIsCustomerSidebarVisible(true)}
          />
        ) : customerNavTab === 'documents' ? (
          /* TAB 3: Tài liệu & Hợp đồng */
          <CustomerDocumentsScreen
            units={rentedUnits}
            onBackToUnits={() => {
              setCustomerNavTab('my_units');
              setCustomerFlowStep('dashboard');
            }}
            onOpenSidebar={() => setIsCustomerSidebarVisible(true)}
          />
        ) : customerNavTab === 'support' ? (
          /* TAB 4: Hỗ trợ & Trợ giúp */
          <CustomerSupportScreen
            units={rentedUnits}
            onBackToUnits={() => {
              setCustomerNavTab('my_units');
              setCustomerFlowStep('dashboard');
            }}
            onOpenSidebar={() => setIsCustomerSidebarVisible(true)}
            onOpenReportIssue={(u) => {
              setSelectedRentedUnit(u);
              setShowReportIssueModal(true);
            }}
            onOpenLogin={() => setShowAuthModal(true)}
            currentUser={currentUser}
            onNavigateBottomTab={handleNavigateBottomTab}
          />
        ) : (
          /* TAB 5: Hồ sơ & Cài đặt */
          <CustomerProfileScreen
            currentUser={CURRENT_CUSTOMER_USER}
            onBackToUnits={() => {
              setCustomerNavTab('my_units');
              setCustomerFlowStep('dashboard');
            }}
            onOpenSidebar={() => setIsCustomerSidebarVisible(true)}
          />
        )
      ) : customerTab === 'book' ? (
        <BookStorageScreen
          facilities={facilities}
          unitTypes={unitTypes}
          loading={loading}
          refreshing={refreshing}
          onRefresh={loadCustomerData}
          onReservationCreated={() => {
            loadMyReservations();
            if (onRefreshStaffData) {
              onRefreshStaffData();
            }
          }}
          onViewMyReservations={() => setCustomerTab('my_reservations')}
          onOpenLogin={() => setShowAuthModal(true)}
          currentUser={currentUser}
          activeBottomTab="search"
          onNavigateTab={handleNavigateBottomTab}
        />
      ) : loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.centerText}>Đang tải danh sách kho...</Text>
        </View>
      ) : (
        /* MY RESERVATIONS */
        <View style={{ flex: 1, backgroundColor: '#FAF8FF' }}>
          {/* Top Header */}
          <View
            style={{
              height: 56,
              backgroundColor: '#ffffff',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: 16,
              borderBottomWidth: 1,
              borderBottomColor: '#e2e7ff',
            }}
          >
            <TouchableOpacity
              onPress={() => setCustomerTab('my_units')}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
            >
              <Text style={{ fontSize: 18, color: '#2563EB' }}>←</Text>
              <Text style={{ fontSize: 16, fontWeight: '800', color: '#131b2e' }}>
                Đơn Đặt Kho
              </Text>
            </TouchableOpacity>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 0 }}>
              <TouchableOpacity
                onPress={() => setShowAuthModal(true)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                  backgroundColor: '#ffffff',
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: '#c6c6cd',
                  maxWidth: 130,
                  flexShrink: 0,
                }}
              >
                <Text
                  style={{ fontSize: 11, fontWeight: '600', color: '#131b2e', maxWidth: 85 }}
                  numberOfLines={1}
                >
                  {currentUser?.fullName
                    ? currentUser.fullName.split(' ').slice(-1)[0]
                    : 'Đăng nhập'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView
            style={styles.contentScroll}
            contentContainerStyle={styles.scrollPadding}
            refreshControl={
              <RefreshControl refreshing={loadingReservations} onRefresh={loadMyReservations} />
            }
          >
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Lịch Sử Đặt Kho Của Bạn</Text>
              <Text style={styles.sectionSubtitle}>
                Quản lý các phòng kho đã giữ chỗ và trạng thái bàn giao.
              </Text>

              {myReservations.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyIcon}>📦</Text>
                  <Text style={styles.emptyHeadline}>Bạn chưa có đơn đặt kho nào</Text>
                  <TouchableOpacity style={styles.nextBtn} onPress={() => setCustomerTab('book')}>
                    <Text style={styles.nextBtnText}>+ Đặt Ngăn Kho Mới</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                myReservations.map((r) => (
                  <View key={r.id} style={styles.historyCard}>
                    <View style={styles.historyTopRow}>
                      <Text style={styles.historyCode}>
                        Đơn #{String(r.id).slice(-6).toUpperCase()}
                      </Text>
                      <View style={styles.historyBadge}>
                        <Text style={styles.historyBadgeText}>{r.status}</Text>
                      </View>
                    </View>
                    <Text style={styles.historyDetail}>
                      📅 Ngày hẹn: {new Date(r.appointmentDate).toLocaleDateString('vi-VN')}
                    </Text>
                    <Text style={styles.historyDetail}>⏱️ Thời hạn thuê: {r.rentalPeriod} tháng</Text>
                  </View>
                ))
              )}
            </View>
          </ScrollView>

          <CustomerBottomNavBar
            activeTab="my-storage"
            onSelectTab={(tab) => {
              if (tab === 'search') {
                setCustomerTab('book');
              } else if (tab === 'my-storage') {
                setCustomerTab('my_units');
                setCustomerNavTab('my_units');
                setCustomerFlowStep('dashboard');
              } else if (tab === 'support') {
                setCustomerTab('my_units');
                setCustomerNavTab('support');
              }
            }}
          />
        </View>
      )}

      {/* ================= CÁC MODAL NGHIỆP VỤ LUỒNG 3 ================= */}
      {selectedRentedUnit && (
        <>
          {/* Modal 1: Tạo Mã Khách Tạm Thời */}
          <CreateGuestPinModal
            visible={showGuestPinModal}
            onClose={() => setShowGuestPinModal(false)}
            unit={selectedRentedUnit}
            onCreated={handleGuestPinCreated}
          />

          {/* Modal 2: Gia Hạn Hợp Đồng */}
          <RenewContractModal
            visible={showRenewModal}
            onClose={() => setShowRenewModal(false)}
            unit={selectedRentedUnit}
            onRenewSuccess={handleRenewSuccess}
          />

          {/* Modal 3: Nâng Cấp / Hạ Cấp Ô Kho */}
          <UpgradeUnitModal
            visible={showUpgradeModal}
            onClose={() => setShowUpgradeModal(false)}
            unit={selectedRentedUnit}
            onRequestSubmitted={(targetTypeName) => {
              setShowUpgradeModal(false);
              if (Platform.OS === 'web') {
                window.alert(
                  `Yêu cầu đổi sang kho "${targetTypeName}" đã được ghi nhận. CSKH sẽ liên hệ với bạn trong 30 phút.`
                );
              }
            }}
          />

          {/* Modal 4: Báo Cáo Sự Cố */}
          <ReportIssueModal
            visible={showReportIssueModal}
            onClose={() => setShowReportIssueModal(false)}
            unit={selectedRentedUnit}
            onTicketCreated={handleTicketCreated}
          />

          {/* Modal 5: Đổi Mã PIN Smart Lock */}
          <ChangePinModal
            visible={showChangePinModal}
            onClose={() => setShowChangePinModal(false)}
            unit={selectedRentedUnit}
            onPinChanged={handlePinChanged}
          />
        </>
      )}

      {/* MODAL AUTH */}
      <Modal visible={showAuthModal} transparent={false} animationType="slide">
        <LoginScreen
          onClose={() => setShowAuthModal(false)}
          onLoginSuccess={(user) => {
            handleLoginSuccess(user, (role) => {
              setAppMode(role);
            });
          }}
        />
      </Modal>
    </View>
  );
}
