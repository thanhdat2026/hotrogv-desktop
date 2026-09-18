import { GoogleGenAI, Type } from "@google/genai";
import { UserInput, LessonPlanResponse, GradeLevel, ExamInput, ExamResponse, Subject, SimilarExercise, ImageLocation, ExamHeader, ReviewOutlineGroup } from "../types";
import { ExtractedImage } from "./pdfConverterService";

// --- CONSTANTS & HELPERS ---

// ==================== CẤU HÌNH NGUỒN AI ====================
// 9Router: Nguồn chính, chạy qua cloud proxy của admin
// Gemini: Nguồn dự phòng tự động khi 9Router lỗi/hết quota
//
// CƠ CHẾ ĐỒNG BỘ CHO TẤT CẢ GIÁO VIÊN:
// 1. Admin thay đổi env vars trên Vercel Dashboard
// 2. Khi GV mở web → app gọi /api/router-config → nhận config mới nhất
// 3. TẤT CẢ giáo viên đều nhận cùng config, không cần redeploy
//
// CƠ CHẾ TỰ ĐỘNG CHUYỂN MODEL:
// Khi model hiện tại hết quota (429) → tự động thử model tiếp theo
// =============================================================

// Cache config 9Router từ server (dùng chung cho tất cả lệnh gọi)
let _routerConfig: { 
    url: string; key: string; model: string; 
    models: string[]; available: boolean;
    _exhaustedModels: Set<string>; // Models đã hết quota trong session này
} = {
    url: (import.meta.env.VITE_9ROUTER_URL || '').trim(),
    key: (import.meta.env.VITE_9ROUTER_KEY || '').trim(),
    model: (import.meta.env.VITE_9ROUTER_MODEL || 'ag/gemini-3.8-flash-high').trim(),
    models: ['ag/gemini-3.8-flash-high'],
    available: false,
    _exhaustedModels: new Set(),
};
let _routerConfigFetched = false;

// Lấy config 9Router — Ưu tiên remote (dynamic), fallback build-time (static)
// Electron: gọi hotrogv.thaydat.edu.vn/api/router-config → sếp đổi config trên Vercel → tất cả máy tự cập nhật
// Web: gọi /api/router-config (same origin Vercel)
export const fetchRouterConfig = async (): Promise<void> => {
    const isElectron = !!(window as any).electronAPI;
    
    // Xác định URL config: Electron dùng absolute URL, Web dùng relative
    const configUrl = isElectron 
        ? 'https://hotrogv.thaydat.edu.vn/api/router-config'
        : '/api/router-config';

    try {
        const response = await fetch(configUrl, { 
            cache: 'no-store',
            signal: AbortSignal.timeout(5000)
        });
        if (response.ok) {
            const data = await response.json();
            if (data.url) _routerConfig.url = data.url;
            if (data.key) _routerConfig.key = data.key;
            if (data.model) _routerConfig.model = data.model;
            if (data.models && Array.isArray(data.models) && data.models.length > 0) {
                _routerConfig.models = data.models;
            }
            _routerConfig.available = !!(data.url && data.key);
            console.log(`[${isElectron ? 'Electron' : 'Web'}] 9Router config loaded from server | Models:`, _routerConfig.models.join(', '));
            restoreSelectedModel();
            if (_routerConfig.available) {
                _notifyAISource('9router', '', _routerConfig.model);
            }
            _routerConfigFetched = true;
            return; // Thành công → không cần fallback
        }
    } catch (e) {
        console.warn(`[${isElectron ? 'Electron' : 'Web'}] Remote config failed, using build-time fallback`);
    }

    // === FALLBACK: Dùng build-time env vars (khi offline hoặc Vercel down) ===
    if (isElectron) {
        const envModels = (import.meta.env.VITE_9ROUTER_MODELS || '').trim();
        if (envModels) {
            _routerConfig.models = envModels.split(',').map((m: string) => m.trim()).filter(Boolean);
        }
    }
    _routerConfig.available = !!(_routerConfig.url && _routerConfig.key);
    _routerConfigFetched = true;
    
    if (_routerConfig.available) {
        restoreSelectedModel();
        _notifyAISource('9router', '', _routerConfig.model);
    } else if (getGeminiApiKey()) {
        _notifyAISource('gemini', '', '');
    }
};

// Getter functions
const get9RouterUrl = (): string => _routerConfig.url;
const get9RouterKey = (): string => _routerConfig.key;
const get9RouterModel = (): string => _routerConfig.model;
const NINE_ROUTER_TIMEOUT = 120000;

// Lưu lại model user chọn vào localStorage
export const get9RouterModels = (): string[] => _routerConfig.models;
export const getSelected9RouterModel = (): string => {
    // Ưu tiên model GV đã chọn từ localStorage
    const saved = localStorage.getItem('selected_9router_model');
    if (saved && _routerConfig.models.includes(saved)) return saved;
    return _routerConfig.model;
};

// Khôi phục model đã chọn từ localStorage
export const setSelected9RouterModel = (model: string): void => {
    if (model && _routerConfig.models.includes(model)) {
        _routerConfig.model = model;
        localStorage.setItem('selected_9router_model', model);
        // Khi model đã chọn không có trong danh sách hiện tại → reset về mặc định
    }
};

// Timeout cho 9Router (giảm từ mặc định để không chờ quá lâu)
export const restoreSelectedModel = (): void => {
    const saved = localStorage.getItem('selected_9router_model');
    if (saved && _routerConfig.models.includes(saved)) {
        _routerConfig.model = saved;
    }
};

// === POOL-AWARE MODEL ROTATION ===
// Pool A: Claude/GPT (cùng hạn mức)
// Pool B: Gemini (cùng hạn mức)
const _exhaustedPools = new Set<string>();
const _getModelPool = (model: string): 'A' | 'B' => {
    const m = model.toLowerCase();
    if (m.includes('claude') || m.includes('gpt') || m.includes('o3') || m.includes('o4')) return 'A';
    return 'B'; // Gemini và các model khác
};

// Khi 1 model hết quota → đánh dấu cả pool → nhảy sang pool khác
const _getNextAvailableModel = (failedModel: string): string | null => {
    _routerConfig._exhaustedModels.add(failedModel);
    const failedPool = _getModelPool(failedModel);
    _exhaustedPools.add(failedPool);
    
    // Tìm model ở pool KHÁC trước
    const otherPoolModels = _routerConfig.models.filter(
        m => !_routerConfig._exhaustedModels.has(m) && _getModelPool(m) !== failedPool && !_exhaustedPools.has(_getModelPool(m))
    );
    if (otherPoolModels.length > 0) {
        // Ưu tiên gemini-3.8/3.7-flash-high
        const preferred = otherPoolModels.find(m => m.includes('3.8-flash-high')) || otherPoolModels.find(m => m.includes('3.7-flash-high'));
        const next = preferred || otherPoolModels[0];
        _routerConfig.model = next;
        return next;
    }
    
    // Không có pool khác → thử model bất kỳ chưa exhausted
    const anyAvailable = _routerConfig.models.filter(m => !_routerConfig._exhaustedModels.has(m));
    if (anyAvailable.length > 0) {
        const preferred = anyAvailable.find(m => m.includes('3.8-flash-high')) || anyAvailable.find(m => m.includes('3.7-flash-high'));
        const next = preferred || anyAvailable[0];
        _routerConfig.model = next;
        return next;
    }
    
    // Tất cả models đều hết quota
    return null;
};

export const resetExhaustedModels = (): void => {
    _routerConfig._exhaustedModels.clear();
    _exhaustedPools.clear();
};

// Trạng thái nguồn AI đang dùng (để hiển thị trên UI)
export type AISource = '9router' | 'gemini' | 'none';
let _lastAISource: AISource = 'none';
let _lastAIError: string = '';
let _lastModelUsed: string = '';
let _aiSourceListeners: Array<(source: AISource, error: string, model?: string) => void> = [];

export const getLastAISource = (): AISource => _lastAISource;
export const getLastAIError = (): string => _lastAIError;
export const getLastModelUsed = (): string => _lastModelUsed;
export const onAISourceChange = (listener: (source: AISource, error: string, model?: string) => void) => {
    _aiSourceListeners.push(listener);
    return () => { _aiSourceListeners = _aiSourceListeners.filter(l => l !== listener); };
};
const _notifyAISource = (source: AISource, error: string = '', model: string = '') => {
    _lastAISource = source;
    _lastAIError = error;
    _lastModelUsed = model || (source === '9router' ? get9RouterModel() : '');
    _aiSourceListeners.forEach(l => l(source, error, _lastModelUsed));
};

// Priority 2: Environment variable set via Vite (.env.local or Vercel env vars)
const is9RouterAvailable = (): boolean => {
    return _routerConfig.available;
};

export const getGeminiApiKey = (): string | null => {
    // Priority 1: User's personal API key (stored in localStorage from Settings UI)
    let customKey = localStorage.getItem("custom_gemini_api_key");
    if (customKey) {
        customKey = customKey.replace(/["']/g, '').trim();
        if (customKey !== '') return customKey;
    }
    
    // Priority 2: Environment variable set via Vite (.env.local or Vercel env vars)
    try {
        const envKey = import.meta.env.VITE_GEMINI_API_KEY;
        if (envKey && typeof envKey === 'string' && envKey.trim() !== '') {
            return envKey.trim();
        }
    } catch(e) {
        // ignore - may not be available in all environments
    }
    
    // No key found
    return null;
}

// ==================== GI 9ROUTER (OpenAI-compatible) ====================
// 9Router dng format OpenAI Chat Completions
// POST {NINE_ROUTER_URL}/v1/chat/completions
// Body: { model, messages: [{role: "user", content: "..."}], response_format: {type: "json_object"} }
// ==========================================================================

interface Call9RouterOptions {
    prompt: string;
    jsonMode?: boolean;  // Yêu cầu trả về JSON
    images?: Array<{ base64: string; mimeType: string }>; // Ảnh đính kèm (vision)
    _modelOverride?: string; // Dùng nội bộ khi tự động chuyển model
}

const call9Router = async (options: Call9RouterOptions): Promise<string | null> => {
    if (!is9RouterAvailable()) return null;
    
    const currentModel = options._modelOverride || get9RouterModel();
    const controller = new AbortController();
    const isClaude = currentModel.toLowerCase().includes('claude');
    const isThinkingModel = isClaude && currentModel.toLowerCase().includes('thinking');
    // Claude thinking models cần thêm thời gian (lên đến 3 phút cho bài toán phức tạp)
    const timeout = isClaude ? 180000 : NINE_ROUTER_TIMEOUT;
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    try {
        // Xy dng messages array
        const content: any[] = [{ type: "text", text: options.prompt }];
        
        // Thm nh nu c (cho vision)
        if (options.images && options.images.length > 0) {
            for (const img of options.images) {
                content.push({
                    type: "image_url",
                    image_url: { url: `data:${img.mimeType};base64,${img.base64}` }
                });
            }
        }
        
        const body: any = {
            model: currentModel,
            messages: [{ role: "user", content: content.length === 1 ? options.prompt : content }],
            // Thinking model: max_tokens phải > budget_tokens + output thực tế
            max_tokens: isThinkingModel ? 25000 : 16000,
            stream: false,
        };
        
        // Claude thinking models: giới hạn thinking budget để không nghĩ quá lâu
        if (isThinkingModel) {
            body.thinking = { type: "enabled", budget_tokens: 8000 };
        }
        
        if (options.jsonMode) {
            // Claude thinking models KHÔNG hỗ trợ response_format → chỉ dùng prompt instruction
            if (!isClaude) {
                body.response_format = { type: "json_object" };
            }
            // Claude: dùng prompt instruction thay vì response_format (tránh lỗi 400)
            if (isClaude) {
                const textPart = body.messages[0].content;
                const jsonInstruction = '\n\nIMPORTANT: You MUST respond with valid JSON only. No markdown code fences, no extra text. Start with { and end with }.';
                if (typeof textPart === 'string') {
                    body.messages[0].content = textPart + jsonInstruction;
                } else if (Array.isArray(textPart)) {
                    textPart[0].text = textPart[0].text + jsonInstruction;
                }
            }
        }
        
        const routerUrl = get9RouterUrl().replace(/\/$/, '');
        const response = await fetch(`${routerUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${get9RouterKey()}`,
            },
            body: JSON.stringify(body),
            signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            const errorText = await response.text().catch(() => '');
            console.warn(`9Router HTTP ${response.status} [${currentModel}]: ${errorText}`);
            
            // === TỰ ĐỘNG CHUYỂN MODEL KHI HẾT QUOTA ===
            if (response.status === 429) {
                const nextModel = _getNextAvailableModel(currentModel);
                if (nextModel) {
                    console.log(`⚠️ Model ${currentModel} hết quota (429) → Thử ${nextModel}...`);
                    return call9Router({ ...options, _modelOverride: nextModel });
                }
                throw new Error('9ROUTER_ALL_MODELS_EXHAUSTED');
            } else if (response.status === 404) {
                // Model không tồn tại trên 9Router → đánh dấu exhausted → thử model khác
                console.warn(`Model ${currentModel} không tồn tại (404) trên 9Router`);
                const nextModel = _getNextAvailableModel(currentModel);
                if (nextModel) {
                    console.log(`→ Tự động chuyển sang ${nextModel}...`);
                    return call9Router({ ...options, _modelOverride: nextModel });
                }
                throw new Error('9ROUTER_ALL_MODELS_EXHAUSTED');
            } else if (response.status >= 500) {
                // Server error → thử model khác trước khi throw
                const nextModel = _getNextAvailableModel(currentModel);
                if (nextModel) {
                    console.log('[9Router] Server error 5xx from ' + currentModel + ' -> try ' + nextModel);
                    return call9Router({ ...options, _modelOverride: nextModel });
                }
                throw new Error('9ROUTER_SERVER_ERROR');
            } else if (response.status === 400 && isClaude && options.jsonMode) {
                // Claude 400: có thể do thinking + response_format conflict → retry 1 lần duy nhất
                console.warn('[9Router] Claude 400 - retry without json constraints...');
                return call9Router({ ...options, jsonMode: false, _modelOverride: currentModel });
            } else if (response.status === 400 && isClaude && !options.jsonMode) {
                // Claude 400 lần 2 (đã bỏ jsonMode) → chuyển model khác
                console.warn('[9Router] Claude 400 persists without jsonMode → try another model');
                const nextModel = _getNextAvailableModel(currentModel);
                if (nextModel) {
                    return call9Router({ ...options, _modelOverride: nextModel });
                }
                throw new Error('9ROUTER_HTTP_400');
            } else {
                const nextModel = _getNextAvailableModel(currentModel);
                if (nextModel) {
                    console.log('[9Router] HTTP ' + response.status + ' from ' + currentModel + ' -> try ' + nextModel);
                    return call9Router({ ...options, _modelOverride: nextModel });
                }
                throw new Error(`9ROUTER_HTTP_${response.status}`);
            }
        }
        
        const data = await response.json();
        
        // Debug: minimal logging cho Claude models
        if (isClaude) {
            const rawContent = data?.choices?.[0]?.message?.content;
            const isArr = Array.isArray(rawContent);
            const contentLen = isArr ? rawContent.length + ' blocks' : (typeof rawContent === 'string' ? rawContent.length + ' chars' : 'null');
            console.log(`[9Router] Claude [${currentModel}] → content: ${contentLen}, finish: ${data?.choices?.[0]?.finish_reason || 'n/a'}`);
        }
        
        let text = data?.choices?.[0]?.message?.content;
        
        // Fallback cho Anthropic native format (không có choices wrapper)
        // Một số proxy trả: { content: [...], role: "assistant" } thay vì { choices: [{ message: { content: ... } }] }
        if (text === undefined && data?.content && !data?.choices) {
            console.log('[9Router] Detected Anthropic native format (no choices wrapper)');
            text = data.content;
        }
        
        // === CLAUDE THINKING MODEL: content có thể là array ===
        // Claude Opus trả: content: [{ type: "thinking", thinking: "..." }, { type: "text", text: "actual output" }]
        // Cần trích xuất phần text từ array
        if (Array.isArray(text)) {
            console.log('[9Router] Content is array (thinking model), extracting text blocks...');
            const textBlocks = text.filter((block: any) => block.type === 'text' && block.text);
            if (textBlocks.length > 0) {
                text = textBlocks.map((block: any) => block.text).join('\n');
                console.log('[9Router] Extracted text length:', text.length);
            } else {
                // Có thể content array chỉ chứa thinking → chưa xong hoặc lỗi
                const thinkingBlocks = text.filter((block: any) => block.type === 'thinking');
                if (thinkingBlocks.length > 0) {
                    console.warn('[9Router] Chỉ có thinking blocks, không có text output');
                }
                text = '';
            }
        }
        
        // Fallback: nếu content rỗng, thử lấy từ các trường khác (thinking models)
        if ((!text || (typeof text === 'string' && text.trim() === '')) && data?.choices?.[0]?.message) {
            const msg = data.choices[0].message;
            // Một số proxy trả content trong trường khác
            if (msg.text) text = msg.text;
            else if (msg.thinking) {
                console.warn('[9Router] Chỉ có thinking content, không có output content → model thinking chưa hoàn thành');
            }
        }
        
        if (!text || text.trim() === '') {
            console.error('[9Router] Empty response from', currentModel, '. Full data:', JSON.stringify(data).substring(0, 1000));
            // Thử model khác trên 9Router trước khi bail
            const nextModel = _getNextAvailableModel(currentModel);
            if (nextModel) {
                console.log(`→ Empty response từ ${currentModel}, thử ${nextModel}...`);
                return call9Router({ ...options, _modelOverride: nextModel });
            }
            throw new Error('9ROUTER_EMPTY_RESPONSE');
        }
        
        // Lưu lại model dùng thành công
        _notifyAISource('9router', '', currentModel);
        
        return text;
    } catch (error: any) {
        clearTimeout(timeoutId);
        
        if (error.name === 'AbortError') {
            // Claude timeout → thử model khác (ưu tiên Gemini nhanh hơn)
            if (isClaude) {
                console.warn('[9Router] Claude timeout after ' + (timeout/1000) + 's -> try another model...');
                const nextModel = _getNextAvailableModel(currentModel);
                if (nextModel) {
                    return call9Router({ ...options, _modelOverride: nextModel });
                }
            }
            console.warn('9Router timeout - máy chủ 9Router có thể chưa bật');
            throw new Error('9ROUTER_TIMEOUT');
        }
        
        // TypeError: Failed to fetch ? 9Router offline
        if (error instanceof TypeError && error.message.includes('fetch')) {
            console.warn('9Router unreachable - máy chủ 9Router có thể chưa bật');
            throw new Error('9ROUTER_OFFLINE');
        }
        
        throw error;
    }
};

// ==================== WRAPPER: THỬ 9ROUTER RỒI FALLBACK GEMINI ====================
// Hàm này thử gọi 9Router trước. Nếu lỗi tự động gọi Gemini native.
// ================================================================================

interface AICallOptions {
    prompt: string;
    jsonMode?: boolean;
    schema?: any;  // Gemini JSON schema (dùng cho Gemini native)
    model?: string; // Gemini model name (default: gemini-3-flash-preview)
    images?: Array<{ base64: string; mimeType: string }>;
    updateLoadingText?: (text: string) => void;
}

const callAIWithFallback = async (options: AICallOptions): Promise<string> => {
    const { prompt, jsonMode = true, schema, model = 'gemini-3-flash-preview', images, updateLoadingText } = options;
    
    // === BƯỚC 1: Thử 9Router trước (tự động rotate model khi 429) ===
    if (is9RouterAvailable()) {
        try {
            // Smart Vision Routing: Claude models không xử lý tốt vision/OCR qua proxy
            // → Tự động chuyển sang Gemini model cho tác vụ có ảnh
            let visionModelOverride: string | undefined;
            const currentModel = get9RouterModel();
            if (images && images.length > 0 && currentModel.toLowerCase().includes('claude')) {
                // Ưu tiên ag/gemini-3.8/3.7-flash-high, lọc bỏ models đã exhausted (404/429)
                const geminiModels = get9RouterModels().filter(m => 
                    m.toLowerCase().includes('gemini') && !_routerConfig._exhaustedModels.has(m)
                );
                // Ưu tiên 3.8-flash-high trước, fallback 3.7
                const preferred = geminiModels.find(m => m.includes('3.8-flash-high')) || geminiModels.find(m => m.includes('3.7-flash-high'));
                if (preferred) {
                    visionModelOverride = preferred;
                } else if (geminiModels.length > 0) {
                    visionModelOverride = geminiModels[0];
                }
                if (visionModelOverride) {
                    console.log(`[Smart Vision] Claude không hỗ trợ vision → tự động dùng ${visionModelOverride}`);
                }
            }
            
            if (updateLoadingText) {
                const displayModel = visionModelOverride || currentModel;
                const isClaudeThinking = displayModel.toLowerCase().includes('claude') && displayModel.toLowerCase().includes('thinking');
                updateLoadingText(isClaudeThinking 
                    ? `🧠 Đang suy luận sâu với Claude AI [${displayModel.split('/').pop()}]... (có thể mất 1-2 phút)`
                    : `⚡ Đang kết nối 9Router [${displayModel.split('/').pop()}]...`);
            }
            
            const result = await call9Router({ 
                prompt, 
                jsonMode, 
                images,
                _modelOverride: visionModelOverride,
            });
            if (result) {
                // _notifyAISource có gọi trong call9Router
                console.log('✓ 9Router thành công [' + getLastModelUsed() + ']');
                return result;
            }
        } catch (routerError: any) {
            const errorMsg = routerError?.message || String(routerError);
            console.warn('❌ 9Router lỗi, chuyển sang Gemini backup:', errorMsg);
            
            // Tạo thông báo chi tiết cho GV
            let userMsg = '';
            if (errorMsg.includes('TIMEOUT')) {
                userMsg = 'Máy chủ AI chính (9Router) phản hồi quá chậm';
            } else if (errorMsg.includes('OFFLINE') || errorMsg.includes('fetch')) {
                userMsg = 'Máy chủ AI chính (9Router) đang tắt (admin chưa bật máy)';
            } else if (errorMsg.includes('ALL_MODELS_EXHAUSTED')) {
                userMsg = 'Tất cả model AI trên 9Router đều đã hết lượt hôm nay';
            } else if (errorMsg.includes('QUOTA')) {
                userMsg = 'Model AI hiện tại trên 9Router đã hết lượt';
            } else if (errorMsg.includes('SERVER_ERROR')) {
                userMsg = 'Máy chủ AI chính (9Router) gặp sự cố nội bộ';
            } else {
                userMsg = `Máy chủ AI chính lỗi: ${errorMsg}`;
            }
            
            _notifyAISource('gemini', userMsg);
            
            if (updateLoadingText) {
                updateLoadingText(`⚠️ ${userMsg}. Đang tự động chuyển sang Gemini AI dự phòng...`);
            }
        }
    }
    
    // === BC 2: Fallback sang Gemini native ===
    const apiKey = getGeminiApiKey();
    if (!apiKey) {
        throw new Error("Không có API Key! Máy chủ 9Router lỗi và chưa cấu hình Gemini API Key dự phòng. Vui lòng nhập Gemini API Key trong phần Cài đặt.");
    }
    
    const ai = new GoogleGenAI({ apiKey });
    
    if (updateLoadingText && !is9RouterAvailable()) {
        // Không có 9Router → dùng Gemini trực tiếp, không cần thông báo fallback
    } else if (updateLoadingText) {
        updateLoadingText('Đang xử lý bằng Gemini AI (dự phòng)...');
    }
    
    // Build parts cho Gemini
    const parts: any[] = [{ text: prompt }];
    if (images && images.length > 0) {
        for (const img of images) {
            parts.push({ inlineData: { mimeType: img.mimeType, data: img.base64 } });
        }
    }
    
    const config: any = {};
    if (jsonMode) {
        config.responseMimeType = "application/json";
        if (schema) config.responseSchema = schema;
    }
    
    const response = await ai.models.generateContent({
        model,
        contents: { parts },
        config,
    });
    
    const text = response.text;
    if (!text) throw new Error("Gemini trả về kết quả rỗng.");
    
    if (!is9RouterAvailable()) {
    _notifyAISource('gemini'); // Dùng trực tiếp Gemini, không phải fallback
    }
    // Nếu fallback, _notifyAISource đã gọi ở trên
    
    return text;
};

// Helper: Kiểm tra có ít nhất 1 nguồn AI khả dụng (9Router hoặc Gemini key)
const ensureAIAvailable = (): void => {
    if (!is9RouterAvailable() && !getGeminiApiKey()) {
        throw new Error("Không có nguồn AI nào khả dụng! Vui lòng nhập Gemini API Key trong phần Cài đặt hoặc liên hệ admin để bật 9Router.");
    }
};

// Helper: Lấy AI instance thông minh
// - Nếu có Gemini key → trả GoogleGenAI thật
// - Nếu KHÔNG có Gemini key nhưng 9Router khả dụng → trả proxy object
// proxy này wrap call9Router → tất cả hàm có thể dùng 9Router
const getGeminiAI = (): GoogleGenAI => {
    const apiKey = getGeminiApiKey();
    
    // Có Gemini key → dùng Gemini trực tiếp
    if (apiKey) {
        return new GoogleGenAI({ apiKey });
    }
    
    // Không có Gemini key nhưng 9Router khả dụng → tạo proxy
    if (is9RouterAvailable()) {
        // Tạo proxy object giả lập GoogleGenAI interface
        // tt c hm gi ai.models.generateContent() t ng qua 9Router
        const proxy = {
            models: {
                generateContent: async (request: any): Promise<any> => {
                    // Trch xut prompt text t request Gemini format
                    let promptText = '';
                    const images: Array<{ base64: string; mimeType: string }> = [];
                    
                    if (request.contents) {
                        const parts = request.contents.parts || 
                                     (Array.isArray(request.contents) ? request.contents.flatMap((c: any) => c.parts || []) : []);
                        for (const part of parts) {
                            if (part.text) promptText += part.text + '\n';
                            if (part.inlineData) {
                                images.push({ base64: part.inlineData.data, mimeType: part.inlineData.mimeType });
                            }
                        }
                    }
                    
                    if (!promptText.trim()) {
                        throw new Error('Không tìm thấy nội dung prompt');
                    }
                    
                    // Kiểm tra JSON mode
                    const jsonMode = request.config?.responseMimeType === 'application/json';
                    
                    // Gi 9Router
                    const result = await call9Router({ 
                        prompt: promptText.trim(), 
                        jsonMode, 
                        images: images.length > 0 ? images : undefined 
                    });
                    
                    
                    if (!result) throw new Error('9Router trả về kết quả rỗng');
                    // _notifyAISource gọi trong call9Router với model chính xác
                    
                    // Trả về format giống Gemini response
                    return {
                        text: result,
                        candidates: [{
                            content: {
                                parts: [{ text: result }]
                            }
                        }]
                    };
                }
            }
        };
        
        return proxy as unknown as GoogleGenAI;
    }
    
    // Không có gì → throw
    throw new Error("Không có Gemini API Key và 9Router không khả dụng. Vui lòng nhập Gemini API Key trong phần Cài đặt.");
};

// 1. QUY TẮC KÝ HIỆU TOÁN HỌC (BẮT BUỘC)
const VIETNAMESE_MATH_RULES = `
**QUY TẮC VỀ ĐỊNH DẠNG TOÁN HỌC (CỰC KỲ QUAN TRỌNG KHÔNG BỊ LỖI MATHTYPE TRONG WORD):**
Để đảm bảo tính sư phạm và tương thích hoàn toàn với phần mềm MathType khi giáo viên dán vào MS Word, bạn **BẮT BUỘC** phải tuân thủ các quy tắc sau:

1.  **Tuyệt đối KHÔNG VIẾT TIẾNG VIỆT CÓ DẤU HOẶC VĂN BẢN TRONG BLOCK LATEX**: 
    - Việc để chữ tiếng Việt có dấu (như "cùng phía", "đồng", "điều kiện", "thỏa mãn", "loại", "mà", "nên", "hay") hoặc văn bản thường vào trong cặp dấu \`$...$\` hoặc \`$$...$$\` (kể cả khi dùng \`\\text{}\` hay \`\\mbox{}\`) sẽ **GÂY LỖI NGHIÊM TRỌNG DẪN ĐẾN HỎNG FONT MATHTYPE**.
    - Bạn PHẢI đóng khối hệ thức Toán lại, viết chữ tiếng Việt ở ngoài, rồi mới mở khối Toán khác.
    - ❌ **Ví dụ SAI 1**: \`$\\widehat{MBA} (\\text{cùng phía } \\widehat{ABO}) \\text{ nên } \\widehat{DCB} = \\widehat{MBA}$\`
    - ✅ **Ví dụ ĐÚNG 1**: \`$\\widehat{MBA}\` (cùng phía \`$\\widehat{ABO}$\`) nên \`$\\widehat{DCB} = \\widehat{MBA}$\`
    - ❌ **Ví dụ SAI 2**: \`$x = 5 \\text{ (thỏa mãn điều kiện)}$\`
    - ✅ **Ví dụ ĐÚNG 2**: \`$x = 5$\` (thỏa mãn điều kiện)
    - ❌ **Ví dụ SAI 3**: \`$\\Delta ABC \\sim \\Delta DEF (c.g.c)$\` hoặc \`$A B C (g-c-g)$\`
    - ✅ **Ví dụ ĐÚNG 3**: \`$\\Delta ABC \\sim \\Delta DEF$\` (c.g.c)

2.  **Ký hiệu Tam giác**: CHỈ dùng \`\\Delta\` (tam giác to). Ví dụ: \`$\\Delta ABC$\`. **TUYỆT ĐỐI KHÔNG** dùng lệnh \`\\triangle\`.
3.  **Ký hiệu Góc**: CHỈ dùng \`\\widehat{ABC}\` (có mũ ở trên). Ví dụ: \`$\\widehat{ABC} = 60^\\circ$\`. **TUYỆT ĐỐI KHÔNG** dùng \`\\angle ABC\`.
4.  **Cú pháp chuẩn**: Phải viết thường (\`\\frac\`, \`\\sqrt\`). TUYỆT ĐỐI KHÔNG viết hoa lệnh (\`\\FRAC\`).
5.  **Tam giác bằng nhau & Đồng dạng**: Dùng \`=\` cho bằng nhau (\`$\\Delta ABC = \\Delta A'B'C'$\`). Dùng \`\\sim\` cho đồng dạng. KHÔNG dùng \`\\cong\`.
6.  **Độ & Dấu phẩy thập phân**: Đo góc phải có độ (\`^\\circ\`). Dấu thập phân của Việt Nam bắt buộc là dấu phẩy \`,\` (\`$3,14$\` thay vì \`$3.14$\`).
7.  **Song song & Vuông góc**: Dùng \`\\parallel\` (hoặc \`//\`) và \`\\perp\`.
8.  **Hệ phương trình / Hệ điều kiện**: Khi dùng \`\\begin{cases} ... \\end{cases}\`, nếu cần ghi chú (thỏa mãn/loại), CHỈ dùng chữ viết tắt tiếng Việt không dấu: \`(\\text{TM})\` hoặc \`(\\text{L})\` để tránh lỗi font MathType. 
9.  **Dấu nhân**: Dùng \`\\cdot\` (dấu chấm) cho phép nhân đại số/số học trung học, thay vì \`\\times\` hoặc \`*\`.
10. **Không xuống dòng vô cớ**: Tuyệt đối không ngắt dòng (enter) khi đang ở giữa cặp dấu \`$...$\` hoặc \`$$...$$\`.
11. **VIẾT HỆ PHƯƠNG TRÌNH TRÊN 1 DÒNG (CỰC KỲ QUAN TRỌNG)**: Toàn bộ \`$\\begin{cases} ... \\end{cases}$\` PHẢI viết trên MỘT DÒNG, dùng \`\\\\\` ngắt dòng giữa các phương trình. KHÔNG ĐƯỢC enter/xuống dòng bên trong. Ví dụ ĐÚNG: \`$\\begin{cases} x + y = 5 \\\\ x - y = 1 \\end{cases}$\`. Tương tự với \`\\begin{aligned}\`, \`\\begin{array}\`.
12. **Tách biểu thức dài**: Nếu chuỗi biến đổi có nhiều \`\\Leftrightarrow\` hoặc \`\\Rightarrow\`, hãy tách thành nhiều khối \`$...$\` riêng, nối bằng ký hiệu ⇔ hoặc ⇒ bên ngoài. Ví dụ: \`$x^2 = 4$ ⇔ $x = \\pm 2$\` thay vì nhồi tất cả vào 1 khối \`$...$\` rất dài.
13. **MỌI KÝ HIỆU TOÁN HÌNH PHẢI TRONG dollar signs**: KHÔNG BAO GIỜ viết lệnh LaTeX nào BÊN NGOÀI cặp dollar signs. VD ĐÚNG: Suy ra \`$\\\\widehat{ADC} = \\\\widehat{ADM}$\`. VD SAI: Suy ra \\\\widehat{ADC} = \\\\widehat{ADM}. Áp dụng cho: \\\\widehat, \\\\overline, \\\\Delta, \\\\sim, \\\\perp, \\\\parallel, \\\\frac, \\\\sqrt, \\\\cdot, ^\\\\circ.
`;

// 2. KHUNG NĂNG LỰC SỐ THCS (THEO CV 3456)
const DIGITAL_COMPETENCE_FRAMEWORK_3456 = `
**KHUNG NĂNG LỰC SỐ CẤP THCS (CÔNG VĂN 3456):**
Khi thiết kế hoạt động, BẮT BUỘC tích hợp và gắn thẻ mã (Ví dụ: [DL.1.1]) vào hoạt động tương ứng:

1. **Miền 1: Thông tin và dữ liệu (DL)**
   - [DL.1.1]: Sử dụng công cụ tìm kiếm dữ liệu.
   - [DL.2.2]: Đánh giá độ tin cậy của thông tin.
   - [DL.3.1]: Quản lý, tổ chức dữ liệu số.

2. **Miền 2: Giao tiếp và hợp tác (GT)**
   - [GT.1.1]: Tương tác qua công nghệ số (Zalo, Padlet, Zoom...).
   - [GT.2.1]: Chia sẻ dữ liệu, tài nguyên số.
   - [GT.4.1]: Quản lý định danh số và danh tiếng.

3. **Miền 3: Sáng tạo nội dung số (ST)**
   - [ST.1.1]: Phát triển tài liệu, văn bản, bảng tính.
   - [ST.1.2]: Chỉnh sửa hình ảnh, video, âm thanh (Canva, PowerPoint...).
   - [ST.2.1]: Tích hợp và cải biến nội dung số.

4. **Miền 4: An toàn (AT)**
   - [AT.1.1]: Bảo vệ thiết bị.
   - [AT.2.1]: Bảo vệ dữ liệu cá nhân.
   - [AT.4.1]: Bảo vệ môi trường (tiết kiệm năng lượng).

5. **Miền 5: Giải quyết vấn đề (GQ)**
   - [GQ.1.1]: Giải quyết lỗi kỹ thuật.
   - [GQ.2.1]: Xác định nhu cầu và công cụ phù hợp.
   - [GQ.3.1]: Sử dụng công nghệ sáng tạo để giải quyết bài toán thực tế.
`;

// 3. QUY TRÌNH KIỂM SOÁT CHẤT LƯỢNG 3 LỚP (BẮT BUỘC)
const STRICT_QA_PROTOCOL = `
---
**QUY TRÌNH KIỂM DUYỆT CHẤT LƯỢNG 3 LỚP (3-LAYER QA PROTOCOL):**
Trước khi xuất ra kết quả JSON cuối cùng, bạn **PHẢI** thực hiện quy trình tự kiểm tra và sửa lỗi ngầm (Internal Self-Correction) sau đây:

1.  **VÒNG 1: KIỂM TRA SỐ LIỆU & LOGIC KHOA HỌC**
    -   Tự giải lại bài toán/câu hỏi. Kết quả phải chính xác và "đẹp" (số nguyên, phân số đơn giản).
    -   Logic bài dạy phải trôn tru: Hoạt động trước là tiền đề cho hoạt động sau.
    -   Thời lượng phân bổ hợp lý, tổng thời gian phải khớp với quy định.

2.  **VÒNG 2: BIÊN TẬP VIÊN TOÁN HỌC & NGÔN NGỮ**
    -   **LaTeX:** Rà soát từng mã, dùng \`\\widehat{...}\` cho góc, \`\\Delta\` cho tam giác, dấu phẩy \`,\` cho số thập phân.
    -   **QUÉT LỖI MATHTYPE (CỰC KỲ QUAN TRỌNG):** BẮT BUỘC rà soát lại toàn bộ công thức. TUYỆT ĐỐI KHÔNG để chữ tiếng Việt có dấu, hoặc các chữ như (c.g.c), chữ viết tắt lọt vào trong khối \`$...$\` hoặc \`$$...$$\`. Hãy kiểm tra xem có bất kỳ lệnh \`\\text{}\` chứa tiếng Việt nào không. Nếu có, PHẢI ngắt biểu thức ra ngoài. Ví dụ đúng: \`$\\widehat{MBA}\` (cùng phía \`$\\widehat{ABO}$\`) nên...
    -   **Ngôn ngữ:** Dùng từ ngữ sư phạm chuẩn mực (Ví dụ: "Yêu cầu HS...", "Hướng dẫn HS...", không dùng văn nói).
    -   **Hoạt động:** Các bước (Chuyển giao, Thực hiện, Báo cáo, Kết luận) phải rõ ràng.

3.  **VÒNG 3: KỸ THUẬT VIÊN MARKDOWN (QUAN TRỌNG CHO BẢNG)**
    -   **Cấu trúc Bảng:** Kiểm tra kỹ các bảng Markdown. Đảm bảo số lượng cột ở mỗi hàng **BẰNG NHAU** và khớp với tiêu đề.
    -   **Không được thiếu dấu \`|\`**: Mỗi dòng trong bảng phải bắt đầu và kết thúc bằng \`|\`.
    -   Tránh dùng HTML phức tạp trong bảng, chỉ dùng thẻ <br> để xuống dòng.

**CHỈ XUẤT RA KẾT QUẢ QUA 3 VÒNG KIỂM TRA VÀ ĐÃ SỬA SẠCH LỖI.**
---
`;

// 4. QUY TẮC SỐ LIỆU ĐẸP (MATH BEAUTY RULES)
const MATH_BEAUTY_RULES = `
**QUY TẮC "SỐ LIỆU ĐẸP & CHÍNH XÁC" (MATH BEAUTY RULES):**
Để đảm bảo tính chuẩn xác và sự logic trong toán học, khoa học:
1.  **Kết quả cuối cùng**: Ưu tiên số nguyên hoặc phân số tối giản (mẫu số nhỏ < 100).
2.  **Căn thức**: Nếu có căn, số trong căn phải là số chính phương (để khai căn ra số nguyên) hoặc căn thức quen thuộc (căn 2, căn 3).
3.  **Hình học và Logic Không Gian**: 
    -   Các số liệu đo đạc (độ dài, góc) phải tạo thành một hình có thật (VD: Tổng hai hình tam giác > cạnh thứ ba, tam giác vuông phải tuân đúng Pytago 3-4-5, 5-12-13...).
    -   Dữ liệu trong đề thi VÀ số tương ứng trên hình vẽ (nếu có biểu đồ, hình vẽ AI) phải trùng khớp, logic 100%. Không tự mâu thuẫn dữ liệu.
4.  **Phương trình**: Nghiệm phải đẹp (số nguyên, phân số đơn giản). Không chấp nhận nghiệm vô tỉ dài dòng trừ khi đề bài yêu cầu làm tròn.
5.  **Thống kê/Xác suất**: Tỉ lệ phần trăm phải chẵn hoặc làm tròn 1-2 chữ số thập phân hợp lý.
`;

const parseJSONSafe = (text: string) => {
    try {
        let cleanText = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
        const startObject = cleanText.indexOf('{');
        const startArray = cleanText.indexOf('[');
        let start = -1;
        if (startObject === -1 && startArray === -1) return JSON.parse(cleanText);
        else if (startObject === -1) start = startArray;
        else if (startArray === -1) start = startObject;
        else start = Math.min(startObject, startArray);

        const end = (cleanText[start] === '{') ? cleanText.lastIndexOf('}') : cleanText.lastIndexOf(']');
        if (start !== -1 && end !== -1 && end > start) cleanText = cleanText.substring(start, end + 1);
        return JSON.parse(cleanText);
    } catch (e) {
        console.error("JSON Parse Error:", e);
        return null;
    }
};

const removeVietnameseTones = (str: string): string => {
    if (!str) return "";
    str = str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    str = str.replace(/đ/g, 'd').replace(/Đ/g, 'D');
    return str;
};


// === LATEX POST-PROCESSING: Sửa lỗi LaTeX phổ biến do AI sinh ra ===
// Chạy sau mỗi response AI để đảm bảo KaTeX (preview) và OMML (Word) render đúng
export const fixLatexErrors = (md: string): string => {
    if (!md) return md;
    
    // Pre-clean: Loại bỏ <br> và ___BR___ bên trong $...$ (AI đôi khi chèn vào math block)
    md = md.replace(/(\$\$?)([^$]+?)(\$\$?)/g, (match, open, inner, close) => {
        if (/<br\s*\/?>|___BR___/i.test(inner)) {
            return open + inner.replace(/<br\s*\/?>/gi, ' ').replace(/___BR___/g, ' ') + close;
        }
        return match;
    });
    
    // 0. GỘP MULTILINE MATH BLOCKS → SINGLE LINE (QUAN TRỌNG NHẤT)
    // AI thường xuất $\begin{cases}...\end{cases}$ trải trên nhiều dòng
    // → Phải gộp lại thành 1 dòng để regex $[^$\n]+$ match được
    // Xử lý display math $$...$$ trước
    md = md.replace(/\$\$([^]*?)\$\$/g, (match, inner) => {
        return '$$' + inner.replace(/\n\s*/g, ' ').trim() + '$$';
    });
    // Xử lý inline math $...$ (multiline — $ ở đầu dòng hoặc sau text, $ ở cuối dòng khác)
    // Tìm $ mở, nội dung chứa \begin hoặc \\ (dấu hiệu multiline math), rồi $ đóng
    md = md.replace(/\$([^$]*?\\(?:begin|\\|frac|sqrt)[^$]*?)\$/gs, (match, inner) => {
        if (inner.includes('\n')) {
            return '$' + inner.replace(/\n\s*/g, ' ').trim() + '$';
        }
        return match;
    });
    // Fallback: Gộp bất kỳ $...$ nào chứa newline (dấu hiệu math multiline)
    md = md.replace(/\$([^$]*?\n[^$]*?)\$/g, (match, inner) => {
        // Chỉ gộp nếu nội dung trông giống math (chứa \, ^, _, {, })
        if (/[\\^_{}]/.test(inner)) {
            return '$' + inner.replace(/\n\s*/g, ' ').trim() + '$';
        }
        return match;
    });
    
    // 0b. Thay thế LaTeX arrows và spacing NGOÀI $...$ bằng Unicode/text
    const arrowReplacements: [RegExp, string][] = [
        [/\\Leftrightarrow/g, '⇔'],
        [/\\Rightarrow/g, '⇒'],
        [/\\Leftarrow/g, '⇐'],
        [/\\rightarrow/g, '→'],
        [/\\leftarrow/g, '←'],
        [/\\implies/g, '⇒'],
        [/\\iff/g, '⇔'],
        [/\\to(?![a-zA-Z])/g, '→'],
        [/\\qquad/g, '  '],
        [/\\quad/g, ' '],
    ];
    const mathParts = md.split(/(\$\$[^$]+?\$\$|\$[^$]+?\$)/g);
    md = mathParts.map(part => {
        if (part.startsWith('$') && part.endsWith('$')) return part;
        let result = part;
        for (const [pattern, replacement] of arrowReplacements) {
            result = result.replace(pattern, replacement);
        }
        return result;
    }).join('');


    // 1. Sửa \frac bị mất backslash
    md = md.replace(/(?<![\\a-zA-Z])frac\{/g, '\\frac{');
    md = md.replace(/(?<![\\a-zA-Z])frac\s*\{/g, '\\frac{');
    
    // 2. Sửa \sqrt bị mất backslash
    md = md.replace(/(?<![\\a-zA-Z])sqrt\{/g, '\\sqrt{');
    md = md.replace(/(?<![\\a-zA-Z])sqrt\[/g, '\\sqrt[');
    
    // 3. Sửa \text bị mất backslash
    md = md.replace(/(?<![\\a-zA-Z])text\{/g, '\\text{');
    
    // 4. Sửa \overline, \overrightarrow, \widehat bị mất backslash
    md = md.replace(/(?<![\\a-zA-Z])overline\{/g, '\\overline{');
    md = md.replace(/(?<![\\a-zA-Z])overrightarrow\{/g, '\\overrightarrow{');
    md = md.replace(/(?<![\\a-zA-Z])widehat\{/g, '\\widehat{');
    md = md.replace(/(?<![\\a-zA-Z])vec\{/g, '\\vec{');
    md = md.replace(/(?<![\\a-zA-Z])hat\{/g, '\\hat{');
    md = md.replace(/(?<![\\a-zA-Z])mathbb\{/g, '\\mathbb{');
    md = md.replace(/(?<![\\a-zA-Z])mathcal\{/g, '\\mathcal{');
    md = md.replace(/(?<![\\a-zA-Z])mathrm\{/g, '\\mathrm{');
    md = md.replace(/(?<![\\a-zA-Z])binom\{/g, '\\binom{');
    
    // 5. Sửa \Delta, \alpha, \beta... bị mất backslash
    const greekCommands = ['Delta', 'alpha', 'beta', 'gamma', 'delta', 'theta', 'lambda', 'mu', 'pi', 'sigma', 'omega', 'phi', 'psi', 'Omega', 'Sigma', 'Phi', 'Gamma', 'Lambda'];
    for (const cmd of greekCommands) {
        const regex = new RegExp(`(?<![\\\\a-zA-Z])${cmd}(?![a-zA-Z])`, 'g');
        // Only fix inside math blocks (between $ signs)
        md = md.replace(/\$([^$]+)\$/g, (match, inner) => {
            return '$' + inner.replace(regex, `\\${cmd}`) + '$';
        });
    }
    
    // 6. Sửa \times, \cdot, \leq, \geq, \neq, \approx, \pm, \infty, \parallel, \perp bị mất backslash
    const mathOps = ['times', 'cdot', 'leq', 'geq', 'neq', 'approx', 'pm', 'infty', 'parallel', 'perp', 'circ', 'sim', 'equiv', 'subset', 'cup', 'cap', 'forall', 'exists', 'rightarrow', 'Rightarrow', 'leftarrow', 'Leftrightarrow', 'implies'];
    for (const op of mathOps) {
        const regex = new RegExp(`(?<![\\\\a-zA-Z])${op}(?![a-zA-Z{])`, 'g');
        md = md.replace(/\$([^$]+)\$/g, (match, inner) => {
            return '$' + inner.replace(regex, `\\${op}`) + '$';
        });
    }
    
    // 7. Sửa \begin, \end bị mất backslash
    md = md.replace(/(?<![\\])begin\{/g, '\\begin{');
    md = md.replace(/(?<![\\])end\{/g, '\\end{');
    
    // 8. Sửa dấu $ lẻ (unpaired) — đếm số $ trong mỗi dòng, nếu lẻ thì thêm $ cuối dòng
    // Chỉ xử lý inline math ($...$), không xử lý display math ($$...$$)
    // QUAN TRỌNG: Bỏ qua dòng chứa \begin hoặc \end (phần của multiline math environment)
    const lines = md.split('\n');
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        // Skip nếu dòng chứa \begin hoặc \end — đây là phần của multiline math, Rule 0 sẽ xử lý
        if (/\\(?:begin|end)\{/.test(line)) continue;
        // Đếm $ đơn (không phải $$)
        let singleDollarCount = 0;
        let j = 0;
        while (j < line.length) {
            if (line[j] === '$') {
                if (j + 1 < line.length && line[j + 1] === '$') {
                    j += 2; // Skip $$
                    continue;
                }
                singleDollarCount++;
            }
            j++;
        }
        // Nếu lẻ $ → thêm $ cuối dòng để khép lại
        if (singleDollarCount % 2 !== 0) {
            lines[i] = line + '$';
        }
    }
    md = lines.join('\n');
    
    // 9. Sửa tiếng Việt có dấu bên trong $...$
    // Pattern: $...\text{tiếng việt có dấu}...$ → tách ra ngoài
    md = md.replace(/\$([^$]*?)\\text\{([^}]*?[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ][^}]*?)\}([^$]*?)\$/g, 
        (match, before, viText, after) => {
            const trimmedViText = viText.trim();
            const result = before.trim() ? `$${before.trim()}$ ` : '';
            const afterResult = after.trim() ? ` $${after.trim()}$` : '';
            return result + trimmedViText + afterResult;
        }
    );
    
    // 10. Sửa double-backslash do AI escape thừa: \\\\frac → \\frac (trong context đã escaped)
    md = md.replace(/\\\\\\\\(frac|sqrt|text|Delta|widehat|overline|begin|end)/g, '\\\\$1');
    
    // 11. TỰ ĐỘNG BỌC LaTeX commands ngoài $...$ vào $...$
    // AI hình học hay viết: Suy ra \widehat{ADC} = \widehat{ADM} ngoài math block
    // → Word hiện raw text. Cần tự bọc vào $...$
    const autoWrapParts = md.split(/(\$\$[^$]+?\$\$|\$[^$]+?\$)/g);
    md = autoWrapParts.map(part => {
        if (part.startsWith('$') && part.endsWith('$')) return part;
        let result = part;
        const latexCmd = '\\\\(?:widehat|overline|overrightarrow|vec|hat|sqrt|text|mathrm|ce|pu)\\{[^}]*\\}';
        const latexFrac = '\\\\frac\\{[^}]*\\}\\{[^}]*\\}';
        const latexSymbol = '\\\\(?:Delta|triangle|alpha|beta|gamma|theta|pi|sim|perp|parallel|cdot|times|equiv|approx|neq|leq|geq|pm|infty|circ|angle)(?![a-zA-Z{])';
        const supSub = '(?:\\^\\{[^}]*\\}|\\^\\\\circ|\\^[0-9]|_\\{[^}]*\\}|_[0-9])';
        const element = `(?:${latexCmd}|${latexFrac}|${latexSymbol}|${supSub})`;
        const mathVar = '[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)?';
        const mathOp = '[=<>≤≥≠~∼⊥∥+\\-·×÷]';
        const connector = `(?:\\s*(?:${mathOp}|${mathVar})\\s*)`;
        const pattern = new RegExp(`${element}(?:${connector}${element}|${connector})*`, 'g');
        result = result.replace(pattern, (match) => {
            // Preserve leading/trailing whitespace outside $...$
            const trimmed = match.trim();
            const leadSpace = match.startsWith(' ') ? ' ' : '';
            const trailSpace = match.endsWith(' ') ? ' ' : '';
            return leadSpace + '$' + trimmed + '$' + trailSpace;
        });
        return result;
    }).join('');
    
    // 11b. Gộp $...$ $...$ liền nhau thành 1 block
    for (let pass = 0; pass < 3; pass++) {
        md = md.replace(/\$([^$]+)\$\s*\$([^$]+)\$/g, (m, a, b) => {
            return '$' + a.trim() + ' ' + b.trim() + '$';
        });
    }
    
    return md;
};


export const generateSingleImage = async (description: string): Promise<string | null> => {
    ensureAIAvailable();
    const ai = getGeminiAI();

    const nonAccentedDescription = removeVietnameseTones(description);
    const enhancedPrompt = `
    **NHIỆM VỤ: TẠO HÌNH ẢNH GIÁO DỤC, TOÁN HỌC, BIỂU ĐỒ MINH HỌA THỰC TẾ**
    **MÔ TẢ CHI TIẾT TỪ BÀI:** "${nonAccentedDescription}"
    
    **QUY TẮC CỐT LÕI (BẮT BUỘC TUÂN THỦ TUYỆT ĐỐI):**
    1. **Tính chính xác Toán học / Dữ liệu:**
       - Vẽ ĐÚNG tỉ lệ các cạnh, đúng góc (VD: Góc vuông phải nhận thức sự vuông, đoạn 3cm phải hiển thị ngắn hơn đoạn 5cm).
       - Các đường thẳng song song, đường chéo, giao điểm phải cắt đúng vị trí mô tả.
       - Biểu đồ (nếu có) phải phản ánh chuẩn xác các con số trong mô tả.
    2. **Nhãn mác (Labels) & Ký hiệu:**
       - Gắn nhãn ĐÚNG các đỉnh (A, B, C...) và dữ liệu (3cm, 30°, 10kg...) vào đúng vị trí trên hình.
       - Văn bản trong hình PHẢI là Tiếng Việt KHÔNG DẤU.
    3. **Thẩm mỹ Sách Giáo Khoa:**
       - Phong cách line-art, hình học kỹ thuật, sơ đồ cực kỳ sạch sẽ. 
       - Nét vẽ đen mạnh, nền trắng hoàn toàn (hoặc có lưới caro mờ nếu là đồ thị tọa độ). 
       - Không vẽ các chi tiết thừa thãi, hoa lá hay 3D rườm rà. Chỉ tập trung vào tính logic khoa học của hình.
    `;

    try {
        const imageResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: { parts: [{ text: enhancedPrompt }] },
        });
        const parts = imageResponse?.candidates?.[0]?.content?.parts;
        if (parts) {
            for (const part of parts) {
                if (part.inlineData) return part.inlineData.data;
            }
        }
        return null;
    } catch (imgError) {
        console.error("Error generating single image:", imgError);
        throw imgError;
    }
};

export const generateLessonPlan = async (input: UserInput, updateLoadingText: (text: string) => void): Promise<LessonPlanResponse | null> => {

    // --- LOGIC XỬ LÝ NHIỀU BÀI (TUẦN) ---
    const isWeeklyPlan = input.lessonItems && input.lessonItems.length > 0;
    
    let topicStr = "";
    if (isWeeklyPlan) {
        topicStr = `KẾ HOẠCH BÀI DẠY ${input.weekName || "TUẦN ..."}\n\nGồm các bài sau:\n` + 
                   input.lessonItems!.map((item, idx) => 
                       `${idx + 1}. ${item.topic} (Tổng thời lượng bài: ${item.duration}${item.specificPeriod ? `, CHỈ SOẠN NỘI DUNG DẠY CHO: ${item.specificPeriod}` : ''})`
                   ).join("\n");
    } else {
        topicStr = `Chủ đề: "${input.topic}" - Thời lượng: ${input.duration}`;
    }

    const promptText = `
    Đóng vai chuyên gia sư phạm hàng đầu (Giáo viên Giỏi cấp Quốc gia). Hãy soạn một Kế hoạch bài dạy (Giáo án) môn ${input.subject} lớp ${input.grade} thật xuất sắc, đạt chuẩn 5512 và tích hợp chuyển đổi số mạnh mẽ.
    
    THÔNG TIN BÀI DẠY:
    ${topicStr}
    
    ================================================================
    YÊU CẦU CẤU TRÚC VÀ NỘI DUNG (TUÂN THỦ TUYỆT ĐỐI CV 5512):
    ================================================================

    0. **NGUYÊN TẮC VÀNG: BÁM SÁT SÁCH GIÁO KHOA (SGK):**
       - **Nội dung kiến thức:** Định nghĩa, định lý, khái niệm phải chuẩn xác 100% theo câu chữ trong SGK mới (Kết nối tri thức, Chân trời sáng tạo hoặc Cánh diều).
       - **Ví dụ minh họa:** Ưu tiên sử dụng chính các ví dụ, hoạt động khám phá có trong SGK tương ứng với bài học này.
       - **Bài tập luyện tập:** Ưu tiên lấy các bài tập có sẵn trong SGK để học sinh luyện tập.
       - **Logic:** Tiến trình dạy học phải khớp với tiến trình trình bày của bài học trong SGK.

    1. **TƯ DUY THIẾT KẾ BÀI HỌC:**
       - Chuỗi hoạt động mạch lạc: Mở đầu -> Hình thành kiến thức -> Luyện tập -> Vận dụng.
       - Tích hợp công cụ số, thiết bị dạy học hiện đại.

    2. **TÍCH HỢP NĂNG LỰC SỐ (BẮT BUỘC - MỚI):**
       - Sử dụng mã trong Khung CV 3456 dưới đây để gắn thẻ vào các hoạt động hoặc sản phẩm tương ứng.
       - Gắn thẻ dạng \`[MÃ.SỐ]\` ngay trong văn bản mô tả hoạt động hoặc cột mục tiêu.
       - Ví dụ: "HS sử dụng máy tính cầm tay hoặc Excel để tính toán [GQ.2.1]", "HS tìm kiếm hình ảnh trên mạng [DL.1.1]".
       
       ${DIGITAL_COMPETENCE_FRAMEWORK_3456}

    3. **QUẢN LÝ THỜI GIAN & CẤU TRÚC TIẾT HỌC:**
       - **Quy tắc phân chia tiết:** Nếu bài > 1 tiết, PHẢI phân chia rõ ràng từng tiết một:
         **TIẾT 1: [NỘI DUNG CHÍNH]**
         ...
         **TIẾT 2: [NỘI DUNG CHÍNH]**
         ...
         **TIẾT 3: [NỘI DUNG CHÍNH]** (Nếu có)
       - **QUY TẮC ĐÁNH SỐ HOẠT ĐỘNG (BẮT BUỘC):** 
         Ở đầu mỗi TIẾT mới, số thứ tự Hoạt động phải **RESET VỀ 1** (Bắt đầu lại từ HOẠT ĐỘNG 1).
         Ví dụ:
         **TIẾT 1:**
         **HOẠT ĐỘNG 1: ...**
         **HOẠT ĐỘNG 2: ...**
         **TIẾT 2:**
         **HOẠT ĐỘNG 1: ...** (Lưu ý: Không viết tiếp là Hoạt động 3)
         **HOẠT ĐỘNG 2: ...**
       - Ghi rõ thời gian từng hoạt động (Ví dụ: 5 phút).
       - **HOẠT ĐỘNG KẾT THÚC TIẾT:** Cuối mỗi tiết học (hoặc cuối bài), BẮT BUỘC phải có hoạt động **HƯỚNG DẪN VỀ NHÀ** (2-3 phút) để dặn dò HS tự học, chuẩn bị bài sau hoặc làm bài tập củng cố.

    4. **TRÌNH BÀY BẢNG 3 CỘT (CỰC KỲ QUAN TRỌNG ĐỂ XUẤT WORD ĐẸP):**
       - **QUY TẮC NGẮT DÒNG TIÊU ĐỀ HOẠT ĐỘNG (BẮT BUỘC TUÂN THỦ):**
         Để phần mềm tự động tách dòng và gộp ô tiêu đề Hoạt động (Merge Cell), bạn PHẢI tuân thủ cấu trúc sau trong ô đầu tiên:
         \`**HOẠT ĐỘNG [X]: [TÊN HOẠT ĐỘNG] ([Thời gian])** <br><br> [Nội dung bước 1]...\`
         LƯU Ý: Phải có thẻ \`<br><br>\` hoặc xuống dòng 2 lần ngay sau tiêu đề đậm.

       - **QUY TẮC CỘT "DỰ KIẾN SẢN PHẨM" VÀ "MỤC TIÊU":**
         Để đảm bảo file Word hiển thị đẹp, các ý trong 2 cột này **PHẢI ĐƯỢC NGẮT DÒNG BẰNG GẠCH ĐẦU DÒNG** rõ ràng.
         Ví dụ:
         \`- Sản phẩm A của HS... <br>- Bảng kết quả nhóm... [ST.1.1] <br>- Câu trả lời: ...\`
       
       - **CẤU TRÚC BẢNG:**
       | Nội dung, phương thức tổ chức hoạt động học tập của học sinh | Dự kiến sản phẩm, đánh giá kết quả hoạt động | Mục tiêu cần đạt |
       | :--- | :--- | :--- |
       | **HOẠT ĐỘNG 1: KHỞI ĐỘNG (5 phút)**<br><br>**Chuyển giao:** GV giao nhiệm vụ... [DL.1.1]<br>**Thực hiện:** HS thảo luận...<br>**Báo cáo:** Đại diện nhóm trình bày... [GT.2.1]<br>**Kết luận:** GV chốt... | - Sản phẩm của HS...<br>- Bảng kết quả... [ST.1.1] | - Hình thành kiến thức...<br>- Năng lực giải quyết vấn đề... |
       | **HƯỚNG DẪN VỀ NHÀ (2 phút)**<br><br>**Chuyển giao:** GV dặn dò HS ôn lại bài...<br>**Thực hiện:** HS ghi chép... | - HS ghi nhớ nhiệm vụ | - Năng lực tự học, tự chủ |

    5. **HÌNH ẢNH & TÀI LIỆU:** 
       - Trích dẫn nguồn SGK chính xác (Tên sách, Tập, Bài, Trang).

    6. ${isWeeklyPlan ? "**CHÚ Ý GIÁO ÁN TUẦN**: Giữa các bài học khác nhau, hãy dùng tiêu đề phân cách: `### BÀI [SỐ]: [TÊN BÀI]`." : ""}
    
    ${VIETNAMESE_MATH_RULES}
    
    **QUY ĐỊNH CẤM (NEGATIVE PROMPTS - RẤT QUAN TRỌNG):**
    1. **KHÔNG** xuất lại Tên bài, Tên trường, Tổ chuyên môn, Tên giáo viên ở phần đầu nội dung Markdown. Bắt đầu ngay vào mục tiêu.
    2. **KHÔNG** viết lời dẫn nhập, tóm tắt hoạt động ở bên ngoài bảng trong phần "III. TIẾN TRÌNH DẠY HỌC".
       - SAI: "Sau đây là các hoạt động cụ thể: [Bảng]"
       - ĐÚNG: [Bảng] (Vào thẳng bảng hoặc tiêu đề Tiết)
    
    **QUY TRÌNH RÀ SOÁT LỖI (SELF-CORRECTION) TRƯỚC KHI XUẤT BẢN:**
    Bạn PHẢI thực hiện rà soát lại toàn bộ nội dung vừa tạo ra theo các tiêu chí sau:
    1.  **Công thức toán học:** Đảm bảo hiển thị đúng LaTeX (dùng \`\\Delta\`, \`\\widehat\`, dấu phẩy thập phân).
    2.  **Logic khoa học:** Nội dung kiến thức chính xác, phù hợp SGK mới.
    3.  **Từ ngữ sư phạm:** Chuẩn mực, không dùng từ địa phương.
    4.  **Cấu trúc bảng:** Kiểm tra bảng Markdown, đảm bảo không bị lệch cột, thiếu dấu \`|\`.
    5.  **Phân chia tiết:** Nếu bài có nhiều tiết, kiểm tra xem đã có đủ tiêu đề (TIẾT 1, TIẾT 2...) chưa.
    
    ${STRICT_QA_PROTOCOL}

    CẤU TRÚC OUTPUT (JSON):
    Trả về JSON object có cấu trúc:
    {
      "topic": "Tên bài",
      "grade": "Lớp ...",
      "duration": "... tiết",
      "objectives": { "knowledge": [...], "competence": [...], "qualities": [...] },
      "equipment": "...",
      "fullMarkdown": "## I. MỤC TIÊU\\n...\\n## II. THIẾT BỊ DẠY HỌC VÀ HỌC LIỆU\\n...\\n## III. TIẾN TRÌNH DẠY HỌC\\n(Bảng 3 cột...)\\n"
    }
    
    DỮ LIỆU BỔ SUNG:
    ${input.context || "Soạn theo chuẩn kiến thức kỹ năng, phát huy tính tích cực của học sinh."}
    `;

    const schema = {
        type: Type.OBJECT,
        properties: {
            topic: { type: Type.STRING },
            grade: { type: Type.STRING },
            duration: { type: Type.STRING },
            objectives: { type: Type.OBJECT, properties: { knowledge: { type: Type.ARRAY, items: { type: Type.STRING } }, competence: { type: Type.ARRAY, items: { type: Type.STRING } }, qualities: { type: Type.ARRAY, items: { type: Type.STRING } } } },
            equipment: { type: Type.STRING },
            fullMarkdown: { type: Type.STRING } 
        },
        required: ["topic", "grade", "duration", "fullMarkdown"]
    };

    try {
        updateLoadingText(isWeeklyPlan ? `AI đang phân phối chương trình và soạn giáo án tuần (${input.lessonItems?.length} bài)...` : "AI đang thiết kế hoạt động và tích hợp năng lực số (CV 3456)...");
        
        const text = await callAIWithFallback({
            prompt: promptText,
            jsonMode: true,
            schema,
            model: 'gemini-3-flash-preview',
            updateLoadingText,
        });

        const parsedData: any = parseJSONSafe(text);
        if (!parsedData) return null;
        
        parsedData.subject = input.subject;
        parsedData.weekName = input.weekName;
        parsedData.lessonItems = input.lessonItems;
        
        return parsedData as LessonPlanResponse;
    } catch (error) {
        console.error("AI Error:", error);
        throw error;
    }
};

export const generateExam = async (input: ExamInput, updateLoadingText?: (text: string) => void): Promise<ExamResponse | null> => {
    ensureAIAvailable();

    // Format inputs
    let diffStr = input.difficulty === "4-3-2-1" ? "40% NB - 30% TH - 20% VD - 10% VDC" : input.difficulty === "3-4-2-1" ? "30% NB - 40% TH - 20% VD - 10% VDC" : input.difficulty;
    if (input.matrixType === 'CV7991') {
        diffStr = "40% Nhận biết - 30% Thông hiểu - 30% Vận dụng (Chuẩn CV 7991)";
    }
    
    // Helper: Mô tả loại TN cho prompt AI
    const describeTnTypes = (types?: string[]): string => {
        if (!types || types.length === 0) return '';
        const map: Record<string, string> = {
            '1-dap-an': 'Trắc nghiệm nhiều lựa chọn (4 phương án A, B, C, D \u2014 chỉ 1 đáp án đúng)',
            'dung-sai': 'Trắc nghiệm Đúng - Sai (mỗi câu gồm 4 mệnh đề a, b, c, d \u2014 HS chọn Đúng/Sai cho từng mệnh đề)',
            'tra-loi-ngan': 'Trắc nghiệm trả lời ngắn (HS chỉ ghi đáp án cuối cùng, không trình bày)'
        };
        return types.map(t => map[t] || t).join('\n       - ');
    };

    let structStr = "";
    let cv7991Rules = "";
    let tnTypesRules = "";

    if (input.matrixType === 'CV7991') {
        structStr = "Theo Công văn 7991/BGDĐT-GDTrH (Mẫu mới nhất)";
        cv7991Rules = `
    QUY TRÌNH & CẤU TRÚC ĐỀ THEO CÔNG VĂN 7991 (BẮT BUỘC TUÂN THỦ TỪNG CHỮ):
    1. Tỉ lệ điểm: 70% Trắc nghiệm khách quan (TN) - 30% Tự luận (TL) (tức là 7 điểm TN, 3 điểm TL).
    2. Cấu trúc Trắc nghiệm (7 điểm) PHẢI BAO GỒM CÁC PHẦN SAU:
       - Phần I: Trắc nghiệm nhiều lựa chọn (3 điểm). Gồm 12 câu, mỗi câu 0.25 điểm. Mỗi câu có 4 phương án A, B, C, D, chỉ 1 phương án đúng.
       - Phần II: Trắc nghiệm Đúng - Sai (2 điểm). Gồm 4 câu hỏi/tình huống, mỗi câu 0.5 điểm. TẠI MỖI CÂU, phải đưa ra 4 ý phát biểu (a, b, c, d). Yêu cầu thí sinh phải chọn ĐÚNG hoặc SAI đối với TỪNG ý phát biểu đó (Không phải chỉ chọn 1 mệnh đề).
       - Phần III: Trắc nghiệm trả lời ngắn (2 điểm). Thường gồm khoảng 6-8 câu hỏi. Học sinh chỉ ghi đáp án cuối cùng. (Lưu ý: Nếu môn học không có dạng bài trả lời ngắn, hãy chuyển số điểm này sang Phần II bằng cách tăng số lượng câu Đúng - Sai).
    3. Cấu trúc Tự luận (3 điểm):
       - Các câu hỏi yêu cầu lập luận, trình bày hoặc giải quyết vấn đề thực tế (thường 2-3 câu).
    4. Mức độ nhận thức (Tỉ lệ điểm):
       - 40% Nhận biết (4.0 điểm).
       - 30% Thông hiểu (3.0 điểm).
       - 30% Vận dụng (3.0 điểm).
       LƯU Ý CỰC KỲ QUAN TRỌNG: Hãy cẩn thận trong việc phân bổ số câu cho từng mức độ để TỔNG ĐIỂM của mỗi mức độ bằng đúng tỉ lệ quy định.
    5. MA TRẬN ĐỀ KIỂM TRA (FORMAT MARKDOWN TABLE PHẲNG):
       - Bảng ma trận PHẢI là bảng Markdown phẳng, KHÔNG dùng sub-columns.
       - Cấu trúc cột đề xuất: Chủ đề | Nội dung kiến thức | Nhận biết (40%) | Thông hiểu (30%) | Vận dụng (30%) | Tổng số câu | Tổng điểm
       - TRONG MỖI Ô mức độ, ghi GỌN dạng "SốTN/SốTL" (VD: "2/0" = 2 câu TN 0 câu TL; "1/1" = 1 TN 1 TL).
       - Dòng sub-header dưới tên cột mức độ ghi: TN/TL (để GV hiểu ký hiệu).
       - TUYỆT ĐỐI KHÔNG dùng ký tự backslash trong cell bảng.
       - TUYỆT ĐỐI KHÔNG tạo sub-columns TN và TL riêng biệt.
       - Hàng Tổng cuối bảng: tổng số câu TN/TL, tổng điểm.
       - Hàng Tỉ lệ điểm: ghi "X điểm (Y%)" cho mỗi cột mức độ.
    6. BẢN ĐẶC TẢ CHI TIẾT:
       - Liệt kê các nội dung kiến thức, tiếp đến là Yêu cầu cần đạt. Cụ thể hóa số lượng câu hỏi ở mức Nhận biết, Thông hiểu, Vận dụng.
    `;
    } else if (input.matrixType === 'TN100') {
        structStr = "100% Trắc nghiệm";
    } else if (input.matrixType === 'TL100') {
        structStr = "100% Tự luận";
    } else if (input.matrixType === 'MIX73') {
        structStr = "70% Trắc nghiệm (7 điểm) - 30% Tự luận (3 điểm)";
    } else if (input.matrixType === 'MIX55') {
        structStr = "50% Trắc nghiệm (5 điểm) - 50% Tự luận (5 điểm)";
    } else if (input.matrixType === 'MIX37') {
        structStr = "30% Trắc nghiệm (3 điểm) - 70% Tự luận (7 điểm)";
    } else if (input.matrixType === 'CUSTOM') {
        const tn = input.tnPercent || 50;
        const tl = input.tlPercent || 50;
        const tnDiem = (tn / 10).toFixed(1);
        const tlDiem = (tl / 10).toFixed(1);
        if (tn === 0) structStr = "100% Tự luận";
        else if (tl === 0) structStr = "100% Trắc nghiệm";
        else structStr = `${tn}% Trắc nghiệm (${tnDiem} điểm) - ${tl}% Tự luận (${tlDiem} điểm)`;
    } else {
        structStr = "Kết hợp Trắc nghiệm & Tự luận";
    }

    // Inject TN types vào prompt (cho tất cả trừ CV7991 đã có rules riêng và TL100)
    if (input.matrixType !== 'CV7991' && input.matrixType !== 'TL100' && input.tnTypes && input.tnTypes.length > 0) {
        tnTypesRules = `
    CÁC DẠNG TRẮC NGHIỆM CẦN SỬ DỤNG TRONG ĐỀ (BẮT BUỘC):
       - ${describeTnTypes(input.tnTypes)}
    Phải phân bổ số câu hợp lý giữa các dạng trắc nghiệm trên. Chia đề thành các Phần riêng biệt cho từng dạng.
    `;
    }

    const promptText = `
    Đóng vai chuyên gia ra đề thi cấp Quốc gia. Hãy xây dựng bộ đề kiểm tra ${input.subject} - ${input.grade} chất lượng cao.
    
    THÔNG TIN ĐỀ THI:
    - Nội dung: ${input.topic}
    - Thời gian: ${input.duration}
    - Cấu trúc: ${structStr}
    - Mức độ: ${diffStr}
    - Yêu cầu thêm: ${input.context}

    ${cv7991Rules}
    ${tnTypesRules}

    ${VIETNAMESE_MATH_RULES}
    ${STRICT_QA_PROTOCOL}

    YÊU CẦU OUTPUT:
    1. **Ma trận & Đặc tả**: Trình bày dạng Bảng Markdown chi tiết theo chuẩn chuyên môn. (Nếu là CV7991, phải sử dụng đúng định dạng bảng đặc yêu cầu).
       ===== QUY TẮC BẮT BUỘC CHO MỌI BẢNG MARKDOWN =====
       - RULE 1: Bảng PHẢI phẳng (flat). Mỗi dòng có CÙNG SỐ CỘT với header. TUYỆT ĐỐI KHÔNG tạo sub-columns.
       - RULE 2: TUYỆT ĐỐI KHÔNG dùng ký tự dấu sổ dọc (|) BÊN TRONG nội dung ô. Dấu | chỉ dùng để PHÂN CÁCH các cột.
       - RULE 3: Nếu muốn liệt kê nhiều thông tin trong 1 ô, dùng <br> để ngắt dòng, KHÔNG dùng dấu |.
       - RULE 4: KHÔNG dùng ký tự backslash (\) trong cell bảng.
       - RULE 5: Trong ô Số câu hỏi, ghi gọn "SốTN/SốTL" (VD: "3/2" = 3 TN 2 TL) HOẶC ghi "3 câu TN<br>2 câu TL".
       - RULE 6: Cấu trúc Ma trận mẫu: | TT | Chủ đề | Nội dung kiến thức | Nhận biết | Thông hiểu | Vận dụng | Tổng |
       - RULE 7: Cấu trúc Đặc tả mẫu: | STT | Chủ đề | Mức độ kiến thức cần kiểm tra | Số câu TN | Số câu TL |
       - VÍ DỤ ĐÚNG: | 1 | Tập hợp | Nhận biết tập hợp | 3/1 | 2/0 | 1/1 | 6/2 |
       - VÍ DỤ SAI (CẤM): | 1 | Tập hợp | Nhận biết | TN | TL | ← CẤM tạo sub-columns TN TL riêng!
       ===============================================
    2. **Đề thi**: Đề thi được chia rõ các PHẦN theo cấu trúc yêu cầu. Các câu hỏi phải rõ ràng, chính xác, không đánh đố vô lý.
    3. **Đáp án**: Trình bày rõ đáp án của Phần Trắc nghiệm, và đưa ra Thang điểm + Tiêu chí chấm chi tiết cho Phần Tự luận.
    
    LƯU Ý: Tuyệt đối CẤM cắt xén giữa chừng. Hãy xuất Markdown thật gọn gàng, chia phần bằng tiêu đề cấp 2 (##) hoặc cấp 3 (###).
    
    YÊU CẦU VỀ HÌNH VẼ / BIỂU ĐỒ TRONG ĐỀ THI:
    - AI KHÔNG ĐƯỢC lạm dụng tính năng vẽ ảnh tĩnh (\`[HÌNH_X]\`) cho Biểu đồ (Cột, Tròn, Đường...) hay Hình Hình học (Tam giác, Khối chóp...). Vì ảnh tĩnh khiến giáo viên không thể chỉnh sửa số liệu trên MS Word.
    - THAY VÀO ĐÓ, BẮT BUỘC:
       1. **Biểu đồ/Thống kê**: Phải trình bày bằng một **Bảng dữ liệu Markdown** (Markdown Table). Giáo viên sẽ dễ dàng sao chép bảng này để dùng công cụ "Insert > Chart" trong Word. Bảng dữ liệu phải rõ ràng, chia cột chuẩn xác.
       2. **Hình Hình học**: Cung cấp đề bài với dữ kiện độ dài, góc, vị trí thật chặt chẽ (VD: "Cho $\\\\Delta ABC$ vuông tại $A$, $AB=3$cm..."). Để nguyên không gian để giáo viên dùng công cụ "Shapes" của Word vẽ tay, CẤM đưa \`[HÌNH_X]\` vào câu hình học.
    - CHỈ SỬ DỤNG \`[HÌNH_X]\` cùng mảng \`imageDescriptions\` cho các dạng tranh minh họa phong cảnh, sự vật, hiện tượng vật lý / hóa học phức tạp bắt buộc phải có ảnh. Mảng \`imageDescriptions\` gồm: \`[{ "placeholderId": "[HÌNH_1]", "description": "Mô tả bức ảnh phong cảnh thật chi tiết..." }]\`.

    HÃY TRẢ VỀ JSON:
    - title: Tên đề thi (Vd: Đề kiểm tra Toán 9 - Chương I)
    - matrixMarkdown: Nội dung Ma trận và Bản đặc tả học vấn
    - examMarkdown: Nội dung Đề thi
    - answerMarkdown: Nội dung Đáp án và Hướng dẫn chấm
    - imageDescriptions: Mảng chứa các yêu cầu vẽ hình. [{ "placeholderId": "[HÌNH_1]", "description": "Mô tả thật chi tiết bức ảnh..." }]
    `;

    const schema = {
        type: Type.OBJECT,
        properties: {
            title: { type: Type.STRING },
            matrixMarkdown: { type: Type.STRING },
            examMarkdown: { type: Type.STRING },
            answerMarkdown: { type: Type.STRING },
            imageDescriptions: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        placeholderId: { type: Type.STRING },
                        description: { type: Type.STRING }
                    },
                    required: ["placeholderId", "description"]
                }
            }
        },
        required: ["title", "matrixMarkdown", "examMarkdown", "answerMarkdown"]
    };

    try {
        const text = await callAIWithFallback({
            prompt: promptText,
            jsonMode: true,
            schema,
            model: 'gemini-3-flash-preview',
            updateLoadingText,
        });
        if (!text) return null;
        let parsed = parseJSONSafe(text);
        if (!parsed) return null;

        // Xử lý tạo hình ảnh bằng AI nếu có yêu cầu HÌNH_X
        if (parsed.imageDescriptions && parsed.imageDescriptions.length > 0) {
            const generatedImages: { placeholderId: string; base64: string; }[] = [];
            
            // Limit to 5 images to prevent rate limit or excessive waiting
            const imagesToGenerate = parsed.imageDescriptions.slice(0, 5);
            
            await Promise.all(imagesToGenerate.map(async (imgDesc: any) => {
                try {
                    const base64 = await generateSingleImage(imgDesc.description);
                    if (base64) {
                        generatedImages.push({
                            placeholderId: imgDesc.placeholderId,
                            base64: base64
                        });
                    }
                } catch(e) {
                    console.error("Failed to generate custom image for exam:", e);
                }
            }));
            
            parsed.generatedImages = generatedImages;
        }

        return parsed;
    } catch (error) {
        console.error("Exam Generation Error:", error);
        throw error;
    }
};



export const regenerateExamFromPdf = async (pageImages: string[], isFirstChunk: boolean = true): Promise<ExamResponse | null> => {
    ensureAIAvailable();

    const firstChunkRules = `
    2. **Đầu trang (Header)**: Nếu đây là trang đầu tiên, hãy trích xuất thông tin tiêu đề.
       - Góc trái (topLeft): Thường là Cơ quan chủ quản (Phòng GD, Sở GD, UBND...), Tên trường/đơn vị. Trả về mảng các dòng chữ.
       - Góc phải (topRight): Tên kỳ thi/văn bản, Môn thi (nếu có), Năm học/Ngày tháng, Thời gian. Trả về mảng các dòng chữ.
       - Kiểm tra xem có khung "ĐỀ CHÍNH THỨC" hay tương tự không (isOfficial).
    3. **Nội dung (examMarkdown)**: Chuyển thành Markdown. Giữ nguyên cấu trúc. **QUAN TRỌNG: examMarkdown chỉ chứa NỘI DUNG CHÍNH, bắt đầu sau phần tiêu đề. TUYỆT ĐỐI KHÔNG lặp lại tên cơ quan, tên kỳ thi, ngày tháng (đã có trong headerData). KHÔNG bắt đầu examMarkdown bằng tiêu đề.**`;

    const subsequentChunkRules = `
    2. **ĐÂY LÀ PHẦN TIẾP THEO CỦA TÀI LIỆU** — Các trang này nối tiếp từ phần trước. TUYỆT ĐỐI:
       - KHÔNG tạo headerData (để null).
       - KHÔNG tạo title mới. Để title là chuỗi rỗng "".
       - CHỈ trả về examMarkdown và answerMarkdown tiếp nối phần trước.
       - BẮT BUỘC phải có nội dung trong examMarkdown - đọc TOÀN BỘ chữ trong ảnh.
    3. **Nội dung (examMarkdown)**: Tiếp tục chuyển nội dung sang Markdown. Giữ nguyên cấu trúc. Bắt đầu ngay từ nội dung, KHÔNG thêm bất kỳ tiêu đề/header nào.`;

    const promptText = `
    ĐÓNG VAI: Chuyên gia số hóa tài liệu.
    NHIỆM VỤ: Phân tích hình ảnh tài liệu (đề thi, văn bản, công văn, báo cáo, hoặc bất kỳ loại tài liệu nào) và chuyển thể sang Markdown chính xác tuyệt đối.
    
    QUY TẮC QUAN TRỌNG:
    1. **Giữ nguyên 100% nội dung**: Sao chép lại toàn bộ nội dung văn bản trong ảnh. Không được bỏ sót bất kỳ đoạn nào. Không tự ý sửa đổi trừ khi đó là lỗi chính tả rõ ràng.
    ${isFirstChunk ? firstChunkRules : subsequentChunkRules}
    4. **Hình ảnh**: Thay thế các hình vẽ/đồ thị/logo bằng placeholder \`[HÌNH_X]\` (X là số thứ tự 1, 2...).
    5. **Bảng biểu & Đáp án**: Đối với bảng biểu, hướng dẫn chấm hoặc đáp án, BẮT BUỘC phải giữ nguyên tối đa cấu trúc bảng. Trình bày bằng Bảng Markdown (Markdown Table). Không được gộp các cột vào nhau. ĐẶC BIỆT CHÚ Ý: Bạn đang xử lý cắt lát trang (chunking), nên nếu đầu trang là phần tiếp nối của một bảng từ trang trước, bạn BẮT BUỘC phải tạo lại Header bảng Markdown ở ngay dòng đầu tiên để bảng không bị lỗi. Dùng thẻ HTML <br> để ngắt dòng bên trong ô, tuyệt đối không bấm enter bị gãy dòng của bảng Markdown.
    6. **Nội dung dài**: BẮT BUỘC trích xuất TOÀN BỘ nội dung trong ảnh, dù dài đến đâu. TUYỆT ĐỐI KHÔNG được tóm tắt, rút gọn hay bỏ sót phần nào. Mỗi đoạn văn, mỗi gạch đầu dòng, mỗi câu chữ đều phải được sao chép lại.
    
    ${VIETNAMESE_MATH_RULES}
    ${STRICT_QA_PROTOCOL}

    OUTPUT JSON:
    - headerData: { topLeft: string[], topRight: string[], isOfficial: boolean } (${isFirstChunk ? 'Chỉ trả về nếu tìm thấy header hợp lệ ở trang 1, nếu không thì để null' : 'Luôn để null vì đây là chunk tiếp theo'})
    - title: ${isFirstChunk ? 'Tiêu đề tài liệu (dùng làm tên file)' : 'Để chuỗi rỗng "" vì đây là chunk tiếp theo'}
    - examMarkdown: Toàn bộ nội dung tài liệu ${isFirstChunk ? '(bắt đầu từ sau phần header)' : '(tiếp nối phần trước)'}. BẮT BUỘC PHẢI CÓ NỘI DUNG - không được để trống.
    - answerMarkdown: Đáp án (nếu có trong ảnh, nếu không thì để chuỗi rỗng)
    `;

    const schema = {
        type: Type.OBJECT,
        properties: {
            headerData: {
                type: Type.OBJECT,
                properties: {
                    topLeft: { type: Type.ARRAY, items: { type: Type.STRING } },
                    topRight: { type: Type.ARRAY, items: { type: Type.STRING } },
                    isOfficial: { type: Type.BOOLEAN }
                },
                nullable: true
            },
            title: { type: Type.STRING },
            examMarkdown: { type: Type.STRING },
            answerMarkdown: { type: Type.STRING }
        },
        required: ["title", "examMarkdown"]
    };

    try {
        const images = pageImages.map(img => ({ base64: img, mimeType: 'image/png' }));

        let text = await callAIWithFallback({
            prompt: promptText,
            jsonMode: true,
            schema: schema,
            model: 'gemini-3-flash-preview',
            images: images,
        });
        
        if (!text) {
            console.error("regenerateExamFromPdf: AI trả về response rỗng (no text)");
            throw new Error('AI trả về kết quả rỗng. Vui lòng thử lại.');
        }
        
        let parsed = parseJSONSafe(text);
        if (!parsed) {
            console.error("regenerateExamFromPdf: Không parse được JSON. Raw (500 chars):", text.substring(0, 500));
            throw new Error('AI trả về dữ liệu không hợp lệ (không phải JSON). Vui lòng thử lại.');
        }
        
        // Nếu examMarkdown rỗng → có thể do model không phù hợp (VD: Claude Opus thinking)
        // Chiến lược retry: 1) Thử model Gemini trên 9Router, 2) Thử Gemini native API
        if (!parsed.examMarkdown || parsed.examMarkdown.trim() === '') {
            const currentModel = get9RouterModel();
            console.warn(`regenerateExamFromPdf: examMarkdown rỗng từ model [${currentModel}]. Đang retry...`);
            
            let retrySuccess = false;
            
            // Retry 1: Tìm model Gemini trên 9Router và thử
            if (is9RouterAvailable()) {
                const geminiModels = get9RouterModels().filter(m => 
                    m.toLowerCase().includes('gemini') && m !== currentModel
                );
                
                for (const retryModel of geminiModels) {
                    console.log(`[Retry] Thử model 9Router: ${retryModel}...`);
                    try {
                        const retryText = await call9Router({
                            prompt: promptText,
                            jsonMode: true,
                            images: images,
                            _modelOverride: retryModel,
                        });
                        
                        if (retryText) {
                            const retryParsed = parseJSONSafe(retryText);
                            if (retryParsed && retryParsed.examMarkdown && retryParsed.examMarkdown.trim() !== '') {
                                parsed = retryParsed;
                                console.log(`[Retry] Thành công với model ${retryModel}!`);
                                _notifyAISource('9router', `Auto-retry từ ${currentModel}`, retryModel);
                                retrySuccess = true;
                                break;
                            }
                        }
                    } catch (retryErr: any) {
                        const retryErrMsg = retryErr?.message || String(retryErr);
                        console.warn(`[Retry] Model ${retryModel} cũng lỗi:`, retryErrMsg);
                        // Nếu model trả 404 (không tồn tại) → đánh dấu exhausted để không retry lại
                        if (retryErrMsg.includes('404') || retryErrMsg.includes('NOT_FOUND')) {
                            _routerConfig._exhaustedModels.add(retryModel);
                            console.log(`[Retry] Model ${retryModel} không tồn tại (404), đã loại khỏi danh sách retry`);
                        }
                    }
                }
            }
            
            // Retry 2: Gemini native API (nếu có key)
            if (!retrySuccess) {
                const apiKey = getGeminiApiKey();
                if (apiKey) {
                    console.log('[Retry] Thử Gemini native API...');
                    try {
                        const ai = new GoogleGenAI({ apiKey });
                        const parts: any[] = [{ text: promptText }];
                        pageImages.forEach(img => parts.push({ inlineData: { mimeType: 'image/png', data: img } }));
                        
                        const retryResponse = await ai.models.generateContent({
                            model: 'gemini-3-flash-preview',
                            contents: { parts },
                            config: { responseMimeType: "application/json", responseSchema: schema }
                        });
                        
                        const retryText = retryResponse.text;
                        if (retryText) {
                            const retryParsed = parseJSONSafe(retryText);
                            if (retryParsed && retryParsed.examMarkdown && retryParsed.examMarkdown.trim() !== '') {
                                parsed = retryParsed;
                                console.log('[Retry] Gemini native thành công!');
                                _notifyAISource('gemini', `Model ${currentModel} trả kết quả rỗng`);
                                retrySuccess = true;
                            }
                        }
                    } catch (geminiErr) {
                        console.warn('[Retry] Gemini native cũng lỗi:', geminiErr);
                    }
                }
            }
            
            // Nếu vẫn rỗng sau tất cả retry
            if (!retrySuccess) {
                throw new Error(`Model ${currentModel} không hỗ trợ đọc ảnh đề thi. Vui lòng chọn model Gemini và thử lại.`);
            }
        }

        return {
            title: parsed.title || "",
            examMarkdown: parsed.examMarkdown,
            answerMarkdown: parsed.answerMarkdown || "",
            matrixMarkdown: "",
            headerData: parsed.headerData || undefined
        };
    } catch (error) {
        console.error("Regenerate Exam Error:", error);
        throw error;
    }
};

export const generateSimilarExercisesFromDocx = async (docxText: string, count: number, context: string = ""): Promise<SimilarExercise[] | null> => {
    ensureAIAvailable();

    const promptText = `
    ĐÓNG VAI: Chuyên gia ra đề thi cấp Quốc gia.
    NHIỆM VỤ: Phân tích bài tập trong mã nguồn (Word text) sau đây và tạo ra **${count}** bài tập mới TƯƠNG TỰ (về dạng bài, độ khó) nhưng khác biệt về ngữ cảnh và số liệu.
    
    YÊU CẦU PHỤ ĐẶC BIỆT TỪ GIÁO VIÊN: ${context || 'Không có yêu cầu phụ đặc biệt.'}

    QUAN TRỌNG NHẤT:
    1. **Giữ nguyên dạng toán**: Bài tập mới phải dùng cùng phương pháp giải.
    2. **THAY SỐ LIỆU THÔNG MINH**: Áp dụng triệt để quy tắc **MATH_BEAUTY_RULES** dưới đây. Không random số ba bừa. Nghiệm phải đẹp.
    3. **QUY TẮC CỨNG VỚI HÌNH VẼ**: BỎ QUA HOÀN TOÀN các câu hỏi/bài tập có chứa đồ thị, hình học, hoặc các placeholder liên quan đến hình vẽ. Không tạo bài tập tương tự cho các câu này vì hệ thống không thể chèn ảnh gốc sang bài tập mới. Chỉ nhân bản các bài toán không cần hình vẽ minh họa.
    
    ${MATH_BEAUTY_RULES}
    ${VIETNAMESE_MATH_RULES}
    ${STRICT_QA_PROTOCOL}

    --- ĐỀ BÀI ---
    ${docxText}

    OUTPUT JSON:
    - exercises: Mảng các bài tập mới. Mỗi bài gồm:
        - problemMarkdown: Đề bài (dùng LaTeX chuẩn cho công thức).
        - solutionMarkdown: Lời giải chi tiết (bắt buộc phải giải ra số đẹp theo số liệu mới).
    `;

    const schema = {
        type: Type.OBJECT,
        properties: {
            exercises: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        problemMarkdown: { type: Type.STRING },
                        solutionMarkdown: { type: Type.STRING }
                    },
                    required: ["problemMarkdown", "solutionMarkdown"]
                }
            }
        },
        required: ["exercises"]
    };

    try {
        const text = await callAIWithFallback({
            prompt: promptText,
            jsonMode: true,
            schema: schema,
            model: 'gemini-3-flash-preview',
        });
        
        if (!text) return null;
        const parsed = parseJSONSafe(text);
        if (!parsed) return null;

        return parsed.exercises;
    } catch (error) {
        console.error("Generate Similar Docx Exercises Error:", error);
        throw error;
    }
};

export const generateSimilarExercisesFromPdf = async (pageImages: string[], count: number, context: string = ""): Promise<SimilarExercise[] | null> => {
    ensureAIAvailable();

    const promptText = `
    ĐÓNG VAI: Chuyên gia ra đề thi cấp Quốc gia.
    NHIỆM VỤ: Phân tích bài tập trong ảnh và tạo ra **${count}** bài tập mới TƯƠNG TỰ (về dạng bài, độ khó) nhưng khác số liệu.
    
    YÊU CẦU PHỤ ĐẶC BIỆT TỪ GIÁO VIÊN: ${context || 'Không có yêu cầu phụ đặc biệt.'}

    QUAN TRỌNG NHẤT:
    1. **Giữ nguyên dạng toán**: Bài tập mới phải dùng cùng phương pháp giải.
    2. **THAY SỐ LIỆU THÔNG MINH**: Áp dụng triệt để quy tắc **MATH_BEAUTY_RULES** dưới đây. Không random số ba bừa.
    3. **QUY TẮC CỨNG VỚI HÌNH VẼ**: BỎ QUA HOÀN TOÀN các câu hỏi/bài tập có chứa đồ thị, hình học, hoặc các placeholder liên quan đến hình vẽ. Không tạo bài tập tương tự cho các câu này vì hệ thống không thể chèn ảnh gốc sang bài tập mới. Chỉ nhân bản các bài toán không cần hình vẽ minh họa.
    
    ${MATH_BEAUTY_RULES}
    ${VIETNAMESE_MATH_RULES}
    ${STRICT_QA_PROTOCOL}

    OUTPUT JSON:
    - exercises: Mảng các bài tập mới. Mỗi bài gồm:
        - problemMarkdown: Đề bài (dùng LaTeX chuẩn cho công thức).
        - solutionMarkdown: Lời giải chi tiết (bắt buộc phải giải ra số đẹp theo số liệu mới).
    `;

    const schema = {
        type: Type.OBJECT,
        properties: {
            exercises: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        problemMarkdown: { type: Type.STRING },
                        solutionMarkdown: { type: Type.STRING }
                    },
                    required: ["problemMarkdown", "solutionMarkdown"]
                }
            }
        },
        required: ["exercises"]
    };

    try {
        const images = pageImages.map(img => ({ base64: img, mimeType: 'image/png' }));
        const text = await callAIWithFallback({
            prompt: promptText,
            jsonMode: true,
            schema: schema,
            model: 'gemini-3-flash-preview',
            images: images,
        });
        
        if (!text) return null;
        const parsed = parseJSONSafe(text);
        return parsed?.exercises || null;
    } catch (error) {
        console.error("Generate Similar Exercises Error:", error);
        throw error;
    }
};

export const generateOutlineFromDocx = async (docxText: string): Promise<ReviewOutlineGroup[] | null> => {
    ensureAIAvailable();

    const promptText = `
    ĐÓNG VAI: Chuyên gia biên soạn đề cương ôn tập.
    NHIỆM VỤ: Phân tích toàn bộ đề thi được trích xuất từ file Word gốc dưới dạng HTML sau đây. VỚI MỖI CÂU HỎI TRONG ĐỀ THI GỐC, hãy phân tích và tạo ra MỘT CHỦ ĐỀ ÔN TẬP. VỚI MỖI CHỦ ĐỀ, TẠO MỘT GROUP BAO GỒM:
    1. Tên chủ đề/Dạng toán (Rút ra từ câu hỏi gốc).
    2. Tóm tắt phương pháp giải ngắn gọn (2-3 dòng).
    3. Trích xuất lại đề bài gốc.
    4. 3 bài tập tương tự, cùng dạng với câu gốc nhưng khác số liệu. (THAY SỐ LIỆU THEO QUY TẮC MATH_BEAUTY_RULES để nghiệm đẹp, số liệu khoa học hợp lý).

    QUAN TRỌNG NHẤT:
    1. **Bám sát đề thi**: Mỗi câu hỏi trong đề gốc phải tương ứng với 1 chủ đề ôn tập.
    2. **THAY SỐ LIỆU THÔNG MINH**: Áp dụng triệt để quy tắc **MATH_BEAUTY_RULES** dưới đây. Không random số ba bừa. Nghiệm phải đẹp.
    3. **QUY TẮC BẤT DI BẤT DỊCH VỚI HÌNH VẼ**: BỎ QUA HOÀN TOÀN các câu hỏi/bài tập có chứa đồ thị, hình học, hoặc được chèn placeholder \`[HÌNH_X]\`. KHÔNG tạo ra Chủ đề ôn tập tương tự cho các câu này vì hệ thống không thể chèn lại ảnh gốc một cách logic sang bài tập mới. Chỉ nhân bản các bài toán NGÔN NGỮ/ĐẠI SỐ KIỂU VĂN BẢN không cần hình vẽ minh họa.
    
    ${MATH_BEAUTY_RULES}
    ${VIETNAMESE_MATH_RULES}
    ${STRICT_QA_PROTOCOL}

    --- ĐỀ WORD GỐC (ĐỊNH DẠNG HTML) ---
    ${docxText}
    
    Hãy phân tích cẩn thận các thẻ HTML để hiểu được nội dung đề gốc.

    OUTPUT JSON:
    - outline: Mảng các chủ đề ôn tập. Mỗi chủ đề bao gồm:
      - topicTitle: Tên dạng bài/chủ đề ôn tập.
      - method: Tóm tắt phương pháp giải (dạng Markdown).
      - originalQuestionMarkdown: Đề bài gốc (tuyệt đối giữ đúng HTML/Markdown, in đậm in nghiêng).
      - similarExercises: Mảng định lượng đúng 3 bài tập mới tương tự. Mỗi bài gồm:
        - problemMarkdown: Đề bài.
        - solutionMarkdown: Lời giải chi tiết (bắt buộc phải giải ra số đẹp theo số liệu mới).
    `;

    const schema = {
        type: Type.OBJECT,
        properties: {
            outline: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        topicTitle: { type: Type.STRING },
                        method: { type: Type.STRING },
                        originalQuestionMarkdown: { type: Type.STRING },
                        similarExercises: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    problemMarkdown: { type: Type.STRING },
                                    solutionMarkdown: { type: Type.STRING }
                                },
                                required: ["problemMarkdown", "solutionMarkdown"]
                            }
                        }
                    },
                    required: ["topicTitle", "method", "originalQuestionMarkdown", "similarExercises"]
                }
            }
        },
        required: ["outline"]
    };

    try {
        const text = await callAIWithFallback({
            prompt: promptText,
            jsonMode: true,
            schema: schema,
            model: 'gemini-3-flash-preview',
        });
        
        if (!text) return null;
        const parsed = parseJSONSafe(text);
        if (!parsed) return null;

        return parsed.outline;
    } catch (error) {
        console.error("Generate Outline From Docx Error:", error);
        throw error;
    }
};

export const generateOutlineFromPdf = async (pageImages: string[]): Promise<ReviewOutlineGroup[] | null> => {
    ensureAIAvailable();

    const promptText = `
    ĐÓNG VAI: Chuyên gia biên soạn đề cương ôn tập.
    NHIỆM VỤ: Phân tích toàn bộ đề thi được chụp từ ảnh sau đây. VỚI MỖI CÂU HỎI TRONG ĐỀ THI GỐC, hãy phân tích và tạo ra MỘT CHỦ ĐỀ ÔN TẬP. VỚI MỖI CHỦ ĐỀ, TẠO MỘT GROUP BAO GỒM:
    1. Tên chủ đề/Dạng toán (Rút ra từ câu hỏi gốc).
    2. Tóm tắt phương pháp giải ngắn gọn (2-3 dòng).
    3. Trích xuất lại đề bài gốc.
    4. 3 bài tập tương tự, cùng dạng với câu gốc nhưng khác số liệu. (THAY SỐ LIỆU THEO QUY TẮC MATH_BEAUTY_RULES để nghiệm đẹp, số liệu khoa học hợp lý).

    QUAN TRỌNG NHẤT:
    1. **Bám sát đề thi**: Mỗi câu hỏi trong đề gốc (bị giới hạn trong ảnh) phải tương ứng với 1 chủ đề ôn tập.
    2. **THAY SỐ LIỆU THÔNG MINH**: Áp dụng triệt để quy tắc **MATH_BEAUTY_RULES** dưới đây. Không random số ba bừa. Nghiệm phải đẹp.
    3. **QUY TẮC BẤT DI BẤT DỊCH VỚI HÌNH VẼ**: BỎ QUA HOÀN TOÀN các câu hỏi/bài tập có chứa đồ thị, bảng biến thiên, hình học. KHÔNG tạo ra Chủ đề ôn tập tương tự cho các câu này vì hệ thống không thể chèn lại ảnh tĩnh sang đề thi mới. Chỉ nhân bản các bài toán NGÔN NGỮ/ĐẠI SỐ KIỂU VĂN BẢN không cần có hình minh họa.
    
    ${MATH_BEAUTY_RULES}
    ${VIETNAMESE_MATH_RULES}
    ${STRICT_QA_PROTOCOL}

    OUTPUT JSON:
    - outline: Mảng các chủ đề ôn tập. Mỗi chủ đề bao gồm:
      - topicTitle: Tên dạng bài/chủ đề ôn tập.
      - method: Tóm tắt phương pháp giải (dạng Markdown).
      - originalQuestionMarkdown: Đề bài gốc (tuyệt đối giữ đúng HTML/Markdown, in đậm in nghiêng).
      - similarExercises: Mảng định lượng đúng 3 bài tập mới tương tự. Mỗi bài gồm:
        - problemMarkdown: Đề bài.
        - solutionMarkdown: Lời giải chi tiết (bắt buộc phải giải ra số đẹp theo số liệu mới).
    `;

    const schema = {
        type: Type.OBJECT,
        properties: {
            outline: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        topicTitle: { type: Type.STRING },
                        method: { type: Type.STRING },
                        originalQuestionMarkdown: { type: Type.STRING },
                        similarExercises: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    problemMarkdown: { type: Type.STRING },
                                    solutionMarkdown: { type: Type.STRING }
                                },
                                required: ["problemMarkdown", "solutionMarkdown"]
                            }
                        }
                    },
                    required: ["topicTitle", "method", "originalQuestionMarkdown", "similarExercises"]
                }
            }
        },
        required: ["outline"]
    };

    try {
        const images = pageImages.map(img => ({ base64: img, mimeType: 'image/png' }));
        const text = await callAIWithFallback({
            prompt: promptText,
            jsonMode: true,
            schema: schema,
            model: 'gemini-3-flash-preview',
            images: images,
        });
        
        if (!text) return null;
        const parsed = parseJSONSafe(text);
        return parsed?.outline || null;
    } catch (error) {
        console.error("Generate Outline From PDF Error:", error);
        throw error;
    }
};

export const generateSimilarExamFromDocx = async (docxText: string, seed: number, updateLoadingText: (text: string) => void, context: string = ""): Promise<ExamResponse | null> => {
    ensureAIAvailable();

    const promptText = `
    ĐÓNG VAI: Chuyên gia ra đề thi cấp Quốc gia.
    NHIỆM VỤ: Phân tích nội dung đề thi được trích xuất từ file Word gốc dưới dạng HTML, sau đó thực hiện TẠO ĐỀ TƯƠNG TỰ VÀ LÀM MỚI:
    1. **Với câu Trắc nghiệm**: Trộn (đảo) ngẫu nhiên vị trí các câu hỏi trắc nghiệm và đảo ngẫu nhiên vị trí các đáp án A, B, C, D bên trong. Giữ nguyên hoàn toàn nội dung và dữ kiện.
    2. **Với câu Tự luận**: KHÔNG ĐẢO THỨ TỰ câu hỏi. CHỈ ĐƯỢC THAY ĐỔI DỮ KIỆN, SỐ LIỆU nhưng vẫn đảm bảo dạng toán, phương pháp giải và độ khó tương đương đề cũ. Đảm bảo cấu trúc khoa học, logic.
    3. **QUY TẮC BẤT DI BẤT DỊCH VỚI HÌNH VẼ**: Với CÁC CÂU HỎĨ (TRẮC NGHIỆM HOẶC TỰ LUẬN) CÓ CHỨA HÌNH VẼ HOẶC ĐƯỢC CHÈN PLACEHOLDER \`[HÌNH_X]\` (Đồ thị, Bảng biến thiên, Hình dạng hình học): BẠN **TUYỆT ĐỐI KHÔNG ĐƯỢC THAY ĐỔI** BẤT KỲ SỐ LIỆU, DỮ KIỆN HAY NỘI DUNG NÀO CỦA CÂU HỎĨ ĐÓ. Bắt buộc phải sao chép lại y nguyên 100% câu hỏi và đáp án để đảm bảo hình vẽ cũ vẫn khớp. Mọi sự thay đổi số liệu/nội dung chỉ được phép thực hiện trên các câu hỏi KHÔNG chứa hình vẽ/đồ thị.
    4. **Hình thức trình bày**: BẮT BUỘC giữ nguyên toàn bộ định dạng gốc của đề, bao gồm in đậm (**text**), in nghiêng (*text*), khung/bảng biểu (Markdown table), các dấu chấm lửng (.....) hay khoảng trống để học sinh làm bài trực tiếp vào đề. Đánh lại số thứ tự câu hỏi trắc nghiệm cho liền mạch. BẢO TOÀN định dạng thật chuẩn xác. Tuyệt đối không làm mất khung bảng hay các định dạng in đậm/nghiêng của đề gốc.
    
    YÊU CẦU PHỤ ĐẶC BIỆT TỪ GIÁO VIÊN: ${context || 'Không có yêu cầu phụ đặc biệt.'}

    5. Trả về "examMarkdown" nội dung đề thi hoàn chỉnh.
    6. Tạo bảng kiểm dạ chi tiết cho "answerMarkdown". Với trắc nghiệm, cập nhật chuẩn xác theo vị trí cấu trúc đáp án đã được đảo. Với tự luận, BẮT BUỘC phải giải chi tiết lại theo CÁC SỐ LIỆU MỚI đã được thay đổi.
    
    YÊU CẦU ĐA DẠNG HÓA & CHỐNG TRÙNG LẶP:
    Dựa vào mã SEED=${seed}, tạo ra biến thể khác biệt so với các lần tạo trước.
    
    ${MATH_BEAUTY_RULES}
    ${VIETNAMESE_MATH_RULES}
    ${STRICT_QA_PROTOCOL}

    --- ĐỀ WORD GỐC (ĐỊNH DẠNG HTML) ---
    ${docxText}
    
    Hãy phân tích cẩn thận các thẻ HTML (như <b>, <i>, <table>, <tr>, <td>...) và chuyển đổi chúng thành các định dạng Markdown tương ứng (**bold**, *italics*, Markdown Tables) thật chuẩn xác. Tuyệt đối không làm mất khung bảng hay các định dạng in đậm/nghiêng của đề gốc.

    OUTPUT JSON:
    - title: Trích xuất và GIỮ NGUYÊN tiêu đề của đề gốc (Tuyệt đối không tự bịa hay thêm chữ "Mới...").
    - examMarkdown: Nội dung đề mi.
    - answerMarkdown: Hướng dẫn chấm chi tiết, tương ứng với đề mới.
    `;

    const schema = {
        type: Type.OBJECT,
        properties: {
            title: { type: Type.STRING },
            examMarkdown: { type: Type.STRING },
            answerMarkdown: { type: Type.STRING }
        },
        required: ["title", "examMarkdown", "answerMarkdown"]
    };

    try {
        updateLoadingText("Đang phân tích đề Word và tạo đề tương tự...");
        const text = await callAIWithFallback({
            prompt: promptText,
            jsonMode: true,
            schema: schema,
            model: 'gemini-3-flash-preview',
            updateLoadingText: updateLoadingText,
        });
        
        if (!text) return null;
        const parsed = parseJSONSafe(text);
        if (!parsed) return null;

        return {
            title: parsed.title,
            examMarkdown: parsed.examMarkdown,
            answerMarkdown: parsed.answerMarkdown,
            matrixMarkdown: "", 
            seed: seed,
            isFromDocx: true
        };
    } catch (error) {
        console.error("Generate Similar Docx Exam Error:", error);
        throw error;
    }
};

export const shuffleDocxExam = async (docxText: string, seed: number, updateLoadingText: (text: string) => void): Promise<ExamResponse | null> => {
    ensureAIAvailable();

    const promptText = `
    ĐÓNG VAI: Chuyên gia ra đề thi cấp Quốc gia.
    NHIỆM VỤ: Phân tích nội dung đề thi được trích xuất từ file Word gốc dưới dạng HTML, sau đó thực hiện ĐẢO MÃ ĐỀ:
    1. **Với câu Trắc nghiệm**: Trộn (đảo) ngẫu nhiên vị trí các câu hỏi trắc nghiệm và đảo ngẫu nhiên vị trí các đáp án A, B, C, D bên trong. Giữ nguyên hoàn toàn nội dung và dữ kiện.
    2. **Với câu Tự luận**: GIỮ NGUYÊN HOÀN TOÀN TỪ VỊ TRÍ, NỘI DUNG ĐẾN DỮ KIỆN. Tuyệt đối không thay đổi bất kỳ số liệu hay câu từ nào của phần tự luận để đảm bảo tốc độ cao nhất.
    3. **Hình thức trình bày**: BẮT BUỘC giữ nguyên toàn bộ định dạng gốc của đề, bao gồm in đậm (**text**), in nghiêng (*text*), khung/bảng biểu (Markdown table), các dấu chấm lửng (.....) hay khoảng trống để học sinh làm bài trực tiếp vào đề. Đánh lại số thứ tự câu hỏi trắc nghiệm cho liền mạch. Đảm bảo tốc độ cao nhất.
    4. Trả về "examMarkdown" nội dung đề thi hoàn chỉnh.
    5. Tạo bảng kiểm dạ chi tiết cho "answerMarkdown". Với trắc nghiệm, cập nhật chuẩn xác theo vị trí cấu trúc đáp án đã được đảo. Với tự luận, trích xuất lại đáp án từ file Word gốc mà không cần thay đổi.
    
    YÊU CẦU ĐẢO ĐỀ:
    Dựa vào mã SEED=${seed}, đảo ngẫu nhiên để tạo ra một mã đề (mã ${seed}) khác với thứ tự trắc nghiệm ban đầu.
    
    ${VIETNAMESE_MATH_RULES}

    --- ĐỀ WORD GỐC (ĐỊNH DẠNG HTML) ---
    ${docxText}
    
    Hãy phân tích cẩn thận các thẻ HTML (như <b>, <i>, <table>, <tr>, <td>...) và chuyển đổi chúng thành các định dạng Markdown tương ứng (**bold**, *italics*, Markdown Tables) thật chuẩn xác. Tuyệt đối không làm mất khung bảng hay các định dạng in đậm/nghiêng của đề gốc.

    OUTPUT JSON:
    - title: Trích xuất và GIỮ NGUYÊN tiêu đề của đề thi gốc.
    - examMarkdown: Nội dung đề mới chỉ đảo trắc nghiệm.
    - answerMarkdown: Hướng dẫn chấm tương ứng sau khi đảo.
    `;

    const schema = {
        type: Type.OBJECT,
        properties: {
            title: { type: Type.STRING },
            examMarkdown: { type: Type.STRING },
            answerMarkdown: { type: Type.STRING }
        },
        required: ["title", "examMarkdown", "answerMarkdown"]
    };

    try {
        updateLoadingText("Đang đảo mã đề siêu tốc...");
        const text = await callAIWithFallback({
            prompt: promptText,
            jsonMode: true,
            schema: schema,
            model: 'gemini-3-flash-preview',
            updateLoadingText: updateLoadingText,
        });
        
        if (!text) return null;
        const parsed = parseJSONSafe(text);
        if (!parsed) return null;

        return {
            title: parsed.title,
            examMarkdown: parsed.examMarkdown,
            answerMarkdown: parsed.answerMarkdown,
            matrixMarkdown: "", 
            seed: seed,
            isFromDocx: true
        };
    } catch (error) {
        console.error("Shuffle Docx Exam Error:", error);
        throw error;
    }
};

export const generateSimilarExamFromPdf = async (pageImages: string[], seed: number, context: string = ""): Promise<ExamResponse | null> => {
    ensureAIAvailable();

    const promptText = `
    ĐÓNG VAI: Chuyên gia ra đề thi cấp Quốc gia.
    NHIỆM VỤ: Phân tích đề thi gốc trong ảnh (cấu trúc, ma trận, độ khó) và sáng tạo một **ĐỀ THI MỚI** tương đương.
    
    YÊU CẦU PHỤ ĐẶC BIỆT TỪ GIÁO VIÊN: ${context || 'Không có yêu cầu phụ đặc biệt.'}

    MÃ NGẪU NHIÊN (SEED): ${seed}
    
    YÊU CẦU ĐA DẠNG HÓA & CHỐNG TRÙNG LẶP (BẮT BUỘC):
    Dựa vào mã SEED=${seed}, hãy tạo ra một biến thể KHÁC BIỆT so với các lần tạo trước (nếu seed thay đổi, đề phải thay đổi).
    
    1. **Thay đổi số liệu quyết liệt**:
    - KHÔNG dùng lại bộ số liệu của đề gốc.
    - Ví dụ: Nếu đề gốc nghiệm x=2, hãy đổi sang x=3 hoặc x=-1.
    - Ví dụ: Nếu đề gốc là tam giác vuông (3-4-5), hãy dùng bộ (5-12-13) hoặc (6-8-10).
    2. **Thay đổi bối cảnh bài toán thực tế**:
    - Đổi tên nhân vật (An -> Bình, Chi -> Dũng).
    - Đổi đồ vật/sự kiện (Táo -> Cam, Mua sách -> Mua vở).
    3. **Giữ nguyên cấu trúc**: Dạng toán và phương pháp giải giữ nguyên, độ khó tương đương.

    XỮ LÝ HÌNH ẢNH (BẮT BUỘC TUÂN THỦ TỐI ĐA):
    - Đề thi gốc có thể chứa ảnh chụp đồ thị, Bảng biến thiên, hoặc Hình dạng hình học.
    - LƯU Ý SỐ 1: VỚI CÁC CÂU HỎI (TRẮC NGHIỆM HOẶC TỰ LUẬN) CÓ CHỨA HÌNH VẼ HOẶC ĐƯỢC CHÈN PLACEHOLDER \`[HÌNH_X]\`: BẠN **TUYỆT ĐỐI KHÔNG ĐƯỢC THAY ĐỔI** BẤT KỲ SỐ LIỆU, DỮ KIỆN HAY NỘI DUNG NÀO CỦA CÂU HỎI ĐÓ. Bắt buộc phải sao chép lại y nguyên 100% câu hỏi và chèn đúng placeholder \`[HÌNH_X]\` vào vị trí tương ứng. Việc thay đổi số liệu sẽ làm hình vẽ cũ (được chèn lại) trở thành sai kiến thức.
    - Bạn CHỈ ĐƯỢC PHÉP thay đổi số liệu và bối cảnh ở các câu hỏi HOÀN TOÀN KHÔNG có chứa hình vẽ/đồ thị/bảng biểu.
    
    YÊU CẦU CHUNG:
    - **Hình thức trình bày**: Giữ nguyên định dạng gốc của đề, đặc biệt là các phần chấm lửng (.....) hay khoảng trống để học sinh điền đáp án trực tiếp vào đề.
    - Bắt buộc tuân thủ **MATH_BEAUTY_RULES** (nghiệm đẹp/hợp lý).
    - Cung cấp đáp án và lời giải chi tiết, chuẩn mực.
    
    ${MATH_BEAUTY_RULES}
    ${VIETNAMESE_MATH_RULES}
    ${STRICT_QA_PROTOCOL}

    OUTPUT JSON:
    - title: Trích xuất và GIỮ NGUYÊN tiêu đề của đề gốc (Tuyệt đối không tự bịa mã đề).
    - examMarkdown: Nội dung đề mi.
    - answerMarkdown: Hướng dẫn chấm chi tiết (phải khớp với đề bài mới và có kết quả đẹp).
    `;

    const schema = {
        type: Type.OBJECT,
        properties: {
            title: { type: Type.STRING },
            examMarkdown: { type: Type.STRING },
            answerMarkdown: { type: Type.STRING }
        },
        required: ["title", "examMarkdown", "answerMarkdown"]
    };

    try {
        const images = pageImages.map(img => ({ base64: img, mimeType: 'image/png' }));
        const text = await callAIWithFallback({
            prompt: promptText,
            jsonMode: true,
            schema: schema,
            model: 'gemini-3-flash-preview',
            images: images,
        });
        
        if (!text) return null;
        const parsed = parseJSONSafe(text);
        if (!parsed) return null;

        return {
            title: parsed.title,
            examMarkdown: parsed.examMarkdown,
            answerMarkdown: parsed.answerMarkdown,
            matrixMarkdown: "", 
            seed: seed
        };
    } catch (error) {
        console.error("Generate Similar Exam Error:", error);
        throw error;
    }
};

export const locateImagesInPages = async (pageImages: string[]): Promise<ImageLocation[]> => {
    ensureAIAvailable();

    const promptText = `
    ANALYZE DOCUMENT LAYOUT. Find all graphical elements (charts, diagrams, geometry figures).
    OUTPUT: JSON array of objects {pageIndex, x, y, width, height} (coordinates as percentages 0.0-1.0).
    Ignore headers, footers, simple text paragraphs.
    `;

    const schema = {
        type: Type.ARRAY,
        items: {
            type: Type.OBJECT,
            properties: {
                pageIndex: { type: Type.INTEGER },
                x: { type: Type.NUMBER },
                y: { type: Type.NUMBER },
                width: { type: Type.NUMBER },
                height: { type: Type.NUMBER },
            },
            required: ["pageIndex", "x", "y", "width", "height"]
        }
    };
    
    try {
        const images = pageImages.map(img => ({ base64: img, mimeType: 'image/png' }));
        const text = await callAIWithFallback({
            prompt: promptText,
            jsonMode: true,
            schema: schema,
            model: 'gemini-3-flash-preview',
            images: images,
        });
        
        if (!text) return [];
        const parsed = parseJSONSafe(text);
        return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
        console.error("Locate Images Error:", error);
        throw error;
    }
};

export const filterMeaningfulImages = async (extractedImgs: ExtractedImage[]): Promise<number[]> => {
    ensureAIAvailable();

    const promptText = `
    Classify images from an exam paper.
    - Meaningful: diagrams, charts, geometry figures (Keep these).
    - Irrelevant: logos, stamps, lines, decorative borders (Discard these).
    OUTPUT JSON: { "meaningful_indices": [index1, index2...] } (0-based indices).
    `;

    const schema = {
        type: Type.OBJECT,
        properties: { meaningful_indices: { type: Type.ARRAY, items: { type: Type.INTEGER } } },
        required: ["meaningful_indices"]
    };

    try {
        const images = extractedImgs.map(img => ({ base64: img.base64, mimeType: img.mimeType }));
        const text = await callAIWithFallback({
            prompt: promptText,
            jsonMode: true,
            schema: schema,
            model: 'gemini-3-flash-preview',
            images: images,
        });
        
        if (!text) return [];
        const parsed = parseJSONSafe(text);
        return parsed?.meaningful_indices || [];
    } catch (error) {
        console.error("Filter Images Error:", error);
        throw error;
    }
};

export const shuffleExam = async (examMarkdown: string, answerMarkdown: string, updateLoadingText: (text: string) => void, additionalContext?: string): Promise<{examMarkdown: string, answerMarkdown: string} | null> => {
    ensureAIAvailable();

    const promptText = `
    ĐÓNG VAI: Chuyên gia biên soạn đề thi.
    NHIỆM VỤ: Nhận vào một đề thi (Markdown) và đáp án (Markdown) gốc, sau đó thực hiện ĐẢO ĐỀ VÀ LÀM MỚI để tạo ra một bộ đề tương đương:
    
    1. **PHẦN TRẮC NGHIỆM**:
       - Trộn (đảo) ngẫu nhiên vị trí các câu hỏi trắc nghiệm.
       - Đảo ngẫu nhiên vị trí các đáp án A, B, C, D bên trong mỗi câu hỏi.
       - GIỮ NGUYÊN HOÀN TOÀN dữ kiện, số liệu toán học phần trắc nghiệm.
    2. **PHẦN TỰ LUẬN**:
       - KHÔNG ĐẢO THỨ TỰ câu hỏi. Giữ nguyên vị trí các câu của phần tự luận.
       - CHỈ THAY ĐỔI DỮ KIỆN, SỐ LIỆU nhưng vẫn phải đảm bảo khoa học, chính xác, logic, dạng toán, phương pháp giải, và độ khó tương đương đề cũ. Nghiệm giải ra phải đẹp (áp dụng MATH_BEAUTY_RULES).
    3. **HÌNH THỨC TRÌNH BÀY**:
       - BẮT BUỘC giữ nguyên toàn bộ định dạng chi tiết của đề như in đậm (**bold**), in nghiêng (*italics*), bảng biểu (Markdown tables), và các dấu chấm lửng (.....) hay khoảng trống để học sinh có thể làm bài trực tiếp vào đề.
       - Đánh lại số thứ tự các câu hỏi (Câu 1, Câu 2...) để bảo đảm liền mạch từ trên xuống.
    4. **XỬ LÝ ĐÁP ÁN**:
       - Trả về bảng kiểm dạ đáp án mới ("answerMarkdown") sao cho chính xác tuyệt đối.
       - Với trắc nghiệm: cập nhật kết quả theo vị trí cấu trúc đáp án đã được đảo.
       - Với tự luận: BẮT BUỘC GIẢI CHI TIẾT lại bằng các SỐ LIỆU MỚI vừa được thay đổi.
    5. **BẢO TOÀN DỮ LIỆU ĐẶC BIỆT**: 
       - TUYỆT ĐỐI GIỮ NGUYÊN các placeholder hình ảnh như \`[HÌNH_1]\`, \`[HÌNH_2]\`... Nếu câu số 5 có chứa \`[HÌNH_3]\`, khi nó bị đảo vị trí, thì \`[HÌNH_3]\` vẫn phải đi theo đúng câu đó. KHÔNG làm mất hay thay đổi thứ tự \`[HÌNH_X]\`.
    
    ${additionalContext ? `YÊU CẦU BỔ SUNG TỪ NGƯỜI DÙNG CẦN TUÂN THỦ:\n${additionalContext}` : ""}
    
    ${MATH_BEAUTY_RULES}
    ${VIETNAMESE_MATH_RULES}
    ${STRICT_QA_PROTOCOL}

    --- ĐỀ GỐC ---
    ${examMarkdown}

    --- ĐÁP ÁN GỐC ---
    ${answerMarkdown || "(Không có đáp án)"}
    `;

    const schema = {
        type: Type.OBJECT,
        properties: {
            examMarkdown: { type: Type.STRING },
            answerMarkdown: { type: Type.STRING }
        },
        required: ["examMarkdown", "answerMarkdown"]
    };

    try {
        updateLoadingText("Đang đảo câu hỏi và đáp án...");
        const text = await callAIWithFallback({
            prompt: promptText,
            jsonMode: true,
            schema: schema,
            model: 'gemini-3-flash-preview',
            updateLoadingText: updateLoadingText,
        });
        
        if (!text) return null;
        return parseJSONSafe(text);
    } catch (error) {
        console.error("Shuffle Exam Error:", error);
        throw error;
    }
};

export const generateMatrixFromDocx = async (docxText: string, updateLoadingText: (text: string) => void): Promise<ExamResponse | null> => {
    ensureAIAvailable();

    const promptText = `
    ĐÓNG VAI: Chuyên gia Khoa thí chuyên Lập Ma trận và Bản đặc tả đề thi.
    
    NHIỆM VỤ: Hãy phân tích đề thi dưới đây (Word HTML format) và:
    TỰ ĐỘNG lập BẢNG MA TRẬN đề thi và BẢN ĐẶC TẢ mức độ đánh giá tương ứng. Phân loại theo (Nhận biết, Thông hiểu, Vận dụng, Vận dụng cao).
    
    ${STRICT_QA_PROTOCOL}

    --- ĐỀ WORD GỐC (ĐỊNH DẠNG HTML) ---
    ${docxText}

    HƯỚNG DẪN ĐẶC BIỆT:
    - CHỈ TẠO Bảng Ma trận và Bản đặc tả.
    - Luôn có dòng header tiêu chuẩn cho mỗi bảng.
    
    QUY TẮC FORMAT BẢNG MARKDOWN (BẮT BUỘC):
    - Bảng Markdown PHẢI là bảng phẳng (flat), KHÔNG dùng sub-columns riêng biệt.
    - Mỗi ô mức độ ghi gọn dạng "SốTN/SốTL" (VD: "2/0" = 2 TN 0 TL; "1/1" = 1 TN 1 TL).
    - TUYỆT ĐỐI KHÔNG dùng ký tự backslash (\\) trong cell bảng.
    - TUYỆT ĐỐI KHÔNG tạo sub-columns TN và TL riêng biệt bằng dấu |.
    - TUYỆT ĐỐI KHÔNG dùng dấu | BÊN TRONG nội dung ô. Dấu | chỉ phân cách cột.
    - Dùng <br> để ngắt dòng bên trong ô (KHÔNG dùng \\n hay enter).
    - VÍ DỤ SAI (CẤM): | NB | TNKQ | TL | TH | TNKQ | TL | ← CẤM tạo sub-columns!
    - VÍ DỤ ĐÚNG: | NB (TN/TL) | TH (TN/TL) | ← Ghi gọn trong 1 ô

    CẤU TRÚC BẢNG MA TRẬN:
    | Chủ đề | Nội dung kiến thức | Nhận biết | Thông hiểu | Vận dụng | Vận dụng cao | Tổng số câu | Tổng điểm |
    
    CẤU TRÚC BẢNG ĐẶC TẢ:
    | TT | Chủ đề | Đơn vị kiến thức | Mức độ đánh giá | Nhận biết (TN/TL) | Thông hiểu (TN/TL) | Vận dụng (TN/TL) |

    OUTPUT JSON:
    - title: Tên đề thi gốc.
    - matrixMarkdown: Bảng Ma trận và Bản đặc tả ở dạng Markdown Table thật chi tiết.
    `;

    const schema = {
        type: Type.OBJECT,
        properties: {
            title: { type: Type.STRING },
            matrixMarkdown: { type: Type.STRING }
        },
        required: ["title", "matrixMarkdown"]
    };

    try {
        updateLoadingText("Đang phân tích đề để lập Ma trận...");
        const text = await callAIWithFallback({
            prompt: promptText,
            jsonMode: true,
            schema: schema,
            model: 'gemini-3-flash-preview',
            updateLoadingText: updateLoadingText,
        });
        
        if (!text) return null;
        const result = parseJSONSafe(text);
        return {
            title: result.title,
            matrixMarkdown: result.matrixMarkdown,
            examMarkdown: "",
            answerMarkdown: "",
            isFromDocx: true
        };
    } catch (error) {
        console.error("Generate Matrix Docx Error:", error);
        throw error;
    }
};

export const generateMatrixFromPdf = async (pageImages: string[], updateLoadingText: (text: string) => void): Promise<ExamResponse | null> => {
    ensureAIAvailable();

    const promptText = `
    ĐÓNG VAI: Chuyên gia Khoa thí chuyên Lập Ma trận và Bản đặc tả đề thi.
    
    NHIỆM VỤ: Hãy đọc các trang ảnh đề thi được cung cấp và:
    TỰ ĐỘNG lập BẢNG MA TRẬN đề thi và BẢN ĐẶC TẢ mức độ đánh giá dựa trên các câu hỏi có trong đề. Phân loại theo mức độ (Nhận biết, Thông hiểu, Vận dụng, Vận dụng cao).
    
    ${STRICT_QA_PROTOCOL}

    HƯỚNG DẪN ĐẶC BIỆT:
    - CHỈ TẠO Bảng Ma trận và Bản đặc tả.
    
    QUY TẮC FORMAT BẢNG MARKDOWN (BẮT BUỘC):
    - Bảng Markdown PHẢI là bảng phẳng (flat), KHÔNG dùng sub-columns riêng biệt.
    - Mỗi ô mức độ ghi gọn dạng "SốTN/SốTL" (VD: "2/0" = 2 TN 0 TL; "1/1" = 1 TN 1 TL).
    - TUYỆT ĐỐI KHÔNG dùng ký tự backslash (\\) trong cell bảng.
    - TUYỆT ĐỐI KHÔNG tạo sub-columns TN và TL riêng biệt bằng dấu |.
    - TUYỆT ĐỐI KHÔNG dùng dấu | BÊN TRONG nội dung ô. Dấu | chỉ phân cách cột.
    - Dùng <br> để ngắt dòng bên trong ô (KHÔNG dùng \\n hay enter).
    - VÍ DỤ SAI (CẤM): | NB | TNKQ | TL | TH | TNKQ | TL | ← CẤM tạo sub-columns!
    - VÍ DỤ ĐÚNG: | NB (TN/TL) | TH (TN/TL) | ← Ghi gọn trong 1 ô

    CẤU TRÚC BẢNG MA TRẬN:
    | Chủ đề | Nội dung kiến thức | Nhận biết | Thông hiểu | Vận dụng | Vận dụng cao | Tổng số câu | Tổng điểm |
    
    CẤU TRÚC BẢNG ĐẶC TẢ:
    | TT | Chủ đề | Đơn vị kiến thức | Mức độ đánh giá | Nhận biết (TN/TL) | Thông hiểu (TN/TL) | Vận dụng (TN/TL) |

    OUTPUT JSON:
    - title: Tên đề thi hoặc "Đề thi phân tích từ PDF".
    - matrixMarkdown: Bảng Ma trận và Bản đặc tả (bắt buộc).
    `;

    const schema = {
        type: Type.OBJECT,
        properties: {
            title: { type: Type.STRING },
            matrixMarkdown: { type: Type.STRING }
        },
        required: ["title", "matrixMarkdown"]
    };

    try {
        updateLoadingText("Đang đọc PDF và lập Ma trận...");
        const images = pageImages.map(img => ({ base64: img, mimeType: 'image/jpeg' }));
        const text = await callAIWithFallback({
            prompt: promptText,
            jsonMode: true,
            schema: schema,
            model: 'gemini-3-flash-preview',
            images: images,
            updateLoadingText: updateLoadingText,
        });
        
        if (!text) return null;
        const result = parseJSONSafe(text);
        return {
            title: result.title,
            matrixMarkdown: result.matrixMarkdown,
            examMarkdown: "",
            answerMarkdown: ""
        };
    } catch (error) {
        console.error("Generate Matrix Pdf Error:", error);
        throw error;
    }
};

export const generateSHCM = async (
    schoolName: string,
    groupName: string,
    academicYear: string,
    subject: string,
    requirements: string,
    selectedMonths: number[],
    includeGeneralPlan: boolean,
    leaderName: string,
    hostName: string,
    secretaryName: string,
    teachers: { name: string }[],
    customTopics: string,
    contentLength: string,
    updateLoadingText: (text: string) => void
): Promise<{term1Activities?: { month: string; content: string }[], term2Activities?: { month: string; content: string }[], measures?: string, meetings: { meetingNumber: number, date: string, contentMarkdown: string }[]} | null> => {
    updateLoadingText("Đang khởi tạo kết nối với AI...");
    ensureAIAvailable();

    const allMonths = [8, 9, 10, 11, 12, 1, 2, 3, 4, 5];
    const meetingMap: Record<number, number[]> = {
        8: [1],
        9: [2, 3],
        10: [4, 5],
        11: [6, 7],
        12: [8, 9],
        1: [10, 11],
        2: [12, 13],
        3: [14, 15],
        4: [16, 17],
        5: [18, 19]
    };
    
    let targetMeetings: {month: number, numbers: number[]}[] = [];
    let plannedMeetingsCount = 0;
    const monthsToProcess = selectedMonths.length > 0 ? selectedMonths : allMonths;
    monthsToProcess.forEach(m => {
        targetMeetings.push({month: m, numbers: meetingMap[m]});
        plannedMeetingsCount += meetingMap[m].length;
    });
    
    const assignedMeetingText = targetMeetings.map(t => `- Tháng ${t.month}: Lần họp số ${t.numbers.join(' và ')}`).join('\n    ');

    const monthConstraint = `TẠO BIÊN BẢN HỌP CHO CÁC THÁNG VÀ SỐ LẦN HỌP CỤ THỂ NHƯ SAU:
    ${assignedMeetingText}
    TUYỆT ĐỐI KHÔNG TẠO THIẾU HOẶC THỪA (Tổng số lần họp đúng bằng ${plannedMeetingsCount}). Ghi đúng thuộc tính \`meetingNumber\` tương ứng với tháng đó.`;

    const generalPlanInstruction = includeGeneralPlan 
        ? `2. Tạo thêm Kế hoạch chung (term1Activities, term2Activities, measures) theo mẫu gợi ý:
    - Tháng 8 (Học kỳ I): Ổn định tổ chức, xây dựng kế hoạch dạy học...
    - Tháng 12: Đánh giá, ra đề cuối kỳ I...`
        : `2. BỎ QUA phần Kế hoạch chung (không tạo term1Activities, term2Activities, measures). Chỉ tạo list meetings.`;

    const teacherNames = teachers.length > 0 ? teachers.map(t => t.name).join(', ') : "Giáo viên trong tổ";
    const customTopicsInstruction = customTopics ? `\nCHÚ Ý ĐẶC BIỆT CÁC CHỦ ĐỀ SAU (NGƯỜI DÙNG CHỈ ĐỊNH):\n${customTopics}\n` : "";

    // Tự nhận diện cấp học từ tên trường
    const schoolNameUpper = schoolName.toUpperCase();
    let schoolLevel = 'THCS';
    let gradeLevels = 'KHỐI LỚP 6, 7, 8, 9';
    if (schoolNameUpper.includes('TIỂU HỌC') || (schoolNameUpper.includes('TH ') && !schoolNameUpper.includes('THCS') && !schoolNameUpper.includes('THPT'))) {
        schoolLevel = 'TIỂU HỌC'; gradeLevels = 'KHỐI LỚP 1, 2, 3, 4, 5';
    } else if (schoolNameUpper.includes('THPT') || schoolNameUpper.includes('PHỔ THÔNG')) {
        schoolLevel = 'THPT'; gradeLevels = 'KHỐI LỚP 10, 11, 12';
    } else if (schoolNameUpper.includes('TH&THCS') || schoolNameUpper.includes('TH-THCS')) {
        schoolLevel = 'TH&THCS'; gradeLevels = 'KHỐI LỚP 1-9 (tùy bộ môn)';
    } else if (schoolNameUpper.includes('THCS&THPT') || schoolNameUpper.includes('THCS-THPT')) {
        schoolLevel = 'THCS&THPT'; gradeLevels = 'KHỐI LỚP 6-12 (tùy bộ môn)';
    }

    const promptText = `
    ĐÓNG VAI: Chuyên gia giáo dục trung học, nhóm trưởng chuyên môn trường phổ thông.
    NHIỆM VỤ: Tạo nội dung biên bản sinh hoạt chuyên môn (Sổ SHCM) cho tổ/nhóm ${groupName} - Trường ${schoolName}, năm học ${academicYear}, môn ${subject}.

    ================================================================
    CĂN CỨ PHÁP LÝ (BẮT BUỘC TUÂN THỦ):
    ================================================================
    - Thông tư 15/2026/TT-BGDĐT (Điều lệ trường tiểu học, THCS, THPT)
    - Công văn 4069/BGDĐT-GDPT ngày 01/7/2026 — Hướng dẫn tổ chức sinh hoạt chuyên môn trong cơ sở GDPT
    
    NỘI DUNG SHCM THEO CV 4069 (5 trụ cột chính — phải luân phiên xuất hiện trong các buổi họp):
    1. Triển khai CTGDPT; xây dựng, tổ chức thực hiện và điều chỉnh kế hoạch giáo dục nhà trường, kế hoạch dạy học môn học; dạy học tích hợp.
    2. Đổi mới phương pháp, hình thức tổ chức dạy học và kiểm tra đánh giá theo hướng phát triển phẩm chất, năng lực HS; phân tích kết quả học tập để điều chỉnh dạy học.
    3. Nghiên cứu bài học, sinh hoạt chuyên đề, trao đổi kinh nghiệm, chia sẻ giải pháp chuyên môn; phát hiện, tháo gỡ khó khăn, vướng mắc.
    4. Xây dựng, khai thác, sử dụng và chia sẻ học liệu, học liệu số, học liệu mở, ngân hàng câu hỏi, công cụ KTĐG, dữ liệu GD và sản phẩm CM dùng chung.
    5. Tăng cường ứng dụng công nghệ số và AI trong xây dựng KHBD, học liệu, tổ chức dạy học, KTĐG; đảm bảo an toàn thông tin, sử dụng AI có trách nhiệm.

    GỢI Ý NỘI DUNG CẤP THCS (Phụ lục CV 4069):
    - Thực hiện các môn học tích hợp (KHTN, Lịch sử và Địa lý, GDCD...), nội dung giáo dục địa phương
    - Dạy học phân hóa; hỗ trợ HS phát triển năng lực, sở trường
    - Đổi mới KTĐG; xây dựng và sử dụng công cụ đánh giá phù hợp yêu cầu cần đạt
    - Giáo dục STEM/STEAM, nghiên cứu KHKT, hoạt động trải nghiệm hướng nghiệp
    - Phối hợp giữa GV các phân môn tích hợp; phân tích dữ liệu học tập HS
    - Ứng dụng công nghệ số, AI trong dạy học, KTĐG, hỗ trợ HS tự học; đạo đức học thuật

    HÌNH THỨC SINH HOẠT CM (CV 4069 Mục III):
    - Sinh hoạt theo hướng nghiên cứu bài học (mỗi môn ít nhất 02 bài/năm): chuẩn bị → dạy minh họa → quan sát → phân tích, rút kinh nghiệm → không xếp loại giờ dạy
    - Sinh hoạt tổ chuyên môn: ít nhất 01 lần / 02 tuần; dân chủ, tôn trọng, chia sẻ
    - Sinh hoạt cụm chuyên môn: chia sẻ liên trường, ít nhất 02 lần/năm

    ================================================================
    YÊU CẦU CỤ THỂ:
    ================================================================
    1. Yêu cầu chung: ${requirements}${customTopicsInstruction}
    ${generalPlanInstruction}
    3. ${monthConstraint}
    4. Trả về cấu trúc JSON đúng định dạng theo schema.
    5. TUYỆT ĐỐI TRÁNH tạo ngày họp trùng vào Chủ nhật (Sunday). Hãy đảm bảo các ngày được tạo rơi vào thứ 2, 3, 4, 5, 6, 7. Tạo ngày giả định theo năm học ${academicYear}. ĐỊNH DẠNG NGÀY THÁNG BẮT BUỘC LÀ: DD/MM/YYYY (ví dụ: 15/09/2025).
    6. NỘI DUNG BIÊN BẢN: Trình bày định dạng Markdown. Đây là phần thảo luận chuyên môn. LƯU Ý CAO NHẤT: ĐÂY LÀ CHƯƠNG TRÌNH CẤP ${schoolLevel}, CHỈ CÓ CÁC ${gradeLevels}. MỌI KIẾN THỨC VÀ BÀI DẠY VÍ DỤ TRONG BIÊN BẢN GHI RA PHẢI THUỘC CHƯƠNG TRÌNH CẤP ${schoolLevel}. Đội ngũ GV thảo luận phải phù hợp với đặc thù bộ môn ${subject}. Yêu cầu độ dài: khoảng ${contentLength} chữ cho mỗi biên bản (phù hợp theo bộ môn). Trực tiếp đi vào cuộc họp (Không in lại các tiêu đề cũng như 1. Thời gian, 2. Thành phần: vì hệ thống đã tự in ra). LƯU Ý ĐẶC BIỆT: TUYỆT ĐỐI KHÔNG DÙNG TỪ "Tổ trưởng", HÃY DÙNG TỪ "Nhóm trưởng" HOẶC "Chủ trì cuộc họp" để gọi người điều hành cuộc họp.
       - Nêu rất chi tiết tiến trình, thảo luận, nội dung chuyên môn của cuộc họp (VD: phân tích từng bước bài học, tranh luận các phương án dạy học, đóng góp ý kiến về ma trận, các biện pháp đổi mới phương pháp dạy học cụ thể...). Dùng nhiều gạch đầu dòng và đoạn văn rõ ràng.
       - PHẢI LUÂN PHIÊN 5 trụ cột CV 4069 vào các buổi họp khác nhau (không lặp lại nội dung giống nhau ở các lần họp).
       - Ít nhất 2 buổi họp trong năm phải có hình thức NGHIÊN CỨU BÀI HỌC (dạy minh họa + quan sát + rút kinh nghiệm), theo đúng quy trình CV 4069.
       - *Quan trọng*: Các phát biểu, báo cáo chuyên đề, dạy minh họa phải NÊU TÊN NGƯỜI THỰC HIỆN, lấy ngẫu nhiên từ danh sách giáo viên: [${teacherNames}]. Không dùng tên ABC.
       
       Cấu trúc gợi ý (chỉ sinh phần thảo luận):
       **I. Triển khai công tác:**
       - ...
       **II. Thảo luận chuyên môn:**
       - Đ/c (Tên người 1) báo cáo chuyên đề/bài dạy...
       - Đ/c (Tên người 2) nhận xét về tình huống...
       **III. Kết luận:**
       - Nhóm trưởng/Chủ trì cuộc họp (${hostName}) kết luận:...

    JSON OUTPUT SCHEMA (BẮT BUỘC ĐÚNG ĐỊNH DẠNG NÀY):
    Trả về JSON object với CẤU TRÚC CHÍNH XÁC như sau (key names PHẢI ĐÚNG Y NGUYÊN, KHÔNG ĐƯỢC ĐỔI TÊN):
    {
        "meetings": [
            {
                "meetingNumber": 1,
                "date": "DD/MM/YYYY",
                "contentMarkdown": "Nội dung markdown đầy đủ..."
            }
        ],
        "term1Activities": [{"month": "Tháng 8", "content": "..."}],
        "term2Activities": [{"month": "Tháng 1", "content": "..."}],
        "measures": "Các biện pháp chính (markdown)..."
    }
    CÁC KEY BẮT BUỘC: "meetings", "meetingNumber", "date", "contentMarkdown", "term1Activities", "term2Activities", "measures", "month", "content".
    KHÔNG ĐƯỢC thay đổi tên key (ví dụ: KHÔNG dùng "meeting_number" thay cho "meetingNumber", KHÔNG dùng "content_markdown" thay cho "contentMarkdown").
    `;

    const schema: any = {
        type: Type.OBJECT,
        properties: {
            meetings: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        meetingNumber: { type: Type.NUMBER },
                        date: { type: Type.STRING },
                        contentMarkdown: { type: Type.STRING }
                    },
                    required: ["meetingNumber", "date", "contentMarkdown"]
                }
            }
        },
        required: ["meetings"]
    };

    if (includeGeneralPlan) {
        schema.properties.term1Activities = {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: { month: { type: Type.STRING }, content: { type: Type.STRING } },
                required: ["month", "content"]
            }
        };
        schema.properties.term2Activities = {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: { month: { type: Type.STRING }, content: { type: Type.STRING } },
                required: ["month", "content"]
            }
        };
        schema.properties.measures = { type: Type.STRING };
        schema.required.push("term1Activities", "term2Activities", "measures");
    }

    try {
        updateLoadingText("AI đang biên soạn Sổ Sinh Hoạt Chuyên Môn (khoảng 30-60 giây)...");
        const text = await callAIWithFallback({
            prompt: promptText,
            jsonMode: true,
            schema: schema,
                        model: 'gemini-3-flash-preview',
            updateLoadingText: updateLoadingText,
        });
        
        if (!text) return null;
        
        updateLoadingText("Đang xử lý kết quả...");
        const parsed = parseJSONSafe(text);
        if (!parsed) return null;

        // === KEY NORMALIZATION ===
        // Claude/một số AI có thể trả key sai (snake_case thay vì camelCase)
        // Normalize để đảm bảo Word export luôn có nội dung
        if (!parsed.meetings && parsed.meeting_minutes) parsed.meetings = parsed.meeting_minutes;
        if (!parsed.meetings && parsed.meeting_records) parsed.meetings = parsed.meeting_records;
        if (!parsed.meetings) {
            console.error('SHCM: No meetings array in parsed result', Object.keys(parsed));
            return null;
        }
        // Normalize each meeting
        parsed.meetings = parsed.meetings.map((m) => ({
            meetingNumber: m.meetingNumber || m.meeting_number || m.number || 0,
            date: m.date || '',
            contentMarkdown: m.contentMarkdown || m.content_markdown || m.content || m.markdown || '',
        }));
        // Normalize activities
        if (!parsed.term1Activities && parsed.term_1_activities) parsed.term1Activities = parsed.term_1_activities;
        if (!parsed.term2Activities && parsed.term_2_activities) parsed.term2Activities = parsed.term_2_activities;

        return parsed;

    } catch (error) {
        console.error("Generate SHCM Error:", error);
        throw error;
    }
};

// ==================== SIMPLE CALL AI (for chatbot) ====================
export const callAI = async (prompt: string): Promise<string | null> => {
    if (!_routerConfigFetched) await fetchRouterConfig();
    
    // Try 9Router first
    if (is9RouterAvailable()) {
        const result = await call9Router({ prompt, jsonMode: false });
        if (result) return result;
    }
    
    // Fallback to Gemini
    const apiKey = getGeminiApiKey();
    if (!apiKey) return null;
    
    try {
        const genAI = new GoogleGenAI({ apiKey });
        const response = await genAI.models.generateContent({
            model: 'gemini-2.0-flash',
            contents: prompt,
        });
        return response.text || null;
    } catch (e) {
        console.error('[callAI] Gemini error:', e);
        return null;
    }
};
