import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, BorderStyle, AlignmentType, ShadingType, PageOrientation, VerticalAlign, PageBreak, ImageRun, TableLayoutType, VerticalMergeType, TabStopType, Math as DocxMath, MathRun, MathFraction, MathRadical, MathSuperScript, MathSubScript, MathSubSuperScript, MathRoundBrackets, MathSquareBrackets, MathCurlyBrackets, MathAngledBrackets, XmlComponent, XmlAttributeComponent } from "docx";
import type { ParagraphChild, MathComponent } from "docx";
import saveAs from "file-saver";
import { LessonPlanResponse, ExamResponse, ExamInput, GradeLevel, Subject, ExamHeader, TeacherProfile } from "../types";
import { fixLatexErrors } from "./geminiService";

// === CUSTOM OMML COMPONENTS cho Equation Array (hệ phương trình xếp chồng) ===
// Word OMML sử dụng m:d (delimiter) + m:eqArr để hiển thị {x+y=5 \\ x-y=1} xếp chồng dọc
class OmmlBegChr extends XmlComponent {
    constructor(chr: string) {
        super('m:begChr');
        this.root.push(new XmlAttributeComponent({ 'm:val': chr }));
    }
}
class OmmlEndChr extends XmlComponent {
    constructor(chr: string) {
        super('m:endChr');
        this.root.push(new XmlAttributeComponent({ 'm:val': chr }));
    }
}
class OmmlDPr extends XmlComponent {
    constructor(begChr: string, endChr: string) {
        super('m:dPr');
        this.addChildElement(new OmmlBegChr(begChr));
        this.addChildElement(new OmmlEndChr(endChr));
    }
}
class OmmlElement extends XmlComponent {
    constructor(children: any[]) {
        super('m:e');
        for (const child of children) {
            this.addChildElement(child);
        }
    }
}
class OmmlEqArr extends XmlComponent {
    constructor(rows: any[][]) {
        super('m:eqArr');
        for (const row of rows) {
            this.addChildElement(new OmmlElement(row));
        }
    }
}
// Tạo ngoặc nhọn { bao bọc equation array xếp chồng — giống LaTeX \begin{cases}
const createCasesOmml = (rows: MathComponent[][]): XmlComponent => {
    const eqArr = new OmmlEqArr(rows);
    const delimiter = new XmlComponent('m:d');
    delimiter.addChildElement(new OmmlDPr('{', ''));
    delimiter.addChildElement(new OmmlElement([eqArr]));
    return delimiter;
};

// Equation array xếp chồng KHÔNG ngoặc — giống LaTeX \begin{aligned}
const createAlignedOmml = (rows: MathComponent[][]): XmlComponent => {
    return new OmmlEqArr(rows);
};

const FONT_FAMILY = "Times New Roman";
const FONT_SIZE_TEXT = 26; // 13pt (26 half-points)
const LINE_SPACING = 300; // 1.15 - 1.2 lines standard for documents

// Professional Colors
const HEADER_COLOR = "2E74B5"; // Blue for main headings
const TABLE_HEADER_BG = "D9E2F3"; // Light blue for table header background
const ACTIVITY_TITLE_COLOR = "1F4E79"; // Dark blue for Activity titles
const ACTIVITY_HEADER_BG = "F2F2F2"; // Light Gray for Activity Row Background

const IMAGE_PLACEHOLDER = "___IMAGE_PLACEHOLDER_";

// Helper to decode HTML entities that might be returned by the API
const decodeHtmlEntities = (text: string): string => {
    if (!text) return ""; 
    if (typeof document === 'undefined') {
        return text.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
    }
    const textarea = document.createElement('textarea');
    textarea.innerHTML = text;
    return textarea.value;
};

const sanitizeText = (text: string): string => {
    if (!text) return "";
    // eslint-disable-next-line no-control-regex
    let cleaned = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '');
    // Remove orphan trailing backslash not part of any escape or LaTeX
    cleaned = cleaned.replace(/\\+\s*$/g, '');
    return cleaned;
};

const safeUpperCase = (text: string): string => {
    if (!text) return "";
    const parts = text.split(/(\$[^$]+\$)/g);
    return parts.map(part => {
        if (part.startsWith("$") && part.endsWith("$")) {
            return part; 
        }
        return part.toUpperCase();
    }).join("");
};

const removeVietnameseTones = (str: string) => {
    if (!str) return "";
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');
};

// ==================== LATEX → DOCX MATH CONVERTER ====================
// Chuyển LaTeX inline ($...$) thành docx Math objects (OMML)
// Word sẽ hiển thị như MathType — không cần phần mềm chuyển đổi
// ====================================================================

// Bảng ký hiệu LaTeX → Unicode
const LATEX_SYMBOLS: Record<string, string> = {
    // Greek letters
    '\\alpha': 'α', '\\beta': 'β', '\\gamma': 'γ', '\\delta': 'δ',
    '\\epsilon': 'ε', '\\varepsilon': 'ε', '\\zeta': 'ζ', '\\eta': 'η',
    '\\theta': 'θ', '\\vartheta': 'ϑ', '\\iota': 'ι', '\\kappa': 'κ',
    '\\lambda': 'λ', '\\mu': 'μ', '\\nu': 'ν', '\\xi': 'ξ',
    '\\pi': 'π', '\\rho': 'ρ', '\\sigma': 'σ', '\\tau': 'τ',
    '\\upsilon': 'υ', '\\phi': 'φ', '\\varphi': 'φ', '\\chi': 'χ',
    '\\psi': 'ψ', '\\omega': 'ω',
    '\\Alpha': 'Α', '\\Beta': 'Β', '\\Gamma': 'Γ', '\\Delta': 'Δ',
    '\\Theta': 'Θ', '\\Lambda': 'Λ', '\\Xi': 'Ξ', '\\Pi': 'Π',
    '\\Sigma': 'Σ', '\\Phi': 'Φ', '\\Psi': 'Ψ', '\\Omega': 'Ω',
    // Operators & Relations
    '\\times': '×', '\\div': '÷', '\\cdot': '·', '\\pm': '±', '\\mp': '∓',
    '\\leq': '≤', '\\le': '≤', '\\geq': '≥', '\\ge': '≥',
    '\\neq': '≠', '\\ne': '≠', '\\approx': '≈', '\\equiv': '≡',
    '\\sim': '∼', '\\simeq': '≃', '\\cong': '≅', '\\propto': '∝',
    '\\in': '∈', '\\notin': '∉', '\\ni': '∋', '\\subset': '⊂',
    '\\supset': '⊃', '\\subseteq': '⊆', '\\supseteq': '⊇',
    '\\cup': '∪', '\\cap': '∩', '\\emptyset': '∅', '\\varnothing': '∅',
    // Arrows
    '\\rightarrow': '→', '\\to': '→', '\\leftarrow': '←',
    '\\leftrightarrow': '↔', '\\Rightarrow': '⇒', '\\Leftarrow': '⇐',
    '\\Leftrightarrow': '⇔', '\\implies': '⇒', '\\iff': '⇔',
    // Logic & Misc
    '\\forall': '∀', '\\exists': '∃', '\\infty': '∞', '\\partial': '∂',
    '\\nabla': '∇', '\\angle': '∠', '\\triangle': '△', '\\perp': '⊥',
    '\\parallel': '∥', '\\circ': '∘', '\\bullet': '•',
    '\\ldots': '…', '\\cdots': '⋯', '\\vdots': '⋮', '\\ddots': '⋱',
    '\\quad': ' ', '\\qquad': '  ', '\\,': ' ', '\\;': ' ', '\\:': ' ',
    '\\!': '', '\\%': '%', '\\$': '$',
    // Large operators
    '\\sum': '∑', '\\prod': '∏', '\\int': '∫', '\\iint': '∬', '\\iiint': '∭',
    '\\oint': '∮', '\\coprod': '∐',
    '\\bigcup': '⋃', '\\bigcap': '⋂', '\\bigoplus': '⊕', '\\bigotimes': '⊗',
    // Additional misc
    '\\star': '⋆', '\\neg': '¬', '\\oplus': '⊕', '\\otimes': '⊗',
    '\\therefore': '∴', '\\because': '∵', '\\sqrt': '√',
    '\\langle': '⟨', '\\rangle': '⟩',
    '\\lbrace': '{', '\\rbrace': '}', '\\mid': '|', '\\nmid': '∤',
    '\\lfloor': '⌊', '\\rfloor': '⌋', '\\lceil': '⌈', '\\rceil': '⌉',
    '\\widehat': '^', '\\overline': '‾', '\\underline': '_',
    '\\not': '̸',
    // Vectors & Geometry (Toán THCS)
    '\\vec': '→', '\\overrightarrow': '→',
    '\\hat': '^', '\\bar': '‾', '\\tilde': '~',
    '\\prime': '′', '\\dprime': '″',
    // Chemistry & KHTN (Khoa học Tự nhiên)
    '\\rightleftharpoons': '⇌', '\\xrightarrow': '→', '\\xleftarrow': '←',
    '\\uparrow': '↑', '\\downarrow': '↓',
    '\\ce': '', // handled separately for chemical equations
    '\\pu': '', // physical units
    '\\degree': '°', '\\celsius': '°C',
    // Math spacing & structure
    '\\left': '', '\\right': '', '\\middle': '',
    '\\bigl': '', '\\bigr': '', '\\Bigl': '', '\\Bigr': '',
    '\\biggl': '', '\\biggr': '', '\\Biggl': '', '\\Biggr': '',
    '\\big': '', '\\Big': '', '\\bigg': '', '\\Bigg': '',
    // Trig/Log functions handled separately
};

// Tìm nhóm {} tương ứng
const findBraceGroup = (latex: string, startIdx: number): { content: string; endIdx: number } | null => {
    if (startIdx >= latex.length || latex[startIdx] !== '{') return null;
    let depth = 0;
    let i = startIdx;
    while (i < latex.length) {
        if (latex[i] === '{') depth++;
        else if (latex[i] === '}') { depth--; if (depth === 0) return { content: latex.substring(startIdx + 1, i), endIdx: i }; }
        i++;
    }
    return null; // unmatched
};

// Phân tích LaTeX thành chuỗi MathComponent[]
const parseLatexToMathComponents = (latex: string): MathComponent[] => {
    const components: MathComponent[] = [];
    let i = 0;
    let textBuffer = '';

    const flushText = () => {
        if (textBuffer) {
            components.push(new MathRun(textBuffer));
            textBuffer = '';
        }
    };

    while (i < latex.length) {
        const ch = latex[i];

        // === \frac{a}{b} ===
        if (latex.startsWith('\\frac', i) || latex.startsWith('\\dfrac', i) || latex.startsWith('\\tfrac', i)) {
            flushText();
            const cmdLen = latex.startsWith('\\dfrac', i) || latex.startsWith('\\tfrac', i) ? 6 : 5;
            i += cmdLen;
            while (i < latex.length && latex[i] === ' ') i++;
            const num = findBraceGroup(latex, i);
            if (num) {
                i = num.endIdx + 1;
                while (i < latex.length && latex[i] === ' ') i++;
                const den = findBraceGroup(latex, i);
                if (den) {
                    i = den.endIdx + 1;
                    components.push(new MathFraction({
                        numerator: parseLatexToMathComponents(num.content),
                        denominator: parseLatexToMathComponents(den.content),
                    }));
                    continue;
                }
            }
            textBuffer += 'frac';
            continue;
        }

        // === \binom{n}{k} → C(n,k) or (n choose k) ===
        if (latex.startsWith('\\binom', i) || latex.startsWith('\\dbinom', i) || latex.startsWith('\\tbinom', i)) {
            flushText();
            const cmdLen = latex.startsWith('\\dbinom', i) || latex.startsWith('\\tbinom', i) ? 7 : 6;
            i += cmdLen;
            while (i < latex.length && latex[i] === ' ') i++;
            const top = findBraceGroup(latex, i);
            if (top) {
                i = top.endIdx + 1;
                while (i < latex.length && latex[i] === ' ') i++;
                const bot = findBraceGroup(latex, i);
                if (bot) {
                    i = bot.endIdx + 1;
                    // Render as C with subscript n and superscript k (Vietnamese notation)
                    components.push(new MathRun('C'));
                    components.push(new MathSubSuperScript({
                        children: [new MathRun('')],
                        superScript: parseLatexToMathComponents(bot.content),
                        subScript: parseLatexToMathComponents(top.content),
                    }));
                    continue;
                }
            }
            textBuffer += 'C';
            continue;
        }

        // === \sqrt[n]{x} or \sqrt{x} ===
        if (latex.startsWith('\\sqrt', i)) {
            flushText();
            i += 5;
            let degree: MathComponent[] | undefined;
            if (i < latex.length && latex[i] === '[') {
                const closeB = latex.indexOf(']', i);
                if (closeB !== -1) {
                    degree = parseLatexToMathComponents(latex.substring(i + 1, closeB));
                    i = closeB + 1;
                }
            }
            while (i < latex.length && latex[i] === ' ') i++;
            const body = findBraceGroup(latex, i);
            if (body) {
                i = body.endIdx + 1;
                components.push(new MathRadical({
                    children: parseLatexToMathComponents(body.content),
                    degree: degree,
                }));
            } else {
                textBuffer += '√';
            }
            continue;
        }

        // === \mathbb{N} → ℕ, \mathbb{Z} → ℤ, etc. (Blackboard bold for number sets) ===
        if (latex.startsWith('\\mathbb', i) || latex.startsWith('\\mathcal', i) || latex.startsWith('\\mathfrak', i) || latex.startsWith('\\mathscr', i)) {
            flushText();
            const isMathbb = latex.startsWith('\\mathbb', i);
            const cmdEnd = latex.indexOf('{', i);
            if (cmdEnd !== -1) {
                const body = findBraceGroup(latex, cmdEnd);
                if (body) {
                    i = body.endIdx + 1;
                    const letter = body.content.trim();
                    if (isMathbb) {
                        const bbMap: Record<string, string> = {
                            'N': 'ℕ', 'Z': 'ℤ', 'Q': 'ℚ', 'R': 'ℝ', 'C': 'ℂ',
                            'P': 'ℙ', 'H': 'ℍ', 'A': '𝔸', 'B': '𝔹', 'D': '𝔻',
                            'E': '𝔼', 'F': '𝔽', 'I': '𝕀', 'J': '𝕁', 'K': '𝕂',
                            'L': '𝕃', 'M': '𝕄', 'O': '𝕆', 'S': '𝕊', 'T': '𝕋',
                            'U': '𝕌', 'V': '𝕍', 'W': '𝕎', 'X': '𝕏', 'Y': '𝕐',
                        };
                        textBuffer += bbMap[letter] || letter;
                    } else {
                        textBuffer += letter;
                    }
                    continue;
                }
            }
            i++;
            continue;
        }

        // === \text{...} or \mathrm{...} or \mathbb{...} etc. — render body as text ===
        if (latex.startsWith('\\text', i) || latex.startsWith('\\mathrm', i) || latex.startsWith('\\operatorname', i) || latex.startsWith('\\mathbb', i) || latex.startsWith('\\mathcal', i) || latex.startsWith('\\mathscr', i) || latex.startsWith('\\mathbf', i) || latex.startsWith('\\mathit', i)) {
            flushText();
            const cmdEnd = latex.indexOf('{', i);
            if (cmdEnd !== -1) {
                const body = findBraceGroup(latex, cmdEnd);
                if (body) {
                    i = body.endIdx + 1;
                    components.push(new MathRun(body.content));
                    continue;
                }
            }
            i++;
            continue;
        }

        // === \ce{...} — Chemistry equations (mhchem): H2O → H₂O, CO2 → CO₂ ===
        // Numbers after element symbols become subscripts, charge like 2+ becomes superscript
        // Guard: must be \ce{ or \ce followed by space/non-letter (not \celsius, \centering)
        if ((latex.startsWith('\\ce', i) && (i + 3 >= latex.length || !/[a-zA-Z]/.test(latex[i + 3]))) ||
            (latex.startsWith('\\pu', i) && (i + 3 >= latex.length || !/[a-zA-Z]/.test(latex[i + 3])))) {
            flushText();
            const cmdLen = 3; // both \ce and \pu are 3 chars
            i += cmdLen;
            while (i < latex.length && latex[i] === ' ') i++;
            if (i < latex.length && latex[i] === '{') {
                const body = findBraceGroup(latex, i);
                if (body) {
                    i = body.endIdx + 1;
                    // Parse chemistry content: numbers → subscript, charges → superscript
                    const chemContent = body.content;
                    let ci = 0;
                    while (ci < chemContent.length) {
                        const ch = chemContent[ci];
                        // Arrow patterns in chemistry
                        if (chemContent.startsWith('->', ci)) {
                            components.push(new MathRun(' → '));
                            ci += 2;
                            continue;
                        }
                        if (chemContent.startsWith('<->', ci) || chemContent.startsWith('<->', ci)) {
                            components.push(new MathRun(' ↔ '));
                            ci += 3;
                            continue;
                        }
                        if (chemContent.startsWith('<=>', ci)) {
                            components.push(new MathRun(' ⇌ '));
                            ci += 3;
                            continue;
                        }
                        // Subscript: number after letter (e.g., H2O → H₂O)
                        if (/[0-9]/.test(ch) && ci > 0 && /[A-Za-z)\]]/.test(chemContent[ci - 1])) {
                            let numStr = '';
                            while (ci < chemContent.length && /[0-9]/.test(chemContent[ci])) {
                                numStr += chemContent[ci];
                                ci++;
                            }
                            const base = components.pop();
                            const baseChildren = base ? [base] : [new MathRun('')];
                            components.push(new MathSubScript({
                                children: baseChildren,
                                subScript: [new MathRun(numStr)],
                            }));
                            continue;
                        }
                        // Superscript: charge notation like ^{2+}, ^{-}, ^{2-}
                        if (ch === '^') {
                            ci++;
                            let supContent = '';
                            if (ci < chemContent.length && chemContent[ci] === '{') {
                                const grp = findBraceGroup(chemContent, ci);
                                if (grp) {
                                    supContent = grp.content;
                                    ci = grp.endIdx + 1;
                                }
                            } else {
                                supContent = chemContent[ci] || '';
                                ci++;
                            }
                            const base = components.pop();
                            const baseChildren = base ? [base] : [new MathRun('')];
                            components.push(new MathSuperScript({
                                children: baseChildren,
                                superScript: [new MathRun(supContent)],
                            }));
                            continue;
                        }
                        // Subscript notation: _{...}
                        if (ch === '_') {
                            ci++;
                            let subContent = '';
                            if (ci < chemContent.length && chemContent[ci] === '{') {
                                const grp = findBraceGroup(chemContent, ci);
                                if (grp) {
                                    subContent = grp.content;
                                    ci = grp.endIdx + 1;
                                }
                            } else {
                                subContent = chemContent[ci] || '';
                                ci++;
                            }
                            const base = components.pop();
                            const baseChildren = base ? [base] : [new MathRun('')];
                            components.push(new MathSubScript({
                                children: baseChildren,
                                subScript: [new MathRun(subContent)],
                            }));
                            continue;
                        }
                        // Up/down arrows in chemistry (gas/precipitate)
                        if (chemContent.startsWith('\\uparrow', ci)) {
                            components.push(new MathRun('↑'));
                            ci += 8;
                            continue;
                        }
                        if (chemContent.startsWith('\\downarrow', ci)) {
                            components.push(new MathRun('↓'));
                            ci += 10;
                            continue;
                        }
                        // Regular character
                        textBuffer += ch;
                        ci++;
                    }
                    flushText();
                    continue;
                }
            }
            textBuffer += latex.startsWith('\\ce', i - cmdLen) ? 'ce' : 'pu';
            continue;
        }

        // === \boxed{...} — Đáp án khung vuông → render [content] ===
        if (latex.startsWith('\\boxed', i)) {
            flushText();
            const cmdEnd = latex.indexOf('{', i);
            if (cmdEnd !== -1) {
                const body = findBraceGroup(latex, cmdEnd);
                if (body) {
                    i = body.endIdx + 1;
                    components.push(new MathRun('['));
                    components.push(...parseLatexToMathComponents(body.content));
                    components.push(new MathRun(']'));
                    continue;
                }
            }
            i += 6; // skip \boxed
            continue;
        }

        // === \vec{AB}, \overrightarrow{AB}, \hat{A}, \overline{AB}, \bar{x}, \tilde{x}, \widehat{ABC} ===
        // These commands take a body argument and render as: body + decoration symbol
        const decorationCmds: Record<string, string> = {
            '\\overrightarrow': '⃗', '\\overleftarrow': '←',
            '\\vec': '⃗',
            '\\widehat': '̂', '\\hat': '̂',
            '\\overline': '̅', '\\bar': '̅',
            '\\widetilde': '̃', '\\tilde': '̃',
            '\\dot': '̇', '\\ddot': '̈',
            '\\underline': '̲',
        };
        let matchedDecCmd = '';
        for (const dcmd of Object.keys(decorationCmds)) {
            if (latex.startsWith(dcmd, i)) {
                matchedDecCmd = dcmd;
                break;
            }
        }
        if (matchedDecCmd) {
            flushText();
            i += matchedDecCmd.length;
            while (i < latex.length && latex[i] === ' ') i++;
            if (i < latex.length && latex[i] === '{') {
                const body = findBraceGroup(latex, i);
                if (body) {
                    i = body.endIdx + 1;
                    const bodyContent = body.content.trim();
                    // Render body text then add decoration combining character
                    components.push(...parseLatexToMathComponents(bodyContent));
                    const decoChar = decorationCmds[matchedDecCmd];
                    if (decoChar) {
                        components.push(new MathRun(decoChar));
                    }
                    continue;
                }
            }
            // No body - use as plain symbol
            textBuffer += decorationCmds[matchedDecCmd] || '';
            continue;
        }

        // === \left( ... \right) — brackets ===
        // Guard: \left must be followed by a delimiter, not a letter (to avoid matching \leftarrow etc.)
        if (latex.startsWith('\\left', i) && (i + 5 >= latex.length || !/[a-zA-Z]/.test(latex[i + 5]))) {
            flushText();
            i += 5;
            while (i < latex.length && latex[i] === ' ') i++;
            let openChar = latex[i] || '(';
            i++;
            // Handle \left\{ and \left\| (escaped brackets)
            if (openChar === '\\' && i < latex.length) {
                openChar = latex[i]; // The actual bracket char: { } |
                i++;
            }
            // Handle \left. (invisible delimiter)
            if (openChar === '.') openChar = '';
            // Find matching \right (but not \rightarrow, \rightharpoonup, etc.)
            // Must track depth for nested \left...\right pairs
            let rightIdx = -1;
            let searchFrom = i;
            let depth = 1; // We already consumed one \left
            while (searchFrom < latex.length && depth > 0) {
                // Find next \left or \right
                const nextLeft = latex.indexOf('\\left', searchFrom);
                const nextRight = latex.indexOf('\\right', searchFrom);
                
                if (nextRight === -1) break; // No more \right → unmatched
                
                // Check if nextLeft is a real \left (not \leftarrow)
                const isRealLeft = nextLeft !== -1 && nextLeft < nextRight && 
                    (nextLeft + 5 >= latex.length || !/[a-zA-Z]/.test(latex[nextLeft + 5]));
                
                if (isRealLeft) {
                    depth++;
                    searchFrom = nextLeft + 5;
                    continue;
                }
                
                // Check if nextRight is a real \right (not \rightarrow)
                const afterRight = nextRight + 6;
                if (afterRight >= latex.length || !/[a-zA-Z]/.test(latex[afterRight])) {
                    depth--;
                    if (depth === 0) {
                        rightIdx = nextRight;
                        break;
                    }
                }
                searchFrom = nextRight + 6;
            }
            if (rightIdx !== -1) {
                const innerContent = latex.substring(i, rightIdx);
                i = rightIdx + 6;
                while (i < latex.length && latex[i] === ' ') i++;
                // Capture closing char BEFORE consuming it
                let closeChar = '';
                if (i < latex.length && latex[i] === '\\') {
                    closeChar = latex[i + 1] || '';
                    i += 2; // skip \} or \|
                } else if (i < latex.length) {
                    closeChar = latex[i];
                    i++; // skip ) ] . etc.
                }
                if (closeChar === '.') closeChar = ''; // \right. = invisible
                const inner = parseLatexToMathComponents(innerContent);
                if (openChar === '(' || openChar === ')') {
                    components.push(new MathRoundBrackets({ children: inner }));
                } else if (openChar === '[' || openChar === ']') {
                    components.push(new MathSquareBrackets({ children: inner }));
                } else if (openChar === '{' || openChar === '}') {
                    components.push(new MathCurlyBrackets({ children: inner }));
                } else if (openChar === '|') {
                    // |...| → just output content with | chars
                    components.push(new MathRun('|'));
                    components.push(...inner);
                    components.push(new MathRun('|'));
                } else {
                    // \left. ... \right) (invisible left) → render inner + closing bracket
                    components.push(...inner);
                    if (closeChar && closeChar !== '.') {
                        components.push(new MathRun(closeChar));
                    }
                }
            } else {
                textBuffer += openChar;
            }
            continue;
        }

        // === Superscript ^ ===
        if (ch === '^') {
            flushText();
            i++;
            let supContent: string;
            if (i < latex.length && latex[i] === '{') {
                const group = findBraceGroup(latex, i);
                if (group) { supContent = group.content; i = group.endIdx + 1; }
                else { supContent = latex[i] || ''; i++; }
            } else {
                supContent = latex[i] || '';
                i++;
            }
            const base = components.pop();
            const baseChildren = base ? [base] : [new MathRun('')];

            // Check if followed by subscript
            if (i < latex.length && latex[i] === '_') {
                i++;
                let subContent: string;
                if (i < latex.length && latex[i] === '{') {
                    const group = findBraceGroup(latex, i);
                    if (group) { subContent = group.content; i = group.endIdx + 1; }
                    else { subContent = latex[i] || ''; i++; }
                } else { subContent = latex[i] || ''; i++; }
                components.push(new MathSubSuperScript({
                    children: baseChildren,
                    superScript: parseLatexToMathComponents(supContent),
                    subScript: parseLatexToMathComponents(subContent),
                }));
            } else {
                components.push(new MathSuperScript({
                    children: baseChildren,
                    superScript: parseLatexToMathComponents(supContent),
                }));
            }
            continue;
        }

        // === Subscript _ ===
        if (ch === '_') {
            flushText();
            i++;
            let subContent: string;
            if (i < latex.length && latex[i] === '{') {
                const group = findBraceGroup(latex, i);
                if (group) { subContent = group.content; i = group.endIdx + 1; }
                else { subContent = latex[i] || ''; i++; }
            } else {
                subContent = latex[i] || '';
                i++;
            }
            const base = components.pop();
            const baseChildren = base ? [base] : [new MathRun('')];

            // Check if followed by superscript
            if (i < latex.length && latex[i] === '^') {
                i++;
                let supContent: string;
                if (i < latex.length && latex[i] === '{') {
                    const group = findBraceGroup(latex, i);
                    if (group) { supContent = group.content; i = group.endIdx + 1; }
                    else { supContent = latex[i] || ''; i++; }
                } else { supContent = latex[i] || ''; i++; }
                components.push(new MathSubSuperScript({
                    children: baseChildren,
                    superScript: parseLatexToMathComponents(supContent),
                    subScript: parseLatexToMathComponents(subContent),
                }));
            } else {
                components.push(new MathSubScript({
                    children: baseChildren,
                    subScript: parseLatexToMathComponents(subContent),
                }));
            }
            continue;
        }

        // === Braces {} — group ===
        if (ch === '{') {
            flushText();
            const group = findBraceGroup(latex, i);
            if (group) {
                components.push(...parseLatexToMathComponents(group.content));
                i = group.endIdx + 1;
            } else {
                i++;
            }
            continue;
        }
        if (ch === '}') { i++; continue; }

        // === \begin{environment}...\end{environment} ===
        if (ch === '\\' && latex.startsWith('\\begin{', i)) {
            flushText();
            // Extract environment name
            const envStart = i + 7; // after \begin{
            const envClose = latex.indexOf('}', envStart);
            if (envClose !== -1) {
                const envName = latex.substring(envStart, envClose);
                const endTag = `\\end{${envName}}`;
                const endIdx = latex.indexOf(endTag, envClose + 1);
                if (endIdx !== -1) {
                    const envContent = latex.substring(envClose + 1, endIdx);
                    i = endIdx + endTag.length;
                    
                    // Split rows by LaTeX linebreak (\\), \\cr, or \n
                    // In JS string: '\\\\' = 2 chars = LaTeX \\
                    const ROW_SPLIT = /\\\\|\\cr|\n/;
                    let rows = envContent.split(ROW_SPLIT).map(r => r.trim()).filter(Boolean);
                    
                    if (envName === 'cases') {
                        // Hệ phương trình: dùng OMML equation array xếp chồng trong ngoặc nhọn
                        // Giống LaTeX \begin{cases} x=1 \\ y=2 \end{cases}
                        const mathRows: MathComponent[][] = rows.map(row => {
                            const cleanRow = row.replace(/&/g, ' ').trim();
                            return parseLatexToMathComponents(cleanRow);
                        });
                        components.push(createCasesOmml(mathRows) as any);
                    } else if (envName === 'aligned' || envName === 'align' || envName === 'eqnarray') {
                        // Phương trình nhiều dòng: dùng OMML equation array xếp chồng (KHÔNG ngoặc)
                        const mathRows: MathComponent[][] = rows.map(row => {
                            const cleanRow = row.replace(/&/g, ' ').trim();
                            return parseLatexToMathComponents(cleanRow);
                        });
                        components.push(createAlignedOmml(mathRows) as any);
                    } else if (envName === 'pmatrix') {
                        // Ma trận ngoặc tròn
                        const rowComponents: MathComponent[] = [];
                        rows.forEach((row, idx) => {
                            const cells = row.split('&').map(c => c.trim());
                            cells.forEach((cell, ci) => {
                                rowComponents.push(...parseLatexToMathComponents(cell));
                                if (ci < cells.length - 1) rowComponents.push(new MathRun(' , '));
                            });
                            if (idx < rows.length - 1) rowComponents.push(new MathRun(' ; '));
                        });
                        components.push(new MathRoundBrackets({ children: rowComponents }));
                    } else if (envName === 'bmatrix') {
                        // Ma trận ngoặc vuông
                        const rowComponents: MathComponent[] = [];
                        rows.forEach((row, idx) => {
                            const cells = row.split('&').map(c => c.trim());
                            cells.forEach((cell, ci) => {
                                rowComponents.push(...parseLatexToMathComponents(cell));
                                if (ci < cells.length - 1) rowComponents.push(new MathRun(' , '));
                            });
                            if (idx < rows.length - 1) rowComponents.push(new MathRun(' ; '));
                        });
                        components.push(new MathSquareBrackets({ children: rowComponents }));
                    } else if (envName === 'vmatrix' || envName === 'Vmatrix' || envName === 'matrix') {
                        // vmatrix: |...| (determinant), Vmatrix: ‖...‖, matrix: no brackets
                        const rowComponents: MathComponent[] = [];
                        rows.forEach((row, idx) => {
                            const cells = row.split('&').map(c => c.trim());
                            cells.forEach((cell, ci) => {
                                rowComponents.push(...parseLatexToMathComponents(cell));
                                if (ci < cells.length - 1) rowComponents.push(new MathRun(' , '));
                            });
                            if (idx < rows.length - 1) rowComponents.push(new MathRun(' ; '));
                        });
                        if (envName === 'vmatrix') {
                            components.push(new MathRun('|'));
                            components.push(...rowComponents);
                            components.push(new MathRun('|'));
                        } else if (envName === 'Vmatrix') {
                            components.push(new MathRun('‖'));
                            components.push(...rowComponents);
                            components.push(new MathRun('‖'));
                        } else {
                            components.push(...rowComponents);
                        }
                    } else {
                        // Fallback: render nội dung trực tiếp
                        const cleanContent = envContent.replace(/\\\\\\\\/g, ' ; ').replace(/&/g, ' ');
                        components.push(...parseLatexToMathComponents(cleanContent));
                    }
                    continue;
                }
            }
            // Fallback if \begin not matched
            textBuffer += '\\begin';
            i += 6;
            continue;
        }

        // === \command — symbols ===
        if (ch === '\\') {
            flushText();
            
            // Special escaped characters: \{ \} \| \# \& \_
            const nextCh = i + 1 < latex.length ? latex[i + 1] : '';
            if ('{}'.includes(nextCh)) {
                textBuffer += nextCh;
                i += 2;
                continue;
            }
            if (nextCh === '|') {
                textBuffer += '|';
                i += 2;
                continue;
            }
            if ('#&_'.includes(nextCh)) {
                textBuffer += nextCh;
                i += 2;
                continue;
            }
            // LaTeX spacing: \, \; \: → thin/medium/thick space, \! → no space, \  → normal space
            if (',;:'.includes(nextCh)) {
                textBuffer += ' '; // thin/medium/thick space → regular space in Word
                i += 2;
                continue;
            }
            if (nextCh === '!') {
                i += 2; // negative thin space → skip
                continue;
            }
            if (nextCh === ' ') {
                textBuffer += ' '; // backslash-space → regular space
                i += 2;
                continue;
            }
            if (nextCh === '%') {
                textBuffer += '%';
                i += 2;
                continue;
            }
            if (nextCh === '$') {
                textBuffer += '$';
                i += 2;
                continue;
            }
            
            // Extract command name
            let cmdEnd = i + 1;
            while (cmdEnd < latex.length && /[a-zA-Z]/.test(latex[cmdEnd])) cmdEnd++;
            const cmd = latex.substring(i, cmdEnd);

            // Known symbols
            if (cmd in LATEX_SYMBOLS) {
                textBuffer += LATEX_SYMBOLS[cmd];
                i = cmdEnd;
                continue;
            }

            // Functions: sin, cos, tan, log, ln, lim, max, min, etc.
            const funcNames = ['sin', 'cos', 'tan', 'cot', 'sec', 'csc', 'arcsin', 'arccos', 'arctan',
                'log', 'ln', 'lg', 'exp', 'lim', 'max', 'min', 'sup', 'inf', 'det', 'gcd', 'mod', 'dim'];
            const fnName = cmd.substring(1); // remove \
            if (funcNames.includes(fnName)) {
                textBuffer += fnName;
                i = cmdEnd;
                continue;
            }

            // Display/layout/visual-only commands → silently skip (no visual in Word OMML)
            const skipCmds = ['\\no', '\\limits', '\\nolimits', '\\displaystyle', '\\textstyle', '\\scriptstyle', '\\scriptscriptstyle', '\\nonumber', '\\notag', '\\hspace', '\\vspace', '\\phantom', '\\hfill', '\\vfill', '\\noindent', '\\centering', '\\color', '\\textcolor', '\\colorbox', '\\cancel', '\\bcancel', '\\xcancel', '\\tag', '\\label', '\\ref', '\\eqref', '\\mbox', '\\kern', '\\mkern', '\\rule', '\\strut', '\\smash'];
            if (skipCmds.includes(cmd)) { 
                // Some of these can have optional {size} argument → skip it too
                if (i < latex.length && latex[cmdEnd] === '{') {
                    const skip = findBraceGroup(latex, cmdEnd);
                    if (skip) i = skip.endIdx + 1; else i = cmdEnd;
                } else {
                    i = cmdEnd; 
                }
                continue; 
            }

            // Unknown command — output as-is
            textBuffer += cmd.substring(1);
            i = cmdEnd;
            continue;
        }

        // === Space ===
        if (ch === ' ' || ch === '~') {
            textBuffer += ' ';
            i++;
            continue;
        }

        // === Regular character ===
        textBuffer += ch;
        i++;
    }

    flushText();
    return components;
};

// Chuyển LaTeX string thành DocxMath object
const latexToDocxMath = (latexStr: string): DocxMath => {
    // Bỏ $ bao quanh
    let inner = latexStr.trim();
    if (inner.startsWith('$$') && inner.endsWith('$$')) inner = inner.slice(2, -2).trim();
    else if (inner.startsWith('$') && inner.endsWith('$')) inner = inner.slice(1, -1).trim();
    
    // Pre-process chemistry arrows (not standard LaTeX but AI often uses them)
    inner = inner.replace(/<==>/g, '⇔');
    inner = inner.replace(/<=>/g, '⇌');
    inner = inner.replace(/<->/g, '↔');
    inner = inner.replace(/->/g, '→');
    inner = inner.replace(/<-(?![0-9])/g, '←');
    
    try {
        const components = parseLatexToMathComponents(inner);
        if (components.length === 0) components.push(new MathRun(inner));
        return new DocxMath({ children: components });
    } catch (e) {
        // Fallback: nếu parse thất bại, chèn raw text
        return new DocxMath({ children: [new MathRun(inner)] });
    }
};

const parseNonMathFormatting = (text: string, options: { defaultBold?: boolean; defaultItalic?: boolean; size?: number; } = {}): ParagraphChild[] => {
    const { defaultBold = false, defaultItalic = false, size = FONT_SIZE_TEXT } = options;

    if (!text) return [];
    
    const sanitizedText = sanitizeText(text);
    // Regex logic:
    // 0. Math: $$...$$ or $...$
    // 1. Digital Competence: [DL.1.1]
    // 2. Bold: **text**
    // 3. Italic: *text*
    // 4. Images: [HÌNH ẢNH: ...] or [HÌNH_1]
    // 5. Digital Competence Old: [TD...]
    // 6. Inline code: `code`
    
    const parts = sanitizedText.split(/(\$\$[^$]+?\$\$|\$[^$\n]+?\$)|(\[(?:DL|GT|ST|AT|GQ)\.\d+(?:\.\d+)?\])|(\[TD\.[^\]]+\])|(\*\*[^\*]+\*\*)|(\*[^\*]+\*)|(\[HÌNH ẢNH:[^\]]+\])|(`[^`]+`)/g).filter(Boolean);
    
    return parts.flatMap(part => {
        // MATCH MATH → DocxMath (OMML)
        if (part.startsWith('$') && part.endsWith('$')) {
             return latexToDocxMath(part);
        }
        // MATCH DIGITAL COMPETENCE (NEW CV 3456) -> Purple
        if (/^\[(?:DL|GT|ST|AT|GQ)\.\d+(?:\.\d+)?\]$/.test(part)) {
             return new TextRun({ text: ` ${part} `, bold: true, color: "7030A0", font: FONT_FAMILY, size: 22 }); // Purple color
        }
        // MATCH OLD DIGITAL COMPETENCE TAGS
        if (part.startsWith('[TD.') && part.endsWith(']')) {
            return new TextRun({ text: ` ${part} `, bold: true, color: "7030A0", font: FONT_FAMILY, size: 22 });
        }
        if (part.startsWith('[HÌNH ẢNH:') && part.endsWith(']')) {
             return new TextRun({ text: part, bold: true, color: "C00000", highlight: "yellow", font: FONT_FAMILY, size: size });
        }
        // BOLD TEXT handling
        if (part.startsWith('**') && part.endsWith('**')) {
            const innerText = part.slice(2, -2);
            const isActivityTitle = innerText.trim().toUpperCase().startsWith("HOẠT ĐỘNG") || innerText.trim().toUpperCase().startsWith("HƯỚNG DẪN VỀ NHÀ");
            // Check if bold text contains inline math → parse recursively
            if (/\$[^$]+\$/.test(innerText)) {
                const innerParts = innerText.split(/(\$\$?[^$]+?\$\$?)/g).filter(Boolean);
                return innerParts.map(ip => {
                    if (ip.startsWith('$') && ip.endsWith('$')) {
                        return latexToDocxMath(ip);
                    }
                    return new TextRun({ 
                        text: ip, bold: true, italics: defaultItalic,
                        color: isActivityTitle ? ACTIVITY_TITLE_COLOR : "000000",
                        font: FONT_FAMILY, size: size 
                    });
                });
            }
            return new TextRun({ 
                text: innerText, 
                bold: true, 
                italics: defaultItalic, 
                color: isActivityTitle ? ACTIVITY_TITLE_COLOR : "000000",
                font: FONT_FAMILY, 
                size: size 
            });
        }
        if (part.startsWith('*') && part.endsWith('*')) {
            const innerItalic = part.slice(1, -1);
            // Check if italic text contains inline math → parse recursively
            if (/\$[^$]+\$/.test(innerItalic)) {
                const innerParts = innerItalic.split(/(\$\$?[^$]+?\$\$?)/g).filter(Boolean);
                return innerParts.map(ip => {
                    if (ip.startsWith('$') && ip.endsWith('$')) {
                        return latexToDocxMath(ip);
                    }
                    return new TextRun({ text: ip, bold: defaultBold, italics: true, font: FONT_FAMILY, size: size });
                });
            }
            return new TextRun({ text: innerItalic, bold: defaultBold, italics: true, font: FONT_FAMILY, size: size });
        }
        // Inline code: `code` → strip backticks, render in bold
        if (part.startsWith('`') && part.endsWith('`')) {
            return new TextRun({ text: part.slice(1, -1), bold: true, font: FONT_FAMILY, size: size, color: "333333" });
        }
        // Basic text run
        return new TextRun({ text: part, bold: defaultBold, italics: defaultItalic, font: FONT_FAMILY, size: size });
    });
};

const generateParagraphChildren = (
    line: string,
    imageBlocks: (ImageRun | TextRun)[],
    options: { defaultBold?: boolean; defaultItalic?: boolean; size?: number; } = {}
): ParagraphChild[] => {
    const children: ParagraphChild[] = [];
    const parts = line.split(new RegExp(`(${IMAGE_PLACEHOLDER}\\d+___)`));

    parts.forEach(part => {
        if (!part) return;

        const imageMatch = part.match(new RegExp(`${IMAGE_PLACEHOLDER}(\\d+)___`));
        if (imageMatch) {
            const block = imageBlocks[parseInt(imageMatch[1], 10)];
            if (block) children.push(block);
            return;
        }

        children.push(...parseNonMathFormatting(part, options));
    });
    return children;
};

// HELPER: Convert a cell's text content (possibly with \n or <br>) into distinct Paragraphs
const parseCellContentToParagraphs = (
    cellText: string,
    imageBlocks: (ImageRun | TextRun)[],
    options: { defaultBold?: boolean; defaultItalic?: boolean; size?: number; alignment?: typeof AlignmentType[keyof typeof AlignmentType]; } = {}
): Paragraph[] => {
    let decoded = decodeHtmlEntities(cellText.trim());
    
    // === BƯỚC -1: CLEAN UP BACKSLASH ARTIFACTS ===
    // AI hay sinh backslash thừa trong cell markdown (VD: "TN\\", "2\\")
    // Strip orphan trailing backslash(es)
    decoded = decoded.replace(/\\+\s*$/g, '');
    // Remove lone backslash NOT part of LaTeX command (\\begin, \\frac, etc.)
    decoded = decoded.replace(/\\(?![a-zA-Z\\$_^{(\[n])/g, '');
    
    // === BƯỚC 0: BẢO VỆ MATH BLOCKS TRƯỚC MỌI BIẾN ĐỔI ===
    // Phải tokenize math TRƯỚC KHI replace \\\\ → \n, nếu không \\\\
    // trong $\begin{cases} x=1 \\\\ x=2 \end{cases}$ sẽ bị cắt đôi
    const mathTokens: string[] = [];
    decoded = decoded.replace(/(\$\$?[^$]+?\$\$?)/g, (match) => {
        mathTokens.push(match);
        return `__MATH_TOKEN_${mathTokens.length - 1}__`;
    });
    
    // Convert LaTeX double-backslash line breaks to newline (but not inside math)
    // Math blocks đã được bảo vệ bằng token nên không bị ảnh hưởng
    decoded = decoded.replace(/\\\\(?![a-zA-Z])/g, '\n');

    // --- ENHANCEMENT: Force new lines for logical sections ---
    const steps = ["Chuyển giao", "Thực hiện", "Báo cáo", "Kết luận"];
    steps.forEach(step => {
        const boldRegex = new RegExp(`(\\*\\*\\s*${step})`, 'gi'); 
        decoded = decoded.replace(boldRegex, '\n$1');
        const plainRegex = new RegExp(`(?<=\\S)\\s+(${step}\\s*:)`, 'gi');
        decoded = decoded.replace(plainRegex, '\n$1');
    });

    // Ensure Activity titles also break lines
    decoded = decoded.replace(/(\*\*HOẠT ĐỘNG)/gi, '\n$1');
    decoded = decoded.replace(/(\*\*HƯỚNG DẪN VỀ NHÀ)/gi, '\n$1');

    // Force list items to break lines
    decoded = decoded.replace(/([.:;?!])\s+([-+•])\s+/g, '$1\n$2 ');

    // === KHÔI PHỤC MATH BLOCKS ===
    decoded = decoded.replace(/__MATH_TOKEN_(\d+)__/g, (_, index) => {
        return mathTokens[parseInt(index, 10)];
    });

    // Split and filter empty lines to avoid double spacing
    const lines = decoded.split(/\n|<br\s*\/?>|___BR___/gi).filter(line => line.trim().length > 0);

    return lines.map(line => {
        const trimmed = line.trim();
        
        // Detect if line is a list item
        const isList = /^[-*+•]\s/.test(trimmed);
        
        // --- STYLING: Add extra spacing for main sections ---
        const upperLine = trimmed.toUpperCase();
        const isActivityTitle = upperLine.startsWith("**HOẠT ĐỘNG") || upperLine.startsWith("**HƯỚNG DẪN VỀ NHÀ");
        const isStep = steps.some(step => upperLine.startsWith(`**${step.toUpperCase()}`));

        let beforeSpacing = 60; // Default spacing (approx 3pt)
        if (isActivityTitle) beforeSpacing = 120; // 6pt
        else if (isStep) beforeSpacing = 120; // 6pt

        return new Paragraph({
            children: generateParagraphChildren(trimmed, imageBlocks, options),
            spacing: { after: 60, before: beforeSpacing },
            alignment: options.alignment || AlignmentType.LEFT,
            // Hanging indent for list items: Indent left 300twips (~0.5cm), hanging 300twips
            indent: isList ? { left: 450, hanging: 300 } : undefined 
        });
    });
};

const createCell = (text: string, options: {
    columnSpan?: number;
    verticalMerge?: any; 
    isHeader?: boolean;
} = {}): TableCell => {
    return new TableCell({
        children: [new Paragraph({
            children: [new TextRun({ text, bold: options.isHeader, font: FONT_FAMILY, size: 20 })],
            alignment: AlignmentType.CENTER,
            spacing: { after: 80, before: 80 }
        })],
        verticalAlign: VerticalAlign.CENTER,
        columnSpan: options.columnSpan,
        verticalMerge: options.verticalMerge,
        borders: {
            top: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
            bottom: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
            left: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
            right: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
        },
        shading: options.isHeader ? { fill: TABLE_HEADER_BG, type: ShadingType.CLEAR } : undefined,
    });
};

const createExamHeader = (headerData: ExamHeader): Table => {
    const leftChildren: (Paragraph | Table)[] = [];
    if (headerData.topLeft && Array.isArray(headerData.topLeft)) {
        headerData.topLeft.forEach((line: string, index: number) => {
            const isLastLine = index === headerData.topLeft!.length - 1;
            leftChildren.push(new Paragraph({
                children: [new TextRun({ text: safeUpperCase(line), bold: true, font: FONT_FAMILY, size: 22 })],
                alignment: AlignmentType.CENTER,
                spacing: { after: 60 }
            }));
            // Gạch ngang phân cách dưới tên trường (chuẩn đề thi VN)
            if (isLastLine) {
                leftChildren.push(new Paragraph({
                    children: [new TextRun({ text: '————————————', font: FONT_FAMILY, size: 20 })],
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 60 }
                }));
            }
        });
    }

    if (headerData.isOfficial) {
        leftChildren.push(new Paragraph({ text: "", spacing: { after: 60 } }));
        leftChildren.push(new Table({
            rows: [new TableRow({ 
                children: [new TableCell({
                    children: [new Paragraph({
                        children: [new TextRun({ text: "ĐỀ CHÍNH THỨC", bold: true, font: FONT_FAMILY, size: 22 })],
                        alignment: AlignmentType.CENTER,
                        spacing: { before: 60, after: 60 }
                    })],
                    borders: {
                        top: { style: BorderStyle.SINGLE, size: 12 },
                        bottom: { style: BorderStyle.SINGLE, size: 12 },
                        left: { style: BorderStyle.SINGLE, size: 12 },
                        right: { style: BorderStyle.SINGLE, size: 12 },
                    },
                    width: { size: 100, type: WidthType.PERCENTAGE },
                })] 
            })],
            alignment: AlignmentType.CENTER,
            width: { size: 60, type: WidthType.PERCENTAGE } 
        }));
    }

    const rightChildren: Paragraph[] = [];
    if (headerData.topRight && Array.isArray(headerData.topRight)) {
        headerData.topRight.forEach((line: string, index: number) => {
             const isTime = line.toLowerCase().includes("thời gian") || line.toLowerCase().includes("không kể");
             rightChildren.push(new Paragraph({
                children: [new TextRun({ 
                    text: index === 0 ? safeUpperCase(line) : line, 
                    bold: !isTime, 
                    italics: isTime,
                    font: FONT_FAMILY, 
                    size: 22 
                })],
                alignment: AlignmentType.CENTER,
                spacing: { after: 60 }
            }));
        });
    }

    return new Table({
        rows: [
            new TableRow({
                children: [
                    new TableCell({
                        children: leftChildren.length > 0 ? leftChildren : [new Paragraph({ text: '' })],
                        width: { size: 40, type: WidthType.PERCENTAGE },
                        verticalAlign: VerticalAlign.TOP,
                        borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } }
                    }),
                    new TableCell({
                        children: rightChildren.length > 0 ? rightChildren : [new Paragraph({ text: '' })],
                        width: { size: 60, type: WidthType.PERCENTAGE },
                        verticalAlign: VerticalAlign.TOP,
                        borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } }
                    })
                ]
            })
        ],
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } }
    });
};

const createTableFromMarkdown = (
    rows: string[],
    isMatrixTable: boolean = false,
    imageBlocks: (ImageRun | TextRun)[]
): Table => {
    // SMART TABLE PARSING: Protect math content (e.g. $|x|$, $$|x|+|y|$$) from being split by pipe chars
    const splitRowSafely = (row: string): string[] => {
        const trimmed = row.trim();
        // Remove leading/trailing pipes
        const content = trimmed.replace(/^\|/, '').replace(/\|$/, '');
        
        // Protect content inside $...$ and $$...$$ from pipe splitting
        const tokens: string[] = [];
        let current = '';
        let inMath = false;
        let inDisplayMath = false;
        for (let ci = 0; ci < content.length; ci++) {
            const ch = content[ci];
            if (ch === '$' && (ci === 0 || content[ci-1] !== '\\')) {
                // Check for $$ (display math)
                if (ci + 1 < content.length && content[ci + 1] === '$') {
                    if (inDisplayMath) {
                        inDisplayMath = false;
                    } else {
                        inDisplayMath = true;
                    }
                    current += '$$';
                    ci++; // skip second $
                } else {
                    inMath = !inMath;
                    current += ch;
                }
            } else if (ch === '|' && !inMath && !inDisplayMath) {
                tokens.push(current);
                current = '';
            } else {
                current += ch;
            }
        }
        tokens.push(current);
        return tokens;
    };
    
    const parsedRows = rows.map(splitRowSafely);

    if (parsedRows.length === 0) return new Table({ rows: [] });

    // Determine the number of columns from the first row (header)
    const headerCells = parsedRows[0];
    const numColumns = headerCells.length;

    const finalTableRows: TableRow[] = [];

    parsedRows.forEach((cells, rowIndex) => {
        const isHeaderRow = rowIndex === 0;
        
        // Normalize cell count to match header
        const normalizedCells = [...cells];
        if (normalizedCells.length < numColumns) {
            // Pad missing cells with empty strings
            while (normalizedCells.length < numColumns) {
                normalizedCells.push("");
            }
        } else if (normalizedCells.length > numColumns) {
            // If there are too many cells (rare but possible with bad MD), join extras to the last cell
            const extraContent = normalizedCells.slice(numColumns - 1).join(" ");
            normalizedCells[numColumns - 1] = extraContent;
            normalizedCells.length = numColumns;
        }

        // --- NEW FEATURE: Detect Activity Title and Merge Cells ---
        // For Lesson Plans, if cell[0] starts with **HOẠT ĐỘNG...**, we want to split it into a header row (merged) and body row.
        let activityHeaderMatch = null;
        if (!isHeaderRow && !isMatrixTable && numColumns === 3) { // Specific check for 3-column Lesson Plan table
             const rawText = normalizedCells[0].replace(/^(?:<br\s*\/?>|___BR___|\s)+/i, '').trim(); // Clean leading breaks
             // Match **HOẠT ĐỘNG...** or **HƯỚNG DẪN...** at the very start
             // Regex groups: 1=Title, 2=Body. We expect AI to put at least a newline or <br> after title.
             activityHeaderMatch = rawText.match(/^(\*\*(?:HOẠT ĐỘNG|HƯỚNG DẪN VỀ NHÀ)[\s\S]*?\*\*)((?:<br\s*\/?>|___BR___|\n|[\s\S])*)$/i);
        }

        if (activityHeaderMatch) {
             const titleText = activityHeaderMatch[1].replace(/\*\*/g, '').trim(); // Remove **
             const bodyText = activityHeaderMatch[2].trim();
             
             // 1. Create Merged Header Row for Activity Title
             const titleRow = new TableRow({
                 children: [new TableCell({
                     children: [new Paragraph({
                         children: [new TextRun({
                             text: titleText.toUpperCase(),
                             bold: true,
                             font: FONT_FAMILY,
                             size: 24, // Slightly larger than text
                             color: ACTIVITY_TITLE_COLOR 
                         })],
                         alignment: AlignmentType.CENTER,
                         spacing: { before: 120, after: 120 }
                     })],
                     columnSpan: numColumns,
                     verticalAlign: VerticalAlign.CENTER,
                     shading: { fill: ACTIVITY_HEADER_BG, type: ShadingType.CLEAR }, // Light gray background
                     borders: { top: { style: BorderStyle.SINGLE, size: 4 }, bottom: { style: BorderStyle.SINGLE, size: 4 }, left: { style: BorderStyle.SINGLE, size: 4 }, right: { style: BorderStyle.SINGLE, size: 4 } }
                 })]
             });
             finalTableRows.push(titleRow);
             
             // 2. Update Cell 0 content for the body row to be just the body text
             normalizedCells[0] = bodyText;
        }
        
        // Standard Cell creation (or Body row if split)
        const tableCells = normalizedCells.map(cellText => {
            // Smart alignment: nội dung ngắn (số liệu) → căn giữa, text dài → căn trái
            const cellTextTrimmed = cellText.trim();
            const isShortContent = cellTextTrimmed.length < 8 || /^[\d/|.,\s]+$/.test(cellTextTrimmed);
            const cellAlign = isHeaderRow || isShortContent ? AlignmentType.CENTER : AlignmentType.LEFT;
            
            const cellOptions = { 
                defaultBold: isHeaderRow, 
                size: isMatrixTable ? 22 : FONT_SIZE_TEXT, // 11pt for matrix, 13pt for normal
                alignment: cellAlign
            };
            
            const cellParagraphs = parseCellContentToParagraphs(cellText, imageBlocks, cellOptions);

            return new TableCell({
                children: cellParagraphs.length > 0 ? cellParagraphs : [new Paragraph({ text: '' })],
                verticalAlign: isHeaderRow ? VerticalAlign.CENTER : (isShortContent ? VerticalAlign.CENTER : VerticalAlign.TOP),
                borders: {
                    top: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
                    bottom: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
                    left: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
                    right: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
                },
                shading: isHeaderRow ? { fill: TABLE_HEADER_BG, type: ShadingType.CLEAR } : undefined,
                margins: isMatrixTable 
                    ? { top: 60, bottom: 60, left: 100, right: 100 }  // Ma trận: padding rộng hơn
                    : { top: 80, bottom: 80, left: 80, right: 80 }
            });
        });

        finalTableRows.push(new TableRow({ children: tableCells, tableHeader: isHeaderRow }));
    });

    // Smart column widths based on table type
    let columnWidths: number[] | undefined;
    if (isMatrixTable && numColumns > 0) {
        // Ma trận & Đặc tả đề thi: landscape A4 = ~14400 twips
        const totalWidth = 14400;
        
        // === SMART DETECT: Phân tích header để xác định loại bảng ===
        const headerTexts = headerCells.map(c => c.trim().toUpperCase().replace(/\*\*/g, '').replace(/\*/g, ''));
        const hasTTCol = headerTexts[0].includes('TT') || headerTexts[0].includes('STT') || /^\d+$/.test(headerTexts[0].trim());
        const hasMucDoCol = headerTexts.some(h => h.includes('MỨC ĐỘ') || h.includes('MUC DO'));
        const hasTongCol = headerTexts.some(h => h.includes('TỔNG') || h.includes('TONG'));
        const hasTiLeCol = headerTexts.some(h => h.includes('TỈ LỆ') || h.includes('TI LE') || h.includes('%'));
        
        // Detect: Bảng MA TRẬN (có cột Tổng hoặc Tỉ lệ trong header)
        const isMatTran = hasTongCol || hasTiLeCol;
        // Detect: Bảng ĐẶC TẢ (có cột TT + Mức độ đánh giá, KHÔNG phải ma trận)
        const isDacTa = hasTTCol && hasMucDoCol && !isMatTran && numColumns >= 6;
        
        if (isDacTa && numColumns >= 6) {
            // === BẢNG ĐẶC TẢ ===
            // Cấu trúc: TT(4%) | Chủ đề(14%) | Đơn vị KT(14%) | Mức độ đánh giá(36%) | Nhận biết(8%) | Thông hiểu(8%) | Vận dụng(8%) [| VDC(8%)]
            const ttWidth = Math.floor(totalWidth * 0.04);   // TT rất nhỏ
            const topicWidth = Math.floor(totalWidth * 0.13); // Chủ đề
            const unitWidth = Math.floor(totalWidth * 0.14);  // Đơn vị KT
            
            if (numColumns === 7) {
                // 7 cột: TT | Chủ đề | ĐVKT | Mức độ ĐG | NB | TH | VD
                const mucDoWidth = Math.floor(totalWidth * 0.38); // Cột Mức độ cần rộng nhất (chứa nhiều text)
                const levelWidth = Math.floor((totalWidth - ttWidth - topicWidth - unitWidth - mucDoWidth) / 3);
                columnWidths = [ttWidth, topicWidth, unitWidth, mucDoWidth, levelWidth, levelWidth, levelWidth];
            } else if (numColumns === 8) {
                // 8 cột: TT | Chủ đề | ĐVKT | Mức độ ĐG | NB | TH | VD | VDC
                const mucDoWidth = Math.floor(totalWidth * 0.33);
                const levelWidth = Math.floor((totalWidth - ttWidth - topicWidth - unitWidth - mucDoWidth) / 4);
                columnWidths = [ttWidth, topicWidth, unitWidth, mucDoWidth, levelWidth, levelWidth, levelWidth, levelWidth];
            } else {
                // 6 cột hoặc cấu trúc khác: TT nhỏ, cột text rộng, cột số nhỏ
                const mucDoWidth = Math.floor(totalWidth * 0.36);
                const remainingWidth = totalWidth - ttWidth - mucDoWidth;
                const otherWidth = Math.floor(remainingWidth / Math.max(1, numColumns - 2));
                columnWidths = [ttWidth];
                for (let ci = 1; ci < numColumns - 1; ci++) {
                    if (ci === numColumns - 2) columnWidths.push(mucDoWidth); // Cột text dài nhất
                    else columnWidths.push(otherWidth);
                }
                columnWidths.push(otherWidth);
            }
        } else if (numColumns >= 7) {
            // === BẢNG MA TRẬN ===
            if (numColumns === 8) {
                // 8 cột: Chủ đề(16%) | Nội dung(16%) | NB(13%) | TH(13%) | VD(13%) | VDC(13%) | Tổng câu(8%) | Tổng điểm(8%)
                const topicWidth = Math.floor(totalWidth * 0.16);
                const unitWidth = Math.floor(totalWidth * 0.16);
                const lastWidth = Math.floor(totalWidth * 0.08);
                const levelWidth = Math.floor((totalWidth - topicWidth - unitWidth - lastWidth * 2) / 4);
                columnWidths = [topicWidth, unitWidth, levelWidth, levelWidth, levelWidth, levelWidth, lastWidth, lastWidth];
            } else if (numColumns === 7) {
                // 7 cột: Chủ đề(20%) | NB(14%) | TH(14%) | VD(14%) | VDC(14%) | Tổng câu(8%) | Tổng điểm(8%)
                const contentWidth = Math.floor(totalWidth * 0.24);
                const lastWidth = Math.floor(totalWidth * 0.08);
                const levelWidth = Math.floor((totalWidth - contentWidth - lastWidth * 2) / 4);
                columnWidths = [contentWidth, levelWidth, levelWidth, levelWidth, levelWidth, lastWidth, lastWidth];
            } else {
                // 9+ cột: cột đầu rộng, chia đều
                const contentWidth = Math.floor(totalWidth * 0.18);
                const otherWidth = Math.floor((totalWidth - contentWidth) / (numColumns - 1));
                columnWidths = [contentWidth];
                for (let ci = 1; ci < numColumns; ci++) columnWidths.push(otherWidth);
            }
        } else {
            // 5-6 cột: Smart detect cho cấu trúc Đặc tả / Ma trận nhỏ
            if (hasTTCol && numColumns >= 5) {
                // Có cột TT/STT → cấu trúc Đặc tả nhỏ
                // VD: STT | Chủ đề | Mức độ KT cần kiểm tra | Số câu TN | Số câu TL
                const ttWidth = Math.floor(totalWidth * 0.05);   // STT nhỏ
                const lastCols = numColumns >= 5 ? 2 : 1;        // 2 cột cuối (Số câu TN, TL)
                const lastWidth = Math.floor(totalWidth * 0.10); // Mỗi cột số câu 10%
                const middleCols = numColumns - 1 - lastCols;
                const middleWidth = Math.floor((totalWidth - ttWidth - lastWidth * lastCols) / Math.max(1, middleCols));
                columnWidths = [ttWidth];
                for (let ci = 0; ci < middleCols; ci++) columnWidths.push(middleWidth);
                for (let ci = 0; ci < lastCols; ci++) columnWidths.push(lastWidth);
            } else {
                // Không có STT → cột đầu rộng
                const firstColWidth = Math.floor(totalWidth * 0.22);
                const lastColWidth = Math.floor(totalWidth * 0.10);
                const remainingWidth = totalWidth - firstColWidth - lastColWidth;
                const midWidth = Math.floor(remainingWidth / Math.max(1, numColumns - 2));
                columnWidths = [firstColWidth];
                for (let ci = 1; ci < numColumns - 1; ci++) columnWidths.push(midWidth);
                columnWidths.push(lastColWidth);
            }
        }
    } else if (!isMatrixTable) {
        // Giáo án & Phiếu BT: Phân bổ cột tự động dựa trên số cột
        const totalWidth = 10000;
        if (numColumns === 3) {
            columnWidths = [5000, 3000, 2000]; // HĐ GV | HĐ HS | Thiết bị
        } else if (numColumns === 2) {
            columnWidths = [5000, 5000]; // 2 cột bằng nhau
        } else if (numColumns === 4) {
            columnWidths = [3500, 2500, 2000, 2000]; // 4 cột
        } else if (numColumns >= 5) {
            const firstColWidth = Math.floor(totalWidth * 0.3);
            const otherWidth = Math.floor((totalWidth - firstColWidth) / (numColumns - 1));
            columnWidths = [firstColWidth, ...Array(numColumns - 1).fill(otherWidth)];
        }
    }

    return new Table({
        rows: finalTableRows,
        width: { size: 100, type: WidthType.PERCENTAGE },
        columnWidths: columnWidths,
        layout: isMatrixTable ? TableLayoutType.FIXED : TableLayoutType.AUTOFIT,
        alignment: AlignmentType.CENTER
    });
};

const processMarkdownToDocxChildren = (
    markdown: string,
    options: {
        isElementaryExam?: boolean;
        isMatrixSection?: boolean;
        generatedPdfImages?: { placeholderId: string; base64: string; width?: number; height?: number }[];
        generatedLessonImages?: { description: string; base64: string; }[];
    } = {}
): any[] => {
    if (!markdown) return [];
    
    // Post-process LaTeX trước khi convert sang Word (đồng bộ với preview KaTeX)
    let cleanMarkdown = fixLatexErrors(decodeHtmlEntities(markdown));
    // SMART <br> handling: Inside table rows (lines starting with |), preserve <br> as placeholder
    // to avoid breaking table row structure. Outside tables, convert to \n normally.
    cleanMarkdown = cleanMarkdown.split('\n').map(line => {
        const trimmed = line.trim();
        if (trimmed.startsWith('|')) {
            // Table row: replace <br> with safe placeholder (will be handled by cell parser)
            return line.replace(/<br\s*\/?>/gi, '___BR___');
        }
        // Non-table line: convert <br> to newline
        return line.replace(/<br\s*\/?>/gi, '\n');
    }).join('\n');
    // Convert HTML bold/italic to Markdown equivalents  
    cleanMarkdown = cleanMarkdown.replace(/<b>(.*?)<\/b>/gi, '**$1**');
    cleanMarkdown = cleanMarkdown.replace(/<strong>(.*?)<\/strong>/gi, '**$1**');
    cleanMarkdown = cleanMarkdown.replace(/<i>(.*?)<\/i>/gi, '*$1*');
    cleanMarkdown = cleanMarkdown.replace(/<em>(.*?)<\/em>/gi, '*$1*');
    // Convert HTML sub/sup to LaTeX before stripping (preserve subscript/superscript)
    cleanMarkdown = cleanMarkdown.replace(/<sub>(.*?)<\/sub>/gi, '$_{$1}$');
    cleanMarkdown = cleanMarkdown.replace(/<sup>(.*?)<\/sup>/gi, '$^{$1}$');
    // Only strip known safe HTML tags (NOT angle brackets in math like "x < 5")
    cleanMarkdown = cleanMarkdown.replace(/<\/?(p|div|span|u|s|h[1-6]|ul|ol|li|blockquote|pre|code|table|thead|tbody|tr|td|th|a|img|hr|section|article|header|footer|nav|figure|figcaption|details|summary|mark|del|ins|small|big|center|font|nobr|wbr|dd|dt|dl)(\s[^>]*)?\/?>/gi, '');


    const imageBlocks: (ImageRun | TextRun)[] = []; 

    if (options.generatedPdfImages) {
        const normalize = (str: string) => str.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '_');
        const imageMap = new Map<string, { base64: string; width?: number; height?: number }>();
        options.generatedPdfImages.forEach(img => {
            imageMap.set(normalize(img.placeholderId), img);
        });
        
        cleanMarkdown = cleanMarkdown.replace(/\[H[IÌiì]NH[\s_]*([\d]+)\]/gi, (match) => {
            const normalizedMatchId = normalize(match);
            const imageData = imageMap.get(normalizedMatchId);
            const index = imageBlocks.length;

            if (imageData && imageData.base64) {
                try {
                    let finalWidth = 450;
                    let finalHeight = 338;
                    if (imageData.width && imageData.height && imageData.width > 0) {
                        const ratio = imageData.height / imageData.width;
                        finalWidth = Math.min(imageData.width, 500); // Tối đa chiều ngang là 500px
                        finalHeight = finalWidth * ratio;
                    }
                    imageBlocks.push(new ImageRun({ type: "png", data: Uint8Array.from(atob(imageData.base64), c => c.charCodeAt(0)), transformation: { width: finalWidth, height: finalHeight } }));
                } catch (e) {
                    imageBlocks.push(new TextRun({ text: `[Lỗi chèn hình ảnh ${match}]`, bold: true, color: "DC2626" }));
                }
            } else {
                imageBlocks.push(new TextRun({ text: `[Không tìm thấy hình ảnh ${match}]`, bold: true, color: "DC2626", highlight: "yellow" }));
            }
            return `${IMAGE_PLACEHOLDER}${index}___`;
        });
    }

    const docChildren: any[] = [];
    const lines = cleanMarkdown.split('\n');
    let inTable = false;
    let tableRows: string[] = [];
    let inTuLuanSection = false;

    for (let i = 0; i < lines.length; i++) {
        let line = lines[i].trim();

        if (line === '') continue;
        
        // Horizontal rule: ---, ***, ___ → đường kẻ ngang phân cách
        if (line === '---' || line === '***' || line === '___') {
            docChildren.push(new Paragraph({
                children: [],
                border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "999999", space: 1 } },
                spacing: { before: 200, after: 200 }
            }));
            continue;
        }
        
        if (line.startsWith('|') && line.endsWith('|')) {
            if (line.replace(/\|/g, '').replace(/-/g, '').replace(/:/g, '').trim() === '') continue;
            tableRows.push(line);
            inTable = true;
            continue;
        } else if (inTable) {
            if (tableRows.length > 0) docChildren.push(createTableFromMarkdown(tableRows, options.isMatrixSection, imageBlocks));
            tableRows = [];
            inTable = false;
        }

        if (line.toUpperCase().includes('TỰ LUẬN')) inTuLuanSection = true;

        let currentParagraph: Paragraph;
        
        // Weekly Lesson Titles
        if (/^###\s+BÀI\s+\d+/i.test(line)) {
             currentParagraph = new Paragraph({
                children: generateParagraphChildren(safeUpperCase(line.replace(/^###\s*/, '')), imageBlocks, { defaultBold: true, size: 28 }),
                alignment: AlignmentType.CENTER,
                spacing: { before: 300, after: 120 }
            });
        }
        // Period Titles (TIẾT/HOẠT ĐỘNG) - High Priority to catch before generic headers
        // Matches: "**TIẾT 1:**", "### TIẾT 1:", "TIẾT 1", "HOẠT ĐỘNG 1 (nếu là đầu tiết)"
        else if (/^([*#\s]*)(TIẾT|HOẠT ĐỘNG)\s+\d+([:.]|$)/i.test(line)) {
             // Clean up markdown symbols (*, #) and convert to Uppercase
             const cleanTitle = safeUpperCase(line.replace(/[*#]/g, '').trim());
             
             currentParagraph = new Paragraph({
                children: [
                    new TextRun({ 
                        text: cleanTitle, 
                        bold: true, 
                        font: FONT_FAMILY, 
                        size: 26, 
                        color: "FF0000" // Red Color
                    })
                ],
                alignment: AlignmentType.CENTER,
                spacing: { before: 240, after: 120 }
            });
        }
        // Heading 0 (# Title) - Tiêu đề chính, cỡ lớn nhất
        else if (line.startsWith('# ') && !line.startsWith('## ')) {
            currentParagraph = new Paragraph({ 
                children: [new TextRun({ 
                    text: safeUpperCase(line.substring(2)), 
                    bold: true, 
                    color: "000000", 
                    font: FONT_FAMILY, 
                    size: 32 // 16pt - largest heading
                })],
                alignment: AlignmentType.CENTER,
                spacing: { before: 360, after: 200 },
            });
        }
        // Heading 1 (I., II., III.) - Đậm đen chuẩn CV5512
        else if (line.startsWith('## ')) {
            currentParagraph = new Paragraph({ 
                children: [new TextRun({ 
                    text: safeUpperCase(line.substring(3)), 
                    bold: true, 
                    color: "000000", 
                    font: FONT_FAMILY, 
                    size: 28 
                })],
                spacing: { before: 300, after: 120 },
            });
        } 
        // Heading 2 (1., 2.)
        else if (line.startsWith('### ')) {
            currentParagraph = new Paragraph({ 
                children: generateParagraphChildren(line.substring(4), imageBlocks, { defaultBold: true }),
                spacing: { before: 200, after: 100 },
            });
        } 
        else if (line.startsWith('#### ')) {
            currentParagraph = new Paragraph({ 
                children: generateParagraphChildren(line.substring(5), imageBlocks, { defaultBold: true, defaultItalic: true }),
                spacing: { before: 160, after: 80 },
            });
        } else if (line.startsWith('> ')) {
            // Blockquote: thơ, trích dẫn văn bản — in nghiêng, thụt lề
            const quoteText = line.substring(2).trim();
            currentParagraph = new Paragraph({
                children: generateParagraphChildren(quoteText, imageBlocks, { defaultItalic: true }),
                indent: { left: 720 },
                alignment: AlignmentType.LEFT,
                spacing: { after: 60, line: LINE_SPACING },
                border: { left: { style: BorderStyle.SINGLE, size: 8, color: "AAAAAA", space: 8 } }
            });
        } else if (/^[-*+]\s/.test(line)) {
            currentParagraph = new Paragraph({
                indent: { left: 720, hanging: 360 },
                children: generateParagraphChildren(line.substring(line.indexOf(' ') + 1), imageBlocks),
                alignment: AlignmentType.JUSTIFIED,
                spacing: { after: 120, line: LINE_SPACING },
                bullet: { level: 0 }
            });
        } else if (/^\d+\.\s/.test(line)) {
            // Numbered items (1. 2. 3.)
            currentParagraph = new Paragraph({
                indent: { left: 720, hanging: 360 },
                children: generateParagraphChildren(line, imageBlocks),
                alignment: AlignmentType.JUSTIFIED,
                spacing: { after: 100, line: LINE_SPACING }
            });
        } else if (/^[a-zA-Z][\)\.]\s/.test(line)) {
            // Multiple-choice options (A. B. C. D. or a) b) c) d)) — auto-bold letter
            const letterPrefix = line.match(/^([a-zA-Z][\)\.]\s*)/);
            const prefix = letterPrefix ? letterPrefix[1] : '';
            const rest = letterPrefix ? line.substring(prefix.length) : line;
            currentParagraph = new Paragraph({
                indent: { left: 720, hanging: 360 },
                children: [
                    new TextRun({ text: prefix, bold: true, font: FONT_FAMILY, size: FONT_SIZE_TEXT }),
                    ...generateParagraphChildren(rest, imageBlocks),
                ],
                alignment: AlignmentType.JUSTIFIED,
                spacing: { after: 100, line: LINE_SPACING }
            });
        } else if (/^(Câu|Bài)\s+\d+/i.test(line) && !line.startsWith('**')) {
            // Câu hỏi đề thi: "Câu 1:", "Bài 2." → auto-bold câu số
            const match = line.match(/^((?:Câu|Bài)\s+\d+[.:)]?\s*)/i);
            if (match) {
                const questionNum = match[1];
                const restOfLine = line.substring(questionNum.length);
                currentParagraph = new Paragraph({
                    children: [
                        new TextRun({ text: questionNum, bold: true, font: FONT_FAMILY, size: FONT_SIZE_TEXT }),
                        ...generateParagraphChildren(restOfLine, imageBlocks),
                    ],
                    alignment: AlignmentType.JUSTIFIED,
                    spacing: { before: 160, after: 100, line: LINE_SPACING },
                    indent: { firstLine: 0 }
                });
            } else {
                currentParagraph = new Paragraph({
                    children: generateParagraphChildren(line, imageBlocks, { defaultBold: true }),
                    alignment: AlignmentType.JUSTIFIED,
                    spacing: { before: 160, after: 100, line: LINE_SPACING },
                });
            }
        } else if (/^\$\$[^$]+\$\$$/.test(line.trim())) {
            // Display math: $$...$$ on its own line → centered math paragraph
            currentParagraph = new Paragraph({
                children: generateParagraphChildren(line, imageBlocks),
                alignment: AlignmentType.CENTER,
                spacing: { before: 120, after: 120, line: LINE_SPACING },
                indent: { firstLine: 0 }
            });
        } else {
            const children = generateParagraphChildren(line, imageBlocks);
            const isImageOnly = children.length === 1 && children[0] instanceof ImageRun;
            currentParagraph = new Paragraph({
                children: children,
                alignment: isImageOnly ? AlignmentType.CENTER : AlignmentType.JUSTIFIED,
                spacing: { after: 120, line: LINE_SPACING },
                indent: { firstLine: 0 }
            });
        }
        docChildren.push(currentParagraph);

        if (options.isElementaryExam && inTuLuanSection && (line.match(/^(câu|bài)\s*\d+/i) || line.toLowerCase().includes('đáp án:'))) {
            for (let j = 0; j < 5; j++) docChildren.push(new Paragraph({
                children: [], border: { bottom: { color: "auto", space: 1, style: BorderStyle.DOTTED, size: 6 } }, spacing: { after: 240, before: 120 },
            }));
            docChildren.push(new Paragraph({ text: "", spacing: { after: 200 } }));
        }
    }

    if (inTable && tableRows.length > 0) docChildren.push(createTableFromMarkdown(tableRows, options.isMatrixSection, imageBlocks));
    return docChildren;
};

// --- MAIN EXPORTED FUNCTIONS ---

export const generateLessonPlanDoc = (data: LessonPlanResponse, profile?: TeacherProfile): Document => {
    // 1. TITLE PAGE / HEADER
    const titleParagraphs = [
        new Paragraph({
            children: [
                new TextRun({ text: profile?.schoolName ? profile.schoolName.toUpperCase() : "TRƯỜNG THCS ........................", bold: true, font: FONT_FAMILY, size: 24 }),
            ],
            alignment: AlignmentType.LEFT,
        }),
         new Paragraph({
            children: [
                new TextRun({ text: profile?.groupName ? profile.groupName.toUpperCase() : "TỔ CHUYÊN MÔN ........................", bold: true, font: FONT_FAMILY, size: 24 }),
            ],
            alignment: AlignmentType.LEFT,
            spacing: { after: 300 }
        }),
        new Paragraph({
            children: [
                new TextRun({ text: `KẾ HOẠCH BÀI DẠY: ${data.weekName ? data.weekName.toUpperCase() : ""}`, bold: true, font: FONT_FAMILY, size: 28, color: "000000" }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { before: 200, after: 200 }
        }),
    ];

    if (data.lessonItems && data.lessonItems.length > 0) {
         // Weekly plan list
          data.lessonItems.forEach((item, idx) => {
               titleParagraphs.push(new Paragraph({
                   children: [
                       new TextRun({ text: `${idx + 1}. ${item.topic}`, bold: true, font: FONT_FAMILY, size: 26 }),
                       new TextRun({ text: ` (${item.duration})`, italics: true, font: FONT_FAMILY, size: 26 }),
                       item.specificPeriod ? new TextRun({ text: ` - Dạy: ${item.specificPeriod}`, color: "2E74B5", bold: true, font: FONT_FAMILY, size: 24 }) : new TextRun({})
                   ],
                   alignment: AlignmentType.LEFT,
                   spacing: { before: 100 }
               }));
          });
          titleParagraphs.push(new Paragraph({ text: "", spacing: { after: 300 } }));
    } else {
        // Single Lesson
        titleParagraphs.push(new Paragraph({
            children: [
                new TextRun({ text: (data.topic || 'Bài học').toUpperCase(), bold: true, font: FONT_FAMILY, size: 28 }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 }
        }));
         titleParagraphs.push(new Paragraph({
            children: [
                new TextRun({ text: `(Thời lượng: ${data.duration})`, italics: true, font: FONT_FAMILY, size: 24 }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 }
        }));
    }

    // Thông tin GV, ngày soạn (chuẩn CV5512)
    if (profile?.teacherName) {
        titleParagraphs.push(new Paragraph({
            children: [
                new TextRun({ text: `Giáo viên: ${profile.teacherName}`, italics: true, font: FONT_FAMILY, size: 24 }),
            ],
            alignment: AlignmentType.RIGHT,
            spacing: { after: 60 }
        }));
    }
    titleParagraphs.push(new Paragraph({
        children: [
            new TextRun({ text: `Ngày soạn: ....../....../20......`, italics: true, font: FONT_FAMILY, size: 24 }),
        ],
        alignment: AlignmentType.RIGHT,
        spacing: { after: 300 }
    }));

    // --- BODY CONTENT: PURE MARKDOWN PROCESSING ---
    // Instead of manually constructing Sections I and II, we use the Markdown content directly.
    // This ensures consistency with the Preview (which renders Markdown) and avoids duplication.
    // We only trim the Header/Title if it appears in the Markdown, because we added it manually above.

    let contentMarkdown = data.fullMarkdown;
    
    // Strategy: Remove any Title/Header at the start (e.g. "### BÀI...", "KẾ HOẠCH BÀI DẠY")
    // Keep everything starting from "I. MỤC TIÊU" (or "1. YÊU CẦU CẦN ĐẠT" for new program variations)
    // or just the first major heading if I/1 is missing.
    const startRegex = /(^|\n)(#+\s*(I\.|1\.)\s*(MỤC TIÊU|YÊU CẦU)|#+\s*MỤC TIÊU)/i;
    const match = contentMarkdown.match(startRegex);
    if (match && match.index !== undefined) {
         // Keep everything from the match onwards (e.g. "## I. MỤC TIÊU...")
         contentMarkdown = contentMarkdown.substring(match.index).trim();
    }

    const markdownChildren = processMarkdownToDocxChildren(
        contentMarkdown, 
        { generatedLessonImages: data.generatedImages }
    );

    return new Document({
        styles: {
            default: {
                document: {
                    run: { font: FONT_FAMILY, size: FONT_SIZE_TEXT }
                }
            }
        },
        sections: [{
            properties: {
                page: {
                    // Chuẩn lề giáo án VN: trên=2cm, dưới=2cm, trái=3cm, phải=1.5cm
                    margin: { top: 1134, right: 851, bottom: 1134, left: 1701 }
                }
            },
            children: [
                ...titleParagraphs,
                ...markdownChildren
            ]
        }]
    });
};

export const generateExamDoc = (
    data: ExamResponse, 
    input: ExamInput, 
    generatedPdfImages?: { placeholderId: string; base64: string; width?: number; height?: number }[],
    profile?: TeacherProfile
): Document => {
    
    // 1. Header
    let headerTable;
    const isWorksheet = input.matrixType === 'CUSTOM' && input.context?.includes('phiếu bài tập');
    if (data.headerData) {
        headerTable = createExamHeader(data.headerData);
    } else {
        // Default Header construction
        const headerTitle = isWorksheet ? "PHIẾU BÀI TẬP" : "ĐỀ KIỂM TRA GIỮA KÌ / CUỐI KÌ";
        headerTable = createExamHeader({
            topLeft: [
                "UBND XÃ ........................",
                profile?.schoolName ? profile.schoolName.toUpperCase() : "TRƯỜNG THCS ........................"
            ],
            topRight: [
                headerTitle,
                `MÔN: ${input.subject.toUpperCase()}`,
                `Năm học: ${(() => { const now = new Date(); const y = now.getMonth() >= 7 ? now.getFullYear() : now.getFullYear() - 1; return `${y} - ${y + 1}`; })()}`,
                `Thời gian làm bài: ${input.duration}`
            ],
            isOfficial: !isWorksheet
        });
    }

    const titleParagraph = new Paragraph({
        children: [
            new TextRun({ 
                text: (data.title || 'Đề kiểm tra').toUpperCase(), 
                bold: true, 
                font: FONT_FAMILY, 
                size: 28, 
                color: "000000" 
            }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { before: 240, after: 240 }
    });

    // 2. Exam Content - Strip duplicate title from markdown if headerData already has it
    let cleanExamMarkdown = data.examMarkdown;
    if (data.headerData && data.title) {
        // Remove lines at the start of examMarkdown that duplicate the title/header info
        const titleWords = (data.title || '').toUpperCase().replace(/[^A-ZÀ-Ỹ0-9\s]/g, '').trim();
        const mdLines = cleanExamMarkdown.split('\n');
        let skipCount = 0;
        for (let li = 0; li < Math.min(mdLines.length, 5); li++) {
            const lineClean = mdLines[li].replace(/^[#*\s]+/, '').replace(/[^A-ZÀ-Ỹa-zà-ỹ0-9\s]/g, '').trim().toUpperCase();
            if (!lineClean) { skipCount++; continue; }
            // Check if this line is part of the title (fuzzy match)
            if (lineClean.length > 10 && (titleWords.includes(lineClean) || lineClean.includes(titleWords.substring(0, 20)))) {
                skipCount = li + 1;
            } else {
                break;
            }
        }
        if (skipCount > 0) {
            cleanExamMarkdown = mdLines.slice(skipCount).join('\n').trim();
        }
    }
    
    const examChildren = processMarkdownToDocxChildren(
        cleanExamMarkdown, 
        { 
            isElementaryExam: (input.grade === GradeLevel.Grade2 || input.grade === GradeLevel.Grade3 || input.grade === GradeLevel.Grade4 || input.grade === GradeLevel.Grade5),
            generatedPdfImages: generatedPdfImages
        }
    );

    // 3. Answers (New Page)
    const answerHeader = new Paragraph({
        children: [
            new TextRun({ text: "HƯỚNG DẪN CHẤM VÀ ĐÁP ÁN", bold: true, font: FONT_FAMILY, size: 28, color: "000000" })
        ],
        alignment: AlignmentType.CENTER,
        spacing: { before: 240, after: 240 },
        pageBreakBefore: true
    });
    
    const answerChildren = data.answerMarkdown ? processMarkdownToDocxChildren(data.answerMarkdown, { generatedPdfImages }) : [];

    // 4. Matrix (New Page)
    const matrixHeader = new Paragraph({
        children: [
            new TextRun({ text: "MA TRẬN VÀ ĐẶC TẢ ĐỀ KIỂM TRA", bold: true, font: FONT_FAMILY, size: 28, color: "000000" })
        ],
        alignment: AlignmentType.CENTER,
        spacing: { before: 240, after: 240 },
        pageBreakBefore: true
    });

    const matrixChildren = data.matrixMarkdown ? processMarkdownToDocxChildren(data.matrixMarkdown, { isMatrixSection: true }) : [];

    // Build document: When headerData exists (from PDF), skip separate titleParagraph to avoid duplication
    // Build main content (portrait) - exam + answers
    const mainChildren = data.isFromDocx 
        ? [
            // Đề từ DOCX: vẫn thêm header nếu có profile (tên trường, tên GV)
            ...(profile?.schoolName ? [headerTable] : []),
            ...examChildren,
            ...(data.answerMarkdown ? [answerHeader, ...answerChildren] : []),
        ]
        : data.headerData
        ? [
            headerTable,
            ...examChildren,
            ...(data.answerMarkdown ? [answerHeader, ...answerChildren] : []),
        ]
        : [
            headerTable,
            titleParagraph,
            ...examChildren,
            ...(data.answerMarkdown ? [answerHeader, ...answerChildren] : []),
        ];

    // Build sections: main (portrait) + matrix (landscape if exists)
    const sections: any[] = [{
        properties: {
             page: {
                // Đề thi: lề compact hơn để chứa nhiều nội dung
                margin: { top: 851, right: 720, bottom: 851, left: 1134 }
            }
        },
        children: mainChildren
    }];

    // Ma trận đề thi → section landscape riêng (7-8 cột cần giấy ngang)
    if (data.matrixMarkdown) {
        // Remove pageBreakBefore from matrixHeader since it's in a new section
        const matrixHeaderLandscape = new Paragraph({
            children: [
                new TextRun({ text: "MA TRẬN VÀ ĐẶC TẢ ĐỀ KIỂM TRA", bold: true, font: FONT_FAMILY, size: 28, color: "000000" })
            ],
            alignment: AlignmentType.CENTER,
            spacing: { before: 120, after: 240 },
        });
        sections.push({
            properties: {
                page: {
                    size: { orientation: PageOrientation.LANDSCAPE },
                    margin: { top: 720, right: 720, bottom: 720, left: 720 }
                }
            },
            children: [matrixHeaderLandscape, ...matrixChildren]
        });
    }

    return new Document({
        styles: {
            default: {
                document: {
                    run: { font: FONT_FAMILY, size: FONT_SIZE_TEXT }
                }
            }
        },
        sections: sections
    });
};

import { SHCMData, TeacherInfo } from '../types';

export const generateSHCMDoc = (data: SHCMData): Document => {
    const defaultRunProperties = {
        font: "Times New Roman",
        size: 26, // 13pt
        color: "000000",
    };

    const headerFormat = {
        bold: true,
        size: 26, // 13pt
        font: "Times New Roman",
    };

    const titleFormat = {
        bold: true,
        size: 36, // 18pt
        font: "Times New Roman",
    };

    const tableHeaderFormat = {
        bold: true,
        size: 26,
        font: "Times New Roman",
    };

    const tableBorders = {
        top: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
        bottom: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
        left: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
        right: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
    };

    const createTeacherTable = (teachers: TeacherInfo[]) => {
        return new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
                new TableRow({
                    children: [
                        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Stt", ...tableHeaderFormat })], alignment: AlignmentType.CENTER })], verticalAlign: VerticalAlign.CENTER, borders: tableBorders, shading: { fill: TABLE_HEADER_BG, type: ShadingType.CLEAR } }),
                        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Họ và tên", ...tableHeaderFormat })], alignment: AlignmentType.CENTER })], verticalAlign: VerticalAlign.CENTER, borders: tableBorders, shading: { fill: TABLE_HEADER_BG, type: ShadingType.CLEAR } }),
                        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Năm sinh", ...tableHeaderFormat })], alignment: AlignmentType.CENTER })], verticalAlign: VerticalAlign.CENTER, borders: tableBorders, shading: { fill: TABLE_HEADER_BG, type: ShadingType.CLEAR } }),
                        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Chuyên môn", ...tableHeaderFormat })], alignment: AlignmentType.CENTER })], verticalAlign: VerticalAlign.CENTER, borders: tableBorders, shading: { fill: TABLE_HEADER_BG, type: ShadingType.CLEAR } }),
                        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Trình độ", ...tableHeaderFormat })], alignment: AlignmentType.CENTER })], verticalAlign: VerticalAlign.CENTER, borders: tableBorders, shading: { fill: TABLE_HEADER_BG, type: ShadingType.CLEAR } }),
                    ],
                    tableHeader: true,
                }),
                ...teachers.map((t, index) => new TableRow({
                    children: [
                        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: (index + 1).toString(), ...defaultRunProperties })], alignment: AlignmentType.CENTER })], verticalAlign: VerticalAlign.CENTER, borders: tableBorders }),
                        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: t.name, ...defaultRunProperties })] })], verticalAlign: VerticalAlign.CENTER, borders: tableBorders }),
                        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: t.birthYear, ...defaultRunProperties })], alignment: AlignmentType.CENTER })], verticalAlign: VerticalAlign.CENTER, borders: tableBorders }),
                        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: t.specialty, ...defaultRunProperties })] })], verticalAlign: VerticalAlign.CENTER, borders: tableBorders }),
                        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: t.degree, ...defaultRunProperties })] })], verticalAlign: VerticalAlign.CENTER, borders: tableBorders }),
                    ]
                }))
            ],
        });
    };

    const createEmulationTable = () => {
        return new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
                new TableRow({
                    children: [
                        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "SỐ TIẾT/TUẦN", ...tableHeaderFormat })], alignment: AlignmentType.CENTER })], verticalAlign: VerticalAlign.CENTER, borders: tableBorders, shading: { fill: TABLE_HEADER_BG, type: ShadingType.CLEAR } }),
                        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "TRƯỜNG", ...tableHeaderFormat })], alignment: AlignmentType.CENTER })], verticalAlign: VerticalAlign.CENTER, borders: tableBorders, shading: { fill: TABLE_HEADER_BG, type: ShadingType.CLEAR } }),
                        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "HUYỆN", ...tableHeaderFormat })], alignment: AlignmentType.CENTER })], verticalAlign: VerticalAlign.CENTER, borders: tableBorders, shading: { fill: TABLE_HEADER_BG, type: ShadingType.CLEAR } }),
                        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "THÀNH PHỐ", ...tableHeaderFormat })], alignment: AlignmentType.CENTER })], verticalAlign: VerticalAlign.CENTER, borders: tableBorders, shading: { fill: TABLE_HEADER_BG, type: ShadingType.CLEAR } }),
                        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "GHI CHÚ", ...tableHeaderFormat })], alignment: AlignmentType.CENTER })], verticalAlign: VerticalAlign.CENTER, borders: tableBorders, shading: { fill: TABLE_HEADER_BG, type: ShadingType.CLEAR } }),
                    ],
                    tableHeader: true,
                }),
                ...Array.from({length: 5}).map((_, i) => new TableRow({
                    children: [
                        new TableCell({ children: [new Paragraph({ text: "", spacing: { after: 200 } })], borders: tableBorders }),
                        new TableCell({ children: [new Paragraph({ text: "", spacing: { after: 200 } })], borders: tableBorders }),
                        new TableCell({ children: [new Paragraph({ text: "", spacing: { after: 200 } })], borders: tableBorders }),
                        new TableCell({ children: [new Paragraph({ text: "", spacing: { after: 200 } })], borders: tableBorders }),
                        new TableCell({ children: [new Paragraph({ text: "", spacing: { after: 200 } })], borders: tableBorders }),
                    ]
                }))
            ]
        });
    };

    const createActivitiesTable = (activities: {month: string, content: string}[]) => {
        return new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
                new TableRow({
                    children: [
                        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Tháng", ...tableHeaderFormat })], alignment: AlignmentType.CENTER })], width: { size: 15, type: WidthType.PERCENTAGE }, verticalAlign: VerticalAlign.CENTER, borders: tableBorders, shading: { fill: TABLE_HEADER_BG, type: ShadingType.CLEAR } }),
                        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Nội dung các hoạt động", ...tableHeaderFormat })], alignment: AlignmentType.CENTER })], width: { size: 85, type: WidthType.PERCENTAGE }, verticalAlign: VerticalAlign.CENTER, borders: tableBorders, shading: { fill: TABLE_HEADER_BG, type: ShadingType.CLEAR } }),
                    ],
                    tableHeader: true,
                }),
                ...activities.map(act => new TableRow({
                    children: [
                        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: act.month, ...defaultRunProperties })], alignment: AlignmentType.CENTER })], verticalAlign: VerticalAlign.CENTER, borders: tableBorders }),
                        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: act.content, ...defaultRunProperties })] })], verticalAlign: VerticalAlign.CENTER, borders: tableBorders }),
                    ]
                }))
            ]
        });
    };

    const createSignaturesTable = (leftTitle: string, rightTitle: string, leftSigner: string, rightSigner: string) => {
        return new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: {
                top: { style: BorderStyle.NONE, size: 0, color: "auto" },
                bottom: { style: BorderStyle.NONE, size: 0, color: "auto" },
                left: { style: BorderStyle.NONE, size: 0, color: "auto" },
                right: { style: BorderStyle.NONE, size: 0, color: "auto" },
                insideHorizontal: { style: BorderStyle.NONE, size: 0, color: "auto" },
                insideVertical: { style: BorderStyle.NONE, size: 0, color: "auto" },
            },
            rows: [
                new TableRow({
                    children: [
                        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: leftTitle, ...headerFormat })], alignment: AlignmentType.CENTER })], width: { size: 50, type: WidthType.PERCENTAGE } }),
                        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: rightTitle, ...headerFormat })], alignment: AlignmentType.CENTER })], width: { size: 50, type: WidthType.PERCENTAGE } }),
                    ],
                }),
                new TableRow({
                    children: [
                        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "(Ký và ghi rõ họ tên)", italics: true, ...defaultRunProperties })], alignment: AlignmentType.CENTER })] }),
                        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "(Ký và ghi rõ họ tên)", italics: true, ...defaultRunProperties })], alignment: AlignmentType.CENTER })] }),
                    ],
                }),
                new TableRow({
                    children: [
                        new TableCell({ children: [new Paragraph({ text: "", spacing: { after: 1200 } })] }),
                        new TableCell({ children: [new Paragraph({ text: "", spacing: { after: 1200 } })] }),
                    ],
                }),
                new TableRow({
                    children: [
                        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: leftSigner, ...headerFormat })], alignment: AlignmentType.CENTER })] }),
                        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: rightSigner, ...headerFormat })], alignment: AlignmentType.CENTER })] }),
                    ],
                }),
            ]
        });
    };

    const meetingHeaderFormat = {
        font: "Times New Roman",
        size: 24, // 12pt
        bold: true,
    };

    const createMeetingHeader = (schoolName: string, groupName: string) => {
        return new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: {
                top: { style: BorderStyle.NONE, size: 0, color: "auto" },
                bottom: { style: BorderStyle.NONE, size: 0, color: "auto" },
                left: { style: BorderStyle.NONE, size: 0, color: "auto" },
                right: { style: BorderStyle.NONE, size: 0, color: "auto" },
                insideHorizontal: { style: BorderStyle.NONE, size: 0, color: "auto" },
                insideVertical: { style: BorderStyle.NONE, size: 0, color: "auto" },
            },
            rows: [
                new TableRow({
                    children: [
                        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "TRƯỜNG " + schoolName.toUpperCase(), ...meetingHeaderFormat })], alignment: AlignmentType.CENTER })], width: { size: 40, type: WidthType.PERCENTAGE } }),
                        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "CỘNG HOÀ XÃ HỘI CHỦ NGHĨA VIỆT NAM", ...meetingHeaderFormat })], alignment: AlignmentType.CENTER })], width: { size: 60, type: WidthType.PERCENTAGE } }),
                    ]
                }),
                new TableRow({
                    children: [
                        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "NHÓM CHUYÊN MÔN " + groupName.toUpperCase(), ...meetingHeaderFormat, underline: {} })], alignment: AlignmentType.CENTER })] }),
                        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Độc lập - Tự do - Hạnh phúc", ...meetingHeaderFormat, underline: {} })], alignment: AlignmentType.CENTER })] }),
                    ]
                })
            ]
        });
    };

    const meetingSections = data.meetings.map((m, mIdx) => {
        return [
            createMeetingHeader(data.schoolName, data.groupName),
            new Paragraph({ text: "", spacing: { after: 400 } }),
            new Paragraph({
                children: [new TextRun({ text: "BIÊN BẢN SINH HOẠT CHUYÊN MÔN LẦN " + m.meetingNumber, ...titleFormat })],
                alignment: AlignmentType.CENTER,
                spacing: { after: 200 }
            }),
            new Paragraph({
                children: [
                    new TextRun({ text: "NGÀY: " + (m.date.includes('-') && m.date.split('-')[0].length === 4 ? m.date.split('-').reverse().join('/') : m.date), ...defaultRunProperties })
                ],
                alignment: AlignmentType.CENTER,
                spacing: { after: 400 }
            }),
            new Paragraph({ children: [new TextRun({ text: "1. KIỂM DIỆN:", ...headerFormat })] }),
            ...data.teachers.map(t => new Paragraph({ children: [new TextRun({ text: "- " + t.name, ...defaultRunProperties })] })),
            new Paragraph({ children: [new TextRun({ text: "2. THÀNH PHẦN THAM DỰ:", ...headerFormat })] }),
            new Paragraph({ children: [new TextRun({ text: "- Chủ trì: " + data.hostName, ...defaultRunProperties })] }),
            new Paragraph({ children: [new TextRun({ text: "- Thư ký: " + data.secretaryName, ...defaultRunProperties })] }),
            new Paragraph({ children: [new TextRun({ text: "- Toàn thể giáo viên tổ/nhóm " + data.groupName + ".", ...defaultRunProperties })] }),
            new Paragraph({ children: [new TextRun({ text: "3. THỰC HIỆN CHƯƠNG TRÌNH:", ...headerFormat })] }),
            new Paragraph({ children: [new TextRun({ text: "- Đúng tiến độ chương trình.", ...defaultRunProperties })] }),
            new Paragraph({ children: [new TextRun({ text: "4. NỘI DUNG CHÍNH:", ...headerFormat })] }),
            ...processMarkdownToDocxChildren(m.contentMarkdown),
            new Paragraph({ text: "", spacing: { after: 800 } }),
            createSignaturesTable("THƯ KÝ", "CHỦ TRÌ", data.secretaryName, data.hostName),
            new Paragraph({ pageBreakBefore: mIdx < data.meetings.length - 1 ? true : false }) // Không ngắt trang ở biên bản cuối cùng
        ];
    });

    const frontMatter = data.term1Activities ? [
        new Paragraph({ text: "", spacing: { after: 1000 } }),
        new Paragraph({ children: [new TextRun({ text: "SỞ GIÁO DỤC VÀ ĐÀO TẠO", ...headerFormat })], alignment: AlignmentType.CENTER }),
        new Paragraph({ children: [new TextRun({ text: "TRƯỜNG " + data.schoolName.toUpperCase(), ...headerFormat })], alignment: AlignmentType.CENTER }),
        new Paragraph({ text: "", spacing: { after: 3000 } }),
        new Paragraph({ children: [new TextRun({ text: "SỔ SINH HOẠT CHUYÊN MÔN", ...titleFormat })], alignment: AlignmentType.CENTER, spacing: { after: 1000 } }),
        new Paragraph({ children: [new TextRun({ text: "TỔ/NHÓM: " + data.groupName.toUpperCase(), ...titleFormat })], alignment: AlignmentType.CENTER, spacing: { after: 400 } }),
        new Paragraph({ children: [new TextRun({ text: "TRƯỜNG: " + data.schoolName.toUpperCase(), ...titleFormat })], alignment: AlignmentType.CENTER }),
        new Paragraph({ text: "", spacing: { after: 4000 } }),
        new Paragraph({ children: [new TextRun({ text: "NĂM HỌC: " + data.academicYear, ...headerFormat })], alignment: AlignmentType.CENTER }),
        new Paragraph({ pageBreakBefore: true }),

        // Page 2: Guidelines
        new Paragraph({ children: [new TextRun({ text: "HƯỚNG DẪN CẢI TIẾN SINH HOẠT NHÓM CHUYÊN MÔN TRONG CÁC TRƯỜNG CẤP THCS- THPT", ...headerFormat })], alignment: AlignmentType.CENTER, spacing: { after: 400 } }),
        new Paragraph({ children: [new TextRun({ text: "Để cải tiến sinh hoạt nhóm chuyên môn, Phòng Giáo dục Trung học Sở Giáo dục Đào tạo quy định như sau:", ...defaultRunProperties })] }),
        new Paragraph({ children: [new TextRun({ text: "1. Hướng cải tiến:", ...headerFormat })] }),
        new Paragraph({ children: [new TextRun({ text: "- Thay việc sinh hoạt có tính chất hành chính bằng những nội dung chuyên sâu của bộ môn.", ...defaultRunProperties })] }),
        new Paragraph({ children: [new TextRun({ text: "- Sổ sinh hoạt nhóm được nhóm trưởng cập nhật các thông tin có liên quan.", ...defaultRunProperties })] }),
        new Paragraph({ children: [new TextRun({ text: "2. Tổ chức nhóm:", ...headerFormat })] }),
        new Paragraph({ children: [new TextRun({ text: "Mỗi nhóm gồm các giáo viên cùng một môn trong toàn trường (những môn có trên khoảng 10 giáo viên có thể chia thành các nhóm môn- lớp)", ...defaultRunProperties })] }),
        new Paragraph({ children: [new TextRun({ text: "3. Nội dung sinh hoạt:", ...headerFormat })] }),
        new Paragraph({ children: [new TextRun({ text: "Thời gian sinh hoạt chuyên môn chủ yếu dành cho việc bồi dưỡng chuyên môn. Nội dung sinh hoạt nhóm do tổ trưởng chuyên môn quy định dựa trên những định hướng chính sau:", ...defaultRunProperties })] }),
        new Paragraph({ children: [new TextRun({ text: "- Báo cáo chuyên đề", ...defaultRunProperties })] }),
        new Paragraph({ children: [new TextRun({ text: "- Thảo luận, vận dụng chuyên đề vào thực tế giảng dạy", ...defaultRunProperties })] }),
        new Paragraph({ children: [new TextRun({ text: "- Trao đổi về giờ dạy theo định hướng chuyên đề", ...defaultRunProperties })] }),
        new Paragraph({ children: [new TextRun({ text: "- Thảo luận những bài khó dạy", ...defaultRunProperties })] }),
        new Paragraph({ children: [new TextRun({ text: "4. Lịch sinh hoạt:", ...headerFormat })] }),
        new Paragraph({ children: [new TextRun({ text: "Mỗi nhóm chuyên môn sinh hoạt mỗi tháng hai lần (đối với nhóm nào không có sự thay đổi về nhân sự so với năm học trước có thể sinh hoạt mỗi tháng một lần). Giáo viên THCS hầu hết phải sinh hoạt tại hai nhóm, Ban Giám hiệu xếp lịch sinh hoạt nhóm sao cho không trùng lặp.", ...defaultRunProperties })] }),
         new Paragraph({ children: [new TextRun({ text: "5. Bảo quản sổ sinh hoạt:", ...headerFormat })] }),
        new Paragraph({ children: [new TextRun({ text: "Sổ nhóm do nhóm trưởng quản lý, bảo quản tại trường và xuất trình kịp thời cho cấp trên có yêu cầu.", ...defaultRunProperties })] }),
        new Paragraph({ children: [new TextRun({ text: "6. Kiểm tra- Đánh giá:", ...headerFormat })] }),
        new Paragraph({ children: [new TextRun({ text: "Các cấp chỉ đạo (từ tổ trưởng đến Sở Giáo dục) khi kiểm tra đều ghi ý kiến đánh giá vào phần này.", ...defaultRunProperties })] }),
        new Paragraph({ pageBreakBefore: true }),

        // Page 3: Organization
        new Paragraph({ children: [new TextRun({ text: "TỔ CHỨC, PHÂN CÔNG TRONG NHÓM", ...headerFormat })], alignment: AlignmentType.CENTER, spacing: { after: 400 } }),
        createTeacherTable(data.teachers),
        new Paragraph({ text: "", spacing: { after: 800 } }),
        new Paragraph({ children: [new TextRun({ text: "Ngày......tháng......năm......", italics: true, ...defaultRunProperties })], alignment: AlignmentType.RIGHT, spacing: { after: 400 } }),
        createSignaturesTable("TỔ TRƯỞNG", "BAN GIÁM HIỆU", data.leaderName, data.vicePrincipalName),
        new Paragraph({ pageBreakBefore: true }),

        // Page 4: Emulation
        new Paragraph({ children: [new TextRun({ text: "ĐĂNG KÍ DANH HIỆU THI ĐUA", ...headerFormat })], alignment: AlignmentType.CENTER, spacing: { after: 400 } }),
        createEmulationTable(),
        new Paragraph({ pageBreakBefore: true }),

        // Page 5,6: Central Activities
        new Paragraph({ children: [new TextRun({ text: "CÁC HOẠT ĐỘNG TẬP TRUNG", ...headerFormat })], alignment: AlignmentType.CENTER }),
        new Paragraph({ children: [new TextRun({ text: "HỌC KÌ I", ...headerFormat })], alignment: AlignmentType.CENTER, spacing: { after: 200 } }),
        createActivitiesTable(data.term1Activities),
        new Paragraph({ text: "", spacing: { after: 400 } }),
        new Paragraph({ children: [new TextRun({ text: "HỌC KÌ II", ...headerFormat })], alignment: AlignmentType.CENTER, spacing: { after: 200 } }),
        createActivitiesTable(data.term2Activities || []),
        new Paragraph({ pageBreakBefore: true }),

        // Page 7: Measures
        new Paragraph({ children: [new TextRun({ text: "CÁC BIỆN PHÁP CHÍNH", ...headerFormat })], alignment: AlignmentType.CENTER, spacing: { after: 400 } }),
        ...processMarkdownToDocxChildren(data.measures || ""),
        new Paragraph({ pageBreakBefore: true }),
    ] : [];

    return new Document({
        sections: [
            {
                properties: {
                    page: {
                        margin: { top: 1134, right: 1134, bottom: 1134, left: 1134 } // 2cm on all sides
                    }
                },
                children: [
                    ...frontMatter,
                    // Meeting Minutes
                    ...meetingSections.flat()
                ]
            }
        ]
    });
};

// Sanitize filename: remove illegal characters for OS file systems
const sanitizeFileName = (name: string): string => {
    if (!name) return "Tai_lieu";
    return name.replace(/[\\/:*?"<>|]/g, '_').replace(/\s{2,}/g, ' ').trim().substring(0, 200);
};

export const downloadSHCMDocument = async (data: SHCMData) => {
    try {
        const doc = generateSHCMDoc(data);
        const blob = await Packer.toBlob(doc);
        saveAs(blob, `So_SHCM_${sanitizeFileName(data.groupName)}_${sanitizeFileName(data.academicYear)}.docx`);
    } catch (error) {
        console.error("Download SHCM Error:", error);
        alert("Lỗi khi tạo file Word SHCM. Vui lòng thử lại.");
    }
};

export const downloadWordDocument = async (data: LessonPlanResponse, profile?: TeacherProfile) => {
    try {
        const doc = generateLessonPlanDoc(data, profile);
        const blob = await Packer.toBlob(doc);
        saveAs(blob, `${sanitizeFileName(data.weekName || data.topic)}.docx`);
    } catch (error) {
        console.error("Download Lesson Plan Error:", error);
        throw new Error("Lỗi khi tạo file Word giáo án. " + (error instanceof Error ? error.message : ""));
    }
};

export const downloadExamDocument = async (
    data: ExamResponse, 
    input: ExamInput, 
    generatedPdfImages?: { placeholderId: string; base64: string; width?: number; height?: number }[],
    customFileName?: string,
    profile?: TeacherProfile
) => {
    try {
        const doc = generateExamDoc(data, input, generatedPdfImages, profile);
        const blob = await Packer.toBlob(doc);
        saveAs(blob, customFileName ? `${sanitizeFileName(customFileName)}.docx` : `${sanitizeFileName(data.title)}.docx`);
    } catch (error) {
        console.error("Download Exam Error:", error);
        throw new Error("Lỗi khi tạo file Word đề thi. " + (error instanceof Error ? error.message : ""));
    }
};
