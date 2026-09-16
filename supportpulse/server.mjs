import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const allowed = new Map([
  ['/', ['index.html', 'text/html']],
  ['/src/app.js', ['src/app.js', 'text/javascript']],
  ['/src/data.js', ['src/data.js', 'text/javascript']],
  ['/src/styles.css', ['src/styles.css', 'text/css']],
]);
http.createServer(async (req, res) => {
  const entry = allowed.get(new URL(req.url, 'http://localhost').pathname);
  if (!entry) { res.writeHead(404); res.end('Not found'); return; }
  try {
    const body = await readFile(fileURLToPath(new URL(entry[0], import.meta.url)));
    res.writeHead(200, { 'Content-Type': entry[1] + '; charset=utf-8', 'X-Content-Type-Options': 'nosniff' });
    res.end(body);
  } catch { res.writeHead(500); res.end('Unable to load file'); }
}).listen(Number(process.env.PORT || 3000), '0.0.0.0', () => console.log('SupportPulse is running on port ' + (process.env.PORT || 3000)));
