/**
 * Customer-facing support page. Vanilla HTML/CSS/JS, no external CDN:
 * everything the browser needs is inlined here.
 */
export const SUPPORT_HTML = `<!DOCTYPE html>
<html lang="hu">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Ügyfélszolgálati asszisztens — ETSI szabványok</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }

    :root {
      --primary: #0066cc;
      --primary-dark: #0052a3;
      --bg: #f8fafc;
      --surface: #ffffff;
      --border: #e2e8f0;
      --text: #1e293b;
      --text-muted: #64748b;
      --notice-bg: #fffbeb;
      --notice-border: #f59e0b;
      --notice-text: #78350f;
      --handoff-bg: #eff6ff;
      --handoff-border: #3b82f6;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.6;
      min-height: 100vh;
    }

    .container { max-width: 780px; margin: 0 auto; padding: 24px 20px 60px; }

    h1 { font-size: 1.6rem; margin-bottom: 4px; }
    .subtitle { color: var(--text-muted); margin-bottom: 20px; }

    /* AI disclosure — must stay visually prominent and above the input. */
    .ai-notice {
      background: var(--notice-bg);
      border: 2px solid var(--notice-border);
      border-left-width: 6px;
      border-radius: 10px;
      padding: 16px 18px;
      margin-bottom: 24px;
      color: var(--notice-text);
      font-weight: 500;
    }

    .card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 20px;
    }

    label { display: block; font-weight: 600; margin-bottom: 8px; }

    textarea {
      width: 100%;
      min-height: 90px;
      padding: 12px;
      border: 1px solid var(--border);
      border-radius: 8px;
      font: inherit;
      resize: vertical;
    }
    textarea:focus { outline: 2px solid var(--primary); border-color: transparent; }

    button {
      margin-top: 12px;
      background: var(--primary);
      color: #fff;
      border: 0;
      border-radius: 8px;
      padding: 12px 26px;
      font: inherit;
      font-weight: 600;
      cursor: pointer;
    }
    button:hover:not(:disabled) { background: var(--primary-dark); }
    button:disabled { opacity: .55; cursor: not-allowed; }

    .hint { color: var(--text-muted); font-size: .875rem; margin-top: 8px; }

    #result { display: none; }
    #result.visible { display: block; }

    .answer-text { white-space: pre-wrap; margin-bottom: 18px; }

    .sources-title { font-weight: 600; font-size: .9rem; text-transform: uppercase;
      letter-spacing: .04em; color: var(--text-muted); margin-bottom: 10px; }
    .sources { list-style: none; }
    .sources li { padding: 8px 0; border-top: 1px solid var(--border); }
    .sources a { color: var(--primary); font-weight: 600; text-decoration: none; word-break: break-word; }
    .sources a:hover { text-decoration: underline; }
    .clause { color: var(--text-muted); font-weight: 400; }

    .handoff {
      background: var(--handoff-bg);
      border: 1px solid var(--handoff-border);
      border-left-width: 6px;
      border-radius: 10px;
      padding: 18px;
    }
    .handoff h2 { font-size: 1.1rem; margin-bottom: 8px; }
    .handoff-id {
      display: inline-block;
      margin-top: 10px;
      font-family: ui-monospace, 'Cascadia Code', Consolas, monospace;
      background: #fff;
      border: 1px solid var(--handoff-border);
      border-radius: 6px;
      padding: 4px 10px;
      font-weight: 700;
    }

    .meta { color: var(--text-muted); font-size: .8rem; margin-top: 16px; }
    .error { color: #b91c1c; font-weight: 600; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Ügyfélszolgálati asszisztens</h1>
    <p class="subtitle">Elektronikus aláírási (ETSI) szabványokkal kapcsolatos kérdések</p>

    <div class="ai-notice" role="note">
      🤖 Ez egy AI-asszisztens. A válaszokat a megjelölt szabvány-hivatkozásnál ellenőrizd.
      Kérjük, ne adj meg személyes vagy bizalmas adatot.
    </div>

    <div class="card">
      <label for="question">A kérdésed</label>
      <textarea id="question" placeholder="Például: What are the PAdES baseline signature levels?"></textarea>
      <button id="askBtn" type="button">Kérdezek</button>
      <p class="hint">Tipp: Ctrl+Enter is elküldi.</p>
    </div>

    <div id="result" class="card"></div>
  </div>

  <script>
    const questionEl = document.getElementById('question');
    const askBtn = document.getElementById('askBtn');
    const resultEl = document.getElementById('result');

    function escapeHtml(s) {
      return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }

    function show(html) {
      resultEl.innerHTML = html;
      resultEl.classList.add('visible');
    }

    function renderAnswer(data) {
      let html = '<div class="answer-text">' + escapeHtml(data.answer || '') + '</div>';

      if (data.sources && data.sources.length > 0) {
        html += '<div class="sources-title">Hivatkozott szabványhelyek</div><ul class="sources">';
        for (const s of data.sources) {
          const label = escapeHtml(s.source_id) +
            ' <span class="clause">— ' + escapeHtml(s.clause_path) + '</span>';
          html += s.source_url
            ? '<li><a href="' + escapeHtml(s.source_url) + '" target="_blank" rel="noopener noreferrer">' + label + '</a></li>'
            : '<li>' + label + '</li>';
        }
        html += '</ul>';
      }

      html += '<p class="meta">Válaszidő: ' + Math.round(data.latencyMs) + ' ms</p>';
      show(html);
    }

    function renderHandoff(data) {
      let html = '<div class="handoff">' +
        '<h2>👤 Átadtuk egy szakemberünknek</h2>' +
        '<p>' + escapeHtml(data.answer || '') + '</p>';

      if (data.handoffId) {
        html += '<p><span class="handoff-id">' + escapeHtml(data.handoffId) + '</span></p>';
      }

      html += '<p class="meta">Kollégánk a fenti hivatkozási számmal fog jelentkezni. ' +
        'Erre a kérdésre az asszisztens nem tudott megbízható, forrásokkal alátámasztott választ adni.</p>' +
        '</div>' +
        '<p class="meta">Válaszidő: ' + Math.round(data.latencyMs) + ' ms</p>';

      show(html);
    }

    async function ask() {
      const question = questionEl.value.trim();
      if (!question) {
        show('<p class="error">Kérlek, írd be a kérdésed.</p>');
        return;
      }

      askBtn.disabled = true;
      askBtn.textContent = 'Kérdezek…';
      show('<p>⏳ Keresés a tudásbázisban…</p>');

      try {
        const res = await fetch('/api/support/ask', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ question })
        });

        const data = await res.json();

        if (!res.ok) {
          show('<p class="error">Hiba: ' + escapeHtml(data.error || res.statusText) + '</p>');
        } else if (data.mode === 'handoff') {
          renderHandoff(data);
        } else {
          renderAnswer(data);
        }
      } catch (err) {
        show('<p class="error">Hálózati hiba: ' + escapeHtml(err.message) + '</p>');
      } finally {
        askBtn.disabled = false;
        askBtn.textContent = 'Kérdezek';
      }
    }

    askBtn.addEventListener('click', ask);
    questionEl.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') ask();
    });
  </script>
</body>
</html>`;
