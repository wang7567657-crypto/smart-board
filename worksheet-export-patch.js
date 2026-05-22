// 局部修補：教材編輯站匯出功能：筆順作業單、聽寫作業單、線上改錯題
// 更新：學習單開啟後會顯示預覽工具列，可列印、關閉、回到主畫面。
(function () {
  const STYLE_ID = 'worksheet-export-patch-style';
  const ROOT_ID = 'worksheet-print-root';

  function el(id) { return document.getElementById(id); }

  function meta() {
    return {
      pub: el('sel-pub')?.value || '出版社',
      grade: el('sel-grade')?.value || '年級',
      sem: el('sel-sem')?.value || '學期',
      lesson: el('sel-les')?.value || '課次'
    };
  }

  function parseTsv(text) {
    return String(text || '').split(/\r?\n/).map(x => x.trim()).filter(Boolean).map(line => line.split('\t').map(c => c.trim()));
  }

  function primaryRows() {
    return parseTsv(el('primary-tsv-input')?.value || '').map(c => ({
      char: c[0] || '', zhuyin: c[1] || '', phrase: c[2] || '', phraseZhuyin: c[3] || '', meaning: c[4] || '', sentence: c[5] || ''
    })).filter(r => r.char);
  }

  function extraRows() {
    return parseTsv(el('extra-tsv-input')?.value || '').map(c => ({
      char: c[0] || '', phrase: c[1] || '', zhuyin: c[2] || '', meaning: c[3] || '', sentence: c[4] || ''
    })).filter(r => r.char || r.phrase);
  }

  function activeChars() {
    const rows = primaryRows();
    if (rows.length) return rows.map(r => r.char).filter(Boolean);
    if (Array.isArray(window.state?.currentVocab) && window.state.currentVocab.length) return window.state.currentVocab;
    return [];
  }

  function installStyle() {
    if (el(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #${ROOT_ID}{position:fixed;inset:0;z-index:999999;background:#e2e8f0;overflow:auto;padding:72px 16px 28px;box-sizing:border-box;}
      .ws-toolbar{position:fixed;top:0;left:0;right:0;height:56px;background:#0f172a;color:#fff;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:0 16px;z-index:1000000;box-shadow:0 4px 18px rgba(15,23,42,.35);font-family:'Microsoft JhengHei',sans-serif;}
      .ws-toolbar-title{font-weight:900;font-size:16px;letter-spacing:.08em;}
      .ws-toolbar-actions{display:flex;gap:8px;align-items:center;}
      .ws-toolbar button{border:0;border-radius:10px;padding:9px 14px;font-weight:900;cursor:pointer;}
      .ws-print-btn{background:#2563eb;color:#fff;}
      .ws-close-btn{background:#f1f5f9;color:#0f172a;}
      .ws-sheet{font-family:'Noto Sans TC','Microsoft JhengHei',sans-serif;color:#111827;width:210mm;min-height:297mm;margin:0 auto;padding:12mm;background:#fff;box-sizing:border-box;box-shadow:0 8px 30px rgba(15,23,42,.22);}
      .ws-title{text-align:center;font-size:24px;font-weight:900;margin-bottom:8px;}
      .ws-meta{display:flex;justify-content:space-between;gap:12px;font-size:14px;margin-bottom:14px;}
      .ws-section{font-weight:900;font-size:18px;margin:16px 0 8px;border-left:6px solid #2563eb;padding-left:8px;}
      .ws-table{width:100%;border-collapse:collapse;table-layout:fixed;margin-bottom:12px;}
      .ws-table th,.ws-table td{border:1.5px solid #475569;padding:8px;vertical-align:middle;word-break:break-word;}
      .ws-table th{background:#eff6ff;font-weight:900;}
      .ws-char{font-family:'Kaiti TC','BiauKai','DFKai-SB',serif;font-size:42px;text-align:center;font-weight:900;}
      .ws-practice{height:58px;background-image:linear-gradient(#d1d5db 1px,transparent 1px),linear-gradient(90deg,#d1d5db 1px,transparent 1px);background-size:50% 50%;}
      .ws-line{border-bottom:1.5px solid #94a3b8;height:28px;}
      @media print{body *{visibility:hidden!important;}#${ROOT_ID},#${ROOT_ID} *{visibility:visible!important;}#${ROOT_ID}{position:absolute;left:0;top:0;width:100%;inset:auto;background:#fff;overflow:visible;padding:0;}.ws-toolbar,.ws-no-print{display:none!important;}.ws-sheet{width:210mm;min-height:297mm;margin:0;box-shadow:none;}}
    `;
    document.head.appendChild(style);
  }

  function root() {
    let r = el(ROOT_ID);
    if (!r) {
      r = document.createElement('div');
      r.id = ROOT_ID;
      r.style.display = 'none';
      document.body.appendChild(r);
    }
    return r;
  }

  function closeWorksheet() {
    const r = el(ROOT_ID);
    if (!r) return;
    r.innerHTML = '';
    r.style.display = 'none';
  }

  function header(title) {
    const m = meta();
    return `<div class="ws-title">${title}</div><div class="ws-meta"><div>${m.pub}　${m.grade}　${m.sem}　${m.lesson}</div><div>姓名：____________　座號：______</div></div>`;
  }

  function show(title, html) {
    installStyle();
    const r = root();
    r.innerHTML = `
      <div class="ws-toolbar ws-no-print">
        <div class="ws-toolbar-title">${title}預覽</div>
        <div class="ws-toolbar-actions">
          <button type="button" class="ws-print-btn" id="ws-print-now-btn">列印 / 另存 PDF</button>
          <button type="button" class="ws-close-btn" id="ws-close-now-btn">關閉，回到教材編輯</button>
        </div>
      </div>
      ${html}
    `;
    r.style.display = 'block';
    const closeBtn = el('ws-close-now-btn');
    const printBtn = el('ws-print-now-btn');
    if (closeBtn) closeBtn.addEventListener('click', closeWorksheet);
    if (printBtn) printBtn.addEventListener('click', () => window.print());
  }

  function strokeWorksheet() {
    const chars = activeChars();
    if (!chars.length) { alert('請先載入課文，或在「生字基礎教材」中產生內容。'); return; }
    const rows = chars.map((ch, i) => `<tr><td style="width:10%;text-align:center;font-weight:900;">${i+1}</td><td style="width:18%;" class="ws-char">${ch}</td><td class="ws-practice"></td><td class="ws-practice"></td><td class="ws-practice"></td><td class="ws-practice"></td></tr>`).join('');
    show('筆順作業單', `<div class="ws-sheet">${header('筆順作業單')}<div class="ws-section">一、看清楚生字後，照著筆順練習書寫。</div><table class="ws-table"><thead><tr><th>題號</th><th>生字</th><th>練習1</th><th>練習2</th><th>練習3</th><th>練習4</th></tr></thead><tbody>${rows}</tbody></table></div>`);
  }

  function dictationWorksheet() {
    const rows = primaryRows();
    if (!rows.length) { alert('請先在「生字基礎教材」中 AI 生成或貼上 TSV 內容。'); return; }
    const body = rows.map((r, i) => `<tr><td style="width:8%;text-align:center;font-weight:900;">${i+1}</td><td style="width:18%;font-size:22px;text-align:center;font-weight:900;">${r.zhuyin || '　'}</td><td style="width:18%;"><div class="ws-line"></div></td><td style="width:22%;font-size:18px;text-align:center;">${r.phraseZhuyin || '　'}</td><td style="width:34%;"><div class="ws-line"></div></td></tr>`).join('');
    show('聽寫作業單', `<div class="ws-sheet">${header('聽寫作業單')}<div class="ws-section">一、聽老師唸注音或語詞，寫出正確的國字。</div><table class="ws-table"><thead><tr><th>題號</th><th>生字注音</th><th>寫出生字</th><th>語詞注音</th><th>寫出語詞</th></tr></thead><tbody>${body}</tbody></table></div>`);
  }

  function correctionWorksheet() {
    const p = primaryRows();
    const e = extraRows();
    const rows = p.length ? p : e;
    if (!rows.length) { alert('請先在教材編輯站中 AI 生成或貼上教材內容。'); return; }
    const body = rows.slice(0, 12).map((r, i) => {
      const phrase = r.phrase || r.char || '（語詞）';
      const sentence = r.sentence || `請用「${phrase}」造一個正確的句子。`;
      return `<tr><td style="width:8%;text-align:center;font-weight:900;">${i+1}</td><td style="width:52%;">${sentence}</td><td style="width:20%;">錯字：____________</td><td style="width:20%;">改正：____________</td></tr>`;
    }).join('');
    show('線上改錯題', `<div class="ws-sheet">${header('線上改錯題')}<div class="ws-section">一、讀一讀句子，找出需要注意或可能寫錯的字詞，並寫出改正答案。</div><table class="ws-table"><thead><tr><th>題號</th><th>句子</th><th>錯字</th><th>改正</th></tr></thead><tbody>${body}</tbody></table></div>`);
  }

  function bind() {
    const s = el('stroke-order-worksheet-btn');
    const w = el('worksheet-btn');
    const c = el('correction-worksheet-btn');
    if (s && !s.dataset.wsBound) { s.dataset.wsBound = '1'; s.addEventListener('click', strokeWorksheet); }
    if (w && !w.dataset.wsBound) { w.dataset.wsBound = '1'; w.addEventListener('click', dictationWorksheet); }
    if (c && !c.dataset.wsBound) { c.dataset.wsBound = '1'; c.addEventListener('click', correctionWorksheet); }
  }

  window.closeWorksheetPreview = closeWorksheet;

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind); else bind();
  window.addEventListener('load', bind);
  setTimeout(bind, 300);
  setTimeout(bind, 1200);
})();
