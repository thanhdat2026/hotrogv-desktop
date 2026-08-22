const { app, BrowserWindow, Menu, Tray, shell, dialog, ipcMain, nativeImage } = require('electron');
const path = require('path');

// ==================== AUTO-UPDATER ====================
// Sử dụng electron-updater (tương thích electron-builder)
// Kiểm tra cập nhật từ GitHub Releases
let autoUpdater;
try {
    autoUpdater = require('electron-updater').autoUpdater;
} catch (e) {
    // Dev mode: electron-updater chưa cài → bỏ qua
    autoUpdater = null;
}

// ==================== CONSTANTS ====================
const APP_NAME = 'Trợ lý dạy học số';
const IS_DEV = !app.isPackaged;
const WINDOW_WIDTH = 1320;
const WINDOW_HEIGHT = 860;

let mainWindow = null;
let tray = null;

// ==================== CREATE MAIN WINDOW ====================
function createWindow() {
    mainWindow = new BrowserWindow({
        width: WINDOW_WIDTH,
        height: WINDOW_HEIGHT,
        minWidth: 900,
        minHeight: 600,
        title: APP_NAME,
        icon: path.join(__dirname, 'icon.png'),
        autoHideMenuBar: true, // Ẩn menu bar mặc định
        webPreferences: {
            preload: path.join(__dirname, 'preload.cjs'),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: false,
            webSecurity: true,
        },
        show: false, // Không hiển thị ngay → chờ ready-to-show
        backgroundColor: '#f8fafc', // Cùng màu với app
    });

    // Load file index.html từ thư mục dist (Vite build output)
    const indexPath = path.join(__dirname, '..', 'dist', 'index.html');
    mainWindow.loadFile(indexPath);

    // Hiển thị khi sẵn sàng (tránh màn hình trắng)
    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
        mainWindow.focus();
    });

    // Mở DevTools khi dev
    if (IS_DEV) {
        mainWindow.webContents.openDevTools({ mode: 'detach' });
    }

    // Mở link trong browser mặc định (thay vì trong Electron)
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        shell.openExternal(url);
        return { action: 'deny' };
    });

    // Xử lý navigation tới URL ngoài → mở trong browser
    mainWindow.webContents.on('will-navigate', (event, url) => {
        // Chỉ cho phép navigate trong file:// (local)
        if (!url.startsWith('file://')) {
            event.preventDefault();
            shell.openExternal(url);
        }
    });

    // Khi đóng window → ẩn xuống tray (Windows behavior quen thuộc)
    mainWindow.on('close', (event) => {
        if (!app.isQuitting) {
            event.preventDefault();
            mainWindow.hide();
            return false;
        }
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

// ==================== SYSTEM TRAY ====================
function createTray() {
    // Tạo tray icon (sử dụng icon nhỏ 16x16)
    const iconPath = path.join(__dirname, 'icon.png');
    let trayIcon;
    try {
        trayIcon = nativeImage.createFromPath(iconPath);
        trayIcon = trayIcon.resize({ width: 16, height: 16 });
    } catch (e) {
        // Fallback: tạo icon trắng nếu không có file
        trayIcon = nativeImage.createEmpty();
    }

    tray = new Tray(trayIcon);
    tray.setToolTip(APP_NAME);

    const contextMenu = Menu.buildFromTemplate([
        {
            label: '📚 Mở ứng dụng',
            click: () => {
                if (mainWindow) {
                    mainWindow.show();
                    mainWindow.focus();
                }
            }
        },
        { type: 'separator' },
        {
            label: `ℹ️ Phiên bản ${app.getVersion()}`,
            enabled: false
        },
        {
            label: '🔄 Kiểm tra cập nhật',
            click: () => {
                if (autoUpdater) {
                    autoUpdater.checkForUpdatesAndNotify();
                } else {
                    dialog.showMessageBox({
                        type: 'info',
                        title: 'Cập nhật',
                        message: 'Đang chạy ở chế độ Development.\nAuto-update chỉ hoạt động trên bản cài đặt.'
                    });
                }
            }
        },
        { type: 'separator' },
        {
            label: '❌ Thoát hoàn toàn',
            click: () => {
                app.isQuitting = true;
                app.quit();
            }
        }
    ]);

    tray.setContextMenu(contextMenu);

    // Double-click tray icon → mở app
    tray.on('double-click', () => {
        if (mainWindow) {
            mainWindow.show();
            mainWindow.focus();
        }
    });
}

// ==================== AUTO-UPDATE ====================
function setupAutoUpdater() {
    if (!autoUpdater) return;

    // Tự động kiểm tra cập nhật sau 10 giây khởi động
    autoUpdater.autoDownload = true;
    autoUpdater.autoInstallOnAppQuit = true;

    autoUpdater.on('checking-for-update', () => {
        console.log('[Auto-Update] Đang kiểm tra cập nhật...');
    });

    autoUpdater.on('update-available', (info) => {
        console.log('[Auto-Update] Có bản cập nhật mới:', info.version);
        if (mainWindow) {
            mainWindow.webContents.send('update-available', info.version);
        }
    });

    autoUpdater.on('update-not-available', () => {
        console.log('[Auto-Update] Đã dùng bản mới nhất.');
    });

    autoUpdater.on('download-progress', (progress) => {
        console.log(`[Auto-Update] Đang tải: ${Math.round(progress.percent)}%`);
    });

    autoUpdater.on('update-downloaded', (info) => {
        console.log('[Auto-Update] Đã tải xong bản cập nhật:', info.version);
        // Thông báo cho user
        const response = dialog.showMessageBoxSync(mainWindow, {
            type: 'info',
            title: 'Cập nhật sẵn sàng',
            message: `Phiên bản ${info.version} đã được tải về.\nỨng dụng sẽ khởi động lại để cập nhật.`,
            buttons: ['Cập nhật ngay', 'Để sau'],
            defaultId: 0,
        });
        if (response === 0) {
            app.isQuitting = true;
            autoUpdater.quitAndInstall();
        }
    });

    autoUpdater.on('error', (error) => {
        console.error('[Auto-Update] Lỗi:', error);
    });

    // Kiểm tra cập nhật sau 10 giây
    setTimeout(() => {
        autoUpdater.checkForUpdatesAndNotify().catch(err => {
            console.warn('[Auto-Update] Không thể kiểm tra:', err.message);
        });
    }, 10000);

    // Kiểm tra lại mỗi 4 giờ
    setInterval(() => {
        autoUpdater.checkForUpdatesAndNotify().catch(() => {});
    }, 4 * 60 * 60 * 1000);
}

// ==================== IPC HANDLERS ====================
function setupIPC() {
    // Trả về thông tin phiên bản cho renderer
    ipcMain.handle('get-app-version', () => {
        return app.getVersion();
    });

    // Trả về platform info
    ipcMain.handle('get-platform-info', () => {
        return {
            platform: process.platform,
            arch: process.arch,
            isPackaged: app.isPackaged,
            version: app.getVersion(),
        };
    });
}

// ==================== APP LIFECYCLE ====================

// Ngăn chạy nhiều instance
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
    app.quit();
} else {
    app.on('second-instance', () => {
        // Focus window nếu user mở thêm instance
        if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.show();
            mainWindow.focus();
        }
    });
}

app.whenReady().then(() => {
    setupIPC();
    createWindow();
    createTray();
    setupAutoUpdater();
});

// macOS: tạo lại window khi click dock icon (không cần trên Windows)
app.on('activate', () => {
    if (mainWindow === null) {
        createWindow();
    } else {
        mainWindow.show();
    }
});

// Ngăn app thoát khi tất cả windows đóng (Windows behavior: chạy trong tray)
app.on('window-all-closed', () => {
    // Không thoát — chạy trong tray
});

// Cleanup khi thoát thật
app.on('before-quit', () => {
    app.isQuitting = true;
});

app.on('will-quit', () => {
    if (tray) {
        tray.destroy();
        tray = null;
    }
});
