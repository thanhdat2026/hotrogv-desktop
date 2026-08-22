export enum Subject {
    Toan = "Toán",
    TinHoc = "Tin học",
    HDTN = "Hoạt động trải nghiệm",
    TiengViet = "Tiếng Việt",
    NguVan = "Ngữ văn",
    KHTN = "Khoa học tự nhiên",
    LSDL = "Lịch sử và Địa lí",
    GDCD = "Giáo dục công dân",
    TiengAnh = "Tiếng Anh",
    GDTC = "Giáo dục thể chất",
    NgheThuat = "Nghệ thuật",
    CongNghe = "Công nghệ",
    AmNhac = "Âm nhạc"
}

export enum GradeLevel {
    Grade2 = "Lớp 2",
    Grade3 = "Lớp 3",
    Grade4 = "Lớp 4",
    Grade5 = "Lớp 5",
    Grade6 = "Lớp 6",
    Grade7 = "Lớp 7",
    Grade8 = "Lớp 8",
    Grade9 = "Lớp 9"
}

export interface TeacherProfile {
    schoolName: string;
    teacherName: string;
    groupName: string;
}

export interface ActivityOrganization {
    transfer: string;       // B1: Chuyển giao nhiệm vụ (GV giao, HS nhận)
    perform: string;        // B2: Thực hiện nhiệm vụ (HS làm, GV theo dõi)
    report: string;         // B3: Báo cáo, thảo luận (GV tổ chức, HS trình bày)
    conclude: string;       // B4: Kết luận, nhận định (GV chốt)
}

export interface DigitalCompetence {
    code: string;           // VD: "DL.2.1"
    description: string;    // VD: "Sử dụng công cụ tìm kiếm để..."
}

export interface LessonActivity {
    name: string;
    time: string;           // VD: 10 phút
    method: string;         // PP dạy học (VD: Nhóm, Trực quan...)
    objectives: string;
    content: string;
    product: string;
    organization: ActivityOrganization; // Cấu trúc 4 bước 5512
    digitalCompetence?: DigitalCompetence; 
}

export interface LessonPeriod {
    title: string;
    activities: LessonActivity[];
}

export interface LessonItem {
    topic: string;
    duration: string; // VD: 1 tiết, 2 tiết (Tổng thời lượng của bài)
    specificPeriod?: string; // NEW: VD: "Tiết 1", "Tiết 2" (Nội dung dạy trong tuần này)
}

export interface LessonPlanResponse {
    subject: Subject;
    topic: string;
    grade: string;
    duration: string;
    weekName?: string; // NEW: Tên tuần (nếu soạn theo tuần)
    lessonItems?: LessonItem[]; // NEW: Danh sách bài học chi tiết
    objectives: {
        knowledge: string[];
        competence: string[];
        qualities: string[];
    };
    equipment: string;
    periods: LessonPeriod[];
    fullMarkdown: string; 
    generatedImages?: {
        description: string;
        base64: string;
    }[];
}

export interface UserInput {
    subject: Subject;
    topic: string; // Dùng cho bài lẻ hoặc làm tiêu đề chung
    grade: GradeLevel;
    duration: string; 
    context: string; 
    images?: string[];
    weekName?: string; // NEW: VD: "Tuần 15"
    lessonItems?: LessonItem[]; // NEW: Danh sách các bài cần soạn
}

// --- NEW TYPES FOR EXAM ---

export interface ExamInput {
    subject: Subject;
    grade: GradeLevel;
    topic: string;          // Nội dung kiểm tra
    duration: string;       // 15p, 45p, 60p, 90p
    matrixType: 'TN100' | 'TL100' | 'MIX73' | 'MIX55' | 'MIX37' | 'CV7991' | 'CUSTOM'; // Cấu trúc đề
    difficulty: string;     // Tỉ lệ: 4-3-2-1 hoặc 3-4-2-1
    context: string;        // Yêu cầu thêm
    tnPercent?: number;     // % Trắc nghiệm (dùng khi CUSTOM)
    tlPercent?: number;     // % Tự luận (dùng khi CUSTOM)
    tnTypes?: ('1-dap-an' | 'dung-sai' | 'tra-loi-ngan')[]; // Loại TN được chọn
}

export interface ExamHeader {
    topLeft: string[]; // Text lines for top-left (School/Dept name)
    topRight: string[]; // Text lines for top-right (Exam name, time)
    isOfficial: boolean; // Is there a "ĐỀ CHÍNH THỨC" box?
}

export interface ExamResponse {
    title: string;
    matrixMarkdown: string; // Bảng ma trận
    examMarkdown: string;   // Nội dung đề thi
    answerMarkdown: string; // Đáp án và hướng dẫn chấm
    subject?: Subject;
    grade?: GradeLevel;
    duration?: string;
    headerData?: ExamHeader; // Optional header data for reconstruction
    seed?: number; // Store the seed used for generating similar/shuffled exams
    isFromDocx?: boolean; // Flag to indicate if the exam was generated from a Docx file
    generatedImages?: {
        placeholderId: string;
        base64: string;
        width?: number;
        height?: number;
    }[];
}

// NEW: Type for generating similar exercises
export interface SimilarExercise {
    problemMarkdown: string;
    solutionMarkdown: string;
}

export interface ReviewOutlineGroup {
    topicTitle: string;
    method: string;
    originalQuestionMarkdown?: string;
    similarExercises: SimilarExercise[];
}

export interface TeacherInfo {
    name: string;
    birthYear: string;
    specialty: string;
    degree: string;
}

export interface SHCMMeeting {
    meetingNumber: number;
    date: string;
    contentMarkdown: string;
}

export interface SHCMData {
    schoolName: string;
    groupName: string;
    academicYear: string;
    leaderName: string;
    hostName: string;
    vicePrincipalName: string;
    secretaryName: string;
    teachers: TeacherInfo[];
    term1Activities?: { month: string; content: string }[];
    term2Activities?: { month: string; content: string }[];
    measures?: string;
    meetings: SHCMMeeting[];
}

export interface ImageLocation {
    pageIndex: number;
    x: number;
    y: number;
    width: number;
    height: number;
}