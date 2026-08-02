import express, { Request, Response } from 'express';
import { searchKnowledge } from './search/pipeline.js';
import { debugRetrieval, type DebugResult } from './search/debug.js';
import { closePool } from './db.js';

const app = express();
const PORT = process.env.PORT ?? 3000;

app.use(express.json());

// Serve static files (CSS, JS inline in HTML)
app.use(express.static('public'));

// HTML home page
const HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ETSI RAG — Digitális Aláírás Tudásbázis</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      background: #f5f5f5;
      color: #333;
      line-height: 1.6;
    }

    .container {
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
    }

    header {
      background: white;
      padding: 30px 20px;
      border-bottom: 2px solid #0066cc;
      margin-bottom: 30px;
      border-radius: 4px;
    }

    h1 {
      font-size: 28px;
      color: #0066cc;
      margin-bottom: 10px;
    }

    .subtitle {
      font-size: 14px;
      color: #666;
    }

    .search-section {
      background: white;
      padding: 20px;
      border-radius: 4px;
      margin-bottom: 20px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }

    textarea {
      width: 100%;
      height: 100px;
      padding: 10px;
      font-size: 14px;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-family: inherit;
      resize: vertical;
      margin-bottom: 10px;
    }

    textarea:focus {
      outline: none;
      border-color: #0066cc;
      box-shadow: 0 0 0 2px rgba(0,102,204,0.1);
    }

    .controls {
      display: flex;
      gap: 10px;
      align-items: center;
      margin-bottom: 10px;
    }

    button {
      padding: 10px 20px;
      background: #0066cc;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
    }

    button:hover {
      background: #0052a3;
    }

    button:disabled {
      background: #ccc;
      cursor: not-allowed;
    }

    .loading {
      color: #0066cc;
      font-size: 14px;
    }

    label {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
      cursor: pointer;
    }

    input[type="checkbox"] {
      cursor: pointer;
    }

    .answer-section {
      background: white;
      padding: 20px;
      border-radius: 4px;
      margin-bottom: 20px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      display: none;
    }

    .answer-section.show {
      display: block;
    }

    .answer-text {
      font-size: 16px;
      line-height: 1.7;
      margin-bottom: 20px;
      padding: 15px;
      background: #f9f9f9;
      border-left: 3px solid #0066cc;
      border-radius: 2px;
      white-space: pre-wrap;
      word-wrap: break-word;
    }

    .sources {
      margin-top: 20px;
    }

    .sources-title {
      font-weight: bold;
      font-size: 14px;
      color: #666;
      margin-bottom: 10px;
    }

    .source-item {
      font-size: 13px;
      padding: 8px;
      background: #f0f0f0;
      margin-bottom: 5px;
      border-radius: 3px;
      border-left: 3px solid #0066cc;
    }

    .source-item a {
      color: #0066cc;
      text-decoration: none;
    }

    .source-item a:hover {
      text-decoration: underline;
    }

    .error {
      background: #fee;
      color: #c00;
      padding: 15px;
      border-radius: 4px;
      margin-top: 20px;
      border-left: 3px solid #c00;
    }

    .debug-section {
      background: white;
      padding: 20px;
      border-radius: 4px;
      margin-top: 20px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      display: none;
    }

    .debug-section.show {
      display: block;
    }

    .debug-collapsible {
      cursor: pointer;
      font-weight: bold;
      padding: 10px;
      background: #f0f0f0;
      border-radius: 3px;
      margin-bottom: 10px;
      user-select: none;
    }

    .debug-collapsible:hover {
      background: #e0e0e0;
    }

    .debug-content {
      display: none;
      padding: 10px;
      background: #fafafa;
      border-radius: 3px;
      margin-bottom: 10px;
    }

    .debug-content.open {
      display: block;
    }

    .debug-hits {
      font-size: 12px;
      font-family: monospace;
      line-height: 1.5;
    }

    .debug-hit {
      padding: 5px;
      margin: 5px 0;
      background: white;
      border-left: 2px solid #999;
      padding-left: 10px;
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>🔒 ETSI RAG</h1>
      <p class="subtitle">Digitális aláírás tudásbázis — ETSI elektronikus aláírási szabványok</p>
    </header>

    <div class="search-section">
      <textarea id="question" placeholder="Kérdezzen az ETSI elektronikus aláírási szabványokról..."></textarea>

      <div class="controls">
        <button id="askBtn" onclick="askQuestion()">🔍 Kérdez</button>
        <span id="loading" class="loading" style="display: none;">Keresés…</span>
      </div>

      <label>
        <input type="checkbox" id="debugCheckbox">
        Debug mód (retrieval lépések)
      </label>
    </div>

    <div id="answerSection" class="answer-section">
      <div id="answerText" class="answer-text"></div>
      <div id="sourcesDiv"></div>
    </div>

    <div id="debugSection" class="debug-section">
      <div id="debugContent"></div>
    </div>

    <div id="errorDiv" class="error" style="display: none;"></div>
  </div>

  <script>
    const questionEl = document.getElementById('question');
    const askBtn = document.getElementById('askBtn');
    const loadingEl = document.getElementById('loading');
    const answerSection = document.getElementById('answerSection');
    const answerText = document.getElementById('answerText');
    const sourcesDiv = document.getElementById('sourcesDiv');
    const errorDiv = document.getElementById('errorDiv');
    const debugSection = document.getElementById('debugSection');
    const debugCheckbox = document.getElementById('debugCheckbox');

    async function askQuestion() {
      const question = questionEl.value.trim();
      if (!question) {
        errorDiv.textContent = 'Kérjük, adjon meg egy kérdést!';
        errorDiv.style.display = 'block';
        return;
      }

      errorDiv.style.display = 'none';
      answerSection.classList.remove('show');
      debugSection.classList.remove('show');

      askBtn.disabled = true;
      loadingEl.style.display = 'inline';

      try {
        // Ask question
        const response = await fetch('/api/ask', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ question }),
        });

        if (!response.ok) {
          throw new Error(\`HTTP \${response.status}\`);
        }

        const result = await response.json();

        // Show answer
        answerText.textContent = result.answer;

        if (result.noInfo) {
          sourcesDiv.innerHTML = '';
        } else {
          let html = '<div class="sources"><div class="sources-title">📚 Források:</div>';
          for (const src of result.sources) {
            html += \`<div class="source-item">
              \${src.source_id} · \${src.clause_path || 'N/A'} ·
              <a href="\${src.source_url}" target="_blank">Nyitás ↗</a>
            </div>\`;
          }
          html += '</div>';
          sourcesDiv.innerHTML = html;
        }

        answerSection.classList.add('show');

        // Debug info if checked
        if (debugCheckbox.checked) {
          const debugResponse = await fetch(\`/api/debug?q=\${encodeURIComponent(question)}\`);
          const debugResult = await debugResponse.json();

          let debugHtml = '<div>';

          // NYERS
          debugHtml += '<div class="debug-collapsible" onclick="this.nextElementSibling.classList.toggle(\'open\')">📊 NYERS (Raw search) — Top 5</div>';
          debugHtml += '<div class="debug-content">';
          debugHtml += '<div class="debug-hits">';
          for (const hit of debugResult.nyers.slice(0, 5)) {
            debugHtml += \`<div class="debug-hit">\${hit.rank}. (d=\${hit.distance.toFixed(4)}) \${hit.source_id}:\${hit.clause_path}</div>\`;
          }
          debugHtml += '</div></div>';

          // Reranked
          debugHtml += '<div class="debug-collapsible" onclick="this.nextElementSibling.classList.toggle(\'open\')">✨ Reranked — Top 5</div>';
          debugHtml += '<div class="debug-content">';
          debugHtml += '<div class="debug-hits">';
          for (const hit of debugResult.reranked.slice(0, 5)) {
            debugHtml += \`<div class="debug-hit">\${hit.rank}. (s=\${hit.score.toFixed(2)}) \${hit.source_id}:\${hit.clause_path}</div>\`;
          }
          debugHtml += '</div></div>';

          debugHtml += '</div>';
          document.getElementById('debugContent').innerHTML = debugHtml;
          debugSection.classList.add('show');
        }
      } catch (error) {
        errorDiv.textContent = \`Hiba: \${error.message}\`;
        errorDiv.style.display = 'block';
      } finally {
        askBtn.disabled = false;
        loadingEl.style.display = 'none';
      }
    }

    // Allow Enter key
    questionEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && e.ctrlKey) {
        askQuestion();
      }
    });
  </script>
</body>
</html>`;

// GET / — serve HTML
app.get('/', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(HTML);
});

// POST /api/ask — search and answer
app.post('/api/ask', async (req: Request, res: Response) => {
  try {
    const { question } = req.body;

    if (!question || typeof question !== 'string') {
      res.status(400).json({ error: 'Missing or invalid question' });
      return;
    }

    const result = await searchKnowledge(question);

    res.json({
      answer: result.answer,
      sources: result.sources,
      noInfo: result.noInfo,
    });
  } catch (error) {
    console.error('Error in /api/ask:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// GET /api/debug — debug retrieval
app.get('/api/debug', async (req: Request, res: Response) => {
  try {
    const q = req.query.q as string;

    if (!q) {
      res.status(400).json({ error: 'Missing query parameter q' });
      return;
    }

    const result = await debugRetrieval(q);

    res.json({
      question: result.question,
      nyers: result.nyers,
      reranked: result.reranked,
    });
  } catch (error) {
    console.error('Error in /api/debug:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`\n🚀 ETSI RAG Server`);
  console.log(`   http://localhost:${PORT}`);
  console.log(`   API: POST http://localhost:${PORT}/api/ask`);
  console.log(`   API: GET http://localhost:${PORT}/api/debug?q=...`);
  console.log(`\n`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down...');
  server.close(async () => {
    await closePool();
    process.exit(0);
  });
});
