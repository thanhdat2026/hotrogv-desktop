// =====================================================================================
// HƯỚNG DẪN CẤU HÌNH GOOGLE CLIENT ID
// =====================================================================================
//
// Lỗi "Error 400" xảy ra vì bạn chưa cung cấp Client ID cho ứng dụng này.
// Vui lòng làm theo các bước sau:
//
// 1.  TRUY CẬP GOOGLE CLOUD CONSOLE:
//     Vào trang: https://console.cloud.google.com/apis/credentials
//
// 2.  TẠO HOẶC CHỌN DỰ ÁN:
//     - Nếu bạn chưa có dự án, hãy tạo một dự án mới.
//     - Nếu đã có, hãy chọn dự án bạn muốn sử dụng.
//
// 3.  TẠO CREDENTIALS:
//     - Nhấn vào nút "+ CREATE CREDENTIALS" ở trên cùng.
//     - Chọn "OAuth client ID".
//
// 4.  CẤU HÌNH OAUTH CLIENT ID:
//     - Application type: Chọn "Web application".
//     - Name: Đặt tên bất kỳ (ví dụ: "Gia Su AI App").
//     - Trong phần "Authorized JavaScript origins", nhấn "+ ADD URI".
//     - Dán chính xác URL sau vào: https://aistudio.google.com
//     - Nhấn "CREATE".
//
// 5.  SAO CHÉP VÀ DÁN CLIENT ID:
//     - Một hộp thoại sẽ hiện ra chứa "Your Client ID".
//     - Sao chép (Copy) giá trị Client ID đó.
//     - Quay lại file này và dán nó vào hằng số `GOOGLE_CLIENT_ID` bên dưới, thay thế
//       chuỗi "PASTE_YOUR_GOOGLE_CLIENT_ID_HERE.apps.googleusercontent.com".
//
// =====================================================================================

// THAY THẾ GIÁ TRỊ DƯỚI ĐÂY BẰNG CLIENT ID CỦA BẠN
// Hoặc đặt biến môi trường VITE_GOOGLE_CLIENT_ID trong .env.local hoặc Vercel Dashboard
const DEFAULT_CLIENT_ID = "1020141278387-afs8p9529ospmdu0g855bvtm2mje3ap3.apps.googleusercontent.com";
export const GOOGLE_CLIENT_ID = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GOOGLE_CLIENT_ID) || DEFAULT_CLIENT_ID;


// Scope này cho phép ứng dụng tạo các file mới trong Google Drive của người dùng.
// Nó không cấp quyền đọc hoặc sửa các file hiện có.
export const GOOGLE_DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.file";