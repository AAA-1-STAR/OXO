const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');
const CONTENT_FILE = path.join(__dirname, 'content.json');
const MAX_LEN = 200000; // 防滥用：单次保存文本上限

function readContent() {
  try {
    const data = JSON.parse(fs.readFileSync(CONTENT_FILE, 'utf-8'));
    return typeof data.text === 'string' ? data.text : '';
  } catch (e) {
    return '';
  }
}

function writeContent(text) {
  fs.writeFileSync(CONTENT_FILE, JSON.stringify({ text }, null, 2), 'utf-8');
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  // 读取内容
  if (url.pathname === '/api/content' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ text: readContent() }));
    return;
  }

  // 写入内容（开放编辑，无鉴权；渲染端已用 textContent 防 XSS）
  if (url.pathname === '/api/content' && req.method === 'POST') {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      let text = '';
      try {
        text = JSON.parse(body).text || '';
      } catch (e) {
        text = '';
      }
      if (text.length > MAX_LEN) text = text.slice(0, MAX_LEN);
      writeContent(text);
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ ok: true }));
    });
    return;
  }

  // 首页
  if (url.pathname === '/' || url.pathname === '/index.html') {
    fs.readFile(path.join(PUBLIC_DIR, 'index.html'), (err, data) => {
      if (err) {
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Internal Error');
        return;
      }
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(data);
    });
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('Not Found');
});

server.listen(PORT, () => {
  console.log(`Live-edit server running at http://localhost:${PORT}`);
});
