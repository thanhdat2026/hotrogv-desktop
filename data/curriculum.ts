import { GradeLevel } from "../types";

export interface Curriculum {
    grade: GradeLevel;
    chapters: {
        name: string;
        lessons: string[];
    }[];
}

export const TIENGVIET_KNTT_CURRICULUM: Curriculum[] = [
    {
        grade: GradeLevel.Grade2,
        chapters: [
            { name: "Tập 1", lessons: ["Chủ đề 1: Em đã lớn|1", "Chủ đề 2: Mỗi người một vẻ|1", "Chủ đề 3: Yêu thương, chia sẻ|1", "Chủ đề 4: Quê hương trong tôi|1", "Chủ đề 5: Vẻ đẹp quanh em|1"] },
            { name: "Tập 2", lessons: ["Chủ đề 6: Con người Việt Nam|1", "Chủ đề 7: Yêu quý mẹ thiên nhiên|1", "Chủ đề 8: Vòng tay yêu thương|1", "Chủ đề 9: Mùa hè của em|1"] }
        ]
    },
    {
        grade: GradeLevel.Grade3,
        chapters: [
            { name: "Tập 1", lessons: ["Chủ đề 1: Những trải nghiệm thú vị|1", "Chủ đề 2: Cổng trường rộng mở|1", "Chủ đề 3: Bạn bè của em|1", "Chủ đề 4: Cùng em sáng tạo|1", "Chủ đề 5: Những sắc màu thiên nhiên|1"] },
            { name: "Tập 2", lessons: ["Chủ đề 6: Bài học từ cuộc sống|1", "Chủ đề 7: Đất nước tươi đẹp|1", "Chủ đề 8: Trái đất của chúng mình|1", "Chủ đề 9: Mùa hè vui vẻ|1"] }
        ]
    },
    {
        grade: GradeLevel.Grade4,
        chapters: [
            { name: "Tập 1", lessons: ["Chủ đề 1: Tuổi ngựa|1", "Chủ đề 2: Chân trời rộng mở|1", "Chủ đề 3: Ước mơ của em|1", "Chủ đề 4: Gieo mầm yêu thương|1", "Chủ đề 5: Chung bước dưới cờ|1"] },
            { name: "Tập 2", lessons: ["Chủ đề 6: Quê hương trong tôi|1", "Chủ đề 7: Sức mạnh của tình yêu thương|1", "Chủ đề 8: Vòng tay bè bạn|1", "Chủ đề 9: Chắp cánh ước mơ|1"] }
        ]
    },
    {
        grade: GradeLevel.Grade5,
        chapters: [
            { name: "Tập 1", lessons: ["Chủ đề 1: Trải nghiệm để trưởng thành|1", "Chủ đề 2: Kết nối và sẻ chia|1", "Chủ đề 3: Mái nhà yêu thương|1", "Chủ đề 4: Quê hương muôn màu|1", "Chủ đề 5: Những cánh buồm|1"] },
            { name: "Tập 2", lessons: ["Chủ đề 6: Chân trời mới|1", "Chủ đề 7: Vì một thế giới bình yên|1", "Chủ đề 8: Sống để yêu thương|1", "Chủ đề 9: Mùa hè cuối cấp|1"] }
        ]
    }
];

export const NGUVAN_KNTT_CURRICULUM: Curriculum[] = [
    {
        grade: GradeLevel.Grade6,
        chapters: [
            { name: "Tập 1", lessons: ["Bài 1: Tôi và các bạn|1", "Bài 2: Gõ cửa trái tim|1", "Bài 3: Yêu và hiểu|1", "Bài 4: Quê hương yêu dấu|1", "Bài 5: Những nẻo đường xứ sở|1"] },
            { name: "Tập 2", lessons: ["Bài 6: Chuyện kể về những người anh hùng|1", "Bài 7: Thế giới cổ tích|1", "Bài 8: Khác biệt và gần gũi|1", "Bài 9: Trái Đất - ngôi nhà chung|1", "Bài 10: Cuốn sách tôi yêu|1"] }
        ]
    },
    {
        grade: GradeLevel.Grade7,
        chapters: [
            { name: "Tập 1", lessons: ["Bài 1: Bầu trời tuổi thơ|1", "Bài 2: Giai điệu đất nước|1", "Bài 3: Cội nguồn yêu thương|1", "Bài 4: Nghị luận văn học|1", "Bài 5: Văn bản thông tin|1"] },
            { name: "Tập 2", lessons: ["Bài 6: Truyện ngụ ngôn và tục ngữ|1", "Bài 7: Thơ|1", "Bài 8: Góc nhìn văn chương|1", "Bài 9: Sống có ý nghĩa|1", "Bài 10: Tùy bút và tản văn|1", "Bài 11: Kịch bản và truyện khoa học viễn tưởng|1"] }
        ]
    },
    {
        grade: GradeLevel.Grade8,
        chapters: [
            { name: "Tập 1", lessons: ["Bài 1: Câu chuyện của lịch sử|1", "Bài 2: Vẻ đẹp cổ điển|1", "Bài 3: Lời sông núi|1", "Bài 4: Tiếng cười trào phúng trong thơ|1", "Bài 5: Những tình huống khôi hài|1"] },
            { name: "Tập 2", lessons: ["Bài 6: Chân dung cuộc sống|1", "Bài 7: Tiếng nói của vạn vật|1", "Bài 8: Nhà văn và trang viết|1", "Bài 9: Lựa chọn và hành động|1", "Bài 10: Sách - người bạn đồng hành|1"] }
        ]
    },
    {
        grade: GradeLevel.Grade9,
        chapters: [
            { name: "Tập 1", lessons: ["Bài 1: Truyện ngắn hiện đại|1", "Bài 2: Thơ hiện đại|1", "Bài 3: Kịch hiện đại|1", "Bài 4: Nghị luận văn học|1", "Bài 5: Văn bản thông tin|1"] },
            { name: "Tập 2", lessons: ["Bài 6: Truyện Kiều|1", "Bài 7: Thơ trung đại|1", "Bài 8: Văn bản nghị luận|1", "Bài 9: Văn bản thông tin|1", "Bài 10: Tổng kết|1"] }
        ]
    }
];

export const TOAN_KNTT_CURRICULUM: Curriculum[] = [
    {
        grade: GradeLevel.Grade4,
        chapters: [
            {
                name: "Chủ đề 1: Ôn tập và bổ sung",
                lessons: [
                    "Bài 1: Ôn tập các số đến 100 000|1",
                    "Bài 2: Ôn tập phép cộng, phép trừ|1",
                    "Bài 3: Ôn tập phép nhân, phép chia|2",
                    "Bài 4: Biểu thức chữ|1",
                    "Bài 5: Giải bài toán có ba bước tính|1",
                    "Bài 6: Luyện tập chung|1"
                ]
            },
            {
                name: "Chủ đề 2: Góc và đơn vị đo góc",
                lessons: [
                    "Bài 7: Đo góc, đơn vị đo góc|1",
                    "Bài 8: Góc nhọn, góc tù, góc bẹt|1",
                    "Bài 9: Luyện tập chung|1"
                ]
            },
            {
                name: "Chủ đề 3: Số có nhiều chữ số",
                lessons: [
                    "Bài 10: Số có sáu chữ số. Số 1 000 000|2",
                    "Bài 11: Hàng và lớp|1",
                    "Bài 12: Các số trong phạm vi lớp triệu|2",
                    "Bài 13: Làm tròn số đến hàng nghìn, hàng chục nghìn, hàng trăm nghìn|1",
                    "Bài 14: So sánh các số có nhiều chữ số|1",
                    "Bài 15: Làm quen với dãy số tự nhiên|1",
                    "Bài 16: Luyện tập chung|2"
                ]
            },
            {
                name: "Chủ đề 4: Một số đơn vị đo đại lượng",
                lessons: [
                    "Bài 17: Yến, tạ, tấn|1",
                    "Bài 18: Đề-xi-mét vuông, mét vuông, mi-li-mét vuông|2",
                    "Bài 19: Giây, thế kỉ|1",
                    "Bài 20: Luyện tập chung|1",
                ]
            },
            {
                name: "Chủ đề 5: Phép cộng và phép trừ",
                lessons: [
                    "Bài 21: Phép cộng các số có nhiều chữ số|1",
                    "Bài 22: Phép trừ các số có nhiều chữ số|1",
                    "Bài 23: Luyện tập chung|1",
                    "Bài 24: Tính chất giao hoán và kết hợp của phép cộng|1",
                    "Bài 25: Tìm hai số biết tổng và hiệu của hai số đó|2",
                    "Bài 26: Luyện tập chung|1"
                ]
            },
            {
                name: "Chủ đề 6: Đường thẳng vuông góc. Đường thẳng song song",
                lessons: [
                    "Bài 27: Hai đường thẳng vuông góc|1",
                    "Bài 28: Hai đường thẳng song song|1",
                    "Bài 29: Luyện tập chung|1"
                ]
            },
            {
                name: "Chủ đề 7: Phép nhân và phép chia",
                lessons: [
                    "Bài 30: Trực quan về phân số|1",
                    "Bài 31: Nhân với số có một chữ số|1",
                    "Bài 32: Nhân với số có hai chữ số|1",
                    "Bài 33: Luyện tập chung|1",
                    "Bài 34: Chia cho số có một chữ số|1",
                    "Bài 35: Chia cho số có hai chữ số|2",
                    "Bài 36: Chia cho số có ba chữ số|2",
                    "Bài 37: Luyện tập chung|1"
                ]
            },
            {
                name: "Chủ đề 8: Phân số",
                lessons: [
                    "Bài 38: Phân số|2",
                    "Bài 39: Phân số bằng nhau|1",
                    "Bài 40: Rút gọn phân số|1",
                    "Bài 41: Quy đồng mẫu số các phân số|1",
                    "Bài 42: So sánh hai phân số|2",
                    "Bài 43: Luyện tập chung|1"
                ]
            },
            {
                name: "Chủ đề 9: Phép cộng và phép trừ phân số",
                lessons: [
                    "Bài 44: Phép cộng phân số|2",
                    "Bài 45: Phép trừ phân số|2",
                    "Bài 46: Tìm phân số của một số|1",
                    "Bài 47: Luyện tập chung|2"
                ]
            },
            {
                name: "Chủ đề 10: Phép nhân và phép chia phân số",
                lessons: [
                    "Bài 48: Phép nhân phân số|2",
                    "Bài 49: Phép chia phân số|2",
                    "Bài 50: Luyện tập chung|2"
                ]
            },
             {
                name: "Chủ đề 11: Đại lượng và Thống kê",
                lessons: [
                    "Bài 51: Dãy số liệu thống kê|1",
                    "Bài 52: Biểu đồ cột|1",
                    "Bài 53: Khả năng xảy ra của một sự kiện|1",
                    "Bài 54: Luyện tập chung|1"
                ]
            },
            {
                name: "Chủ đề 12: Ôn tập cuối năm",
                lessons: [
                    "Bài 55: Ôn tập các số đến lớp triệu|1",
                    "Bài 56: Ôn tập các phép tính với số tự nhiên|1",
                    "Bài 57: Ôn tập phân số và các phép tính|2",
                    "Bài 58: Ôn tập hình học và đo lường|1",
                    "Bài 59: Ôn tập biểu đồ và xác suất thực nghiệm|1"
                ]
            }
        ]
    },
    {
        grade: GradeLevel.Grade5,
        chapters: [
            {
                name: "Chủ đề 1: Ôn tập và bổ sung",
                lessons: [
                    "Bài 1: Ôn tập số tự nhiên|1",
                    "Bài 2: Ôn tập phép tính với số tự nhiên|2",
                    "Bài 3: Ôn tập phân số|1",
                    "Bài 4: Phân số thập phân|1",
                    "Bài 5: Ôn tập các phép tính với phân số|2",
                    "Bài 6: Cộng, trừ hai phân số khác mẫu số|1",
                    "Bài 7: Luyện tập chung|1"
                ]
            },
            {
                name: "Chủ đề 2: Số thập phân",
                lessons: [
                    "Bài 8: Khái niệm số thập phân|2",
                    "Bài 9: Hàng của số thập phân. Đọc, viết số thập phân|1",
                    "Bài 10: Số thập phân bằng nhau|1",
                    "Bài 11: So sánh hai số thập phân|1",
                    "Bài 12: Viết số đo đại lượng dưới dạng số thập phân|2",
                    "Bài 13: Làm tròn số thập phân|1",
                    "Bài 14: Luyện tập chung|1"
                ]
            },
            {
                name: "Chủ đề 3: Các phép tính với số thập phân",
                lessons: [
                    "Bài 15: Phép cộng số thập phân|1",
                    "Bài 16: Phép trừ số thập phân|1",
                    "Bài 17: Phép nhân số thập phân|2",
                    "Bài 18: Phép chia số thập phân|2",
                    "Bài 19: Luyện tập chung|2"
                ]
            },
            {
                name: "Chủ đề 4: Tỉ số phần trăm",
                lessons: [
                    "Bài 20: Tỉ số phần trăm|2",
                    "Bài 21: Các phép tính với tỉ số phần trăm|1",
                    "Bài 22: Giải toán về tỉ số phần trăm|2",
                    "Bài 23: Luyện tập chung|1"
                ]
            },
            {
                name: "Chủ đề 5: Một số hình phẳng. Chu vi và diện tích",
                lessons: [
                    "Bài 24: Hình tam giác. Diện tích hình tam giác|2",
                    "Bài 25: Hình thang. Diện tích hình thang|2",
                    "Bài 26: Hình tròn. Chu vi và diện tích hình tròn|2",
                    "Bài 27: Luyện tập chung|2"
                ]
            },
            {
                name: "Chủ đề 6: Hình hộp chữ nhật, hình lập phương",
                lessons: [
                    "Bài 28: Hình hộp chữ nhật. Hình lập phương|1",
                    "Bài 29: Diện tích xung quanh, diện tích toàn phần của hình hộp chữ nhật, hình lập phương|2",
                    "Bài 30: Thể tích. Một số đơn vị đo thể tích|1",
                    "Bài 31: Thể tích hình hộp chữ nhật, thể tích hình lập phương|2",
                    "Bài 32: Luyện tập chung|1"
                ]
            },
            {
                name: "Chủ đề 7: Toán chuyển động đều",
                lessons: [
                    "Bài 33: Số đo thời gian. Cộng, trừ số đo thời gian|2",
                    "Bài 34: Nhân, chia số đo thời gian|2",
                    "Bài 35: Vận tốc, Quãng đường, Thời gian|3",
                    "Bài 36: Luyện tập chung|2"
                ]
            },
            {
                name: "Chủ đề 8: Biểu đồ và xác suất",
                lessons: [
                    "Bài 37: Biểu đồ hình quạt tròn|1",
                    "Bài 38: Xác suất thực nghiệm|1",
                    "Bài 39: Luyện tập chung|1"
                ]
            },
             {
                name: "Chủ đề 9: Ôn tập cuối năm",
                lessons: [
                    "Bài 40: Ôn tập về số học|2",
                    "Bài 41: Ôn tập về đại lượng đo lường|1",
                    "Bài 42: Ôn tập về hình học|1",
                    "Bài 43: Ôn tập về giải toán|2"
                ]
            }
        ]
    },
    {
        grade: GradeLevel.Grade6,
        chapters: [
            {
                name: "Chương I: Tập hợp các số tự nhiên",
                lessons: [
                    "Bài 1: Tập hợp|1",
                    "Bài 2: Cách ghi số tự nhiên|1",
                    "Bài 3: Thứ tự trong tập hợp các số tự nhiên|1",
                    "Bài 4: Phép cộng và phép trừ số tự nhiên|2",
                    "Bài 5: Phép nhân và phép chia số tự nhiên|2",
                    "Luyện tập chung (Chương I - 1)|1",
                    "Bài 6: Lũy thừa với số mũ tự nhiên|2",
                    "Bài 7: Thứ tự thực hiện các phép tính|1",
                    "Bài tập cuối chương I|1"
                ]
            },
            {
                name: "Chương II: Tính chia hết",
                lessons: [
                    "Bài 8: Quan hệ chia hết và tính chất|2",
                    "Bài 9: Dấu hiệu chia hết|2",
                    "Bài 10: Số nguyên tố|2",
                    "Luyện tập chung (Chương II - 1)|1",
                    "Bài 11: Ước chung. Ước chung lớn nhất|2",
                    "Bài 12: Bội chung. Bội chung nhỏ nhất|2",
                    "Luyện tập chung (Chương II - 2)|1",
                    "Bài tập cuối chương II|1"
                ]
            },
            {
                name: "Chương III: Số nguyên",
                lessons: [
                    "Bài 13: Tập hợp các số nguyên|2",
                    "Bài 14: Phép cộng và phép trừ số nguyên|3",
                    "Bài 15: Quy tắc dấu ngoặc|1",
                    "Luyện tập chung (Chương III - 1)|2",
                    "Bài 16: Phép nhân số nguyên|2",
                    "Bài 17: Phép chia hết. Ước và bội của một số nguyên|1",
                    "Luyện tập chung (Chương III - 2)|2",
                    "Bài tập ôn chương III|1"
                ]
            },
             {
                name: "Chương IV: Hình phẳng trong thực tiễn",
                lessons: [
                    "Bài 18: Hình tam giác đều. Hình vuông. Hình lục giác đều|3",
                    "Bài 19: Hình chữ nhật. Hình thoi. Hình bình hành. Hình thang cân|3",
                    "Bài 20: Chu vi và diện tích của một số tứ giác đã học|3",
                    "Luyện tập chung (Chương IV)|2",
                    "Ôn tập cuối chương IV|1"
                ]
            },
            {
                name: "Chương V: Tính đối xứng của hình phẳng",
                lessons: [
                    "Bài 21: Hình có trục đối xứng|2",
                    "Bài 22: Hình có tâm đối xứng|2",
                    "Luyện tập chung (Chương V)|2",
                    "Ôn tập chương V|1"
                ]
            },
             {
                name: "Chương VI: Phân số",
                lessons: [
                    "Bài 23: Mở rộng phân số. Phân số bằng nhau|2",
                    "Bài 24: So sánh phân số. Hỗn số dương|2",
                    "Luyện tập chung (Chương VI - 1)|3",
                    "Bài 25: Phép cộng và phép trừ phân số|2",
                    "Bài 26: Phép nhân và phép chia phân số|2",
                    "Bài 27: Hai bài toán về phân số|1",
                    "Luyện tập chung (Chương VI - 2)|2",
                    "Ôn tập chương VI|1"
                ]
            },
            {
                name: "Chương VII: Số thập phân",
                lessons: [
                    "Bài 28: Số thập phân|1",
                    "Bài 29: Tính toán với số thập phân|4",
                    "Bài 30: Làm tròn số thập phân|1",
                    "Bài 31: Một số bài toán về tỉ số và tỉ số phần trăm|2",
                    "Luyện tập chung (Chương VII)|2"
                ]
            },
            {
                name: "Chương VIII: Hình học cơ bản",
                lessons: [
                    "Bài 32: Điểm và đường thẳng|3",
                    "Bài 33: Điểm nằm giữa hai điểm. Tia|2",
                    "Bài 34: Đoạn thẳng. Độ dài đoạn thẳng|2",
                    "Bài 35: Trung điểm của đoạn thẳng|1",
                    "Luyện tập chung (Chương VIII - 1)|2",
                    "Bài 36: Góc|2",
                    "Bài 37: Số đo góc|2",
                    "Luyện tập chung (Chương VIII - 2)|2",
                    "Ôn tập chương VIII|1"
                ]
            },
            {
                name: "Chương IX: Dữ liệu và xác suất thực nghiệm",
                lessons: [
                    "Bài 38: Dữ liệu và thu thập số liệu|2",
                    "Bài 39: Bảng thống kê và biểu đồ tranh|2",
                    "Bài 40: Biểu đồ cột|2",
                    "Bài 41: Biểu đồ cột kép|2",
                    "Luyện tập chung (Chương IX - 1)|2",
                    "Bài 42: Kết quả có thể và sự kiện trong trò chơi, thí nghiệm|2",
                    "Bài 43: Xác suất thực nghiệm|1",
                    "Luyện tập chung (Chương IX - 2)|1",
                    "Ôn tập chương IX|1"
                ]
            },
            {
                name: "Hoạt động thực hành và trải nghiệm",
                lessons: [
                    "Tấm thiệp và phòng học của em|2",
                    "Vẽ hình đơn giản với phần mềm GeoGebra|2",
                    "Kế hoạch chi tiêu cá nhân và gia đình|1",
                    "Hoạt động thể thao nào được yêu thích nhất trong hè|2"
                ]
            }
        ]
    },
    {
        grade: GradeLevel.Grade7,
        chapters: [
            {
                name: "Chương I: Số hữu tỉ",
                lessons: [
                    "Bài 1: Tập hợp các số hữu tỉ|2",
                    "Bài 2: Cộng, trừ, nhân, chia số hữu tỉ|2",
                    "Luyện tập chung (Chương I - 1)|1",
                    "Bài 3: Luỹ thừa với số mũ tự nhiên của một số hữu tỉ|2",
                    "Bài 4: Thứ tự thực hiện các phép tính. Quy tắc chuyển vế|2",
                    "Luyện tập chung (Chương I - 2)|1",
                    "Bài tập cuối chương I|1"
                ]
            },
            {
                name: "Chương II: Số thực",
                lessons: [
                    "Bài 5: Làm quen với số thập phân vô hạn tuần hoàn|1",
                    "Bài 6: Số vô tỉ. Căn bậc hai số học|2",
                    "Bài 7: Tập hợp các số thực|2",
                    "Luyện tập chung (Chương II)|1",
                    "Bài tập cuối chương II|1"
                ]
            },
            {
                name: "Chương III: Góc và đường thẳng song song",
                lessons: [
                    "Bài 8: Góc ở vị trí đặc biệt. Tia phân giác của một góc|2",
                    "Bài 9: Hai đường thẳng song song và dấu hiệu nhận biết|2",
                    "Luyện tập chung (Chương III - 1)|1",
                    "Bài 10: Tiên đề Euclid. Tính chất của hai đường thẳng song song|2",
                    "Bài 11: Định lí và chứng minh định lí|2",
                    "Luyện tập chung (Chương III - 2)|1",
                    "Bài tập cuối chương III|1"
                ]
            },
            {
                name: "Chương IV: Tam giác bằng nhau",
                lessons: [
                    "Bài 12: Tổng các góc trong một tam giác|1",
                    "Bài 13: Hai tam giác bằng nhau. Trường hợp bằng nhau thứ nhất của tam giác|2",
                    "Luyện tập chung (Chương IV - 1)|1",
                    "Bài 14: Trường hợp bằng nhau thứ hai và thứ ba của tam giác|3",
                    "Luyện tập chung (Chương IV - 2)|1",
                    "Bài 15: Các trường hợp bằng nhau của tam giác vuông|2",
                    "Bài 16: Tam giác cân. Đường trung trực của đoạn thẳng|2",
                    "Luyện tập chung (Chương IV - 3)|1",
                    "Bài tập cuối chương IV|2"
                ]
            },
            {
                name: "Chương V: Thu thập và biểu diễn dữ liệu",
                lessons: [
                    "Bài 17: Thu thập và phân loại dữ liệu|2",
                    "Bài 18: Biểu đồ hình quạt tròn|2",
                    "Bài 19: Biểu đồ đoạn thẳng|2",
                    "Luyện tập chung (Chương V)|1",
                    "Bài tập cuối chương V|1"
                ]
            },
            {
                name: "Hoạt động thực hành trải nghiệm (Giữa kì)",
                lessons: [
                    "Vẽ hình đơn giản với phần mềm GeoGebra|1",
                    "Dân số và cơ cấu dân số Việt Nam|1"
                ]
            },
            {
                name: "Chương VI: Tỉ lệ thức và đại lượng tỉ lệ",
                lessons: [
                    "Bài 20: Tỉ lệ thức|2",
                    "Bài 21: Tính chất của dãy tỉ số bằng nhau|2",
                    "Luyện tập chung (Chương VI - 1)|1",
                    "Bài 22: Đại lượng tỉ lệ thuận|2",
                    "Bài 23: Đại lượng tỉ lệ nghịch|2",
                    "Luyện tập chung (Chương VI - 2)|1",
                    "Bài tập cuối chương VI|1"
                ]
            },
            {
                name: "Chương VII: Biểu thức đại số và đa thức một biến",
                lessons: [
                    "Bài 24: Biểu thức đại số|1",
                    "Bài 25: Đa thức một biến|2",
                    "Bài 26: Phép cộng và phép trừ đa thức một biến|2",
                    "Luyện tập chung (Chương VII - 1)|1",
                    "Bài 27: Phép nhân đa thức một biến|2",
                    "Bài 28: Phép chia đa thức một biến|3",
                    "Luyện tập chung (Chương VII - 2)|1",
                    "Bài tập cuối chương VII|2"
                ]
            },
            {
                name: "Chương VIII: Làm quen với biến cố và xác suất của biến cố",
                lessons: [
                    "Bài 29: Làm quen với biến cố|2",
                    "Bài 30: Làm quen với xác suất của biến cố|2",
                    "Luyện tập chung (Chương VIII)|1",
                    "Bài tập cuối chương VIII|1"
                ]
            },
            {
                name: "Chương IX: Quan hệ giữa các yếu tố trong một tam giác",
                lessons: [
                    "Bài 31: Quan hệ giữa góc và cạnh đối diện trong một tam giác|2",
                    "Bài 32: Quan hệ giữa đường vuông góc và đường xiên|1",
                    "Bài 33: Quan hệ giữa ba cạnh của một tam giác|1",
                    "Luyện tập chung (Chương IX - 1)|1",
                    "Bài 34: Sự đồng quy của ba trung tuyến, ba đường phân giác trong một tam giác|2",
                    "Bài 35: Sự đồng quy của ba đường trung trực, ba đường cao trong một tam giác|2",
                    "Luyện tập chung (Chương IX - 2)|1",
                    "Bài tập cuối chương IX|2"
                ]
            },
            {
                name: "Chương X: Một số hình khối trong thực tiễn",
                lessons: [
                    "Bài 36: Hình hộp chữ nhật và hình lập phương|2",
                    "Luyện tập (Bài 36)|1",
                    "Bài 37: Hình lăng trụ đứng tam giác và hình lăng trụ đứng tứ giác|2",
                    "Luyện tập (Bài 37)|1",
                    "Bài tập cuối chương X|1"
                ]
            },
            {
                name: "Hoạt động thực hành trải nghiệm (Cuối kì)",
                lessons: [
                    "Đại lượng tỉ lệ trong đời sống|1",
                    "Vòng quay may mắn|1",
                    "Hộp quà và chân đế lịch để bàn của em|1"
                ]
            },
            {
                name: "Ôn tập cuối năm",
                lessons: [
                    "Bài tập ôn tập cuối năm|4"
                ]
            }
        ]
    },
    {
        grade: GradeLevel.Grade8,
        chapters: [
            {
                name: "Chương I: Đa thức",
                lessons: [
                    "Bài 1: Đơn thức và đa thức nhiều biến|2",
                    "Bài 2: Các phép tính với đa thức nhiều biến|3",
                    "Luyện tập chung (Chương I)|2",
                    "Bài tập cuối chương I|1"
                ]
            },
            {
                name: "Chương II: Hằng đẳng thức đáng nhớ",
                lessons: [
                    "Bài 3: Hằng đẳng thức đáng nhớ|3",
                    "Bài 4: Phân tích đa thức thành nhân tử|4",
                    "Luyện tập chung (Chương II)|2",
                    "Bài tập cuối chương II|1"
                ]
            },
             {
                name: "Chương III: Tứ giác",
                lessons: [
                    "Bài 5: Hình chóp tam giác đều - Hình chóp tứ giác đều|2",
                    "Bài 6: Tứ giác|1",
                    "Bài 7: Hình thang - Hình thang cân|2",
                    "Bài 8: Hình bình hành - Hình chữ nhật|2",
                    "Bài 9: Hình thoi - Hình vuông|2",
                    "Luyện tập chung (Chương III)|2",
                    "Bài tập cuối chương III|1"
                ]
            },
            {
                name: "Chương IV: Định lí Thalès",
                lessons: [
                    "Bài 10: Định lí Thalès trong tam giác|3",
                    "Bài 11: Đường trung bình của tam giác|2",
                    "Bài 12: Tính chất đường phân giác của tam giác|2",
                    "Luyện tập chung (Chương IV)|2",
                    "Bài tập cuối chương IV|1"
                ]
            },
            {
                name: "Chương V: Dữ liệu và biểu đồ",
                lessons: [
                    "Bài 13: Thu thập và phân loại dữ liệu|1",
                    "Bài 14: Biểu diễn dữ liệu bằng bảng, biểu đồ|2",
                    "Bài 15: Phân tích số liệu thống kê|2",
                    "Luyện tập chung (Chương V)|2",
                    "Bài tập cuối chương V|1"
                ]
            },
            {
                name: "Chương VI: Phân thức đại số",
                lessons: [
                    "Bài 16: Phân thức đại số|1",
                    "Bài 17: Tính chất cơ bản của phân thức đại số|2",
                    "Bài 18: Phép cộng và phép trừ phân thức đại số|2",
                    "Bài 19: Phép nhân và phép chia phân thức đại số|2",
                    "Luyện tập chung (Chương VI)|2",
                    "Bài tập cuối chương VI|1"
                ]
            },
            {
                name: "Chương VII: Phương trình bậc nhất và hàm số bậc nhất",
                lessons: [
                    "Bài 20: Phương trình bậc nhất một ẩn|2",
                    "Bài 21: Giải bài toán bằng cách lập phương trình|2",
                    "Luyện tập chung (Phương trình)|2",
                    "Bài 22: Khái niệm hàm số và đồ thị của hàm số|2",
                    "Bài 23: Hàm số bậc nhất và đồ thị|2",
                    "Bài 24: Hệ số góc của đường thẳng|2",
                    "Luyện tập chung (Hàm số)|2",
                    "Bài tập cuối chương VII|1"
                ]
            },
            {
                name: "Chương VIII: Mở đầu về tính xác suất của biến cố",
                lessons: [
                    "Bài 25: Kết quả có thể và kết quả thuận lợi|1",
                    "Bài 26: Cách tính xác suất của biến cố bằng tỉ số|2",
                    "Bài 27: Mối liên hệ giữa xác suất thực nghiệm và xác suất lí thuyết|3",
                    "Luyện tập chung (Chương VIII)|2",
                    "Bài tập cuối chương VIII|1"
                ]
            },
             {
                name: "Chương IX: Tam giác đồng dạng",
                lessons: [
                    "Bài 28: Hai tam giác đồng dạng|2",
                    "Bài 29: Ba trường hợp đồng dạng của hai tam giác|5",
                    "Bài 30: Định lí Pythagore và ứng dụng|2",
                    "Bài 31: Các trường hợp đồng dạng của hai tam giác vuông|2",
                    "Bài 32: Hình đồng dạng|1",
                    "Luyện tập chung (Chương IX)|2",
                    "Bài tập cuối chương IX|1"
                ]
            },
            {
                name: "Chương X: Một số hình khối trong thực tiễn",
                lessons: [
                    "Bài 33: Hình chóp tam giác đều và hình chóp tứ giác đều|2",
                    "Bài 34: Diện tích xung quanh và thể tích của hình chóp|2",
                    "Bài tập cuối chương X|1"
                ]
            }
        ]
    },
    {
        grade: GradeLevel.Grade9,
        chapters: [
            {
                name: "Chương I: Phương trình và hệ hai phương trình bậc nhất hai ẩn",
                lessons: [
                    "Bài 1: Khái niệm phương trình và hệ hai phương trình bậc nhất hai ẩn|2",
                    "Bài 2: Giải hệ hai phương trình bậc nhất hai ẩn|3",
                    "Luyện tập chung (Chương I)|2",
                    "Bài 3: Giải bài toán bằng cách lập hệ phương trình|3",
                    "Bài tập cuối chương I|2"
                ]
            },
            {
                name: "Chương II: Phương trình và bất phương trình bậc nhất một ẩn",
                lessons: [
                    "Bài 4: Phương trình quy về phương trình bậc nhất một ẩn|2",
                    "Bài 5: Bất đẳng thức và tính chất|2",
                    "Luyện tập chung (Chương II)|1",
                    "Bài 6: Bất phương trình bậc nhất một ẩn|2",
                    "Bài tập cuối chương II|1"
                ]
            },
            {
                name: "Chương III: Căn bậc hai và căn bậc ba",
                lessons: [
                    "Bài 7: Căn bậc hai và căn thức bậc hai|2",
                    "Bài 8: Khai căn bậc hai với phép nhân và phép chia|2",
                    "Luyện tập chung (Chương III - 1)|1",
                    "Bài 9: Biến đổi đơn giản và rút gọn biểu thức chứa căn thức bậc hai|4",
                    "Bài 10: Căn bậc ba và căn thức bậc ba|2",
                    "Luyện tập chung (Chương III - 2)|1",
                    "Bài tập cuối chương III|2"
                ]
            },
            {
                name: "Chương IV: Hệ thức lượng trong tam giác vuông",
                lessons: [
                    "Bài 11: Tỉ số lượng giác của góc nhọn|3",
                    "Bài 12: Một số hệ thức giữa cạnh, góc trong tam giác vuông và ứng dụng|3",
                    "Luyện tập chung (Chương IV)|1",
                    "Bài tập cuối chương IV|2"
                ]
            },
            {
                name: "Chương V: Đường tròn",
                lessons: [
                    "Bài 13: Mở đầu về đường tròn|2",
                    "Bài 14: Cung và dây của một đường tròn|2",
                    "Bài 15: Độ dài của cung tròn. Diện tích hình quạt tròn và hình vành khuyên|2",
                    "Luyện tập chung (Chương V - 1)|1",
                    "Bài 16: Vị trí tương đối của đường thẳng và đường tròn|2",
                    "Bài 17: Vị trí tương đối của hai đường tròn|2",
                    "Luyện tập chung (Chương V - 2)|1",
                    "Bài tập cuối chương V|2"
                ]
            },
            {
                name: "Hoạt động thực hành trải nghiệm (Giữa kì)",
                lessons: [
                    "Pha chế dung dịch theo nồng độ yêu cầu|1",
                    "Tính chiều cao và xác định khoảng cách|1"
                ]
            },
            {
                name: "Chương VI: Hàm số y = ax² và Phương trình bậc hai một ẩn",
                lessons: [
                    "Bài 18: Hàm số y = ax² (a ≠ 0)|2",
                    "Bài 19: Phương trình bậc hai một ẩn|2",
                    "Luyện tập chung (Chương VI - 1)|1",
                    "Bài 20: Định lí Viète và ứng dụng|2",
                    "Bài 21: Giải bài toán bằng cách lập phương trình|3",
                    "Luyện tập chung (Chương VI - 2)|1",
                    "Bài tập cuối chương VI|2"
                ]
            },
            {
                name: "Chương VII: Tần số và tần số tương đối",
                lessons: [
                    "Bài 22: Bảng tần số và biểu đồ tần số|2",
                    "Bài 23: Bảng tần số tương đối và biểu đồ tần số tương đối|2",
                    "Luyện tập chung (Chương VII)|1",
                    "Bài 24: Bảng tần số, tần số tương đối ghép nhóm và biểu đồ|2",
                    "Bài tập cuối chương VII|1"
                ]
            },
            {
                name: "Chương VIII: Xác suất của biến cố",
                lessons: [
                    "Bài 25: Phép thử ngẫu nhiên và không gian mẫu|2",
                    "Bài 26: Xác suất của biến cố liên quan tới phép thử|2",
                    "Luyện tập chung (Chương VIII)|1",
                    "Bài tập cuối chương VIII|1"
                ]
            },
            {
                name: "Chương IX: Đường tròn ngoại tiếp và nội tiếp",
                lessons: [
                    "Bài 27: Góc nội tiếp|2",
                    "Bài 28: Đường tròn ngoại tiếp và đường tròn nội tiếp của một tam giác|2",
                    "Luyện tập chung (Chương IX - 1)|1",
                    "Bài 29: Tứ giác nội tiếp|2",
                    "Bài 30: Đa giác đều|2",
                    "Luyện tập chung (Chương IX - 2)|1",
                    "Bài tập cuối chương IX|2"
                ]
            },
            {
                name: "Chương X: Một số hình khối trong thực tiễn",
                lessons: [
                    "Bài 31: Hình trụ và hình nón|2",
                    "Bài 32: Hình cầu|2",
                    "Luyện tập chung (Chương X)|1",
                    "Bài tập cuối chương X|1"
                ]
            },
            {
                name: "Hoạt động thực hành trải nghiệm (Cuối kì)",
                lessons: [
                    "Giải phương trình, hệ phương trình và vẽ đồ thị hàm số với phần mềm GeoGebra|1",
                    "Vẽ hình đơn giản với phần mềm GeoGebra|1",
                    "Xác định tần số, tần số tương đối, vẽ các biểu đồ biểu diễn bảng tần số bằng Excel|1",
                    "Gene trội trong các thế hệ lai|1"
                ]
            },
            {
                name: "Ôn tập cuối năm",
                lessons: [
                    "Bài tập ôn tập cuối năm|4"
                ]
            }
        ]
    }
];


export const TINHOC_KNTT_CURRICULUM: Curriculum[] = [
    {
        grade: GradeLevel.Grade6,
        chapters: [
            { name: "Chủ đề 1: Máy tính và cộng đồng", lessons: ["Bài 1: Thông tin và dữ liệu|1", "Bài 2: Xử lý thông tin|1", "Bài 3: Thông tin trong máy tính|1"] },
            { name: "Chủ đề 2: Mạng máy tính và internet", lessons: ["Bài 4: Mạng máy tính|1", "Bài 5: Internet|1"] },
            { name: "Chủ đề 3: Tổ chức lưu trữ, tìm kiếm và trao đổi thông tin", lessons: ["Bài 6: Mạng thông tin toàn cầu|1", "Bài 7: Tìm kiếm thông tin trên Internet|1", "Bài 8: Thư điện tử|1"] },
            { name: "Chủ đề 4: Đạo đức, pháp luật và văn hóa trong môi trường số", lessons: ["Bài 9: An toàn thông tin trên Internet|1"] },
            { name: "Chủ đề 5: Ứng dụng tin học", lessons: ["Bài 10: Sơ đồ tư duy|1", "Bài 11: Định dạng văn bản|1", "Bài 12: Trình bày thông tin ở dạng bảng|1", "Bài 13: Thực hành: Tìm kiếm và thay thế|1", "Bài 14: Thực hành tổng hợp: Hoàn thiện Sổ lưu niệm|1"] },
            { name: "Chủ đề 6: Giải quyết vấn đề với sự trợ giúp của máy tính", lessons: ["Bài 15: Thuật toán|1", "Bài 16: Cấu trúc điều khiển|1", "Bài 17: Chương trình máy tính|1"] }
        ]
    },
    {
        grade: GradeLevel.Grade7,
        chapters: [
            { name: "Chủ đề 1: Máy tính và cộng đồng", lessons: ["Bài 1: Thiết bị vào - ra|1", "Bài 2: Phần mềm máy tính|1", "Bài 3: Quản lí dữ liệu trong máy tính|1"] },
            { name: "Chủ đề 2: Tổ chức lưu trữ, tìm kiếm và trao đổi thông tin", lessons: ["Bài 4: Mạng xã hội và một số kênh trao đổi thông tin trên internet|1"] },
            { name: "Chủ đề 3: Đạo đức, pháp luật và văn hóa trong môi trường số", lessons: ["Bài 5: Ứng xử trên mạng|1"] },
            { name: "Chủ đề 4: Ứng dụng tin học", lessons: ["Bài 6: Làm quen với phần mềm bảng tính|1", "Bài 7: Tính toán tự động trên trang tính|1", "Bài 8: Công cụ hỗ trợ tính toán|1", "Bài 9: Trình bày bảng tính|1", "Bài 10: Hoàn thiện bảng tính|1", "Bài 11: Tạo bài trình chiếu|1", "Bài 12: Định dạng đối tượng trên trang chiếu|1", "Bài 13: Thực hành tổng hợp: Hoàn thiện bài trình chiếu|1"] },
            { name: "Chủ đề 5: Giải quyết vấn đề với sự trợ giúp của máy tính", lessons: ["Bài 14: Thuật toán tìm kiếm tuần tự|1", "Bài 15: Thuật toán tìm kiếm nhị phân|1", "Bài 16: Thuật toán sắp xếp|1"] }
        ]
    },
    {
        grade: GradeLevel.Grade8,
        chapters: [
            { name: "Chủ đề 1: Máy tính và cộng đồng", lessons: ["Bài 1: Lược sử công cụ tính toán|1"] },
            { name: "Chủ đề 2: Tổ chức lưu trữ, tìm kiếm và trao đổi thông tin", lessons: ["Bài 2: Thông tin trong môi trường số|1", "Bài 3: Thực hành: Khai thác thông tin số|1"] },
            { name: "Chủ đề 3: Đạo đức, pháp luật và văn hoá trong môi trường số", lessons: ["Bài 4: Đạo đức và văn hóa trong sử dụng công nghệ kĩ thuật số|1"] },
            { name: "Chủ đề 4: Ứng dụng tin học (Bảng tính)", lessons: ["Bài 5: Sử dụng bảng tính giải quyết bài toán thực tế|1", "Bài 6: Sắp xếp và lọc dữ liệu|1", "Bài 7: Trình bày dữ liệu bằng biểu đồ|1"] },
            { name: "Chủ đề 4a: Soạn thảo văn bản và trình chiếu nâng cao", lessons: ["Bài 8a: Làm việc với danh sách dạng liệt kê và hình ảnh trong văn bản|1", "Bài 9a: Tạo đầu trang, chân trang cho văn bản|1", "Bài 10a: Định dạng nâng cao cho trang chiếu|1", "Bài 11a: Sử dụng bản mẫu tạo bài trình chiếu|1"] },
            { name: "Chủ đề 4b: Làm quen với phần mềm chỉnh sửa ảnh", lessons: ["Bài 8b: Phần mềm chỉnh sửa ảnh|1", "Bài 9b: Thay đổi khung hình, kích thước ảnh|1", "Bài 10b: Thêm văn bản, tạo hiệu ứng cho ảnh|1", "Bài 11b: Thực hành tổng hợp|1"] },
            { name: "Chủ đề 5: Giải quyết vấn đề với sự trợ giúp của máy tính", lessons: ["Bài 12: Từ thuật toán đến chương trình|1", "Bài 13: Biểu diễn dữ liệu|1", "Bài 14: Cấu trúc điều khiển|1", "Bài 15: Gỡ lỗi|1"] },
            { name: "Chủ đề 6: Hướng nghiệp với tin học", lessons: ["Bài 16: Tin học với nghề nghiệp|1"] }
        ]
    },
    {
        grade: GradeLevel.Grade9,
        chapters: [
            { name: "Chủ đề 1: Máy tính và cộng đồng", lessons: ["Bài 1: Thế giới kĩ thuật số|1"] },
            { name: "Chủ đề 2: Tổ chức lưu trữ, tìm kiếm và trao đổi thông tin", lessons: ["Bài 2: Thông tin trong giải quyết vấn đề|1", "Bài 3: Thực hành: Đánh giá chất lượng thông tin|1"] },
            { name: "Chủ đề 3: Đạo đức, pháp luật và văn hoá trong môi trường số", lessons: ["Bài 4: Một số vấn đề pháp lí về sử dụng dịch vụ Internet|1"] },
            { name: "Chủ đề 4: Ứng dụng tin học", lessons: ["Bài 5: Tìm hiểu phần mềm mô phỏng|1", "Bài 6: Thực hành: Khai thác phần mềm mô phỏng|1", "Bài 7: Trình bày thông tin trong trao đổi và hợp tác|1", "Bài 8: Thực hành: Sử dụng công cụ trực quan trình bày thông tin trong trao đổi và hợp tác|1"] },
            { name: "Chủ đề 4a: Sử dụng bảng tính điện tử nâng cao", lessons: ["Bài 9a: Sử dụng công cụ xác thực dữ liệu|1", "Bài 10a: Sử dụng hàm COUNTIF|1", "Bài 11a: Sử dụng hàm SUMIF|1", "Bài 12a: Sử dụng hàm IF|1", "Bài 13a: Hoàn thiện bảng tính quản lí tài chính gia đình|1"] },
            { name: "Chủ đề 4b: Làm quen với phần mềm làm video", lessons: ["Bài 9b: Các chức năng chính của phần mềm làm video|1", "Bài 10b: Chuẩn bị dữ liệu và dựng video|1", "Bài 11b: Thực hành: Dựng video theo kịch bản|1", "Bài 12b: Hoàn thành việc dựng video|1", "Bài 13b: Biên tập và xuất video|1"] },
            { name: "Chủ đề 5: Giải quyết vấn đề với sự trợ giúp của máy tính", lessons: ["Bài 14: Giải quyết vấn đề|1", "Bài 15: Bài toán tin học|1", "Bài 16: Thực hành: Lập chương trình máy tính|1"] },
            { name: "Chủ đề 6: Hướng nghiệp với tin học", lessons: ["Bài 17: Tin học và thế giới nghề nghiệp|1"] }
        ]
    }
];

export const HDTN_KNTT_CURRICULUM: Curriculum[] = [
    {
        grade: GradeLevel.Grade6,
        chapters: [
            { name: "Chủ đề 1: Khám phá lứa tuổi và môi trường học tập mới", lessons: ["Khám phá lứa tuổi và môi trường học tập mới|1"] },
            { name: "Chủ đề 2: Chăm sóc cuộc sống cá nhân", lessons: ["Chăm sóc cuộc sống cá nhân|1"] },
            { name: "Chủ đề 3: Xây dựng tình bạn, tình thầy trò", lessons: ["Xây dựng tình bạn, tình thầy trò|1"] },
            { name: "Chủ đề 4: Nuôi dưỡng quan hệ gia đình", lessons: ["Nuôi dưỡng quan hệ gia đình|1"] },
            { name: "Chủ đề 5: Kiểm soát chi tiêu", lessons: ["Kiểm soát chi tiêu|1"] },
            { name: "Chủ đề 6: Xây dựng cộng đồng văn minh, thân thiện", lessons: ["Xây dựng cộng đồng văn minh, thân thiện|1"] },
            { name: "Chủ đề 7: Tìm hiểu nghề truyền thống ở Việt Nam", lessons: ["Tìm hiểu nghề truyền thống ở Việt Nam|1"] },
            { name: "Chủ đề 8: Phòng tránh thiên tai và giảm thiểu biến đổi khí", lessons: ["Phòng tránh thiên tai và giảm thiểu biến đổi khí|1"] },
            { name: "Chủ đề 9: Tôn trọng người lao động", lessons: ["Tôn trọng người lao động|1"] }
        ]
    },
    {
        grade: GradeLevel.Grade7,
        chapters: [
            { name: "Chủ đề 1: Em với nhà trường", lessons: ["Bài 1: Phát triển mối quan hệ hòa đồng, hợp tác với thầy cô và các bạn|1", "Bài 2: Tự hào truyền thống trường em|1"] },
            { name: "Chủ đề 2: Khám phá bản thân", lessons: ["Bài 1: Điểm mạnh, điểm hạn chế của tôi|1", "Bài 2: Kiểm soát cảm xúc của bản thân|1"] },
            { name: "Chủ đề 3: Trách nhiệm với bản thân", lessons: ["Bài 1: Vượt qua khó khăn|1", "Bài 2: Tự bảo vệ trong tình huống nguy hiểm|1"] },
            { name: "Chủ đề 4: Rèn luyện bản thân", lessons: ["Bài 1: Rèn luyện thói quen ngăn nắp, gọn gàng, sạch sẽ|1", "Bài 2: Rèn luyện tính kiên trì, chăm chỉ|1", "Bài 3: Quản lí chi tiêu|1"] },
            { name: "Chủ đề 5: Em với gia đình", lessons: ["Bài 1: Kĩ năng chăm sóc người thân khi mệt, ốm|1", "Bài 2: Kế hoạch lao động tại gia đình|1", "Bài 3: Lắng nghe tích cực ý kiến người thân trong gia đình|1"] },
            { name: "Chủ đề 6: Em với cộng đồng", lessons: ["Bài 1: Giao tiếp, ứng xử có văn hóa và tôn trọng sự khác biệt|1", "Bài 2: Tham gia hoạt động thiện nguyện|1", "Bài 3: Tự hào truyền thống quê hương|1"] },
            { name: "Chủ đề 7: Em với thiên nhiên và môi trường", lessons: ["Bài 1: Cảnh quan thiên nhiên quê hương tôi|1", "Bài 2: Bảo vệ môi trường, giảm thiểu hiệu ứng nhà kính|1"] },
            { name: "Chủ đề 8: Khám phá thế giới nghề nghiệp", lessons: ["Tìm hiểu những nghề hiện có tại địa phương|1"] },
            { name: "Chủ đề 9: Hiểu bản thân - chọn đúng nghề", lessons: ["Phẩm chất, năng lực của bản thân với yêu cầu của nghề ở địa phương|1"] }
        ]
    },
    {
        grade: GradeLevel.Grade8,
        chapters: [
            { name: "Chủ đề 1: Em với nhà trường", lessons: ["Bài 1: Xây dựng và giữ gìn tình bạn|1", "Bài 2: Phòng, tránh bắt nạt học đường|1", "Bài 3: Xây dựng truyền thống nhà trường|1"] },
            { name: "Chủ đề 2: Khám phá bản thân", lessons: ["Bài 1: Tính cách và cảm xúc của tôi|1", "Bài 2: Khả năng tranh biện, thương thuyết của tôi|1"] },
            { name: "Chủ đề 3: Trách nhiệm với bản thân", lessons: ["Bài 1: Sống có trách nhiệm|1", "Bài 2: Kĩ năng từ chối|1"] },
            { name: "Chủ đề 4: Rèn luyện bản thân", lessons: ["Bài 1: Người tiêu dùng thông thái|1", "Bài 2: Nhà kinh doanh nhỏ|1", "Bài 3: Rèn luyện sự tự chủ|1"] },
            { name: "Chủ đề 5: Em với gia đình", lessons: ["Bài 1: Tôn trọng, thuyết phục và ứng xử để người thân hài lòng|1", "Bài 2: Tiết kiệm và thực hiện công việc gia đình|1"] },
            { name: "Chủ đề 6: Em với cộng đồng", lessons: ["Bài 1: Tham gia các hoạt động giáo dục truyền thống và phát triển cộng đồng ở địa phương|1", "Bài 2: Lập và thực hiện kế hoạch hoạt động thiện nguyện|1"] },
            { name: "Chủ đề 7: Em với thiên nhiên và môi trường", lessons: ["Bài 1: Cảnh quan thiên nhiên quê hương tôi|1", "Bài 2: Truyền thông về biện pháp để phòng và giảm nhẹ rủi ro thiên tai ở địa phương|1"] },
            { name: "Chủ đề 8: Khám phá thế giới nghề nghiệp", lessons: ["Nghề phổ biến trong xã hội hiện đại|1"] },
            { name: "Chủ đề 9: Hiểu bản thân - Chọn đúng nghề", lessons: ["Bài 1: Hứng thú nghề nghiệp|1", "Bài 2: Rèn luyện, học tập theo định hướng nghề nghiệp|1"] }
        ]
    },
    {
        grade: GradeLevel.Grade9,
        chapters: [
           { name: "Chủ đề 1: Em với nhà trường", lessons: ["Bài 1: Tôn trọng sự khác biệt và sống hài hòa với bạn bè, thầy cô|1", "Bài 2: Phòng chống bắt nạt học đường|1", "Bài 3: Xây dựng truyền thống nhà trường và lập kế hoạch lao động công ích|1"] },
            { name: "Chủ đề 2: Khám phá bản thân", lessons: ["Bài 1: Nhận diện điểm tích cực và chưa tích cực trong hành vi giao tiếp, ứng xử của bản thân|1", "Bài 2: Khám phá khả năng thích nghi của bản thân|1"] },
            { name: "Chủ đề 3: Trách nhiệm với bản thân", lessons: ["Bài 1: Trách nhiệm với nhiệm vụ được giao|1", "Bài 2: Ứng phó với căng thẳng và áp lực|1"] },
            { name: "Chủ đề 4: Rèn luyện bản thân", lessons: ["Bài 1: Tạo động lực cho bản thân|1", "Bài 2: Xây dựng ngân sách cá nhân hợp lí|1"] },
            { name: "Chủ đề 5: Em với gia đình", lessons: ["Bài 1: Tạo bầu không khí vui vẻ, yêu thương và giải quyết bất đồng trong gia đình|1", "Bài 2: Tổ chức, sắp xếp khoa học công việc gia đình|1", "Bài 3: Biện pháp phát triển kinh tế gia đình|1"] },
            { name: "Chủ đề 6: Em với cộng đồng", lessons: ["Bài 1: Xây dựng và phát triển cộng đồng|1", "Bài 2: Khảo sát thực trạng giao tiếp của học sinh trên mạng xã hội|1", "Bài 3: Truyền thông trong cộng đồng về những vấn đề học đường|1"] },
            { name: "Chủ đề 7: Em với thiên nhiên và môi trường", lessons: ["Bài 1: Việt Nam – tổ quốc tôi|1", "Bài 2: Phòng chống ô nhiễm và bảo vệ môi trường|1"] },
            { name: "Chủ đề 8: Khám phá thế giới nghề nghiệp", lessons: ["Nghề em quan tâm|1"] },
            { name: "Chủ đề 9: Hiểu bản thân – chọn đúng nghề", lessons: ["Bài 1: Hệ thống các cơ sở giáo dục nghề nghiệp của trung ương và địa phương|1", "Bài 2: Rèn luyện, phát triển bản thân theo yêu cầu của định hướng nghề nghiệp|1"] }
        ]
    }
];

export const KHTN_KNTT_CURRICULUM: Curriculum[] = [
    {
        grade: GradeLevel.Grade6,
        chapters: [
            {
                name: "Chương 1: Mở đầu về khoa học tự nhiên",
                lessons: [
                    "Bài 1: Giới thiệu về khoa học tự nhiên|1",
                    "Bài 2: An toàn trong phòng thực hành|1",
                    "Bài 3: Sử dụng kính lúp và kính hiển vi quang học|1",
                    "Bài 4: Đo chiều dài, khối lượng và thời gian|2",
                    "Bài 5: Đo nhiệt độ|1"
                ]
            },
            {
                name: "Chương 2: Chất quanh ta",
                lessons: [
                    "Bài 6: Các thể của chất và sự chuyển thể|2",
                    "Bài 7: Oxygen và không khí|2",
                    "Bài 8: Một số vật liệu thông dụng|1",
                    "Bài 9: Một số nguyên liệu thông dụng|1",
                    "Bài 10: Một số nhiên liệu thông dụng|1",
                    "Bài 11: Một số lương thực, thực phẩm thông dụng|1",
                    "Bài 12: Hỗn hợp và chất tinh khiết. Phương pháp tách các chất|2"
                ]
            },
            {
                name: "Chương 3: Một số vật liệu, nguyên liệu, nhiên liệu, lương thực – thực phẩm",
                lessons: [
                    "Ôn tập chương 2 và chương 3|1"
                ]
            },
            {
                name: "Chương 4: Tế bào – đơn vị cơ sở của sự sống",
                lessons: [
                    "Bài 13: Tế bào – đơn vị cơ sở của sự sống|1",
                    "Bài 14: Cấu tạo tế bào|2",
                    "Bài 15: Sự lớn lên và phân chia của tế bào|1"
                ]
            },
            {
                name: "Chương 5: Từ tế bào đến cơ thể",
                lessons: [
                    "Bài 16: Cơ thể đơn bào và cơ thể đa bào|1",
                    "Bài 17: Thực hành quan sát sinh vật|1"
                ]
            },
            {
                name: "Chương 6: Đa dạng thế giới sống",
                lessons: [
                    "Bài 18: Phân loại thế giới sống|1",
                    "Bài 19: Virus và vi khuẩn|2",
                    "Bài 20: Nguyên sinh vật|1",
                    "Bài 21: Nấm|1",
                    "Bài 22: Thực vật|2",
                    "Bài 23: Động vật|2",
                    "Bài 24: Đa dạng sinh học|1",
                    "Bài 25: Tìm hiểu sinh vật ngoài thiên nhiên|1"
                ]
            },
            {
                name: "Chương 7: Lực trong đời sống",
                lessons: [
                    "Bài 26: Lực và tác dụng của lực|1",
                    "Bài 27: Lực tiếp xúc và lực không tiếp xúc|1",
                    "Bài 28: Lực ma sát|2",
                    "Bài 29: Lực hấp dẫn. Trọng lượng|1"
                ]
            },
            {
                name: "Chương 8: Năng lượng trong đời sống",
                lessons: [
                    "Bài 30: Năng lượng và sự truyền năng lượng|1",
                    "Bài 31: Một số dạng năng lượng|1",
                    "Bài 32: Sự chuyển hoá năng lượng|1",
                    "Bài 33: Nhiên liệu và năng lượng tái tạo|1",
                    "Bài 34: Tiết kiệm năng lượng|1"
                ]
            },
            {
                name: "Chương 9: Trái Đất và bầu trời",
                lessons: [
                    "Bài 35: Chuyển động nhìn thấy của Mặt Trời. Thiên thể|1",
                    "Bài 36: Mặt Trăng|1",
                    "Bài 37: Hệ Mặt Trời và Ngân Hà|1"
                ]
            }
        ]
    },
    {
        grade: GradeLevel.Grade7,
        chapters: [
            {
                name: "Chương 1: Nguyên tử. Sơ lược về bảng tuần hoàn các nguyên tố hoá học",
                lessons: [
                    "Bài 1: Nguyên tử|2",
                    "Bài 2: Nguyên tố hoá học|1",
                    "Bài 3: Sơ lược về bảng tuần hoàn các nguyên tố hoá học|2"
                ]
            },
            {
                name: "Chương 2: Phân tử. Liên kết hoá học",
                lessons: [
                    "Bài 4: Phân tử – Đơn chất – Hợp chất|2",
                    "Bài 5: Giới thiệu về liên kết hoá học|2",
                    "Bài 6: Hoá trị và công thức hoá học|2"
                ]
            },
            {
                name: "Chương 3: Tốc độ",
                lessons: [
                    "Bài 7: Tốc độ chuyển động|2",
                    "Bài 8: Đồ thị quãng đường – thời gian|1",
                    "Bài 9: Đo tốc độ|1"
                ]
            },
            {
                name: "Chương 4: Âm thanh",
                lessons: [
                    "Bài 10: Sóng âm|1",
                    "Bài 11: Độ to và độ cao của âm|2",
                    "Bài 12: Phản xạ âm. Chống ô nhiễm tiếng ồn|1"
                ]
            },
            {
                name: "Chương 5: Ánh sáng",
                lessons: [
                    "Bài 13: Ánh sáng, tia sáng|1",
                    "Bài 14: Sự phản xạ ánh sáng|2",
                    "Bài 15: Ảnh của vật tạo bởi gương phẳng|1"
                ]
            },
            {
                name: "Chương 6: Từ",
                lessons: [
                    "Bài 16: Nam châm|1",
                    "Bài 17: Từ trường|2",
                    "Bài 18: Từ trường Trái Đất|1"
                ]
            },
            {
                name: "Chương 7: Trao đổi chất và chuyển hoá năng lượng ở sinh vật",
                lessons: [
                    "Bài 19: Quang hợp ở thực vật|2",
                    "Bài 20: Hô hấp ở sinh vật|2",
                    "Bài 21: Trao đổi nước và các chất dinh dưỡng ở thực vật|2",
                    "Bài 22: Trao đổi nước và các chất dinh dưỡng ở động vật|2",
                    "Bài 23: Trao đổi khí ở sinh vật|1"
                ]
            },
            {
                name: "Chương 8: Cảm ứng ở sinh vật và tập tính ở động vật",
                lessons: [
                    "Bài 24: Cảm ứng ở sinh vật|1",
                    "Bài 25: Cảm ứng ở thực vật|1",
                    "Bài 26: Cảm ứng ở động vật|1",
                    "Bài 27: Tập tính ở động vật|1"
                ]
            },
            {
                name: "Chương 9: Sinh trưởng và phát triển ở sinh vật",
                lessons: [
                    "Bài 28: Sinh trưởng và phát triển ở sinh vật|2",
                    "Bài 29: Các nhân tố ảnh hưởng đến sinh trưởng và phát triển ở sinh vật|1"
                ]
            },
            {
                name: "Chương 10: Sinh sản ở sinh vật",
                lessons: [
                    "Bài 30: Sinh sản vô tính ở sinh vật|1",
                    "Bài 31: Sinh sản hữu tính ở sinh vật|2",
                    "Bài 32: Một số yếu tố ảnh hưởng đến sinh sản và điều khiển sinh sản ở sinh vật|1"
                ]
            }
        ]
    },
    {
        grade: GradeLevel.Grade8,
        chapters: [
            {
                name: "Chương 1: Phản ứng hoá học",
                lessons: [
                    "Bài 1: Biến đổi vật lí và biến đổi hoá học|1",
                    "Bài 2: Phản ứng hoá học và năng lượng trong các phản ứng hoá học|2",
                    "Bài 3: Định luật bảo toàn khối lượng. Phương trình hoá học|2",
                    "Bài 4: Mol và tỉ khối chất khí|2",
                    "Bài 5: Tính theo phương trình hoá học|2",
                    "Bài 6: Nồng độ dung dịch|2",
                    "Bài 7: Tốc độ phản ứng và chất xúc tác|1"
                ]
            },
            {
                name: "Chương 2: Một số hợp chất thông dụng",
                lessons: [
                    "Bài 8: Acid|2",
                    "Bài 9: Base. Thang pH|2",
                    "Bài 10: Oxide|1",
                    "Bài 11: Muối|2",
                    "Bài 12: Phân bón hoá học|1"
                ]
            },
            {
                name: "Chương 3: Khối lượng riêng và áp suất",
                lessons: [
                    "Bài 13: Khối lượng riêng|2",
                    "Bài 14: Áp suất trên một bề mặt|1",
                    "Bài 15: Áp suất chất lỏng. Áp suất khí quyển|2",
                    "Bài 16: Lực đẩy Archimedes|2"
                ]
            },
            {
                name: "Chương 4: Tác dụng làm quay của lực",
                lessons: [
                    "Bài 17: Moment lực|1",
                    "Bài 18: Đòn bẩy|1"
                ]
            },
            {
                name: "Chương 5: Điện",
                lessons: [
                    "Bài 19: Hiện tượng nhiễm điện|1",
                    "Bài 20: Dòng điện, nguồn điện|1",
                    "Bài 21: Mạch điện đơn giản|1",
                    "Bài 22: Tác dụng của dòng điện|1",
                    "Bài 23: Cường độ dòng điện và hiệu điện thế|2",
                    "Bài 24: Mạch điện nối tiếp, mạch điện song song|2"
                ]
            },
            {
                name: "Chương 6: Cơ thể người",
                lessons: [
                    "Bài 25: Hệ vận động ở người|2",
                    "Bài 26: Dinh dưỡng và tiêu hoá ở người|2",
                    "Bài 27: Máu và hệ tuần hoàn ở người|2",
                    "Bài 28: Hệ hô hấp ở người|2",
                    "Bài 29: Hệ bài tiết ở người|1",
                    "Bài 30: Hệ thần kinh và các giác quan ở người|2",
                    "Bài 31: Hệ nội tiết ở người|1",
                    "Bài 32: Hệ sinh dục ở người|1",
                    "Bài 33: Da và điều hoà thân nhiệt ở người|1",
                    "Bài 34: Môi trường trong cơ thể và sức khoẻ|1"
                ]
            }
        ]
    },
    {
        grade: GradeLevel.Grade9,
        chapters: [
            {
                name: "Chương 1: Mở đầu",
                lessons: [
                    "Bài 1: Mở đầu về khoa học tự nhiên|1"
                ]
            },
            {
                name: "Chương 2: Năng lượng cơ học",
                lessons: [
                    "Bài 2: Công và công suất|2",
                    "Bài 3: Cơ năng. Định luật bảo toàn năng lượng|2"
                ]
            },
            {
                name: "Chương 3: Điện",
                lessons: [
                    "Bài 4: Điện trở. Định luật Ohm|2",
                    "Bài 5: Đoạn mạch nối tiếp, đoạn mạch song song|2",
                    "Bài 6: Năng lượng điện. Công suất điện|2",
                    "Bài 7: Thực hành đo điện trở|1"
                ]
            },
            {
                name: "Chương 4: Điện từ",
                lessons: [
                    "Bài 8: Nam châm điện|1",
                    "Bài 9: Lực từ. Động cơ điện|2",
                    "Bài 10: Cảm ứng điện từ. Máy phát điện|2"
                ]
            },
            {
                name: "Chương 5: Năng lượng với cuộc sống",
                lessons: [
                    "Bài 11: Năng lượng nhiệt. Truyền nhiệt|2",
                    "Bài 12: Sự chuyển thể và hiện tượng bề mặt của chất lỏng|2"
                ]
            },
            {
                name: "Chương 6: Kim loại. Phi kim. Hoá học hữu cơ",
                lessons: [
                    "Bài 13: Tính chất chung của kim loại|2",
                    "Bài 14: Dãy hoạt động hoá học của kim loại|2",
                    "Bài 15: Hợp kim – Gang – Thép. Sự ăn mòn kim loại|2",
                    "Bài 16: Phi kim|1",
                    "Bài 17: Giới thiệu về hoá học hữu cơ. Hydrocarbon|2",
                    "Bài 18: Alcohol. Acetic acid|2",
                    "Bài 19: Lipid – Glucid – Protein. Polymer|2"
                ]
            },
            {
                name: "Chương 7: Khai thác tài nguyên từ vỏ Trái Đất",
                lessons: [
                    "Bài 20: Khai thác đá vôi. Công nghiệp silicate|1",
                    "Bài 21: Khai thác nhiên liệu hoá thạch. Nguồn carbon. Chu trình carbon|2"
                ]
            },
            {
                name: "Chương 8: Hệ sinh thái",
                lessons: [
                    "Bài 22: Hệ sinh thái|2",
                    "Bài 23: Cân bằng tự nhiên|1",
                    "Bài 24: Bảo vệ môi trường|1"
                ]
            },
            {
                name: "Chương 9: Di truyền",
                lessons: [
                    "Bài 25: Di truyền và biến dị|1",
                    "Bài 26: Gene – Nhiễm sắc thể – ADN|2",
                    "Bài 27: Các quy luật di truyền của Mendel|2",
                    "Bài 28: Di truyền nhiễm sắc thể. Di truyền học người|2",
                    "Bài 29: Đột biến gene và đột biến nhiễm sắc thể|2",
                    "Bài 30: Di truyền học với con người và đời sống|1"
                ]
            },
            {
                name: "Chương 10: Tiến hoá",
                lessons: [
                    "Bài 31: Bằng chứng tiến hoá|1",
                    "Bài 32: Cơ chế tiến hoá|1",
                    "Bài 33: Sự phát sinh và phát triển sự sống trên Trái Đất|1"
                ]
            }
        ]
    }
];

export const LSDL_KNTT_CURRICULUM: Curriculum[] = [
    {
        grade: GradeLevel.Grade6,
        chapters: [
            {
                name: "Phần Lịch sử – Chương 1: Vì sao phải học Lịch sử?",
                lessons: [
                    "Bài 1: Lịch sử và cuộc sống|1",
                    "Bài 2: Dựa vào đâu để biết và phục dựng lại lịch sử|1"
                ]
            },
            {
                name: "Phần Lịch sử – Chương 2: Thời kì nguyên thủy",
                lessons: [
                    "Bài 3: Nguồn gốc loài người|1",
                    "Bài 4: Xã hội nguyên thủy|1",
                    "Bài 5: Chuyển biến về kinh tế, xã hội cuối thời nguyên thủy|1"
                ]
            },
            {
                name: "Phần Lịch sử – Chương 3: Xã hội cổ đại",
                lessons: [
                    "Bài 6: Ai Cập và Lưỡng Hà cổ đại|2",
                    "Bài 7: Ấn Độ cổ đại|1",
                    "Bài 8: Trung Quốc cổ đại|1",
                    "Bài 9: Hi Lạp và La Mã cổ đại|2"
                ]
            },
            {
                name: "Phần Lịch sử – Chương 4: Đông Nam Á từ những thế kỉ tiếp giáp đầu Công nguyên đến thế kỉ X",
                lessons: [
                    "Bài 10: Sự ra đời và phát triển của các vương quốc Đông Nam Á (từ đầu Công nguyên đến thế kỉ VII)|1",
                    "Bài 11: Sự hình thành và bước đầu phát triển của các quốc gia Đông Nam Á (từ thế kỉ VII đến thế kỉ X)|1"
                ]
            },
            {
                name: "Phần Lịch sử – Chương 5: Việt Nam từ khoảng thế kỉ VII trước Công nguyên đến đầu thế kỉ X",
                lessons: [
                    "Bài 12: Nước Văn Lang – Âu Lạc|2",
                    "Bài 13: Giao Châu và các cuộc đấu tranh giành độc lập thời Bắc thuộc (từ thế kỉ II TCN đến năm 938)|2",
                    "Bài 14: Bước ngoặt lịch sử đầu thế kỉ X|1"
                ]
            },
            {
                name: "Phần Địa lí – Chương 1: Bản đồ – phương tiện thể hiện bề mặt Trái Đất",
                lessons: [
                    "Bài 1: Hệ thống kinh, vĩ tuyến. Toạ độ địa lí|1",
                    "Bài 2: Kí hiệu bản đồ. Tỉ lệ bản đồ|1",
                    "Bài 3: Tìm đường đi trên bản đồ|1"
                ]
            },
            {
                name: "Phần Địa lí – Chương 2: Trái Đất – hành tinh trong hệ Mặt Trời",
                lessons: [
                    "Bài 4: Trái Đất trong hệ Mặt Trời|1",
                    "Bài 5: Chuyển động tự quay quanh trục của Trái Đất và hệ quả|1",
                    "Bài 6: Chuyển động của Trái Đất quanh Mặt Trời và hệ quả|2"
                ]
            },
            {
                name: "Phần Địa lí – Chương 3: Cấu tạo của Trái Đất. Vỏ Trái Đất",
                lessons: [
                    "Bài 7: Cấu tạo của Trái Đất|1",
                    "Bài 8: Các mảng kiến tạo. Núi lửa và động đất|1",
                    "Bài 9: Quá trình nội sinh và ngoại sinh. Các dạng địa hình chính trên Trái Đất|2",
                    "Bài 10: Khoáng sản|1"
                ]
            },
            {
                name: "Phần Địa lí – Chương 4: Khí hậu và thuỷ văn",
                lessons: [
                    "Bài 11: Thời tiết và khí hậu|1",
                    "Bài 12: Nhiệt độ không khí. Khí áp và gió|2",
                    "Bài 13: Mưa|1",
                    "Bài 14: Các đới khí hậu trên Trái Đất|1",
                    "Bài 15: Biến đổi khí hậu|1",
                    "Bài 16: Sông và hồ|1",
                    "Bài 17: Nước ngầm và băng hà|1",
                    "Bài 18: Biển và đại dương|1"
                ]
            },
            {
                name: "Phần Địa lí – Chương 5: Đất và sinh vật trên Trái Đất",
                lessons: [
                    "Bài 19: Lớp đất trên Trái Đất|1",
                    "Bài 20: Sinh vật trên Trái Đất|1",
                    "Bài 21: Rừng nhiệt đới|1"
                ]
            },
            {
                name: "Phần Địa lí – Chương 6: Con người và thiên nhiên",
                lessons: [
                    "Bài 22: Dân số và phân bố dân cư|1",
                    "Bài 23: Con người và thiên nhiên|1"
                ]
            }
        ]
    },
    {
        grade: GradeLevel.Grade7,
        chapters: [
            {
                name: "Phần Lịch sử – Chương 1: Tây Âu từ thế kỉ V đến nửa đầu thế kỉ XVI",
                lessons: [
                    "Bài 1: Quá trình hình thành và phát triển chế độ phong kiến ở Tây Âu|1",
                    "Bài 2: Các cuộc phát kiến địa lí|1",
                    "Bài 3: Phong trào Văn hoá Phục hưng và Cải cách tôn giáo|1",
                    "Bài 4: Sự hình thành quan hệ sản xuất tư bản chủ nghĩa ở Tây Âu thời trung đại|1"
                ]
            },
            {
                name: "Phần Lịch sử – Chương 2: Trung Quốc và Ấn Độ thời trung đại",
                lessons: [
                    "Bài 5: Trung Quốc từ thế kỉ VII đến giữa thế kỉ XIX|2",
                    "Bài 6: Ấn Độ từ thế kỉ IV đến giữa thế kỉ XIX|1"
                ]
            },
            {
                name: "Phần Lịch sử – Chương 3: Đông Nam Á từ nửa sau thế kỉ X đến nửa đầu thế kỉ XVI",
                lessons: [
                    "Bài 7: Các vương quốc phong kiến Đông Nam Á từ nửa sau thế kỉ X đến nửa đầu thế kỉ XVI|2"
                ]
            },
            {
                name: "Phần Lịch sử – Chương 4: Việt Nam từ đầu thế kỉ X đến đầu thế kỉ XVI",
                lessons: [
                    "Bài 8: Đại Việt thời Ngô – Đinh – Tiền Lê (939 – 1009)|1",
                    "Bài 9: Đại Việt thời Lý (1009 – 1226)|2",
                    "Bài 10: Đại Việt thời Trần (1226 – 1400)|2",
                    "Bài 11: Nhà Hồ và cuộc kháng chiến chống quân Minh xâm lược (đầu thế kỉ XV)|1",
                    "Bài 12: Đại Việt thời Lê sơ (1428 – 1527)|2",
                    "Bài 13: Vùng đất phía nam từ đầu thế kỉ X đến đầu thế kỉ XVI|1"
                ]
            },
            {
                name: "Phần Địa lí – Chương 1: Châu Âu",
                lessons: [
                    "Bài 1: Vị trí địa lí, phạm vi và đặc điểm tự nhiên châu Âu|2",
                    "Bài 2: Đặc điểm dân cư, xã hội châu Âu|1",
                    "Bài 3: Khai thác, sử dụng và bảo vệ thiên nhiên ở châu Âu|1",
                    "Bài 4: Liên minh châu Âu (EU)|1"
                ]
            },
            {
                name: "Phần Địa lí – Chương 2: Châu Á",
                lessons: [
                    "Bài 5: Vị trí địa lí, phạm vi và đặc điểm tự nhiên châu Á|2",
                    "Bài 6: Đặc điểm dân cư, xã hội châu Á|1",
                    "Bài 7: Bản đồ chính trị châu Á. Các khu vực châu Á|1",
                    "Bài 8: Khai thác, sử dụng và bảo vệ thiên nhiên ở châu Á|1"
                ]
            },
            {
                name: "Phần Địa lí – Chương 3: Châu Phi",
                lessons: [
                    "Bài 9: Vị trí địa lí, phạm vi và đặc điểm tự nhiên châu Phi|2",
                    "Bài 10: Đặc điểm dân cư, xã hội châu Phi|1",
                    "Bài 11: Khai thác, sử dụng và bảo vệ thiên nhiên ở châu Phi|1"
                ]
            },
            {
                name: "Phần Địa lí – Chương 4: Châu Mỹ",
                lessons: [
                    "Bài 12: Vị trí địa lí, phạm vi và đặc điểm tự nhiên châu Mỹ|2",
                    "Bài 13: Đặc điểm dân cư, xã hội châu Mỹ|1",
                    "Bài 14: Khai thác, sử dụng và bảo vệ thiên nhiên ở châu Mỹ|1"
                ]
            },
            {
                name: "Phần Địa lí – Chương 5: Châu Đại Dương",
                lessons: [
                    "Bài 15: Vị trí địa lí, phạm vi và đặc điểm tự nhiên châu Đại Dương|1",
                    "Bài 16: Đặc điểm dân cư, xã hội châu Đại Dương|1"
                ]
            },
            {
                name: "Phần Địa lí – Chương 6: Châu Nam Cực",
                lessons: [
                    "Bài 17: Châu Nam Cực|1"
                ]
            }
        ]
    },
    {
        grade: GradeLevel.Grade8,
        chapters: [
            {
                name: "Phần Lịch sử – Chương 1: Châu Âu và Bắc Mỹ từ nửa sau thế kỉ XVI đến thế kỉ XVIII",
                lessons: [
                    "Bài 1: Cách mạng tư sản Anh thế kỉ XVII|1",
                    "Bài 2: Chiến tranh giành độc lập của 13 thuộc địa Anh ở Bắc Mỹ|1",
                    "Bài 3: Cách mạng tư sản Pháp cuối thế kỉ XVIII|2"
                ]
            },
            {
                name: "Phần Lịch sử – Chương 2: Đông Nam Á từ nửa sau thế kỉ XVI đến thế kỉ XIX",
                lessons: [
                    "Bài 4: Các nước Đông Nam Á từ nửa sau thế kỉ XVI đến giữa thế kỉ XIX|1",
                    "Bài 5: Quá trình xâm lược và cai trị của chủ nghĩa thực dân ở Đông Nam Á|1"
                ]
            },
            {
                name: "Phần Lịch sử – Chương 3: Việt Nam từ đầu thế kỉ XVI đến thế kỉ XVIII",
                lessons: [
                    "Bài 6: Công cuộc khai phá vùng đất phía nam từ thế kỉ XVI đến thế kỉ XVIII|1",
                    "Bài 7: Khởi nghĩa nông dân ở Đàng Ngoài thế kỉ XVIII|1",
                    "Bài 8: Phong trào Tây Sơn|2"
                ]
            },
            {
                name: "Phần Lịch sử – Chương 4: Việt Nam từ năm 1802 đến năm 1858",
                lessons: [
                    "Bài 9: Tình hình kinh tế, văn hoá, tôn giáo thời Nguyễn (nửa đầu thế kỉ XIX)|1",
                    "Bài 10: Cuộc kháng chiến chống thực dân Pháp xâm lược (1858 – 1884)|2"
                ]
            },
            {
                name: "Phần Lịch sử – Chương 5: Việt Nam từ năm 1858 đến cuối thế kỉ XIX",
                lessons: [
                    "Bài 11: Phong trào chống Pháp trong những năm 1885 – 1896|2",
                    "Bài 12: Trào lưu cải cách, canh tân ở Việt Nam nửa cuối thế kỉ XIX|1"
                ]
            },
            {
                name: "Phần Địa lí – Chương 1: Đặc điểm tự nhiên Việt Nam",
                lessons: [
                    "Bài 1: Vị trí địa lí và phạm vi lãnh thổ Việt Nam|1",
                    "Bài 2: Địa hình Việt Nam|2",
                    "Bài 3: Khoáng sản Việt Nam|1",
                    "Bài 4: Khí hậu Việt Nam|2",
                    "Bài 5: Thuỷ văn Việt Nam|1",
                    "Bài 6: Đất và sinh vật Việt Nam|2",
                    "Bài 7: Biển và đảo Việt Nam|1"
                ]
            },
            {
                name: "Phần Địa lí – Chương 2: Đặc điểm dân cư, xã hội Việt Nam",
                lessons: [
                    "Bài 8: Đặc điểm dân số và phân bố dân cư Việt Nam|1",
                    "Bài 9: Các dân tộc Việt Nam|1"
                ]
            },
            {
                name: "Phần Địa lí – Chương 3: Phát triển kinh tế Việt Nam",
                lessons: [
                    "Bài 10: Thực trạng phát triển kinh tế Việt Nam|1",
                    "Bài 11: Nông nghiệp, lâm nghiệp và thuỷ sản|2",
                    "Bài 12: Công nghiệp|1",
                    "Bài 13: Dịch vụ|1"
                ]
            }
        ]
    },
    {
        grade: GradeLevel.Grade9,
        chapters: [
            {
                name: "Phần Lịch sử – Chương 1: Thế giới trong và sau Chiến tranh thế giới thứ nhất (1914 – 1929)",
                lessons: [
                    "Bài 1: Chiến tranh thế giới thứ nhất (1914 – 1918)|2",
                    "Bài 2: Cách mạng tháng Mười Nga năm 1917 và Liên bang Xô viết|1",
                    "Bài 3: Châu Á từ sau Chiến tranh thế giới thứ nhất đến năm 1929|1"
                ]
            },
            {
                name: "Phần Lịch sử – Chương 2: Thế giới trong những năm 1929 – 1945",
                lessons: [
                    "Bài 4: Đại suy thoái kinh tế thế giới 1929 – 1933 và Chiến tranh thế giới thứ hai (1939 – 1945)|2",
                    "Bài 5: Châu Á từ năm 1929 đến năm 1945|1"
                ]
            },
            {
                name: "Phần Lịch sử – Chương 3: Việt Nam từ năm 1897 đến năm 1918",
                lessons: [
                    "Bài 6: Cuộc khai thác thuộc địa lần thứ nhất của thực dân Pháp ở Đông Dương (1897 – 1914)|1",
                    "Bài 7: Phong trào yêu nước chống Pháp ở Việt Nam từ đầu thế kỉ XX đến năm 1918|2"
                ]
            },
            {
                name: "Phần Lịch sử – Chương 4: Việt Nam từ năm 1918 đến năm 1945",
                lessons: [
                    "Bài 8: Phong trào dân tộc dân chủ ở Việt Nam từ năm 1918 đến năm 1930|2",
                    "Bài 9: Hoạt động của Nguyễn Ái Quốc|1",
                    "Bài 10: Phong trào cách mạng Việt Nam thời kì 1930 – 1939|2",
                    "Bài 11: Phong trào giải phóng dân tộc và Tổng khởi nghĩa tháng Tám (1939 – 1945). Nước Việt Nam Dân chủ Cộng hoà ra đời|2"
                ]
            },
            {
                name: "Phần Lịch sử – Chương 5: Việt Nam từ năm 1945 đến năm 1954",
                lessons: [
                    "Bài 12: Nước Việt Nam Dân chủ Cộng hoà từ sau ngày 2-9-1945 đến trước ngày 19-12-1946|1",
                    "Bài 13: Cuộc kháng chiến chống thực dân Pháp (1946 – 1954)|2"
                ]
            },
            {
                name: "Phần Lịch sử – Chương 6: Việt Nam từ năm 1954 đến năm 1975",
                lessons: [
                    "Bài 14: Việt Nam từ năm 1954 đến năm 1965|2",
                    "Bài 15: Việt Nam từ năm 1965 đến năm 1975|2"
                ]
            },
            {
                name: "Phần Lịch sử – Chương 7: Việt Nam từ năm 1975 đến nay",
                lessons: [
                    "Bài 16: Việt Nam trong những năm đầu sau đại thắng mùa Xuân 1975|1",
                    "Bài 17: Công cuộc Đổi mới từ năm 1986 đến nay|2"
                ]
            },
            {
                name: "Phần Địa lí – Chương 1: Địa lí dân cư Việt Nam",
                lessons: [
                    "Bài 1: Cộng đồng các dân tộc Việt Nam|1",
                    "Bài 2: Dân số Việt Nam|1",
                    "Bài 3: Phân bố dân cư và đô thị hoá ở Việt Nam|1",
                    "Bài 4: Lao động và việc làm ở Việt Nam|1",
                    "Bài 5: Chất lượng cuộc sống ở Việt Nam|1"
                ]
            },
            {
                name: "Phần Địa lí – Chương 2: Địa lí các ngành kinh tế",
                lessons: [
                    "Bài 6: Nông nghiệp|2",
                    "Bài 7: Lâm nghiệp và thuỷ sản|1",
                    "Bài 8: Công nghiệp|2",
                    "Bài 9: Dịch vụ|1",
                    "Bài 10: Phát triển tổng hợp kinh tế biển|1"
                ]
            },
            {
                name: "Phần Địa lí – Chương 3: Sự phân hoá lãnh thổ",
                lessons: [
                    "Bài 11: Vùng Trung du và miền núi Bắc Bộ|2",
                    "Bài 12: Vùng Đồng bằng sông Hồng|1",
                    "Bài 13: Vùng Bắc Trung Bộ và Duyên hải Nam Trung Bộ|2",
                    "Bài 14: Vùng Tây Nguyên|1",
                    "Bài 15: Vùng Đông Nam Bộ|1",
                    "Bài 16: Vùng Đồng bằng sông Cửu Long|2",
                    "Bài 17: Phát triển kinh tế – xã hội ở các vùng kinh tế trọng điểm|1"
                ]
            }
        ]
    }
];

export const GDCD_KNTT_CURRICULUM: Curriculum[] = [
    {
        grade: GradeLevel.Grade6,
        chapters: [
            {
                name: "Chương 1: Tự chăm sóc, rèn luyện thân thể",
                lessons: [
                    "Bài 1: Tự chăm sóc và rèn luyện thân thể|2",
                    "Bài 2: Yêu thương con người|2"
                ]
            },
            {
                name: "Chương 2: Siêng năng, kiên trì",
                lessons: [
                    "Bài 3: Siêng năng, kiên trì|2",
                    "Bài 4: Tôn trọng sự thật|2"
                ]
            },
            {
                name: "Chương 3: Tự lập",
                lessons: [
                    "Bài 5: Tự lập|2",
                    "Bài 6: Tự nhận thức bản thân|2"
                ]
            },
            {
                name: "Chương 4: Ứng xử trong gia đình",
                lessons: [
                    "Bài 7: Ứng xử có văn hoá|2",
                    "Bài 8: Quan tâm, cảm thông và chia sẻ|2"
                ]
            },
            {
                name: "Chương 5: Công dân nước Cộng hoà xã hội chủ nghĩa Việt Nam",
                lessons: [
                    "Bài 9: Công dân nước Cộng hoà xã hội chủ nghĩa Việt Nam|2",
                    "Bài 10: Quyền và nghĩa vụ cơ bản của công dân|2"
                ]
            },
            {
                name: "Chương 6: Quyền trẻ em",
                lessons: [
                    "Bài 11: Quyền cơ bản của trẻ em|2",
                    "Bài 12: Thực hiện quyền trẻ em|2"
                ]
            }
        ]
    },
    {
        grade: GradeLevel.Grade7,
        chapters: [
            {
                name: "Chương 1: Sống giản dị",
                lessons: [
                    "Bài 1: Sống giản dị|2",
                    "Bài 2: Trung thực|2"
                ]
            },
            {
                name: "Chương 2: Tự trọng",
                lessons: [
                    "Bài 3: Tự trọng|2",
                    "Bài 4: Đạo đức và kỉ luật|2"
                ]
            },
            {
                name: "Chương 3: Yêu thương con người",
                lessons: [
                    "Bài 5: Yêu thương con người|2",
                    "Bài 6: Tôn trọng sự đa dạng của các dân tộc|2"
                ]
            },
            {
                name: "Chương 4: Quan tâm, cảm thông, chia sẻ",
                lessons: [
                    "Bài 7: Học tập tự giác, tích cực|2",
                    "Bài 8: Giữ chữ tín|2"
                ]
            },
            {
                name: "Chương 5: Bảo tồn di sản văn hoá",
                lessons: [
                    "Bài 9: Bảo tồn di sản văn hoá|2",
                    "Bài 10: Nhận diện tình huống giao tiếp và ứng xử|2"
                ]
            },
            {
                name: "Chương 6: Phòng, chống bạo lực học đường",
                lessons: [
                    "Bài 11: Phòng, chống bạo lực học đường|2",
                    "Bài 12: Phòng, chống tệ nạn xã hội|2"
                ]
            }
        ]
    },
    {
        grade: GradeLevel.Grade8,
        chapters: [
            {
                name: "Chương 1: Tôn trọng lẽ phải",
                lessons: [
                    "Bài 1: Tôn trọng lẽ phải|2",
                    "Bài 2: Liêm khiết|2"
                ]
            },
            {
                name: "Chương 2: Tôn trọng người khác",
                lessons: [
                    "Bài 3: Tôn trọng người khác|2",
                    "Bài 4: Giữ gìn và phát huy truyền thống tốt đẹp của gia đình, dòng họ|2"
                ]
            },
            {
                name: "Chương 3: Tích cực tham gia các hoạt động cộng đồng",
                lessons: [
                    "Bài 5: Tích cực tham gia các hoạt động cộng đồng|2",
                    "Bài 6: Lao động cần cù, sáng tạo|2"
                ]
            },
            {
                name: "Chương 4: Phòng, chống bạo lực gia đình",
                lessons: [
                    "Bài 7: Phòng, chống bạo lực gia đình|2",
                    "Bài 8: Phòng, chống vi phạm pháp luật về trật tự an toàn giao thông|2"
                ]
            },
            {
                name: "Chương 5: Quyền và nghĩa vụ lao động",
                lessons: [
                    "Bài 9: Quyền và nghĩa vụ lao động của công dân|2",
                    "Bài 10: Quyền và nghĩa vụ của công dân về kinh doanh và nộp thuế|2"
                ]
            },
            {
                name: "Chương 6: Hiến pháp nước Cộng hoà xã hội chủ nghĩa Việt Nam",
                lessons: [
                    "Bài 11: Hiến pháp nước Cộng hoà xã hội chủ nghĩa Việt Nam|2",
                    "Bài 12: Quyền và nghĩa vụ công dân về bảo vệ Tổ quốc và bảo vệ an ninh quốc gia|2"
                ]
            }
        ]
    },
    {
        grade: GradeLevel.Grade9,
        chapters: [
            {
                name: "Chương 1: Chí công vô tư",
                lessons: [
                    "Bài 1: Chí công vô tư|2",
                    "Bài 2: Tự chủ|2"
                ]
            },
            {
                name: "Chương 2: Dân chủ và kỉ luật",
                lessons: [
                    "Bài 3: Dân chủ và kỉ luật|2",
                    "Bài 4: Bảo vệ hoà bình|2"
                ]
            },
            {
                name: "Chương 3: Tình hữu nghị giữa các dân tộc",
                lessons: [
                    "Bài 5: Tình hữu nghị giữa các dân tộc trên thế giới|2",
                    "Bài 6: Hợp tác cùng phát triển|2"
                ]
            },
            {
                name: "Chương 4: Lí tưởng sống",
                lessons: [
                    "Bài 7: Lí tưởng sống của thanh niên|2",
                    "Bài 8: Khoan dung|2"
                ]
            },
            {
                name: "Chương 5: Quyền và nghĩa vụ công dân",
                lessons: [
                    "Bài 9: Quyền tự do kinh doanh và nghĩa vụ đóng thuế|2",
                    "Bài 10: Vi phạm pháp luật và trách nhiệm pháp lí|2"
                ]
            },
            {
                name: "Chương 6: Quyền và nghĩa vụ công dân trong hệ thống chính trị",
                lessons: [
                    "Bài 11: Quyền tham gia quản lí nhà nước, quản lí xã hội|2",
                    "Bài 12: Quyền và nghĩa vụ của công dân về bầu cử và ứng cử|2"
                ]
            }
        ]
    }
];

export const CONGNHE_KNTT_CURRICULUM: Curriculum[] = [
    {
        grade: GradeLevel.Grade6,
        chapters: [
            {
                name: "Chương 1: Nhà ở",
                lessons: [
                    "Bài 1: Nhà ở đối với con người|1",
                    "Bài 2: Xây dựng nhà ở|1",
                    "Bài 3: Ngôi nhà thông minh|1",
                    "Bài 4: Thực hành sử dụng một số đồ dùng điện trong nhà|1"
                ]
            },
            {
                name: "Chương 2: Bảo quản và chế biến thực phẩm",
                lessons: [
                    "Bài 5: Thực phẩm và dinh dưỡng|1",
                    "Bài 6: Bảo quản thực phẩm|1",
                    "Bài 7: Chế biến thực phẩm|1",
                    "Bài 8: Thực hành chế biến món ăn|1",
                    "Bài 9: Dự án: Xây dựng thực đơn gia đình|1"
                ]
            },
            {
                name: "Chương 3: Trang phục và thời trang",
                lessons: [
                    "Bài 10: Các loại vải thường dùng trong may mặc|1",
                    "Bài 11: Trang phục và thời trang|1",
                    "Bài 12: Lựa chọn trang phục|1",
                    "Bài 13: Sử dụng và bảo quản trang phục|1",
                    "Bài 14: Thực hành sửa chữa trang phục|1"
                ]
            }
        ]
    },
    {
        grade: GradeLevel.Grade7,
        chapters: [
            {
                name: "Chương 1: Đồ dùng điện trong gia đình",
                lessons: [
                    "Bài 1: Đồ dùng điện quang. Đèn sợi đốt, đèn huỳnh quang và đèn LED|1",
                    "Bài 2: Đồ dùng điện nhiệt. Bàn là điện|1",
                    "Bài 3: Đồ dùng điện cơ. Quạt điện, máy bơm nước|1",
                    "Bài 4: Sử dụng hợp lí điện năng|1",
                    "Bài 5: Thực hành sử dụng đồ dùng điện|1"
                ]
            },
            {
                name: "Chương 2: An toàn điện",
                lessons: [
                    "Bài 6: An toàn điện trong gia đình|1",
                    "Bài 7: Thực hành nối dây dẫn điện|1"
                ]
            },
            {
                name: "Chương 3: Trồng trọt và lâm nghiệp",
                lessons: [
                    "Bài 8: Giới thiệu về trồng trọt|1",
                    "Bài 9: Đất trồng|1",
                    "Bài 10: Phân bón|1",
                    "Bài 11: Giống cây trồng|1",
                    "Bài 12: Sâu, bệnh hại cây trồng|1",
                    "Bài 13: Quy trình trồng trọt|1",
                    "Bài 14: Giới thiệu về lâm nghiệp|1",
                    "Bài 15: Dự án: Trồng và chăm sóc cây|1"
                ]
            },
            {
                name: "Chương 4: Chăn nuôi và thuỷ sản",
                lessons: [
                    "Bài 16: Giới thiệu về chăn nuôi|1",
                    "Bài 17: Giống vật nuôi|1",
                    "Bài 18: Thức ăn chăn nuôi|1",
                    "Bài 19: Nuôi dưỡng và chăm sóc vật nuôi|1",
                    "Bài 20: Phòng, trị bệnh cho vật nuôi|1",
                    "Bài 21: Giới thiệu về thuỷ sản|1",
                    "Bài 22: Dự án: Chăn nuôi và thuỷ sản|1"
                ]
            }
        ]
    },
    {
        grade: GradeLevel.Grade8,
        chapters: [
            {
                name: "Chương 1: Vẽ kĩ thuật",
                lessons: [
                    "Bài 1: Tiêu chuẩn trình bày bản vẽ kĩ thuật|1",
                    "Bài 2: Hình chiếu vuông góc|2",
                    "Bài 3: Bản vẽ kĩ thuật đơn giản|1",
                    "Bài 4: Thực hành vẽ kĩ thuật|1"
                ]
            },
            {
                name: "Chương 2: Cơ khí",
                lessons: [
                    "Bài 5: Vật liệu cơ khí|1",
                    "Bài 6: Gia công cơ khí|2",
                    "Bài 7: Truyền và biến đổi chuyển động|2",
                    "Bài 8: Thực hành cơ khí|1"
                ]
            },
            {
                name: "Chương 3: Kĩ thuật điện",
                lessons: [
                    "Bài 9: Mạch điện|1",
                    "Bài 10: Mạch điện điều khiển đơn giản|1",
                    "Bài 11: Thực hành lắp mạch điện|1"
                ]
            },
            {
                name: "Chương 4: Thiết kế kĩ thuật",
                lessons: [
                    "Bài 12: Quy trình thiết kế kĩ thuật|1",
                    "Bài 13: Dự án thiết kế kĩ thuật|2"
                ]
            }
        ]
    },
    {
        grade: GradeLevel.Grade9,
        chapters: [
            {
                name: "Chương 1: Lắp đặt mạng điện trong nhà",
                lessons: [
                    "Bài 1: Giới thiệu về mạng điện trong nhà|1",
                    "Bài 2: Thiết bị đóng – cắt và lấy điện|1",
                    "Bài 3: Thiết bị bảo vệ mạng điện trong nhà|1",
                    "Bài 4: Lắp đặt mạng điện trong nhà|2",
                    "Bài 5: Thực hành lắp mạng điện|1"
                ]
            },
            {
                name: "Chương 2: Nghề nghiệp trong lĩnh vực kĩ thuật, công nghệ",
                lessons: [
                    "Bài 6: Ngành nghề trong lĩnh vực kĩ thuật, công nghệ|1",
                    "Bài 7: Lựa chọn nghề nghiệp trong lĩnh vực kĩ thuật, công nghệ|1"
                ]
            },
            {
                name: "Chương 3: Trồng trọt",
                lessons: [
                    "Bài 8: Ứng dụng công nghệ cao trong trồng trọt|1",
                    "Bài 9: Quy trình trồng trọt công nghệ cao|1",
                    "Bài 10: Dự án trồng trọt|1"
                ]
            },
            {
                name: "Chương 4: Chăn nuôi",
                lessons: [
                    "Bài 11: Ứng dụng công nghệ cao trong chăn nuôi|1",
                    "Bài 12: Quy trình chăn nuôi công nghệ cao|1",
                    "Bài 13: Dự án chăn nuôi|1"
                ]
            },
            {
                name: "Chương 5: Lâm nghiệp và thuỷ sản",
                lessons: [
                    "Bài 14: Ứng dụng công nghệ cao trong lâm nghiệp|1",
                    "Bài 15: Ứng dụng công nghệ cao trong thuỷ sản|1",
                    "Bài 16: Nghề nghiệp trong lĩnh vực nông, lâm nghiệp và thuỷ sản|1"
                ]
            }
        ]
    }
];

export const AMNHAC_KNTT_CURRICULUM: Curriculum[] = [
    {
        grade: GradeLevel.Grade6,
        chapters: [
            {
                name: "Chủ đề 1: Thầy cô và mái trường",
                lessons: [
                    "Hát: Mái trường mến yêu|1",
                    "Nhạc cụ: Thực hành nhạc cụ tiết tấu|1",
                    "Đọc nhạc: Bài đọc nhạc số 1|1",
                    "Thường thức âm nhạc: Nhạc sĩ Lê Quốc Thắng|1"
                ]
            },
            {
                name: "Chủ đề 2: Nhịp điệu quê hương",
                lessons: [
                    "Hát: Lí cây bông|1",
                    "Nhạc cụ: Thực hành nhạc cụ giai điệu|1",
                    "Lí thuyết âm nhạc: Các kí hiệu âm nhạc|1",
                    "Thường thức âm nhạc: Dân ca Việt Nam|1"
                ]
            },
            {
                name: "Chủ đề 3: Mùa xuân đến",
                lessons: [
                    "Hát: Ngày đầu tiên đi học|1",
                    "Nhạc cụ: Thực hành nhạc cụ|1",
                    "Đọc nhạc: Bài đọc nhạc số 2|1",
                    "Thường thức âm nhạc: Nhạc sĩ Nguyễn Ngọc Thiện|1"
                ]
            },
            {
                name: "Chủ đề 4: Khúc nhạc thiên nhiên",
                lessons: [
                    "Hát: Vui bước trên đường xa|1",
                    "Nhạc cụ: Thực hành nhạc cụ|1",
                    "Lí thuyết âm nhạc: Nhịp và phách|1",
                    "Thường thức âm nhạc: Một số thể loại bài hát|1"
                ]
            },
            {
                name: "Chủ đề 5: Tình bạn",
                lessons: [
                    "Hát: Lá thuyền ước mơ|1",
                    "Nhạc cụ: Thực hành nhạc cụ|1",
                    "Đọc nhạc: Bài đọc nhạc số 3|1",
                    "Thường thức âm nhạc: Giới thiệu một số nhạc cụ dân tộc|1"
                ]
            },
            {
                name: "Chủ đề 6: Hè vui",
                lessons: [
                    "Hát: Bắc kim thang|1",
                    "Nhạc cụ: Thực hành nhạc cụ|1",
                    "Đọc nhạc: Bài đọc nhạc số 4|1",
                    "Thường thức âm nhạc: Giới thiệu nhạc cụ phương Tây|1"
                ]
            }
        ]
    },
    {
        grade: GradeLevel.Grade7,
        chapters: [
            {
                name: "Chủ đề 1: Mái trường thân yêu",
                lessons: [
                    "Hát: Mùa khai trường|1",
                    "Nhạc cụ: Thực hành nhạc cụ tiết tấu|1",
                    "Đọc nhạc: Bài đọc nhạc số 1|1",
                    "Thường thức âm nhạc: Nhạc sĩ Vũ Trọng Tường|1"
                ]
            },
            {
                name: "Chủ đề 2: Âm nhạc và cuộc sống",
                lessons: [
                    "Hát: Đi cắt lúa|1",
                    "Nhạc cụ: Thực hành nhạc cụ giai điệu|1",
                    "Lí thuyết âm nhạc: Quãng|1",
                    "Thường thức âm nhạc: Nhạc sĩ Hoàng Vân|1"
                ]
            },
            {
                name: "Chủ đề 3: Âm nhạc dân gian",
                lessons: [
                    "Hát: Lí kéo chài|1",
                    "Nhạc cụ: Thực hành nhạc cụ|1",
                    "Đọc nhạc: Bài đọc nhạc số 2|1",
                    "Thường thức âm nhạc: Hát chèo|1"
                ]
            },
            {
                name: "Chủ đề 4: Giai điệu tình bạn",
                lessons: [
                    "Hát: Tuổi đời mênh mông|1",
                    "Nhạc cụ: Thực hành nhạc cụ|1",
                    "Lí thuyết âm nhạc: Hợp âm|1",
                    "Thường thức âm nhạc: Nhạc sĩ Trịnh Công Sơn|1"
                ]
            },
            {
                name: "Chủ đề 5: Âm nhạc quê hương",
                lessons: [
                    "Hát: Bài ca đi học|1",
                    "Nhạc cụ: Thực hành nhạc cụ|1",
                    "Đọc nhạc: Bài đọc nhạc số 3|1",
                    "Thường thức âm nhạc: Nhạc cụ truyền thống Việt Nam|1"
                ]
            },
            {
                name: "Chủ đề 6: Mùa hè",
                lessons: [
                    "Hát: Ca ngợi Tổ quốc|1",
                    "Nhạc cụ: Thực hành nhạc cụ|1",
                    "Đọc nhạc: Bài đọc nhạc số 4|1",
                    "Thường thức âm nhạc: Sơ lược về nhạc cụ giao hưởng|1"
                ]
            }
        ]
    },
    {
        grade: GradeLevel.Grade8,
        chapters: [
            {
                name: "Chủ đề 1: Niềm tin và hi vọng",
                lessons: [
                    "Hát: Tuổi trẻ và tương lai|1",
                    "Nhạc cụ: Thực hành nhạc cụ tiết tấu|1",
                    "Đọc nhạc: Bài đọc nhạc số 1|1",
                    "Thường thức âm nhạc: Nhạc sĩ Trần Hoàn|1"
                ]
            },
            {
                name: "Chủ đề 2: Quê hương",
                lessons: [
                    "Hát: Quê hương|1",
                    "Nhạc cụ: Thực hành nhạc cụ giai điệu|1",
                    "Lí thuyết âm nhạc: Giọng trưởng và giọng thứ|1",
                    "Thường thức âm nhạc: Ca Huế|1"
                ]
            },
            {
                name: "Chủ đề 3: Vòng tay bè bạn",
                lessons: [
                    "Hát: Nối vòng tay lớn|1",
                    "Nhạc cụ: Thực hành nhạc cụ|1",
                    "Đọc nhạc: Bài đọc nhạc số 2|1",
                    "Thường thức âm nhạc: Nhạc Pop Việt Nam|1"
                ]
            },
            {
                name: "Chủ đề 4: Đất nước",
                lessons: [
                    "Hát: Hát về cây lúa hôm nay|1",
                    "Nhạc cụ: Thực hành nhạc cụ|1",
                    "Lí thuyết âm nhạc: Hoá biểu và dấu hoá bất thường|1",
                    "Thường thức âm nhạc: Nhạc sĩ Phạm Tuyên|1"
                ]
            },
            {
                name: "Chủ đề 5: Hoà bình và hữu nghị",
                lessons: [
                    "Hát: Hãy cho tôi lên đường|1",
                    "Nhạc cụ: Thực hành nhạc cụ|1",
                    "Đọc nhạc: Bài đọc nhạc số 3|1",
                    "Thường thức âm nhạc: Nhạc Jazz|1"
                ]
            },
            {
                name: "Chủ đề 6: Ước mơ xanh",
                lessons: [
                    "Hát: Tuổi hồng|1",
                    "Nhạc cụ: Thực hành nhạc cụ|1",
                    "Đọc nhạc: Bài đọc nhạc số 4|1",
                    "Thường thức âm nhạc: Nghệ thuật cải lương|1"
                ]
            }
        ]
    },
    {
        grade: GradeLevel.Grade9,
        chapters: [
            {
                name: "Chủ đề 1: Ngày khai trường",
                lessons: [
                    "Hát: Bóng dáng một ngôi trường|1",
                    "Nhạc cụ: Thực hành nhạc cụ tiết tấu|1",
                    "Đọc nhạc: Bài đọc nhạc số 1|1",
                    "Thường thức âm nhạc: Nhạc sĩ Huy Du|1"
                ]
            },
            {
                name: "Chủ đề 2: Tuổi trẻ",
                lessons: [
                    "Hát: Nụ cười|1",
                    "Nhạc cụ: Thực hành nhạc cụ giai điệu|1",
                    "Lí thuyết âm nhạc: Sơ lược về hình thức và cấu trúc bài hát|1",
                    "Thường thức âm nhạc: Nhạc sĩ Bùi Đình Thảo|1"
                ]
            },
            {
                name: "Chủ đề 3: Tình yêu Tổ quốc",
                lessons: [
                    "Hát: Lên ngàn|1",
                    "Nhạc cụ: Thực hành nhạc cụ|1",
                    "Đọc nhạc: Bài đọc nhạc số 2|1",
                    "Thường thức âm nhạc: Sơ lược về giao hưởng|1"
                ]
            },
            {
                name: "Chủ đề 4: Gia đình",
                lessons: [
                    "Hát: Quê nhà|1",
                    "Nhạc cụ: Thực hành nhạc cụ|1",
                    "Lí thuyết âm nhạc: Giọng La thứ tự nhiên, hoà thanh và giai điệu|1",
                    "Thường thức âm nhạc: Nghệ thuật Đờn ca tài tử|1"
                ]
            },
            {
                name: "Chủ đề 5: Thanh niên",
                lessons: [
                    "Hát: Con đường đến trường|1",
                    "Nhạc cụ: Thực hành nhạc cụ|1",
                    "Đọc nhạc: Bài đọc nhạc số 3|1",
                    "Thường thức âm nhạc: Nhạc sĩ và bản giao hưởng nổi tiếng thế giới|1"
                ]
            },
            {
                name: "Chủ đề 6: Chào mùa hè",
                lessons: [
                    "Hát: Tháng năm học trò|1",
                    "Nhạc cụ: Thực hành nhạc cụ|1",
                    "Đọc nhạc: Bài đọc nhạc số 4|1",
                    "Thường thức âm nhạc: Tổng kết âm nhạc THCS|1"
                ]
            }
        ]
    }
];

// ============ TIẾNG ANH (Global Success - Kết nối tri thức) ============
export const TIENGANH_KNTT_CURRICULUM: Curriculum[] = [
    {
        grade: GradeLevel.Grade3,
        chapters: [
            { name: "Unit 1-5", lessons: ["Unit 1: Hello|1", "Unit 2: Our names|1", "Unit 3: Our friends|1", "Unit 4: Our bodies|1", "Unit 5: My hobbies|1", "Review 1|1"] },
            { name: "Unit 6-10", lessons: ["Unit 6: Our school|1", "Unit 7: Our classes|1", "Unit 8: This is my pen|1", "Unit 9: Colours|1", "Unit 10: Break time activities|1", "Review 2|1"] },
            { name: "Unit 11-15", lessons: ["Unit 11: My family|1", "Unit 12: Jobs|1", "Unit 13: My house|1", "Unit 14: My bedroom|1", "Unit 15: Do you have any toys?|1", "Review 3|1"] },
            { name: "Unit 16-20", lessons: ["Unit 16: Pets|1", "Unit 17: Our toys|1", "Unit 18: Playing and doing|1", "Unit 19: Outdoor activities|1", "Unit 20: At the zoo|1", "Review 4|1"] }
        ]
    },
    {
        grade: GradeLevel.Grade4,
        chapters: [
            { name: "Unit 1-5", lessons: ["Unit 1: Nice to see you again|1", "Unit 2: My school|1", "Unit 3: My birthday|1", "Unit 4: When's your birthday?|1", "Unit 5: Can you swim?|1", "Review 1|1"] },
            { name: "Unit 6-10", lessons: ["Unit 6: Where's your school?|1", "Unit 7: What do you like doing?|1", "Unit 8: What subjects do you have?|1", "Unit 9: What are they doing?|1", "Unit 10: Where were you yesterday?|1", "Review 2|1"] },
            { name: "Unit 11-15", lessons: ["Unit 11: What time is it?|1", "Unit 12: What does your father do?|1", "Unit 13: Would you like some milk?|1", "Unit 14: What does he look like?|1", "Unit 15: When's Children's Day?|1", "Review 3|1"] },
            { name: "Unit 16-20", lessons: ["Unit 16: Let's go to the bookshop!|1", "Unit 17: How much is the T-shirt?|1", "Unit 18: What's your phone number?|1", "Unit 19: What animal do you want to see?|1", "Unit 20: What are you going to do this summer?|1", "Review 4|1"] }
        ]
    },
    {
        grade: GradeLevel.Grade5,
        chapters: [
            { name: "Unit 1-5", lessons: ["Unit 1: What's your address?|1", "Unit 2: I always get up early|1", "Unit 3: Where did you go on holiday?|1", "Unit 4: Did you go to the party?|1", "Unit 5: Where will you be this weekend?|1", "Review 1|1"] },
            { name: "Unit 6-10", lessons: ["Unit 6: How many lessons do you have today?|1", "Unit 7: How do you learn English?|1", "Unit 8: What are you reading?|1", "Unit 9: What did you see at the zoo?|1", "Unit 10: When will Sports Day be?|1", "Review 2|1"] },
            { name: "Unit 11-15", lessons: ["Unit 11: What's the matter with you?|1", "Unit 12: Don't ride your bike too fast!|1", "Unit 13: What do you do in your free time?|1", "Unit 14: What happened in the story?|1", "Unit 15: What would you like to be?|1", "Review 3|1"] },
            { name: "Unit 16-20", lessons: ["Unit 16: Where's the post office?|1", "Unit 17: What would you like to eat?|1", "Unit 18: What will the weather be like?|1", "Unit 19: Which place would you like to visit?|1", "Unit 20: Which one is more exciting?|1", "Review 4|1"] }
        ]
    },
    {
        grade: GradeLevel.Grade6,
        chapters: [
            { name: "Unit 1-3", lessons: ["Unit 1: My new school|1", "Unit 2: My house|1", "Unit 3: My friends|1", "Review 1|1"] },
            { name: "Unit 4-6", lessons: ["Unit 4: My neighbourhood|1", "Unit 5: Natural wonders of Viet Nam|1", "Unit 6: Our Tet holiday|1", "Review 2|1"] },
            { name: "Unit 7-9", lessons: ["Unit 7: Television|1", "Unit 8: Sports and games|1", "Unit 9: Cities of the world|1", "Review 3|1"] },
            { name: "Unit 10-12", lessons: ["Unit 10: Our houses in the future|1", "Unit 11: Our greener world|1", "Unit 12: Robots|1", "Review 4|1"] }
        ]
    },
    {
        grade: GradeLevel.Grade7,
        chapters: [
            { name: "Unit 1-3", lessons: ["Unit 1: My hobbies|1", "Unit 2: Healthy living|1", "Unit 3: Community service|1", "Review 1|1"] },
            { name: "Unit 4-6", lessons: ["Unit 4: Music and arts|1", "Unit 5: Vietnamese food and drink|1", "Unit 6: A visit to a school|1", "Review 2|1"] },
            { name: "Unit 7-9", lessons: ["Unit 7: Traffic|1", "Unit 8: Films|1", "Unit 9: Festivals around the world|1", "Review 3|1"] },
            { name: "Unit 10-12", lessons: ["Unit 10: Sources of energy|1", "Unit 11: Travelling in the future|1", "Unit 12: English-speaking countries|1", "Review 4|1"] }
        ]
    },
    {
        grade: GradeLevel.Grade8,
        chapters: [
            { name: "Unit 1-3", lessons: ["Unit 1: Leisure activities|1", "Unit 2: Life in the countryside|1", "Unit 3: Peoples of Viet Nam|1", "Review 1|1"] },
            { name: "Unit 4-6", lessons: ["Unit 4: Our customs and traditions|1", "Unit 5: Festivals in Viet Nam|1", "Unit 6: Folk tales|1", "Review 2|1"] },
            { name: "Unit 7-9", lessons: ["Unit 7: Environmental protection|1", "Unit 8: English speaking countries|1", "Unit 9: Natural disasters|1", "Review 3|1"] },
            { name: "Unit 10-12", lessons: ["Unit 10: Communication|1", "Unit 11: Science and technology|1", "Unit 12: Life on other planets|1", "Review 4|1"] }
        ]
    },
    {
        grade: GradeLevel.Grade9,
        chapters: [
            { name: "Unit 1-3", lessons: ["Unit 1: Local environment|1", "Unit 2: City life|1", "Unit 3: Teen stress and pressure|1", "Review 1|1"] },
            { name: "Unit 4-6", lessons: ["Unit 4: Life in the past|1", "Unit 5: Wonders of Viet Nam|1", "Unit 6: Viet Nam: Then and now|1", "Review 2|1"] },
            { name: "Unit 7-9", lessons: ["Unit 7: Recipes and eating habits|1", "Unit 8: Tourism|1", "Unit 9: English in the world|1", "Review 3|1"] },
            { name: "Unit 10-12", lessons: ["Unit 10: Space exploration|1", "Unit 11: Changing roles in society|1", "Unit 12: My future career|1", "Review 4|1"] }
        ]
    }
];

// ============ GDTC (Giáo dục thể chất - KNTT) ============
export const GDTC_KNTT_CURRICULUM: Curriculum[] = [
    {
        grade: GradeLevel.Grade6,
        chapters: [
            { name: "Phần chung", lessons: ["Đội hình đội ngũ|1", "Bài tập thể dục phát triển chung|1"] },
            { name: "Chạy", lessons: ["Chạy cự li ngắn (60m)|1", "Chạy cự li trung bình|1", "Chạy tiếp sức|1"] },
            { name: "Bật nhảy - Ném đẩy", lessons: ["Bật xa tại chỗ|1", "Nhảy xa kiểu ngồi|1", "Ném bóng|1"] },
            { name: "Thể thao tự chọn", lessons: ["Bóng đá mini|1", "Bóng rổ|1", "Cầu lông|1", "Bóng chuyền mini|1"] }
        ]
    },
    {
        grade: GradeLevel.Grade7,
        chapters: [
            { name: "Phần chung", lessons: ["Đội hình đội ngũ|1", "Bài tập thể dục|1"] },
            { name: "Chạy", lessons: ["Chạy cự li ngắn (80m)|1", "Chạy cự li trung bình|1", "Chạy bền|1"] },
            { name: "Bật nhảy - Ném đẩy", lessons: ["Nhảy xa kiểu ngồi|1", "Nhảy cao kiểu bước qua|1", "Đẩy tạ|1"] },
            { name: "Thể thao tự chọn", lessons: ["Bóng đá|1", "Bóng rổ|1", "Cầu lông|1", "Bóng chuyền|1", "Bơi lội|1"] }
        ]
    },
    {
        grade: GradeLevel.Grade8,
        chapters: [
            { name: "Phần chung", lessons: ["Đội hình đội ngũ|1", "Bài tập thể dục phát triển chung|1"] },
            { name: "Chạy", lessons: ["Chạy cự li ngắn (100m)|1", "Chạy tiếp sức|1", "Chạy bền|1"] },
            { name: "Bật nhảy - Ném đẩy", lessons: ["Nhảy xa kiểu ưỡn thân|1", "Nhảy cao kiểu nằm nghiêng|1", "Đẩy tạ kĩ thuật vai hướng ném|1"] },
            { name: "Thể thao tự chọn", lessons: ["Bóng đá|1", "Bóng rổ|1", "Cầu lông|1", "Bóng chuyền|1", "Bơi lội|1"] }
        ]
    },
    {
        grade: GradeLevel.Grade9,
        chapters: [
            { name: "Phần chung", lessons: ["Đội hình đội ngũ|1", "Bài tập thể dục|1"] },
            { name: "Chạy", lessons: ["Chạy cự li ngắn (100m)|1", "Chạy tiếp sức 4x100m|1", "Chạy bền|1"] },
            { name: "Bật nhảy - Ném đẩy", lessons: ["Nhảy xa kiểu ưỡn thân|1", "Nhảy cao kiểu nằm nghiêng|1", "Đẩy tạ kĩ thuật lưng hướng ném|1"] },
            { name: "Thể thao tự chọn", lessons: ["Bóng đá|1", "Bóng rổ|1", "Cầu lông|1", "Bóng chuyền|1", "Bơi lội|1", "Võ thuật|1"] }
        ]
    }
];

// ============ MĨ THUẬT / NGHỆ THUẬT (KNTT) ============
export const MYTHUAT_KNTT_CURRICULUM: Curriculum[] = [
    {
        grade: GradeLevel.Grade6,
        chapters: [
            { name: "Chủ đề 1: Mĩ thuật và đời sống", lessons: ["Bài 1: Mĩ thuật trong đời sống hằng ngày|1", "Bài 2: Yếu tố tạo hình cơ bản|1"] },
            { name: "Chủ đề 2: Hình ảnh quê hương", lessons: ["Bài 3: Vẽ tranh phong cảnh|1", "Bài 4: Vẽ tranh đề tài quê hương|1"] },
            { name: "Chủ đề 3: Con người và cuộc sống", lessons: ["Bài 5: Vẽ chân dung|1", "Bài 6: Vẽ tranh sinh hoạt|1"] },
            { name: "Chủ đề 4: Trang trí", lessons: ["Bài 7: Trang trí đường diềm|1", "Bài 8: Trang trí hình vuông|1"] },
            { name: "Chủ đề 5: Thủ công mĩ thuật", lessons: ["Bài 9: Thiết kế sản phẩm sáng tạo|1", "Bài 10: Trưng bày và giới thiệu sản phẩm|1"] }
        ]
    },
    {
        grade: GradeLevel.Grade7,
        chapters: [
            { name: "Chủ đề 1: Mĩ thuật tạo hình", lessons: ["Bài 1: Đường nét trong mĩ thuật|1", "Bài 2: Hình khối và không gian|1"] },
            { name: "Chủ đề 2: Hội họa", lessons: ["Bài 3: Màu sắc trong hội họa|1", "Bài 4: Vẽ tranh tĩnh vật|1"] },
            { name: "Chủ đề 3: Đồ họa", lessons: ["Bài 5: Kĩ thuật in tranh|1", "Bài 6: Thiết kế bìa sách|1"] },
            { name: "Chủ đề 4: Điêu khắc", lessons: ["Bài 7: Nặn tạo dáng|1", "Bài 8: Phù điêu trang trí|1"] },
            { name: "Chủ đề 5: Kiến trúc", lessons: ["Bài 9: Thiết kế mô hình kiến trúc|1", "Bài 10: Giới thiệu kiến trúc Việt Nam|1"] }
        ]
    },
    {
        grade: GradeLevel.Grade8,
        chapters: [
            { name: "Chủ đề 1: Mĩ thuật ứng dụng", lessons: ["Bài 1: Mĩ thuật ứng dụng trong đời sống|1", "Bài 2: Thiết kế đồ họa|1"] },
            { name: "Chủ đề 2: Hội họa", lessons: ["Bài 3: Vẽ tranh đề tài|1", "Bài 4: Sáng tạo tranh theo phong cách|1"] },
            { name: "Chủ đề 3: Thiết kế", lessons: ["Bài 5: Thiết kế trang phục|1", "Bài 6: Thiết kế sản phẩm|1"] },
            { name: "Chủ đề 4: Nghệ thuật dân gian", lessons: ["Bài 7: Tranh dân gian Việt Nam|1", "Bài 8: Tìm hiểu nghệ thuật dân tộc|1"] },
            { name: "Chủ đề 5: Dự án sáng tạo", lessons: ["Bài 9: Dự án mĩ thuật cộng đồng|1", "Bài 10: Trưng bày triển lãm|1"] }
        ]
    },
    {
        grade: GradeLevel.Grade9,
        chapters: [
            { name: "Chủ đề 1: Mĩ thuật hiện đại", lessons: ["Bài 1: Xu hướng mĩ thuật hiện đại|1", "Bài 2: Mĩ thuật số (Digital Art)|1"] },
            { name: "Chủ đề 2: Thiết kế sáng tạo", lessons: ["Bài 3: Thiết kế logo và nhận diện thương hiệu|1", "Bài 4: Thiết kế poster|1"] },
            { name: "Chủ đề 3: Nghệ thuật tổng hợp", lessons: ["Bài 5: Nghệ thuật sắp đặt|1", "Bài 6: Nghệ thuật trình diễn|1"] },
            { name: "Chủ đề 4: Di sản mĩ thuật", lessons: ["Bài 7: Di sản mĩ thuật Việt Nam|1", "Bài 8: Di sản mĩ thuật thế giới|1"] },
            { name: "Chủ đề 5: Định hướng nghề nghiệp", lessons: ["Bài 9: Nghề nghiệp liên quan đến mĩ thuật|1", "Bài 10: Dự án tốt nghiệp mĩ thuật|1"] }
        ]
    }
];