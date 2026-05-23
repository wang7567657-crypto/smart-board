// 生字練習工坊視覺修補：仿寫練習改成彩色範字，並在第一筆起點加紅色粗體提示點。
(function () {
  const DATA_CDN = 'https://cdn.jsdelivr.net/npm/hanzi-writer-data@2.0.1/';
  const STYLE_ID = 'cw-trace-visual-style';
  const COLORS = ['#2563eb', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6'];

  const BUILTIN_SPLITS = {
    '銀': [[0,1,2,3,4,5,6,7],[8,9,10,11,12,13]],
    '銅': [[0,1,2,3,4,5,6,7],[8,9,10,11,12,13]],
    '鋁': [[0,1,2,3,4,5,6,7],[8,9,10,11,12,13]],
    '錢': [[0,1,2,3,4,5,6,7],[8,9,10,11,12,13,14,15]],
    '明': [[0,1,2,3],[4,5,6,7]],
    '好': [[0,1,2],[3,4,5]],
    '林': [[0,1,2,3],[4,5,6,7]],
    '清': [[0,1,2],[3,4,5,6,7,8,9,10,11]],
    '請': [[0,1,2,3,4,5,6],[7,8,9,10,11,12,13,14]],
    '說': [[0,1,2,3,4,5,6],[7,8,9,10,11,12,13]],
    '跟': [[0,1,2,3,4,5,6],[7,8,9,10,11,12]]
  };

  let lastKey = '';
  let applying = false;

  function el(id) { return document.getElementById(id); }

  function installStyle() {
    if (el(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .cw-start-dot { filter: drop-shadow(0 2px 4px rgba(220, 38, 38, .45)); }
      .cw-start-ring { animation: cwStartPulse 1.15s ease-in-out infinite; transform-origin: center; }
      @keyframes cwStartPulse { 0%,100%{opacity:.25} 50%{opacity:.75} }
      #cw-start-tip {
        position:absolute;left:50%;bottom:18px;transform:translateX(-50%);z-index:8;
        background:#fff1f2;border:1px solid #fecdd3;color:#e11d48;
        border-radius:14px;padding:9px 14px;font-weight:900;font-size:14px;
        box-shadow:0 4px 12px rgba(225,29,72,.12);
      }
    `;
    document.head.appendChild(style);
  }

  function getActiveChar() {
    return el('cw-active')?.textContent?.trim() || '';
  }

  function parseGroups(text, count) {
    const groups = String(text || '').split('/').map(s => s.trim()).filter(Boolean).map(seg => {
      const m = seg.match(/^(\d+)(?:\s*-\s*(\d+))?$/);
      if (!m) return null;
      const a = parseInt(m[1], 10);
      const b = parseInt(m[2] || m[1], 10);
      if (a < 1 || b < a || b > count) return null;
      return Array.from({ length: b - a + 1 }, (_, i) => a - 1 + i);
    });
    if (!groups.length || groups.some(g => !g)) return null;
    return groups;
  }

  function getGroups(ch, count) {
    const fromInput = parseGroups(el('cw-split-input')?.value || '', count);
    if (fromInput) return fromInput;

    try {
      const saved = JSON.parse(localStorage.getItem('cw_groups_' + ch) || 'null');
      if (Array.isArray(saved) && saved.flat().length === count) return saved;
    } catch (e) {}

    if (BUILTIN_SPLITS[ch]) return BUILTIN_SPLITS[ch].filter(g => g.every(i => i < count));

    const groupCount = count <= 6 ? 2 : count <= 12 ? 3 : 4;
    const groups = [];
    for (let i = 0; i < groupCount; i++) {
      const a = Math.floor(i * count / groupCount);
      const b = Math.floor((i + 1) * count / groupCount);
      groups.push(Array.from({ length: b - a }, (_, k) => a + k));
    }
    return groups;
  }

  async function loadData(ch) {
    const res = await fetch(DATA_CDN + encodeURIComponent(ch) + '.json', { cache: 'force-cache' });
    if (!res.ok) throw new Error('stroke data not found');
    return res.json();
  }

  function coloredTraceSvg(data, ch) {
    const strokes = data.strokes || [];
    const medians = data.medians || [];
    const groups = getGroups(ch, strokes.length);
    const groupOf = new Map();
    groups.forEach((g, gi) => g.forEach(idx => groupOf.set(idx, gi)));

    const paths = strokes.map((d, idx) => {
      const color = COLORS[(groupOf.get(idx) || 0) % COLORS.length];
      return `<path d="${d}" fill="${color}" opacity="0.25"/>`;
    }).join('');

    const firstPoint = medians?.[0]?.[0];
    const startDot = firstPoint
      ? `<circle class="cw-start-ring" cx="${firstPoint[0]}" cy="${firstPoint[1]}" r="42" fill="#ef4444" opacity=".28"/>
         <circle class="cw-start-dot" cx="${firstPoint[0]}" cy="${firstPoint[1]}" r="24" fill="#ef4444" stroke="#ffffff" stroke-width="8"/>`
      : '';

    return `<svg class="cw-svg" viewBox="0 0 1024 1024" aria-label="彩色仿寫範字">
      <g transform="translate(0,900) scale(1,-1)">${paths}${startDot}</g>
    </svg>`;
  }

  async function applyTraceVisual() {
    if (applying) return;

    const modal = el('cw-fix-modal');
    const model = el('cw-model');
    const grid = el('cw-grid');
    const canvas = el('cw-canvas');
    const ch = getActiveChar();
    const title = document.querySelector('#cw-content .cw-title')?.textContent || '';

    if (!modal || modal.style.display === 'none' || !model || !grid || !canvas || !ch || !title.includes('仿寫')) return;

    const key = ch + '|' + (el('cw-split-input')?.value || '');
    if (model.dataset.cwColoredTrace === key && el('cw-start-tip')) return;

    applying = true;
    try {
      installStyle();
      const data = await loadData(ch);
      model.innerHTML = coloredTraceSvg(data, ch);
      model.dataset.cwColoredTrace = key;

      if (!el('cw-start-tip')) {
        const tip = document.createElement('div');
        tip.id = 'cw-start-tip';
        tip.textContent = '● 請從紅色圓點開始下筆';
        grid.appendChild(tip);
      }
      lastKey = key;
    } catch (err) {
      console.warn('colored trace visual failed:', err);
    } finally {
      applying = false;
    }
  }

  function watch() {
    installStyle();
    applyTraceVisual();
  }

  const observer = new MutationObserver(() => setTimeout(watch, 60));
  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener('load', watch);
  setInterval(watch, 800);
})();
