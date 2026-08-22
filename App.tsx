import React, { useState, useMemo, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { 
    BookOpen, Download, FileText, Loader2, Plus, Sparkles, Upload, 
    X, GraduationCap, CheckCircle2, Layout, PenLine, FileCog, FileUp, 
    DownloadCloud, Image as ImageIcon, RefreshCw, Files, BrainCircuit, 
    Calculator, Compass, Type, PenSquare, LogOut, Save, KeyRound, CalendarDays, Trash2,
    Clock, Table, HelpCircle, Maximize2, Users, Settings, FlaskConical, Map, Globe, Activity, Music, Palette, Lightbulb, ExternalLink, Wrench,
    History, Moon, Sun, MessageSquare, BarChart3, Zap, Share2, Copy, Edit3
} from 'lucide-react';
import { Packer } from 'docx';
import { generateLessonPlan, generateExam, regenerateExamFromPdf, generateSingleImage, generateSimilarExercisesFromPdf, generateSimilarExamFromPdf, locateImagesInPages, filterMeaningfulImages, shuffleExam, generateSimilarExamFromDocx, shuffleDocxExam, generateSimilarExercisesFromDocx, generateMatrixFromDocx, generateMatrixFromPdf, generateOutlineFromDocx, generateOutlineFromPdf, generateSHCM, onAISourceChange, getLastAISource, getLastAIError, fetchRouterConfig, get9RouterModels, getSelected9RouterModel, setSelected9RouterModel, restoreSelectedModel, getLastModelUsed, fixLatexErrors } from './services/geminiService';
import type { AISource } from './services/geminiService';
import { downloadWordDocument, downloadExamDocument, generateLessonPlanDoc, generateExamDoc, downloadSHCMDocument } from './services/wordService';
import { extractPdfContent, ExtractedImage } from './services/pdfConverterService';
import { GradeLevel, LessonPlanResponse, UserInput, ExamInput, ExamResponse, Subject, SimilarExercise, ImageLocation, ExamHeader, LessonItem, ReviewOutlineGroup, TeacherInfo, SHCMData } from './types';
import { TOAN_KNTT_CURRICULUM, TINHOC_KNTT_CURRICULUM, HDTN_KNTT_CURRICULUM, TIENGVIET_KNTT_CURRICULUM, NGUVAN_KNTT_CURRICULUM, KHTN_KNTT_CURRICULUM, LSDL_KNTT_CURRICULUM, GDCD_KNTT_CURRICULUM, CONGNHE_KNTT_CURRICULUM, AMNHAC_KNTT_CURRICULUM, TIENGANH_KNTT_CURRICULUM, GDTC_KNTT_CURRICULUM, MYTHUAT_KNTT_CURRICULUM } from './data/curriculum';
import { useGoogleAuth } from './hooks/useGoogleAuth';
import { uploadToGoogleDocs } from './services/googleDocsService';
import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';
import saveAs from 'file-saver';
import { UserGuide } from './components/UserGuide';
import { getHistory, addToHistory, removeFromHistory, clearHistory, getHistoryStats, formatTimeAgo, getTypeLabel, type HistoryItem } from './services/historyService';
import { getQuestionBank, addQuestion, removeQuestion, clearQuestionBank, filterQuestions, getQuestionBankStats, type QuestionItem } from './services/questionBankService';


// Fix for PDF.js import structure in some ESM environments
const pdfjs: any = (pdfjsLib as any).default || pdfjsLib;

// Set worker source for PDF.js using cdnjs to ensure stability and CORS compliance
if (pdfjs.GlobalWorkerOptions) {
    pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;
}

type TabType = 'lesson' | 'worksheet' | 'exam' | 'converter' | 'similar-exam' | 'guide' | 'shcm' | 'dashboard' | 'comments' | 'edu-plan';
type SaveState = 'idle' | 'saving' | 'saved' | 'error';

const App = () => {
  // Detect Electron desktop app
  const isElectron = !!(window as any).electronAPI;
  const [activeTab, setActiveTab] = useState<TabType>('lesson');
  const [subject, setSubject] = useState<Subject>(Subject.Toan);
  const [hasCompletedSetup, setHasCompletedSetup] = useState(() => {
      return localStorage.getItem('hasCompletedSetup') === 'true';
  });
  const [hasChosenSubject, setHasChosenSubject] = useState(() => {
      return localStorage.getItem('hasCompletedSetup') === 'true';
  });
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState("Đang xử lý...");
  const [showSettings, setShowSettings] = useState(false);
  const [geminiApiKey, setGeminiApiKey] = useState(localStorage.getItem('custom_gemini_api_key') || '');
  const [teacherProfile, setTeacherProfile] = useState<{schoolName: string; teacherName: string; groupName: string}>(() => {
      try {
          const saved = localStorage.getItem('teacherProfile');
          if (saved) return JSON.parse(saved);
      } catch (e) {}
      return { schoolName: '', teacherName: '', groupName: '' };
  });

  const { user, accessToken, login, logout } = useGoogleAuth();

  // Theo dõi nguồn AI đang dùng (9Router hay Gemini)
  const [aiSource, setAiSource] = useState<AISource>(getLastAISource());
  const [aiSourceError, setAiSourceError] = useState<string>(getLastAIError());
  const [aiModelUsed, setAiModelUsed] = useState<string>('');
  const [selectedModel, setSelectedModel] = useState<string>(getSelected9RouterModel());
  
  // ===== HISTORY, DARK MODE, TEMPLATES STATE =====
  const [showHistoryPanel, setShowHistoryPanel] = useState(false);
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('darkMode') === 'true');
  const [showTemplates, setShowTemplates] = useState(false);
  const [chatMessages, setChatMessages] = useState<{role: 'user'|'ai'; text: string}[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [showChat, setShowChat] = useState(false);
  const [commentInput, setCommentInput] = useState({ students: '', grade: '', subject: '', style: 'tích cực' });
  const [commentResult, setCommentResult] = useState<string | null>(null);
  
  // A3: Lesson editing state
  const [isEditingLesson, setIsEditingLesson] = useState(false);
  const [editedLessonMarkdown, setEditedLessonMarkdown] = useState('');
  
  // A4: Regenerate section
  const [regeneratingSection, setRegeneratingSection] = useState<string | null>(null);
  
  // B4: Share
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  
  // C2: Edu Plan
  const [eduPlanInput, setEduPlanInput] = useState({ semester: 'Cả năm', year: '2025-2026', notes: '' });
  const [eduPlanResult, setEduPlanResult] = useState<string | null>(null);
  
  // C3: Question Bank
  const [showQuestionBank, setShowQuestionBank] = useState(false);
  const [qbQuestions, setQbQuestions] = useState<QuestionItem[]>([]);
  const [qbFilter, setQbFilter] = useState({ search: '', level: '', type: '' });
  const [addingQuestion, setAddingQuestion] = useState(false);
  const [newQuestion, setNewQuestion] = useState({ content: '', answer: '', chapter: '', level: 'Nhận biết' as const, type: 'TN' as const, tags: '' });
  const refreshQB = useCallback(() => setQbQuestions(getQuestionBank()), []);

  // Refresh history khi cần
  const refreshHistory = useCallback(() => setHistoryItems(getHistory()), []);
  useEffect(() => { refreshHistory(); }, [refreshHistory]);

  // Dark mode toggle
  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    localStorage.setItem('darkMode', String(darkMode));
  }, [darkMode]);

  // ===== ADMIN PANEL STATE =====
  const [showAdmin, setShowAdmin] = useState(false);
  const [adminLoggedIn, setAdminLoggedIn] = useState(false);
  const [adminToken, setAdminToken] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminLoginError, setAdminLoginError] = useState('');
  const [adminSaving, setAdminSaving] = useState(false);
  const [adminSaveMsg, setAdminSaveMsg] = useState('');
  const [adminConfig, setAdminConfig] = useState({
    url: '', key: '', model: '', models: '', newPassword: ''
  });

  // Kiểm tra URL hash → mở admin panel
  useEffect(() => {
    const checkHash = () => {
      if (window.location.hash === '#admin' || window.location.pathname === '/admin') {
        setShowAdmin(true);
        // Khôi phục session admin từ sessionStorage
        const savedToken = sessionStorage.getItem('admin_token');
        if (savedToken) {
          try {
            const payload = JSON.parse(atob(savedToken));
            if (payload.exp > Date.now()) {
              setAdminLoggedIn(true);
              setAdminToken(savedToken);
              // Load config hiện tại
              loadAdminConfig(savedToken);
            }
          } catch {}
        }
      } else {
        setShowAdmin(false);
      }
    };
    checkHash();
    window.addEventListener('hashchange', checkHash);
    return () => window.removeEventListener('hashchange', checkHash);
  }, []);

  // Đăng nhập admin
  const handleAdminLogin = async () => {
    setAdminLoginError('');
    try {
      const resp = await fetch('/api/admin-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: adminPassword })
      });
      const data = await resp.json();
      if (resp.ok && data.token) {
        setAdminLoggedIn(true);
        setAdminToken(data.token);
        sessionStorage.setItem('admin_token', data.token);
        setAdminPassword('');
        loadAdminConfig(data.token);
      } else {
        setAdminLoginError(data.error || 'Đăng nhập thất bại');
      }
    } catch (e: any) {
      setAdminLoginError('Lỗi kết nối: ' + e.message);
    }
  };

  // Load config hiện tại từ server
  const loadAdminConfig = async (_token?: string) => {
    try {
      const resp = await fetch('/api/router-config');
      if (resp.ok) {
        const data = await resp.json();
        setAdminConfig({
          url: data.url || '',
          key: data.key || '',
          model: data.model || '',
          models: (data.models || []).join(', '),
          newPassword: ''
        });
      }
    } catch {}
  };

  // Lưu config admin
  const handleAdminSave = async () => {
    setAdminSaving(true);
    setAdminSaveMsg('');
    try {
      const body: any = {};
      if (adminConfig.url) body.url = adminConfig.url.trim();
      if (adminConfig.key) body.key = adminConfig.key.trim();
      if (adminConfig.model) body.model = adminConfig.model.trim();
      if (adminConfig.models) {
        body.models = adminConfig.models.split(',').map((m: string) => m.trim()).filter(Boolean);
      }
      if (adminConfig.newPassword) body.password = adminConfig.newPassword.trim();

      const resp = await fetch('/api/admin-config', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify(body)
      });
      const data = await resp.json();
      if (resp.ok) {
        setAdminSaveMsg('✅ ' + data.message);
        setAdminConfig(prev => ({ ...prev, newPassword: '' }));
        // Reload config cho GV
        fetchRouterConfig();
      } else if (resp.status === 207) {
        // Partial success — some env vars failed
        const failedKeys = data.results ? Object.entries(data.results).filter(([_, v]) => v === '❌').map(([k]) => k).join(', ') : '';
        setAdminSaveMsg(`⚠️ ${data.message}${failedKeys ? ` (Lỗi: ${failedKeys})` : ''}. Kiểm tra lại VERCEL_TOKEN có quyền env:write.`);
      } else {
        setAdminSaveMsg('❌ ' + (data.error || 'Lỗi không xác định'));
      }
    } catch (e: any) {
      setAdminSaveMsg('❌ Lỗi kết nối: ' + e.message);
    }
    setAdminSaving(false);
  };

  useEffect(() => {
    const unsubscribe = onAISourceChange((source, error, model) => {
      setAiSource(source);
      setAiSourceError(error);
      if (model) setAiModelUsed(model);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    // Khởi tạo: Load config 9Router từ server (admin quản lý)
    fetchRouterConfig().then(() => {
      // restoreSelectedModel đã được gọi bên trong fetchRouterConfig
      // Sync React state với model đã khôi phục
      setSelectedModel(getSelected9RouterModel());
    });
  }, []);

  const handleSaveSettings = () => {
      localStorage.setItem('custom_gemini_api_key', geminiApiKey);
      localStorage.setItem('teacherProfile', JSON.stringify(teacherProfile));
      localStorage.setItem('hasCompletedSetup', 'true');
      setHasCompletedSetup(true);
      if (!hasChosenSubject && subject) setHasChosenSubject(true);
      setShowSettings(false);
  };

  const getSubjectIcon = (subj: Subject) => {
      switch (subj) {
          case Subject.Toan: return <Calculator className="w-4 h-4" />;
          case Subject.TiengViet: return <Type className="w-4 h-4" />;
          case Subject.NguVan: return <PenSquare className="w-4 h-4" />;
          case Subject.TinHoc: return <BrainCircuit className="w-4 h-4" />;
          case Subject.HDTN: return <Compass className="w-4 h-4" />;
          case Subject.KHTN: return <FlaskConical className="w-4 h-4" />;
          case Subject.LSDL: return <Map className="w-4 h-4" />;
          case Subject.GDCD: return <Globe className="w-4 h-4" />;
          case Subject.TiengAnh: return <Activity className="w-4 h-4" />;
          case Subject.GDTC: return <Activity className="w-4 h-4" />;
          case Subject.NgheThuat: return <Palette className="w-4 h-4" />;
          case Subject.CongNghe: return <Wrench className="w-4 h-4" />;
          case Subject.AmNhac: return <Music className="w-4 h-4" />;
          default: return <BookOpen className="w-4 h-4" />;
      }
  };
  const [saveState, setSaveState] = useState<SaveState>('idle');
  
  // Lesson Plan State
  const [lessonResult, setLessonResult] = useState<LessonPlanResponse | null>(null);
  const [docFiles, setDocFiles] = useState<File[]>([]);
  const [regeneratingImageIndex, setRegeneratingImageIndex] = useState<number | null>(null);
  
  // New State for Weekly Planner
  const [isWeeklyMode, setIsWeeklyMode] = useState(false);
  const [currentWeekName, setCurrentWeekName] = useState("Tuần 1");
  const [lessonItems, setLessonItems] = useState<LessonItem[]>([]);
  const [tempTopic, setTempTopic] = useState("");
  const [tempDuration, setTempDuration] = useState("1 tiết");
  const [tempSpecificPeriod, setTempSpecificPeriod] = useState("");

  const [lessonInput, setLessonInput] = useState<UserInput>({
    subject: Subject.Toan,
    topic: '',
    grade: GradeLevel.Grade6,
    duration: '1 tiết (45 phút)',
    context: '',
    images: [] 
  });

  // Exam State
  const [examInput, setExamInput] = useState<ExamInput>({
    subject: Subject.Toan,
    grade: GradeLevel.Grade6,
    topic: '',
    duration: '45 phút',
    matrixType: 'CV7991',
    difficulty: '4-3-2-1',
    context: '',
    tnPercent: 70,
    tlPercent: 30,
    tnTypes: ['1-dap-an', 'dung-sai', 'tra-loi-ngan'],
  });
  const [examResult, setExamResult] = useState<ExamResponse | null>(null);

  // PDF Processing State (shared between converter and similar-exam)
  const [pdfFiles, setPdfFiles] = useState<File[]>([]);
  const [pageImagesForPdf, setPageImagesForPdf] = useState<string[]>([]);
  const [extractedImages, setExtractedImages] = useState<ExtractedImage[]>([]);
  const [pdfProcessed, setPdfProcessed] = useState(false);
  const [numSimilarExercises, setNumSimilarExercises] = useState(3);
  const [similarExamContext, setSimilarExamContext] = useState('');
  const [docxText, setDocxText] = useState<string | null>(null);
  const [pdfPageRange, setPdfPageRange] = useState<string>(''); // NEW STATE
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false); // NEW STATE for preview modal
  
  // Worksheet State
  const [worksheetInput, setWorksheetInput] = useState({
    topic: '',
    duration: '45 phút',
    difficulty: 'Cơ bản & Nâng cao',
    numQuestions: '10',
    context: '',
    tnTypes: ['1-dap-an'] as ('1-dap-an' | 'dung-sai' | 'tra-loi-ngan')[],
  });
  const [worksheetResult, setWorksheetResult] = useState<ExamResponse | null>(null);
  // NEW STATE: Option to include images in Word
  const [includeImagesInWord, setIncludeImagesInWord] = useState(true);

  // SHCM State
  const [shcmInput, setShcmInput] = useState<{
    schoolName: string;
    groupName: string;
    academicYear: string;
    leaderName: string;
    hostName: string;
    vicePrincipalName: string;
    secretaryName: string;
    teachers: TeacherInfo[];
    requirements: string;
    selectedMonths: number[];
    includeGeneralPlan: boolean;
    customTopics: string;
    contentLength: string;
  }>(() => {
    try {
      const saved = localStorage.getItem('shcmInputSettings');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error("Lỗi khi tải cấu hình SHCM", e);
    }
    return {
      schoolName: teacherProfile?.schoolName || 'THCS LIÊN CHÂU',
      groupName: teacherProfile?.groupName || 'Tin học',
      academicYear: '2025 - 2026',
      leaderName: 'Trần Thị Mai',
      hostName: 'Trần Thị Mai',
      vicePrincipalName: 'Lê Văn A',
      secretaryName: 'Hà Thị Khánh Linh',
      teachers: [
        { name: 'Lê Văn Đạt', birthYear: '1989', specialty: 'Toán tin', degree: 'Đại học' },
        { name: 'Hà Thị Khánh Linh', birthYear: '2002', specialty: 'Sư phạm Toán', degree: 'Đại học' },
        { name: 'Nguyễn Thị Thoan', birthYear: '1988', specialty: 'SP Tiếng anh', degree: 'Đại học' }
      ],
      requirements: 'Tập trung vào đổi mới phương pháp dạy học, tăng cường ứng dụng CNTT, và sinh hoạt theo hướng nghiên cứu bài học.',
      selectedMonths: [],
      includeGeneralPlan: true,
      customTopics: '',
      contentLength: '300-500'
    };
  });

  const [shcmResult, setShcmResult] = useState<SHCMData | null>(null);

  useEffect(() => {
    localStorage.setItem('shcmInputSettings', JSON.stringify(shcmInput));
  }, [shcmInput]);

  const resetPdfState = () => {
    setPdfFiles([]);
    setPageImagesForPdf([]);
    setExtractedImages([]);
    setPdfProcessed(false);
    setExamResult(null);
    setDocxText(null);
  };

  const handleDownloadSHCM = async () => {
      if (!shcmResult) {
          alert("Chưa có nội dung SHCM để tải về.");
          return;
      }
      await downloadSHCMDocument(shcmResult);
  };

  const handleGenerateSHCM = async () => {
      setLoading(true);
      setShcmResult(null);
      try {
          const result = await generateSHCM(
              shcmInput.schoolName,
              shcmInput.groupName,
              shcmInput.academicYear,
              subject,
              shcmInput.requirements,
              shcmInput.selectedMonths,
              shcmInput.includeGeneralPlan,
              shcmInput.leaderName,
              shcmInput.hostName,
              shcmInput.secretaryName,
              shcmInput.teachers,
              shcmInput.customTopics,
              shcmInput.contentLength || '300-500',
              setLoadingText
          );
          if (result) {
              setShcmResult({
                  ...result,
                  schoolName: shcmInput.schoolName,
                  groupName: shcmInput.groupName,
                  academicYear: shcmInput.academicYear,
                  leaderName: shcmInput.leaderName,
                  hostName: shcmInput.hostName,
                  vicePrincipalName: shcmInput.vicePrincipalName,
                  secretaryName: shcmInput.secretaryName,
                  teachers: shcmInput.teachers
              });
              // Auto-save SHCM to history
              addToHistory({ type: 'shcm', title: `SHCM ${shcmInput.groupName} - ${shcmInput.academicYear}`, subject: shcmInput.groupName, grade: '', data: result, preview: `${shcmInput.selectedMonths.length || 'Cả năm'} tháng` });
              refreshHistory();
          }
      } catch (err: any) {
           handleApiError(err);
      } finally {
          setLoading(false);
      }
  };

  const parsePageRange = (rangeStr: string): number[] | undefined => {
    if (!rangeStr.trim()) return undefined;
    
    // Clean string: replace "đến", "to", "->" with "-"
    let formattedStr = rangeStr.toLowerCase().replace(/đến/g, '-').replace(/to/g, '-');
    let cleanStr = formattedStr.replace(/[^\d,\-]/g, '');
    if (!cleanStr) return undefined;

    const parts = cleanStr.split(',');
    const pages = new Set<number>();
    for (const part of parts) {
        const trimmed = part.trim();
        if (trimmed.includes('-')) {
            const bounds = trimmed.split('-');
            if (bounds.length >= 2) {
                const start = parseInt(bounds[0], 10);
                const end = parseInt(bounds[1], 10);
                if (!isNaN(start) && !isNaN(end) && start <= end) {
                    for (let i = start; i <= end; i++) {
                        pages.add(i);
                    }
                }
            }
        } else {
            const num = parseInt(trimmed, 10);
            if (!isNaN(num)) {
                pages.add(num);
            }
        }
    }
    const arr = Array.from(pages).sort((a,b) => a - b);
    return arr.length > 0 ? arr : undefined;
  };

  // --- File/Paste Handlers for Converter/Similar-Exam tabs ---
  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = (reader.result as string).split(',')[1];
        resolve(base64String);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

    const cropImagesFromPages = (pageImages: string[], locations: ImageLocation[]): Promise<ExtractedImage[]> => {
        const PADDING_PERCENT = 0.015; // Add 1.5% padding to each side

        const cropPromises = locations.map(loc => {
            return new Promise<ExtractedImage>((resolve, reject) => {
                if (loc.pageIndex >= pageImages.length) {
                    return reject(`Invalid pageIndex ${loc.pageIndex} provided by AI.`);
                }
                const pageImageBase64 = pageImages[loc.pageIndex];
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');

                    // Add padding to the location coordinates, ensuring they stay within bounds [0, 1]
                    const paddedLoc = {
                        x: Math.max(0, loc.x - PADDING_PERCENT),
                        y: Math.max(0, loc.y - PADDING_PERCENT),
                        width: loc.width + PADDING_PERCENT * 2,
                        height: loc.height + PADDING_PERCENT * 2,
                    };
                    // Ensure the padded box does not exceed page boundaries
                    if (paddedLoc.x + paddedLoc.width > 1) {
                        paddedLoc.width = 1 - paddedLoc.x;
                    }
                    if (paddedLoc.y + paddedLoc.height > 1) {
                        paddedLoc.height = 1 - paddedLoc.y;
                    }
                    
                    // Convert padded percentage to pixel values
                    const sx = img.width * paddedLoc.x;
                    const sy = img.height * paddedLoc.y;
                    const sWidth = img.width * paddedLoc.width;
                    const sHeight = img.height * paddedLoc.height;

                    if (sWidth <= 0 || sHeight <= 0) {
                        return reject(`Invalid image dimensions calculated for page ${loc.pageIndex}`);
                    }

                    canvas.width = sWidth;
                    canvas.height = sHeight;

                    const ctx = canvas.getContext('2d');
                    if (!ctx) return reject('Could not get canvas context');
                    
                    ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, sWidth, sHeight);

                    canvas.toBlob(async (blob) => {
                        if (!blob) return reject('Canvas to Blob failed');
                        try {
                            const buffer = await blob.arrayBuffer();
                            const base64 = await blobToBase64(blob);
                            resolve({
                                base64,
                                buffer,
                                mimeType: 'image/png',
                                width: sWidth,
                                height: sHeight,
                                pageIndex: loc.pageIndex // Important: Pass pageIndex through
                            });
                        } catch(e) {
                            reject(e);
                        }
                    }, 'image/png');
                };
                img.onerror = (err) => reject(err);
                img.src = `data:image/png;base64,${pageImageBase64}`;
            });
        });

        return Promise.all(cropPromises);
    };
  
  const handleFiles = async (files: File[]) => {
      if (!files || files.length === 0) return;
      resetPdfState();
      
      const pdfs = files.filter(f => f.type === 'application/pdf');
      const images = files.filter(f => f.type.startsWith('image/'))
                          .sort((a, b) => a.name.localeCompare(b.name, undefined, {numeric: true, sensitivity: 'base'}));
      const wordDocs = files.filter(f => f.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || f.name.endsWith('.docx'));

      if ((pdfs.length > 0 && images.length > 0) || (wordDocs.length > 0 && (pdfs.length > 0 || images.length > 0))) {
          alert("Vui lòng không chọn kết hợp nhiều loại file khác nhau.");
          return;
      }
      if (pdfs.length > 1 || wordDocs.length > 1) {
          alert("Chỉ có thể xử lý một file PDF hoặc Word tại một thời điểm.");
          return;
      }
      
      // File size limit: 25MB to prevent browser memory issues
      const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB
      for (const file of files) {
          if (file.size > MAX_FILE_SIZE) {
              alert(`File "${file.name}" quá lớn (${(file.size / 1024 / 1024).toFixed(1)}MB). Kích thước tối đa cho phép là 25MB. Vui lòng chia nhỏ file hoặc giảm chất lượng ảnh.`);
              return;
          }
      }
      
      setLoading(true);
      try {
          if (wordDocs.length === 1) {
              const wordFile = wordDocs[0];
              setPdfFiles([wordFile]);
              setLoadingText("Đang đọc nội dung file Word...");
              
              const arrayBuffer = await wordFile.arrayBuffer();
              const resultValue = await extractTextFromDocx(arrayBuffer);
              setDocxText(resultValue.html);
              setExtractedImages(resultValue.extractedImages);
              setPdfProcessed(true);
          } else if (pdfs.length === 1) {
              const pdfFile = pdfs[0];
              setPdfFiles([pdfFile]);
              setLoadingText("Đang phân tích PDF và trích xuất ảnh...");
              
              const pagesToExtract = parsePageRange(pdfPageRange);
              const { pageImages, extractedImages: allBitmapImages, actualPageNumbers } = await extractPdfContent(pdfFile, pagesToExtract);
              setPageImagesForPdf(pageImages);
              
              let finalImages: ExtractedImage[] = [];

              if (allBitmapImages.length > 0) {
                  setLoadingText(`AI đang phân loại ${allBitmapImages.length} hình ảnh đã trích xuất...`);
                  try {
                      const meaningfulIndices = await filterMeaningfulImages(allBitmapImages);
                      finalImages = meaningfulIndices.map(index => allBitmapImages[index]);
                  } catch (filterError) {
                      console.error("AI image filtering failed, using all extracted images as fallback:", filterError);
                      finalImages = allBitmapImages;
                  }
              }

              // Fallback logic: If discrete extraction failed (e.g. vector images) or returned nothing interesting, try AI cropping
              if (finalImages.length === 0 && pageImages.length > 0) {
                  setLoadingText(allBitmapImages.length > 0 ? "Không tìm thấy hình ảnh phù hợp, AI đang quét lại layout..." : "Không tìm thấy ảnh bitmap, AI đang quét layout...");
                  try {
                      const imageLocations = await locateImagesInPages(pageImages);
                      if (imageLocations.length > 0) {
                          setLoadingText(`AI phát hiện ${imageLocations.length} hình ảnh, đang trích xuất...`);
                          const croppedImages = await cropImagesFromPages(pageImages, imageLocations);
                          finalImages = croppedImages;
                      }
                  } catch (aiError) {
                      console.error("AI image location/cropping failed:", aiError);
                  }
              }
              
              setExtractedImages(finalImages);
              setPdfProcessed(true);
          } else if (images.length > 0) {
              setPdfFiles(images);
              setLoadingText(`Đang phân tích layout ${images.length} file ảnh...`);
              const base64Promises = images.map(file => blobToBase64(file));
              const base64Images = await Promise.all(base64Promises);
              setPageImagesForPdf(base64Images);

              try {
                  const imageLocations = await locateImagesInPages(base64Images);
                  if (imageLocations.length > 0) {
                      setLoadingText(`AI phát hiện ${imageLocations.length} hình ảnh, đang trích xuất...`);
                      const croppedImages = await cropImagesFromPages(base64Images, imageLocations);
                      setExtractedImages(croppedImages);
                  } else {
                      setExtractedImages([]);
                  }
              } catch (aiError) {
                  console.error("AI image location fails on image upload:", aiError);
                  // Fallback to empty if we fail
                  setExtractedImages([]);
              }
              setPdfProcessed(true);
          } else {
               alert("Định dạng file không được hỗ trợ. Vui lòng chọn file PDF hoặc ảnh (PNG, JPG).");
          }
      } catch (error) {
           alert("Lỗi khi phân tích file: " + (error instanceof Error ? error.message : "Unknown Error"));
           resetPdfState();
      } finally {
          setLoading(false);
      }
  };
  
  const handlePdfFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
          await handleFiles(Array.from(e.target.files));
      }
      e.target.value = '';
  };

  useEffect(() => {
    const handlePaste = async (event: ClipboardEvent) => {
        if (activeTab !== 'converter' && activeTab !== 'similar-exam') return;

        const items = event.clipboardData?.items;
        if (!items) return;

        const files: File[] = [];
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            if (item.kind === 'file' && (item.type === 'application/pdf' || item.type.startsWith('image/'))) {
                const file = item.getAsFile();
                if (file) {
                    files.push(file);
                }
            }
        }
      
        if (files.length === 0) return;
      
        event.preventDefault();
        await handleFiles(files);
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [activeTab]);


  const handleTabChange = (newTab: TabType) => {
    // Warn if there are unsaved results
    const hasResults = lessonResult || worksheetResult || examResult || shcmResult;
    if (hasResults && newTab !== activeTab) {
        const ok = confirm("Bạn đang có kết quả chưa tải xuống. Chuyển tab sẽ mất kết quả hiện tại. Bạn có chắc chắn muốn chuyển?");
        if (!ok) return;
    }
    setActiveTab(newTab);
    // Reset results when switching tabs to avoid showing stale data
    setLessonResult(null);
    setWorksheetResult(null);
    setExamResult(null);
    setShcmResult(null);

    // If the new tab is not PDF-related, clear all PDF state
    if (newTab !== 'converter' && newTab !== 'similar-exam') {
        resetPdfState();
    }
  };
  
  useEffect(() => {
    const elementaryGrades = [GradeLevel.Grade2, GradeLevel.Grade3, GradeLevel.Grade4, GradeLevel.Grade5];
    const secondaryGrades = [GradeLevel.Grade6, GradeLevel.Grade7, GradeLevel.Grade8, GradeLevel.Grade9];

    let validGrades: GradeLevel[];
    let defaultGrade: GradeLevel;

    switch(subject) {
        case Subject.TiengViet:
            validGrades = elementaryGrades;
            defaultGrade = GradeLevel.Grade2;
            break;
        case Subject.NguVan:
        case Subject.TinHoc:
        case Subject.HDTN:
        case Subject.KHTN:
        case Subject.LSDL:
        case Subject.GDCD:
        case Subject.CongNghe:
        case Subject.AmNhac:
            validGrades = secondaryGrades;
            defaultGrade = GradeLevel.Grade6;
            break;
        case Subject.Toan:
        case Subject.TiengAnh:
        case Subject.GDTC:
        case Subject.NgheThuat:
        default:
            validGrades = [...elementaryGrades, ...secondaryGrades];
            defaultGrade = lessonInput.grade; // keep current grade if possible
            break;
    }

    // Update lesson input grade if invalid
    if (!validGrades.includes(lessonInput.grade)) {
        setLessonInput(prev => ({ ...prev, grade: defaultGrade, subject: subject, topic: '' }));
    } else {
        setLessonInput(prev => ({ ...prev, subject: subject, topic: '' }));
    }

    // Update exam input grade if invalid
    if (!validGrades.includes(examInput.grade)) {
        setExamInput(prev => ({ ...prev, grade: defaultGrade, subject: subject, topic: '' }));
    } else {
        setExamInput(prev => ({ ...prev, subject: subject, topic: '' }));
    }
}, [subject]);

// Reset save state after a short delay
useEffect(() => {
    if (saveState === 'saved' || saveState === 'error') {
        const timer = setTimeout(() => {
            setSaveState('idle');
        }, 4000);
        return () => clearTimeout(timer);
    }
}, [saveState]);


  // --- File Processing Helpers ---
  const extractTextFromPdf = async (arrayBuffer: ArrayBuffer): Promise<string> => {
    try {
      const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;
      let fullText = "";
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item: any) => item.str).join(" ");
        fullText += pageText + "\n";
      }
      return fullText;
    } catch (error) {
      console.error("Error reading PDF:", error);
      throw new Error("Không thể đọc file PDF. Vui lòng kiểm tra lại file.");
    }
  };

  const extractTextFromDocx = async (arrayBuffer: ArrayBuffer): Promise<{ html: string, extractedImages: ExtractedImage[] }> => {
    try {
      const result = await mammoth.convertToHtml({ arrayBuffer: arrayBuffer });
      let html = result.value;
      const images: ExtractedImage[] = [];
      const regex = /<img[^>]*src="data:([^;]+);base64,([^"]+)"[^>]*>/gi;
      let counter = 1;

      html = html.replace(regex, (match, mimeType, base64) => {
          // Xóa base64 khỏi chuỗi trả về để giảm tải cho AI
          const byteCharacters = atob(base64);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
              byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          
          images.push({
              base64: base64,
              buffer: byteArray.buffer,
              mimeType: mimeType,
              width: 0,
              height: 0,
              pageIndex: 0 // Default to 0 for Document
          });
          
          const placeholder = `\n[HÌNH_${counter}]\n`;
          counter++;
          return placeholder;
      });

      return { html, extractedImages: images };
    } catch (error) {
      console.error("Error reading DOCX:", error);
      throw new Error("Không thể đọc file Word.");
    }
  };

  const handleDocFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
        const newFiles = Array.from(e.target.files);
        setDocFiles(prev => [...prev, ...newFiles]);
    }
    e.target.value = '';
  };

  const removeDocFile = (index: number) => {
      const newFiles = [...docFiles];
      newFiles.splice(index, 1);
      setDocFiles(newFiles);
  };

  const downloadImage = (image: ExtractedImage, index: number) => {
    saveAs(new Blob([image.buffer], { type: image.mimeType }), `hinh_${index + 1}.png`);
  };
  
  const downloadAiImage = async (base64: string, index: number) => {
    try {
        const dataUrl = `data:image/png;base64,${base64}`;
        const blob = await (await fetch(dataUrl)).blob();
        saveAs(blob, `hinh_goi_y_${index + 1}.png`);
    } catch (error) {
        console.error("Error downloading AI image:", error);
        alert("Không thể tải hình ảnh.");
    }
  };

  // --- API Error Handler ---
  const handleApiError = (error: unknown) => {
    console.error("API Error Details:", error); // Log detailed error for debugging
    let errorMessage = error instanceof Error ? error.message : String(error);
    
    // Attempt to extract JSON from the error message string
    try {
        const jsonMatch = errorMessage.match(/\{.*\}/s);
        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            if (parsed?.error?.code === 429) {
                errorMessage = "Hệ thống đang quá tải lượt dùng AI miễn phí (chỉ được 15 lượt/phút cho toàn bộ người dùng chung). Bạn vui lòng chờ khoảng 1 phút rồi bấm thử lại nhé!";
            } else if (parsed?.error?.message) {
                errorMessage = parsed.error.message;
            }
        }
    } catch(e) {
        // Fallback if not JSON
    }

    if (errorMessage.includes("API Key is missing") || errorMessage.includes("apiKey is required")) {
        errorMessage = "⚠️ Chưa có API Key!\n\nBạn cần nhập Gemini API Key để sử dụng ứng dụng:\n1. Truy cập https://aistudio.google.com/app/apikey\n2. Tạo API Key miễn phí\n3. Bấm vào biểu tượng ⚙️ Cài đặt ở góc phải và dán Key vào\n\nHoặc liên hệ quản trị viên để được cấp Key hệ thống.";
    } else if (errorMessage.includes("429") || errorMessage.includes("RESOURCE_EXHAUSTED") || errorMessage.includes("Quota")) {
        errorMessage = "Hệ thống đang quá tải lượt dùng AI miễn phí (chỉ được 15 lượt/phút cho toàn bộ người dùng chung). Bạn vui lòng chờ khoảng 1 phút rồi bấm thử lại nhé!";
    } else if (errorMessage.toLowerCase().includes("api key not valid") || errorMessage.includes("API_KEY_INVALID")) {
        errorMessage = "API Key bạn cung cấp không hợp lệ. Vui lòng kiểm tra lại cấu hình API Key của bạn trong phần Cài đặt (hoặc xóa trắng nếu không muốn dùng key cá nhân nữa).";
    }
    
    alert("Lưu ý: " + errorMessage.replace("Error:", "").trim());
  };


  // --- Handlers ---
  const handleAddLessonItem = () => {
      if (!tempTopic.trim()) {
          alert("Vui lòng nhập tên bài học");
          return;
      }
      setLessonItems([...lessonItems, { topic: tempTopic, duration: tempDuration, specificPeriod: tempSpecificPeriod }]);
      setTempTopic("");
      setTempSpecificPeriod("");
      // Keep duration for convenience or reset? Let's keep it.
  };

  const handleRemoveLessonItem = (index: number) => {
      const newItems = [...lessonItems];
      newItems.splice(index, 1);
      setLessonItems(newItems);
  };

  const handleGenerateLesson = async () => {
    // Validation
    if (!isWeeklyMode && !lessonInput.topic) {
        alert("Vui lòng nhập tên bài dạy!");
        return;
    }
    if (isWeeklyMode && lessonItems.length === 0) {
        alert("Vui lòng thêm ít nhất một bài học vào danh sách!");
        return;
    }

    setLoading(true);
    setLessonResult(null);
    setLoadingText("Đang phân tích tài liệu...");

    try {
      let fullContext = lessonInput.context;
      if (docFiles.length > 0) {
          for (const docFile of docFiles) {
              try {
                  let extractedText = "";
                  const arrayBuffer = await docFile.arrayBuffer();
                  if (docFile.type === "application/pdf") extractedText = await extractTextFromPdf(arrayBuffer);
                  else if (docFile.type.includes("word")) extractedText = (await extractTextFromDocx(arrayBuffer)).html;
                  else extractedText = await docFile.text();

                  const maxLength = 30000;
                  if (extractedText.length > maxLength) extractedText = extractedText.substring(0, maxLength) + "\n...[Cắt bớt]";
                  fullContext += `\n\n--- TÀI LIỆU THAM KHẢO: ${docFile.name} ---\n${extractedText}`;
              } catch (e) { console.error(e); }
          }
      }

      // Construct Final Input
      const finalInput: UserInput = { 
          ...lessonInput, 
          context: fullContext,
          weekName: isWeeklyMode ? currentWeekName : undefined,
          lessonItems: isWeeklyMode ? lessonItems : undefined
      };
      
      const data = await generateLessonPlan(finalInput, setLoadingText);
      setLessonResult(data);
      // Auto-save lịch sử
      if (data) {
        addToHistory({
          type: 'lesson',
          title: data.weekName || data.topic,
          subject: data.subject || subject,
          grade: data.grade || lessonInput.grade,
          data: data,
          preview: `${data.duration} | ${data.periods?.length || 0} tiết`
        });
        refreshHistory();
      }
    } catch (error) {
      handleApiError(error);
    } finally {
      setLoading(false);
    }
  };

    const handleRegenerateAiImage = async (indexToRegenerate: number, description: string) => {
        if (regeneratingImageIndex !== null) return; // Prevent multiple requests

        setRegeneratingImageIndex(indexToRegenerate);
        try {
            const newBase64 = await generateSingleImage(description);
            if (newBase64) {
                setLessonResult(prevResult => {
                    if (!prevResult || !prevResult.generatedImages) return prevResult;
                    
                    const newImages = [...prevResult.generatedImages];
                    newImages[indexToRegenerate] = { ...newImages[indexToRegenerate], base64: newBase64 };

                    return { ...prevResult, generatedImages: newImages };
                });
            } else {
                 throw new Error("AI không trả về hình ảnh mới.");
            }
        } catch (error) {
            handleApiError(error);
        } finally {
            setRegeneratingImageIndex(null);
        }
    };


  const handleGenerateExam = async () => {
    if (!examInput.topic) {
        alert("Vui lòng nhập nội dung kiểm tra!");
        return;
    }
    setLoading(true);
    setExamResult(null);
    setLoadingText("Đang xây dựng ma trận đặc tả và biên soạn câu hỏi...");

    try {
      const data = await generateExam(examInput, setLoadingText);
      setExamResult(data);
      if (data) {
        addToHistory({ type: 'exam', title: data.title || examInput.topic, subject: examInput.subject, grade: examInput.grade, data, preview: `${examInput.duration} | ${examInput.matrixType}` });
        refreshHistory();
      }
    } catch (error) {
       handleApiError(error);
    } finally {
       setLoading(false);
    }
  };

  const handleGenerateWorksheet = async () => {
    if (!worksheetInput.topic) {
        alert("Vui lòng nhập nội dung phiếu bài tập!");
        return;
    }
    setLoading(true);
    setWorksheetResult(null);
    setLoadingText("Đang biên soạn phiếu bài tập...");

    try {
       // We'll map worksheetInput to an ExamInput interface to reuse generateExam and the UI.
       const wsContext = `Tạo một phiếu bài tập chuyên sâu gồm ${worksheetInput.numQuestions} câu. Các yêu cầu phụ thêm: ${worksheetInput.context}`;
       const tempExamInput: ExamInput = {
           subject: subject,
           grade: examInput.grade, // just use the same grade
           topic: worksheetInput.topic,
           duration: worksheetInput.duration,
           matrixType: 'CUSTOM', // bypass matrix restrictions
           difficulty: worksheetInput.difficulty,
           context: wsContext,
           tnTypes: worksheetInput.tnTypes,
       };
      const data = await generateExam(tempExamInput, setLoadingText);
      setWorksheetResult(data);
      if (data) {
        addToHistory({ type: 'worksheet', title: `Phiếu BT: ${worksheetInput.topic}`, subject, grade: lessonInput.grade, data, preview: `${worksheetInput.numQuestions} câu | ${worksheetInput.difficulty}` });
        refreshHistory();
      }
    } catch (error) {
       handleApiError(error);
    } finally {
       setLoading(false);
    }
  };

  // Helper: Lọc ảnh trang theo page range (tránh trùng lặp code ở 3 handler)
  const getFilteredTargetImages = (): { images: string[]; error: string | null } => {
    let targetImages = pageImagesForPdf;
    if (!docxText) {
        const requestedPages = parsePageRange(pdfPageRange);
        if (requestedPages && requestedPages.length > 0) {
            const filtered: string[] = [];
            for (const p of requestedPages) {
                if (p - 1 >= 0 && p - 1 < pageImagesForPdf.length) {
                    filtered.push(pageImagesForPdf[p - 1]);
                }
            }
            if (filtered.length > 0) {
                targetImages = filtered;
            } else {
                return { images: [], error: "Số trang bạn chọn không hợp lệ hoặc vượt quá số trang trích xuất được." };
            }
        }
    }
    return { images: targetImages, error: null };
  };

  // Helper: Tạo mảng ảnh cho Word document (tránh trùng lặp 5 lần)
  const getImagesForDoc = () => extractedImages.map((img, index) => ({
      placeholderId: `[HÌNH_${index + 1}]`,
      base64: img.base64,
      width: img.width,
      height: img.height
  }));

  // UPDATED: Handle long PDF documents by chunking
  const handleRegenerateExamAndDownload = async () => {
    if (pageImagesForPdf.length === 0) {
        alert("Dữ liệu PDF/ảnh chưa được phân tích. Vui lòng thử lại.");
        return;
    }
    setLoading(true);
    setExamResult(null);
    
    const { images: targetImages, error: filterError } = getFilteredTargetImages();
    if (filterError) {
        alert(filterError);
        setLoading(false);
        return;
    }

    // OPTIMIZATION: Chunk size configuration set to 3 to handle large PDFs safely
    const CHUNK_SIZE = 3; 
    const totalPages = targetImages.length;
    const totalChunks = Math.ceil(totalPages / CHUNK_SIZE);
    
    let finalExamMarkdown = "";
    let finalAnswerMarkdown = "";
    let finalTitle = "";
    let finalHeaderData: ExamHeader | undefined = undefined;

    try {
        for (let i = 0; i < totalPages; i += CHUNK_SIZE) {
            const chunkIndex = Math.floor(i / CHUNK_SIZE) + 1;
            const endPage = Math.min(i + CHUNK_SIZE, totalPages);
            const chunkImages = targetImages.slice(i, endPage);
            
            setLoadingText(`AI đang xử lý phần ${chunkIndex}/${totalChunks} (Trang ${i + 1}-${endPage})...`);
            
            let chunkData = null;
            try {
                // Call API for this chunk
                chunkData = await regenerateExamFromPdf(chunkImages, i === 0);
            } catch (chunkError: any) {
                 console.error(`Error processing chunk ${chunkIndex}:`, chunkError);
                 const errMsg = chunkError.message || "Lỗi API không xác định";
                 
                 // If we already have some data, offer partial download
                 if (finalExamMarkdown) {
                     const shouldDownload = confirm(`AI báo lỗi khi xử lý trang ${i + 1}-${endPage} (${errMsg}). Bạn có muốn tải xuống phần đề thi đã làm xong (ở các trang trước) để lưu lại tiến trình không?`);
                     if (shouldDownload) {
                         break; // Exit the loop and continue to download
                     } else {
                         throw new Error(`Tiến trình đã bị người dùng hủy sau khi gặp lỗi.`);
                     }
                 } else {
                     // Failed on the first chunk, cannot rescue anything
                     throw new Error(`Không thể xử lý đoạn đầu tiên của file. Lỗi: ${errMsg}`);
                 }
            }
            
            if (chunkData) {
                // Keep title and header data from the first chunk
                if (i === 0) {
                    finalTitle = chunkData.title;
                    finalHeaderData = chunkData.headerData;
                }

                // 1. Calculate how many images appeared in previous chunks (extractedImages is global list)
                // We filter extractedImages where pageIndex < current chunk start index (i)
                const imagesBeforeChunkCount = extractedImages.filter(img => img.pageIndex < i).length;

                // 2. Adjust Image Placeholders in the received Markdown
                // AI generates [HÌNH_1], [HÌNH_2] relative to the chunk it sees.
                // We need to shift these to [HÌNH_(1 + count)], [HÌNH_(2 + count)]...
                const shiftImagePlaceholders = (md: string) => {
                    return md.replace(/\[HÌNH_(\d+)\]/gi, (match, p1) => {
                         const originalIndex = parseInt(p1, 10);
                         const newIndex = originalIndex + imagesBeforeChunkCount;
                         return `[HÌNH_${newIndex}]`;
                    });
                };

                const processedExamMarkdown = shiftImagePlaceholders(chunkData.examMarkdown);
                const processedAnswerMarkdown = shiftImagePlaceholders(chunkData.answerMarkdown || "");

                // 3. Append to final result
                finalExamMarkdown += (finalExamMarkdown ? "\n\n" : "") + processedExamMarkdown;
                if (processedAnswerMarkdown) {
                    finalAnswerMarkdown += (finalAnswerMarkdown ? "\n\n" : "") + processedAnswerMarkdown;
                }
            } else {
                 console.warn(`Warning: Failed to process chunk ${chunkIndex}, chunkData null.`);
                 if (finalExamMarkdown) {
                     const shouldDownload = confirm(`Lỗi (kết quả rỗng) khi xử lý trang ${i + 1}-${endPage}. Bạn có muốn tải xuống phần đề thi đã làm xong không?`);
                     if (shouldDownload) {
                         break; // Exit the loop and continue to download
                     } else {
                         throw new Error(`Đã hủy tiến trình soạn.`);
                     }
                 } else {
                     throw new Error(`Không thể trích xuất nội dung nào từ tài liệu. Vui lòng thử lại.`);
                 }
            }
        }

        if (finalExamMarkdown) {
            setLoadingText("Hoàn tất...");
            
            // Map all extracted images to placeholders for the Word generator
            const imagesForDoc = getImagesForDoc();

            const combinedData: ExamResponse = {
                title: finalTitle || "Đề thi soạn lại",
                examMarkdown: finalExamMarkdown,
                answerMarkdown: finalAnswerMarkdown,
                matrixMarkdown: "", // Not applicable for regeneration
                subject: subject,
                grade: examInput.grade,
                headerData: finalHeaderData,
                generatedImages: includeImagesInWord ? imagesForDoc : undefined
            };

            setExamResult(combinedData);
        } else {
            throw new Error("AI không thể tạo lại đề thi từ file PDF/ảnh này. Vui lòng thử lại hoặc chia nhỏ file.");
        }
    } catch (error) {
        handleApiError(error);
    } finally {
        setLoading(false);
    }
  };

    const handleGenerateSimilarExercises = async () => {
        if (pageImagesForPdf.length === 0 && !docxText) {
            alert("Chưa có file nào được phân tích. Vui lòng tải lên một file.");
            return;
        }
        setLoading(true);
        setExamResult(null);
        setLoadingText(`AI đang tạo ${numSimilarExercises} bài tập tương tự...`);
        try {
            let exercises = null;
            if (docxText) {
                exercises = await generateSimilarExercisesFromDocx(docxText, numSimilarExercises, similarExamContext);
            } else {
                exercises = await generateSimilarExercisesFromPdf(pageImagesForPdf, numSimilarExercises, similarExamContext);
            }
            
            if (exercises && exercises.length > 0) {
                const combinedExamMarkdown = exercises.map((ex, i) => `### BÀI TẬP ${i + 1}\n\n${ex.problemMarkdown}`).join('\n\n---\n');
                const combinedAnswerMarkdown = exercises.map((ex, i) => `### LỜI GIẢI BÀI TẬP ${i + 1}\n\n${ex.solutionMarkdown}`).join('\n\n---\n');

                const imagesForDoc = getImagesForDoc();
                const similarExamData: ExamResponse = {
                    title: `Bộ ${exercises.length} bài tập tương tự - ${subject}`,
                    subject: subject,
                    grade: examInput.grade,
                    duration: 'Tự luyện',
                    matrixMarkdown: '', // No matrix for exercises
                    examMarkdown: combinedExamMarkdown,
                    answerMarkdown: combinedAnswerMarkdown,
                    generatedImages: includeImagesInWord ? imagesForDoc : undefined
                };
                setExamResult(similarExamData);
            } else {
                throw new Error("AI không thể tạo bài tập tương tự từ file này.");
            }
        } catch (error) {
             handleApiError(error);
        } finally {
            setLoading(false);
        }
    };
    
    const handleGenerateSimilarExam = async () => {
        if (pageImagesForPdf.length === 0 && !docxText) {
            alert("Chưa có file nào được phân tích. Vui lòng tải lên một file.");
            return;
        }
        setLoading(true);
        setExamResult(null);
        setLoadingText("AI đang phân tích cấu trúc và tạo đề thi mới...");
        
        const { images: targetImages, error: filterError } = getFilteredTargetImages();
        if (filterError) {
            alert(filterError);
            setLoading(false);
            return;
        }

        try {
            // Generate a random seed to ensure unique variations
            const seed = Math.floor(Math.random() * 1000000);
            let data = null;
            if (docxText) {
                // Feature: Generate similar exam from Word document
                data = await generateSimilarExamFromDocx(docxText, seed, setLoadingText, similarExamContext);
            } else {
                data = await generateSimilarExamFromPdf(targetImages, seed, similarExamContext);
            }
            if (data) {
                const imagesForDoc = getImagesForDoc();
                data.generatedImages = includeImagesInWord ? imagesForDoc : undefined;
                setExamResult(data);
            } else {
                throw new Error("AI không thể tạo đề thi tương tự từ file này.");
            }
        } catch (error) {
            handleApiError(error);
        } finally {
            setLoading(false);
        }
    };

    const handleGenerateMatrixForExam = async () => {
        if (pageImagesForPdf.length === 0 && !docxText) {
            alert("Chưa có file nào được phân tích. Vui lòng tải lên một file.");
            return;
        }

        setLoading(true);
        setLoadingText("AI đang phân tích và lập ma trận cho đề gốc...");
        
        const { images: targetImages, error: filterError } = getFilteredTargetImages();
        if (filterError) {
            alert(filterError);
            setLoading(false);
            return;
        }

        try {
            let data = null;
            if (docxText) {
                data = await generateMatrixFromDocx(docxText, setLoadingText);
            } else {
                data = await generateMatrixFromPdf(targetImages, setLoadingText);
            }
            
            if (data) {
                // To keep the full file without destructing what is already transcribed:
                if (examResult) {
                    setExamResult({
                        ...examResult,
                        matrixMarkdown: data.matrixMarkdown
                    });
                } else {
                    // If no existing result (e.g. they uploaded DOCX and didn't generate anything else first)
                    // we output just the matrix so they can download it
                    setExamResult({
                        title: data.title + " - Ma Trận",
                        matrixMarkdown: data.matrixMarkdown,
                        examMarkdown: ">>> **BẠN VỪA YÊU CẦU LẬP MA TRẬN TỪ ĐỀ WORD GỐC.**\n>>> Bạn có thể tải file Word xuống để nhận file **CHỈ BẢNG MA TRẬN**, sau đó Copy dán vào file gốc của bạn để đảm bảo không mất hình ảnh hay định dạng cũ.\n>>> Hoặc bạn có thể xem Bảng Ma trận ở bên dưới.",
                        answerMarkdown: ""
                    });
                }
            } else {
                throw new Error("AI không thể tạo ma trận từ file này.");
            }
        } catch (error) {
            handleApiError(error);
        } finally {
            setLoading(false);
        }
    };

    const handleShuffleDocx = async () => {
        if (!docxText) {
            alert("Chức năng đảo nhanh chỉ khả dụng khi tải lên file Word (.docx).");
            return;
        }
        setLoading(true);
        setExamResult(null);
        setLoadingText("AI đang đảo trắc nghiệm đề thi siêu tốc...");
        try {
            const seed = Math.floor(Math.random() * 1000000);
            const data = await shuffleDocxExam(docxText, seed, setLoadingText);
            if (data) {
                const imagesForDoc = getImagesForDoc();
                data.generatedImages = includeImagesInWord ? imagesForDoc : undefined;
                setExamResult(data);
            } else {
                throw new Error("AI không thể đảo đề thi từ file này.");
            }
        } catch (error) {
            handleApiError(error);
        } finally {
            setLoading(false);
        }
    };

    const handleGenerateOutline = async () => {
        if (pageImagesForPdf.length === 0 && !docxText) {
            alert("Chưa có file nào được phân tích. Vui lòng tải lên một file.");
            return;
        }
        setLoading(true);
        setExamResult(null);
        setLoadingText("AI đang biên soạn đề cương ôn tập dựa trên đề gốc...");
        try {
            let outlineData: ReviewOutlineGroup[] | null = null;
            if (docxText) {
                outlineData = await generateOutlineFromDocx(docxText);
            } else {
                outlineData = await generateOutlineFromPdf(pageImagesForPdf);
            }
            
            if (outlineData && outlineData.length > 0) {
                let combinedExamMarkdown = "";
                let combinedAnswerMarkdown = "";

                outlineData.forEach((group, index) => {
                    const topicHeader = `## CHỦ ĐỀ ${index + 1}: ${group.topicTitle}`;
                    
                    combinedExamMarkdown += `${topicHeader}\n`;
                    combinedExamMarkdown += `**Phương pháp giải:**\n${group.method}\n\n`;
                    if (group.originalQuestionMarkdown) {
                         combinedExamMarkdown += `**Câu hỏi gốc tham khảo:**\n${group.originalQuestionMarkdown}\n\n`;
                    }
                    combinedExamMarkdown += `**Bài tập tự luyện:**\n`;

                    combinedAnswerMarkdown += `${topicHeader}\n`;

                    group.similarExercises.forEach((ex, exIndex) => {
                         combinedExamMarkdown += `\n**Bài ${exIndex + 1}:**\n${ex.problemMarkdown}\n`;
                         combinedAnswerMarkdown += `\n**Bài ${exIndex + 1}:**\n${ex.solutionMarkdown}\n`;
                    });

                    combinedExamMarkdown += `\n---\n\n`;
                    combinedAnswerMarkdown += `\n---\n\n`;
                });

                const imagesForDoc = getImagesForDoc();
                const similarExamData: ExamResponse = {
                    title: `Đề cương ôn tập - ${subject}`,
                    subject: subject,
                    grade: examInput.grade,
                    duration: 'Tự luyện',
                    matrixMarkdown: '', // No matrix for outline
                    examMarkdown: combinedExamMarkdown,
                    answerMarkdown: combinedAnswerMarkdown,
                    generatedImages: includeImagesInWord ? imagesForDoc : undefined
                };
                setExamResult(similarExamData);
            } else {
                throw new Error("AI không thể tạo đề cương từ file này.");
            }
        } catch (error) {
            handleApiError(error);
        } finally {
            setLoading(false);
        }
    };

    const handleDownloadSimilarExam = async () => {
        if (!examResult) {
            alert("Chưa có đề thi nào để tải về.");
            return;
        }
        setLoading(true);
        setLoadingText("Đang tạo file Word...");
        try {
            const mockExamInputForDownload: ExamInput = {
                subject: (examResult.subject as Subject) || subject,
                grade: (examResult.grade as GradeLevel) || examInput.grade,
                duration: examResult.duration || '120 phút',
                topic: examResult.title || 'Đề thi tương tự',
                matrixType: 'CV7991',
                difficulty: '4-3-2-1',
                context: ''
            };
            
            let customFileName = undefined;
            if (pdfFiles.length > 0 && examResult.seed) {
                 const baseName = pdfFiles[0].name.replace(/\.[^/.]+$/, "");
                 customFileName = `${baseName} - Mã đề ${examResult.seed}`;
            }

            await downloadExamDocument(examResult, mockExamInputForDownload, examResult.generatedImages || [], customFileName, teacherProfile);
             alert("Đã tải về file Word thành công!");
        } catch (error) {
            alert("Lỗi khi tải file Word: " + (error instanceof Error ? error.message : "Unknown Error"));
        } finally {
             setLoading(false);
        }
    };

  const handleSaveToGoogleDocs = async () => {
    if (!accessToken || (!lessonResult && !examResult && !worksheetResult)) return;

    setSaveState('saving');
    try {
        let doc;
        let fileName = "";
        
        if (activeTab === 'lesson' && lessonResult) {
            doc = generateLessonPlanDoc(lessonResult, teacherProfile);
            if (lessonResult.weekName) fileName = `Giáo án_${lessonResult.weekName}`;
            else fileName = `Giáo án_${lessonResult.topic}`;
        } else if ((activeTab === 'exam' || activeTab === 'similar-exam' || activeTab === 'converter') && examResult) {
             const currentExamInput = activeTab === 'exam' 
                ? examInput 
                : ({
                    subject: (examResult.subject as Subject) || subject,
                    grade: (examResult.grade as GradeLevel) || GradeLevel.Grade9,
                    duration: examResult.duration || '120 phút',
                    topic: examResult.title,
                    matrixType: 'CV7991',
                    difficulty: '4-3-2-1',
                    context: ''
                } as ExamInput);
            doc = generateExamDoc(examResult, currentExamInput, examResult.generatedImages || [], teacherProfile);
            fileName = `Đề thi_${examResult.title}`;
        } else if (activeTab === 'worksheet' && worksheetResult) {
            const wsExamInput: ExamInput = {
                subject: subject,
                grade: examInput.grade,
                duration: worksheetInput.duration,
                topic: worksheetResult.title || worksheetInput.topic,
                matrixType: 'CUSTOM',
                difficulty: '4-3-2-1',
                context: 'phiếu bài tập'
            };
            doc = generateExamDoc(worksheetResult, wsExamInput, worksheetResult.generatedImages || [], teacherProfile);
            fileName = `Phiếu BT_${worksheetResult.title || worksheetInput.topic}`;
        }
        
        if (doc) {
            const blob = await Packer.toBlob(doc);
            const docUrl = await uploadToGoogleDocs(blob, fileName, accessToken);
            setSaveState('saved');
            window.open(docUrl, '_blank');
        } else {
            throw new Error("Không có nội dung để lưu.");
        }

    } catch (error) {
        console.error("Failed to save to Google Docs:", error);
        setSaveState('error');
        alert("Lỗi khi lưu vào Google Docs: " + (error instanceof Error ? error.message : "Unknown"));
    }
  };


  const currentGrade = activeTab === 'lesson' ? lessonInput.grade : examInput.grade;
  const currentCurriculum = useMemo(() => {
    switch (subject) {
        case Subject.Toan:
            return TOAN_KNTT_CURRICULUM.find(c => c.grade === currentGrade);
        case Subject.TinHoc:
            return TINHOC_KNTT_CURRICULUM.find(c => c.grade === currentGrade);
        case Subject.HDTN:
            return HDTN_KNTT_CURRICULUM.find(c => c.grade === currentGrade);
        case Subject.TiengViet:
            return TIENGVIET_KNTT_CURRICULUM.find(c => c.grade === currentGrade);
        case Subject.NguVan:
            return NGUVAN_KNTT_CURRICULUM.find(c => c.grade === currentGrade);
        case Subject.KHTN:
            return KHTN_KNTT_CURRICULUM.find(c => c.grade === currentGrade);
        case Subject.LSDL:
            return LSDL_KNTT_CURRICULUM.find(c => c.grade === currentGrade);
        case Subject.GDCD:
            return GDCD_KNTT_CURRICULUM.find(c => c.grade === currentGrade);
        case Subject.CongNghe:
            return CONGNHE_KNTT_CURRICULUM.find(c => c.grade === currentGrade);
        case Subject.AmNhac:
            return AMNHAC_KNTT_CURRICULUM.find(c => c.grade === currentGrade);
        case Subject.TiengAnh:
            return TIENGANH_KNTT_CURRICULUM.find(c => c.grade === currentGrade);
        case Subject.GDTC:
            return GDTC_KNTT_CURRICULUM.find(c => c.grade === currentGrade);
        case Subject.NgheThuat:
            return MYTHUAT_KNTT_CURRICULUM.find(c => c.grade === currentGrade);
        default:
            return undefined;
    }
  }, [currentGrade, subject]);

  const availableGrades = useMemo(() => {
        const elementary = [GradeLevel.Grade2, GradeLevel.Grade3, GradeLevel.Grade4, GradeLevel.Grade5];
        const secondary = [GradeLevel.Grade6, GradeLevel.Grade7, GradeLevel.Grade8, GradeLevel.Grade9];
        switch (subject) {
            case Subject.TiengViet: return elementary;
            case Subject.NguVan:
            case Subject.TinHoc:
            case Subject.HDTN:
            case Subject.KHTN:
            case Subject.LSDL:
            case Subject.GDCD:
            case Subject.CongNghe:
            case Subject.AmNhac: return secondary;
            case Subject.Toan:
            case Subject.TiengAnh:
            case Subject.GDTC:
            case Subject.NgheThuat:
            default: return [...elementary, ...secondary];
        }
    }, [subject]);
    
    const handleLessonSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const value = e.target.value;
        if (!value) return;

        if (value.startsWith('__CHAPTER__|')) {
            const parts = value.split('|');
            const chapterName = parts[1];
            const lessonsList = parts[2];
            const fullTopic = `${chapterName} (Gồm các bài: ${lessonsList})`;
            
            if (isWeeklyMode) {
                 setTempTopic(fullTopic);
                 setTempDuration("Nhiều tiết");
                 setTempSpecificPeriod("");
            } else {
                setLessonInput(prev => ({...prev, topic: fullTopic, duration: "Nhiều tiết" }));
            }
            e.target.value = "";
            return;
        }

        const [topic, periodsStr] = value.split('|');
        const periods = parseInt(periodsStr, 10);

        let duration = '1 tiết'; // Default
        if (!isNaN(periods) && periods > 0) {
            duration = `${periods} tiết`;
        }
        
        if (isWeeklyMode) {
             setTempTopic(topic);
             setTempDuration(duration);
             setTempSpecificPeriod(""); // Reset specific period on new selection
        } else {
            setLessonInput(prev => ({...prev, topic: topic, duration: duration }));
        }
        e.target.value = "";
    };

    const handleExamTopicSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const value = e.target.value;
        if (!value) return;
        
        if (value.startsWith('__CHAPTER__|')) {
            const parts = value.split('|');
            const chapterName = parts[1];
            const lessonsList = parts[2];
            const fullTopic = `${chapterName} (Gồm các bài: ${lessonsList})`;
            setExamInput(prev => ({...prev, topic: prev.topic ? prev.topic + "\n+ " + fullTopic : "+ " + fullTopic}));
            e.target.value = "";
            return;
        }

        const [topic] = value.split('|');
        setExamInput(prev => ({...prev, topic: prev.topic ? prev.topic + ", " + topic : topic}));
        e.target.value = "";
    };
  
  // Helper to render markdown content safely
  // Helper: Tên model thân thiện cho GV
  const getFriendlyModelName = (model: string): string => {
      if (!model) return '';
      const m = model.toLowerCase();
      if (m.includes('claude') && m.includes('opus')) return '🧠 Claude Opus (Cao cấp nhất)';
      if (m.includes('claude') && m.includes('sonnet')) return '🧠 Claude Sonnet';
      if (m.includes('gpt') && m.includes('4')) return '🤖 GPT-4';
      if (m.includes('o3') || m.includes('o4')) return '🤖 OpenAI ' + model;
      if (m.includes('gemini') && m.includes('3.7')) return '💎 Gemini 3.7 Flash';
      if (m.includes('gemini') && m.includes('3.5')) return '💎 Gemini 3.5 Flash';
      if (m.includes('gemini') && m.includes('2.5-pro')) return '💎 Gemini 2.5 Pro';
      if (m.includes('gemini') && m.includes('2.5')) return '💎 Gemini 2.5 Flash';
      if (m.includes('gemini')) return '💎 Gemini ' + model.replace(/^.*gemini-?/i, '');
      return model;
  };

  const renderMarkdown = (content: string) => {
    // Post-process: Sửa lỗi LaTeX phổ biến do AI sinh ra trước khi render
    const fixedContent = fixLatexErrors(content);
    return (
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
            p: ({node, ...props}) => <p {...props} className="mb-3 leading-relaxed text-justify" />,
            span: ({node, ...props}) => {
                const text = (node?.children[0] as any)?.value || '';
                if (text.startsWith('[TD.') && text.endsWith(']')) {
                    return <span className="inline-flex items-center px-2 py-0.5 mx-1 rounded text-[11px] font-bold bg-purple-100 text-purple-700 border border-purple-200 align-middle shadow-sm" title="Năng lực Tin học / Chuyển đổi số">{text}</span>;
                }
                const imageMatch = text.trim().match(/^\[H[IÌ]NH_(\d+)\]$/i);
                // Mở rộng render ảnh cho cả ảnh trích xuất và ảnh do AI sinh ra
                if (imageMatch) { 
                    const placeholderId = `[HÌNH_${imageMatch[1]}]`;
                    let src = null;

                    // 1. Tìm trong danh sách ảnh do AI sinh ra (nếu có)
                    const genImg = examResult?.generatedImages?.find(img => img.placeholderId === placeholderId);
                    if (genImg && genImg.base64) {
                        src = `data:image/png;base64,${genImg.base64}`;
                    } 
                    // 2. Tìm trong danh sách ảnh trích xuất từ PDF (nếu ở tab Converter/Similar Exam)
                    else if (activeTab === 'converter' || activeTab === 'similar-exam') {
                        const imgIndex = parseInt(imageMatch[1], 10) - 1;
                        if(extractedImages[imgIndex]) {
                            src = `data:${extractedImages[imgIndex].mimeType};base64,${extractedImages[imgIndex].base64}`;
                        }
                    }

                    if (src) {
                        return <img src={src} alt={placeholderId} className="block my-4 p-2 border-2 border-dashed border-indigo-300 bg-indigo-50 rounded-lg max-w-sm mx-auto shadow-sm" />;
                    } else {
                        return <span className="inline-block px-2 py-1 bg-yellow-100 text-yellow-800 font-mono text-sm rounded border border-yellow-300" title="Đang chờ họa sĩ AI vẽ hoặc không tìm thấy...">Hiển thị lỗi tải Hình {imageMatch[1]}</span>;
                    }
                }
                if (text.includes('[HÌNH ẢNH:')) {
                    return <span className="block my-4 p-4 border-2 border-dashed border-indigo-300 bg-indigo-50 text-indigo-700 text-center font-medium rounded-lg">{text}</span>;
                }
                return <span {...props} />;
            }
        }}
    >
        {fixedContent}
    </ReactMarkdown>
    );
  };

  const getLessonPlanOrgName = () => {
        if (teacherProfile.groupName) return teacherProfile.groupName.toUpperCase();
        if (!lessonResult) return "";
        switch (lessonResult.subject) {
            case Subject.Toan: return "TỔ KHOA HỌC TỰ NHIÊN";
            case Subject.TinHoc: return "TỔ TIN HỌC - CÔNG NGHỆ";
            case Subject.TiengViet: return "TỔ CHUYÊN MÔN TIỂU HỌC";
            case Subject.NguVan: return "TỔ KHOA HỌC XÃ HỘI";
            case Subject.HDTN: return "TỔ HĐTN-HN & GDCD";
            case Subject.KHTN: return "TỔ KHOA HỌC TỰ NHIÊN";
            case Subject.LSDL: return "TỔ KHOA HỌC XÃ HỘI";
            case Subject.GDCD: return "TỔ HĐTN-HN & GDCD";
            case Subject.CongNghe: return "TỔ TIN HỌC - CÔNG NGHỆ";
            case Subject.AmNhac: return "TỔ NGHỆ THUẬT";
            case Subject.TiengAnh: return "TỔ NGOẠI NGỮ";
            case Subject.GDTC: return "TỔ THỂ DỤC - QUỐC PHÒNG";
            case Subject.NgheThuat: return "TỔ NGHỆ THUẬT";
            default: return "TỔ CHUYÊN MÔN";
        }
    };

   const renderSaveButton = () => {
        const textMap: Record<SaveState, string> = {
            idle: 'Lưu vào Google Docs',
            saving: 'Đang lưu...',
            saved: 'Đã lưu thành công!',
            error: 'Lưu thất bại!',
        };
        const iconMap: Record<SaveState, React.ReactNode> = {
            idle: <Save className="w-4 h-4 mr-2" />,
            saving: <Loader2 className="w-4 h-4 mr-2 animate-spin" />,
            saved: <CheckCircle2 className="w-4 h-4 mr-2" />,
            error: <X className="w-4 h-4 mr-2" />,
        };
        const colorMap: Record<SaveState, string> = {
            idle: 'bg-blue-600 hover:bg-blue-700',
            saving: 'bg-gray-500',
            saved: 'bg-green-600',
            error: 'bg-red-600',
        };

        return (
            <button
                onClick={handleSaveToGoogleDocs}
                disabled={saveState === 'saving'}
                className={`flex items-center px-4 py-2 text-white rounded-lg text-sm font-medium transition-colors shadow-sm hover-shadow ${colorMap[saveState]}`}
            >
                {iconMap[saveState]} {textMap[saveState]}
            </button>
        );
    };

  // ===== ADMIN PANEL RENDER =====
  if (showAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-lg shadow-blue-500/30 mb-4">
              <Settings className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white">Quản trị hệ thống</h1>
            <p className="text-slate-400 text-sm mt-1">Cấu hình 9Router & AI cho giáo viên</p>
          </div>

          {!adminLoggedIn ? (
            /* Login Form */
            <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-2xl p-8 shadow-2xl">
              <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-blue-400" />
                Đăng nhập Admin
              </h2>
              <div className="space-y-4">
                <input
                  type="password"
                  className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                  placeholder="Nhập mật khẩu admin..."
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAdminLogin()}
                />
                {adminLoginError && (
                  <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2">
                    ❌ {adminLoginError}
                  </div>
                )}
                <button
                  onClick={handleAdminLogin}
                  className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-bold hover:from-blue-500 hover:to-indigo-500 transition shadow-lg shadow-blue-500/25"
                >
                  Đăng nhập
                </button>
              </div>
              <div className="mt-6 text-center">
                <a href="#" onClick={(e) => { e.preventDefault(); window.location.hash = ''; }} className="text-slate-400 hover:text-white text-sm transition">
                  ← Quay lại trang chính
                </a>
              </div>
            </div>
          ) : (
            /* Admin Dashboard */
            <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-2xl p-8 shadow-2xl space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Activity className="w-5 h-5 text-green-400" />
                  Cấu hình 9Router
                </h2>
                <button 
                  onClick={() => { setAdminLoggedIn(false); setAdminToken(''); sessionStorage.removeItem('admin_token'); window.location.hash = ''; }}
                  className="text-xs text-slate-400 hover:text-red-400 transition"
                >
                  Đăng xuất
                </button>
              </div>

              {/* Tunnel URL */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                  <Globe className="w-4 h-4 text-blue-400" />
                  Tunnel URL (9Router)
                </label>
                <input
                  className="w-full px-4 py-2.5 bg-slate-700/50 border border-slate-600 rounded-xl text-white font-mono text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
                  value={adminConfig.url}
                  onChange={(e) => setAdminConfig(prev => ({ ...prev, url: e.target.value }))}
                  placeholder="https://xxxxx.abc-tunnel.us/v1"
                />
              </div>

              {/* API Key */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-amber-400" />
                  API Key (9Router)
                </label>
                <input
                  type="password"
                  className="w-full px-4 py-2.5 bg-slate-700/50 border border-slate-600 rounded-xl text-white font-mono text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
                  value={adminConfig.key}
                  onChange={(e) => setAdminConfig(prev => ({ ...prev, key: e.target.value }))}
                  placeholder="sk-xxxxxxxx"
                />
              </div>

              {/* Default Model */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-400" />
                  Model mặc định
                </label>
                <input
                  className="w-full px-4 py-2.5 bg-slate-700/50 border border-slate-600 rounded-xl text-white font-mono text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
                  value={adminConfig.model}
                  onChange={(e) => setAdminConfig(prev => ({ ...prev, model: e.target.value }))}
                  placeholder="claude-opus-4.0"
                />
              </div>

              {/* Models List */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                  <Table className="w-4 h-4 text-emerald-400" />
                  Danh sách Models (thứ tự ưu tiên, cách nhau bởi dấu phẩy)
                </label>
                <textarea
                  className="w-full px-4 py-2.5 bg-slate-700/50 border border-slate-600 rounded-xl text-white font-mono text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500 transition resize-none"
                  rows={3}
                  value={adminConfig.models}
                  onChange={(e) => setAdminConfig(prev => ({ ...prev, models: e.target.value }))}
                  placeholder="claude-opus-4.0, claude-sonnet-4.0, gemini-2.5-flash, ..."
                />
                <p className="text-xs text-slate-500">Khi model đầu hết quota → tự động chuyển sang model tiếp theo trong danh sách</p>
              </div>

              {/* Change Password */}
              <div className="space-y-2 pt-4 border-t border-slate-700">
                <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                  <Settings className="w-4 h-4 text-red-400" />
                  Đổi mật khẩu admin (để trống nếu không đổi)
                </label>
                <input
                  type="password"
                  className="w-full px-4 py-2.5 bg-slate-700/50 border border-slate-600 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
                  value={adminConfig.newPassword}
                  onChange={(e) => setAdminConfig(prev => ({ ...prev, newPassword: e.target.value }))}
                  placeholder="Mật khẩu mới..."
                />
              </div>

              {/* Save Message */}
              {adminSaveMsg && (
                <div className={`text-sm rounded-xl px-4 py-3 ${
                  adminSaveMsg.startsWith('✅') 
                    ? 'bg-green-500/10 border border-green-500/20 text-green-400' 
                    : adminSaveMsg.startsWith('⚠️')
                    ? 'bg-amber-500/10 border border-amber-500/20 text-amber-400'
                    : 'bg-red-500/10 border border-red-500/20 text-red-400'
                }`}>
                  {adminSaveMsg}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleAdminSave}
                  disabled={adminSaving}
                  className="flex-1 py-3 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-xl font-bold hover:from-emerald-500 hover:to-green-500 transition shadow-lg shadow-emerald-500/25 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {adminSaving ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Đang lưu...</>
                  ) : (
                    <><CheckCircle2 className="w-4 h-4" /> Lưu cấu hình</>
                  )}
                </button>
                <button
                  onClick={() => loadAdminConfig()}
                  className="px-6 py-3 bg-slate-700 text-slate-300 rounded-xl font-medium hover:bg-slate-600 transition"
                >
                  Tải lại
                </button>
              </div>

              <p className="text-xs text-slate-500 text-center pt-2">
                💡 Sau khi lưu, hệ thống sẽ <strong>tự động cập nhật</strong> (khoảng 30 giây). 
                Giáo viên chỉ cần refresh trang.
              </p>

              <div className="text-center pt-4 border-t border-slate-700">
                <a href="#" onClick={(e) => { e.preventDefault(); window.location.hash = ''; }} className="text-slate-400 hover:text-white text-sm transition">
                  ← Quay lại trang chính
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-12 bg-slate-50 font-sans text-slate-900">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-slate-200 sticky top-0 z-50">
        {loading && <div className="loading-progress w-full" />}
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-14 sm:h-16 flex justify-between items-center">
          <div className="flex items-center space-x-3 cursor-pointer group" onClick={() => { setActiveTab('lesson'); if(!hasChosenSubject && subject) setHasChosenSubject(true); }}>
            <div className="bg-gradient-to-br from-blue-600 to-indigo-600 p-1.5 sm:p-2 rounded-xl shadow-md group-hover:shadow-lg transition-all">
                <BookOpen className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
            </div>
            <div className="hidden sm:block">
                <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-700 to-indigo-700 group-hover:opacity-80 transition-opacity">THAYDAT.EDU.VN</h1>
                <p className="text-[11px] text-slate-500 font-medium tracking-wide">TRỢ LÝ DẠY HỌC SỐ</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
             {hasCompletedSetup && (
             <div className="flex items-center space-x-2 mr-2 border-r border-slate-200 pr-4">
                <span className="text-xs font-semibold text-slate-500 uppercase">Môn:</span>
                <select 
                    value={subject} 
                    onChange={(e) => setSubject(e.target.value as Subject)}
                    className="text-sm font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                >
                    {Object.values(Subject).map(subj => (
                        <option key={subj} value={subj}>{subj}</option>
                    ))}
                </select>
             </div>
             )}
             <button 
                onClick={() => setActiveTab('guide')} 
                className={`flex items-center px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${activeTab === 'guide' ? 'bg-rose-100 text-rose-700' : 'text-slate-600 hover:bg-slate-100'}`}
             >
                 <HelpCircle className="w-5 h-5 mr-2" />
                 Hướng dẫn sử dụng
             </button>
             <button onClick={() => handleTabChange('dashboard')} className={`p-2 rounded-lg transition-colors ${activeTab === 'dashboard' ? 'bg-blue-100 text-blue-700' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'}`} title="Thống kê">
                 <BarChart3 className="w-5 h-5" />
             </button>
             <button onClick={() => { setShowQuestionBank(!showQuestionBank); refreshQB(); }} className={`p-2 rounded-lg transition-colors ${showQuestionBank ? 'bg-indigo-100 text-indigo-700' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'}`} title="Ngân hàng câu hỏi">
                 <BrainCircuit className="w-5 h-5" />
             </button>
             <button onClick={() => setShowHistoryPanel(!showHistoryPanel)} className={`p-2 rounded-lg transition-colors ${showHistoryPanel ? 'bg-amber-100 text-amber-700' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'}`} title="Lịch sử soạn bài">
                 <History className="w-5 h-5" />
             </button>
             <button onClick={() => setDarkMode(!darkMode)} className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors" title={darkMode ? 'Chế độ sáng' : 'Chế độ tối'}>
                 {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
             </button>
             <button onClick={() => setShowSettings(true)} className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors" title="Cài đặt API Key">
                 <Settings className="w-5 h-5" />
             </button>
             {(
                 (activeTab === 'lesson' && lessonResult) || 
                 (activeTab === 'exam' && examResult) || 
                 (activeTab === 'worksheet' && worksheetResult) || 
                 (activeTab === 'converter' && examResult) || 
                 (activeTab === 'similar-exam' && examResult)
             ) && (
                <>
                    {!isElectron && user && renderSaveButton()}
                    <button 
                        onClick={activeTab === 'lesson' 
                            ? () => downloadWordDocument(lessonResult!, teacherProfile) 
                            : (activeTab === 'worksheet'
                                ? () => downloadExamDocument(worksheetResult!, {...examInput, subject, topic: worksheetResult!.title || worksheetInput.topic, matrixType: 'CUSTOM', context: 'phiếu bài tập'}, worksheetResult!.generatedImages || [], undefined, teacherProfile)
                                : (activeTab === 'exam' 
                                    ? () => downloadExamDocument(examResult!, examInput, examResult!.generatedImages || [], undefined, teacherProfile) 
                                    : (activeTab === 'converter' 
                                        ? () => downloadExamDocument(examResult!, {...examInput, subject, topic: examResult!.title || "Đề thi soạn lại"}, examResult!.generatedImages || [], undefined, teacherProfile)
                                        : handleDownloadSimilarExam
                                    )
                                )
                            )
                        }
                        className="flex items-center px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors shadow-sm hover:shadow"
                    >
                       <Download className="w-4 h-4 mr-2" /> Xuất Word
                    </button>
                </>
             )}
             
             {/* Google Auth Button — ẩn trong Electron (OAuth không hoạt động với file://) */}
             {!isElectron && (
             <div className="border-l border-slate-200 pl-3">
                 {!user ? (
                    <button onClick={login} className="flex items-center space-x-2 px-3 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">
                        <img src="https://www.google.com/favicon.ico" alt="Google icon" className="w-4 h-4"/>
                        <span>Đăng nhập</span>
                    </button>
                 ) : (
                    <div className="flex items-center space-x-3">
                        <img src={user.picture} alt={user.name} className="w-8 h-8 rounded-full" />
                        <span className="text-sm font-medium text-slate-600 hidden sm:block">{user.name}</span>
                         <button onClick={logout} title="Đăng xuất" className="p-2 text-slate-500 hover:bg-slate-100 rounded-full">
                            <LogOut className="w-4 h-4" />
                        </button>
                    </div>
                 )}
             </div>
             )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        
        {/* --- NEW: Setup Wizard on First Load --- */}
        {!hasCompletedSetup ? (
            <div className="max-w-2xl mx-auto bg-white p-8 rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 flex flex-col space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="text-center space-y-2">
                    <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-700 to-indigo-700">Thiết lập ban đầu</h2>
                    <p className="text-slate-500">Cấu hình một lần để hệ thống tự động điền vào giáo án và đề thi của bạn.</p>
                </div>

                <div className="space-y-4">
                    <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide border-b border-slate-100 pb-2 flex items-center space-x-2">
                        <BookOpen className="w-4 h-4 text-indigo-600" />
                        <span>1. Chọn môn học chính</span>
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {Object.values(Subject).map(subj => (
                            <button
                                key={subj}
                                onClick={() => {
                                    setSubject(subj as Subject);
                                    setHasChosenSubject(true);
                                }}
                                className={`px-4 py-3 rounded-xl border-2 text-sm font-bold flex items-center justify-center space-x-2 transition-all ${
                                    subject === subj 
                                    ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-md' 
                                    : 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50 text-slate-600'
                                }`}
                            >
                                {getSubjectIcon(subj as Subject)}
                                <span>{subj}</span>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="space-y-4 animate-in fade-in duration-300 delay-150">
                    <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide border-b border-slate-100 pb-2 flex items-center space-x-2">
                        <PenSquare className="w-4 h-4 text-blue-600" />
                        <span>2. Thông tin giáo viên (Tuỳ chọn)</span>
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="label-text">Tên Trường</label>
                            <input 
                                type="text" 
                                className="input-field" 
                                value={teacherProfile.schoolName} 
                                onChange={(e) => setTeacherProfile({...teacherProfile, schoolName: e.target.value})} 
                                placeholder="VD: THCS Liên Châu" 
                            />
                        </div>
                        <div className="space-y-2 md:col-span-1">
                            <label className="label-text">Họ và tên GV</label>
                            <input 
                                type="text" 
                                className="input-field" 
                                value={teacherProfile.teacherName} 
                                onChange={(e) => setTeacherProfile({...teacherProfile, teacherName: e.target.value})} 
                                placeholder="VD: Nguyễn Văn A" 
                            />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                            <label className="label-text">Tổ chuyên môn</label>
                            <input 
                                type="text" 
                                className="input-field" 
                                value={teacherProfile.groupName} 
                                onChange={(e) => setTeacherProfile({...teacherProfile, groupName: e.target.value})} 
                                placeholder="VD: Tổ Khoa học Tự nhiên" 
                            />
                        </div>
                    </div>
                </div>

                <div className="space-y-4 animate-in fade-in duration-300 delay-300">
                    <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide border-b border-slate-100 pb-2 flex items-center space-x-2">
                        <Settings className="w-4 h-4 text-emerald-600" />
                        <span>3. Gemini API Key (Dự phòng - Không bắt buộc)</span>
                    </h3>
                    <div className="space-y-2 relative">
                        <input 
                            type="password" 
                            className="input-field pr-20 font-mono" 
                            value={geminiApiKey} 
                            onChange={(e) => {
                                const val = e.target.value.trim();
                                setGeminiApiKey(val);
                                localStorage.setItem('custom_gemini_api_key', val);
                            }}
                            placeholder="Nhập API Key (AIzaSy...) nếu muốn dùng dự phòng..." 
                        />
                        {geminiApiKey && (
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex gap-2">
                                <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded font-bold">Đã nhập</span>
                            </div>
                        )}
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed">
                        🟢 <strong>Hệ thống đã có nguồn AI chính do admin cung cấp</strong> (khoảng 100 lượt miễn phí). Bạn có thể bắt đầu soạn ngay mà không cần nhập gì thêm.
                        <br/>⚡ Nếu muốn đảm bảo luôn sử dụng được (phòng khi nguồn chính bận/tắt), hãy <a href="https://aistudio.google.com/app/apikey" target="_blank" className="text-blue-600 hover:underline">tạo Gemini API Key miễn phí tại đây</a> và dán vào ô trên. Key sẽ được lưu trên máy của bạn.
                    </p>
                </div>

                <div className="pt-4 flex justify-center">
                    <button 
                        onClick={handleSaveSettings} 
                        className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-3 px-12 rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5"
                    >
                        Bắt đầu sử dụng
                    </button>
                </div>
            </div>
        ) : (
            <>
                {/* Navigation Tabs - Scrollable */}
                <div className="flex justify-center mb-4 sm:mb-6 fade-slide-in">
            <div className="bg-white p-1 rounded-xl shadow-sm border border-slate-200 max-w-full">
              <div className="nav-tabs-scroll">
                <button
                    onClick={() => handleTabChange('lesson')}
                    className={`flex items-center px-4 sm:px-6 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-semibold transition-all duration-200 ${
                        activeTab === 'lesson' 
                        ? 'bg-blue-600 text-white shadow-md' 
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                >
                    <FileText className="w-4 h-4 mr-1 sm:mr-2" />
                    <span className="hidden sm:inline">Soạn</span> Giáo Án
                </button>
                <button
                    onClick={() => handleTabChange('worksheet')}
                    className={`flex items-center px-4 sm:px-6 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-semibold transition-all duration-200 ${
                        activeTab === 'worksheet' 
                        ? 'bg-pink-600 text-white shadow-md' 
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                >
                    <BookOpen className="w-4 h-4 mr-1 sm:mr-2" />
                    Phiếu BT
                </button>
                <button
                    onClick={() => handleTabChange('exam')}
                    className={`flex items-center px-4 sm:px-6 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-semibold transition-all duration-200 ${
                        activeTab === 'exam' 
                        ? 'bg-indigo-600 text-white shadow-md' 
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                >
                    <GraduationCap className="w-4 h-4 mr-1 sm:mr-2" />
                    Tạo Đề
                </button>
                <button
                    onClick={() => handleTabChange('similar-exam')}
                    className={`flex items-center px-4 sm:px-6 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-semibold transition-all duration-200 ${
                        activeTab === 'similar-exam' 
                        ? 'bg-orange-600 text-white shadow-md' 
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                >
                    <Files className="w-4 h-4 mr-1 sm:mr-2" />
                    Đề Tương tự
                </button>
                 <button
                    onClick={() => handleTabChange('converter')}
                    className={`flex items-center px-4 sm:px-6 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-semibold transition-all duration-200 ${
                        activeTab === 'converter'
                        ? 'bg-teal-600 text-white shadow-md'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                >
                    <FileCog className="w-4 h-4 mr-1 sm:mr-2" />
                    Soạn từ PDF
                </button>
                <button
                    onClick={() => handleTabChange('shcm')}
                    className={`flex items-center px-4 sm:px-6 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-semibold transition-all duration-200 ${
                        activeTab === 'shcm'
                        ? 'bg-emerald-600 text-white shadow-md'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                >
                    <Users className="w-4 h-4 mr-1 sm:mr-2" />
                    SHCM
                </button>
                <button
                    onClick={() => handleTabChange('comments')}
                    className={`flex items-center px-4 sm:px-6 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-semibold transition-all duration-200 ${
                        activeTab === 'comments'
                        ? 'bg-purple-600 text-white shadow-md'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                >
                    <PenSquare className="w-4 h-4 mr-1 sm:mr-2" />
                    Nhận xét HS
                </button>
                <button
                    onClick={() => handleTabChange('edu-plan')}
                    className={`flex items-center px-4 sm:px-6 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-semibold transition-all duration-200 ${
                        activeTab === 'edu-plan'
                        ? 'bg-cyan-600 text-white shadow-md'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                >
                    <CalendarDays className="w-4 h-4 mr-1 sm:mr-2" />
                    KHGD
                </button>
                {/* Mobile: Help button inside tabs */}
                <button
                    onClick={() => handleTabChange('guide')}
                    className={`flex sm:hidden items-center px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-200 ${
                        activeTab === 'guide'
                        ? 'bg-rose-600 text-white shadow-md'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                >
                    <HelpCircle className="w-4 h-4 mr-1" />
                    Hướng dẫn
                </button>
              </div>
            </div>
        </div>

        {/* AI Status Bar - Friendly for teachers */}
        {hasChosenSubject && aiSource !== 'none' && (
            <div className="flex justify-center mb-4 px-4">
                <div className={`ai-status-bar ${
                    aiSource === '9router' ? 'status-9router' : 
                    (aiSourceError ? 'status-fallback' : 'status-gemini')
                }`}>
                    <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                        aiSource === '9router' ? 'bg-emerald-500 animate-pulse' : 
                        (aiSourceError ? 'bg-amber-500' : 'bg-blue-500 animate-pulse')
                    }`} />
                    {aiSource === '9router' ? (
                        <span className="flex items-center gap-1.5">
                            <span>Đang dùng:</span>
                            <strong className="font-bold">{getFriendlyModelName(aiModelUsed || selectedModel)}</strong>
                        </span>
                    ) : aiSourceError ? (
                        <span className="flex items-center gap-1.5" title={aiSourceError}>
                            <span>Đang dùng:</span>
                            <strong className="font-bold">💎 Gemini AI (dự phòng)</strong>
                            <span className="text-[10px] opacity-75">— Nguồn chính tạm bận</span>
                        </span>
                    ) : (
                        <span className="flex items-center gap-1.5">
                            <span>Đang dùng:</span>
                            <strong className="font-bold">💎 Gemini AI (Key cá nhân)</strong>
                        </span>
                    )}
                    {get9RouterModels().length > 1 && (
                        <select 
                            className="text-xs bg-white/80 border border-slate-300 rounded-md px-2 py-0.5 cursor-pointer focus:outline-none focus:ring-1 focus:ring-indigo-400 ml-2 font-medium"
                            value={selectedModel}
                            title="Chọn AI Model — Thay đổi sẽ áp dụng cho lần tạo tiếp theo"
                            onChange={(e) => {
                                const m = e.target.value;
                                setSelected9RouterModel(m);
                                setSelectedModel(m);
                            }}
                        >
                            {get9RouterModels().map(m => (
                                <option key={m} value={m}>{getFriendlyModelName(m)}</option>
                            ))}
                        </select>
                    )}
                </div>
            </div>
        )}

        {/* Guide Document */}
        {activeTab === 'guide' && (
            <div className="max-w-4xl mx-auto w-full mt-4">
                <UserGuide />
            </div>
        )}

        {/* ===== DASHBOARD TAB ===== */}
        {activeTab === 'dashboard' && (() => {
            const stats = getHistoryStats();
            return (
            <div className="max-w-5xl mx-auto w-full mt-4 space-y-6 fade-slide-in">
                <div className="text-center mb-6">
                    <h2 className="text-2xl font-bold text-slate-800">📊 Thống kê hoạt động</h2>
                    <p className="text-slate-500 mt-1">Tổng quan công việc soạn bài của bạn</p>
                </div>
                {/* Stats Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-6 text-center">
                        <div className="text-3xl font-bold text-blue-600">{stats.total}</div>
                        <div className="text-sm text-slate-500 mt-1">Tổng tài liệu</div>
                    </div>
                    <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-6 text-center">
                        <div className="text-3xl font-bold text-emerald-600">{stats.thisWeek}</div>
                        <div className="text-sm text-slate-500 mt-1">Tuần này</div>
                    </div>
                    <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-6 text-center">
                        <div className="text-3xl font-bold text-indigo-600">{stats.thisMonth}</div>
                        <div className="text-sm text-slate-500 mt-1">Tháng này</div>
                    </div>
                    <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-6 text-center">
                        <div className="text-3xl font-bold text-amber-600">{Object.keys(stats.bySubject).length}</div>
                        <div className="text-sm text-slate-500 mt-1">Môn đã soạn</div>
                    </div>
                </div>
                {/* By Type */}
                <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-6">
                    <h3 className="font-bold text-slate-700 mb-4">Phân loại tài liệu</h3>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                        {[
                            { label: '📝 Giáo án', count: stats.lessons, color: 'bg-blue-50 text-blue-700' },
                            { label: '📋 Đề thi', count: stats.exams, color: 'bg-indigo-50 text-indigo-700' },
                            { label: '📄 Phiếu BT', count: stats.worksheets, color: 'bg-pink-50 text-pink-700' },
                            { label: '📚 Sổ SHCM', count: stats.shcm, color: 'bg-emerald-50 text-emerald-700' },
                        ].map(item => (
                            <div key={item.label} className={`${item.color} rounded-xl p-4 text-center`}>
                                <div className="text-2xl font-bold">{item.count}</div>
                                <div className="text-sm font-medium mt-1">{item.label}</div>
                            </div>
                        ))}
                    </div>
                </div>
                {/* By Subject */}
                {Object.keys(stats.bySubject).length > 0 && (
                <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-6">
                    <h3 className="font-bold text-slate-700 mb-4">Theo môn học</h3>
                    <div className="space-y-2">
                        {Object.entries(stats.bySubject).sort((a,b) => b[1]-a[1]).map(([subj, count]) => (
                            <div key={subj} className="flex items-center justify-between">
                                <span className="text-sm font-medium text-slate-600">{subj}</span>
                                <div className="flex items-center gap-2">
                                    <div className="h-2 bg-blue-200 rounded-full" style={{width: `${Math.max(30, (count/stats.total)*200)}px`}}>
                                        <div className="h-full bg-blue-600 rounded-full" style={{width: '100%'}} />
                                    </div>
                                    <span className="text-sm font-bold text-slate-700 w-8 text-right">{count}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                )}
                {/* Achievement */}
                <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl border border-amber-200 p-6 text-center">
                    <div className="text-4xl mb-2">
                        {stats.total >= 100 ? '🏆' : stats.total >= 50 ? '🥇' : stats.total >= 20 ? '🥈' : stats.total >= 5 ? '🥉' : '⭐'}
                    </div>
                    <div className="font-bold text-amber-800">
                        {stats.total >= 100 ? 'Giáo viên xuất sắc!' : stats.total >= 50 ? 'Rất tích cực!' : stats.total >= 20 ? 'Đang tiến bộ!' : stats.total >= 5 ? 'Khởi đầu tốt!' : 'Hãy bắt đầu soạn bài!'}
                    </div>
                    <p className="text-sm text-amber-600 mt-1">Đã soạn {stats.total} tài liệu</p>
                </div>
            </div>
            );
        })()}


        {/* ===== NHẬN XÉT HỌC SINH TAB ===== */}
        {activeTab === 'comments' && (
            <div className="max-w-5xl mx-auto w-full mt-4 fade-slide-in">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    <div className="lg:col-span-4">
                        <div className="bg-white shadow-xl rounded-2xl border border-slate-100 overflow-hidden">
                            <div className="bg-gradient-to-r from-purple-50 to-fuchsia-50 px-6 py-4 border-b border-slate-100">
                                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                    <PenSquare className="w-5 h-5 text-purple-600" /> Nhận xét học sinh
                                </h2>
                                <p className="text-xs text-slate-500 mt-1">AI tạo nhận xét cá nhân hóa cho từng HS</p>
                            </div>
                            <div className="p-6 space-y-4">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1">Danh sách học sinh</label>
                                    <textarea
                                        value={commentInput.students}
                                        onChange={e => setCommentInput({...commentInput, students: e.target.value})}
                                        placeholder={"Mỗi dòng 1 HS, theo format:\nNguyễn Văn A - Giỏi - Tốt - Tích cực phát biểu\nTrần Thị B - Khá - Tốt - Cần rèn chữ viết\nLê Văn C - TB - Khá - Hay nghỉ học"}
                                        className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 min-h-[200px] font-mono"
                                    />
                                    <p className="text-xs text-slate-400 mt-1">Format: Tên - Học lực - Hạnh kiểm - Đặc điểm</p>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-600 mb-1">Lớp</label>
                                        <input value={commentInput.grade} onChange={e => setCommentInput({...commentInput, grade: e.target.value})} placeholder="6A1" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-600 mb-1">Phong cách</label>
                                        <select value={commentInput.style} onChange={e => setCommentInput({...commentInput, style: e.target.value})} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm">
                                            <option value="tích cực">Tích cực, khích lệ</option>
                                            <option value="trung lập">Trung lập, khách quan</option>
                                            <option value="chi tiết">Chi tiết, cụ thể</option>
                                        </select>
                                    </div>
                                </div>
                                <button
                                    onClick={async () => {
                                        if (!commentInput.students.trim()) { alert('Vui lòng nhập danh sách HS!'); return; }
                                        setLoading(true);
                                        setLoadingText('Đang tạo nhận xét cho từng học sinh...');
                                        try {
                                            const { callAI: callAIFn } = await import('./services/geminiService');
                                            const result = await callAIFn(
                                                `Bạn là giáo viên chủ nhiệm lớp ${commentInput.grade || '6'}. Hãy viết nhận xét cuối kỳ cho từng học sinh dưới đây. Mỗi nhận xét 3-4 câu, phong cách ${commentInput.style}, đúng văn phong sư phạm Việt Nam. Không lặp lại cấu trúc câu giữa các HS.\n\nDanh sách:\n${commentInput.students}\n\nFormat output:\n**Họ tên HS 1:** Nhận xét...\n**Họ tên HS 2:** Nhận xét...\n(tiếp tục cho tất cả HS)`
                                            );
                                            setCommentResult(result);
                                        } catch (e) { alert('Lỗi tạo nhận xét: ' + (e as any).message); }
                                        setLoading(false);
                                    }}
                                    disabled={loading}
                                    className="w-full bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-700 hover:to-fuchsia-700 text-white font-bold py-3 rounded-xl shadow-lg transition-all flex items-center justify-center"
                                >
                                    {loading && activeTab === 'comments' ? <><Loader2 className="animate-spin mr-2 w-5 h-5" /> {loadingText}</> : <><Sparkles className="mr-2 w-5 h-5" /> TẠO NHẬN XÉT</>}
                                </button>
                            </div>
                        </div>
                    </div>
                    <div className="lg:col-span-8">
                        {commentResult ? (
                            <div className="bg-white shadow-xl rounded-2xl border border-slate-100 overflow-hidden">
                                <div className="bg-gradient-to-r from-purple-50 to-fuchsia-50 px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                                    <h3 className="font-bold text-slate-800">Kết quả nhận xét</h3>
                                    <button onClick={() => { navigator.clipboard.writeText(commentResult); alert('Đã sao chép!'); }} className="flex items-center gap-1 text-sm text-purple-600 hover:text-purple-800 font-medium">
                                        <Copy className="w-4 h-4" /> Sao chép
                                    </button>
                                </div>
                                <div className="p-6 prose prose-sm max-w-none">
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{commentResult}</ReactMarkdown>
                                </div>
                            </div>
                        ) : (
                            <EmptyState title="Nhận xét học sinh" message="Nhập danh sách HS → AI sẽ tạo nhận xét cá nhân hóa cho từng em, đúng văn phong sư phạm." icon={<PenSquare className="w-12 h-12 text-purple-300" />} />
                        )}
                    </div>
                </div>
            </div>
        )}


        {/* ===== KẾ HOẠCH GIÁO DỤC TAB ===== */}
        {activeTab === 'edu-plan' && (
            <div className="max-w-5xl mx-auto w-full mt-4 fade-slide-in">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    <div className="lg:col-span-4">
                        <div className="bg-white shadow-xl rounded-2xl border border-slate-100 overflow-hidden">
                            <div className="bg-gradient-to-r from-cyan-50 to-sky-50 px-6 py-4 border-b border-slate-100">
                                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                    <CalendarDays className="w-5 h-5 text-cyan-600" /> Kế hoạch giáo dục
                                </h2>
                                <p className="text-xs text-slate-500 mt-1">AI tạo KHGD theo CV5512/BGDĐT</p>
                            </div>
                            <div className="p-6 space-y-4">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1">Môn học</label>
                                    <p className="text-sm font-bold text-indigo-600 bg-indigo-50 px-3 py-2 rounded-lg">{subject}</p>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-600 mb-1">Năm học</label>
                                        <input value={eduPlanInput.year} onChange={e => setEduPlanInput({...eduPlanInput, year: e.target.value})} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-600 mb-1">Phạm vi</label>
                                        <select value={eduPlanInput.semester} onChange={e => setEduPlanInput({...eduPlanInput, semester: e.target.value})} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm">
                                            <option value="Cả năm">Cả năm</option>
                                            <option value="Học kỳ 1">Học kỳ 1</option>
                                            <option value="Học kỳ 2">Học kỳ 2</option>
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 mb-1">Yêu cầu bổ sung</label>
                                    <textarea value={eduPlanInput.notes} onChange={e => setEduPlanInput({...eduPlanInput, notes: e.target.value})} placeholder="VD: Tăng cường STEM, đổi mới PPDH, sử dụng CNTT..." className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm min-h-[80px]" />
                                </div>
                                <button
                                    onClick={async () => {
                                        setLoading(true);
                                        setLoadingText('Đang tạo kế hoạch giáo dục...');
                                        try {
                                            const { callAI: callAIFn } = await import('./services/geminiService');
                                            const grade = lessonInput.grade;
                                            const result = await callAIFn(
                                                `Bạn là chuyên gia giáo dục Việt Nam. Hãy soạn KẾ HOẠCH GIÁO DỤC môn ${subject} lớp ${grade} năm học ${eduPlanInput.year}, phạm vi: ${eduPlanInput.semester}.\n\nTheo CV5512/BGDĐT và GDPT 2018, bao gồm:\n\n## I. MỤC TIÊU\n### 1. Về phẩm chất\n### 2. Về năng lực chung\n### 3. Về năng lực đặc thù\n\n## II. PHÂN PHỐI CHƯƠNG TRÌNH\nBảng Markdown gồm: STT | Tuần | Tên bài/chủ đề | Số tiết | Thiết bị | Ghi chú\n(Liệt kê đầy đủ 35 tuần cho cả năm, hoặc 18 tuần cho HK1, 17 tuần cho HK2)\n\n## III. THIẾT BỊ DẠY HỌC\nDanh sách thiết bị theo từng chương\n\n## IV. KIỂM TRA, ĐÁNH GIÁ\n- Đánh giá thường xuyên\n- Đánh giá định kỳ (giữa kỳ, cuối kỳ)\n- Ma trận đề kiểm tra\n\n${eduPlanInput.notes ? `\nYÊU CẦU BỔ SUNG: ${eduPlanInput.notes}` : ''}\n\nViết đầy đủ, chi tiết, đúng format Markdown.`
                                            );
                                            setEduPlanResult(result);
                                        } catch (e) { alert('Lỗi: ' + (e as any).message); }
                                        setLoading(false);
                                    }}
                                    disabled={loading}
                                    className="w-full bg-gradient-to-r from-cyan-600 to-sky-600 hover:from-cyan-700 hover:to-sky-700 text-white font-bold py-3 rounded-xl shadow-lg transition-all flex items-center justify-center"
                                >
                                    {loading && activeTab === 'edu-plan' ? <><Loader2 className="animate-spin mr-2 w-5 h-5" /> {loadingText}</> : <><Sparkles className="mr-2 w-5 h-5" /> TẠO KẾ HOẠCH</>}
                                </button>
                            </div>
                        </div>
                    </div>
                    <div className="lg:col-span-8">
                        {eduPlanResult ? (
                            <div className="bg-white shadow-xl rounded-2xl border border-slate-100 overflow-hidden">
                                <div className="bg-gradient-to-r from-cyan-50 to-sky-50 px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                                    <h3 className="font-bold text-slate-800">Kế hoạch giáo dục — {subject}</h3>
                                    <button onClick={() => { navigator.clipboard.writeText(eduPlanResult); alert('Đã sao chép!'); }} className="flex items-center gap-1 text-sm text-cyan-600 hover:text-cyan-800 font-medium">
                                        <Copy className="w-4 h-4" /> Sao chép
                                    </button>
                                </div>
                                <div className="p-6 prose prose-sm max-w-none overflow-x-auto">
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{eduPlanResult}</ReactMarkdown>
                                </div>
                            </div>
                        ) : (
                            <EmptyState title="Kế hoạch giáo dục" message="AI sẽ tạo KHGD theo CV5512 bao gồm mục tiêu, phân phối chương trình, thiết bị, kiểm tra đánh giá." icon={<CalendarDays className="w-12 h-12 text-cyan-300" />} />
                        )}
                    </div>
                </div>
            </div>
        )}

        {/* ===== HISTORY SLIDE PANEL ===== */}
        {showHistoryPanel && (
            <div className="fixed inset-0 z-50 flex justify-end" onClick={() => setShowHistoryPanel(false)}>
                <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
                <div className="relative w-full max-w-md bg-white shadow-2xl h-full overflow-y-auto" onClick={e => e.stopPropagation()}>
                    <div className="sticky top-0 bg-white border-b border-slate-200 p-4 flex items-center justify-between z-10">
                        <h2 className="font-bold text-lg text-slate-800 flex items-center gap-2"><History className="w-5 h-5" /> Lịch sử soạn bài</h2>
                        <div className="flex gap-2">
                            {historyItems.length > 0 && (
                                <button onClick={() => { if(confirm('Xóa toàn bộ lịch sử?')) { clearHistory(); refreshHistory(); } }} className="text-xs text-red-500 hover:text-red-700 font-medium">Xóa tất cả</button>
                            )}
                            <button onClick={() => setShowHistoryPanel(false)} className="p-1 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5" /></button>
                        </div>
                    </div>
                    <div className="p-4 space-y-3">
                        {historyItems.length === 0 ? (
                            <div className="text-center py-12 text-slate-400">
                                <History className="w-12 h-12 mx-auto mb-3 opacity-30" />
                                <p className="font-medium">Chưa có lịch sử</p>
                                <p className="text-sm">Kết quả soạn bài sẽ tự động lưu tại đây</p>
                            </div>
                        ) : historyItems.map(item => {
                            const typeInfo = getTypeLabel(item.type);
                            return (
                            <div key={item.id} className="bg-slate-50 hover:bg-slate-100 rounded-xl p-4 cursor-pointer transition-colors group border border-slate-100"
                                onClick={() => {
                                    if (item.type === 'lesson') { setLessonResult(item.data); setActiveTab('lesson'); }
                                    else if (item.type === 'exam') { setExamResult(item.data); setActiveTab('exam'); }
                                    else if (item.type === 'worksheet') { setWorksheetResult(item.data); setActiveTab('worksheet'); }
                                    else if (item.type === 'shcm') { setShcmResult(item.data); setActiveTab('shcm'); }
                                    setShowHistoryPanel(false);
                                }}
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full bg-${typeInfo.color}-100 text-${typeInfo.color}-700`}>{typeInfo.emoji} {typeInfo.label}</span>
                                            <span className="text-xs text-slate-400">{formatTimeAgo(item.createdAt)}</span>
                                        </div>
                                        <h4 className="font-semibold text-sm text-slate-800 truncate">{item.title}</h4>
                                        <p className="text-xs text-slate-500 mt-0.5">{item.subject} • {item.grade} • {item.preview}</p>
                                    </div>
                                    <button onClick={(e) => { e.stopPropagation(); removeFromHistory(item.id); refreshHistory(); }} className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 rounded-lg transition-opacity">
                                        <Trash2 className="w-4 h-4 text-red-400" />
                                    </button>
                                </div>
                            </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        )}


        {/* ===== QUESTION BANK PANEL ===== */}
        {showQuestionBank && (
            <div className="fixed inset-0 z-50 flex justify-end" onClick={() => setShowQuestionBank(false)}>
                <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
                <div className="relative w-full max-w-lg bg-white shadow-2xl h-full overflow-y-auto" onClick={e => e.stopPropagation()}>
                    <div className="sticky top-0 bg-white border-b border-slate-200 p-4 z-10">
                        <div className="flex items-center justify-between mb-3">
                            <h2 className="font-bold text-lg text-slate-800 flex items-center gap-2"><BrainCircuit className="w-5 h-5" /> Ngân hàng câu hỏi</h2>
                            <div className="flex gap-2">
                                <button onClick={() => setAddingQuestion(!addingQuestion)} className="text-xs bg-blue-600 text-white px-3 py-1 rounded-lg font-bold hover:bg-blue-700">+ Thêm</button>
                                <button onClick={() => setShowQuestionBank(false)} className="p-1 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5" /></button>
                            </div>
                        </div>
                        {/* Filters */}
                        <div className="flex gap-2">
                            <input value={qbFilter.search} onChange={e => setQbFilter({...qbFilter, search: e.target.value})} placeholder="Tìm kiếm..." className="flex-1 border border-slate-200 rounded-lg px-3 py-1.5 text-xs" />
                            <select value={qbFilter.level} onChange={e => setQbFilter({...qbFilter, level: e.target.value})} className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs">
                                <option value="">Tất cả MĐ</option>
                                <option value="Nhận biết">NB</option>
                                <option value="Thông hiểu">TH</option>
                                <option value="Vận dụng">VD</option>
                                <option value="Vận dụng cao">VDC</option>
                            </select>
                            <select value={qbFilter.type} onChange={e => setQbFilter({...qbFilter, type: e.target.value})} className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs">
                                <option value="">TN+TL</option>
                                <option value="TN">TN</option>
                                <option value="TL">TL</option>
                            </select>
                        </div>
                    </div>
                    
                    {/* Add Question Form */}
                    {addingQuestion && (
                        <div className="p-4 bg-blue-50 border-b border-blue-200 space-y-3">
                            <textarea value={newQuestion.content} onChange={e => setNewQuestion({...newQuestion, content: e.target.value})} placeholder="Nội dung câu hỏi..." className="w-full border rounded-lg px-3 py-2 text-sm min-h-[80px]" />
                            <textarea value={newQuestion.answer} onChange={e => setNewQuestion({...newQuestion, answer: e.target.value})} placeholder="Đáp án (tùy chọn)..." className="w-full border rounded-lg px-3 py-2 text-sm min-h-[40px]" />
                            <div className="flex gap-2">
                                <input value={newQuestion.chapter} onChange={e => setNewQuestion({...newQuestion, chapter: e.target.value})} placeholder="Chương/Chủ đề" className="flex-1 border rounded-lg px-3 py-2 text-xs" />
                                <select value={newQuestion.level} onChange={e => setNewQuestion({...newQuestion, level: e.target.value as any})} className="border rounded-lg px-2 py-2 text-xs">
                                    <option value="Nhận biết">NB</option>
                                    <option value="Thông hiểu">TH</option>
                                    <option value="Vận dụng">VD</option>
                                    <option value="Vận dụng cao">VDC</option>
                                </select>
                                <select value={newQuestion.type} onChange={e => setNewQuestion({...newQuestion, type: e.target.value as any})} className="border rounded-lg px-2 py-2 text-xs">
                                    <option value="TN">TN</option>
                                    <option value="TL">TL</option>
                                </select>
                            </div>
                            <button onClick={() => {
                                if (!newQuestion.content.trim()) return;
                                addQuestion({ content: newQuestion.content, answer: newQuestion.answer, chapter: newQuestion.chapter, level: newQuestion.level, type: newQuestion.type, subject, grade: lessonInput.grade, tags: newQuestion.tags.split(',').map(t => t.trim()).filter(Boolean) });
                                setNewQuestion({ content: '', answer: '', chapter: '', level: 'Nhận biết', type: 'TN', tags: '' });
                                refreshQB();
                                setAddingQuestion(false);
                            }} className="w-full bg-blue-600 text-white text-sm font-bold py-2 rounded-lg hover:bg-blue-700">Lưu câu hỏi</button>
                        </div>
                    )}
                    
                    <div className="p-4 space-y-3">
                        <p className="text-xs text-slate-400">{filterQuestions({...qbFilter, subject}).length} câu hỏi</p>
                        {filterQuestions({...qbFilter, subject}).length === 0 ? (
                            <div className="text-center py-12 text-slate-400">
                                <BrainCircuit className="w-12 h-12 mx-auto mb-3 opacity-30" />
                                <p className="font-medium">Chưa có câu hỏi</p>
                                <p className="text-sm">Bấm "+ Thêm" để lưu câu hỏi hay vào ngân hàng</p>
                            </div>
                        ) : filterQuestions({...qbFilter, subject}).map(q => (
                            <div key={q.id} className="bg-slate-50 rounded-xl p-4 border border-slate-100 group">
                                <div className="flex items-start justify-between mb-2">
                                    <div className="flex gap-1.5 flex-wrap">
                                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${q.type === 'TN' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>{q.type}</span>
                                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${q.level === 'Nhận biết' ? 'bg-green-100 text-green-700' : q.level === 'Thông hiểu' ? 'bg-yellow-100 text-yellow-700' : q.level === 'Vận dụng' ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700'}`}>{q.level}</span>
                                        {q.chapter && <span className="text-xs bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full">{q.chapter}</span>}
                                    </div>
                                    <button onClick={() => { removeQuestion(q.id); refreshQB(); }} className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 rounded-lg transition-opacity">
                                        <Trash2 className="w-3.5 h-3.5 text-red-400" />
                                    </button>
                                </div>
                                <div className="text-sm text-slate-800 leading-relaxed prose prose-sm max-w-none">
                                    <ReactMarkdown remarkPlugins={[remarkMath, remarkGfm]} rehypePlugins={[rehypeKatex]}>{q.content}</ReactMarkdown>
                                </div>
                                {q.answer && (
                                    <details className="mt-2">
                                        <summary className="text-xs text-blue-600 cursor-pointer font-medium">Xem đáp án</summary>
                                        <div className="mt-1 text-sm text-slate-600 bg-white p-2 rounded-lg border">
                                            <ReactMarkdown remarkPlugins={[remarkMath, remarkGfm]} rehypePlugins={[rehypeKatex]}>{q.answer}</ReactMarkdown>
                                        </div>
                                    </details>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        )}

        {/* ===== FLOATING CHAT BUTTON ===== */}
        <button 
            onClick={() => setShowChat(!showChat)}
            className="fixed bottom-6 right-6 z-40 bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4 rounded-full shadow-xl hover:shadow-2xl transition-all hover:-translate-y-1"
            title="Hỏi AI trợ giảng"
        >
            <MessageSquare className="w-6 h-6" />
        </button>

        {/* ===== CHAT PANEL ===== */}
        {showChat && (
            <div className="fixed bottom-20 right-6 z-50 w-96 max-h-[500px] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3 flex items-center justify-between">
                    <span className="font-bold text-white text-sm">🤖 Trợ lý AI dạy học</span>
                    <button onClick={() => setShowChat(false)} className="text-white/70 hover:text-white"><X className="w-4 h-4" /></button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[200px] max-h-[350px]">
                    {chatMessages.length === 0 && (
                        <div className="text-center text-slate-400 text-sm py-8">
                            <p className="font-medium mb-2">Chào thầy/cô! 👋</p>
                            <p>Hỏi bất cứ điều gì về phương pháp giảng dạy, soạn bài, đánh giá HS...</p>
                        </div>
                    )}
                    {chatMessages.map((msg, i) => (
                        <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-800'}`}>
                                {msg.role === 'ai' ? <ReactMarkdown remarkPlugins={[remarkMath, remarkGfm]} rehypePlugins={[rehypeKatex]}>{msg.text}</ReactMarkdown> : msg.text}
                            </div>
                        </div>
                    ))}
                </div>
                <div className="border-t border-slate-200 p-3 flex gap-2">
                    <input 
                        value={chatInput} 
                        onChange={e => setChatInput(e.target.value)}
                        onKeyDown={async e => {
                            if (e.key === 'Enter' && chatInput.trim()) {
                                const q = chatInput.trim();
                                setChatInput('');
                                setChatMessages(prev => [...prev, {role: 'user', text: q}]);
                                try {
                                    const { callAI } = await import('./services/geminiService');
                                    const answer = await callAI(`Bạn là trợ lý AI chuyên về giáo dục Việt Nam (GDPT 2018, CV5512). Hãy trả lời ngắn gọn, hữu ích cho giáo viên.\n\nCâu hỏi: ${q}`);
                                    setChatMessages(prev => [...prev, {role: 'ai', text: answer || 'Xin lỗi, tôi không thể trả lời câu hỏi này.'}]);
                                } catch {
                                    setChatMessages(prev => [...prev, {role: 'ai', text: '❌ Lỗi kết nối AI. Vui lòng thử lại.'}]);
                                }
                            }
                        }}
                        placeholder="Hỏi về phương pháp dạy học..." 
                        className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
            </div>
        )}

        {/* SHCM FORM & RESULT */}
        {hasChosenSubject && activeTab === 'shcm' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
               <div className="lg:col-span-4 space-y-6">
                   <div className="bg-white shadow-xl shadow-slate-200/50 rounded-2xl border border-slate-100 overflow-hidden flex flex-col h-full">
                       <div className="bg-gradient-to-r from-emerald-50 to-teal-50 px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                            <h2 className="text-lg font-bold text-slate-800 flex items-center">
                                Cấu hình SHCM
                            </h2>
                       </div>
                       <div className="p-6 space-y-8 flex-grow overflow-y-auto">
                            {/* Group 1: Thông tin chung */}
                            <div className="space-y-4">
                                <h3 className="font-bold text-sm text-emerald-800 uppercase tracking-wider border-b border-emerald-100 pb-2">1. Thông tin chung</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="label-text">Tên Trường</label>
                                        <input type="text" className="input-field" value={shcmInput.schoolName} onChange={(e) => setShcmInput({...shcmInput, schoolName: e.target.value})} />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="label-text">Năm học</label>
                                        <input type="text" className="input-field" value={shcmInput.academicYear} onChange={(e) => setShcmInput({...shcmInput, academicYear: e.target.value})} />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="label-text">Tên Tổ / Nhóm</label>
                                        <input type="text" className="input-field" value={shcmInput.groupName} onChange={(e) => setShcmInput({...shcmInput, groupName: e.target.value})} />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="label-text">Môn học (Đã chọn ở trên)</label>
                                        <input type="text" className="input-field bg-slate-50 text-slate-500" value={subject} disabled />
                                    </div>
                                </div>
                            </div>

                            {/* Group 2: Thành phần */}
                            <div className="space-y-4">
                                <h3 className="font-bold text-sm text-emerald-800 uppercase tracking-wider border-b border-emerald-100 pb-2">2. Nhân sự & Tổ chức</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="label-text">Tổ trưởng chuyên môn</label>
                                        <input type="text" className="input-field" value={shcmInput.leaderName} onChange={(e) => setShcmInput({...shcmInput, leaderName: e.target.value})} />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="label-text">Người chủ trì cuộc họp</label>
                                        <input type="text" className="input-field" value={shcmInput.hostName} onChange={(e) => setShcmInput({...shcmInput, hostName: e.target.value})} />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="label-text">Thư ký</label>
                                        <input type="text" className="input-field" value={shcmInput.secretaryName} onChange={(e) => setShcmInput({...shcmInput, secretaryName: e.target.value})} />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="label-text">Đại diện BGH</label>
                                        <input type="text" className="input-field" value={shcmInput.vicePrincipalName} onChange={(e) => setShcmInput({...shcmInput, vicePrincipalName: e.target.value})} />
                                    </div>
                                </div>
                                <div className="space-y-2 pt-2">
                                    <div className="flex justify-between items-center bg-slate-50 p-3 rounded-lg border border-slate-100">
                                        <label className="text-sm font-semibold text-slate-700">Danh sách Giáo viên</label>
                                        <button onClick={() => setShcmInput(prev => ({...prev, teachers: [...prev.teachers, {name: '', birthYear: '', specialty: '', degree: ''}]}))} className="text-xs bg-white border border-slate-200 px-3 py-1.5 rounded-md shadow-sm text-emerald-600 font-bold hover:bg-emerald-50 transition-colors">+ Thêm GV</button>
                                    </div>
                                    <div className="space-y-2 mt-2">
                                        {shcmInput.teachers.map((t, i) => (
                                            <div key={i} className="p-3 bg-white border border-slate-200 rounded-lg space-y-2 shadow-sm relative group">
                                                <button onClick={() => setShcmInput(prev => ({...prev, teachers: prev.teachers.filter((_, idx) => idx !== i)}))} className="absolute top-2 right-2 text-slate-400 hover:text-red-500 bg-white p-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="w-4 h-4" /></button>
                                                <div className="grid grid-cols-2 gap-2">
                                                    <input type="text" placeholder="Họ và tên" className="w-full text-sm border-slate-200 rounded-md p-2 bg-slate-50 focus:bg-white" value={t.name} onChange={(e) => setShcmInput(prev => { const arr = [...prev.teachers]; arr[i].name = e.target.value; return {...prev, teachers: arr}; })} />
                                                    <input type="text" placeholder="Năm sinh" className="w-full text-sm border-slate-200 rounded-md p-2 bg-slate-50 focus:bg-white" value={t.birthYear} onChange={(e) => setShcmInput(prev => { const arr = [...prev.teachers]; arr[i].birthYear = e.target.value; return {...prev, teachers: arr}; })} />
                                                </div>
                                                <div className="grid grid-cols-2 gap-2">
                                                    <input type="text" placeholder="Chuyên môn" className="w-full text-sm border-slate-200 rounded-md p-2 bg-slate-50 focus:bg-white" value={t.specialty} onChange={(e) => setShcmInput(prev => { const arr = [...prev.teachers]; arr[i].specialty = e.target.value; return {...prev, teachers: arr}; })} />
                                                    <input type="text" placeholder="Trình độ" className="w-full text-sm border-slate-200 rounded-md p-2 bg-slate-50 focus:bg-white" value={t.degree} onChange={(e) => setShcmInput(prev => { const arr = [...prev.teachers]; arr[i].degree = e.target.value; return {...prev, teachers: arr}; })} />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Group 3: Tùy chọn tạo */}
                            <div className="space-y-4">
                                <h3 className="font-bold text-sm text-emerald-800 uppercase tracking-wider border-b border-emerald-100 pb-2">3. Tuỳ chọn tạo sổ</h3>
                                <div className="space-y-2">
                                    <label className="label-text">Chọn tháng cần tạo (Bỏ trống = Cả năm)</label>
                                    <div className="grid grid-cols-5 gap-2 p-3 bg-slate-50 border border-slate-100 rounded-xl">
                                        {[8, 9, 10, 11, 12, 1, 2, 3, 4, 5].map(m => (
                                            <label key={m} className={`flex items-center justify-center p-2 rounded-lg cursor-pointer transition-all border ${shcmInput.selectedMonths.includes(m) ? 'bg-emerald-100 border-emerald-200 text-emerald-800 font-bold' : 'bg-white border-slate-200 text-slate-600 hover:border-emerald-300'}`}>
                                                <input 
                                                    type="checkbox" 
                                                    className="sr-only"
                                                    checked={shcmInput.selectedMonths.includes(m)}
                                                    onChange={(e) => {
                                                        if (e.target.checked) setShcmInput({...shcmInput, selectedMonths: [...shcmInput.selectedMonths, m]});
                                                        else setShcmInput({...shcmInput, selectedMonths: shcmInput.selectedMonths.filter(x => x !== m)});
                                                    }}
                                                />
                                                <span className="text-xs">Tháng {m}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                                    <div className="space-y-2">
                                        <label className="label-text">Độ dài (chữ/buổi)</label>
                                        <input type="text" className="input-field" value={shcmInput.contentLength || ''} onChange={(e) => setShcmInput({...shcmInput, contentLength: e.target.value})} placeholder="VD: 300-500, 200..."></input>
                                    </div>
                                    <div>
                                        <label className="flex items-center space-x-3 px-3 w-full bg-emerald-50 rounded-lg border border-emerald-100 cursor-pointer hover:bg-emerald-100/50 transition-colors" style={{ height: '46px' }}>
                                            <input 
                                                type="checkbox" 
                                                className="rounded border-emerald-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                                                checked={shcmInput.includeGeneralPlan}
                                                onChange={(e) => setShcmInput({...shcmInput, includeGeneralPlan: e.target.checked})}
                                            />
                                            <span className="text-sm font-bold text-emerald-900 block leading-tight">Kèm Kế hoạch chung</span>
                                        </label>
                                    </div>
                                </div>
                            </div>

                            {/* Group 4: Nội dung */}
                            <div className="flex flex-col gap-4 pt-2 w-full">
                                <h3 className="font-bold text-sm text-emerald-800 uppercase tracking-wider border-b border-emerald-100 pb-2">4. Định hướng nội dung</h3>
                                <div className="flex flex-col gap-4 w-full">
                                    <div className="flex flex-col gap-2 w-full">
                                        <label className="label-text">Yêu cầu, định hướng chung</label>
                                        <textarea className="input-field w-full min-h-[100px] text-sm resize-y custom-scrollbar" value={shcmInput.requirements} onChange={(e) => setShcmInput({...shcmInput, requirements: e.target.value})} placeholder="Tập trung vào vấn đề gì trong năm học này..."></textarea>
                                    </div>
                                    <div className="flex flex-col gap-2 w-full">
                                        <label className="label-text">Chủ đề chi tiết (Tuỳ chọn)</label>
                                        <textarea className="input-field w-full min-h-[100px] text-sm resize-y custom-scrollbar" value={shcmInput.customTopics} onChange={(e) => setShcmInput({...shcmInput, customTopics: e.target.value})} placeholder="VD: Tháng 10 - Đ/c Đạt dạy minh họa STEM..."></textarea>
                                    </div>
                                </div>
                            </div>
                       </div>
                       <div className="p-6 bg-slate-50 border-t border-slate-100">
                           <button
                               onClick={handleGenerateSHCM}
                               disabled={loading}
                               className="w-full flex items-center justify-center py-3 px-4 rounded-xl text-sm font-bold text-white transition-all bg-emerald-600 hover:bg-emerald-700 shadow-sm disabled:opacity-50"
                           >
                               {loading ? <><Loader2 className="animate-spin mr-2 w-5 h-5"/> Đang tạo...</> : <><Users className="mr-2 w-5 h-5"/> {shcmResult ? "TẠO LẠI SỔ SHCM" : "TẠO SỔ SHCM"}</>}
                           </button>
                       </div>
                   </div>
               </div>

               <div className="lg:col-span-8 flex flex-col items-center">
                   {shcmResult ? (
                       <div className="w-full space-y-6">
                           <div className="bg-white shadow-xl shadow-slate-200/50 rounded-2xl border border-slate-100 p-8 text-center max-w-xl mx-auto space-y-6">
                               <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                   <Users className="w-10 h-10 text-emerald-600" />
                               </div>
                               <h3 className="text-2xl font-bold text-slate-800">Đã tạo thành công!</h3>
                               <p className="text-slate-600 leading-relaxed">
                                   AI đã soạn thành công Sổ Sinh Hoạt Chuyên Môn cho tổ <strong>{shcmResult.groupName}</strong> năm học {shcmResult.academicYear}.<br/>
                                   Bao gồm <strong>{shcmResult.meetings.length} biên bản</strong> họp và toàn bộ kế hoạch.
                               </p>
                               <button onClick={handleDownloadSHCM} className="btn-primary flex items-center justify-center w-full mx-auto bg-emerald-600 hover:bg-emerald-700" style={{maxWidth: '300px'}}>
                                   <DownloadCloud className="mr-2 w-5 h-5"/> Tải file Word (Sổ SHCM)
                               </button>
                           </div>
                           
                           {/* Preview Section */}
                           <div className="bg-white shadow-sm rounded-xl border border-slate-200 overflow-hidden w-full">
                               <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
                                   <h3 className="font-bold text-slate-700 flex items-center">
                                       <FileText className="w-5 h-5 mr-2 text-slate-400" />
                                       Xem trước các biên bản họp
                                   </h3>
                                   <span className="text-xs font-semibold bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-full">
                                       {shcmResult.meetings.length} biên bản
                                   </span>
                               </div>
                               <div className="p-6 max-h-[500px] overflow-y-auto space-y-4">
                                   {shcmResult.meetings.map((meeting, idx) => (
                                       <div key={idx} className="border border-slate-100 rounded-lg p-4 bg-slate-50/50">
                                            <div className="flex justify-between items-center mb-2">
                                                <h4 className="font-bold text-emerald-700">Cuộc họp {meeting.meetingNumber}</h4>
                                                <span className="text-xs font-semibold text-slate-500 bg-white px-2 py-1 rounded border border-slate-200">
                                                    <CalendarDays className="w-3.5 h-3.5 inline mr-1 -mt-0.5" />
                                                    {meeting.date}
                                                </span>
                                            </div>
                                            <div className="prose prose-sm prose-slate max-w-none text-sm markdown-body">
                                                <ReactMarkdown remarkPlugins={[remarkGfm]}>{meeting.contentMarkdown}</ReactMarkdown>
                                            </div>
                                       </div>
                                   ))}
                               </div>
                           </div>
                       </div>
                   ) : (
                       <div className="text-center p-12 bg-white/50 rounded-2xl border border-slate-100 mt-20">
                           <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                               <Users className="w-8 h-8 text-slate-400" />
                           </div>
                           <p className="text-slate-500 font-medium">Nhập thông tin và tải cấu hình để tạo Sổ Sinh Hoạt Chuyên Môn</p>
                       </div>
                   )}
               </div>
            </div>
        )}

        {hasChosenSubject && !['guide', 'shcm'].includes(activeTab) && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Column: Input Forms */}
            <div className={`lg:col-span-4 space-y-6 ${activeTab === 'converter' ? 'lg:col-span-full' : ''}`}>
                
                {/* LESSON PLAN FORM */}
                {activeTab === 'lesson' && (
                <div className="bg-white shadow-xl shadow-slate-200/50 rounded-2xl border border-slate-100 overflow-hidden flex flex-col h-full">
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                        <h2 className="text-lg font-bold text-slate-800 flex items-center">
                            Thiết lập bài dạy
                        </h2>
                    </div>
                    
                    <div className="p-6 space-y-6 flex-grow">
                        {/* Section 1: General Info */}
                        <div className="grid grid-cols-1 gap-5">
                            <div className="space-y-2">
                                <label className="label-text">Khối lớp</label>
                                <div className="relative">
                                    <select
                                        value={lessonInput.grade}
                                        onChange={(e) => setLessonInput({...lessonInput, grade: e.target.value as GradeLevel})}
                                        className="input-field cursor-pointer"
                                    >
                                        {availableGrades.map((g) => <option key={g} value={g}>{g}</option>)}
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* --- NEW: WEEKLY MODE TOGGLE --- */}
                        <div className="flex items-center space-x-3 pt-2 border-t border-slate-100">
                             <label className="label-text text-base text-slate-800 flex-grow">
                                Chế độ soạn bài
                            </label>
                            <div className="flex bg-slate-100 p-1 rounded-lg">
                                <button
                                    onClick={() => setIsWeeklyMode(false)}
                                    className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${!isWeeklyMode ? 'bg-white shadow text-blue-700' : 'text-slate-500'}`}
                                >
                                    Từng bài
                                </button>
                                <button
                                    onClick={() => setIsWeeklyMode(true)}
                                    className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${isWeeklyMode ? 'bg-white shadow text-blue-700' : 'text-slate-500'}`}
                                >
                                    Theo tuần
                                </button>
                            </div>
                        </div>

                        {/* Section 2: Topic Content (Conditional) */}
                        {!isWeeklyMode ? (
                            <div className="space-y-4">
                                <label className="label-text">Nội dung bài dạy</label>
                                {/* Textbook Selection */}
                                <div className="relative">
                                    <select
                                        onChange={handleLessonSelect}
                                        className="input-field cursor-pointer text-slate-700 text-sm"
                                        value=""
                                    >
                                        <option value="">-- Chọn nhanh từ SGK (KNTT) --</option>
                                        {currentCurriculum?.chapters.map((c) => (
                                            <optgroup key={c.name} label={c.name}>
                                                <option value={`__CHAPTER__|${c.name}|${c.lessons.map(l => l.split('|')[0]).join(', ')}`}>
                                                    -- CHỌN TOÀN BỘ: {c.name.toUpperCase()} --
                                                </option>
                                                {c.lessons.map((l) => {
                                                    const [name] = l.split('|');
                                                    return <option key={l} value={l}>{name}</option>
                                                })}
                                            </optgroup>
                                        ))}
                                    </select>
                                </div>

                                {/* Manual Topic Input */}
                                <input
                                    type="text"
                                    value={lessonInput.topic}
                                    onChange={(e) => setLessonInput({...lessonInput, topic: e.target.value})}
                                    placeholder="Hoặc nhập tên bài dạy..."
                                    className="input-field font-medium"
                                />
                                
                                <div className="space-y-2">
                                    <label className="label-text">Thời lượng</label>
                                    <input
                                        type="text"
                                        value={lessonInput.duration}
                                        onChange={(e) => setLessonInput({...lessonInput, duration: e.target.value})}
                                        className="input-field"
                                        placeholder="VD: 1 tiết (45 phút)"
                                    />
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="label-text">Tên Tuần</label>
                                    <div className="flex items-center space-x-2">
                                        <CalendarDays className="w-5 h-5 text-slate-400"/>
                                        <input
                                            type="text"
                                            value={currentWeekName}
                                            onChange={(e) => setCurrentWeekName(e.target.value)}
                                            className="input-field font-bold text-blue-700"
                                            placeholder="VD: Tuần 15"
                                        />
                                    </div>
                                </div>

                                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                                     <label className="label-text mb-3">Thêm bài học vào tuần</label>
                                     
                                     {/* Quick Select in Weekly Mode */}
                                     <div className="relative mb-3">
                                        <select
                                            onChange={handleLessonSelect}
                                            className="input-field cursor-pointer text-slate-700 text-xs py-2"
                                            value=""
                                        >
                                            <option value="">-- Chọn nhanh từ SGK --</option>
                                            {currentCurriculum?.chapters.map((c) => (
                                                <optgroup key={c.name} label={c.name}>
                                                    <option value={`__CHAPTER__|${c.name}|${c.lessons.map(l => l.split('|')[0]).join(', ')}`}>
                                                        -- CHỌN TOÀN BỘ: {c.name.toUpperCase()} --
                                                    </option>
                                                    {c.lessons.map((l) => {
                                                        const [name] = l.split('|');
                                                        return <option key={l} value={l}>{name}</option>
                                                    })}
                                                </optgroup>
                                            ))}
                                        </select>
                                    </div>

                                     <div className="space-y-2 mb-3">
                                        <input
                                            type="text"
                                            value={tempTopic}
                                            onChange={(e) => setTempTopic(e.target.value)}
                                            placeholder="Tên bài (VD: Ôn tập chương I)"
                                            className="input-field text-sm"
                                        />
                                        <div className="flex space-x-2">
                                            <div className="w-1/2">
                                                <input
                                                    type="text"
                                                    value={tempDuration}
                                                    onChange={(e) => setTempDuration(e.target.value)}
                                                    placeholder="Tổng số tiết (VD: 2 tiết)"
                                                    className="input-field text-sm"
                                                    title="Tổng thời lượng của bài học này"
                                                />
                                            </div>
                                            <div className="w-1/2">
                                                <input
                                                    type="text"
                                                    value={tempSpecificPeriod}
                                                    onChange={(e) => setTempSpecificPeriod(e.target.value)}
                                                    placeholder="Tiết thứ (VD: Tiết 1)"
                                                    className="input-field text-sm"
                                                    title="Tiết dạy cụ thể trong tuần này"
                                                />
                                            </div>
                                        </div>
                                     </div>
                                     <button 
                                        onClick={handleAddLessonItem}
                                        className="w-full flex items-center justify-center py-2 bg-blue-100 text-blue-700 rounded-lg text-sm font-bold hover:bg-blue-200 transition-colors"
                                     >
                                        <Plus className="w-4 h-4 mr-1"/> Thêm vào danh sách
                                     </button>
                                </div>

                                {/* List of items */}
                                {lessonItems.length > 0 && (
                                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                                        {lessonItems.map((item, idx) => (
                                            <div key={idx} className="flex justify-between items-start bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                                                <div className="text-sm">
                                                    <span className="font-bold text-slate-800 block">{idx + 1}. {item.topic}</span>
                                                    <div className="flex items-center space-x-2 mt-1">
                                                        <span className="text-xs text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded flex items-center">
                                                            <Clock className="w-3 h-3 mr-1"/> {item.duration}
                                                        </span>
                                                        {item.specificPeriod && (
                                                            <span className="text-xs text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded font-medium border border-blue-100">
                                                                Dạy: {item.specificPeriod}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                <button onClick={() => handleRemoveLessonItem(idx)} className="text-slate-400 hover:text-red-500 p-1">
                                                    <Trash2 className="w-4 h-4"/>
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}


                        {/* Section 3: Resources */}
                        <div className="space-y-3 pt-2 border-t border-slate-100">
                             <div className="flex justify-between items-center">
                                 <label className="label-text text-base text-slate-800">
                                    Tài liệu tham khảo
                                </label>
                                <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full border border-slate-200">PDF, Word</span>
                             </div>
                             
                             <label className="upload-box group relative overflow-hidden transition-all duration-300 hover:shadow-md hover:border-blue-400">
                                <div className="flex flex-col items-center z-10 p-4">
                                    <div className="p-3 bg-blue-50 rounded-full shadow-sm mb-3 group-hover:scale-110 group-hover:bg-blue-100 transition-transform">
                                        <Upload className="w-6 h-6 text-blue-600" />
                                    </div>
                                    <span className="text-sm text-slate-600 font-medium group-hover:text-blue-700 text-center">
                                        Tải lên giáo án cũ hoặc tài liệu bổ trợ
                                    </span>
                                </div>
                                <input type="file" className="hidden" accept=".pdf,.docx,.doc" multiple onChange={handleDocFilesChange} />
                            </label>

                             {docFiles.length > 0 && (
                                <div className="mt-3 space-y-2 max-h-32 overflow-y-auto pr-1 custom-scrollbar">
                                    {docFiles.map((file, idx) => (
                                        <div key={idx} className="flex justify-between items-center text-xs bg-white text-slate-700 px-3 py-2.5 rounded-lg border border-slate-200 shadow-sm group/file hover:border-blue-300 transition-colors">
                                            <div className="flex items-center overflow-hidden">
                                                <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 mr-2 flex-shrink-0" />
                                                <span className="truncate font-medium">{file.name}</span>
                                            </div>
                                            <button onClick={() => removeDocFile(idx)} className="text-slate-400 hover:text-red-500 p-1 rounded transition-colors"><X className="w-3.5 h-3.5"/></button>
                                        </div>
                                    ))}
                                </div>
                             )}
                        </div>

                        {/* Section 4: Extra Notes */}
                        <div className="pt-4 border-t border-slate-100">
                            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                                <label className="flex items-center text-sm font-bold text-slate-700 mb-3">
                                    <PenLine className="w-4 h-4 mr-2 text-blue-600"/>
                                    Yêu cầu bổ sung
                                </label>
                                <textarea
                                    rows={4}
                                    value={lessonInput.context}
                                    onChange={(e) => setLessonInput({...lessonInput, context: e.target.value})}
                                    placeholder="Ví dụ: Lớp học năng động, tập trung vào hoạt động nhóm, có sử dụng máy chiếu..."
                                    className="block w-full bg-white border border-slate-300 rounded-lg py-3 px-4 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-shadow resize-y"
                                />
                                {/* Quick Templates */}
                                <div className="flex flex-wrap gap-1.5 mt-2">
                                    {[
                                        { label: '🎯 STEM', text: 'Tích hợp STEM, học sinh trải nghiệm thực tế, sử dụng đồ dùng tự làm' },
                                        { label: '💻 CNTT', text: 'Sử dụng máy chiếu, phần mềm mô phỏng, học sinh thao tác trên máy tính' },
                                        { label: '👥 Nhóm', text: 'Tổ chức hoạt động nhóm 4-6 HS, kỹ thuật khăn trải bàn, sơ đồ tư duy' },
                                        { label: '🎮 Trò chơi', text: 'Tích hợp trò chơi học tập, quiz tương tác, thi đua giữa các nhóm' },
                                        { label: '📊 Phân hóa', text: 'Dạy phân hóa theo năng lực: bài cơ bản cho HS yếu, bài nâng cao cho HS giỏi' },
                                    ].map(t => (
                                        <button key={t.label} type="button" onClick={() => setLessonInput({...lessonInput, context: lessonInput.context ? lessonInput.context + '. ' + t.text : t.text})}
                                            className="text-xs bg-white border border-slate-200 hover:border-blue-400 hover:bg-blue-50 text-slate-600 hover:text-blue-700 px-2.5 py-1 rounded-lg transition-colors font-medium">
                                            {t.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="pt-4 mt-auto">
                            <button
                                onClick={handleGenerateLesson}
                                disabled={loading}
                                className="w-full flex items-center justify-center py-4 px-6 rounded-xl text-sm font-bold text-white transition-colors bg-blue-600 hover:bg-blue-700 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading && activeTab === 'lesson' ? <><Loader2 className="animate-spin mr-2 w-5 h-5"/> {loadingText}</> : <><Plus className="mr-2 w-5 h-5"/> {isWeeklyMode ? "TẠO GIÁO ÁN TUẦN" : "TẠO GIÁO ÁN NGAY"}</>}
                            </button>
                        </div>
                    </div>
                </div>
                )}

                {/* EXAM FORM */}
                {activeTab === 'exam' && (
                <div className="bg-white shadow-xl shadow-slate-200/50 rounded-2xl border border-slate-100 overflow-hidden flex flex-col h-full">
                    <div className="bg-gradient-to-r from-indigo-50 to-purple-50 px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                        <h2 className="text-lg font-bold text-slate-800 flex items-center">
                            Thiết lập Đề thi
                        </h2>
                    </div>

                    <div className="p-6 space-y-6 flex-grow">
                        {/* Section 1: Logistics */}
                        <div className="grid grid-cols-2 gap-5">
                            <div className="space-y-2">
                                <label className="label-text">Khối lớp</label>
                                <div className="relative">
                                    <select
                                        value={examInput.grade}
                                        onChange={(e) => setExamInput({...examInput, grade: e.target.value as GradeLevel})}
                                        className="input-field cursor-pointer"
                                    >
                                       {availableGrades.map((g) => <option key={g} value={g}>{g}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="label-text">Thời gian</label>
                                <div className="relative">
                                    <select 
                                        value={examInput.duration}
                                        onChange={(e) => setExamInput({...examInput, duration: e.target.value})}
                                        className="input-field cursor-pointer"
                                    >
                                        <option value="15 phút">15 phút</option>
                                        <option value="45 phút">45 phút</option>
                                        <option value="60 phút">60 phút</option>
                                        <option value="90 phút">90 phút</option>
                                        <option value="120 phút">120 phút</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                         {/* Section 2: Content Scope */}
                         <div className="space-y-4 pt-2 border-t border-slate-100">
                             <label className="label-text text-base text-slate-800">
                                Phạm vi kiến thức
                            </label>
                            
                            <div className="relative">
                                <select
                                    onChange={handleExamTopicSelect}
                                    className="input-field cursor-pointer text-slate-700"
                                    value=""
                                >
                                    <option value="">-- Chọn nội dung từ SGK để thêm vào --</option>
                                    {currentCurriculum?.chapters.map((c) => (
                                        <optgroup key={c.name} label={c.name}>
                                            <option value={`__CHAPTER__|${c.name}|${c.lessons.map(l => l.split('|')[0]).join(', ')}`}>
                                                -- CHỌN TOÀN BỘ: {c.name.toUpperCase()} --
                                            </option>
                                           {c.lessons.map((l) => {
                                                const [name] = l.split('|');
                                                return <option key={l} value={l}>{name}</option>
                                            })}
                                        </optgroup>
                                    ))}
                                </select>
                            </div>

                            <input
                                type="text"
                                value={examInput.topic}
                                onChange={(e) => setExamInput({...examInput, topic: e.target.value})}
                                placeholder="Nội dung chi tiết (VD: Chương I và bài 1, 2 chương II)..."
                                className="input-field font-medium"
                            />
                        </div>

                        {/* Section 3: Technical Specs (Matrix) - Highlighted Box */}
                        <div className="p-5 bg-slate-50 rounded-xl border border-slate-200 relative mt-2">
                            <div className="flex items-center space-x-2 mb-4 pb-2 border-b border-slate-200">
                                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Cấu hình Ma trận đề</span>
                            </div>
                            
                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs font-semibold text-slate-500 mb-1.5 block uppercase">Hình thức đề thi</label>
                                    <div className="relative">
                                        <select
                                            value={examInput.matrixType}
                                            onChange={(e) => {
                                                const val = e.target.value as ExamInput['matrixType'];
                                                const updates: Partial<ExamInput> = { matrixType: val };
                                                if (val === 'CV7991') updates.tnTypes = ['1-dap-an', 'dung-sai', 'tra-loi-ngan'];
                                                else if (val === 'TL100') updates.tnTypes = [];
                                                else if (val === 'TN100') updates.tnTypes = examInput.tnTypes?.length ? examInput.tnTypes : ['1-dap-an'];
                                                else updates.tnTypes = examInput.tnTypes?.length ? examInput.tnTypes : ['1-dap-an'];
                                                if (val === 'CUSTOM') { updates.tnPercent = examInput.tnPercent || 50; updates.tlPercent = examInput.tlPercent || 50; }
                                                setExamInput(prev => ({...prev, ...updates}));
                                            }}
                                            className="block w-full bg-white border border-slate-300 rounded-lg py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent cursor-pointer"
                                        >
                                            <option value="CV7991">Theo Công văn 7991 (Mẫu mới BGD)</option>
                                            <option value="MIX73">70% TN - 30% TL</option>
                                            <option value="MIX55">50% TN - 50% TL</option>
                                            <option value="MIX37">30% TN - 70% TL</option>
                                            <option value="TN100">100% Trắc nghiệm</option>
                                            <option value="TL100">100% Tự luận</option>
                                            <option value="CUSTOM">⚙️ Tùy chỉnh tỉ lệ %</option>
                                        </select>
                                    </div>
                                </div>

                                {/* CUSTOM: Tỉ lệ % TN/TL */}
                                {examInput.matrixType === 'CUSTOM' && (
                                    <div className="bg-indigo-50 rounded-xl p-4 border border-indigo-200 space-y-3">
                                        <label className="text-xs font-semibold text-indigo-700 block uppercase">Tỉ lệ Trắc nghiệm / Tự luận</label>
                                        <div className="flex items-center gap-3">
                                            <div className="flex-1">
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className="text-xs font-medium text-indigo-600">TN: {examInput.tnPercent || 50}%</span>
                                                    <span className="text-xs font-medium text-emerald-600">TL: {examInput.tlPercent || 50}%</span>
                                                </div>
                                                <input
                                                    type="range"
                                                    min={0} max={100} step={10}
                                                    value={examInput.tnPercent || 50}
                                                    onChange={(e) => {
                                                        const tn = parseInt(e.target.value);
                                                        setExamInput(prev => ({...prev, tnPercent: tn, tlPercent: 100 - tn, tnTypes: tn === 0 ? [] : (prev.tnTypes?.length ? prev.tnTypes : ['1-dap-an'])}));
                                                    }}
                                                    className="w-full h-2 bg-gradient-to-r from-indigo-300 to-emerald-300 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                                                />
                                                <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                                                    <span>100% TL</span>
                                                    <span>50/50</span>
                                                    <span>100% TN</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Loại trắc nghiệm — hiện khi có TN */}
                                {examInput.matrixType !== 'TL100' && !(examInput.matrixType === 'CUSTOM' && (examInput.tnPercent || 0) === 0) && (
                                    <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
                                        <label className="text-xs font-semibold text-amber-700 mb-2.5 block uppercase">Loại câu trắc nghiệm</label>
                                        <div className="space-y-2">
                                            {([
                                                { value: '1-dap-an', label: 'Nhiều lựa chọn (A, B, C, D)', desc: '1 đáp án đúng' },
                                                { value: 'dung-sai', label: 'Đúng - Sai', desc: '4 mệnh đề a, b, c, d' },
                                                { value: 'tra-loi-ngan', label: 'Trả lời ngắn', desc: 'Ghi đáp án cuối cùng' },
                                            ] as const).map(opt => {
                                                const isCV7991 = examInput.matrixType === 'CV7991';
                                                const checked = isCV7991 || (examInput.tnTypes || []).includes(opt.value);
                                                return (
                                                    <label key={opt.value} className={`flex items-start gap-2.5 p-2 rounded-lg transition-colors ${isCV7991 ? 'opacity-70' : 'hover:bg-amber-100/50 cursor-pointer'}`}>
                                                        <input
                                                            type="checkbox"
                                                            checked={checked}
                                                            disabled={isCV7991}
                                                            onChange={() => {
                                                                if (isCV7991) return;
                                                                const cur = examInput.tnTypes || [];
                                                                const next = cur.includes(opt.value)
                                                                    ? cur.filter(t => t !== opt.value)
                                                                    : [...cur, opt.value];
                                                                if (next.length === 0) return; // Phải chọn ít nhất 1
                                                                setExamInput(prev => ({...prev, tnTypes: next}));
                                                            }}
                                                            className="mt-0.5 w-4 h-4 rounded border-amber-300 text-amber-600 focus:ring-amber-500 accent-amber-600"
                                                        />
                                                        <div>
                                                            <span className="text-sm font-medium text-slate-700">{opt.label}</span>
                                                            <span className="text-xs text-slate-400 ml-1.5">— {opt.desc}</span>
                                                        </div>
                                                    </label>
                                                );
                                            })}
                                            {examInput.matrixType === 'CV7991' && (
                                                <p className="text-[11px] text-amber-600 italic mt-1">* CV 7991 yêu cầu bắt buộc cả 3 loại trắc nghiệm</p>
                                            )}
                                        </div>
                                    </div>
                                )}

                                <div>
                                    <label className="text-xs font-semibold text-slate-500 mb-1.5 block uppercase">Mức độ nhận thức</label>
                                    <div className="relative">
                                        <select
                                            value={examInput.matrixType === 'CV7991' ? '4-3-3' : examInput.difficulty}
                                            onChange={(e) => setExamInput({...examInput, difficulty: e.target.value})}
                                            disabled={examInput.matrixType === 'CV7991'}
                                            className={`block w-full border border-slate-300 rounded-lg py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${examInput.matrixType === 'CV7991' ? 'bg-slate-100 cursor-not-allowed text-slate-600' : 'bg-white cursor-pointer'}`}
                                        >
                                            {examInput.matrixType === 'CV7991' ? (
                                                <option value="4-3-3">40% NB - 30% TH - 30% VD (Cố định theo chuẩn CV 7991)</option>
                                            ) : (
                                                <>
                                                    <option value="4-3-2-1">40% NB - 30% TH - 20% VD - 10% VDC (Chuẩn)</option>
                                                    <option value="3-4-2-1">30% NB - 40% TH - 20% VD - 10% VDC (Nâng cao)</option>
                                                </>
                                            )}
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Section 4: Context */}
                        <div className="pt-4 border-t border-slate-100">
                            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                                <label className="flex items-center text-sm font-bold text-slate-700 mb-3">
                                    <PenLine className="w-4 h-4 mr-2 text-indigo-600"/>
                                    Yêu cầu đặc biệt
                                </label>
                                <textarea
                                    rows={3}
                                    value={examInput.context}
                                    onChange={(e) => setExamInput({...examInput, context: e.target.value})}
                                    placeholder="VD: Không ra bài toán đố, tập trung vào hình học phẳng..."
                                    className="block w-full bg-white border border-slate-300 rounded-lg py-3 px-4 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm transition-shadow resize-y"
                                />
                            </div>
                        </div>

                        <div className="pt-4 mt-auto">
                            <button
                                onClick={handleGenerateExam}
                                disabled={loading}
                                className="w-full flex items-center justify-center py-4 px-6 rounded-xl text-sm font-bold text-white transition-colors bg-indigo-600 hover:bg-indigo-700 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading && activeTab === 'exam' ? <><Loader2 className="animate-spin mr-2 w-5 h-5"/> {loadingText}</> : <><Sparkles className="mr-2 w-5 h-5"/> TẠO MA TRẬN & ĐỀ THI</>}
                            </button>
                        </div>
                    </div>
                </div>
                )}

                {/* WORKSHEET FORM */}
                {activeTab === 'worksheet' && (
                <div className="bg-white shadow-xl shadow-slate-200/50 rounded-2xl border border-slate-100 overflow-hidden flex flex-col h-full">
                    <div className="bg-gradient-to-r from-pink-50 to-rose-50 px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                        <h2 className="text-lg font-bold text-slate-800 flex items-center">
                            Tạo Phiếu Bài Tập Chuyên Đề
                        </h2>
                    </div>
                    <div className="p-6 space-y-6 flex-grow flex flex-col">
                        {/* Section 1: Basic Info */}
                        <div>
                            <label className="flex items-center text-sm font-bold text-slate-700 mb-3">
                                <BookOpen className="w-4 h-4 mr-2 text-pink-600"/>
                                Chủ đề phiếu bài tập
                            </label>
                            <input
                                type="text"
                                value={worksheetInput.topic}
                                onChange={(e) => setWorksheetInput({...worksheetInput, topic: e.target.value})}
                                placeholder="VD: Giải hệ phương trình bậc nhất hai ẩn, Bài tập tính từ tiếng Anh..."
                                className="block w-full border border-slate-300 rounded-xl py-3 px-4 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent text-sm transition-shadow shadow-sm"
                            />
                        </div>

                        {/* Section 2: Properties */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Số lượng câu hỏi</label>
                                <input
                                    type="text"
                                    value={worksheetInput.numQuestions}
                                    onChange={(e) => setWorksheetInput({...worksheetInput, numQuestions: e.target.value})}
                                    placeholder="VD: 10, 20..."
                                    className="block w-full border border-slate-300 rounded-lg py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 bg-white"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Thời gian (Phiếu)</label>
                                <select
                                    value={worksheetInput.duration}
                                    onChange={(e) => setWorksheetInput({...worksheetInput, duration: e.target.value})}
                                    className="block w-full border border-slate-300 rounded-lg py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 bg-white"
                                >
                                    <option value="15 phút">15 phút</option>
                                    <option value="30 phút">30 phút</option>
                                    <option value="45 phút">45 phút</option>
                                    <option value="60 phút">60 phút</option>
                                    <option value="90 phút">90 phút</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Mức độ khó</label>
                                <select
                                    value={worksheetInput.difficulty}
                                    onChange={(e) => setWorksheetInput({...worksheetInput, difficulty: e.target.value})}
                                    className="block w-full border border-slate-300 rounded-lg py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 bg-white cursor-pointer"
                                >
                                    <option value="Cơ bản">Cơ bản (Dễ)</option>
                                    <option value="Cơ bản & Nâng cao">Cơ bản & Nâng cao (Vừa)</option>
                                    <option value="Nâng cao">Nâng cao (Khó)</option>
                                    <option value="Vận dụng cao">Vận dụng cao (Rất khó)</option>
                                </select>
                            </div>
                        </div>

                        {/* Section 2b: Loại câu trắc nghiệm PBT */}
                        <div className="bg-rose-50 rounded-xl p-4 border border-rose-200">
                            <label className="text-xs font-semibold text-rose-700 mb-2.5 block uppercase">Loại câu trắc nghiệm trong phiếu</label>
                            <div className="space-y-2">
                                {([
                                    { value: '1-dap-an' as const, label: 'Nhiều lựa chọn (A, B, C, D)', desc: '1 đáp án đúng' },
                                    { value: 'dung-sai' as const, label: 'Đúng - Sai', desc: '4 mệnh đề a, b, c, d' },
                                    { value: 'tra-loi-ngan' as const, label: 'Trả lời ngắn', desc: 'Ghi đáp án cuối cùng' },
                                ]).map(opt => {
                                    const checked = (worksheetInput.tnTypes || []).includes(opt.value);
                                    return (
                                        <label key={opt.value} className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-rose-100/50 cursor-pointer transition-colors">
                                            <input
                                                type="checkbox"
                                                checked={checked}
                                                onChange={() => {
                                                    const cur = worksheetInput.tnTypes || [];
                                                    const next = cur.includes(opt.value)
                                                        ? cur.filter(t => t !== opt.value)
                                                        : [...cur, opt.value];
                                                    setWorksheetInput(prev => ({...prev, tnTypes: next}));
                                                }}
                                                className="mt-0.5 w-4 h-4 rounded border-rose-300 text-rose-600 focus:ring-rose-500 accent-rose-600"
                                            />
                                            <div>
                                                <span className="text-sm font-medium text-slate-700">{opt.label}</span>
                                                <span className="text-xs text-slate-400 ml-1.5">— {opt.desc}</span>
                                            </div>
                                        </label>
                                    );
                                })}
                                <p className="text-[11px] text-rose-500 italic mt-1">* Bỏ chọn tất cả = Phiếu chỉ có tự luận</p>
                            </div>
                        </div>

                        {/* Section 3: Context */}
                        <div className="pt-4 border-t border-slate-100 flex-grow">
                            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 h-full">
                                <label className="flex items-center text-sm font-bold text-slate-700 mb-3">
                                    <PenLine className="w-4 h-4 mr-2 text-pink-600"/>
                                    Yêu cầu phụ đặc biệt (Nếu có)
                                </label>
                                <textarea
                                    rows={4}
                                    value={worksheetInput.context}
                                    onChange={(e) => setWorksheetInput({...worksheetInput, context: e.target.value})}
                                    placeholder="VD: Yêu cầu học sinh phải vẽ hình, Chỉ lấy các bài toán thực tế, Thêm 2 bài tính nhanh..."
                                    className="block w-full bg-white border border-slate-300 rounded-lg py-3 px-4 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-pink-500 text-sm transition-shadow resize-y"
                                />
                            </div>
                        </div>

                        <div className="pt-4 mt-auto">
                            <button
                                onClick={handleGenerateWorksheet}
                                disabled={loading}
                                className="w-full flex items-center justify-center py-4 px-6 rounded-xl text-sm font-bold text-white transition-colors bg-pink-600 hover:bg-pink-700 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading && activeTab === 'worksheet' ? <><Loader2 className="animate-spin mr-2 w-5 h-5"/> {loadingText}</> : <><FileText className="mr-2 w-5 h-5"/> TẠO PHIẾU BÀI TẬP</>}
                            </button>
                        </div>
                    </div>
                </div>
                )}

                {/* SIMILAR EXAM FORM */}
                {activeTab === 'similar-exam' && (
                     <div className="bg-white shadow-xl shadow-slate-200/50 rounded-2xl border border-slate-100 overflow-hidden flex flex-col h-full">
                        <div className="bg-gradient-to-r from-orange-50 to-amber-50 px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                            <h2 className="text-lg font-bold text-slate-800 flex items-center">
                                Tạo từ Đề thi có sẵn
                            </h2>
                        </div>
                        <div className="p-6 space-y-6 flex-grow">
                            {!pdfProcessed ? (
                                <div className="flex flex-col items-center justify-center h-full py-10 space-y-4">
                                    <label className="upload-box group relative overflow-hidden transition-all duration-300 hover:border-orange-400 w-full max-w-lg">
                                        <div className="flex flex-col items-center z-10 p-8">
                                            <div className="p-4 bg-orange-50 rounded-full shadow-sm mb-4 group-hover:scale-110 group-hover:bg-orange-100 transition-transform">
                                                <FileUp className="w-8 h-8 text-orange-600" />
                                            </div>
                                            <span className="text-base text-slate-600 font-medium group-hover:text-orange-700 text-center">
                                                {loading && !examResult ? loadingText : "Tải lên file Word (.docx)/PDF/ảnh để phân tích"}
                                            </span>
                                            <p className="text-xs text-slate-400 mt-2">AI sẽ đọc, phân tích và tạo đề/bài tập mới</p>
                                            <p className="text-xs text-slate-500 mt-2 font-semibold">...hoặc dán file/ảnh vào trang.</p>
                                        </div>
                                        <input type="file" className="hidden" accept=".pdf,.png,.jpg,.jpeg,.docx" onChange={handlePdfFileChange} disabled={loading} multiple />
                                    </label>

                                    <div className="w-full max-w-lg mt-4 px-1 pb-4">
                                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                                            🎯 Chọn trang PDF cần đọc (Nhập <span className="text-red-500 font-bold">TRƯỚC KHI</span> tải file)
                                        </label>
                                        <input
                                            type="text"
                                            value={pdfPageRange}
                                            onChange={(e) => setPdfPageRange(e.target.value)}
                                            placeholder="Ví dụ: 1-3, 5, 8. Để trống sẽ đọc toàn bộ."
                                            className="w-full p-3 rounded-lg border-2 border-slate-300 focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 bg-white shadow-sm transition-all text-sm font-medium"
                                            disabled={loading}
                                        />
                                        <p className="text-xs text-slate-500 mt-2">Vui lòng nhập trang trước, sau đó click nút tải lên ở trên để chọn file PDF.</p>
                                    </div>
                                </div>
                            ) : (
                                <div>
                                    <div className="flex justify-between items-center bg-slate-50 p-3 rounded-lg border border-slate-200 mb-4">
                                        <div className="flex items-center overflow-hidden">
                                          <CheckCircle2 className="w-5 h-5 text-orange-500 mr-3 flex-shrink-0" />
                                          <p className="text-sm font-medium text-slate-800 truncate">{pdfFiles.length === 1 ? pdfFiles[0].name : `${pdfFiles.length} tệp đã chọn`}</p>
                                        </div>
                                        <button onClick={resetPdfState} className="flex items-center text-xs text-red-600 hover:text-red-800 font-semibold">
                                            <X className="w-3.5 h-3.5 mr-1"/> Đổi file khác
                                        </button>
                                    </div>
                                    
                                    <div className="mb-6">
                                        <div className="flex justify-between items-center mb-3">
                                            <h3 className="text-sm font-bold text-slate-700">Bản xem trước file đã tải lên:</h3>
                                            <button onClick={() => setIsPreviewModalOpen(true)} className="flex items-center text-xs text-indigo-600 hover:text-indigo-800 font-semibold bg-indigo-50 hover:bg-indigo-100 px-2 flex-shrink-0 py-1.5 rounded-md transition-colors" title="Xem chi tiết toàn bộ file">
                                                <Maximize2 className="w-3.5 h-3.5 mr-1"/> Mở rộng toàn màn hình
                                            </button>
                                        </div>
                                        <div className="flex space-x-4 overflow-x-auto pb-3 custom-scrollbar bg-slate-100 p-3 rounded-lg border border-slate-200">
                                            {docxText && (
                                                <div className="p-4 bg-white rounded border border-slate-200 h-40 overflow-y-auto text-xs text-slate-700 w-full">
                                                    {docxText.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().substring(0, 1000)}...
                                                </div>
                                            )}
                                            {pageImagesForPdf.map((imgSrc, index) => (
                                                <img
                                                    key={index}
                                                    src={`data:image/png;base64,${imgSrc}`}
                                                    alt={`Trang ${index + 1}`}
                                                    className="h-40 rounded-md border-2 border-white shadow-md flex-shrink-0"
                                                />
                                            ))}
                                        </div>
                                    </div>

                                    <div className="mb-4">
                                        <label className="flex items-center text-sm font-bold text-slate-700 mb-2">
                                            <PenLine className="w-4 h-4 mr-2 text-indigo-600"/>
                                            Yêu cầu phụ đặc biệt (Nếu có)
                                        </label>
                                        <textarea
                                            rows={2}
                                            value={similarExamContext}
                                            onChange={(e) => setSimilarExamContext(e.target.value)}
                                            placeholder="VD: Đổi số liệu khó hơn, thêm bài hình tĩnh học..."
                                            className="block w-full border border-slate-300 rounded-lg py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                                            disabled={loading}
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4">
                                        {/* Option 1: Generate Similar Exam */}
                                        <div className="bg-gradient-to-br from-orange-50 to-orange-100/50 p-5 rounded-2xl border border-orange-200 flex flex-col relative shadow-sm hover:shadow-md transition-shadow">
                                            <div className="flex items-center mb-2">
                                                <div className="p-2 bg-orange-100 rounded-lg mr-3">
                                                    <Sparkles className="w-5 h-5 text-orange-600" />
                                                </div>
                                                <h3 className="font-bold text-slate-800 text-base">Tạo Đề Mới Tương tự</h3>
                                            </div>
                                            <p className="text-xs text-slate-600 mb-4 flex-grow leading-relaxed">AI sẽ phân tích cấu trúc tổng thể đề gốc và tạo ra đề thi hoàn toàn mới (đổi cả số liệu tự luận).</p>
                                            
                                            {!docxText && (
                                                <div className="mb-4 bg-white/60 p-3 rounded-xl border border-orange-200/50">
                                                    <label className="block text-[11px] font-bold uppercase tracking-wider text-orange-800 mb-1">
                                                        Phân tích các trang:
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={pdfPageRange}
                                                        onChange={(e) => setPdfPageRange(e.target.value)}
                                                        placeholder="VD: 1-3, 5 (để trống: tất cả)"
                                                        className="w-full px-3 py-2 rounded-lg border border-orange-300 focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 bg-white text-xs font-medium"
                                                        disabled={loading}
                                                    />
                                                </div>
                                            )}

                                            <button 
                                                onClick={handleGenerateSimilarExam}
                                                disabled={loading}
                                                className="mt-auto w-full flex items-center justify-center py-2.5 px-4 rounded-xl text-sm font-bold text-white transition-all bg-orange-600 hover:bg-orange-700 shadow-sm hover:shadow-md hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                                            >
                                                {loading ? <Loader2 className="animate-spin mr-2 w-4 h-4"/> : <Sparkles className="mr-2 w-4 h-4"/>}
                                                Tạo Đề
                                            </button>
                                        </div>

                                        {/* Option 2: Generate Similar Exercises */}
                                        <div className="bg-gradient-to-br from-amber-50 to-amber-100/50 p-5 rounded-2xl border border-amber-200 flex flex-col shadow-sm hover:shadow-md transition-shadow">
                                            <div className="flex items-center mb-2">
                                                <div className="p-2 bg-amber-100 rounded-lg mr-3">
                                                    <Files className="w-5 h-5 text-amber-600" />
                                                </div>
                                                <h3 className="font-bold text-slate-800 text-base">Tạo Bài tập Tương tự</h3>
                                            </div>
                                            <p className="text-xs text-slate-600 mb-4 flex-grow leading-relaxed">AI sẽ tạo ra các bài tập luyện tập chuyên sâu dạng nhỏ cho từng dạng bài có trong đề gốc.</p>
                                             
                                            <div className="mb-4 bg-white/60 p-3 rounded-xl border border-amber-200/50 flex items-center justify-between">
                                                <label htmlFor="num-exercises" className="block text-xs font-bold text-amber-800">Số lượng bài:</label>
                                                <div className="flex items-center space-x-2">
                                                    <input
                                                        id="num-exercises"
                                                        type="number"
                                                        min="1" max="10"
                                                        value={numSimilarExercises}
                                                        onChange={(e) => setNumSimilarExercises(Math.max(1, Math.min(10, parseInt(e.target.value) || 1)))}
                                                        className="w-16 px-2 py-1.5 rounded-md border border-amber-300 text-center text-sm font-bold focus:ring-2 focus:ring-amber-500/50"
                                                    />
                                                </div>
                                            </div>
                                            
                                            <button 
                                                onClick={handleGenerateSimilarExercises}
                                                disabled={loading}
                                                className="mt-auto w-full flex items-center justify-center py-2.5 px-4 rounded-xl text-sm font-bold text-white transition-all bg-amber-600 hover:bg-amber-700 shadow-sm hover:shadow-md hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                                            >
                                                {loading ? <Loader2 className="animate-spin mr-2 w-4 h-4"/> : <Files className="mr-2 w-4 h-4"/>}
                                                Tạo Bài tập
                                            </button>
                                        </div>

                                        {/* Option 3: Generate Matrix */}
                                        <div className="bg-gradient-to-br from-purple-50 to-purple-100/50 p-5 rounded-2xl border border-purple-200 flex flex-col shadow-sm hover:shadow-md transition-shadow">
                                            <div className="flex items-center mb-2">
                                                <div className="p-2 bg-purple-100 rounded-lg mr-3">
                                                    <Table className="w-5 h-5 text-purple-600" />
                                                </div>
                                                <h3 className="font-bold text-slate-800 text-base">Lập Bảng Ma trận</h3>
                                            </div>
                                            <p className="text-xs text-slate-600 mb-4 flex-grow leading-relaxed">AI sẽ phân loại từng câu hỏi trong đề gốc để xây dựng bảng Ma trận & Đặc tả theo chuẩn.</p>
                                            
                                            <button 
                                                onClick={handleGenerateMatrixForExam}
                                                disabled={loading}
                                                className="mt-auto w-full flex items-center justify-center py-2.5 px-4 rounded-xl text-sm font-bold text-white transition-all bg-purple-600 hover:bg-purple-700 shadow-sm hover:shadow-md hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                                            >
                                                {loading ? <Loader2 className="animate-spin mr-2 w-4 h-4"/> : <Table className="mr-2 w-4 h-4"/>}
                                                Lập Ma trận
                                            </button>
                                        </div>

                                        {/* Option 5: Generate Outline */}
                                        <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 p-5 rounded-2xl border border-emerald-200 flex flex-col shadow-sm hover:shadow-md transition-shadow">
                                            <div className="flex items-center mb-2">
                                                <div className="p-2 bg-emerald-100 rounded-lg mr-3">
                                                    <BookOpen className="w-5 h-5 text-emerald-600" />
                                                </div>
                                                <h3 className="font-bold text-slate-800 text-base">Tạo Đề Cương Ôn Tập</h3>
                                            </div>
                                            <p className="text-xs text-slate-600 mb-4 flex-grow leading-relaxed">AI sẽ phân tích đề gốc và tạo ra bộ đề cương ôn luyện gồm tóm tắt lý thuyết và 3 bài tập tương tự cho mỗi câu hỏi.</p>
                                            
                                            <button 
                                                onClick={handleGenerateOutline}
                                                disabled={loading}
                                                className="mt-auto w-full flex items-center justify-center py-2.5 px-4 rounded-xl text-sm font-bold text-white transition-all bg-emerald-600 hover:bg-emerald-700 shadow-sm hover:shadow-md hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                                            >
                                                {loading ? <Loader2 className="animate-spin mr-2 w-4 h-4"/> : <BookOpen className="mr-2 w-4 h-4"/>}
                                                Tạo Đề Cương
                                            </button>
                                        </div>

                                        {/* Option 4: Shuffle Only (Only for Word) */}
                                        {docxText && (
                                            <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 p-5 rounded-2xl border border-blue-200 flex flex-col shadow-sm hover:shadow-md transition-shadow">
                                                <div className="flex items-center mb-2">
                                                    <div className="p-2 bg-blue-100 rounded-lg mr-3">
                                                        <RefreshCw className="w-5 h-5 text-blue-600" />
                                                    </div>
                                                    <h3 className="font-bold text-slate-800 text-base">Đảo Mã Đề (Nhanh)</h3>
                                                </div>
                                                <p className="text-xs text-slate-600 mb-4 flex-grow leading-relaxed">Siêu tốc độ: Trộn và đảo ngẫu nhiên danh sách câu hỏi và đáp án trắc nghiệm trong vài giây.</p>
                                                
                                                <button 
                                                    onClick={handleShuffleDocx}
                                                    disabled={loading}
                                                    className="mt-auto w-full flex items-center justify-center py-2.5 px-4 rounded-xl text-sm font-bold text-white transition-all bg-blue-600 hover:bg-blue-700 shadow-sm hover:shadow-md hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                                                >
                                                    {loading ? <Loader2 className="animate-spin mr-2 w-4 h-4"/> : <RefreshCw className="mr-2 w-4 h-4"/>}
                                                    Đảo đề
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* PDF CONVERTER FORM (Full width) */}
                {activeTab === 'converter' && (
                     <div className="bg-white shadow-xl shadow-slate-200/50 rounded-2xl border border-slate-100 overflow-hidden flex flex-col h-full">
                        <div className="bg-gradient-to-r from-teal-600 to-cyan-600 px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                            <h2 className="text-lg font-bold text-white flex items-center">
                                <FileCog className="w-5 h-5 mr-2 opacity-90" />
                                Số hóa Đề thi từ PDF / Ảnh
                            </h2>
                            {pdfProcessed && (
                                <button onClick={resetPdfState} className="flex items-center text-xs text-white/80 hover:text-white font-semibold bg-white/15 hover:bg-white/25 px-3 py-1.5 rounded-lg transition-colors">
                                    <RefreshCw className="w-3.5 h-3.5 mr-1.5"/> Đổi file
                                </button>
                            )}
                        </div>
                        <div className="p-5 space-y-5 flex-grow overflow-auto">
                            {!pdfProcessed ? (
                                <div className="flex flex-col items-center justify-center h-full py-6 space-y-5">
                                    {/* Step indicator */}
                                    <div className="flex items-center space-x-3 mb-2">
                                        <div className="flex items-center space-x-2">
                                            <div className="w-7 h-7 rounded-full bg-teal-600 text-white flex items-center justify-center text-xs font-bold">1</div>
                                            <span className="text-sm font-semibold text-teal-700">Chọn trang</span>
                                        </div>
                                        <div className="w-8 h-px bg-slate-300"></div>
                                        <div className="flex items-center space-x-2">
                                            <div className="w-7 h-7 rounded-full bg-slate-300 text-slate-500 flex items-center justify-center text-xs font-bold">2</div>
                                            <span className="text-sm font-medium text-slate-400">Tải file</span>
                                        </div>
                                        <div className="w-8 h-px bg-slate-300"></div>
                                        <div className="flex items-center space-x-2">
                                            <div className="w-7 h-7 rounded-full bg-slate-300 text-slate-500 flex items-center justify-center text-xs font-bold">3</div>
                                            <span className="text-sm font-medium text-slate-400">Soạn lại</span>
                                        </div>
                                    </div>

                                    {/* Page range input FIRST */}
                                    <div className="w-full max-w-lg">
                                        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-4">
                                            <label className="block text-sm font-bold text-amber-800 mb-2 flex items-center">
                                                <Calculator className="w-4 h-4 mr-2 text-amber-600" />
                                                Bước 1: Chọn trang PDF cần đọc
                                            </label>
                                            <input
                                                type="text"
                                                value={pdfPageRange}
                                                onChange={(e) => setPdfPageRange(e.target.value)}
                                                placeholder="VD: 1-3, 5, 8  •  Để trống = đọc toàn bộ"
                                                className="w-full p-3 rounded-lg border-2 border-amber-200 focus:ring-4 focus:ring-amber-500/20 focus:border-amber-500 bg-white shadow-sm transition-all text-sm font-medium placeholder-amber-300"
                                                disabled={loading}
                                            />
                                            <p className="text-xs text-amber-600 mt-2 flex items-center">
                                                <HelpCircle className="w-3 h-3 mr-1 flex-shrink-0" />
                                                Nhập số trang trước, sau đó tải file ở bước 2. PDF lớn nên chọn trang cụ thể.
                                            </p>
                                        </div>
                                    </div>

                                    {/* Upload zone */}
                                    <label className="w-full max-w-lg cursor-pointer group">
                                        <div className="relative border-2 border-dashed border-teal-300 hover:border-teal-500 rounded-2xl p-8 transition-all duration-300 bg-gradient-to-br from-teal-50/50 to-cyan-50/50 hover:from-teal-50 hover:to-cyan-50 hover:shadow-lg group-hover:scale-[1.01]">
                                            {loading ? (
                                                <div className="flex flex-col items-center">
                                                    <Loader2 className="w-10 h-10 text-teal-600 animate-spin mb-3" />
                                                    <p className="text-sm font-semibold text-teal-700">{loadingText}</p>
                                                    <div className="w-full max-w-xs mt-3 loading-progress"></div>
                                                </div>
                                            ) : (
                                                <div className="flex flex-col items-center">
                                                    <div className="p-4 bg-white rounded-2xl shadow-sm mb-4 group-hover:shadow-md group-hover:scale-110 transition-all duration-300">
                                                        <Upload className="w-8 h-8 text-teal-600" />
                                                    </div>
                                                    <p className="text-base font-bold text-slate-700 mb-1">Bước 2: Kéo thả hoặc click để tải file</p>
                                                    <p className="text-xs text-slate-500 mb-3">Hỗ trợ: PDF, PNG, JPG, DOCX  •  Hoặc dán (Ctrl+V) file vào đây</p>
                                                    <div className="flex items-center space-x-2">
                                                        <span className="px-2.5 py-1 bg-red-50 text-red-600 text-xs font-bold rounded-md border border-red-200">PDF</span>
                                                        <span className="px-2.5 py-1 bg-blue-50 text-blue-600 text-xs font-bold rounded-md border border-blue-200">PNG</span>
                                                        <span className="px-2.5 py-1 bg-green-50 text-green-600 text-xs font-bold rounded-md border border-green-200">JPG</span>
                                                        <span className="px-2.5 py-1 bg-indigo-50 text-indigo-600 text-xs font-bold rounded-md border border-indigo-200">DOCX</span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                        <input type="file" className="hidden" accept=".pdf,.png,.jpg,.jpeg,.docx" onChange={handlePdfFileChange} disabled={loading} multiple />
                                    </label>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {/* File info status bar */}
                                    <div className="flex items-center justify-between bg-gradient-to-r from-teal-50 to-emerald-50 p-3 rounded-xl border border-teal-200">
                                        <div className="flex items-center space-x-3 overflow-hidden">
                                            <div className="p-1.5 bg-teal-100 rounded-lg flex-shrink-0">
                                                <CheckCircle2 className="w-5 h-5 text-teal-600" />
                                            </div>
                                            <div className="overflow-hidden">
                                                <p className="text-sm font-bold text-teal-800 truncate">{pdfFiles.length === 1 ? pdfFiles[0].name : `${pdfFiles.length} tệp đã chọn`}</p>
                                                <p className="text-xs text-teal-600">{pageImagesForPdf.length} trang  •  {extractedImages.length} hình ảnh trích xuất</p>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {/* Two-panel preview */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {/* Page thumbnails */}
                                        <div className="bg-slate-50 rounded-xl border border-slate-200 overflow-hidden">
                                            <div className="flex justify-between items-center px-3 py-2 bg-slate-100 border-b border-slate-200">
                                                <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center">
                                                    <FileText className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
                                                    Trang đã tải ({pageImagesForPdf.length})
                                                </h3>
                                                <button onClick={() => setIsPreviewModalOpen(true)} className="flex items-center text-xs text-indigo-600 hover:text-indigo-800 font-semibold hover:bg-indigo-50 px-2 py-1 rounded-md transition-colors" title="Xem toàn bộ">
                                                    <Maximize2 className="w-3 h-3 mr-1"/> Phóng to
                                                </button>
                                            </div>
                                            <div className="flex space-x-3 overflow-x-auto p-3 custom-scrollbar" style={{minHeight: '160px'}}>
                                                {pageImagesForPdf.map((imgSrc, index) => (
                                                    <div key={index} className="relative flex-shrink-0 group/thumb">
                                                        <img
                                                            src={`data:image/png;base64,${imgSrc}`}
                                                            alt={`Trang ${index + 1}`}
                                                            className="h-36 rounded-lg border-2 border-white shadow-md object-contain bg-white cursor-pointer hover:border-teal-400 transition-colors"
                                                            onClick={() => setIsPreviewModalOpen(true)}
                                                        />
                                                        <span className="absolute bottom-1 left-1/2 -translate-x-1/2 bg-black/60 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md">
                                                            {index + 1}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Extracted images gallery */}
                                        <div className="bg-slate-50 rounded-xl border border-slate-200 overflow-hidden">
                                            <div className="px-3 py-2 bg-slate-100 border-b border-slate-200">
                                                <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center">
                                                    <ImageIcon className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
                                                    Hình vẽ trích xuất ({extractedImages.length})
                                                </h3>
                                            </div>
                                            <div className="flex space-x-3 overflow-x-auto p-3 custom-scrollbar" style={{minHeight: '160px'}}>
                                                {extractedImages.length > 0 ? extractedImages.map((img, index) => (
                                                    <div key={index} className="relative flex-shrink-0">
                                                        <img
                                                            src={`data:${img.mimeType};base64,${img.base64}`}
                                                            alt={`Hình ${index + 1}`}
                                                            className="h-36 rounded-lg border-2 border-white shadow-md object-contain bg-white"
                                                        />
                                                        <span className="absolute top-1 right-1 bg-teal-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md">
                                                            HÌNH_{index + 1}
                                                        </span>
                                                    </div>
                                                )) : (
                                                    <div className="flex flex-col items-center justify-center w-full text-center py-6">
                                                        <ImageIcon className="w-8 h-8 text-slate-300 mb-2" />
                                                        <p className="text-xs text-slate-400 font-medium">Không tìm thấy hình vẽ<br/>trong file đã tải lên</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {/* Settings row */}
                                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                                        {/* Image toggle - prominent */}
                                        <div className={`flex items-center flex-1 p-3 rounded-xl border-2 cursor-pointer transition-all ${includeImagesInWord ? 'bg-teal-50 border-teal-300 shadow-sm' : 'bg-slate-50 border-slate-200'}`}
                                            onClick={() => setIncludeImagesInWord(!includeImagesInWord)}
                                        >
                                            <input 
                                                type="checkbox" 
                                                id="include-images-checkbox"
                                                checked={includeImagesInWord}
                                                onChange={(e) => setIncludeImagesInWord(e.target.checked)}
                                                className="w-5 h-5 text-teal-600 rounded focus:ring-teal-500 border-gray-300 mr-3 cursor-pointer"
                                            />
                                            <div>
                                                <label htmlFor="include-images-checkbox" className="text-sm font-bold text-slate-700 cursor-pointer block">
                                                    {includeImagesInWord ? '✅ Giữ hình ảnh gốc' : '❌ Bỏ qua hình ảnh'}
                                                </label>
                                                <p className="text-xs text-slate-500 mt-0.5">
                                                    {includeImagesInWord 
                                                        ? `${extractedImages.length} hình sẽ được chèn vào Word tại vị trí [HÌNH_X]` 
                                                        : 'Word chỉ chứa văn bản, không có hình'}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Page range compact */}
                                        <div className="flex items-center space-x-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                                            <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">Trang:</span>
                                            <input
                                                type="text"
                                                value={pdfPageRange}
                                                onChange={(e) => setPdfPageRange(e.target.value)}
                                                placeholder="Tất cả"
                                                className="w-28 p-1.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 bg-white text-sm text-center font-medium"
                                                disabled={loading}
                                            />
                                        </div>
                                    </div>

                                    {/* Action button */}
                                    <button
                                        onClick={handleRegenerateExamAndDownload}
                                        disabled={loading}
                                        className="w-full flex items-center justify-center py-4 px-6 rounded-xl text-sm font-bold text-white transition-all duration-300 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.99]"
                                    >
                                        {loading ? <><Loader2 className="animate-spin mr-2 w-5 h-5"/> {loadingText}</> : <><Sparkles className="mr-2 w-5 h-5"/> 🚀 BẮT ĐẦU SOẠN LẠI ĐỀ THI</>}
                                    </button>
                                    <p className="text-xs text-slate-400 text-center">
                                      AI sẽ đọc nội dung đề thi và <strong className="font-semibold text-teal-600">{includeImagesInWord ? "giữ lại hình ảnh gốc" : "chỉ lấy văn bản"}</strong> • Kết quả hiển thị phía bên dưới
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Right Column: Preview */}
            <div className="lg:col-span-8 space-y-6">
                 {activeTab === 'lesson' ? (
                     lessonResult ? (
                        <div className="space-y-6">
                            <div className="bg-white shadow-xl shadow-slate-200/60 rounded-xl border border-slate-200 overflow-hidden h-full flex flex-col">
                                <div className="bg-slate-50 px-6 py-3 border-b border-slate-200 flex justify-between items-center flex-shrink-0">
                                    <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide">Xem trước Giáo án</h3>
                                    <div className="flex items-center gap-2">
                                        {aiSource === '9router' && (
                                            <span className="text-xs text-green-700 bg-green-50 px-2 py-1 rounded border border-green-200 flex items-center gap-1">
                                                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                                                9Router{aiModelUsed ? ` · ${aiModelUsed}` : ''}
                                            </span>
                                        )}
                                        {aiSource === 'gemini' && aiSourceError && (
                                            <span className="text-xs text-amber-700 bg-amber-50 px-2 py-1 rounded border border-amber-200 flex items-center gap-1" title={aiSourceError}>
                                                <span className="w-1.5 h-1.5 bg-amber-500 rounded-full"></span>
                                                Gemini (dự phòng)
                                            </span>
                                        )}
                                        {aiSource === 'gemini' && !aiSourceError && (
                                            <span className="text-xs text-blue-700 bg-blue-50 px-2 py-1 rounded border border-blue-200 flex items-center gap-1">
                                                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                                                Gemini AI
                                            </span>
                                        )}
                                        {/* Model selector dropdown */}
                                        {get9RouterModels().length > 1 && (
                                            <select 
                                                className="text-xs text-slate-600 bg-white border border-slate-200 rounded px-1.5 py-1 cursor-pointer hover:border-blue-300 focus:outline-none focus:border-blue-400"
                                                value={selectedModel}
                                                onChange={(e) => {
                                                    const m = e.target.value;
                                                    setSelectedModel(m);
                                                    setSelected9RouterModel(m);
                                                }}
                                                title="Chọn model AI"
                                            >
                                                {get9RouterModels().map(m => (
                                                    <option key={m} value={m}>{m}</option>
                                                ))}
                                            </select>
                                        )}
                                        <button
                                            onClick={() => {
                                                if (isEditingLesson) {
                                                    // Save edits
                                                    setLessonResult({...lessonResult!, fullMarkdown: editedLessonMarkdown});
                                                    setIsEditingLesson(false);
                                                } else {
                                                    setEditedLessonMarkdown(lessonResult!.fullMarkdown);
                                                    setIsEditingLesson(true);
                                                }
                                            }}
                                            className={`text-xs px-2 py-1 rounded border transition-colors flex items-center gap-1 ${isEditingLesson ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}
                                        >
                                            <Edit3 className="w-3 h-3" /> {isEditingLesson ? 'Lưu' : 'Sửa'}
                                        </button>
                                        <button
                                            onClick={() => {
                                                try {
                                                    const data = { type: 'lesson', result: lessonResult, teacher: teacherProfile };
                                                    const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(data))));
                                                    const url = `${window.location.origin}${window.location.pathname}?share=${encoded.substring(0, 2000)}`;
                                                    navigator.clipboard.writeText(url);
                                                    setShareUrl(url);
                                                    alert('Đã sao chép link chia sẻ!');
                                                } catch { alert('Dữ liệu quá lớn để chia sẻ qua link. Hãy tải Word và gửi file.'); }
                                            }}
                                            className="text-xs px-2 py-1 rounded border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 flex items-center gap-1"
                                        >
                                            <Share2 className="w-3 h-3" /> Chia sẻ
                                        </button>
                                        <span className="text-xs text-slate-400 bg-white px-2 py-1 rounded border border-slate-200">v1.0</span>
                                    </div>
                                </div>
                                <div className="p-10 bg-white min-h-[600px] overflow-auto flex-grow">
                                    {isEditingLesson ? (
                                        <div className="max-w-[21cm] mx-auto">
                                            <div className="mb-3 flex items-center justify-between">
                                                <p className="text-sm text-amber-600 font-medium">✏️ Chế độ chỉnh sửa — sửa Markdown trực tiếp</p>
                                                <button onClick={() => { setLessonResult({...lessonResult!, fullMarkdown: editedLessonMarkdown}); setIsEditingLesson(false); }}
                                                    className="text-xs bg-green-600 text-white px-3 py-1.5 rounded-lg font-bold hover:bg-green-700">
                                                    ✓ Lưu & Xem trước
                                                </button>
                                            </div>
                                            <textarea
                                                value={editedLessonMarkdown}
                                                onChange={e => setEditedLessonMarkdown(e.target.value)}
                                                className="w-full min-h-[600px] border border-slate-300 rounded-lg p-4 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
                                                spellCheck={false}
                                            />
                                        </div>
                                    ) : (
                                    <div className="max-w-[21cm] mx-auto bg-white markdown-content">
                                        <div className="text-center mb-8">
                                            <p className="font-bold text-sm text-slate-800">{teacherProfile.schoolName ? teacherProfile.schoolName.toUpperCase() : "TRƯỜNG THCS ........................"}</p>
                                            <p className="font-bold text-sm text-slate-800">{getLessonPlanOrgName()}</p>
                                        </div>
                                        <h1 className="text-center font-bold text-2xl mb-4 uppercase text-blue-900 border-none">
                                            {lessonResult.weekName || lessonResult.topic}
                                        </h1>
                                        {/* Show list of topics for weekly plan */}
                                        {lessonResult.lessonItems && lessonResult.lessonItems.length > 0 && (
                                            <div className="mb-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
                                                <p className="font-bold text-slate-700 mb-2">Nội dung tuần này:</p>
                                                <ul className="list-disc pl-5 space-y-1">
                                                    {lessonResult.lessonItems.map((item, idx) => (
                                                        <li key={idx} className="text-sm text-slate-800">
                                                            <strong>{item.topic}</strong> <span className="text-slate-500 italic">({item.duration})</span>
                                                            {item.specificPeriod && <span className="ml-2 font-semibold text-blue-600">- Dạy: {item.specificPeriod}</span>}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                        {renderMarkdown(lessonResult.fullMarkdown)}
                                    </div>
                                    )}
                                </div>
                            </div>
                            {lessonResult.generatedImages && lessonResult.generatedImages.length > 0 && (
                                <div className="bg-white shadow-xl shadow-slate-200/60 rounded-xl border border-slate-200 overflow-hidden">
                                     <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center space-x-3">
                                        <ImageIcon className="w-5 h-5 text-blue-600"/>
                                        <h3 className="text-base font-bold text-slate-800">Hình ảnh gợi ý do AI tạo</h3>
                                    </div>
                                    <div className="p-6">
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                            {lessonResult.generatedImages.map((image, index) => (
                                                <div key={index} className="border border-slate-200 rounded-lg overflow-hidden bg-white shadow-sm flex flex-col">
                                                    <div className="bg-slate-100 p-4 flex-grow flex items-center justify-center relative">
                                                        {regeneratingImageIndex === index && (
                                                            <div className="absolute inset-0 bg-white/70 flex items-center justify-center z-10">
                                                                <Loader2 className="w-8 h-8 text-blue-600 animate-spin"/>
                                                            </div>
                                                        )}
                                                        <img src={`data:image/png;base64,${image.base64}`} alt={image.description} className="max-h-40 object-contain"/>
                                                    </div>
                                                    <div className="p-3 bg-white space-y-2">
                                                        <p className="text-xs text-slate-600 italic leading-relaxed text-center h-10 overflow-auto custom-scrollbar">"{image.description.replace('[HÌNH ẢNH: ', '').replace(']', '')}"</p>
                                                        <div className="flex space-x-2">
                                                            <button 
                                                                onClick={() => handleRegenerateAiImage(index, image.description)}
                                                                disabled={regeneratingImageIndex !== null}
                                                                className="w-1/2 flex items-center justify-center px-3 py-2 bg-slate-100 text-slate-700 rounded-md text-xs font-bold hover:bg-slate-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                            >
                                                                <RefreshCw className="w-3.5 h-3.5 mr-2"/>
                                                                Tạo lại
                                                            </button>
                                                            <button 
                                                                onClick={() => downloadAiImage(image.base64, index)}
                                                                disabled={regeneratingImageIndex === index}
                                                                className="w-1/2 flex items-center justify-center px-3 py-2 bg-blue-100 text-blue-800 rounded-md text-xs font-bold hover:bg-blue-200 transition-colors disabled:opacity-50"
                                                            >
                                                                <DownloadCloud className="w-3.5 h-3.5 mr-2" />
                                                                Tải về
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                     ) : (
                        <EmptyState 
                            title={`Sẵn sàng soạn giáo án ${subject}`}
                            message="Nhập thông tin bài dạy hoặc xây dựng thời khóa biểu tuần ở cột bên trái để AI bắt đầu thiết kế."
                            icon={<BookOpen className="h-16 w-16 text-slate-200" />}
                        />
                     )
                 ) : null}

                 {(activeTab === 'exam' || activeTab === 'similar-exam' || activeTab === 'converter' || activeTab === 'worksheet') ? (
                     (activeTab === 'worksheet' ? worksheetResult : examResult) ? (
                        <ExamPreview 
                            examResult={activeTab === 'worksheet' ? worksheetResult : examResult} 
                            setExamResult={activeTab === 'worksheet' ? setWorksheetResult : setExamResult}
                            renderMarkdown={renderMarkdown} 
                        />
                     ) : (
                        <EmptyState 
                            title={activeTab === 'worksheet' ? `Tạo phiếu bài tập ${subject}` : (activeTab === 'exam' ? `Tạo đề thi ${subject} tự động` : (activeTab === 'converter' ? `Phân tích đề thi ${subject}` : `Tạo đề/bài tập ${subject} tương tự`))}
                            message={activeTab === 'worksheet' 
                                ? "Nhập chủ đề và các thông số để AI sinh ra phiếu bài tập với đầy đủ ma trận và đáp án."
                                : (activeTab === 'exam' 
                                    ? "Thiết lập cấu trúc đề, ma trận và nội dung kiểm tra ở cột bên trái để AI tạo ra bộ đề thi hoàn chỉnh."
                                    : (activeTab === 'converter' ? "Tải lên file PDF/ảnh ở cột bên trái để AI soạn lại thành văn bản Markdown." : "Tải lên hoặc dán file PDF/ảnh ở cột bên trái để AI phân tích và tạo một bộ bài tập mới có cấu trúc tương tự.")
                                )
                            }
                            icon={<Layout className="h-16 w-16 text-slate-200" />}
                        />
                     )
                 ) : null}
            </div>
        </div>
        )}
        </>
        )}
      </main>
      
      {/* File Preview Modal */}
      {isPreviewModalOpen && (
          <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-8">
              <div className="bg-white w-full max-w-6xl h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden relative animate-in fade-in zoom-in-95 duration-200">
                  <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
                      <h3 className="text-lg font-bold text-slate-800 flex items-center">
                          <Maximize2 className="w-5 h-5 mr-2 text-indigo-600" />
                          Xem chi tiết toàn bộ File
                      </h3>
                      <button onClick={() => setIsPreviewModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500">
                          <X className="w-6 h-6" />
                      </button>
                  </div>
                  <div className="flex-1 overflow-auto p-6 bg-slate-100 min-h-0">
                      <div className="bg-white mx-auto shadow-sm rounded-xl p-8 min-h-full">
                          {docxText ? (
                              <div className="prose prose-slate max-w-none prose-sm lg:prose-base" dangerouslySetInnerHTML={{ __html: docxText }} />
                          ) : (
                              <div className="space-y-6 flex flex-col items-center">
                                  {pageImagesForPdf.map((imgSrc, index) => (
                                      <img
                                          key={index}
                                          src={`data:image/png;base64,${imgSrc}`}
                                          alt={`Trang ${index + 1}`}
                                          className="w-full max-w-4xl border border-slate-300 shadow-md rounded-md"
                                      />
                                  ))}
                                  {pageImagesForPdf.length === 0 && !docxText && (
                                     <div className="text-slate-500 text-center">Không có nội dung để xem trước.</div>
                                  )}
                              </div>
                          )}
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
          <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-8">
              <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl flex flex-col overflow-hidden relative animate-in fade-in zoom-in-95 duration-200">
                  <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
                      <h3 className="text-lg font-bold text-slate-800 flex items-center">
                          <Settings className="w-5 h-5 mr-2 text-indigo-600" />
                          Cài đặt hệ thống & Cá nhân
                      </h3>
                      {hasCompletedSetup && (
                      <button onClick={() => setShowSettings(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500">
                          <X className="w-6 h-6" />
                      </button>
                      )}
                  </div>
                  <div className="p-6 space-y-5 overflow-y-auto max-h-[60vh]">
                      <div className="space-y-4">
                           <h4 className="font-bold text-sm text-slate-700 uppercase tracking-wider border-b border-slate-100 pb-2">Thông tin cá nhân</h4>
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="label-text">Tên Trường</label>
                                    <input 
                                        type="text" 
                                        className="input-field w-full text-sm" 
                                        value={teacherProfile.schoolName} 
                                        onChange={(e) => setTeacherProfile({...teacherProfile, schoolName: e.target.value})} 
                                        placeholder="VD: THCS Liên Châu" 
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="label-text">Họ và tên GV</label>
                                    <input 
                                        type="text" 
                                        className="input-field w-full text-sm" 
                                        value={teacherProfile.teacherName} 
                                        onChange={(e) => setTeacherProfile({...teacherProfile, teacherName: e.target.value})} 
                                        placeholder="VD: Nguyễn Văn A" 
                                    />
                                </div>
                                <div className="space-y-2 md:col-span-2">
                                    <label className="label-text">Tổ chuyên môn</label>
                                    <input 
                                        type="text" 
                                        className="input-field w-full text-sm" 
                                        value={teacherProfile.groupName} 
                                        onChange={(e) => setTeacherProfile({...teacherProfile, groupName: e.target.value})} 
                                        placeholder="VD: Tổ Khoa học Tự nhiên" 
                                    />
                                </div>
                                <div className="col-span-full">
                                    <p className="text-xs text-slate-500">
                                        Thông tin này sẽ được lưu lại và tự động điền vào phần đầu của các Giáo án, Đề thi mà bạn tạo ra.
                                    </p>
                                </div>
                           </div>
                      </div>

                      {/* AI Connection Status */}
                      <div className="space-y-3 pt-3 border-t border-slate-100">
                          <h4 className="font-bold text-sm text-slate-700 uppercase tracking-wider border-b border-slate-100 pb-2 flex items-center space-x-2">
                              <Sparkles className="w-4 h-4 text-indigo-600" />
                              <span>Trạng thái kết nối AI</span>
                          </h4>
                          <div className={`ai-status-bar ${
                              aiSource === '9router' ? 'status-9router' : 
                              (aiSourceError ? 'status-fallback' : 'status-gemini')
                          }`}>
                              <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                                  aiSource === '9router' ? 'bg-emerald-500 animate-pulse' : 
                                  (aiSourceError ? 'bg-amber-500' : 'bg-blue-500 animate-pulse')
                              }`} />
                              {aiSource === '9router' ? (
                                  <span>Đang dùng: <strong>{getFriendlyModelName(aiModelUsed || selectedModel)}</strong></span>
                              ) : aiSource === 'gemini' && aiSourceError ? (
                                  <span>Đang dùng: <strong>💎 Gemini AI (dự phòng)</strong> — {aiSourceError}</span>
                              ) : aiSource === 'gemini' ? (
                                  <span>Đang dùng: <strong>💎 Gemini AI (Key cá nhân)</strong></span>
                              ) : (
                                  <span>⏳ Chưa có kết nối AI nào</span>
                              )}
                          </div>
                          {get9RouterModels().length > 1 && (
                              <div className="flex items-center gap-2 text-xs text-slate-600">
                                  <span className="font-medium">Chọn model:</span>
                                  <select 
                                      className="text-xs font-medium bg-white border border-slate-200 rounded-lg px-2 py-1 cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-300"
                                      value={selectedModel}
                                      title="Chọn AI Model — Thay đổi sẽ áp dụng cho lần tạo tiếp theo"
                                      onChange={(e) => {
                                          const m = e.target.value;
                                          setSelected9RouterModel(m);
                                          setSelectedModel(m);
                                      }}
                                  >
                                      {get9RouterModels().map(m => (
                                          <option key={m} value={m}>{getFriendlyModelName(m)}</option>
                                      ))}
                                  </select>
                              </div>
                          )}
                      </div>

                      <div className="space-y-3 pt-3 border-t border-slate-100">
                          <h4 className="font-bold text-sm text-slate-700 uppercase tracking-wider border-b border-slate-100 pb-2 flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <KeyRound className="w-4 h-4 text-emerald-600" />
                                <span>Gemini API Key cá nhân (Không bắt buộc)</span>
                              </div>
                              <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1 normal-case px-2 py-1 bg-blue-50 rounded-md"><span>Lấy Key miễn phí</span><ExternalLink className="w-3 h-3" /></a>
                          </h4>
                          {/* Status indicator */}
                          <div className={`flex items-center gap-2 text-xs font-medium px-3 py-2 rounded-lg ${
                              geminiApiKey 
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                                : 'bg-green-50 text-green-700 border border-green-200'
                          }`}>
                              <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                              {geminiApiKey 
                                ? '✅ Đã có Key dự phòng cá nhân + Nguồn AI chính của admin → Ổn định tối đa!' 
                                : '🟢 Hệ thống đã có nguồn AI chính do admin cung cấp. Bạn có thể bắt đầu soạn ngay!'}
                          </div>
                          <input 
                              type="password" 
                              className="input-field w-full text-sm font-mono" 
                              value={geminiApiKey} 
                              onChange={(e) => {
                                  const val = e.target.value.trim();
                                  setGeminiApiKey(val);
                                  localStorage.setItem('custom_gemini_api_key', val);
                              }}
                              placeholder="(Tùy chọn) Nhập API Key (AIzaSy...) để dự phòng khi nguồn chính bận..." 
                          />
                          <div className="text-xs text-slate-600 leading-relaxed bg-blue-50 p-2.5 rounded border border-blue-200 shadow-sm mt-2">
                               <p className="font-semibold text-blue-800 mb-1 flex items-center gap-1.5">
                                   <Lightbulb className="w-3.5 h-3.5" />
                                   Cách hoạt động:
                               </p>
                               <p>Hệ thống sẽ ưu tiên dùng <strong>nguồn AI chính</strong> do admin cung cấp (khoảng 100 lượt miễn phí/ngày). Nếu nguồn chính bận hoặc tắt, hệ thống tự động chuyển sang <strong>Gemini API Key cá nhân</strong> của bạn. Bạn có thể tạo key miễn phí từ Google bằng nút ở trên.</p>
                          </div>
                      </div>
                  </div>
                  <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-end">
                      <button onClick={handleSaveSettings} className="btn-primary flex items-center space-x-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow font-medium">
                          <Save className="w-4 h-4" />
                          <span>Lưu cấu hình</span>
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* CSS Utility for inputs */}
      <style>{`
        .input-field { @apply block w-full bg-white border border-slate-200 rounded-lg py-3 px-4 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm transition-shadow; }
        .label-text { @apply flex items-center text-xs font-bold text-slate-500 uppercase tracking-wide; }
        .upload-box { @apply flex flex-col items-center justify-center w-full border-2 border-dashed border-slate-300 rounded-xl cursor-pointer bg-slate-50; }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #e2e8f0; border-radius: 3px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #94a3b8; border-radius: 3px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #64748b; }
      `}</style>
    </div>
  );
};

const ExamPreview = ({ examResult, setExamResult, renderMarkdown }: { examResult: ExamResponse, setExamResult?: React.Dispatch<React.SetStateAction<ExamResponse | null>>, renderMarkdown: (md: string) => React.ReactElement }) => {
    const [isEditMode, setIsEditMode] = React.useState(false);
    const [isShuffling, setIsShuffling] = React.useState(false);
    const [loadingText, setLoadingText] = React.useState("Đang đảo đề...");
    const [editMarkdown, setEditMarkdown] = React.useState(examResult.examMarkdown);
    const [editAnswer, setEditAnswer] = React.useState(examResult.answerMarkdown);
    const [shuffleOptions, setShuffleOptions] = React.useState("");

    // Sync state when examResult changes from outside
    React.useEffect(() => {
        setEditMarkdown(examResult.examMarkdown);
        setEditAnswer(examResult.answerMarkdown || "");
    }, [examResult.examMarkdown, examResult.answerMarkdown]);

    const handleSaveEdit = () => {
        if (setExamResult) {
            setExamResult({ ...examResult, examMarkdown: editMarkdown, answerMarkdown: editAnswer });
        }
        setIsEditMode(false);
    };

    const handleShuffleSubmit = async () => {
        if (!setExamResult) return;
        setIsShuffling(true);
        try {
            const shuffled = await shuffleExam(examResult.examMarkdown, examResult.answerMarkdown || "", setLoadingText, shuffleOptions);
            if (shuffled) {
                setExamResult({
                    ...examResult,
                    examMarkdown: shuffled.examMarkdown,
                    answerMarkdown: shuffled.answerMarkdown
                });
            } else {
                alert("Không thể đảo đề lúc này. Vui lòng thử lại.");
            }
        } catch (error: any) {
            alert("Lỗi khi đảo đề: " + (error.message || "Unknown error"));
        } finally {
            setIsShuffling(false);
        }
    };

    return (
        <div className="bg-white shadow-xl shadow-slate-200/60 rounded-xl border border-slate-200 overflow-hidden h-full flex flex-col relative">
            {isShuffling && (
                <div className="absolute inset-0 bg-white/80 z-50 flex flex-col items-center justify-center backdrop-blur-sm">
                    <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mb-4" />
                    <p className="text-slate-800 font-bold">{loadingText}</p>
                </div>
            )}
            <div className="bg-slate-50 px-6 py-3 border-b border-slate-200 flex justify-between items-center flex-shrink-0">
                <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide">Xem trước {isEditMode && "- Chỉnh sửa"}</h3>
                <div className="flex items-center space-x-3">
                    {setExamResult && (
                        <>
                            <div className="flex items-center space-x-2">
                                <input 
                                    type="text" 
                                    placeholder="Yêu cầu: VD trắc nghiệm 1 dòng..."
                                    className="px-2 py-1 text-xs border border-slate-300 rounded focus:outline-none focus:border-indigo-500 w-48 transition-colors"
                                    value={shuffleOptions}
                                    onChange={(e) => setShuffleOptions(e.target.value)}
                                    disabled={isShuffling || isEditMode}
                                    title="Nhập yêu cầu phụ khi đảo đề (VD: Trình bày trắc nghiệm 1 dòng, để giấy trống cho học sinh làm...)"
                                />
                                <button 
                                    onClick={handleShuffleSubmit}
                                    disabled={isShuffling || isEditMode}
                                    className="px-3 py-1 bg-indigo-100 text-indigo-700 hover:bg-indigo-200 rounded text-xs font-bold transition-colors disabled:opacity-50 whitespace-nowrap"
                                >
                                    <RefreshCw className={`w-3.5 h-3.5 inline mr-1 ${isShuffling ? 'animate-spin' : ''}`}/> Đảo đề
                                </button>
                            </div>
                            <div className="w-px h-6 bg-slate-300 mx-1"></div>
                            <button 
                                onClick={() => isEditMode ? handleSaveEdit() : setIsEditMode(true)}
                                disabled={isShuffling}
                                className={`px-3 py-1 rounded text-xs font-bold transition-colors disabled:opacity-50 ${isEditMode ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-blue-100 text-blue-700 hover:bg-blue-200'} whitespace-nowrap`}
                            >
                                {isEditMode ? <><Save className="w-3.5 h-3.5 inline mr-1"/> Lưu</> : <><PenSquare className="w-3.5 h-3.5 inline mr-1"/> Chỉnh sửa Markdown</>}
                            </button>
                        </>
                    )}
                </div>
            </div>
            <div className="p-10 bg-white min-h-[600px] overflow-auto flex-grow">
                <div className="max-w-[21cm] mx-auto bg-white markdown-content">
                    
                    <div className="mb-8">
                        {isEditMode ? (
                            <textarea 
                                value={editMarkdown}
                                onChange={(e) => setEditMarkdown(e.target.value)}
                                className="w-full h-[600px] p-4 font-mono text-sm border-2 border-blue-200 rounded-lg focus:outline-none focus:border-blue-500 bg-slate-50"
                            />
                        ) : (
                            renderMarkdown(examResult.examMarkdown)
                        )}
                    </div>

                    {(examResult.answerMarkdown && examResult.answerMarkdown.trim() !== "") || isEditMode ? (
                         <div className="mb-8 p-6 bg-slate-50 rounded-lg border border-slate-100" style={{ pageBreakBefore: 'always' }}>
                            <h2 className="text-center font-bold">Đáp án & Hướng dẫn chấm</h2>
                            {isEditMode ? (
                                <textarea 
                                    value={editAnswer}
                                    onChange={(e) => setEditAnswer(e.target.value)}
                                    placeholder="Không có đáp án (để trống nếu không cần)"
                                    className="w-full h-[300px] p-4 mt-4 font-mono text-sm border-2 border-slate-200 rounded-lg focus:outline-none focus:border-slate-400 bg-white"
                                />
                            ) : (
                                renderMarkdown(examResult.answerMarkdown)
                            )}
                        </div>
                    ) : null}

                    {examResult.matrixMarkdown && examResult.matrixMarkdown.trim() && (
                        <div className="p-6 bg-blue-50 rounded-lg border border-blue-100" style={{ pageBreakBefore: 'always' }}>
                            <h2 className="text-center font-bold">Ma trận & Đặc tả</h2>
                            {renderMarkdown(examResult.matrixMarkdown)}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const EmptyState = ({title, message, icon}: {title: string, message: string, icon: React.ReactNode}) => (
    <div className="bg-white shadow-xl shadow-slate-200/60 rounded-2xl border border-slate-100 p-12 flex flex-col items-center justify-center text-center h-full min-h-[500px]">
        <div className="bg-slate-50 p-6 rounded-full mb-6 border border-slate-100">
            {icon}
        </div>
        <h3 className="text-xl font-bold text-slate-800 mb-2">{title}</h3>
        <p className="text-slate-500 max-w-md leading-relaxed">{message}</p>
    </div>
);

export default App;
