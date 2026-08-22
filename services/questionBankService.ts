// =====================================================
// Question Bank Service — Ngân hàng câu hỏi
// GV lưu câu hỏi hay từ đề thi để dùng lại
// =====================================================

export interface QuestionItem {
    id: string;
    subject: string;
    grade: string;
    chapter: string;
    level: 'Nhận biết' | 'Thông hiểu' | 'Vận dụng' | 'Vận dụng cao';
    type: 'TN' | 'TL'; // Trắc nghiệm / Tự luận
    content: string; // Markdown
    answer?: string;
    createdAt: number;
    tags: string[];
}

const STORAGE_KEY = 'hotrogv_question_bank';
const MAX_QUESTIONS = 500;

export const getQuestionBank = (): QuestionItem[] => {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return [];
        return JSON.parse(raw);
    } catch { return []; }
};

export const addQuestion = (q: Omit<QuestionItem, 'id' | 'createdAt'>): QuestionItem => {
    const bank = getQuestionBank();
    const newQ: QuestionItem = {
        ...q,
        id: `q_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        createdAt: Date.now(),
    };
    bank.unshift(newQ);
    if (bank.length > MAX_QUESTIONS) bank.splice(MAX_QUESTIONS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bank));
    return newQ;
};

export const removeQuestion = (id: string): void => {
    const bank = getQuestionBank().filter(q => q.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bank));
};

export const clearQuestionBank = (): void => {
    localStorage.removeItem(STORAGE_KEY);
};

// Lọc câu hỏi
export const filterQuestions = (opts: {
    subject?: string;
    grade?: string;
    chapter?: string;
    level?: string;
    type?: string;
    search?: string;
}): QuestionItem[] => {
    let bank = getQuestionBank();
    if (opts.subject) bank = bank.filter(q => q.subject === opts.subject);
    if (opts.grade) bank = bank.filter(q => q.grade === opts.grade);
    if (opts.chapter) bank = bank.filter(q => q.chapter.toLowerCase().includes(opts.chapter!.toLowerCase()));
    if (opts.level) bank = bank.filter(q => q.level === opts.level);
    if (opts.type) bank = bank.filter(q => q.type === opts.type);
    if (opts.search) {
        const s = opts.search.toLowerCase();
        bank = bank.filter(q => q.content.toLowerCase().includes(s) || q.tags.some(t => t.toLowerCase().includes(s)));
    }
    return bank;
};

// Thống kê
export const getQuestionBankStats = () => {
    const bank = getQuestionBank();
    return {
        total: bank.length,
        tn: bank.filter(q => q.type === 'TN').length,
        tl: bank.filter(q => q.type === 'TL').length,
        byLevel: {
            'Nhận biết': bank.filter(q => q.level === 'Nhận biết').length,
            'Thông hiểu': bank.filter(q => q.level === 'Thông hiểu').length,
            'Vận dụng': bank.filter(q => q.level === 'Vận dụng').length,
            'Vận dụng cao': bank.filter(q => q.level === 'Vận dụng cao').length,
        },
        bySubject: {} as Record<string, number>,
    };
};
