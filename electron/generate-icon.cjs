// Script tạo icon.png từ SVG sử dụng canvas
const fs = require('fs');
const path = require('path');

// Tạo một PNG icon đơn giản 256x256 bằng raw bytes
// Đây là PNG minimal với gradient tím + text trắng
// electron-builder sẽ tự convert PNG → ICO

// Tạo script HTML để render SVG → PNG
const html = `<!DOCTYPE html>
<html>
<body>
<canvas id="c" width="256" height="256"></canvas>
<script>
const c = document.getElementById('c');
const ctx = c.getContext('2d');

// Background gradient
const grad = ctx.createLinearGradient(0, 0, 256, 256);
grad.addColorStop(0, '#4f46e5');
grad.addColorStop(1, '#7c3aed');

// Rounded rect
function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
}

// Draw background
roundRect(0, 0, 256, 256, 48);
ctx.fillStyle = grad;
ctx.fill();

// Draw book
ctx.save();
ctx.translate(128, 145);
ctx.strokeStyle = 'white';
ctx.lineWidth = 5;
ctx.lineCap = 'round';
ctx.lineJoin = 'round';

// Left page
ctx.beginPath();
ctx.moveTo(-4, 30);
ctx.lineTo(-4, -30);
ctx.bezierCurveTo(-4, -40, -14, -50, -30, -52);
ctx.bezierCurveTo(-46, -54, -58, -48, -60, -40);
ctx.lineTo(-60, 26);
ctx.bezierCurveTo(-58, 20, -46, 16, -30, 18);
ctx.bezierCurveTo(-14, 20, -4, 28, -4, 30);
ctx.fillStyle = 'rgba(255,255,255,0.15)';
ctx.fill();
ctx.stroke();

// Right page
ctx.beginPath();
ctx.moveTo(4, 30);
ctx.lineTo(4, -30);
ctx.bezierCurveTo(4, -40, 14, -50, 30, -52);
ctx.bezierCurveTo(46, -54, 58, -48, 60, -40);
ctx.lineTo(60, 26);
ctx.bezierCurveTo(58, 20, 46, 16, 30, 18);
ctx.bezierCurveTo(14, 20, 4, 28, 4, 30);
ctx.fillStyle = 'rgba(255,255,255,0.15)';
ctx.fill();
ctx.stroke();

// Spine
ctx.beginPath();
ctx.moveTo(0, -30);
ctx.lineTo(0, 30);
ctx.stroke();

// Text lines
ctx.lineWidth = 3;
ctx.globalAlpha = 0.6;
[[-45,-20,-15,-20],[-45,-8,-15,-8],[-45,4,-25,4],[15,-20,45,-20],[15,-8,45,-8],[25,4,45,4]].forEach(l => {
    ctx.beginPath();ctx.moveTo(l[0],l[1]);ctx.lineTo(l[2],l[3]);ctx.stroke();
});
ctx.globalAlpha = 1;
ctx.restore();

// AI sparkle dots
ctx.fillStyle = '#fbbf24';
[[185,55,4],[200,40,6],[215,58,3],[195,70,3]].forEach(d => {
    ctx.beginPath();ctx.arc(d[0],d[1],d[2],0,Math.PI*2);ctx.fill();
});

// Sparkle lines
ctx.strokeStyle = '#fbbf24';
ctx.lineWidth = 1.5;
ctx.globalAlpha = 0.7;
[[185,55,200,40],[200,40,215,58],[200,40,195,70],[185,55,195,70]].forEach(l => {
    ctx.beginPath();ctx.moveTo(l[0],l[1]);ctx.lineTo(l[2],l[3]);ctx.stroke();
});
ctx.globalAlpha = 1;

// Star sparkle
ctx.fillStyle = '#fbbf24';
ctx.beginPath();
ctx.moveTo(200,33);
ctx.lineTo(203,37);ctx.lineTo(207,37);ctx.lineTo(204,40);
ctx.lineTo(205,44);ctx.lineTo(200,41);ctx.lineTo(195,44);
ctx.lineTo(196,40);ctx.lineTo(193,37);ctx.lineTo(197,37);
ctx.closePath();
ctx.fill();

// Export
const dataUrl = c.toDataURL('image/png');
document.title = dataUrl;
</script>
</body>
</html>`;

console.log('Icon generation script created.');
console.log('Note: electron-builder can use icon.svg or icon.png');
console.log('For production, use an online SVG→ICO converter');
