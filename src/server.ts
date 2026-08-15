import express, { Request, Response } from 'express';
import { searchKnowledge } from './search/pipeline.js';
import { debugRetrieval, type DebugResult } from './search/debug.js';
import { closePool } from './db.js';

const app = express();
const PORT = process.env.PORT ?? 3000;

app.use(express.json());
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

// HTML home page
const HTML = `<!DOCTYPE html>
<html lang="hu">
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

    :root {
      --primary: #0066cc;
      --primary-dark: #0052a3;
      --success: #059669;
      --danger: #dc2626;
      --bg: #f8fafc;
      --surface: #ffffff;
      --border: #e2e8f0;
      --text: #1e293b;
      --text-muted: #64748b;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background: linear-gradient(135deg, var(--bg) 0%, #f0f9ff 100%);
      color: var(--text);
      line-height: 1.6;
      min-height: 100vh;
    }

    .container {
      max-width: 900px;
      margin: 0 auto;
      padding: 20px;
    }

    header {
      background: var(--surface);
      padding: 40px 30px;
      margin-bottom: 30px;
      border-radius: 12px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.07);
      border-left: 5px solid var(--primary);
    }

    h1 {
      font-size: 32px;
      font-weight: 700;
      color: var(--primary);
      margin-bottom: 8px;
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .subtitle {
      font-size: 15px;
      color: var(--text-muted);
      font-weight: 500;
    }

    .search-box {
      background: var(--surface);
      padding: 30px;
      border-radius: 12px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.07);
      margin-bottom: 30px;
    }

    .form-group {
      margin-bottom: 20px;
    }

    label {
      display: block;
      font-size: 14px;
      font-weight: 600;
      color: var(--text);
      margin-bottom: 8px;
    }

    textarea {
      width: 100%;
      height: 120px;
      padding: 14px 16px;
      font-size: 15px;
      border: 2px solid var(--border);
      border-radius: 8px;
      font-family: inherit;
      resize: vertical;
      background: #fafbfc;
      transition: all 0.2s;
    }

    textarea:focus {
      outline: none;
      border-color: var(--primary);
      background: white;
      box-shadow: 0 0 0 3px rgba(0, 102, 204, 0.1);
    }

    textarea::placeholder {
      color: #a1aec4;
    }

    .controls {
      display: flex;
      gap: 15px;
      align-items: center;
      flex-wrap: wrap;
    }

    .btn {
      padding: 12px 28px;
      background: var(--primary);
      color: white;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-size: 15px;
      font-weight: 600;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      gap: 8px;
      box-shadow: 0 2px 4px rgba(0, 102, 204, 0.2);
    }

    .btn:hover:not(:disabled) {
      background: var(--primary-dark);
      box-shadow: 0 4px 12px rgba(0, 102, 204, 0.3);
      transform: translateY(-1px);
    }

    .btn:disabled {
      background: #cbd5e1;
      cursor: not-allowed;
      box-shadow: none;
    }

    .loading {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      color: var(--primary);
      font-size: 14px;
      font-weight: 500;
      display: none;
    }

    .spinner {
      width: 16px;
      height: 16px;
      border: 2px solid #e2e8f0;
      border-top-color: var(--primary);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .checkbox-group {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
    }

    input[type="checkbox"] {
      width: 18px;
      height: 18px;
      cursor: pointer;
      accent-color: var(--primary);
    }

    .answer-section {
      background: var(--surface);
      padding: 30px;
      border-radius: 12px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.07);
      margin-bottom: 30px;
      display: none;
      animation: slideIn 0.3s ease-out;
    }

    .answer-section.show {
      display: block;
    }

    @keyframes slideIn {
      from {
        opacity: 0;
        transform: translateY(10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .answer-box {
      background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
      border-left: 4px solid var(--primary);
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 24px;
      line-height: 1.8;
      white-space: pre-wrap;
      word-wrap: break-word;
      font-size: 15px;
    }

    .sources {
      margin-top: 20px;
    }

    .sources-title {
      font-weight: 600;
      font-size: 14px;
      color: var(--text);
      margin-bottom: 12px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .source-list {
      display: grid;
      gap: 10px;
    }

    .source-item {
      font-size: 14px;
      padding: 12px 14px;
      background: #f0f9ff;
      border-left: 3px solid var(--primary);
      border-radius: 6px;
      transition: all 0.2s;
    }

    .source-item:hover {
      background: #e0f2fe;
      transform: translateX(4px);
    }

    .source-item a {
      color: var(--primary);
      text-decoration: none;
      font-weight: 500;
      margin-left: 8px;
    }

    .source-item a:hover {
      text-decoration: underline;
    }

    .error-box {
      background: #fee2e2;
      color: #991b1b;
      padding: 16px;
      border-radius: 8px;
      margin-top: 20px;
      border-left: 4px solid var(--danger);
      display: none;
      animation: slideIn 0.3s ease-out;
    }

    .error-box.show {
      display: block;
    }

    .debug-section {
      background: var(--surface);
      padding: 30px;
      border-radius: 12px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.07);
      margin-top: 30px;
      display: none;
    }

    .debug-section.show {
      display: block;
    }

    .debug-collapsible {
      cursor: pointer;
      font-weight: 600;
      padding: 12px 14px;
      background: #f1f5f9;
      border-radius: 8px;
      margin-bottom: 12px;
      user-select: none;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .debug-collapsible:hover {
      background: #e2e8f0;
    }

    .debug-collapsible::before {
      content: '▶';
      display: inline-block;
      transition: transform 0.2s;
      font-size: 12px;
    }

    .debug-collapsible.open::before {
      transform: rotate(90deg);
    }

    .debug-content {
      display: none;
      padding: 14px;
      background: #f8fafc;
      border-radius: 6px;
      margin-bottom: 12px;
      border-left: 3px solid #94a3b8;
    }

    .debug-content.open {
      display: block;
    }

    .debug-hits {
      font-size: 13px;
      font-family: 'Courier New', monospace;
      line-height: 1.6;
      color: #475569;
    }

    .debug-hit {
      padding: 8px 10px;
      margin: 6px 0;
      background: white;
      border-left: 3px solid #cbd5e1;
      border-radius: 4px;
    }

    .info-badge {
      display: inline-block;
      background: #dcfce7;
      color: #166534;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
      margin-left: auto;
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>🔍 ETSI RAG</h1>
      <p class="subtitle">Elektronikus aláírási szabványok — Tudásbázis keresés</p>
    </header>

    <div class="search-box">
      <div class="form-group">
        <label for="question">Kérdése az ETSI szabványokról:</label>
        <textarea id="question" placeholder="Például: Mi a PAdES baseline aláírás? Vagy: Hogyan működik az XAdES?"></textarea>
      </div>

      <div class="controls">
        <button class="btn" id="askBtn" onclick="askQuestion()">
          <span>🔍</span>
          <span>Keresés</span>
        </button>
        <div class="loading" id="loading">
          <div class="spinner"></div>
          <span>Keresés a tudásbázisban…</span>
        </div>
      </div>

      <div class="checkbox-group">
        <input type="checkbox" id="debugCheckbox">
        <label for="debugCheckbox" style="margin: 0;">Retrieval lépések mutatása</label>
      </div>
    </div>

    <div id="errorDiv" class="error-box"></div>

    <div id="answerSection" class="answer-section">
      <div class="answer-box" id="answerText"></div>
      <div id="sourcesDiv"></div>
    </div>

    <div id="debugSection" class="debug-section">
      <div id="debugContent"></div>
    </div>
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

    function showError(msg) {
      errorDiv.textContent = msg;
      errorDiv.classList.add('show');
    }

    function hideError() {
      errorDiv.classList.remove('show');
    }

    async function askQuestion() {
      console.log('askQuestion called');
      const question = questionEl.value.trim();
      if (!question) {
        showError('Kérjük, írjon be egy kérdést!');
        return;
      }

      hideError();
      answerSection.classList.remove('show');
      debugSection.classList.remove('show');

      askBtn.disabled = true;
      loadingEl.style.display = 'flex';

      try {
        console.log('Fetching /api/ask with question:', question);
        const response = await fetch('/api/ask', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ question }),
        });

        console.log('Response status:', response.status);
        if (!response.ok) {
          const errorText = await response.text();
          console.error('Error response:', errorText);
          throw new Error(\`HTTP \${response.status}: \${errorText}\`);
        }

        const result = await response.json();
        console.log('Got result:', result);

        // Show answer
        answerText.textContent = result.answer;

        if (result.noInfo) {
          sourcesDiv.innerHTML = '';
        } else {
          let html = '<div class="sources"><div class="sources-title">📚 Források</div><div class="source-list">';
          for (const src of result.sources) {
            html += \`<div class="source-item">
              <strong>\${src.source_id}</strong> · \${src.clause_path || 'N/A'}
              <a href="\${src.source_url}" target="_blank">PDF ↗</a>
            </div>\`;
          }
          html += '</div></div>';
          sourcesDiv.innerHTML = html;
        }

        answerSection.classList.add('show');

        // Debug info if checked
        if (debugCheckbox.checked) {
          try {
            const debugResponse = await fetch(\`/api/debug?q=\${encodeURIComponent(question)}\`);
            const debugResult = await debugResponse.json();

            let debugHtml = '<div>';

            // NYERS
            debugHtml += '<div class="debug-collapsible open" onclick="this.classList.toggle(\\'open\\'); this.nextElementSibling.classList.toggle(\\'open\\')">📊 Nyers keresés (Top 5)</div>';
            debugHtml += '<div class="debug-content open">';
            debugHtml += '<div class="debug-hits">';
            for (const hit of debugResult.nyers.slice(0, 5)) {
              debugHtml += \`<div class="debug-hit">#\${hit.rank} [d=\${hit.distance.toFixed(4)}] \${hit.source_id}:\${hit.clause_path}</div>\`;
            }
            debugHtml += '</div></div>';

            // Reranked
            debugHtml += '<div class="debug-collapsible open" onclick="this.classList.toggle(\\'open\\'); this.nextElementSibling.classList.toggle(\\'open\\')">✨ Reranked eredmények (Top 5)</div>';
            debugHtml += '<div class="debug-content open">';
            debugHtml += '<div class="debug-hits">';
            for (const hit of debugResult.reranked.slice(0, 5)) {
              debugHtml += \`<div class="debug-hit">#\${hit.rank} [s=\${hit.score.toFixed(2)}] \${hit.source_id}:\${hit.clause_path}</div>\`;
            }
            debugHtml += '</div></div>';

            debugHtml += '</div>';
            document.getElementById('debugContent').innerHTML = debugHtml;
            debugSection.classList.add('show');
          } catch (debugErr) {
            console.error('Debug error:', debugErr);
          }
        }
      } catch (error) {
        console.error('Error:', error);
        showError(\`Hiba: \${error instanceof Error ? error.message : 'Ismeretlen hiba'}\`);
      } finally {
        askBtn.disabled = false;
        loadingEl.style.display = 'none';
      }
    }

    // Allow Ctrl+Enter or Cmd+Enter
    questionEl.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        askQuestion();
      }
    });

    console.log('Script loaded, askQuestion function available');
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
