// Веб-сервіс для сторінки викладача: приймає повідомлення з форми зворотного зв'язку
const http = require('http');
const port = process.env.PORT || 3000;   // Render передає порт через PORT
const MAX_BODY = 10 * 1024;              // максимум 10 КБ на запит
const messages = [];                     // зберігання в пам'яті (на безкоштовному тарифі диск не постійний)

function send(res, code, obj) {
    res.statusCode = code;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify(obj));
}

const server = http.createServer((req, res) => {
    // CORS: клієнт (Static Site) розміщений на іншому домені
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') { res.statusCode = 204; return res.end(); }

    const path = new URL(req.url, 'http://x').pathname;

    if (path === '/health' && req.method === 'GET') {
        return send(res, 200, { status: 'ok', received: messages.length });
    }

    if (path === '/feedback' && req.method === 'POST') {
        let body = '';
        let tooBig = false;
        req.on('data', chunk => {
            body += chunk;
            if (body.length > MAX_BODY) { tooBig = true; req.destroy(); }
        });
        req.on('end', () => {
            if (tooBig) return;
            let data;
            try { data = JSON.parse(body); } catch (e) {
                return send(res, 400, { error: 'Некоректний JSON' });
            }
            const name = String(data.name || '').trim();
            const email = String(data.email || '').trim();
            const message = String(data.message || '').trim();
            if (!name || !email || !message) {
                return send(res, 400, { error: 'Заповніть ім\'я, пошту і повідомлення' });
            }
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                return send(res, 400, { error: 'Некоректна електронна пошта' });
            }
            if (name.length > 100 || email.length > 150 || message.length > 2000) {
                return send(res, 400, { error: 'Занадто довгий текст' });
            }
            messages.push({ name, email, message, at: new Date().toISOString() });
            if (messages.length > 100) messages.shift();
            console.log(`Нове повідомлення від ${name} <${email}>: ${message.slice(0, 80)}`);
            send(res, 201, { ok: true, message: 'Дякуємо! Повідомлення отримано.' });
        });
        return;
    }

    send(res, 404, { error: 'Route not found. Use POST /feedback or GET /health' });
});

server.listen(port, '0.0.0.0', () => console.log(`Server is running on port ${port}`));
