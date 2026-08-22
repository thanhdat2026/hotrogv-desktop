import * as pdfjsLib from 'pdfjs-dist';

// Fix for PDF.js import structure in some ESM environments
const pdfjs: any = (pdfjsLib as any).default || pdfjsLib;

if (pdfjs.GlobalWorkerOptions) {
    pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;
}

// --- INTERFACES ---
export interface ExtractedImage {
    base64: string;
    buffer: ArrayBuffer;
    mimeType: string;
    width: number;
    height: number;
    pageIndex: number; // Added to track which page the image belongs to
}

// --- HELPER FUNCTIONS ---

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

const processImage = async (imgData: any): Promise<{ buffer: ArrayBuffer; base64: string; mimeType: string; } | null> => {
    try {
        const canvas = document.createElement('canvas');
        canvas.width = imgData.width;
        canvas.height = imgData.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;

        const imageData = ctx.createImageData(imgData.width, imgData.height);
        const data = imgData.data;

        if (imgData.kind === pdfjs.ImageKind.RGBA_32BPP) {
            imageData.data.set(data);
        } else if (imgData.kind === pdfjs.ImageKind.RGB_24BPP) {
            const buffer = new Uint8ClampedArray(imgData.width * imgData.height * 4);
            let i = 0, j = 0;
            while (i < buffer.length) {
                buffer[i++] = data[j++]; // R
                buffer[i++] = data[j++]; // G
                buffer[i++] = data[j++]; // B
                buffer[i++] = 255;       // Alpha
            }
            imageData.data.set(buffer);
        } else if (imgData.kind === pdfjs.ImageKind.GRAYSCALE_1BPP) {
            const buffer = new Uint8ClampedArray(imgData.width * imgData.height * 4);
            let k = 0;
            for (let i = 0; i < data.length; i++) {
                const byte = data[i];
                for (let bit = 7; bit >= 0; bit--) {
                    if (k >= buffer.length) break;
                    const pixel = (byte >> bit) & 1;
                    const value = pixel === 0 ? 0 : 255; // 0 -> black, 1 -> white
                    buffer[k++] = value;
                    buffer[k++] = value;
                    buffer[k++] = value;
                    buffer[k++] = 255;
                }
            }
            imageData.data.set(buffer);
        } else if (imgData.kind === pdfjs.ImageKind.CMYK_32BPP) { // NEW: Handle CMYK images
            const buffer = new Uint8ClampedArray(imgData.width * imgData.height * 4);
            let i = 0, j = 0;
            while (i < buffer.length) {
                const c = data[j++];
                const m = data[j++];
                const y = data[j++];
                const k = data[j++];
                
                // Basic CMYK to RGB conversion
                const r = 255 * (1 - c / 255) * (1 - k / 255);
                const g = 255 * (1 - m / 255) * (1 - k / 255);
                const b = 255 * (1 - y / 255) * (1 - k / 255);

                buffer[i++] = r; // R
                buffer[i++] = g; // G
                buffer[i++] = b; // B
                buffer[i++] = 255; // Alpha
            }
            imageData.data.set(buffer);
        } else {
            console.warn("Unsupported image kind:", imgData.kind);
            return null;
        }
        
        ctx.putImageData(imageData, 0, 0);

        return new Promise((resolve, reject) => {
            canvas.toBlob(async (blob) => {
                if (!blob) return reject(new Error("Canvas to Blob conversion failed"));
                try {
                    const buffer = await blob.arrayBuffer();
                    const base64 = await blobToBase64(blob);
                    resolve({ buffer, base64, mimeType: blob.type });
                } catch (err) {
                    reject(err);
                }
            }, 'image/png'); 
        });
    } catch (e) {
        console.error("Error processing image data:", e);
        return null;
    }
};

// --- MAIN EXTRACTION FUNCTION ---
export const extractPdfContent = async (file: File, pageNumbers?: number[]): Promise<{ pageImages: string[]; extractedImages: ExtractedImage[]; actualPageNumbers: number[] }> => {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    
    const pageImages: string[] = [];
    const extractedImages: ExtractedImage[] = [];
    const actualPageNumbers: number[] = [];
    // OPTIMIZATION: Reduced scale from 2.0 to 1.5 to prevent memory issues with large files
    const RENDER_SCALE = 1.5; 

    // Determine which pages to process
    let pagesToProcess: number[] = [];
    if (pageNumbers && pageNumbers.length > 0) {
        pagesToProcess = pageNumbers.filter(p => p >= 1 && p <= pdf.numPages);
    } else {
        for (let i = 1; i <= pdf.numPages; i++) {
            pagesToProcess.push(i);
        }
    }

    for (const pageNum of pagesToProcess) {
        const page = await pdf.getPage(pageNum);
        actualPageNumbers.push(pageNum);
        
        // --- 1. Render entire page as an image for OCR ---
        const viewport = page.getViewport({ scale: RENDER_SCALE });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        if (context) {
            const renderContext = {
                canvasContext: context,
                viewport: viewport
            };
            await page.render(renderContext).promise;
            const pageAsImageBase64 = canvas.toDataURL('image/png').split(',')[1];
            pageImages.push(pageAsImageBase64);
        }

        // --- 2. Extract discrete images (diagrams, figures) ---
        try {
            const opList = await page.getOperatorList();
            
            for (let i = 0; i < opList.fnArray.length; i++) {
                const op = opList.fnArray[i];
                const args = opList.argsArray[i];

                let imgDataPromise: Promise<any> | null = null;
                let imgKey: string | null = null;

                // Check for various image painting operators
                if (op === pdfjs.OPS.paintImageXObject) {
                    imgKey = args[0];
                    if (imgKey) {
                        try {
                            const obj = page.objs.get(imgKey);
                            imgDataPromise = Promise.resolve(obj);
                        } catch (e) {
                            console.warn(`Object ${imgKey} not resolved, skipping discrete image.`);
                        }
                    }
                } else if (op === pdfjs.OPS.paintInlineImageXObject) {
                    imgDataPromise = Promise.resolve(args[0]);
                } else if (op === pdfjs.OPS.paintImageMaskXObject) {
                    imgKey = args[0];
                    if (imgKey) {
                       try {
                            const obj = page.objs.get(imgKey);
                            imgDataPromise = Promise.resolve(obj);
                        } catch (e) {
                            console.warn(`Object mask ${imgKey} not resolved, skipping discrete image.`);
                        }
                    }
                }
                
                if (imgDataPromise) {
                    try {
                        const imgData = await imgDataPromise;
                        if (!imgData || !imgData.data) continue;
                        
                        // FILTER: Skip very small images (likely icons, bullets, or noise)
                        if (imgData.width < 100 || imgData.height < 100) continue;

                        const imgResult = await processImage(imgData);
                        if (imgResult) {
                            extractedImages.push({ 
                                ...imgResult, 
                                width: imgData.width, 
                                height: imgData.height,
                                pageIndex: pageNum - 1 // Store 0-based page index
                            });
                        }
                    } catch(e) {
                        console.error(`Could not extract discrete image ${imgKey || 'inline'} on page ${pageNum}`, e);
                    }
                }
            }
        } catch (opListError) {
            console.warn(`Error getting operator list for page ${pageNum}. Skipping discrete image extraction for this page.`, opListError);
        }
    }
    
    return { pageImages, extractedImages, actualPageNumbers };
};