import React, { useState, useEffect, useRef } from 'react';
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
  Alert,
  Animated,
  StatusBar,
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
import AiAssistantModal from '../components/customer/AiAssistantModal';
import DraggableAiFab from '../components/customer/DraggableAiFab';
import NotificationsModal from '../components/common/NotificationsModal';
import { useNotifications } from '../hooks/useNotifications';
import { AiSuggestedUnit } from '../api';
import {
  CustomerPaymentsScreen,
  CustomerDocumentsScreen,
  CustomerProfileScreen,
} from '../screens/customer/CustomerPortalSubScreens';
import CustomerSupportScreen from '../screens/customer/CustomerSupportScreen';
import CustomerAccountScreen from '../screens/customer/CustomerAccountScreen';
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
    handleLogout,
    setCurrentUser,
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

  // Trợ lý AI Assistant Modal
  const [showAiModal, setShowAiModal] = useState<boolean>(false);
  const [aiInitialPrompt, setAiInitialPrompt] = useState<string>('');
  const [aiUnitToBook, setAiUnitToBook] = useState<any>(null);

  // Trung tâm thông báo & Toast lý do đăng nhập
  const [showNotifModal, setShowNotifModal] = useState<boolean>(false);
  const [authModalToast, setAuthModalToast] = useState<string | null>(null);
  const customerNotifState = useNotifications('customer');

  const handleOpenAuthModal = (reason?: any) => {
    setAuthModalToast(typeof reason === 'string' ? reason : null);
    setShowAuthModal(true);
  };

  // Toast thông báo thao tác thành công (In-app Action Toast 3s)
  const [actionToast, setActionToast] = useState<{ message: string; type?: 'success' | 'info' } | null>(null);
  const actionToastOpacity = useRef(new Animated.Value(0)).current;
  const actionToastTranslateY = useRef(new Animated.Value(-16)).current;
  const actionToastTimerRef = useRef<any>(null);

  const showActionToast = (message: string, type: 'success' | 'info' = 'success') => {
    if (actionToastTimerRef.current) clearTimeout(actionToastTimerRef.current);
    setActionToast({ message, type });
    actionToastOpacity.setValue(0);
    actionToastTranslateY.setValue(-16);

    Animated.parallel([
      Animated.timing(actionToastOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
      Animated.timing(actionToastTranslateY, { toValue: 0, duration: 250, useNativeDriver: true }),
    ]).start();

    actionToastTimerRef.current = setTimeout(() => {
      Animated.parallel([
        Animated.timing(actionToastOpacity, { toValue: 0, duration: 250, useNativeDriver: true }),
        Animated.timing(actionToastTranslateY, { toValue: -16, duration: 250, useNativeDriver: true }),
      ]).start(() => setActionToast(null));
    }, 3000);
  };

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
    customerNotifState.loadNotifications();
  }, [loadCustomerData, loadCustomerContracts, currentUser]);

  // Điều hướng thanh dưới đáy & kiểm tra bắt buộc đăng nhập
  const handleNavigateBottomTab = (tab: CustomerTabType) => {
    if (tab === 'search' || tab === 'book-new') {
      setCustomerTab('book');
      return;
    }
    // Bắt buộc đăng nhập khi nhấn qua Kho của tôi, Hỗ trợ hoặc Tài khoản
    if (tab === 'my-storage' && (!isLoggedIn || !currentUser)) {
      handleOpenAuthModal('Vui lòng đăng nhập để xem buồng kho & mã PIN của bạn');
      return;
    }
    if (tab === 'support' && (!isLoggedIn || !currentUser)) {
      handleOpenAuthModal('Vui lòng đăng nhập để gửi yêu cầu hỗ trợ kỹ thuật');
      return;
    }
    if (tab === 'account' && (!isLoggedIn || !currentUser)) {
      handleOpenAuthModal();
      return;
    }
    if (tab === 'my-storage') {
      setCustomerTab('my_units');
      setCustomerNavTab('my_units');
      setCustomerFlowStep('dashboard');
    } else if (tab === 'support') {
      setCustomerTab('my_units');
      setCustomerNavTab('support');
    } else if (tab === 'account') {
      setCustomerTab('my_units');
      setCustomerNavTab('profile');
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
          if ((tab === 'my_units' || tab === 'payments' || tab === 'documents') && (!isLoggedIn || !currentUser)) {
            handleOpenAuthModal('Vui lòng đăng nhập để xem buồng kho & mã PIN của bạn');
            return;
          }
          if (tab === 'support' && (!isLoggedIn || !currentUser)) {
            handleOpenAuthModal('Vui lòng đăng nhập để gửi yêu cầu hỗ trợ kỹ thuật');
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
        onOpenAiAssistant={() => {
          setAiInitialPrompt('');
          setShowAiModal(true);
        }}
        onOpenNotifications={() => {
          if (!isLoggedIn || !currentUser) {
            setAuthModalToast('Vui lòng đăng nhập để xem thông báo');
            setShowAuthModal(true);
            return;
          }
          setShowNotifModal(true);
        }}
        unreadNotifCount={customerNotifState.unreadCount}
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
              style={{ height: 28, width: 95 }}
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
            activeTab={
              customerNavTab === 'support'
                ? 'support'
                : customerNavTab === 'profile'
                ? 'account'
                : 'my-storage'
            }
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
              onOpenLogin={handleOpenAuthModal}
              onLogout={handleLogout}
              currentUser={currentUser}
              onNavigateBottomTab={handleNavigateBottomTab}
              onOpenNotifications={() => {
          if (!isLoggedIn || !currentUser) {
            setAuthModalToast('Vui lòng đăng nhập để xem thông báo');
            setShowAuthModal(true);
            return;
          }
          setShowNotifModal(true);
        }}
              unreadNotifCount={customerNotifState.unreadCount}
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
            onOpenLogin={handleOpenAuthModal}
            onLogout={handleLogout}
            currentUser={currentUser}
            onNavigateBottomTab={handleNavigateBottomTab}
            onOpenAiAssistant={() => {
              setAiInitialPrompt('');
              setShowAiModal(true);
            }}
          />
        ) : (
          /* TAB 5: Quản lý tài khoản & Đổi thông tin */
          <CustomerAccountScreen
            currentUser={currentUser || CURRENT_CUSTOMER_USER}
            onUpdateUser={(updated) => {
              setCurrentUser(updated);
            }}
            onLogout={() => {
              handleLogout();
              setCustomerTab('book');
            }}
            onOpenSidebar={() => setIsCustomerSidebarVisible(true)}
            onNavigateBottomTab={handleNavigateBottomTab}
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
          onViewMyReservations={() => {
            setCustomerTab('my_units');
            setCustomerNavTab('my_units');
            setCustomerFlowStep('dashboard');
            loadCustomerContracts();
          }}
          onOpenLogin={handleOpenAuthModal}
          onLogout={handleLogout}
          currentUser={currentUser}
          activeBottomTab="search"
          onNavigateTab={handleNavigateBottomTab}
          initialSelectedUnit={aiUnitToBook}
          onClearInitialSelectedUnit={() => setAiUnitToBook(null)}
          onOpenNotifications={() => {
          if (!isLoggedIn || !currentUser) {
            setAuthModalToast('Vui lòng đăng nhập để xem thông báo');
            setShowAuthModal(true);
            return;
          }
          setShowNotifModal(true);
        }}
          unreadNotifCount={customerNotifState.unreadCount}
          onOpenAiAssistant={(prompt) => {
            setAiInitialPrompt(prompt || '');
            setShowAiModal(true);
          }}
        />
      ) : loading ? (
        <View style={{ flex: 1, backgroundColor: '#ffffff', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
          <Image
            source={require('../../assets/logo.png')}
            style={{ width: 260, height: 76 }}
            resizeMode="contain"
          />
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
                onPress={() => {
                  if (currentUser) {
                    if (Platform.OS === 'web') {
                      if (window.confirm('Bạn có chắc chắn muốn đăng xuất khỏi tài khoản không?')) {
                        handleLogout();
                      }
                    } else {
                      Alert.alert(
                        'Đăng xuất',
                        `Bạn có chắc chắn muốn đăng xuất khỏi tài khoản ${currentUser.fullName || currentUser.email || ''}?`,
                        [
                          { text: 'Hủy', style: 'cancel' },
                          { text: 'Đăng xuất', style: 'destructive', onPress: handleLogout },
                        ]
                      );
                    }
                  } else {
                    setShowAuthModal(true);
                  }
                }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                  backgroundColor: currentUser ? '#fef2f2' : '#ffffff',
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: currentUser ? '#fecaca' : '#c6c6cd',
                  maxWidth: 130,
                  flexShrink: 0,
                }}
              >
                <MaterialIcons
                  name={currentUser ? 'logout' : 'login'}
                  size={14}
                  color={currentUser ? '#dc2626' : '#131b2e'}
                />
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: '700',
                    color: currentUser ? '#dc2626' : '#131b2e',
                  }}
                  numberOfLines={1}
                >
                  {currentUser ? 'Đăng xuất' : 'Đăng nhập'}
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
            onSelectTab={handleNavigateBottomTab}
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
          toastMessage={authModalToast}
          onClose={() => {
            setShowAuthModal(false);
            setAuthModalToast(null);
          }}
          onLoginSuccess={(user, token) => {
            handleLoginSuccess(
              user,
              (role) => {
                setAppMode(role);
              },
              token
            );
            setShowAuthModal(false);
            setAuthModalToast(null);
            if (aiUnitToBook) {
              setCustomerTab('book');
            }
          }}
        />
      </Modal>

      {/* ─── NÚT TRỢ LÝ AI ASSISTANT CÓ THỂ KÉO THẢ DI CHUYỂN (DRAGGABLE FAB) ─── */}
      <DraggableAiFab
        onPress={() => {
          setAiInitialPrompt('');
          setShowAiModal(true);
        }}
      />

      {/* ─── MODAL TRỢ LÝ AI (3 KỸ NĂNG & ML MODELS) ─── */}
      <AiAssistantModal
        visible={showAiModal}
        onClose={() => setShowAiModal(false)}
        initialPrompt={aiInitialPrompt}
        onSelectUnitToBook={(unit: AiSuggestedUnit) => {
          setShowAiModal(false);
          setAiUnitToBook(unit);
          if (!isLoggedIn || !currentUser) {
            handleOpenAuthModal('Vui lòng đăng nhập để tiếp tục với buồng kho AI gợi ý');
            return;
          }
          setCustomerTab('book');
        }}
      />

      {/* ─── MODAL TRUNG TÂM THÔNG BÁO KHÁCH HÀNG ─── */}
      <NotificationsModal
        visible={showNotifModal}
        onClose={() => setShowNotifModal(false)}
        notifications={customerNotifState.notifications}
        unreadCount={customerNotifState.unreadCount}
        isLoading={customerNotifState.loading}
        isRefreshing={customerNotifState.refreshing}
        onRefresh={() => customerNotifState.loadNotifications(true)}
        onMarkAsRead={customerNotifState.markAsRead}
        onMarkAllAsRead={customerNotifState.markAllAsRead}
        onDeleteNotification={customerNotifState.deleteNotification}
        role="customer"
      />

      {/* ─── TOAST THÔNG BÁO THAO TÁC THÀNH CÔNG (IN-APP ACTION TOAST 3S) ─── */}
      {actionToast && (
        <Animated.View
          style={{
            position: 'absolute',
            top: Platform.OS === 'ios' ? 52 : (StatusBar.currentHeight ? StatusBar.currentHeight + 12 : 36),
            left: 20,
            right: 20,
            zIndex: 999999,
            elevation: 999999,
            opacity: actionToastOpacity,
            transform: [{ translateY: actionToastTranslateY }],
          }}
          pointerEvents="none"
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: actionToast.type === 'success' ? '#15803d' : '#1d4ed8',
              borderRadius: 14,
              paddingVertical: 11,
              paddingHorizontal: 14,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.25,
              shadowRadius: 8,
              elevation: 10,
              borderWidth: 1,
              borderColor: actionToast.type === 'success' ? '#86efac' : '#93c5fd',
            }}
          >
            <View
              style={{
                width: 24,
                height: 24,
                borderRadius: 12,
                backgroundColor: 'rgba(255, 255, 255, 0.25)',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 10,
              }}
            >
              <MaterialIcons
                name={actionToast.type === 'success' ? 'check-circle' : 'info'}
                size={16}
                color="#ffffff"
              />
            </View>
            <Text
              style={{
                fontSize: 13,
                fontWeight: '700',
                color: '#ffffff',
                flex: 1,
                lineHeight: 18,
              }}
              numberOfLines={2}
            >
              {actionToast.message}
            </Text>
          </View>
        </Animated.View>
      )}
    </View>
  );
}
