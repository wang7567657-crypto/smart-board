// 正式樣板版：生字練習工坊
// 版面模仿參考圖：左側生字清單、上方功能頁籤、中央田字格、右側工具欄。
// 部件拼貼改為優先使用 HanziWriter 筆畫 SVG；讀取失敗時才退回文字部件。
(function () {
  const MODAL_ID = 'cw-fix-modal';
  const STYLE_ID = 'cw-fix-style';
  const BTN_ID = 'tab-workshop-fix';
  const DATA_CDN = 'https://cdn.jsdelivr.net/npm/hanzi-writer-data@2.0.1/';

  const TEXT_PARTS = {
    '銀':['金','艮'],'銅':['金','同'],'鋁':['金','呂'],'錢':['金','戔'],'鐵':['金','𢦏'],
    '明':['日','月'],'朋':['月','月'],'林':['木','木'],'森':['木','木','木'],
    '好':['女','子'],'媽':['女','馬'],'妹':['女','未'],'姐':['女','且'],
    '休':['亻','木'],'你':['亻','爾'],'他':['亻','也'],'們':['亻','門'],
    '河':['氵','可'],'海':['氵','每'],'清':['氵','青'],'湖':['氵','胡'],
    '晴':['日','青'],'時':['日','寺'],'晚':['日','免'],'星':['日','生'],
    '問':['門','口'],'間':['門','日'],'開':['門','幵'],'閃':['門','人'],
    '跑':['足','包'],'跳':['足','兆'],'路':['足','各'],'跟':['足','艮'],
    '請':['言','青'],'說':['言','兌'],'話':['言','舌'],'語':['言','吾'],
    '花':['艹','化'],'草':['艹','早'],'菜':['艹','采'],'苗':['艹','田'],
    '想':['相','心'],'思':['田','心'],'忘':['亡','心'],'息':['自','心']
  };

  let activeChar = '';
  let mode = 'demo';
  let charData = null;
  let pieces = [];
  let drag = null;
  let demoStep = 0;
  let demoTimer = null;
  let drawing = false;
  let penColor = '#ef4444';
  let penSize = 8;
  let showModel = true;

  function el(id){ return document.getElementById(id); }
  function clamp(n,min,max){ return Math.max(min, Math.min(max, n)); }

  function injectStyle(){
    if (el(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #${MODAL_ID}{position:fixed;inset:0;z-index:1000000;background:rgba(15,23,42,.78);backdrop-filter:blur(6px);display:none;align-items:center;justify-content:center;padding:16px;box-sizing:border-box;font-family:'Microsoft JhengHei',sans-serif;}
      .cw-shell{width:min(1240px,97vw);height:min(800px,94vh);background:#edf2f7;border-radius:28px;box-shadow:0 28px 90px rgba(0,0,0,.38);display:grid;grid-template-columns:92px 1fr 300px;gap:14px;padding:14px;box-sizing:border-box;}
      .cw-panel{background:#fff;border:1px solid #e2e8f0;border-radius:22px;box-shadow:0 10px 28px rgba(15,23,42,.09);overflow:hidden;}
      .cw-left{padding:10px;display:flex;flex-direction:column;gap:8px;align-items:center;overflow:auto;}
      .cw-char{width:60px;height:60px;border-radius:16px;border:2px solid #dbe4ef;background:white;color:#334155;font-size:31px;font-weight:900;font-family:'Kaiti TC','BiauKai','DFKai-SB',serif;cursor:pointer;box-shadow:0 3px 8px rgba(15,23,42,.1);}
      .cw-char.active{background:#2563eb;color:white;border-color:#2563eb;transform:scale(1.05);}
      .cw-main{display:flex;flex-direction:column;min-width:0;}
      .cw-top{min-height:62px;border-bottom:1px solid #e2e8f0;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 14px;box-sizing:border-box;}
      .cw-tabs{display:flex;gap:8px;flex-wrap:wrap;align-items:center;}
      .cw-tab{border:0;background:#f1f5f9;color:#475569;border-radius:14px;padding:10px 13px;font-weight:900;cursor:pointer;white-space:nowrap;}
      .cw-tab.active{background:#0f766e;color:white;box-shadow:0 4px 10px rgba(15,118,110,.22);}
      .cw-close{border:0;background:#fee2e2;color:#be123c;border-radius:14px;font-weight:900;padding:10px 14px;cursor:pointer;white-space:nowrap;}
      .cw-content{flex:1;position:relative;padding:18px;overflow:auto;background:#fbfdff;}
      .cw-title{font-size:21px;font-weight:900;color:#0f172a;margin-bottom:12px;display:flex;align-items:center;justify-content:space-between;gap:10px;}
      .cw-sub{font-size:14px;color:#64748b;font-weight:800;}
      .cw-board-wrap{display:flex;justify-content:center;align-items:center;min-height:470px;}
      .cw-grid{position:relative;width:min(470px,88vw);aspect-ratio:1/1;background:white;border:5px solid #1e293b;border-radius:18px;overflow:hidden;box-shadow:inset 0 0 0 1px #e2e8f0,0 10px 24px rgba(15,23,42,.12);touch-action:none;}
      .cw-grid:before{content:'';position:absolute;inset:0;background:linear-gradient(45deg,transparent 49.4%,#cbd5e1 49.8%,#cbd5e1 50.2%,transparent 50.6%),linear-gradient(-45deg,transparent 49.4%,#cbd5e1 49.8%,#cbd5e1 50.2%,transparent 50.6%),linear-gradient(90deg,transparent 49.5%,#cbd5e1 50%,transparent 50.5%),linear-gradient(0deg,transparent 49.5%,#cbd5e1 50%,transparent 50.5%);opacity:.78;pointer-events:none;}
      .cw-model-char,.cw-big-char{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-family:'Kaiti TC','BiauKai','DFKai-SB',serif;font-size:230px;font-weight:900;line-height:1;pointer-events:none;}
      .cw-model-char{color:#0f172a;opacity:.16;z-index:1}.cw-big-char{color:#2563eb;z-index:2;opacity:.95}
      .cw-canvas{position:absolute;inset:0;z-index:4;touch-action:none;}
      .cw-svg-full{position:absolute;inset:0;z-index:2;width:100%;height:100%;pointer-events:none;}
      .cw-target{position:absolute;border:3px dashed rgba(14,116,144,.45);background:rgba(236,254,255,.44);border-radius:20px;z-index:2;display:flex;align-items:center;justify-content:center;color:rgba(14,116,144,.45);font-weight:900;font-size:18px;pointer-events:none;}
      .cw-piece{position:absolute;min-width:96px;height:82px;border-radius:18px;border:3px solid #e2e8f0;background:#fff;display:flex;align-items:center;justify-content:center;box-shadow:0 8px 18px rgba(15,23,42,.18);cursor:grab;z-index:8;user-select:none;touch-action:none;overflow:hidden;}
      .cw-piece:active{cursor:grabbing}.cw-piece.bank{position:relative!important;left:auto!important;top:auto!important;transform:none!important;}
      .cw-piece svg{width:92px;height:78px;display:block}.cw-piece-text{font-size:40px;font-weight:900;font-family:'Kaiti TC','BiauKai','DFKai-SB',serif;color:#0f172a;}
      .cw-piece.good{border-color:#10b981;background:#ecfdf5}.cw-piece.bad{border-color:#f43f5e;background:#fff1f2}
      .cw-bank{display:flex;flex-wrap:wrap;gap:10px;justify-content:center;align-items:center;background:#f8fafc;border:2px dashed #cbd5e1;border-radius:18px;min-height:100px;padding:12px;margin-top:14px;}
      .cw-actions{display:flex;flex-wrap:wrap;gap:10px;justify-content:center;align-items:center;margin-top:14px;}
      .cw-btn{border:0;border-radius:14px;padding:11px 15px;font-weight:900;cursor:pointer;background:#e2e8f0;color:#0f172a;}
      .cw-btn.primary{background:#2563eb;color:white}.cw-btn.good{background:#10b981;color:white}.cw-btn.warn{background:#f59e0b;color:white}.cw-btn.rose{background:#f43f5e;color:white}
      .cw-right{padding:14px;display:flex;flex-direction:column;gap:13px;}
      .cw-right-title{font-weight:900;color:#0f172a;display:flex;align-items:center;justify-content:space-between;}
      .cw-mini{position:relative;aspect-ratio:1/1;background:white;border:3px solid #e2e8f0;border-radius:20px;overflow:hidden;display:flex;align-items:center;justify-content:center;}
      .cw-mini:before{content:'';position:absolute;inset:0;background:linear-gradient(90deg,transparent 49.5%,#e2e8f0 50%,transparent 50.5%),linear-gradient(0deg,transparent 49.5%,#e2e8f0 50%,transparent 50.5%);}
      .cw-mini span{position:relative;z-index:1;font-size:140px;font-family:'Kaiti TC','BiauKai','DFKai-SB',serif;font-weight:900;color:#2563eb;}
      .cw-chip-wrap{display:flex;flex-wrap:wrap;gap:8px}.cw-chip{background:#ccfbf1;color:#0f766e;border-radius:12px;padding:8px 10px;font-weight:900;font-size:20px;}
      .cw-input{width:100%;box-sizing:border-box;border:2px solid #cbd5e1;border-radius:14px;padding:10px;font-weight:800;outline:none;}
      .cw-tool-row{display:flex;flex-wrap:wrap;gap:9px;align-items:center;}.cw-color{width:36px;height:36px;border-radius:50%;border:3px solid white;box-shadow:0 0 0 2px #cbd5e1;cursor:pointer;}
      .cw-color.active{box-shadow:0 0 0 3px #0f766e;transform:scale(1.08);}.cw-range{width:100%;accent-color:#2563eb;}.cw-feedback{text-align:center;font-weight:900;min-height:26px;margin-top:10px;}
      .cw-loading{display:flex;align-items:center;justify-content:center;min-height:460px;color:#64748b;font-weight:900;font-size:20px;}
      @media(max-width:940px){.cw-shell{grid-template-columns:72px 1fr;height:94vh}.cw-right{display:none}.cw-char{width:52px;height:52px;font-size:27px}.cw-board-wrap{min-height:390px}.cw-model-char,.cw-big-char{font-size:180px}}
    `;
    document.head.appendChild(style);
  }

  function getChars(){
    if(Array.isArray(window.state?.currentVocab) && window.state.currentVocab.length) return window.state.currentVocab.filter(Boolean);
    return Array.from(document.querySelectorAll('#vocab-list button')).map(b=>b.textContent.trim()).filter(Boolean);
  }

  function getCurrentChar(){
    if(window.state?.activeChar) return window.state.activeChar;
    const active = document.querySelector('#vocab-list button.bg-indigo-600');
    if(active) return active.textContent.trim();
    const m = (el('current-char-info')?.textContent || '').match(/「(.+?)」/);
    return m ? m[1] : (getChars()[0] || '');
  }

  function getTextParts(c){
    try{
      const saved = localStorage.getItem('cw2_parts_' + c) || localStorage.getItem('cw_parts_' + c);
      if(saved){ const arr = JSON.parse(saved); if(Array.isArray(arr) && arr.length) return arr; }
    }catch(e){}
    return TEXT_PARTS[c] || [c];
  }

  function saveTextParts(c, parts){ try{ localStorage.setItem('cw2_parts_' + c, JSON.stringify(parts)); }catch(e){} }

  async function loadCharData(c){
    charData = null;
    try{
      const res = await fetch(DATA_CDN + encodeURIComponent(c) + '.json', {cache:'force-cache'});
      if(!res.ok) throw new Error('not found');
      const data = await res.json();
      if(Array.isArray(data.strokes) && data.strokes.length) charData = data;
    }catch(e){
      charData = null;
      console.warn('Hanzi stroke data failed, fallback to text parts:', c, e);
    }
  }

  function svgPaths(paths, color='#0f172a', opacity=1){
    return `<svg viewBox="0 0 1024 1024" aria-hidden="true"><g transform="translate(0,900) scale(1,-1)">${paths.map(d=>`<path d="${d}" fill="${color}" opacity="${opacity}"/>`).join('')}</g></svg>`;
  }

  function fullSvg(opacity=.95, color='#2563eb'){
    if(!charData?.strokes) return `<div class="cw-big-char">${activeChar}</div>`;
    return `<svg class="cw-svg-full" viewBox="0 0 1024 1024"><g transform="translate(0,900) scale(1,-1)">${charData.strokes.map(d=>`<path d="${d}" fill="${color}" opacity="${opacity}"/>`).join('')}</g></svg>`;
  }

  function customGroups(strokeCount){
    try{
      const raw = localStorage.getItem('cw_groups_' + activeChar);
      if(!raw) return null;
      const groups = JSON.parse(raw);
      if(!Array.isArray(groups) || !groups.length) return null;
      const flat = groups.flat();
      if(flat.length !== strokeCount) return null;
      return groups;
    }catch(e){ return null; }
  }

  function makeStrokeGroups(){
    if(!charData?.strokes) return null;
    const n = charData.strokes.length;
    const custom = customGroups(n);
    if(custom) return custom;
    const partCount = Math.max(1, Math.min(4, getTextParts(activeChar).length || (n > 8 ? 3 : 2)));
    const groups = [];
    for(let i=0;i<partCount;i++){
      const start = Math.floor(i*n/partCount);
      const end = Math.floor((i+1)*n/partCount);
      groups.push(Array.from({length:end-start},(_,k)=>start+k));
    }
    return groups;
  }

  function layoutFor(count){
    if(count <= 1) return [{x:50,y:50,w:76,h:76}];
    if(count === 2) return [{x:31,y:50,w:42,h:76},{x:69,y:50,w:42,h:76}];
    if(count === 3) return [{x:50,y:27,w:76,h:38},{x:31,y:70,w:42,h:52},{x:69,y:70,w:42,h:52}];
    return Array.from({length:count},(_,i)=>({x:28+(i%2)*44,y:30+Math.floor(i/2)*38,w:40,h:36}));
  }

  function ensureModal(){
    injectStyle();
    if(el(MODAL_ID)) return;
    const modal = document.createElement('div');
    modal.id = MODAL_ID;
    modal.innerHTML = `
      <div class="cw-shell">
        <div class="cw-panel cw-left" id="cw-list"></div>
        <div class="cw-panel cw-main">
          <div class="cw-top">
            <div class="cw-tabs">
              <button class="cw-tab" data-mode="demo">▶ 播放展示</button>
              <button class="cw-tab" data-mode="trace">✎ 仿寫練習</button>
              <button class="cw-tab" data-mode="stroke">◫ 筆畫配對</button>
              <button class="cw-tab" data-mode="parts">🧩 部件拼貼</button>
            </div>
            <button class="cw-close" id="cw-close">關閉</button>
          </div>
          <div class="cw-content" id="cw-content"></div>
        </div>
        <div class="cw-panel cw-right">
          <div class="cw-right-title">正確字形 <span id="cw-active"></span></div>
          <div class="cw-mini"><span id="cw-ref"></span></div>
          <div class="cw-right-title">部件資料</div>
          <div class="cw-chip-wrap" id="cw-chips"></div>
          <input class="cw-input" id="cw-parts-input" placeholder="文字部件，例如：金 艮">
          <button class="cw-btn primary" id="cw-save-parts">儲存文字部件</button>
          <div class="cw-right-title">筆畫群設定</div>
          <input class="cw-input" id="cw-groups-input" placeholder="例如：1-8 / 9-14">
          <button class="cw-btn warn" id="cw-save-groups">儲存筆畫群</button>
          <div class="cw-right-title">書寫工具</div>
          <div class="cw-tool-row">
            <button class="cw-color active" data-color="#ef4444" style="background:#ef4444"></button>
            <button class="cw-color" data-color="#2563eb" style="background:#2563eb"></button>
            <button class="cw-color" data-color="#f59e0b" style="background:#f59e0b"></button>
            <button class="cw-color" data-color="#22c55e" style="background:#22c55e"></button>
          </div>
          <input class="cw-range" id="cw-size" type="range" min="3" max="24" value="8">
          <button class="cw-btn" id="cw-toggle-model">顯示/隱藏範字</button>
          <button class="cw-btn rose" id="cw-clear-canvas">清除畫布</button>
        </div>
      </div>`;
    document.body.appendChild(modal);
    el('cw-close').onclick = close;
    modal.querySelectorAll('[data-mode]').forEach(b => b.onclick = () => { mode = b.dataset.mode; resetMode(); render(); });
    modal.querySelectorAll('[data-color]').forEach(b => b.onclick = () => {
      penColor = b.dataset.color;
      modal.querySelectorAll('[data-color]').forEach(x=>x.classList.remove('active'));
      b.classList.add('active');
    });
    el('cw-size').oninput = e => penSize = parseInt(e.target.value,10);
    el('cw-toggle-model').onclick = () => { showModel = !showModel; const m=el('cw-model'); if(m) m.style.display = showModel ? 'flex' : 'none'; };
    el('cw-clear-canvas').onclick = clearCanvas;
    el('cw-save-parts').onclick = () => {
      const parts = el('cw-parts-input').value.trim().split(/\s+/).filter(Boolean);
      if(!parts.length) return alert('請輸入部件，例如：金 艮');
      saveTextParts(activeChar, parts); resetMode(); render();
    };
    el('cw-save-groups').onclick = () => {
      const text = el('cw-groups-input').value.trim();
      if(!text) return alert('請輸入筆畫群，例如：1-8 / 9-14');
      const groups = parseGroups(text, charData?.strokes?.length || 0);
      if(!groups) return alert('格式錯誤，請用：1-8 / 9-14，且不能超出筆畫數。');
      localStorage.setItem('cw_groups_' + activeChar, JSON.stringify(groups)); resetMode(); render();
    };
  }

  function parseGroups(text, max){
    if(!max) return null;
    const groups = text.split('/').map(seg=>seg.trim()).filter(Boolean).map(seg=>{
      const m = seg.match(/^(\d+)(?:\s*-\s*(\d+))?$/);
      if(!m) return null;
      const a = parseInt(m[1],10), b = parseInt(m[2] || m[1],10);
      if(a<1 || b<a || b>max) return null;
      return Array.from({length:b-a+1},(_,i)=>a-1+i);
    });
    if(groups.some(g=>!g)) return null;
    return groups;
  }

  function groupsText(){
    const groups = customGroups(charData?.strokes?.length || 0);
    if(!groups) return '';
    return groups.map(g => `${g[0]+1}-${g[g.length-1]+1}`).join(' / ');
  }

  function resetMode(){
    clearInterval(demoTimer); demoTimer=null; demoStep=0; pieces=[]; drag=null;
  }

  function addButton(){
    const tabs = el('board-tabs'); if(!tabs) return;
    ['tab-workshop','tab-workshop-template'].forEach(id=>{ const old=el(id); if(old) old.remove(); });
    if(el(BTN_ID)) return;
    const b = document.createElement('button');
    b.id = BTN_ID; b.type='button';
    b.className = 'px-4 py-1.5 rounded-full text-sm font-bold transition-all text-slate-300 hover:text-white hover:bg-slate-700';
    b.textContent = '練習工坊';
    b.onclick = open;
    tabs.appendChild(b);
  }

  async function open(){
    ensureModal();
    activeChar = getCurrentChar();
    if(!activeChar){ alert('請先載入課文並選擇一個生字。'); return; }
    el(MODAL_ID).style.display = 'flex';
    resetMode();
    el('cw-content').innerHTML = '<div class="cw-loading">正在載入字形資料...</div>';
    await loadCharData(activeChar);
    render();
  }

  function close(){ clearInterval(demoTimer); if(el(MODAL_ID)) el(MODAL_ID).style.display='none'; }

  async function selectChar(c){
    activeChar = c; resetMode();
    el('cw-content').innerHTML = '<div class="cw-loading">正在載入字形資料...</div>';
    await loadCharData(activeChar);
    render();
  }

  function render(){
    renderList(); renderTabs(); renderRight();
    if(mode === 'demo') renderDemo();
    else if(mode === 'trace') renderTrace();
    else if(mode === 'stroke') renderStroke();
    else renderParts();
  }

  function renderList(){
    const cs = getChars();
    el('cw-list').innerHTML = cs.length ? cs.map(c=>`<button class="cw-char ${c===activeChar?'active':''}" data-ch="${c}">${c}</button>`).join('') : '<div style="font-size:12px;color:#64748b;font-weight:900;text-align:center">請先載入課文</div>';
    el('cw-list').querySelectorAll('[data-ch]').forEach(b=> b.onclick = () => selectChar(b.dataset.ch));
  }

  function renderTabs(){ document.querySelectorAll(`#${MODAL_ID} [data-mode]`).forEach(b=>b.classList.toggle('active', b.dataset.mode === mode)); }

  function renderRight(){
    const parts = getTextParts(activeChar);
    el('cw-active').textContent = activeChar;
    el('cw-ref').textContent = activeChar;
    el('cw-chips').innerHTML = parts.map(p=>`<span class="cw-chip">${p}</span>`).join('');
    el('cw-parts-input').value = parts.join(' ');
    el('cw-groups-input').value = groupsText();
  }

  function board(inner=''){ return `<div class="cw-board-wrap"><div class="cw-grid" id="cw-grid">${inner}</div></div>`; }

  function renderDemo(){
    const groups = makeStrokeGroups();
    if(groups && charData?.strokes){
      const colors = ['#2563eb','#22c55e','#f59e0b','#ef4444','#8b5cf6'];
      const paths = groups.flatMap((g,gi)=>g.map(idx=>`<path d="${charData.strokes[idx]}" fill="${colors[gi%colors.length]}" opacity="${gi<=demoStep?1:.10}"/>`)).join('');
      el('cw-content').innerHTML = `<div class="cw-title"><span>播放展示：看「${activeChar}」的筆畫群組合</span><span class="cw-sub">第 ${Math.min(demoStep+1,groups.length)} / ${groups.length} 步</span></div>${board(`<svg class="cw-svg-full" viewBox="0 0 1024 1024"><g transform="translate(0,900) scale(1,-1)">${paths}</g></svg>`)}<div class="cw-actions"><button class="cw-btn" id="cw-prev">上一步</button><button class="cw-btn primary" id="cw-play">播放</button><button class="cw-btn" id="cw-next">下一步</button><button class="cw-btn warn" id="cw-replay">重播</button><button class="cw-btn good" id="cw-full">完整字</button></div>`;
      bindDemoButtons(groups.length);
      return;
    }
    const parts = getTextParts(activeChar), layout = layoutFor(parts.length), colors = ['#2563eb','#22c55e','#f59e0b','#ef4444'];
    const html = parts.map((p,i)=>{ const t=layout[i]; return `<div class="cw-piece bank" style="position:absolute!important;left:${t.x}%;top:${t.y}%;transform:translate(-50%,-50%)!important;color:${colors[i%4]};opacity:${i<=demoStep?1:.15}"><span class="cw-piece-text">${p}</span></div>`; }).join('');
    el('cw-content').innerHTML = `<div class="cw-title"><span>播放展示：看「${activeChar}」的部件組合</span><span class="cw-sub">文字部件模式</span></div>${board(html)}<div class="cw-actions"><button class="cw-btn primary" id="cw-play">播放</button><button class="cw-btn good" id="cw-full">完整字</button></div>`;
    el('cw-play').onclick = () => playDemo(parts.length);
    el('cw-full').onclick = () => { el('cw-grid').innerHTML = `<div class="cw-big-char">${activeChar}</div>`; };
  }

  function bindDemoButtons(len){
    el('cw-prev').onclick = () => { demoStep = Math.max(0, demoStep-1); renderDemo(); };
    el('cw-next').onclick = () => { demoStep = Math.min(len-1, demoStep+1); renderDemo(); };
    el('cw-full').onclick = () => { el('cw-grid').innerHTML = fullSvg(.95, '#2563eb'); };
    el('cw-play').onclick = () => playDemo(len);
    el('cw-replay').onclick = () => { demoStep=0; renderDemo(); setTimeout(()=>playDemo(len),100); };
  }

  function playDemo(len){
    clearInterval(demoTimer);
    demoTimer = setInterval(()=>{ demoStep++; if(demoStep>=len){ demoStep=len-1; clearInterval(demoTimer); } renderDemo(); }, 700);
  }

  function renderTrace(){
    const model = charData?.strokes ? fullSvg(.13, '#0f172a') : `<div class="cw-model-char" id="cw-model" style="display:${showModel?'flex':'none'}">${activeChar}</div>`;
    el('cw-content').innerHTML = `<div class="cw-title"><span>仿寫練習：照著淡字描寫「${activeChar}」</span><span class="cw-sub">右側可調顏色、粗細、清除</span></div>${board(`<div id="cw-model" style="display:${showModel?'block':'none'}">${model}</div><canvas class="cw-canvas" id="cw-canvas"></canvas>`)}`;
    setupCanvas();
  }

  function setupCanvas(){
    const canvas = el('cw-canvas'), grid = el('cw-grid'); if(!canvas || !grid) return;
    const ctx = canvas.getContext('2d');
    canvas.width = grid.clientWidth; canvas.height = grid.clientHeight;
    ctx.lineCap='round'; ctx.lineJoin='round';
    const pos = ev => { const r=canvas.getBoundingClientRect(); return {x:(ev.touches?.[0]?.clientX ?? ev.clientX)-r.left, y:(ev.touches?.[0]?.clientY ?? ev.clientY)-r.top}; };
    const start = ev => { ev.preventDefault(); drawing=true; const p=pos(ev); ctx.beginPath(); ctx.moveTo(p.x,p.y); };
    const move = ev => { if(!drawing) return; ev.preventDefault(); const p=pos(ev); ctx.strokeStyle=penColor; ctx.lineWidth=penSize; ctx.lineTo(p.x,p.y); ctx.stroke(); };
    const end = ev => { if(drawing){ ev.preventDefault(); drawing=false; } };
    canvas.onmousedown=start; canvas.onmousemove=move; canvas.onmouseup=end; canvas.onmouseout=end;
    canvas.ontouchstart=start; canvas.ontouchmove=move; canvas.ontouchend=end;
  }

  function clearCanvas(){ const c=el('cw-canvas'); if(c) c.getContext('2d').clearRect(0,0,c.width,c.height); }

  function renderStroke(){
    const groups = makeStrokeGroups();
    if(!groups || !charData?.strokes){
      el('cw-content').innerHTML = `<div class="cw-title"><span>筆畫配對</span><span class="cw-sub">這個字暫時沒有筆畫資料，請用部件拼貼。</span></div>${board(`<div class="cw-big-char">${activeChar}</div>`)}`;
      return;
    }
    const hidden = groups.map((g,gi)=> gi === demoStep ? '' : g.map(idx=>`<path d="${charData.strokes[idx]}" fill="#cbd5e1" opacity=".28"/>`).join('')).join('');
    const answerPaths = groups[demoStep].map(idx=>charData.strokes[idx]);
    el('cw-content').innerHTML = `<div class="cw-title"><span>筆畫配對：找出缺少的筆畫群</span><span class="cw-sub">缺少：第 ${demoStep+1} 組</span></div>${board(`<svg class="cw-svg-full" viewBox="0 0 1024 1024"><g transform="translate(0,900) scale(1,-1)">${hidden}</g></svg>`)}<div class="cw-bank"><div class="cw-piece bank" style="position:relative!important">${svgPaths(answerPaths,'#0f172a')}</div></div><div class="cw-actions"><button class="cw-btn" id="cw-stroke-prev">上一組</button><button class="cw-btn" id="cw-stroke-next">下一組</button><button class="cw-btn good" id="cw-stroke-show">顯示答案</button></div>`;
    el('cw-stroke-prev').onclick=()=>{ demoStep=(demoStep-1+groups.length)%groups.length; renderStroke(); };
    el('cw-stroke-next').onclick=()=>{ demoStep=(demoStep+1)%groups.length; renderStroke(); };
    el('cw-stroke-show').onclick=()=>{ el('cw-grid').innerHTML=fullSvg(.95,'#2563eb'); };
  }

  function makePieces(){
    if(pieces.length) return;
    const groups = makeStrokeGroups();
    if(groups && charData?.strokes){
      pieces = groups.map((g,i)=>({type:'svg', group:i, paths:g.map(idx=>charData.strokes[idx]), x:12+i*18, y:85, inBoard:false}));
    }else{
      pieces = getTextParts(activeChar).map((p,i)=>({type:'text', text:p, group:i, x:12+i*18, y:85, inBoard:false}));
    }
  }

  function pieceHtml(p,i,bank=false){
    const content = p.type === 'svg' ? svgPaths(p.paths, '#0f172a') : `<span class="cw-piece-text">${p.text}</span>`;
    const cls = bank || !p.inBoard ? 'cw-piece bank' : 'cw-piece';
    const style = bank || !p.inBoard ? '' : `left:${p.x}%;top:${p.y}%;transform:translate(-50%,-50%)`;
    return `<div class="${cls}" data-piece="${i}" style="${style}">${content}</div>`;
  }

  function renderParts(){
    makePieces();
    const layout = layoutFor(pieces.length);
    const targets = layout.map((t,i)=>`<div class="cw-target" style="left:${t.x-t.w/2}%;top:${t.y-t.h/2}%;width:${t.w}%;height:${t.h}%">${i+1}</div>`).join('');
    const onBoard = pieces.map((p,i)=>p.inBoard ? pieceHtml(p,i,false) : '').join('');
    const bank = pieces.map((p,i)=>!p.inBoard ? pieceHtml(p,i,true) : '').join('');
    const dataMode = charData?.strokes ? 'SVG 筆畫群模式' : '文字部件模式';
    el('cw-content').innerHTML = `<div class="cw-title"><span>部件拼貼：拖曳到田字格</span><span class="cw-sub">${dataMode}，可自由移動位置</span></div>${board(targets + onBoard)}<div class="cw-bank" id="cw-bank">${bank}</div><div class="cw-feedback" id="cw-feedback">把部件拖到田字格中的虛線區域</div><div class="cw-actions"><button class="cw-btn good" id="cw-check">檢查答案</button><button class="cw-btn" id="cw-reset">重新開始</button><button class="cw-btn primary" id="cw-answer">看答案</button></div>`;
    bindDrag();
    el('cw-check').onclick = checkParts;
    el('cw-reset').onclick = () => { pieces=[]; renderParts(); };
    el('cw-answer').onclick = () => { pieces.forEach((p,i)=>{ p.x=layout[i].x; p.y=layout[i].y; p.inBoard=true; }); renderParts(); };
  }

  function bindDrag(){
    document.querySelectorAll(`#${MODAL_ID} .cw-piece`).forEach(piece=>{
      piece.onpointerdown = ev => {
        ev.preventDefault();
        piece.setPointerCapture?.(ev.pointerId);
        drag = {i:parseInt(piece.dataset.piece,10)};
        piece.style.zIndex = 40;
      };
      piece.onpointermove = ev => {
        if(!drag || drag.i !== parseInt(piece.dataset.piece,10)) return;
        ev.preventDefault();
        const grid = el('cw-grid'), r = grid.getBoundingClientRect();
        const inside = ev.clientX>=r.left && ev.clientX<=r.right && ev.clientY>=r.top && ev.clientY<=r.bottom;
        if(inside){
          const x = clamp((ev.clientX-r.left)/r.width*100, 5, 95);
          const y = clamp((ev.clientY-r.top)/r.height*100, 5, 95);
          pieces[drag.i].x=x; pieces[drag.i].y=y; pieces[drag.i].inBoard=true;
          piece.classList.remove('bank'); piece.style.position='absolute'; piece.style.left=x+'%'; piece.style.top=y+'%'; piece.style.transform='translate(-50%,-50%)';
          if(piece.parentElement !== grid) grid.appendChild(piece);
        }else{
          piece.style.position='fixed'; piece.style.left=ev.clientX+'px'; piece.style.top=ev.clientY+'px'; piece.style.transform='translate(-50%,-50%)';
        }
      };
      piece.onpointerup = ev => {
        if(!drag) return;
        const grid = el('cw-grid'), r = grid.getBoundingClientRect();
        const inside = ev.clientX>=r.left && ev.clientX<=r.right && ev.clientY>=r.top && ev.clientY<=r.bottom;
        if(!inside){ pieces[drag.i].inBoard=false; }
        drag=null; renderParts();
      };
    });
  }

  function checkParts(){
    const layout = layoutFor(pieces.length);
    let ok = 0;
    pieces.forEach((p,i)=>{
      const t = layout[i];
      const near = p.inBoard && Math.abs(p.x-t.x) <= Math.max(14,t.w/2) && Math.abs(p.y-t.y) <= Math.max(14,t.h/2);
      if(near && p.group === i) ok++;
    });
    const fb = el('cw-feedback');
    if(ok === pieces.length){ fb.textContent = '太棒了，部件位置正確！'; fb.style.color = '#059669'; }
    else { fb.textContent = `已完成 ${ok}/${pieces.length} 個，請再調整位置。`; fb.style.color = '#e11d48'; }
  }

  function apply(){ ensureModal(); addButton(); }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', apply); else apply();
  window.addEventListener('load', apply);
  setInterval(addButton, 1000);
})();
