// =====================================================
// History Service — Lưu lịch sử soạn bài vào localStorage
// GV đóng trình duyệt/app → mở lại → bài vẫn còn
// =====================================================

export interface HistoryItem {
    id: string;
    type: 'lesson' | 'exam' | 'worksheet' | 'shcm';
    title: string;
    subject: string;
    grade: string;
    createdAt: number; // timestamp
    data: any; // LessonPlanResponse | ExamResponse | SHCMData
    preview: string; // Dòng đầu tiên để hiển thị
}

const STORAGE_KEY = 'hotrogv_history';
const MAX_ITEMS = 50;

// Lấy toàn bộ lịch sử
export const getHistory = (): HistoryItem[] => {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return [];
        return JSON.parse(raw);
    } catch {
        return [];
    }
};

// Thêm 1 bản ghi
export const addToHistory = (item: Omit<HistoryItem, 'id' | 'createdAt'>): void => {
    try {
        const history = getHistory();
        const newItem: HistoryItem = {
            ...item,
            id: `h_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
            createdAt: Date.now(),
        };
        history.unshift(newItem);
        // Giới hạn 50 bản ghi
        if (history.length > MAX_ITEMS) {
            history.splice(MAX_ITEMS);
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    } catch (e) {
        console.warn('[History] Cannot save:', e);
    }
};

// Xóa 1 bản ghi
export const removeFromHistory = (id: string): void => {
    try {
        const history = getHistory().filter(h => h.id !== id);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    } catch {}
};

// Xóa toàn bộ
export const clearHistory = (): void => {
    localStorage.removeItem(STORAGE_KEY);
};

// Lấy thống kê
export const getHistoryStats = () => {
    const history = getHistory();
    const stats = {
        total: history.length,
        lessons: history.filter(h => h.type === 'lesson').length,
        exams: history.filter(h => h.type === 'exam').length,
        worksheets: history.filter(h => h.type === 'worksheet').length,
        shcm: history.filter(h => h.type === 'shcm').length,
        bySubject: {} as Record<string, number>,
        thisWeek: 0,
        thisMonth: 0,
    };
    
    const now = Date.now();
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
    const monthAgo = now - 30 * 24 * 60 * 60 * 1000;
    
    history.forEach(h => {
        stats.bySubject[h.subject] = (stats.bySubject[h.subject] || 0) + 1;
        if (h.createdAt > weekAgo) stats.thisWeek++;
        if (h.createdAt > monthAgo) stats.thisMonth++;
    });
    
    return stats;
};

// Format thời gian tiếng Việt
export const formatTimeAgo = (timestamp: number): string => {
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Vừa xong';
    if (minutes < 60) return `${minutes} phút trước`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} giờ trước`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days} ngày trước`;
    const date = new Date(timestamp);
    return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
};

// Icon cho từng loại
export const getTypeLabel = (type: HistoryItem['type']): { label: string; color: string; emoji: string } => {
    switch (type) {
        case 'lesson': return { label: 'Giáo án', color: 'blue', emoji: '📝' };
        case 'exam': return { label: 'Đề thi', color: 'indigo', emoji: '📋' };
        case 'worksheet': return { label: 'Phiếu BT', color: 'pink', emoji: '📄' };
        case 'shcm': return { label: 'Sổ SHCM', color: 'emerald', emoji: '📚' };
    }
};
