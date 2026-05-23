// 修補：練習工坊按鈕點了沒反應時，提供一個穩定可開啟的工坊入口。
(function () {
  const MODAL_ID = 'cw-fix-modal';
  const STYLE_ID = 'cw-fix-style';
  const BTN_ID = 'tab-workshop-fix';

  const PARTS = {
    '銀':['金','艮'],'銅':['金','同'],'鋁':['金','呂'],'錢':['金','戔'],'明':['日','月'],'朋':['月','月'],'林':['木','木'],'森':['木','木','木'],'好':['女','子'],'媽':['女','馬'],'妹':['女','未'],'休':['亻','木'],'你':['亻','爾'],'他':['亻','也'],'河':['氵','可'],'海':['氵','每'],'清':['氵','青'],'晴':['日','青'],'問':['門','口'],'間':['門','日'],'跑':['足','包'],'跳':['足','兆'],'請':['言','青'],'說':['言','兌']
  };

  let activeChar = '';
  let mode = 'parts';
  let placed = [];
  let selected = '';
  let drawing = false;
  let penColor = '#2563eb';
  let penSize = 8;

  function el(id){return document.getElementById(id);}

  function style(){
    if(el(STYLE_ID))return;
    const s=document.createElement('style');
    s.id=STYLE_ID;
    s.textContent=`
      #${MODAL_ID}{position:fixed;inset:0;background:rgba(15,23,42,.78);backdrop-filter:blur(6px);z-index:999999;display:none;align-items:center;justify-content:center;padding:18px;box-sizing:border-box;font-family:'Microsoft JhengHei',sans-serif;}
      .cwf-box{width:min(1100px,96vw);height:min(720px,92vh);background:#f8fafc;border-radius:26px;box-shadow:0 24px 80px rgba(0,0,0,.35);display:grid;grid-template-columns:90px 1fr 260px;gap:12px;padding:12px;box-sizing:border-box;}
      .cwf-panel{background:white;border-radius:20px;border:1px solid #e2e8f0;box-shadow:0 8px 24px rgba(15,23,42,.08);overflow:hidden;}
      .cwf-left{padding:10px;display:flex;flex-direction:column;gap:8px;overflow:auto;align-items:center}.cwf-char{width:58px;height:58px;border-radius:16px;border:2px solid #e2e8f0;background:white;font-size:30px;font-weight:900;font-family:'Kaiti TC','BiauKai','DFKai-SB',serif;cursor:pointer}.cwf-char.active{background:#2563eb;color:white;border-color:#2563eb}.cwf-main{display:flex;flex-direction:column}.cwf-top{height:58px;border-bottom:1px solid #e2e8f0;display:flex;align-items:center;justify-content:space-between;padding:0 12px}.cwf-tabs{display:flex;gap:6px;flex-wrap:wrap}.cwf-tab{border:0;border-radius:12px;padding:10px 12px;font-weight:900;cursor:pointer;background:#f1f5f9;color:#475569}.cwf-tab.active{background:#0f766e;color:white}.cwf-close{border:0;background:#fee2e2;color:#be123c;border-radius:12px;font-weight:900;padding:10px 14px;cursor:pointer}.cwf-content{flex:1;padding:16px;overflow:auto}.cwf-title{font-size:20px;font-weight:900;color:#0f172a;margin-bottom:12px}.cwf-grid{position:relative;width:min(410px,85vw);aspect-ratio:1/1;background:white;border:4px solid #1e293b;border-radius:14px;margin:0 auto;display:flex;align-items:center;justify-content:center;overflow:hidden}.cwf-grid:before{content:'';position:absolute;inset:0;background:linear-gradient(45deg,transparent 49.4%,#cbd5e1 49.7%,#cbd5e1 50.3%,transparent 50.6%),linear-gradient(-45deg,transparent 49.4%,#cbd5e1 49.7%,#cbd5e1 50.3%,transparent 50.6%),linear-gradient(90deg,transparent 49.5%,#cbd5e1 50%,transparent 50.5%),linear-gradient(0deg,transparent 49.5%,#cbd5e1 50%,transparent 50.5%);opacity:.75;pointer-events:none}.cwf-big{font-family:'Kaiti TC','BiauKai','DFKai-SB',serif;font-size:180px;font-weight:900;line-height:1;position:relative;z-index:1;color:#2563eb}.cwf-faint{opacity:.18;color:#0f172a}.cwf-right{padding:14px;display:flex;flex-direction:column;gap:12px}.cwf-mini{position:relative;aspect-ratio:1/1;border:3px solid #e2e8f0;border-radius:18px;display:flex;align-items:center;justify-content:center}.cwf-mini span{font-size:132px;font-family:'Kaiti TC','BiauKai','DFKai-SB',serif;font-weight:900;color:#2563eb}.cwf-chip{background:#ccfbf1;color:#0f766e;border-radius:12px;padding:8px 10px;font-weight:900;font-size:20px}.cwf-input{border:2px solid #cbd5e1;border-radius:12px;padding:10px;font-weight:800}.cwf-btn{border:0;border-radius:12px;padding:10px 14px;font-weight:900;cursor:pointer;background:#e2e8f0;color:#0f172a}.cwf-btn.primary{background:#2563eb;color:#fff}.cwf-btn.good{background:#10b981;color:#fff}.cwf-btn.rose{background:#f43f5e;color:#fff}.cwf-area{display:grid;grid-template-columns:1fr 1fr;gap:16px}.cwf-bank,.cwf-slots{background:#f8fafc;border:2px dashed #cbd5e1;border-radius:16px;min-height:120px;padding:12px;display:flex;flex-wrap:wrap;gap:10px;justify-content:center;align-items:center}.cwf-card,.cwf-slot{min-width:84px;height:70px;border-radius:16px;border:2px solid #e2e8f0;background:#fff;display:flex;align-items:center;justify-content:center;font-size:36px;font-weight:900;font-family:'Kaiti TC','BiauKai','DFKai-SB',serif;cursor:pointer;box-shadow:0 3px 10px rgba(15,23,42,.12)}.cwf-card.selected{border-color:#f59e0b;background:#fffbeb;transform:scale(1.06)}.cwf-slot{border-style:dashed;color:#94a3b8}.cwf-slot.filled{border-style:solid;color:#0f172a;background:#ecfeff;border-color:#06b6d4}.cwf-actions{display:flex;gap:10px;flex-wrap:wrap;justify-content:center;margin-top:14px}.cwf-canvas{position:absolute;inset:0;z-index:3;touch-action:none}.cwf-color{width:38px;height:38px;border-radius:50%;border:3px solid #fff;box-shadow:0 0 0 2px #cbd5e1;cursor:pointer}@media(max-width:900px){.cwf-box{grid-template-columns:70px 1fr}.cwf-right{display:none}.cwf-area{grid-template-columns:1fr}.cwf-char{width:50px;height:50px}.cwf-big{font-size:145px}}
    `;
    document.head.appendChild(s);
  }

  function chars(){
    if(Array.isArray(window.state?.currentVocab)&&window.state.currentVocab.length)return window.state.currentVocab.filter(Boolean);
    const vocab=[...document.querySelectorAll('#vocab-list button')].map(b=>b.textContent.trim()).filter(Boolean);
    if(vocab.length)return vocab;
    return [];
  }

  function currentChar(){
    if(window.state?.activeChar)return window.state.activeChar;
    const active=document.querySelector('#vocab-list button.bg-indigo-600');
    if(active)return active.textContent.trim();
    const text=el('current-char-info')?.textContent||'';
    const m=text.match(/「(.+?)」/); if(m)return m[1];
    return chars()[0]||'';
  }

  function getParts(ch){
    try{const saved=localStorage.getItem('cw_parts_'+ch);if(saved){const a=JSON.parse(saved);if(Array.isArray(a)&&a.length)return a;}}catch(e){}
    return PARTS[ch]||[ch];
  }
  function saveParts(ch,parts){try{localStorage.setItem('cw_parts_'+ch,JSON.stringify(parts));}catch(e){}}

  function ensure(){
    style();
    if(el(MODAL_ID))return;
    const m=document.createElement('div');m.id=MODAL_ID;m.innerHTML=`<div class="cwf-box"><div class="cwf-panel cwf-left" id="cwf-list"></div><div class="cwf-panel cwf-main"><div class="cwf-top"><div class="cwf-tabs"><button class="cwf-tab" data-cwf-mode="demo">▶ 播放展示</button><button class="cwf-tab" data-cwf-mode="trace">✎ 仿寫練習</button><button class="cwf-tab" data-cwf-mode="parts">🧩 部件拼貼</button></div><button class="cwf-close" id="cwf-close">關閉</button></div><div class="cwf-content" id="cwf-content"></div></div><div class="cwf-panel cwf-right"><div style="font-weight:900">正確字形 <span id="cwf-active"></span></div><div class="cwf-mini"><span id="cwf-ref"></span></div><div style="font-weight:900">部件資料</div><div id="cwf-chips" style="display:flex;flex-wrap:wrap;gap:8px"></div><input class="cwf-input" id="cwf-input" placeholder="例如：金 艮"><button class="cwf-btn primary" id="cwf-save">儲存部件</button></div></div>`;
    document.body.appendChild(m);
    el('cwf-close').onclick=()=>m.style.display='none';
    m.querySelectorAll('[data-cwf-mode]').forEach(b=>b.onclick=()=>{mode=b.dataset.cwfMode;placed=[];selected='';render();});
    el('cwf-save').onclick=()=>{const p=el('cwf-input').value.trim().split(/\s+/).filter(Boolean);if(!activeChar||!p.length)return alert('請輸入部件，例如：金 艮');saveParts(activeChar,p);placed=[];render();};
  }

  function addButton(){
    const tabs=el('board-tabs'); if(!tabs)return;
    const old=el('tab-workshop'); if(old)old.remove();
    if(el(BTN_ID))return;
    const b=document.createElement('button');b.id=BTN_ID;b.type='button';b.className='px-4 py-1.5 rounded-full text-sm font-bold transition-all text-slate-300 hover:text-white hover:bg-slate-700';b.textContent='練習工坊';b.onclick=open;
    tabs.appendChild(b);
  }

  function open(){
    ensure();
    activeChar=currentChar();
    if(!activeChar){alert('請先載入課文並選擇一個生字。');return;}
    el(MODAL_ID).style.display='flex';
    placed=[];selected='';render();
  }

  function render(){renderList();renderTabs();renderRight();if(mode==='demo')demo();else if(mode==='trace')trace();else parts();}
  function renderList(){const list=el('cwf-list');const cs=chars();list.innerHTML=cs.length?cs.map(c=>`<button class="cwf-char ${c===activeChar?'active':''}" data-ch="${c}">${c}</button>`).join(''):'<div style="font-size:12px;color:#64748b;font-weight:900;text-align:center">請先載入課文</div>';list.querySelectorAll('[data-ch]').forEach(b=>b.onclick=()=>{activeChar=b.dataset.ch;placed=[];selected='';render();});}
  function renderTabs(){document.querySelectorAll('[data-cwf-mode]').forEach(b=>b.classList.toggle('active',b.dataset.cwfMode===mode));}
  function renderRight(){const p=getParts(activeChar);el('cwf-active').textContent=activeChar;el('cwf-ref').textContent=activeChar;el('cwf-chips').innerHTML=p.map(x=>`<span class="cwf-chip">${x}</span>`).join('');el('cwf-input').value=p.join(' ');}
  function demo(){const p=getParts(activeChar);el('cwf-content').innerHTML=`<div class="cwf-title">播放展示：觀察「${activeChar}」的部件</div><div class="cwf-grid"><div style="display:flex;gap:4px;flex-wrap:wrap;align-items:center;justify-content:center">${p.map((x,i)=>`<span style="font-size:126px;font-family:'Kaiti TC','BiauKai','DFKai-SB',serif;font-weight:900;color:${['#2563eb','#22c55e','#f59e0b','#ef4444'][i%4]}">${x}</span>`).join('')}</div></div><div class="cwf-actions"><button class="cwf-btn primary" id="cwf-full">顯示完整字</button></div>`;el('cwf-full').onclick=()=>{el('cwf-content').querySelector('.cwf-grid').innerHTML=`<span class="cwf-big">${activeChar}</span>`;};}
  function trace(){el('cwf-content').innerHTML=`<div class="cwf-title">仿寫練習：照著淡字描寫「${activeChar}」</div><div class="cwf-grid" id="cwf-trace"><div class="cwf-big cwf-faint" id="cwf-model">${activeChar}</div><canvas class="cwf-canvas" id="cwf-canvas"></canvas></div><div class="cwf-actions"><button class="cwf-color" data-color="#2563eb" style="background:#2563eb"></button><button class="cwf-color" data-color="#ef4444" style="background:#ef4444"></button><button class="cwf-color" data-color="#f59e0b" style="background:#f59e0b"></button><button class="cwf-color" data-color="#22c55e" style="background:#22c55e"></button><label style="font-weight:900">粗細 <input id="cwf-size" type="range" min="3" max="22" value="${penSize}"></label><button class="cwf-btn" id="cwf-hide">顯示/隱藏淡字</button><button class="cwf-btn rose" id="cwf-clear">清除</button></div>`;setupCanvas();document.querySelectorAll('[data-color]').forEach(b=>b.onclick=()=>penColor=b.dataset.color);el('cwf-size').oninput=e=>penSize=parseInt(e.target.value,10);el('cwf-hide').onclick=()=>{const m=el('cwf-model');m.style.display=m.style.display==='none'?'block':'none';};el('cwf-clear').onclick=()=>{const c=el('cwf-canvas');c.getContext('2d').clearRect(0,0,c.width,c.height);};}
  function setupCanvas(){const c=el('cwf-canvas'),box=el('cwf-trace'),ctx=c.getContext('2d');c.width=box.clientWidth;c.height=box.clientHeight;ctx.lineCap='round';ctx.lineJoin='round';const pos=e=>{const r=c.getBoundingClientRect();return{x:(e.touches?.[0]?.clientX??e.clientX)-r.left,y:(e.touches?.[0]?.clientY??e.clientY)-r.top};};const st=e=>{e.preventDefault();drawing=true;const p=pos(e);ctx.beginPath();ctx.moveTo(p.x,p.y);};const mv=e=>{if(!drawing)return;e.preventDefault();const p=pos(e);ctx.strokeStyle=penColor;ctx.lineWidth=penSize;ctx.lineTo(p.x,p.y);ctx.stroke();};const ed=e=>{if(!drawing)return;e.preventDefault();drawing=false;};c.onmousedown=st;c.onmousemove=mv;c.onmouseup=ed;c.onmouseout=ed;c.ontouchstart=st;c.ontouchmove=mv;c.ontouchend=ed;}
  function parts(){const p=getParts(activeChar);if(!placed.length||placed.length!==p.length)placed=Array(p.length).fill('');el('cwf-content').innerHTML=`<div class="cwf-title">部件拼貼：把「${activeChar}」拼回來</div><div class="cwf-area"><div><div style="font-weight:900;text-align:center;margin-bottom:8px">部件銀行</div><div class="cwf-bank">${[...p].sort(()=>Math.random()-.5).map(x=>`<button class="cwf-card" data-part="${x}">${x}</button>`).join('')}</div></div><div><div style="font-weight:900;text-align:center;margin-bottom:8px">拼貼區</div><div class="cwf-slots">${p.map((x,i)=>`<button class="cwf-slot ${placed[i]?'filled':''}" data-slot="${i}">${placed[i]||i+1}</button>`).join('')}</div></div></div><div class="cwf-actions"><button class="cwf-btn good" id="cwf-check">檢查答案</button><button class="cwf-btn" id="cwf-reset">重新開始</button><button class="cwf-btn primary" id="cwf-answer">看答案</button></div>`;document.querySelectorAll('[data-part]').forEach(b=>b.onclick=()=>{selected=b.dataset.part;document.querySelectorAll('[data-part]').forEach(x=>x.classList.remove('selected'));b.classList.add('selected');});document.querySelectorAll('[data-slot]').forEach(b=>b.onclick=()=>{const i=parseInt(b.dataset.slot,10);if(selected){placed[i]=selected;selected='';parts();}else if(placed[i]){placed[i]='';parts();}});el('cwf-check').onclick=()=>alert(p.every((x,i)=>placed[i]===x)?'太棒了，部件拼對了！':'還差一點，再看右邊正確字形。');el('cwf-reset').onclick=()=>{placed=Array(p.length).fill('');parts();};el('cwf-answer').onclick=()=>{placed=[...p];parts();};}
  function apply(){ensure();addButton();setInterval(addButton,1000);} if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',apply);else apply();window.addEventListener('load',apply);setTimeout(apply,500);setTimeout(apply,1500);
})();
