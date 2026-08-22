const { contextBridge, ipcRenderer } = require('electron');

// Expose API an toàn cho renderer process (web app)
// Chỉ expose các function cần thiết, KHÔNG expose toàn bộ Node.js
contextBridge.exposeInMainWorld('electronAPI', {
    // Thông tin phiên bản
    getVersion: () => ipcRenderer.invoke('get-app-version'),
    getPlatformInfo: () => ipcRenderer.invoke('get-platform-info'),
    
    // Flag để web app biết đang chạy trong Electron
    isElectron: true,
    
    // Lắng nghe sự kiện auto-update từ main process
    onUpdateAvailable: (callback) => {
        ipcRenderer.on('update-available', (event, version) => callback(version));
    },

    // === SAVE FILE: Chọn nơi lưu → ghi file → tự mở ===
    // fileName: tên file mặc định (vd: "De_thi_Toan_6.docx")
    // fileData: base64 encoded data
    // fileType: 'docx' | 'pdf'
    saveFile: (fileName, fileData, fileType) => {
        return ipcRenderer.invoke('save-file-dialog', { fileName, fileData, fileType });
    },
});
