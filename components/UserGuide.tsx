import React from 'react';
import { BookOpen, FileText, GraduationCap, Files, FileCog, Cloud, Settings, Users, ArrowRight } from 'lucide-react';

export const UserGuide = () => {
  return (
    <div className="bg-white p-6 md:p-10 rounded-2xl shadow-sm border border-slate-200 text-slate-800 space-y-10 animate-fade-in-up">
      <div className="text-center mb-12">
        <h2 className="text-3xl md:text-4xl font-extrabold text-indigo-900 flex justify-center items-center">
          <BookOpen className="w-10 h-10 mr-4 text-indigo-600" />
          CẨM NANG SỬ DỤNG
        </h2>
        <p className="text-slate-600 mt-3 text-lg max-w-2xl mx-auto">
          Tài liệu hướng dẫn chi tiết giúp thầy cô làm chủ toàn bộ các công cụ AI của hệ thống THAYDAT.EDU.VN, tối ưu hóa thời gian làm việc.
        </p>
      </div>

      <div className="space-y-8">
        {/* Section: Thiết lập cơ bản */}
        <section className="bg-slate-50 p-6 md:p-8 rounded-2xl border border-slate-100 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5">
            <Settings className="w-32 h-32" />
          </div>
          <h3 className="text-2xl font-bold text-slate-800 flex items-center mb-4">
            <Settings className="w-7 h-7 mr-3 text-slate-600" />
            0. Thiết Lập Cá Nhân (Quan trọng)
          </h3>
          <p className="mb-4 text-slate-700 leading-relaxed">
            Trước khi bắt đầu, thầy cô nên hoàn thiện phần cấu hình hệ thống bằng cách bấm vào biểu tượng "Bánh răng" ở góc phải phía trên màn hình.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200">
              <strong className="block text-indigo-700 mb-1">Thông tin cá nhân</strong>
              <p className="text-sm text-slate-600">Nhập <strong>Tên trường</strong>, <strong>Họ tên giáo viên</strong>, <strong>Tổ chuyên môn</strong>. Hệ thống sẽ <strong>tự động điền</strong> các thông tin này vào phần đầu (Header) của tài liệu.</p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200">
              <strong className="block text-indigo-700 mb-1">Cài đặt API Key (Trí Tuệ Nhân Tạo)</strong>
              <p className="text-sm text-slate-600">Để dùng ổn định lâu dài (miễn phí), nên cài <strong>Gemini API Key riêng</strong>:</p>
              <ol className="list-decimal pl-4 text-xs mt-1 text-slate-600 space-y-1">
                <li>Truy cập <a href="https://aistudio.google.com/app/apikey" target="_blank" className="text-blue-600 hover:underline">Google AI Studio</a>. Đăng nhập bằng Gmail.</li>
                <li>Nhấn <strong>Create API Key</strong>, copy chuỗi mã vừa tạo.</li>
                <li>Mở Cài đặt (góc trên bên phải), dán mã vào mục API Key và lưu lại.</li>
              </ol>
            </div>
          </div>
        </section>

        {/* CÁC TÍNH NĂNG CHÍNH */}
         <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
            {/* Feature 1 */}
            <section className="bg-white p-6 md:p-8 rounded-2xl border border-blue-100 shadow-[0_4px_20px_-10px_rgba(0,0,0,0.1)] hover:shadow-[0_8px_30px_-10px_rgba(37,99,235,0.15)] transition-all flex flex-col">
              <h3 className="text-xl font-bold text-blue-800 flex items-center mb-4 pb-3 border-b border-blue-50">
                <div className="bg-blue-100 p-2 rounded-lg mr-3">
                    <FileText className="w-6 h-6 text-blue-700" />
                </div>
                1. Soạn Giáo Án
              </h3>
              <p className="mb-4 text-sm text-slate-700 leading-relaxed">Tự động cấu trúc giáo án theo từng chủ đề hoặc tuần học với các phương pháp dạy học hiện đại.</p>
              <ul className="space-y-3 text-sm text-slate-700 flex-grow">
                <li className="flex items-start"><ArrowRight className="w-4 h-4 text-blue-500 mr-2 mt-0.5 shrink-0" /><span><strong>Chủ đề / Bài:</strong> Nhập tên bài cụ thể. AI sẽ tự động chia 4 bước: Khởi động, Hình thành kiến thức, Luyện tập, Vận dụng.</span></li>
                <li className="flex items-start"><ArrowRight className="w-4 h-4 text-blue-500 mr-2 mt-0.5 shrink-0" /><span><strong>Giáo án Tuần:</strong> Nhập số tiết và nội dung từng tiết để AI lên kịch bản suốt cả tuần.</span></li>
                <li className="flex items-start"><ArrowRight className="w-4 h-4 text-blue-500 mr-2 mt-0.5 shrink-0" /><span><strong>Mẫu tham khảo:</strong> Có thể tải lên file .docx giáo án cũ để AI học theo đúng "văn phong" và "form" của thầy cô.</span></li>
              </ul>
            </section>

            {/* Feature Phiếu Bài Tập */}
            <section className="bg-white p-6 md:p-8 rounded-2xl border border-pink-100 shadow-[0_4px_20px_-10px_rgba(0,0,0,0.1)] hover:shadow-[0_8px_30px_-10px_rgba(219,39,119,0.15)] transition-all flex flex-col">
              <h3 className="text-xl font-bold text-pink-800 flex items-center mb-4 pb-3 border-b border-pink-50">
                <div className="bg-pink-100 p-2 rounded-lg mr-3">
                    <BookOpen className="w-6 h-6 text-pink-700" />
                </div>
                2. Phiếu Bài Tập
              </h3>
              <p className="mb-4 text-sm text-slate-700 leading-relaxed">Xây dựng phiếu luyện tập chuyên đề với số lượng câu hỏi và độ khó tự chọn đáp ứng thực tế học sinh.</p>
              <ul className="space-y-3 text-sm text-slate-700 flex-grow">
                <li className="flex items-start"><ArrowRight className="w-4 h-4 text-pink-500 mr-2 mt-0.5 shrink-0" /><span><strong>Chủ đề bám sát:</strong> Nhập "Giải phương trình", "Bài tập hình học", hay bất cứ nội dung gì cần luyện.</span></li>
                <li className="flex items-start"><ArrowRight className="w-4 h-4 text-pink-500 mr-2 mt-0.5 shrink-0" /><span><strong>Yêu cầu linh hoạt:</strong> Bắt AI tạo ra các bài toán vui, mang tính thực tế, hoặc tập trung phân loại HS.</span></li>
                <li className="flex items-start"><ArrowRight className="w-4 h-4 text-pink-500 mr-2 mt-0.5 shrink-0" /><span><strong>Xuất bản:</strong> Đi kèm chi tiết lời giải để dễ dàng theo dõi.</span></li>
              </ul>
            </section>

            {/* Feature 2 */}
            <section className="bg-white p-6 md:p-8 rounded-2xl border border-indigo-100 shadow-[0_4px_20px_-10px_rgba(0,0,0,0.1)] hover:shadow-[0_8px_30px_-10px_rgba(79,70,229,0.15)] transition-all flex flex-col">
              <h3 className="text-xl font-bold text-indigo-800 flex items-center mb-4 pb-3 border-b border-indigo-50">
                <div className="bg-indigo-100 p-2 rounded-lg mr-3">
                    <GraduationCap className="w-6 h-6 text-indigo-700" />
                </div>
                3. Tạo Đề Thi Mới
              </h3>
              <p className="mb-4 text-sm text-slate-700 leading-relaxed">Phát triển kho đề kiểm tra, thi học kì, giữa kì từ con số 0 chỉ bằng vài mô tả đơn giản.</p>
              <ul className="space-y-3 text-sm text-slate-700 flex-grow">
                <li className="flex items-start"><ArrowRight className="w-4 h-4 text-indigo-500 mr-2 mt-0.5 shrink-0" /><span><strong>Thông số:</strong> Chỉnh sửa thanh kéo để chọn số câu Trắc nghiệm, Tự luận và Thời gian làm bài mong muốn.</span></li>
                <li className="flex items-start"><ArrowRight className="w-4 h-4 text-indigo-500 mr-2 mt-0.5 shrink-0" /><span><strong>Yêu cầu đặc biệt:</strong> Ví dụ: <em>"Đề giữa kì 1 Toán 9, 30% Hình học, 70% Đại số, mức độ khá giỏi".</em></span></li>
                <li className="flex items-start"><ArrowRight className="w-4 h-4 text-indigo-500 mr-2 mt-0.5 shrink-0" /><span><strong>Siêu đầu ra:</strong> Kết quả luôn bao gồm 3 phần: (1) Ma trận đề, (2) Đề bài bản in, (3) Đáp án chi tiết.</span></li>
              </ul>
            </section>

            {/* Feature Ma Trận */}
            <section className="bg-white p-6 md:p-8 rounded-2xl border border-purple-100 shadow-[0_4px_20px_-10px_rgba(0,0,0,0.1)] hover:shadow-[0_8px_30px_-10px_rgba(126,34,206,0.15)] transition-all flex flex-col">
              <h3 className="text-xl font-bold text-purple-800 flex items-center mb-4 pb-3 border-b border-purple-50">
                <div className="bg-purple-100 p-2 rounded-lg mr-3">
                    <GraduationCap className="w-6 h-6 text-purple-700" />
                </div>
                4. Lập Ma Trận & Đặc Tả
              </h3>
              <p className="mb-4 text-sm text-slate-700 leading-relaxed">Phân tích đề thi có sẵn để tự động xây dựng Bảng Ma trận & Bảng Đặc tả theo chuẩn Bộ GD&ĐT.</p>
              <ul className="space-y-3 text-sm text-slate-700 flex-grow">
                <li className="flex items-start"><ArrowRight className="w-4 h-4 text-purple-500 mr-2 mt-0.5 shrink-0" /><span><strong>Đầu vào:</strong> Tải lên file Word (.docx), PDF hoặc ảnh chụp đề thi đã có sẵn. AI sẽ đọc và phân loại từng câu hỏi.</span></li>
                <li className="flex items-start"><ArrowRight className="w-4 h-4 text-purple-500 mr-2 mt-0.5 shrink-0" /><span><strong>Kết quả:</strong> Bảng Ma trận phân bổ theo mức độ Nhận biết / Thông hiểu / Vận dụng / Vận dụng cao, kèm Bảng Đặc tả chi tiết từng câu.</span></li>
                <li className="flex items-start"><ArrowRight className="w-4 h-4 text-purple-500 mr-2 mt-0.5 shrink-0" /><span><strong>Xuất Word:</strong> Tải file Word chỉ chứa Bảng Ma trận, sau đó ghép vào file đề gốc của thầy cô.</span></li>
              </ul>
            </section>

            {/* Feature 5 */}
            <section className="bg-white p-6 md:p-8 rounded-2xl border border-orange-100 shadow-[0_4px_20px_-10px_rgba(0,0,0,0.1)] hover:shadow-[0_8px_30px_-10px_rgba(234,88,12,0.15)] transition-all flex flex-col">
              <h3 className="text-xl font-bold text-orange-800 flex items-center mb-4 pb-3 border-b border-orange-50">
                <div className="bg-orange-100 p-2 rounded-lg mr-3">
                    <Files className="w-6 h-6 text-orange-700" />
                </div>
                5. Đề / Bài Tập Tương Tự
              </h3>
              <p className="mb-4 text-sm text-slate-700 leading-relaxed">Nhân bản 1 bài kiểm tra thành vô số dạng tương đương (thay số, đổi ngữ cảnh) cho HS luyện tập.</p>
              <ul className="space-y-3 text-sm text-slate-700 flex-grow">
                <li className="flex items-start"><ArrowRight className="w-4 h-4 text-orange-500 mr-2 mt-0.5 shrink-0" /><span><strong>Đầu vào đa dạng:</strong> Hỗ trợ tải File Word (.docx), PDF, hoặc Hình ảnh. Ưu tiên Word sẽ cho tốc độ nhanh nhất.</span></li>
                <li className="flex items-start"><ArrowRight className="w-4 h-4 text-orange-500 mr-2 mt-0.5 shrink-0" /><span><strong>Yêu cầu riêng:</strong> Có thể nhập thêm để buộc AI phục vụ sát theo mục đích (vd: giảm một nửa số câu).</span></li>
                <li className="flex items-start"><ArrowRight className="w-4 h-4 text-orange-500 mr-2 mt-0.5 shrink-0" /><span><strong>Chẻ nhỏ:</strong> Có thể chọn "Lên thành các nhóm Bài Tập Tương Tự" thay vì lên nguyên đề, rất tiện dụng.</span></li>
              </ul>
            </section>

            {/* Feature 5 */}
            <section className="bg-white p-6 md:p-8 rounded-2xl border border-teal-100 shadow-[0_4px_20px_-10px_rgba(0,0,0,0.1)] hover:shadow-[0_8px_30px_-10px_rgba(13,148,136,0.15)] transition-all flex flex-col">
              <h3 className="text-xl font-bold text-teal-800 flex items-center mb-4 pb-3 border-b border-teal-50">
                <div className="bg-teal-100 p-2 rounded-lg mr-3">
                    <FileCog className="w-6 h-6 text-teal-700" />
                </div>
                6. Soạn Lại Từ Ảnh/PDF
              </h3>
              <p className="mb-4 text-sm text-slate-700 leading-relaxed">Biến ảnh chụp đề thi thành văn bản Word (mã hóa chuẩn công thức Toán học) chỉnh sửa được.</p>
              <ul className="space-y-3 text-sm text-slate-700 flex-grow">
                <li className="flex items-start"><ArrowRight className="w-4 h-4 text-teal-500 mr-2 mt-0.5 shrink-0" /><span><strong>Cắt và Giữ hình:</strong> Mặc định AI sẽ nhận diện các Hình vẽ biểu đồ trong ảnh gốc để cắt ra và dán lại vào đúng vị trí trên bản Word.</span></li>
                <li className="flex items-start"><ArrowRight className="w-4 h-4 text-teal-500 mr-2 mt-0.5 shrink-0" /><span><strong>Chia đôi màn hình:</strong> Giao diện tự động tách làm 2: Bên trái soi bản gốc, bên phải chỉnh sửa trực tiếp đoạn text AI vừa bóc băng.</span></li>
              </ul>
            </section>
         </div>

         {/* Feature 6 - SHCM */}
         <section className="bg-gradient-to-br from-emerald-50 to-teal-50 p-6 md:p-8 rounded-2xl border border-emerald-100 shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)] mt-6">
            <h3 className="text-2xl font-bold text-emerald-900 flex items-center mb-4 pb-3 border-b border-emerald-200/50">
              <div className="bg-emerald-100 p-2 rounded-lg mr-3 shadow-sm border border-emerald-200">
                  <Users className="w-6 h-6 text-emerald-700" />
              </div>
              7. Biên bản Sinh Hoạt Chuyên Môn (SHCM)
            </h3>
            <p className="mb-5 text-emerald-800 leading-relaxed">
                Tự động hóa hoàn toàn quy trình viết Biên bản họp chuyên môn hàng tháng, học kỳ theo Cấu trúc quy định của Bộ.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                   <h4 className="font-bold text-emerald-700 mb-2">Cách thức hoạt động:</h4>
                   <ul className="space-y-3 text-sm text-emerald-800">
                        <li className="flex items-start"><ArrowRight className="w-4 h-4 text-emerald-500 mr-2 mt-0.5 shrink-0" /><span><strong>Điền thông tin khung:</strong> Nhập Chủ tọa, Thư ký, Đại diện BGH, và thêm danh sách các Giáo viên tham dự.</span></li>
                        <li className="flex items-start"><ArrowRight className="w-4 h-4 text-emerald-500 mr-2 mt-0.5 shrink-0" /><span><strong>Chủ điểm tháng:</strong> Thầy cô có thể tích chọn các tháng cần tạo biên bản (VD: Tháng 8, Tháng 9) hoặc để trống để AI tự phân bổ chuỗi 9 tháng. Có thể ghi chú chủ đề mong muốn (VD: Tháng 10 thi GVG).</span></li>
                        <li className="flex items-start"><ArrowRight className="w-4 h-4 text-emerald-500 mr-2 mt-0.5 shrink-0" /><span><strong>Sinh văn bản:</strong> AI sẽ tự mô phỏng nội dung các cuộc thảo luận, ý kiến đóng góp của từng giáo viên rất giống thực tế, ra đủ 100% biên bản chỉ với 1 click.</span></li>
                    </ul>
                </div>
                <div className="bg-white/60 p-5 rounded-xl border border-emerald-100">
                    <h4 className="font-bold text-emerald-700 mb-2">Thủ thuật:</h4>
                    <p className="text-sm text-emerald-800 mb-3">
                        Đừng quên đánh dấu tích vào <strong>Kèm Kế hoạch chung</strong> nếu thầy cô muốn trang đầu tiên của file Word là bảng Kế hoạch công tác năm học của Tổ.
                    </p>
                    <p className="text-sm text-emerald-800">
                        Mọi thông tin như Trường, Tổ đều sẽ được lấy tự động từ phần <strong>Cài đặt</strong> hệ thống.
                    </p>
                </div>
            </div>
         </section>
      </div>
        
      {/* Mẹo Chung */}
      <section className="bg-slate-800 text-white p-6 md:p-8 rounded-2xl shadow-lg mt-10">
          <h3 className="text-xl font-bold flex items-center mb-5 text-amber-400">
              <Cloud className="w-6 h-6 mr-3" />
              MẸO HAY SỬ DỤNG HỆ THỐNG
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-slate-700/50 p-5 rounded-xl border border-slate-600">
                <strong className="block text-amber-300 mb-2 font-medium">1. Chỉnh sửa LIVE</strong>
                <p className="text-sm text-slate-300">Kết quả AI trả ra ở bên phải màn hình không phải là hình ảnh tĩnh. Thầy cô hoàn toàn có thể <strong>click chuột vào văn bản và gõ chữ</strong> để sửa lại đúng ý mình trước khi bấm nút tải File Word.</p>
            </div>
            <div className="bg-slate-700/50 p-5 rounded-xl border border-slate-600">
                <strong className="block text-amber-300 mb-2 font-medium">2. Ưu tiên File Word</strong>
                <p className="text-sm text-slate-300">Nếu có sẵn máy tính nội bộ, tải file `.docx` gốc lên thay vì PDF sẽ mang lại độ phân giải chính xác tuyệt đối và thời gian nạp chưa tới 2 giây thay vì 10 giây đối với Ảnh/PDF.</p>
            </div>
            <div className="bg-slate-700/50 p-5 rounded-xl border border-slate-600">
                <strong className="block text-amber-300 mb-2 font-medium">3. Kiểm tra lại chính tả</strong>
                <p className="text-sm text-slate-300">Công nghệ nhận diện chữ (Đọc từ File Ảnh chụp đề nhăn nheo) thỉnh thoảng có tỷ lệ nhầm phím/chữ. Rà soát kỹ bản Word tải về luôn là một thói quen tốt của giáo viên chuẩn.</p>
            </div>
          </div>
      </section>

      <div className="text-center pt-6 text-sm text-slate-500 font-medium border-t border-slate-100 flex items-center justify-center">
            Mọi khó khăn trong quá trình sử dụng hệ thống, thầy cô có thể liên hệ quản trị viên để được hỗ trợ 24/7.
      </div>
    </div>
  );
}
