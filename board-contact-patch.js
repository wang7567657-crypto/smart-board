// 局部修補：聯絡簿日期固定 + 整段直書輸入 + 安全隱藏重複按鈕
// 用法：在 index.html 的 </body> 前加入：
// <script src="./board-contact-patch.js"></script>
(function () {
  function toChineseNum(num, isYear = false) {
    const digits = ["零", "一", "二", "三", "四", "五", "六", "七", "八", "九"];
    if (isYear) return String(num).split('').map(d => digits[parseInt(d)]).join('');
    if (num <= 10) return num === 10 ? "十" : digits[num];
    if (num < 20) return "十" + digits[num % 10];
    if (num < 30) return "二十" + (num % 10 === 0 ? "" : digits[num % 10]);
    return "三十" + (num % 10 === 0 ? "" : digits[num % 10]);
  }

  function hideLowerTeachingButtons() {
    // 只隱藏生字資訊黑板中間下方那一組大按鈕，不動右上角 tab-trace / tab-swf，避免影響原本載入流程。
    const infoView = document.getElementById('view-info');
    if (!infoView) return;
    const traceButton = infoView.querySelector("button[onclick=\"window.switchView('trace')\"]");
    const swfButton = infoView.querySelector("button[onclick=\"window.openSwfModal()\"]");
    if (traceButton) traceButton.style.display = 'none';
    if (swfButton) swfButton.style.display = 'none';
  }

  function ensureBoardUi() {
    const area = document.getElementById('board-draw-area');
    const oldInput = document.getElementById('board-text-input');
    const canvas = document.getElementById('free-board-canvas');
    if (!area || !canvas) return false;

    canvas.classList.add('z-0');

    if (!document.getElementById('board-date-overlay')) {
      const date = document.createElement('div');
      date.id = 'board-date-overlay';
      date.className = 'absolute top-6 right-6 z-10 pointer-events-none select-none font-bold opacity-90';
      date.style.cssText = "font-family:'Kaiti TC','BiauKai','DFKai-SB',serif; writing-mode: vertical-rl; -webkit-writing-mode: vertical-rl; text-orientation: upright; -webkit-text-orientation: upright; line-height:1.25; letter-spacing:0.08em;";
      area.appendChild(date);
    }

    if (oldInput && oldInput.tagName === 'TEXTAREA' && !document.getElementById('board-text-panel')) {
      oldInput.remove();
    }

    if (!document.getElementById('board-text-panel')) {
      const panel = document.createElement('div');
      panel.id = 'board-text-panel';
      panel.className = 'absolute left-1/2 bottom-6 -translate-x-1/2 z-30 hidden w-[min(92vw,620px)] bg-white/95 rounded-2xl shadow-2xl border-2 border-emerald-200 p-4';
      panel.innerHTML = `
        <div class="flex items-center justify-between gap-3 mb-3">
          <div class="font-black text-emerald-700 flex items-center gap-2">
            <i data-lucide="type" class="w-5 h-5"></i>
            輸入完成後，整段從右上角直書到黑板
          </div>
          <button onclick="window.cancelBoardText()" class="text-slate-400 hover:text-rose-500 font-black px-2">✕</button>
        </div>
        <textarea id="board-text-input" placeholder="請先把要寫的聯絡簿內容全部打完，再按『寫到黑板』。" class="w-full h-32 bg-slate-50 outline-none resize-none overflow-y-auto whitespace-pre-wrap font-bold shadow-inner border border-slate-200 rounded-xl p-3 text-slate-800" style="font-family:'Kaiti TC','BiauKai','DFKai-SB',serif; line-height:1.45;"></textarea>
        <div class="flex justify-between items-center gap-3 mt-3">
          <p class="text-xs font-bold text-slate-500">結果會固定從黑板最上方右側開始，直書排列，並依高度自動往左分欄。</p>
          <div class="flex gap-2 shrink-0">
            <button onclick="window.cancelBoardText()" class="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-black">取消</button>
            <button onclick="window.finalizeText()" class="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black shadow">寫到黑板</button>
          </div>
        </div>`;
      area.appendChild(panel);
    }

    if (window.lucide) window.lucide.createIcons();
    return true;
  }

  let fbCanvas, fbCtx, isFbDrawing = false, fbColor = '#ffffff', fbMode = 'pen';

  window.drawAutoDate = function () {
    ensureBoardUi();
    const overlay = document.getElementById('board-date-overlay');
    const area = document.getElementById('board-draw-area');
    if (!overlay || !area) return;

    const today = new Date();
    const rocYear = today.getFullYear() - 1911;
    const month = today.getMonth() + 1;
    const date = today.getDate();
    const dayOfWeek = ["日", "一", "二", "三", "四", "五", "六"][today.getDay()];
    const dateText = `中華民國${toChineseNum(rocYear, true)}年${toChineseNum(month)}月${toChineseNum(date)}日星期${dayOfWeek}`;
    overlay.innerHTML = Array.from(dateText).map(ch => {
      const isDigit = ["零", "一", "二", "三", "四", "五", "六", "七", "八", "九", "十"].includes(ch);
      return `<span class="${isDigit ? 'text-red-300' : 'text-white'} drop-shadow-sm">${ch}</span>`;
    }).join('');
    overlay.style.fontSize = Math.max(16, Math.min(28, Math.floor(area.clientHeight / 22))) + 'px';
    overlay.style.right = Math.max(24, Math.min(56, area.clientWidth * 0.045)) + 'px';
    overlay.style.top = Math.max(20, Math.min(40, area.clientHeight * 0.04)) + 'px';
  };

  window.initFreeBoard = function () {
    ensureBoardUi();
    if (fbCanvas) {
      window.drawAutoDate();
      return;
    }
    fbCanvas = document.getElementById('free-board-canvas');
    fbCtx = fbCanvas.getContext('2d');
    const textInput = document.getElementById('board-text-input');
    const textPanel = document.getElementById('board-text-panel');

    const resize = () => {
      if (!fbCanvas.parentElement) return;
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = fbCanvas.width || 1;
      tempCanvas.height = fbCanvas.height || 1;
      tempCanvas.getContext('2d').drawImage(fbCanvas, 0, 0);
      fbCanvas.width = fbCanvas.clientWidth;
      fbCanvas.height = fbCanvas.clientHeight;
      fbCtx.lineCap = 'round';
      fbCtx.lineJoin = 'round';
      fbCtx.drawImage(tempCanvas, 0, 0);
      window.drawAutoDate();
    };
    window.addEventListener('resize', resize);
    resize();
    window.drawAutoDate();

    window.finalizeText = () => {
      if (!textPanel || textPanel.classList.contains('hidden')) return;
      const rawText = textInput.value || '';
      if (rawText.trim() !== '') {
        const rawSize = parseInt(document.getElementById('board-pen-size').value);
        const fontSize = Math.max(24, rawSize * 6);
        const lineGap = fontSize * 1.35;
        const colGap = fontSize * 1.45;
        fbCtx.globalCompositeOperation = 'source-over';
        fbCtx.font = `bold ${fontSize}px 'Kaiti TC', 'BiauKai', 'DFKai-SB', serif`;
        fbCtx.fillStyle = fbColor;
        fbCtx.textBaseline = 'top';
        fbCtx.textAlign = 'center';

        const marginTop = Math.max(28, fbCanvas.height * 0.045);
        const marginBottom = 28;
        const startX = fbCanvas.width - Math.max(72, fbCanvas.width * 0.08);
        const startY = marginTop;
        const maxCharsPerColumn = Math.max(1, Math.floor((fbCanvas.height - startY - marginBottom) / lineGap));
        const columns = [];

        rawText.split(/\r?\n/).forEach(line => {
          const chars = Array.from(line);
          if (chars.length === 0) { columns.push([]); return; }
          for (let i = 0; i < chars.length; i += maxCharsPerColumn) columns.push(chars.slice(i, i + maxCharsPerColumn));
        });

        columns.forEach((chars, colIndex) => {
          const colX = startX - (colIndex * colGap) - (fontSize / 2);
          if (colX < 10) return;
          chars.forEach((char, charIndex) => {
            const charY = startY + (charIndex * lineGap);
            if (charY < fbCanvas.height - marginBottom) fbCtx.fillText(char, colX, charY);
          });
        });
      }
      textInput.value = '';
      textPanel.classList.add('hidden');
    };

    window.cancelBoardText = function () {
      if (!textPanel) return;
      textInput.value = '';
      textPanel.classList.add('hidden');
    };

    textInput.addEventListener('input', function () {
      this.style.height = 'auto';
      this.style.height = Math.min(Math.max(this.scrollHeight + 10, 128), 260) + 'px';
    });

    const getPos = (e) => {
      const rect = fbCanvas.getBoundingClientRect();
      const clientX = e.touches && e.touches.length > 0 ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches && e.touches.length > 0 ? e.touches[0].clientY : e.clientY;
      return { x: (clientX - rect.left) * (fbCanvas.width / rect.width), y: (clientY - rect.top) * (fbCanvas.height / rect.height) };
    };

    const start = (e) => {
      if (e.button !== undefined && e.button !== 0) return;
      if (fbMode === 'text') {
        e.preventDefault();
        const rawSize = parseInt(document.getElementById('board-pen-size').value);
        const fontSize = Math.max(20, Math.max(24, rawSize * 6) * 0.75);
        textInput.style.fontSize = fontSize + 'px';
        textInput.style.height = '128px';
        textInput.style.color = '#0f172a';
        textPanel.classList.remove('hidden');
        if (window.lucide) window.lucide.createIcons();
        setTimeout(() => textInput.focus(), 10);
        return;
      }
      e.preventDefault();
      isFbDrawing = true;
      const pos = getPos(e);
      fbCtx.beginPath();
      fbCtx.moveTo(pos.x, pos.y);
    };

    const draw = (e) => {
      if (!isFbDrawing || fbMode === 'text') return;
      e.preventDefault();
      const pos = getPos(e);
      fbCtx.lineTo(pos.x, pos.y);
      const rawSize = parseInt(document.getElementById('board-pen-size').value);
      if (fbMode === 'eraser') {
        fbCtx.globalCompositeOperation = 'destination-out';
        fbCtx.lineWidth = rawSize * 5;
        fbCtx.strokeStyle = 'rgba(0,0,0,1)';
      } else {
        fbCtx.globalCompositeOperation = 'source-over';
        fbCtx.lineWidth = rawSize;
        fbCtx.strokeStyle = fbColor;
      }
      fbCtx.stroke();
    };
    const stop = (e) => { if (!isFbDrawing) return; e.preventDefault(); isFbDrawing = false; };

    fbCanvas.addEventListener('mousedown', start);
    fbCanvas.addEventListener('mousemove', draw);
    fbCanvas.addEventListener('mouseup', stop);
    fbCanvas.addEventListener('mouseout', stop);
    fbCanvas.addEventListener('touchstart', start, { passive: false });
    fbCanvas.addEventListener('touchmove', draw, { passive: false });
    fbCanvas.addEventListener('touchend', stop);
  };

  window.updateTextSizeLive = function () {
    const rawSize = parseInt(document.getElementById('board-pen-size').value);
    const textInput = document.getElementById('board-text-input');
    const textPanel = document.getElementById('board-text-panel');
    if (textInput && textPanel && !textPanel.classList.contains('hidden')) {
      const fontSize = Math.max(20, Math.max(24, rawSize * 6) * 0.75);
      textInput.style.fontSize = fontSize + 'px';
      textInput.style.height = 'auto';
      textInput.style.height = Math.min(Math.max(textInput.scrollHeight + 10, 128), 260) + 'px';
    }
  };

  window.setBoardColor = function (color, btnEl) {
    fbColor = color;
    document.querySelectorAll('.color-btn').forEach(btn => btn.classList.remove('color-btn-active'));
    if (btnEl) btnEl.classList.add('color-btn-active');
    if (fbMode === 'eraser') window.setBoardMode('pen');
  };

  window.setBoardMode = function (mode, btnEl) {
    if (window.finalizeText && fbMode === 'text' && mode !== 'text') window.finalizeText();
    fbMode = mode;
    document.querySelectorAll('.board-tool-btn').forEach(btn => {
      btn.classList.remove('bg-white/20', 'text-white');
      btn.classList.add('text-slate-300');
    });
    if (btnEl) {
      btnEl.classList.add('bg-white/20', 'text-white');
      btnEl.classList.remove('text-slate-300');
    } else if (mode === 'eraser') {
      document.getElementById('btn-board-eraser').classList.add('bg-white/20', 'text-white');
    } else if (mode === 'text') {
      document.getElementById('btn-board-text').classList.add('bg-white/20', 'text-white');
    }
    if (fbCanvas) {
      if (mode === 'text') fbCanvas.style.cursor = 'text';
      else if (mode === 'eraser') fbCanvas.style.cursor = 'cell';
      else fbCanvas.style.cursor = 'crosshair';
    }
  };

  window.clearBoard = function () {
    if (window.cancelBoardText) window.cancelBoardText();
    document.getElementById('board-confirm-overlay').classList.remove('hidden');
    if (window.lucide) window.lucide.createIcons();
  };

  window.doClearBoard = function () {
    if (fbCtx) fbCtx.clearRect(0, 0, fbCanvas.width, fbCanvas.height);
    window.drawAutoDate();
    document.getElementById('board-confirm-overlay').classList.add('hidden');
  };

  document.addEventListener('DOMContentLoaded', () => {
    hideLowerTeachingButtons();
    ensureBoardUi();
    window.drawAutoDate();
  });
})();
