import { useState, useEffect, useCallback } from 'react';
import { GOOGLE_CLIENT_ID, GOOGLE_DRIVE_SCOPE } from '../googleConfig';

// Định nghĩa kiểu dữ liệu cho thông tin người dùng
interface GoogleUser {
    name: string;
    picture: string;
    email: string;
}

// Định nghĩa kiểu dữ liệu cho access token
interface AccessToken {
    access_token: string;
    expires_in: number;
    scope: string;
}

// Khai báo các đối tượng từ thư viện Google Identity Services (GSI)
declare global {
    interface Window {
        google: any;
    }
}

export const useGoogleAuth = () => {
    const [user, setUser] = useState<GoogleUser | null>(null);
    const [accessToken, setAccessToken] = useState<string | null>(null);
    const [isGsiLoaded, setIsGsiLoaded] = useState(false);

    // Chỉ tải GSI script một lần khi component được mount
    useEffect(() => {
        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        script.onload = () => {
            setIsGsiLoaded(true);
        };
        script.onerror = () => {
            console.error("Google GSI script failed to load.");
        }
        document.body.appendChild(script);

        return () => {
            document.body.removeChild(script);
        };
    }, []);

    // Tách logic xử lý token ra một hàm riêng, sử dụng useCallback để tối ưu
    const handleTokenResponse = useCallback(async (tokenResponse: AccessToken) => {
        if (tokenResponse && tokenResponse.access_token) {
            setAccessToken(tokenResponse.access_token);
            try {
                const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                    headers: { 'Authorization': `Bearer ${tokenResponse.access_token}` }
                });
                if (userInfoResponse.ok) {
                    const userInfo: GoogleUser = await userInfoResponse.json();
                    setUser(userInfo);
                } else {
                    throw new Error('Failed to fetch user info');
                }
            } catch (error) {
                console.error('Error fetching user info:', error);
                // Xóa trạng thái đăng nhập nếu có lỗi
                setUser(null);
                setAccessToken(null);
            }
        }
    }, []);

    // Hàm đăng nhập, khởi tạo client "just-in-time"
    const login = useCallback(() => {
        if (GOOGLE_CLIENT_ID.startsWith("PASTE_YOUR_GOOGLE_CLIENT_ID_HERE")) {
            alert(
                "LỖI CẤU HÌNH ĐĂNG NHẬP GOOGLE\n\n" +
                "Bạn chưa cập nhật Google Client ID.\n\n" +
                "Vui lòng mở file `googleConfig.ts` trong dự án và làm theo hướng dẫn để tạo và dán Client ID của bạn vào."
            );
            return;
        }

        if (!isGsiLoaded || !window.google || !window.google.accounts) {
            console.error('Google GSI script not loaded or initialized yet.');
            alert('Dịch vụ Google chưa sẵn sàng, vui lòng thử lại sau giây lát.');
            return;
        }
        
        // Khởi tạo token client ngay tại thời điểm gọi, đảm bảo không có trạng thái cũ
        const tokenClient = window.google.accounts.oauth2.initTokenClient({
            client_id: GOOGLE_CLIENT_ID,
            scope: GOOGLE_DRIVE_SCOPE,
            callback: handleTokenResponse, // Sử dụng callback đã được memoized
        });

        // Yêu cầu access token
        tokenClient.requestAccessToken({ prompt: '' });
    }, [isGsiLoaded, handleTokenResponse]);

    // Hàm đăng xuất
    const logout = useCallback(() => {
        if (accessToken && window.google && window.google.accounts) {
            window.google.accounts.oauth2.revoke(accessToken, () => {
                console.log('Token revoked.');
            });
        }
        setUser(null);
        setAccessToken(null);
    }, [accessToken]);

    return { user, accessToken, login, logout };
};
