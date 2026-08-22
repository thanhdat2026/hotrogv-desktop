# Trợ lý Dạy học số - thaydat.edu.vn

Ứng dụng AI miễn phí hỗ trợ giáo viên soạn Kế hoạch bài dạy, Đề thi, Phiếu bài tập, Sổ SHCM chuẩn GDPT 2018.

## ✨ Tính năng

- **Soạn Giáo Án**: Tự động tạo giáo án theo chuẩn 5512, tích hợp năng lực số CV 3456
- **Tạo Đề Thi**: Sinh đề kiểm tra với ma trận, đáp án, đa dạng cấu trúc
- **Phiếu Bài Tập**: Tạo phiếu luyện tập theo chủ đề
- **Đề Tương Tự**: Nhân bản đề thi thành các phiên bản tương đương
- **Soạn lại từ PDF/Ảnh**: Chuyển ảnh chụp đề thành Word chỉnh sửa được
- **Sinh Hoạt Chuyên Môn**: Tự động viết biên bản SHCM cả năm
- **Xuất Word**: Xuất file .docx chuẩn, sẵn sàng in ấn

## 🚀 Deploy lên Vercel (3 bước)

### Bước 1: Push code lên GitHub
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/<your-username>/hotrogv-soanbai.git
git push -u origin main
```

### Bước 2: Deploy trên Vercel
1. Truy cập [vercel.com](https://vercel.com) và đăng nhập bằng GitHub
2. Bấm **"Add New Project"** → Import repo `hotrogv-soanbai`
3. Vercel sẽ tự nhận diện framework **Vite** từ `vercel.json`
4. Thêm **Environment Variables** (tuỳ chọn):
   - `VITE_GEMINI_API_KEY` = `AIzaSy...` (API Key Gemini của bạn)
5. Bấm **Deploy**

### Bước 3: Chia sẻ cho giáo viên
- Gửi link Vercel (VD: `https://hotrogv-soanbai.vercel.app`) cho các giáo viên
- Giáo viên có thể dùng ngay với key mặc định, hoặc tự nhập key cá nhân trong Cài đặt

## 🔑 Cấu hình API Key

### Cách 1: Key mặc định (cho cả trường dùng chung)
Đặt `VITE_GEMINI_API_KEY` trong Vercel Environment Variables. Tất cả giáo viên sẽ dùng chung key này.

### Cách 2: Key cá nhân (ổn định nhất, khuyến khích)
Mỗi giáo viên tự tạo key miễn phí tại [Google AI Studio](https://aistudio.google.com/app/apikey) và nhập vào phần **Cài đặt** trên giao diện web. Key cá nhân sẽ được ưu tiên sử dụng (lưu trong localStorage).

## 💻 Phát triển local

```bash
# Cài đặt
npm install

# Tạo file .env.local (tuỳ chọn)
cp .env.example .env.local
# Sửa .env.local: thêm VITE_GEMINI_API_KEY=AIzaSy...

# Chạy dev server
npm run dev

# Build production
npm run build
```

## 📁 Cấu trúc dự án

```
├── App.tsx                    # Component chính (3300 dòng)
├── index.tsx                  # Entry point React
├── index.html                 # HTML template + inline styles
├── types.ts                   # TypeScript type definitions
├── googleConfig.ts            # Google OAuth configuration
├── vercel.json                # Vercel deployment config
├── vite.config.ts             # Vite build config
├── services/
│   ├── geminiService.ts       # Gemini AI API integration
│   ├── wordService.ts         # Xuất file Word (.docx)
│   ├── googleDocsService.ts   # Google Drive integration
│   └── pdfConverterService.ts # PDF → Text conversion
├── hooks/
│   └── useGoogleAuth.ts       # Google OAuth hook
└── components/
    └── UserGuide.tsx          # Trang hướng dẫn sử dụng
```

## 🛠 Tech Stack

- **Frontend**: React 19 + TypeScript + Vite
- **AI**: Google Gemini API (`@google/genai`)
- **Styling**: Tailwind CSS (CDN) + Inline styles
- **Document**: docx.js (Word export), pdfjs-dist (PDF parsing)
- **Markdown**: react-markdown + KaTeX (math rendering)
