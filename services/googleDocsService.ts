/**
 * Tải một file blob lên Google Drive và chuyển đổi nó thành Google Doc.
 * @param blob - Dữ liệu file Word (.docx) dưới dạng Blob.
 * @param fileName - Tên file sẽ được tạo trên Google Drive.
 * @param accessToken - Access token của người dùng đã được xác thực.
 * @returns {Promise<string>} - Một Promise trả về URL để xem file Google Doc vừa tạo.
 */
export const uploadToGoogleDocs = async (blob: Blob, fileName: string, accessToken: string): Promise<string> => {
    const DRIVE_API_URL = "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink";

    // 1. Tạo metadata cho file trên Google Drive
    const metadata = {
        name: fileName,
        mimeType: 'application/vnd.google-apps.document', // Yêu cầu Google Drive chuyển đổi thành Google Doc
    };

    // 2. Tạo một đối tượng FormData để gửi dữ liệu multipart
    const formData = new FormData();
    
    // Part 1: Metadata (dưới dạng JSON)
    formData.append(
        'metadata',
        new Blob([JSON.stringify(metadata)], { type: 'application/json' })
    );

    // Part 2: Nội dung file thực tế
    // FIX: Tham số thứ ba cho formData.append đối với Blob phải là một chuỗi (tên file), không phải là một đối tượng.
    // Tên file cho phần tải lên nên có phần mở rộng gốc để Google Drive có thể chuyển đổi chính xác.
    formData.append(
        'file',
        blob,
        `${fileName}.docx`
    );

    // 3. Gửi yêu cầu POST đến Google Drive API
    const response = await fetch(DRIVE_API_URL, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
        },
        body: formData,
    });

    // 4. Xử lý kết quả
    if (!response.ok) {
        const errorData = await response.json();
        console.error('Google Drive API Error:', errorData);
        throw new Error(`Không thể tải lên Google Docs. Lỗi: ${errorData.error?.message || response.statusText}`);
    }

    const result = await response.json();
    
    // Trả về webViewLink, là URL để người dùng có thể xem tài liệu
    // Fallback: nếu webViewLink không có, tạo URL từ file id
    return result.webViewLink || `https://docs.google.com/document/d/${result.id}/edit`;
};
