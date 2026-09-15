# Self-Storage Mobile App
**Hệ thống Quản lý và Cho thuê Kho Lưu trữ Tự phục vụ (Mobile Application)**

---

## 1. Tổng quan dự án

**Self-Storage Mobile App** là ứng dụng di động thông minh thuộc hệ thống dịch vụ cho thuê kho lưu trữ tự phục vụ (*Self-Storage Facility Rental and Management System*). Ứng dụng cung cấp giải pháp toàn diện cho cả **Khách thuê kho (Storage Customer)** tự do tra cứu, đặt chỗ, thanh toán, quản lý và mở khóa kho thông minh; đồng thời hỗ trợ **Nhân viên cơ sở (Facility Staff)** thực hiện quy trình check-in bàn giao, kiểm tra hiện trạng và xử lý sự cố tại chỗ nhanh chóng bằng thiết bị di động.

Ứng dụng được thiết kế theo phong cách hiện đại, tối ưu hóa giao diện đa nền tảng (iOS/Android bao gồm tai thỏ và Dynamic Island), hỗ trợ tương tác mượt mà và bảo mật cao.

### Các phân hệ và tính năng chính:

#### Dành cho Khách thuê kho (Storage Customer)
* **Xác thực người dùng:** Đăng ký, đăng nhập tài khoản, xác thực OTP và bảo mật sinh trắc học / mã PIN.
* **Tra cứu & Đặt chỗ kho (Reservation Flow):**
  * Xem danh sách các cơ sở kho (*Facilities*), vị trí, loại kho (*Unit Types*), kích thước (*Sizes*), bảng giá và tình trạng kho trống theo thời gian thực.
  * Đặt kho linh hoạt: chọn cơ sở, loại kho, ngày bắt đầu thuê và thời hạn thuê.
* **Thanh toán trực tuyến:** Thanh toán tiền cọc (*Deposit*), tiền thuê (*Rental Fee*), phí gia hạn hoặc các phụ phí phát sinh qua cổng thanh toán tích hợp.
* **Check-in & Nhận kho (Check-in Flow):** Tạo mã QR check-in tại cơ sở, nhận mã PIN/mã truy cập khóa số thông minh (*Smart Lock / Access Code*).
* **Quản lý kho đang thuê (Rented Storage Management):**
  * Quản lý thông tin chi tiết một hoặc nhiều kho đang thuê.
  * Theo dõi hạn hợp đồng, lịch sử ra vào và ghi chú danh mục hàng hóa lưu trữ.
* **Gia hạn & Xử lý quá hạn (Renewal & Overdue):** Nhắc hạn chủ động, gia hạn hợp đồng 1 chạm, theo dõi cảnh báo quá hạn.
* **Hỗ trợ & Báo cáo sự cố (Support Request Flow):** Gửi yêu cầu hỗ trợ kèm hình ảnh/mô tả khi gặp sự cố về ổ khóa, mã truy cập, hư hỏng hoặc thanh toán.

#### Dành cho Nhân viên cơ sở (Facility Staff)
* **Kiểm tra Check-in & Bàn giao (Handover):** Quét mã QR / tra cứu lịch hẹn nhận kho của khách hàng khi đến cơ sở; hỗ trợ bàn giao thẻ từ, khóa hoặc kích hoạt mã truy cập.
* **Cập nhật trạng thái kho:** Cập nhật tình trạng kho tức thời (Đã bàn giao, Đang sử dụng, Đã trả kho, Cần vệ sinh/Bảo trì).
* **Kiểm tra & Nghiệm thu khi trả kho (Return Flow):** Kiểm tra hiện trạng cơ sở vật chất của kho khi khách hoàn trả, xác nhận biên bản bàn giao.
* **Xử lý sự cố tại chỗ:** Tiếp nhận và xử lý nhanh các ticket sự cố (mất chìa, lỗi mã vào cửa, hư hỏng ngăn kho).
* **Quản lý danh sách công việc hàng ngày:** Theo dõi danh sách khách hàng cần đón tiếp nhận kho, trả kho và hỗ trợ trong ngày.

---

## 2. Công nghệ và thư viện sử dụng

### Công nghệ cốt lõi
* **React Native & Expo (SDK 52+):** Nền tảng xây dựng ứng dụng di động đa nền tảng (iOS & Android) tối ưu hiệu năng và phát triển nhanh chóng.
* **TypeScript:** Đảm bảo tính chặt chẽ về kiểu dữ liệu (*Type-Safe*), hạn chế lỗi runtime và tối ưu hóa trải nghiệm code.

### Thư viện UI & Styling
* **NativeWind (v4):** Tích hợp Tailwind CSS cho React Native, giúp xây dựng giao diện đồng nhất, nhanh chóng với utility classes.
* **Tailwind CSS (v3):** Hệ thống styling tiêu chuẩn cho toàn bộ theme, spacing và màu sắc.
* **@expo/vector-icons & Lucide Icons:** Bộ icon đa dạng hỗ trợ biểu tượng cho hệ thống kho, trạng thái ổ khóa, điều hướng.
* **expo-linear-gradient:** Tạo dải màu gradient cho các thẻ trạng thái, banner và thẻ kho.

### Thư viện Điều hướng (Navigation)
* **React Navigation (v7):**
  * `@react-navigation/native` & `@react-navigation/native-stack`: Quản lý luồng chuyển màn hình Stack mượt mà.
  * `@react-navigation/bottom-tabs`: Thanh điều hướng dưới đáy (Tab Bar) phân chia rõ ràng các phân hệ chính (Khám phá kho, Kho của tôi, Quét QR, Thông báo, Cá nhân).

### Quản lý Trạng thái & API
* **TanStack Query (React Query) / Axios:** Quản lý caching dữ liệu, đồng bộ hóa trạng thái kho và gọi RESTful API từ Backend.
* **React Context / Zustand:** Quản lý state toàn cục cho Session đăng nhập, thông tin tài khoản và vai trò người dùng (*Role-based*).

### Thư viện Bổ trợ & Tương tác Native
* **expo-camera / expo-barcode-scanner:** Quét mã QR code để check-in nhận kho hoặc xác thực bàn giao nhanh chóng.
* **expo-secure-store:** Lưu trữ token xác thực (JWT), mã PIN mở khóa kho an toàn trên thiết bị.
* **react-native-safe-area-context:** Xử lý hiển thị an toàn trên các thiết bị có notch, tai thỏ hoặc Dynamic Island.
* **react-native-screens:** Tối ưu hóa hiệu năng render các màn hình native.
* **react-native-toast-message:** Hiển thị thông báo trạng thái (thanh toán thành công, mở khóa thành công, cảnh báo).
* **@react-native-community/datetimepicker:** Hỗ trợ bộ chọn ngày bắt đầu thuê và thời gian đặt lịch.

---

## 3. Cấu trúc thư mục dự án

```text
SelfStorage-Mobile/
├── .expo/                  # Thư mục cache và cấu hình tạm thời của Expo
├── assets/                 # Lưu trữ tài nguyên tĩnh (icons, splash screen, images)
│   ├── adaptive-icon.png
│   ├── favicon.png
│   ├── icon.png
│   └── splash.png
├── src/                    # Toàn bộ mã nguồn chính của ứng dụng
│   ├── api/                # Cấu hình Axios Client, Interceptors và Base API
│   ├── components/         # Các UI component tái sử dụng (Button, Input, Card, Modal,...)
│   │   ├── common/         # Component dùng chung (Header, Loading, EmptyState,...)
│   │   ├── customer/       # Component riêng cho khách hàng (UnitCard, FilterSheet,...)
│   │   └── staff/          # Component cho nhân viên (TaskItem, CheckinScanner,...)
│   ├── config/             # Biến môi trường và cấu hình hệ thống
│   ├── constants/          # Định nghĩa hằng số (Colors, UnitStatus, Roles, Fonts,...)
│   ├── context/            # Global Contexts (AuthContext, NotificationContext,...)
│   ├── hooks/              # Custom hooks xử lý logic tái sử dụng
│   ├── navigation/         # Điều hướng ứng dụng (RootNavigator, CustomerTabs, StaffTabs)
│   ├── screens/            # Các màn hình chức năng chính
│   │   ├── auth/           # Đăng nhập, Đăng ký, Quên mật khẩu, Xác thực OTP
│   │   ├── customer/       # Phân hệ Khách hàng
│   │   │   ├── home/       # Danh sách cơ sở kho, tìm kiếm và gợi ý kho phù hợp
│   │   │   ├── booking/    # Luồng chọn kho, ngày thuê, thanh toán đặt cọc
│   │   │   ├── my-units/   # Quản lý kho đang thuê, xem mã PIN/QR mở khóa, gia hạn
│   │   │   └── support/    # Gửi ticket yêu cầu hỗ trợ, theo dõi xử lý sự cố
│   │   ├── staff/          # Phân hệ Nhân viên cơ sở
│   │   │   ├── tasks/      # Danh sách việc cần làm trong ngày (Check-in/Check-out)
│   │   │   ├── scanner/    # Quét mã QR check-in bàn giao kho
│   │   │   ├── units/      # Quản lý & kiểm tra tình trạng từng ngăn kho tại cơ sở
│   │   │   └── issues/     # Tiếp nhận và xử lý sự cố tại chỗ
│   │   └── profile/        # Quản lý thông tin cá nhân, cài đặt bảo mật
│   ├── services/           # Services gọi API (unitService, bookingService, paymentService,...)
│   ├── types/              # Type definition TypeScript (User, Unit, Booking, Invoice,...)
│   └── utils/              # Tiện ích định dạng ngày, tiền tệ, validation, mã hóa
├── App.tsx                 # Điểm khởi động chính của ứng dụng
├── app.json                # Cấu hình metadata Expo (tên ứng dụng, bundle ID, permissions,...)
├── babel.config.js         # Cấu hình Babel compiler
├── global.css              # Cấu hình CSS toàn cục cho NativeWind
├── metro.config.js         # Cấu hình Metro Bundler
├── package.json            # Danh sách dependencies và npm scripts
├── tailwind.config.js      # Cấu hình theme Tailwind CSS / NativeWind
└── tsconfig.json           # Cấu hình TypeScript compiler
```

---

## 4. Cài đặt môi trường

### Yêu cầu hệ thống:
* **Node.js:** Phiên bản khuyến nghị LTS `>= 20.x`.
* **Git:** Quản lý mã nguồn.
* **Expo Go:** Cài đặt ứng dụng Expo Go trên thiết bị di động (từ App Store trên iOS hoặc Google Play Store trên Android) hoặc thiết lập máy ảo (Android Studio / Xcode).

### Các bước cài đặt:

1. **Clone mã nguồn dự án:**
   ```bash
   git clone <URL_DỰ_ÁN>
   cd SelfStorage-Mobile
   ```

2. **Cài đặt các gói phụ thuộc (Dependencies):**
   ```bash
   npm install
   ```

3. **Cấu hình biến môi trường:**
   * Tạo tệp `.env` tại thư mục gốc nếu chưa có.
   * Định nghĩa các khóa cần thiết (ví dụ: `API_URL`, cấu hình xác thực...).

---

## 5. Scripts hữu ích

Trong quá trình phát triển, bạn có thể thực thi các lệnh sau:

* **Khởi chạy ứng dụng với Expo Metro Bundler:**
  ```bash
  npm run start
  # hoặc xóa cache khởi động sạch:
  npx expo start -c
  ```

* **Chạy trên máy ảo hoặc thiết bị Android:**
  ```bash
  npm run android
  ```

* **Chạy trên máy ảo iOS (Yêu cầu macOS và Xcode):**
  ```bash
  npm run ios
  ```

* **Kiểm tra lỗi kiểu dữ liệu TypeScript:**
  ```bash
  npx tsc --noEmit
  ```

---

## 6. Quy trình phát triển đề xuất

Để duy trì mã nguồn sạch và làm việc nhóm hiệu quả, các thành viên cần tuân thủ:

1. **Quản lý nhánh (Git Branching):**
   * Phân nhánh từ `main`/`develop`: `feature/ten-chuc-nang` (ví dụ: `feature/unit-reservation`, `feature/qr-checkin`) hoặc `bugfix/ten-loi`.
2. **Kiểm tra tính tương thích TypeScript & Linting:**
   * Luôn chạy `npx tsc --noEmit` trước khi tạo commit để đảm bảo không có lỗi Type Error.
3. **Quy chuẩn giao diện:**
   * Tận dụng các utility classes của NativeWind/Tailwind CSS để tạo giao diện nhất quán.
   * Xử lý `SafeAreaView` để tương thích hoàn hảo trên các dòng điện thoại có tai thỏ / Dynamic Island.
4. **Phân tách dữ liệu:**
   * Không hardcode dữ liệu mẫu trong UI; lưu trữ mock data trong các file `*.mock.ts` hoặc kết nối trực tiếp với backend service.
5. **Đánh giá mã nguồn (Pull Request):**
   * Mọi tính năng sau khi hoàn thành cần tạo PR, mô tả rõ các luồng đã kiểm thử và có ít nhất 1 thành viên review trước khi merge.