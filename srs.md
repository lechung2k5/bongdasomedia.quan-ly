# TÀI LIỆU ĐẶC TẢ HỆ THỐNG (SRS) - BÓNG ĐÁ SỐ MEDIA ERP

## 1. Tổng quan dự án
- **Mục tiêu:** Xây dựng một Web Application duy nhất (Responsive Mobile-first) để quản lý toàn diện quy trình vận hành của doanh nghiệp truyền thông thể thao.
- **Nền tảng:** 100% Web-based. Giao diện Admin tối ưu cho Desktop/Tablet. Giao diện Nhân viên (Staff) tối ưu tuyệt đối cho Mobile (UI/UX như một Mobile App).
- **Người dùng cốt lõi:**
  1. **Admin / Quản lý:** Tạo lịch, điều phối nhân sự, thiết bị, xem bản đồ GPS, quản lý thu chi.
  2. **Staff (Quay phim, BLV, Kỹ thuật):** Xem lịch cá nhân, check-in/out thiết bị, xem nhiệm vụ vận chuyển, bật/tắt chia sẻ vị trí (GPS).

## 2. Tech Stack đề xuất (Dành cho AI Agent)
- **Framework:** Next.js (App Router) - Xử lý cả Frontend lẫn Backend (API Routes/Server Actions).
- **Styling:** Tailwind CSS + Shadcn UI (Hỗ trợ cực tốt cho responsive mobile và dựng form nhanh).
- **Database:** PostgreSQL (Sử dụng Prisma ORM để quản lý schema).
- **Real-time & GPS:** Socket.io (hoặc Pusher) để truyền tọa độ GPS thời gian thực.
- **Maps:** Google Maps API hoặc Mapbox GL JS.
- **Authentication:** NextAuth.js (Role-based access: Admin, Staff).

## 3. Database Schema (Các thực thể chính)

### 3.1. `User` (Nhân sự)
- id, name, phone, password, role (ADMIN, STAFF), avatar_url, current_location (lat, lng), status (IDLE, MOVING, WORKING).

### 3.2. `Equipment` (Thiết bị)
- id, name, category (Camera, Lens, Mixer, Cable...), serial_number, status (AVAILABLE, IN_USE, MAINTENANCE), current_holder_id (Ai đang cầm).

### 3.3. `Job` (Lịch làm việc)
- id, title (VD: Livestream Chung kết giải A), description, location_name, location_lat, location_lng, start_time, end_time, status (PENDING, ASSIGNED, IN_PROGRESS, COMPLETED, CANCELLED), total_revenue.

### 3.4. `JobAssignment` (Phân công nhân sự)
- id, job_id, user_id, role_in_job (Caster, Cam 1, Cam 2, vMix...), wage (Tiền công ca này).

### 3.5. `EquipmentAllocation` (Phân công thiết bị & Vận chuyển - **QUAN TRỌNG**)
- id, job_id, equipment_id, assigned_to_user_id (Nhân viên chịu trách nhiệm CHỞ và BẢO QUẢN thiết bị này), check_out_time, check_in_time, status (PENDING, CHECKED_OUT, RETURNED).

### 3.6. `Transaction` (Thu chi)
- id, job_id (nullable), type (INCOME, EXPENSE), amount, description, date, created_by.

## 4. Đặc tả tính năng chi tiết (Feature Breakdown)

### Module 1: Quản lý Lịch trình (Job Scheduling)
- **Admin:** Màn hình Calendar (như Google Calendar). Click vào ngày để tạo Job mới. Nhập thông tin giải, sân bóng, giờ giấc.
- **Thuật toán Check Conflict:** Khi phân công, hệ thống highlight cảnh báo nếu nhân sự hoặc thiết bị đang bị kẹt ở một Job khác cùng khung giờ.

### Module 2: Phân chia Thiết bị & Vận chuyển (Inventory & Logistics)
- **Kịch bản (Workflow):**
  1. Admin tạo Job -> Gán Nhân viên A, B, C vào Job.
  2. Admin chọn list thiết bị cần cho Job này (VD: 2 máy quay, 1 bàn trộn).
  3. Admin chỉ định rõ: **Nhân viên A chở 2 máy quay, Nhân viên B chở bàn trộn.**
  4. **Mobile (Nhân viên A):** Vào ngày đi làm, mở web app, thấy mục "Nhiệm vụ vận chuyển". 
  5. Nhân viên A lấy máy quay khỏi kho, bấm nút **"Xác nhận Check-out"** (Hệ thống ghi nhận thời gian xuất kho, trạng thái đồ đổi thành IN_USE, current_holder = Nhân viên A).
  6. Sau khi xong việc, trả đồ về kho, bấm **"Xác nhận Check-in"** (Đồ về trạng thái AVAILABLE).
- Có danh sách Master Inventory để Admin biết tổng tài sản hiện có, đồ nào đang hỏng, đồ nào ai đang mượn nhưng chưa trả.

### Module 3: Giám sát GPS thời gian thực (Live Tracking)
- **Mobile (Staff):**
  - Trước khi đi làm, Staff bấm nút **"Bắt đầu di chuyển"**. 
  - Giao diện hiện một Map nhỏ kèm thông báo trình duyệt yêu cầu quyền Vị trí (Geolocation API).
  - Trình duyệt chạy `navigator.geolocation.watchPosition()`. Cứ mỗi 10 giây đẩy tọa độ lên server (thông qua Socket/API) CẬP NHẬT vào bảng `User.current_location`.
- **Desktop (Admin):**
  - Màn hình "Live Map" hiển thị các marker của nhân viên. Marker tự động di chuyển không cần tải lại trang (Real-time).
  - Click vào marker để xem nhân viên đó đang chở thiết bị gì, đang đi đến sân bóng nào.

### Module 4: Quản lý Thu Chi & Lương (Finance)
- Quản lý doanh thu từ các hợp đồng (Jobs).
- Khi Job hoàn thành, hệ thống tự động sinh ra các khoản "Chi" (Expense) tiền công cho các Staff dựa trên `JobAssignment.wage`.
- Giao diện nhập các chi phí khác: Tiền mua thiết bị mới, tiền bảo trì, tiền ăn uống.
- Dashboard báo cáo Tổng thu, Tổng chi, Lợi nhuận gộp theo Tháng/Năm.

## 5. Hướng dẫn thiết kế UI/UX (Dành cho Frontend Developer / AI)
- **Giao diện Desktop (Admin):** Sử dụng Sidebar layout. Gồm các tab: Dashboard, Calendar, Jobs, Inventory, Map Tracking, Finance, Users.
- **Giao diện Mobile (Staff):** Sử dụng Bottom Navigation Bar (Tabs ở dưới cùng màn hình) giống một App thực thụ.
  - *Tab 1: Lịch của tôi* (Hiển thị các ca làm sắp tới).
  - *Tab 2: Check-in Đồ đạc* (Check-list những đồ mình phải mang đi hôm nay, kèm nút Bấm nhận/trả).
  - *Tab 3: Tracking* (Nút to ở giữa màn hình "Bắt đầu chuyến đi" / "Đã tới sân").
  - *Tab 4: Cá nhân* (Xem tiền công tháng này, đổi mật khẩu).
- **Lưu ý cực kỳ quan trọng cho Mobile Web:** Hạn chế cuộn ngang, sử dụng các button to dễ bấm, tối ưu tốc độ tải trang (dùng Skeleton loading) vì ra đường mạng 4G có thể chập chờn.