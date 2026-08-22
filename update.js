const fs = require('fs');
let content = fs.readFileSync('services/geminiService.ts', 'utf-8');
content = content.replace(/const apiKey = process\.env\.GEMINI_API_KEY \|\| process\.env\.API_KEY;/g, 'const apiKey = localStorage.getItem("custom_gemini_api_key") || process.env.GEMINI_API_KEY || process.env.API_KEY;');
fs.writeFileSync('services/geminiService.ts', content);
console.log('Update successful');
