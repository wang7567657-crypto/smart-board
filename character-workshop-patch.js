// 局部修補：生字練習工坊
// 第一階段：播放展示、強化仿寫、部件拼貼。採用補丁方式，不改 index.html 主體。
(function () {
  const STYLE_ID = 'character-workshop-style';
  const MODAL_ID = 'character-workshop-modal';
  const BTN_ID = 'tab-workshop';

  const BUILTIN_PARTS = {
    '銀': ['金', '艮'], '銅': ['金', '同'], '鋁': ['金', '呂'], '鐵': ['金', '𢦏'], '錢': ['金', '戔'],
    '明': ['日', '月'], '朋': ['月', '月'], '林': ['木', '木'], '森': ['木', '木', '木'],
    '好': ['女', '子'], '媽': ['女', '馬'], '妹': ['女', '未'], '姐': ['女', '且'],
    '休': ['亻', '木'], '你': ['亻', '爾'], '他': ['亻', '也'], '們': ['亻', '門'],
    '河': ['氵', '可'], '海': ['氵', '每'], '清': ['氵', '青'], '湖': ['氵', '胡'],
    '想': ['相', '心'], '思': ['田', '心'], '忘': ['亡', '心'], '息': ['自', '心'],
    '花': ['艹', '化'], '草': ['艹', '早'], '苗': ['艹', '田'], '菜': ['艹', '采'],
    '晴': ['日', '青'], '時': ['日', '寺'], '晚': ['日', '免'], '星': ['日', '生'],
    '問': ['門', '口'], '間': ['門', '日'], '開': ['門', '幵'], '閃': ['門', '人'],
    '跑': ['足', '包'], '跳': ['足', '兆'], '路': ['足', '各'], '跟': ['足', '艮'],
    '請': ['言', '青'], '說': ['言', '兌'], '話': ['言', '舌'], '語': ['言', '吾'],
    '奶': ['女', '乃'], '娃': ['女', '圭'], '孩': ['子', '亥'], '校': ['木', '交']
  };

  let activeChar = '';
  let activeMode = 'parts';
  let demoStep = 0;
  let placedParts = [];
  let selectedPart = null;
  let drawState = { drawing: false, color: '#2563eb', size: 8, showModel: true };

  function el(id) { return document.getElementById(id); }

  function installStyle() {
    if (el(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #${MODAL_ID}{position:fixed;inset:0;background:rgba(15,23,42,.78);backdrop-filter:blur(6px);z-index:999998;display:none;align-items:center;justify-content:center;padding:18px;box-sizing:border-box;}
      .cw-shell{width:min(1180px,96vw);height:min(760px,92vh);background:#f8fafc;border-radius:28px;box-shadow:0 24px 80px rgba(0,0,0,.35);display:grid;grid-template-columns:96px 1fr 280px;gap:14px;padding:14px;box-sizing:border-box;font-family:'Microsoft JhengHei',sans-serif;}
      .cw-left,.cw-right,.cw-main{background:white;border:1px solid #e2e8f0;border-radius:22px;box-shadow:0 8px 24px rgba(15,23,42,.08);overflow:hidden;}
      .cw-left{display:flex;flex-direction:column;align-items:center;gap:8px;padding:12px;overflow-y:auto;}
      .cw-char-btn{width:62px;height:62px;border:2px solid #e2e8f0;background:#fff;border-radius:16px;font-size:30px;font-weight:900;color:#334155;box-shadow:0 2px 8px rgba(15,23,42,.1);cursor:pointer;font-family:'Kaiti TC','BiauKai','DFKai-SB',serif;}
      .cw-char-btn.active{background:#2563eb;color:white;border-color:#2563eb;transform:scale(1.04);}
      .cw-main{display:flex;flex-direction:column;min-width:0;}
      .cw-top{height:58px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #e2e8f0;padding:0 14px;gap:10px;}
      .cw-tabs{display:flex;gap:6px;align-items:center;overflow-x:auto;}
      .cw-tab{border:0;background:#f1f5f9;color:#475569;border-radius:12px;padding:10px 12px;font-weight:900;cursor:pointer;white-space:nowrap;}
      .cw-tab.active{background:#0f766e;color:white;}
      .cw-close{border:0;background:#fee2e2;color:#be123c;border-radius:14px;font-weight:900;padding:10px 14px;cursor:pointer;}
      .cw-content{flex:1;position:relative;padding:18px;overflow:auto;}
      .cw-title{font-size:20px;font-weight:900;color:#0f172a;margin-bottom:10px;}
      .cw-gridbox{position:relative;width:min(420px,88vw);aspect-ratio:1/1;background:#fff;border:4px solid #1e293b;border-radius:14px;margin:0 auto;overflow:hidden;display:flex;align-items:center;justify-content:center;}
      .cw-gridbox:before{content:'';position:absolute;inset:0;background:linear-gradient(45deg,transparent 49.4%,#cbd5e1 49.7%,#cbd5e1 50.3%,transparent 50.6%),linear-gradient(-45deg,transparent 49.4%,#cbd5e1 49.7%,#cbd5e1 50.3%,transparent 50.6%),linear-gradient(90deg,transparent 49.5%,#cbd5e1 49.8%,#cbd5e1 50.2%,transparent 50.5%),linear-gradient(0deg,transparent 49.5%,#cbd5e1 49.8%,#cbd5e1 50.2%,transparent 50.5%);opacity:.75;pointer-events:none;}
      .cw-big-char{position:relative;z-index:1;font-family:'Kaiti TC','BiauKai','DFKai-SB',serif;font-size:190px;font-weight:900;line-height:1;color:#1d4ed8;}
      .cw-faint{opacity:.18;color:#0f172a;}
      .cw-part-area{display:grid;grid-template-columns:1fr 1fr;gap:18px;align-items:start;}
      .cw-bank,.cw-slots{background:#f8fafc;border:2px dashed #cbd5e1;border-radius:18px;padding:14px;min-height:120px;display:flex;flex-wrap:wrap;gap:10px;align-items:center;justify-content:center;}
      .cw-part-card,.cw-slot{min-width:86px;height:72px;border-radius:16px;border:2px solid #e2e8f0;background:#fff;font-size:36px;font-weight:900;font-family:'Kaiti TC','BiauKai','DFKai-SB',serif;display:flex;align-items:center;justify-content:center;box-shadow:0 3px 10px rgba(15,23,42,.12);cursor:pointer;}
      .cw-part-card.selected{border-color:#f59e0b;background:#fffbeb;transform:scale(1.06);}
      .cw-slot{border-style:dashed;color:#94a3b8;}
      .cw-slot.filled{border-style:solid;color:#0f172a;background:#ecfeff;border-color:#06b6d4;}
      .cw-actions{display:flex;flex-wrap:wrap;gap:10px;justify-content:center;margin-top:14px;}
      .cw-btn{border:0;border-radius:14px;padding:11px 16px;font-weight:900;cursor:pointer;background:#e2e8f0;color:#0f172a;}
      .cw-btn.primary{background:#2563eb;color:#fff;}.cw-btn.good{background:#10b981;color:#fff;}.cw-btn.warn{background:#f59e0b;color:#fff;}.cw-btn.rose{background:#f43f5e;color:#fff;}
      .cw-right{padding:14px;display:flex;flex-direction:column;gap:12px;}
      .cw-ref-title{font-weight:900;color:#0f172a;display:flex;align-items:center;justify-content:space-between;}
      .cw-mini-grid{position:relative;aspect-ratio:1/1;background:white;border:3px solid #e2e8f0;border-radius:18px;display:flex;align-items:center;justify-content:center;overflow:hidden;}
      .cw-mini-grid:before{content:'';position:absolute;inset:0;background:linear-gradient(90deg,transparent 49.5%,#e2e8f0 50%,transparent 50.5%),linear-gradient(0deg,transparent 49.5%,#e2e8f0 50%,transparent 50.5%);}
      .cw-mini-grid span{position:relative;z-index:1;font-size:138px;font-family:'Kaiti TC','BiauKai','DFKai-SB',serif;font-weight:900;color:#2563eb;}
      .cw-part-list{display:flex;flex-wrap:wrap;gap:8px}.cw-chip{background:#ccfbf1;color:#0f766e;border-radius:12px;padding:8px 10px;font-weight:900;font-size:20px;}
      .cw-input{width:100%;box-sizing:border-box;border:2px solid #cbd5e1;border-radius:14px;padding:10px;font-weight:800;outline:none;}
      .cw-draw-tools{display:flex;flex-wrap:wrap;gap:10px;align-items:center;justify-content:center;margin-top:12px;}
      .cw-color{width:38px;height:38px;border-radius:999px;border:3px solid #fff;box-shadow:0 0 0 2px #cbd5e1;cursor:pointer;}
      .cw-canvas{position:absolute;inset:0;z-index:3;touch-action:none;}
      @media(max-width:900px){.cw-shell{grid-template-columns:74px 1fr;height:94vh}.cw-right{display:none}.cw-char-btn{width:50px;height:50px;font-size:26px}.cw-part-area{grid-template-columns:1fr}.cw-top{height:auto;min-height:58px;align-items:flex-start;padding-top:10px;padding-bottom:10px}.cw-tabs{flex-wrap:wrap}.cw-big-char{font-size:150px}}
    `;
    document.head.appendChild(style);
  }

  function currentChars() {
    if (Array.isArray(window.state?.currentVocab) && window.state.currentVocab.length) return window.state.currentVocab.filter(Boolean);
    const p = window.state?.selPub, g = window.state?.selGrade, s = window.state?.selSem, l = window.state?.selLes;
    const fromDb = window.state?.db?.[p]?.[g]?.[s]?.[l];
    return Array.isArray(fromDb) ? fromDb.filter(Boolean) : [];
  }

  function getParts(ch) {
    try {
      const saved = localStorage.getItem('cw_parts_' + ch);
      if (saved) {
        const arr = JSON.parse(saved);
        if (Array.isArray(arr) && arr.length) return arr;
      }
    } catch(e) {}
    return BUILTIN_PARTS[ch] || [ch];
  }

  function setParts(ch, parts) {
    try { localStorage.setItem('cw_parts_' + ch, JSON.stringify(parts)); } catch(e) {}
  }

  function ensureModal() {
    installStyle();
    if (el(MODAL_ID)) return;
    const modal = document.createElement('div');
    modal.id = MODAL_ID;
    modal.innerHTML = `
      <div class="cw-shell">
        <div class="cw-left" id="cw-char-list"></div>
        <div class="cw-main">
          <div class="cw-top">
            <div class="cw-tabs">
              <button class="cw-tab" data-mode="demo">▶ 播放展示</button>
              <button class="cw-tab" data-mode="trace">✎ 仿寫練習</button>
              <button class="cw-tab" data-mode="parts">🧩 部件拼貼</button>
            </div>
            <button class="cw-close" id="cw-close-btn">關閉</button>
          </div>
          <div class="cw-content" id="cw-content"></div>
        </div>
        <div class="cw-right">
          <div class="cw-ref-title">正確字形 <span id="cw-active-title"></span></div>
          <div class="cw-mini-grid"><span id="cw-ref-char"></span></div>
          <div class="cw-ref-title">部件資料</div>
          <div class="cw-part-list" id="cw-right-parts"></div>
          <input class="cw-input" id="cw-parts-input" placeholder="可輸入部件，例如：金 艮">
          <button class="cw-btn primary" id="cw-save-parts-btn">儲存部件</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    el('cw-close-btn').addEventListener('click', closeWorkshop);
    modal.querySelectorAll('[data-mode]').forEach(btn => btn.addEventListener('click', () => switchMode(btn.dataset.mode)));
    el('cw-save-parts-btn').addEventListener('click', () => {
      const parts = el('cw-parts-input').value.trim().split(/\s+/).filter(Boolean);
      if (!activeChar || !parts.length) return alert('請輸入部件，例如：金 艮');
      setParts(activeChar, parts);
      renderAll();
    });
  }

  function addOpenButton() {
    if (el(BTN_ID)) return;
    const tabs = el('board-tabs');
    if (!tabs) return;
    const btn = document.createElement('button');
    btn.id = BTN_ID;
    btn.className = 'px-4 py-1.5 rounded-full text-sm font-bold transition-all text-slate-300 hover:text-white hover:bg-slate-700';
    btn.textContent = '練習工坊';
    btn.addEventListener('click', openWorkshop);
    tabs.appendChild(btn);
  }

  function openWorkshop() {
    ensureModal();
    const chars = currentChars();
    activeChar = window.state?.activeChar || activeChar || chars[0] || '';
    if (!activeChar) {
      alert('請先載入課文並選擇一個生字。');
      return;
    }
    el(MODAL_ID).style.display = 'flex';
    renderAll();
  }

  function closeWorkshop() { if (el(MODAL_ID)) el(MODAL_ID).style.display = 'none'; }

  function switchMode(mode) {
    activeMode = mode;
    demoStep = 0;
    placedParts = [];
    selectedPart = null;
    renderAll();
  }

  function renderAll() {
    ensureModal();
    renderCharList();
    renderTabs();
    renderRight();
    if (activeMode === 'demo') renderDemo();
    if (activeMode === 'trace') renderTrace();
    if (activeMode === 'parts') renderParts();
  }

  function renderCharList() {
    const list = el('cw-char-list');
    const chars = currentChars();
    list.innerHTML = chars.length ? chars.map(ch => `<button class="cw-char-btn ${ch===activeChar?'active':''}" data-char="${ch}">${ch}</button>`).join('') : '<div style="font-size:12px;color:#64748b;text-align:center;font-weight:900;">請先載入課文</div>';
    list.querySelectorAll('[data-char]').forEach(btn => btn.addEventListener('click', () => { activeChar = btn.dataset.char; demoStep = 0; placedParts = []; selectedPart = null; renderAll(); }));
  }

  function renderTabs() {
    document.querySelectorAll(`#${MODAL_ID} [data-mode]`).forEach(btn => btn.classList.toggle('active', btn.dataset.mode === activeMode));
  }

  function renderRight() {
    const parts = getParts(activeChar);
    el('cw-active-title').textContent = activeChar;
    el('cw-ref-char').textContent = activeChar;
    el('cw-right-parts').innerHTML = parts.map(p => `<span class="cw-chip">${p}</span>`).join('');
    el('cw-parts-input').value = parts.join(' ');
  }

  function coloredParts(parts, upto) {
    const colors = ['#2563eb','#22c55e','#f59e0b','#ef4444','#8b5cf6'];
    return `<div style="display:flex;gap:4px;align-items:center;justify-content:center;flex-wrap:wrap;">${parts.map((p,i)=>`<span style="font-size:130px;font-family:'Kaiti TC','BiauKai','DFKai-SB',serif;font-weight:900;color:${i<=upto?colors[i%colors.length]:'#cbd5e1'};opacity:${i<=upto?1:.35};">${p}</span>`).join('')}</div>`;
  }

  function renderDemo() {
    const parts = getParts(activeChar);
    const content = el('cw-content');
    content.innerHTML = `
      <div class="cw-title">播放展示：觀察「${activeChar}」由哪些部件組成</div>
      <div class="cw-gridbox" id="cw-demo-box">${coloredParts(parts, demoStep)}</div>
      <div class="cw-actions">
        <button class="cw-btn" id="cw-demo-prev">上一步</button>
        <button class="cw-btn primary" id="cw-demo-play">播放</button>
        <button class="cw-btn" id="cw-demo-next">下一步</button>
        <button class="cw-btn warn" id="cw-demo-full">顯示完整字</button>
      </div>
    `;
    el('cw-demo-prev').onclick = () => { demoStep = Math.max(0, demoStep - 1); renderDemo(); };
    el('cw-demo-next').onclick = () => { demoStep = Math.min(parts.length - 1, demoStep + 1); renderDemo(); };
    el('cw-demo-full').onclick = () => { el('cw-demo-box').innerHTML = `<span class="cw-big-char">${activeChar}</span>`; };
    el('cw-demo-play').onclick = () => {
      demoStep = 0; renderDemo();
      let i = 0;
      const timer = setInterval(() => {
        i++;
        demoStep = Math.min(parts.length - 1, i);
        renderDemo();
        if (i >= parts.length - 1) clearInterval(timer);
      }, 750);
    };
  }

  function renderTrace() {
    const content = el('cw-content');
    content.innerHTML = `
      <div class="cw-title">仿寫練習：照著淡字描寫「${activeChar}」</div>
      <div class="cw-gridbox" id="cw-trace-box">
        <div class="cw-big-char cw-faint" id="cw-model-char">${activeChar}</div>
        <canvas class="cw-canvas" id="cw-draw-canvas"></canvas>
      </div>
      <div class="cw-draw-tools">
        <button class="cw-color" data-color="#2563eb" style="background:#2563eb"></button>
        <button class="cw-color" data-color="#ef4444" style="background:#ef4444"></button>
        <button class="cw-color" data-color="#f59e0b" style="background:#f59e0b"></button>
        <button class="cw-color" data-color="#22c55e" style="background:#22c55e"></button>
        <label style="font-weight:900;color:#475569;">粗細 <input id="cw-size" type="range" min="3" max="22" value="${drawState.size}"></label>
        <button class="cw-btn" id="cw-toggle-model">顯示/隱藏淡字</button>
        <button class="cw-btn rose" id="cw-clear-draw">清除</button>
      </div>
    `;
    setupCanvas();
    content.querySelectorAll('[data-color]').forEach(b => b.onclick = () => drawState.color = b.dataset.color);
    el('cw-size').oninput = e => drawState.size = parseInt(e.target.value, 10);
    el('cw-clear-draw').onclick = () => { const c = el('cw-draw-canvas'); c.getContext('2d').clearRect(0,0,c.width,c.height); };
    el('cw-toggle-model').onclick = () => { drawState.showModel = !drawState.showModel; el('cw-model-char').style.display = drawState.showModel ? 'block' : 'none'; };
  }

  function setupCanvas() {
    const canvas = el('cw-draw-canvas');
    const box = el('cw-trace-box');
    const ctx = canvas.getContext('2d');
    const resize = () => { canvas.width = box.clientWidth; canvas.height = box.clientHeight; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; };
    resize();
    const pos = e => { const r = canvas.getBoundingClientRect(); const x = (e.touches?.[0]?.clientX ?? e.clientX) - r.left; const y = (e.touches?.[0]?.clientY ?? e.clientY) - r.top; return {x,y}; };
    const start = e => { e.preventDefault(); drawState.drawing = true; const p = pos(e); ctx.beginPath(); ctx.moveTo(p.x,p.y); };
    const move = e => { if (!drawState.drawing) return; e.preventDefault(); const p = pos(e); ctx.strokeStyle = drawState.color; ctx.lineWidth = drawState.size; ctx.lineTo(p.x,p.y); ctx.stroke(); };
    const end = e => { if (!drawState.drawing) return; e.preventDefault(); drawState.drawing = false; };
    canvas.onmousedown = start; canvas.onmousemove = move; canvas.onmouseup = end; canvas.onmouseout = end;
    canvas.ontouchstart = start; canvas.ontouchmove = move; canvas.ontouchend = end;
  }

  function renderParts() {
    const parts = getParts(activeChar);
    if (!placedParts.length || placedParts.length !== parts.length) placedParts = Array(parts.length).fill('');
    const content = el('cw-content');
    content.innerHTML = `
      <div class="cw-title">部件拼貼：把「${activeChar}」的部件拼回正確順序</div>
      <div class="cw-part-area">
        <div>
          <div style="font-weight:900;color:#475569;margin-bottom:8px;text-align:center;">部件銀行：先點一張卡</div>
          <div class="cw-bank" id="cw-part-bank">${shuffle(parts).map(p=>`<button class="cw-part-card" data-part="${p}">${p}</button>`).join('')}</div>
        </div>
        <div>
          <div style="font-weight:900;color:#475569;margin-bottom:8px;text-align:center;">拼貼區：再點格子放入</div>
          <div class="cw-slots" id="cw-part-slots">${parts.map((p,i)=>`<button class="cw-slot ${placedParts[i]?'filled':''}" data-slot="${i}">${placedParts[i] || (i+1)}</button>`).join('')}</div>
        </div>
      </div>
      <div class="cw-actions">
        <button class="cw-btn good" id="cw-check-parts">檢查答案</button>
        <button class="cw-btn" id="cw-reset-parts">重新開始</button>
        <button class="cw-btn primary" id="cw-show-answer">看答案</button>
      </div>
    `;
    content.querySelectorAll('[data-part]').forEach(btn => btn.onclick = () => {
      selectedPart = btn.dataset.part;
      content.querySelectorAll('[data-part]').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
    });
    content.querySelectorAll('[data-slot]').forEach(slot => slot.onclick = () => {
      const i = parseInt(slot.dataset.slot, 10);
      if (selectedPart) { placedParts[i] = selectedPart; selectedPart = null; renderParts(); }
      else if (placedParts[i]) { placedParts[i] = ''; renderParts(); }
    });
    el('cw-reset-parts').onclick = () => { placedParts = Array(parts.length).fill(''); selectedPart = null; renderParts(); };
    el('cw-show-answer').onclick = () => { placedParts = [...parts]; renderParts(); };
    el('cw-check-parts').onclick = () => {
      const ok = parts.every((p,i)=>placedParts[i]===p);
      alert(ok ? '太棒了，部件拼對了！' : '還差一點，再看看正確字形的位置。');
    };
  }

  function patchSwitchView() {
    if (window.__cwSwitchPatched || typeof window.switchView !== 'function') return;
    const old = window.switchView;
    window.switchView = function(mode) {
      const r = old.apply(this, arguments);
      setTimeout(addOpenButton, 50);
      return r;
    };
    window.__cwSwitchPatched = true;
  }

  function apply() { installStyle(); ensureModal(); addOpenButton(); patchSwitchView(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', apply); else apply();
  window.addEventListener('load', apply);
  setTimeout(apply, 500);
  setTimeout(apply, 1500);
})();
