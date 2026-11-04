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
  TextInput,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { formatVND } from '../utils/formatters';
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
import NotificationDetailScreen from '../screens/common/NotificationDetailScreen';
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
  const insets = useSafeAreaInsets();
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

  // Kích hoạt Modal chọn chi nhánh khi bấm Thuê kho
  const [triggerOpenBranchPicker, setTriggerOpenBranchPicker] = useState<number>(0);

  // Trung tâm thông báo & Toast lý do đăng nhập
  const [showNotifModal, setShowNotifModal] = useState<boolean>(false);
  const [selectedNotificationId, setSelectedNotificationId] = useState<string | null>(null);
  const [selectedCustomerNotification, setSelectedCustomerNotification] = useState<any | null>(null);
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

  // Bo loc danh muc & tim kiem don dat giu cho (Dong bo 100% voi Web)
  const [reservationFilter, setReservationFilter] = useState<'ACTIVE' | 'COMPLETED' | 'CANCELLED' | 'ALL'>('ACTIVE');
  const [reservationSearchQuery, setReservationSearchQuery] = useState('');

  const filterCounts = React.useMemo(() => {
    const counts = {
      ACTIVE: 0,
      COMPLETED: 0,
      CANCELLED: 0,
      ALL: myReservations?.length || 0,
    };
    (myReservations || []).forEach((r: any) => {
      if (r.status === 'COMPLETED') {
        counts.COMPLETED++;
      } else if (r.status === 'CANCELLED' || r.status === 'EXPIRED') {
        counts.CANCELLED++;
      } else {
        counts.ACTIVE++;
      }
    });
    return counts;
  }, [myReservations]);

  const filteredReservations = React.useMemo(() => {
    if (!myReservations) return [];
    let list = myReservations;

    if (reservationFilter === 'ACTIVE') {
      list = list.filter((r: any) => r.status !== 'COMPLETED' && r.status !== 'CANCELLED' && r.status !== 'EXPIRED');
    } else if (reservationFilter === 'COMPLETED') {
      list = list.filter((r: any) => r.status === 'COMPLETED');
    } else if (reservationFilter === 'CANCELLED') {
      list = list.filter((r: any) => r.status === 'CANCELLED' || r.status === 'EXPIRED');
    }

    const query = reservationSearchQuery.trim().toLowerCase();
    if (query) {
      list = list.filter((r: any) => {
        const code = (r.reservationCode || String(r.id)).toLowerCase();
        const facilityName = (r.facility?.name || '').toLowerCase();
        const facilityAddress = (r.facility?.address || '').toLowerCase();
        const item = r.items?.[0];
        const unitName = (item?.unitType?.name || '').toLowerCase();
        const unitNumber = (item?.unit?.unitNumber || '').toLowerCase();
        const status = (r.status || '').toLowerCase();

        return (
          code.includes(query) ||
          facilityName.includes(query) ||
          facilityAddress.includes(query) ||
          unitName.includes(query) ||
          unitNumber.includes(query) ||
          status.includes(query)
        );
      });
    }

    return list;
  }, [myReservations, reservationFilter, reservationSearchQuery]);

  useEffect(() => {
    loadCustomerData();
    loadCustomerContracts();
    loadMyReservations();
    customerNotifState.loadNotifications();
  }, [loadCustomerData, loadCustomerContracts, currentUser]);

  // Điều hướng thanh dưới đáy & kiểm tra bắt buộc đăng nhập
  const handleNavigateBottomTab = (tab: CustomerTabType) => {
    if (tab === 'search') {
      setCustomerTab('book');
      return;
    }
    if (tab === 'book-new') {
      setCustomerTab('book');
      setTriggerOpenBranchPicker(Date.now());
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

  const handleSelectCustomerNotification = (notif: any) => {
    setShowNotifModal(false);
    setSelectedCustomerNotification(notif);
    setSelectedNotificationId(notif.id);
  };
  return (
    <View style={{ flex: 1 }}>
      

      {/* Nội dung theo Tab chính: Kiểm tra nếu chưa đăng nhập thì buộc đăng nhập */}
      {selectedNotificationId ? (
        <NotificationDetailScreen
          notificationId={selectedNotificationId}
          initialData={selectedCustomerNotification}
          onBack={() => {
            setSelectedNotificationId(null);
            setSelectedCustomerNotification(null);
            setSelectedCustomerNotification(null);
          }}
          onNavigateRelated={(target) => {
            setSelectedNotificationId(null);
            if (target.subTab === 'payments') {
              setCustomerTab('my_units');
              setCustomerNavTab('payments');
            } else if (target.subTab === 'support') {
              setCustomerTab('my_units');
              setCustomerNavTab('support');
            } else if (target.subTab === 'documents') {
              setCustomerTab('my_units');
              setCustomerNavTab('documents');
            } else if (target.subTab === 'access') {
              setCustomerTab('my_units');
              setCustomerNavTab('access');
            } else {
              setCustomerTab('my_units');
              setCustomerNavTab('my_units');
            }
          }}
          role="customer"
        />
      ) : customerTab === 'my_units' && (!isLoggedIn || !currentUser) ? (
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
              
              onRefresh={loadCustomerContracts}
              isRefreshing={isCustomerLoading}
              customerName={currentUser?.fullName || 'Khách hàng'}
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
            
          />
        ) : customerNavTab === 'documents' ? (
          /* TAB 3: Tài liệu & Hợp đồng */
          <CustomerDocumentsScreen
            units={rentedUnits}
            onBackToUnits={() => {
              setCustomerNavTab('my_units');
              setCustomerFlowStep('dashboard');
            }}
            
          />
        ) : customerNavTab === 'support' ? (
          /* TAB 4: Hỗ trợ & Trợ giúp */
          <CustomerSupportScreen
            units={rentedUnits}
            facilities={facilities}
            onBackToUnits={() => {
              setCustomerNavTab('my_units');
              setCustomerFlowStep('dashboard');
            }}
            
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
            currentUser={currentUser}
            rentedUnits={rentedUnits}
            myReservations={myReservations}
            onUpdateUser={(updated) => {
              setCurrentUser(updated);
            }}
            onLogout={async () => {
              await handleLogout();
              setCustomerTab('book');
              setCustomerNavTab('my_units');
              setCustomerFlowStep('dashboard');
              showActionToast('Đã đăng xuất tài khoản thành công', 'info');
            }}
            onNavigateBottomTab={handleNavigateBottomTab}
            onNavigateSubTab={(subTab) => {
              setCustomerTab('my_units');
              setCustomerNavTab(subTab);
            }}
            onOpenNotifications={() => setShowNotifModal(true)}
            onViewAllReservations={() => setCustomerTab('my_reservations')}
            onRefreshReservations={loadMyReservations}
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
    loadMyReservations();
          }}
          onOpenLogin={handleOpenAuthModal}
          onLogout={handleLogout}
          currentUser={currentUser}
          activeBottomTab="search"
          triggerOpenBranchPicker={triggerOpenBranchPicker}
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
        <View style={{ flex: 1, backgroundColor: '#f8fafc' }}>
          {/* Top Header with Safe Area Insets */}
          <View
            style={{
              paddingTop: insets.top > 0 ? insets.top + 6 : 14,
              paddingBottom: 12,
              paddingHorizontal: 16,
              backgroundColor: '#ffffff',
              borderBottomWidth: 1,
              borderBottomColor: '#e2e8f0',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <TouchableOpacity
              onPress={() => {
                setCustomerTab('my_units');
                setCustomerNavTab('profile');
              }}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}
              activeOpacity={0.7}
            >
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: '#f1f5f9',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <MaterialIcons name="arrow-back" size={20} color="#0f172a" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 17, fontWeight: '800', color: '#0f172a' }}>
                  Đơn Đặt Kho Của Bạn
                </Text>
                <Text style={{ fontSize: 11.5, color: '#64748b', marginTop: 1 }}>
                  {filterCounts.ACTIVE} đơn chờ nhận kho · {myReservations.length} đơn tổng cộng
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Search Bar */}
          <View
            style={{
              paddingHorizontal: 16,
              paddingVertical: 10,
              backgroundColor: '#ffffff',
              borderBottomWidth: 1,
              borderBottomColor: '#f1f5f9',
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: '#f8fafc',
                borderRadius: 12,
                borderWidth: 1,
                borderColor: '#e2e8f0',
                paddingHorizontal: 12,
                height: 40,
              }}
            >
              <MaterialIcons name="search" size={20} color="#64748b" style={{ marginRight: 8 }} />
              <TextInput
                value={reservationSearchQuery}
                onChangeText={setReservationSearchQuery}
                placeholder="Tìm mã đơn, ô kho, cơ sở..."
                placeholderTextColor="#94a3b8"
                style={{
                  flex: 1,
                  fontSize: 13,
                  color: '#0f172a',
                  paddingVertical: 0,
                }}
                returnKeyType="search"
                clearButtonMode="while-editing"
              />
              {reservationSearchQuery.trim().length > 0 && (
                <TouchableOpacity
                  onPress={() => setReservationSearchQuery('')}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <MaterialIcons name="cancel" size={18} color="#94a3b8" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Filter Chips Horizontal Bar */}
          <View style={{ backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' }}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 10, gap: 8 }}
            >
              {[
                { key: 'ACTIVE', label: 'Chờ nhận kho', count: filterCounts.ACTIVE },
                { key: 'COMPLETED', label: 'Đã nhận kho', count: filterCounts.COMPLETED },
                { key: 'CANCELLED', label: 'Đã hủy / Quá hạn', count: filterCounts.CANCELLED },
                { key: 'ALL', label: 'Tất cả', count: filterCounts.ALL },
              ].map((tab) => {
                const isActive = reservationFilter === tab.key;
                return (
                  <TouchableOpacity
                    key={tab.key}
                    onPress={() => setReservationFilter(tab.key as any)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                      paddingHorizontal: 12,
                      paddingVertical: 7,
                      borderRadius: 20,
                      backgroundColor: isActive ? '#2563eb' : '#f1f5f9',
                      borderWidth: 1,
                      borderColor: isActive ? '#2563eb' : '#e2e8f0',
                    }}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={{
                        fontSize: 12.5,
                        fontWeight: isActive ? '800' : '600',
                        color: isActive ? '#ffffff' : '#475569',
                      }}
                    >
                      {tab.label}
                    </Text>
                    <View
                      style={{
                        paddingHorizontal: 6,
                        paddingVertical: 1,
                        borderRadius: 10,
                        backgroundColor: isActive ? 'rgba(255,255,255,0.25)' : '#e2e8f0',
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 10.5,
                          fontWeight: '800',
                          color: isActive ? '#ffffff' : '#64748b',
                        }}
                      >
                        {tab.count}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
          <ScrollView
            style={styles.contentScroll}
            contentContainerStyle={[styles.scrollPadding, { paddingBottom: 120 }]}
            refreshControl={
              <RefreshControl refreshing={loadingReservations} onRefresh={loadMyReservations} />
            }
          >
            <View style={styles.section}>
              {filteredReservations.length === 0 ? (
                <View
                  style={{
                    backgroundColor: '#ffffff',
                    borderRadius: 20,
                    padding: 32,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderWidth: 1,
                    borderColor: '#e2e8f0',
                    marginTop: 12,
                  }}
                >
                  <View
                    style={{
                      width: 64,
                      height: 64,
                      borderRadius: 32,
                      backgroundColor: '#f1f5f9',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: 12,
                    }}
                  >
                    <MaterialIcons name="inventory-2" size={32} color="#94a3b8" />
                  </View>
                  <Text style={{ fontSize: 15, fontWeight: '800', color: '#1e293b', marginBottom: 4 }}>
                    {reservationSearchQuery.trim() ? 'Không tìm thấy kết quả' : 'Không có đơn đặt kho nào'}
                  </Text>
                  <Text style={{ fontSize: 12.5, color: '#64748b', textAlign: 'center', marginBottom: 16 }}>
                    {reservationSearchQuery.trim()
                      ? `Không có đơn nào khớp với từ khóa "${reservationSearchQuery.trim()}".`
                      : reservationFilter === 'ALL'
                      ? 'Bạn chưa có đơn đặt giữ chỗ kho nào trong hệ thống.'
                      : 'Không tìm thấy đơn nào trong danh mục đã chọn.'}
                  </Text>
                  {reservationSearchQuery.trim() ? (
                    <TouchableOpacity
                      style={{
                        backgroundColor: '#f1f5f9',
                        paddingHorizontal: 16,
                        paddingVertical: 9,
                        borderRadius: 10,
                        borderWidth: 1,
                        borderColor: '#cbd5e1',
                      }}
                      onPress={() => setReservationSearchQuery('')}
                      activeOpacity={0.8}
                    >
                      <Text style={{ color: '#334155', fontSize: 13, fontWeight: '700' }}>
                        Xóa từ khóa tìm kiếm
                      </Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={{
                        backgroundColor: '#2563eb',
                        paddingHorizontal: 20,
                        paddingVertical: 10,
                        borderRadius: 12,
                      }}
                      onPress={() => setCustomerTab('book')}
                      activeOpacity={0.8}
                    >
                      <Text style={{ color: '#ffffff', fontSize: 13, fontWeight: '700' }}>
                        + Đặt Ngăn Kho Mới
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              ) : (
                filteredReservations.map((r: any) => {
                  let statusLabel = 'Chờ nhận kho';
                  let statusColor = '#d97706';
                  let statusBg = '#fef3c7';

                  if (r.status === 'CONFIRMED') {
                    statusLabel = 'Đã duyệt';
                    statusColor = '#16a34a';
                    statusBg = '#dcfce7';
                  } else if (r.status === 'COMPLETED') {
                    statusLabel = 'Đã nhận kho';
                    statusColor = '#2563eb';
                    statusBg = '#eff6ff';
                  } else if (r.status === 'CANCELLED') {
                    statusLabel = 'Đã hủy';
                    statusColor = '#dc2626';
                    statusBg = '#fee2e2';
                  } else if (r.status === 'EXPIRED') {
                    statusLabel = 'Quá hạn';
                    statusColor = '#64748b';
                    statusBg = '#f1f5f9';
                  }

                  const item = r.items?.[0];
                  const unitName = item?.unitType?.name || 'Kho Tự Quản Mini';
                  const unitNumber = item?.unit?.unitNumber ? ' · Ô ' + item.unit.unitNumber : '';
                  const depositAmount = item?.depositAmount !== undefined ? item.depositAmount : item?.unitType?.depositAmount;

                  return (
                    <View
                      key={r.id}
                      style={{
                        backgroundColor: '#ffffff',
                        borderRadius: 16,
                        padding: 14,
                        borderWidth: 1,
                        borderColor: '#e2e8f0',
                        marginBottom: 10,
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 1 },
                        shadowOpacity: 0.03,
                        shadowRadius: 3,
                        elevation: 1,
                      }}
                    >
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <View style={{ flex: 1, marginRight: 8 }}>
                          <Text style={{ fontSize: 14, fontWeight: '800', color: '#0f172a' }}>
                            Đơn #{r.reservationCode || String(r.id).slice(-8).toUpperCase()}
                          </Text>
                          <Text style={{ fontSize: 13, fontWeight: '700', color: '#2563eb', marginTop: 2 }}>
                            {unitName}{unitNumber}
                          </Text>
                        </View>
                        <View
                          style={{
                            paddingHorizontal: 8,
                            paddingVertical: 3,
                            borderRadius: 6,
                            backgroundColor: statusBg,
                          }}
                        >
                          <Text style={{ fontSize: 10.5, fontWeight: '800', color: statusColor }}>
                            {statusLabel}
                          </Text>
                        </View>
                      </View>

                      {r.facility?.name && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 }}>
                          <MaterialIcons name="storefront" size={14} color="#64748b" />
                          <Text style={{ fontSize: 12, color: '#475569', flex: 1 }} numberOfLines={1}>
                            {r.facility.name}
                          </Text>
                        </View>
                      )}

                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 5 }}>
                        <MaterialIcons name="event" size={14} color="#64748b" />
                        <Text style={{ fontSize: 12, color: '#475569' }}>
                          Ngày hẹn nhận: {new Date(r.appointmentDate || r.createdAt).toLocaleDateString('vi-VN')}
                        </Text>
                      </View>

                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 5 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <MaterialIcons name="schedule" size={14} color="#64748b" />
                          <Text style={{ fontSize: 12, color: '#475569' }}>
                            Thời hạn thuê: {r.rentalPeriod || 1} tháng
                          </Text>
                        </View>
                        {depositAmount !== undefined && Number(depositAmount) > 0 && (
                          <Text style={{ fontSize: 12, fontWeight: '700', color: '#16a34a' }}>
                            Cọc: {formatVND(Number(depositAmount))}
                          </Text>
                        )}
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          </ScrollView>

          <CustomerBottomNavBar
            activeTab="account"
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
        onSelectNotification={handleSelectCustomerNotification}
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
