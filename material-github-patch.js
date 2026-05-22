// 局部修補：生字語詞教材編輯站 → 儲存 / 載入 GitHub 教材
// 也會自動載入 worksheet-export-patch.js，讓匯出學習單按鈕具備功能。
(function () {
  const PATCH_ID = 'material-github-patch-panel';

  function loadWorksheetExportPatch() {
    if (document.getElementById('worksheet-export-patch-script')) return;
    const script = document.createElement('script');
    script.id = 'worksheet-export-patch-script';
    script.src = './worksheet-export-patch.js?v=' + Date.now();
    script.defer = true;
    document.body.appendChild(script);
  }

  function getEl(id) {
    return document.getElementById(id);
  }

  function sanitizeFileName(name) {
    return String(name || '未命名')
      .trim()
      .replace(/[\\/:*?"<>|#%{}\[\]^~`]/g, '_')
      .replace(/\s+/g, '') || '未命名';
  }

  function encodePath(path) {
    return path.split('/').map(part => encodeURIComponent(part)).join('/');
  }

  function getLessonMeta() {
    const pub = getEl('sel-pub')?.value || window.state?.selPub || '未選出版社';
    const grade = getEl('sel-grade')?.value || window.state?.selGrade || '未選年級';
    const sem = getEl('sel-sem')?.value || window.state?.selSem || '未選學期';
    const les = getEl('sel-les')?.value || window.state?.selLes || '未選課次';

    return {
      publisher: pub,
      grade,
      semester: sem,
      lesson: les,
      folderName: `materials/${sanitizeFileName(pub)}/${sanitizeFileName(grade)}/${sanitizeFileName(sem)}`,
      fileName: `${sanitizeFileName(les)}.json`
    };
  }

  function getMaterialData() {
    const meta = getLessonMeta();
    const primaryTsv = getEl('primary-tsv-input')?.value || '';
    const extraTsv = getEl('extra-tsv-input')?.value || '';

    return {
      schema: 'smart-board-material-v1',
      publisher: meta.publisher,
      grade: meta.grade,
      semester: meta.semester,
      lesson: meta.lesson,
      currentVocab: Array.isArray(window.state?.currentVocab) ? window.state.currentVocab : [],
      primaryTsv,
      extraTsv,
      updatedAt: new Date().toISOString()
    };
  }

  function setStatus(message, type = 'info') {
    const status = getEl('material-github-status');
    if (!status) return;

    const colorMap = {
      info: 'text-slate-500',
      loading: 'text-indigo-600',
      success: 'text-emerald-600',
      warn: 'text-amber-600',
      error: 'text-rose-600'
    };

    status.className = `text-xs font-bold min-h-[1.25rem] ${colorMap[type] || colorMap.info}`;
    status.textContent = message;
  }

  function getRawMaterialUrl(meta) {
    const base = typeof GITHUB_REPO_BASE !== 'undefined'
      ? GITHUB_REPO_BASE
      : 'https://raw.githubusercontent.com/wang7567657-crypto/my-chinese-assets/main/';
    return `${base}${encodePath(meta.folderName)}/${encodeURIComponent(meta.fileName)}?t=${Date.now()}`;
  }

  async function saveMaterialToGithub() {
    const meta = getLessonMeta();
    const data = getMaterialData();

    if (!data.primaryTsv.trim() && !data.extraTsv.trim()) {
      alert('目前沒有可儲存的教材內容，請先 AI 生成或貼上教材。');
      return;
    }

    const content = JSON.stringify(data, null, 2);

    if (typeof window.uploadToGithub !== 'function') {
      setStatus('找不到 uploadToGithub。請在 Gemini 沙盒版本執行，或確認原本上傳函式存在。', 'error');
      alert('找不到 uploadToGithub，上傳功能無法執行。');
      return;
    }

    setStatus(`正在儲存到 GitHub：${meta.folderName}/${meta.fileName}`, 'loading');

    try {
      const result = await window.uploadToGithub(meta.folderName, meta.fileName, content, true);

      if (result && result.success) {
        setStatus(`✅ 已儲存：${meta.folderName}/${meta.fileName}`, 'success');
      } else {
        const reason = result?.status ? `代碼：${result.status}` : '未知原因';
        setStatus(`⚠️ 儲存失敗：${reason}`, 'warn');
        alert(`儲存失敗：${reason}\n如果你是在 GitHub Pages 開啟，這是正常的；請在 Gemini 沙盒版本執行上傳。`);
      }
    } catch (err) {
      console.error('saveMaterialToGithub error:', err);
      setStatus('❌ 儲存時發生錯誤，請看 console。', 'error');
      alert('儲存時發生錯誤，請確認 Gemini 沙盒上傳功能或 GitHub 權限。');
    }
  }

  async function loadMaterialFromGithub() {
    const meta = getLessonMeta();
    const url = getRawMaterialUrl(meta);
    setStatus(`正在讀取：${meta.folderName}/${meta.fileName}`, 'loading');

    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json();
      if (getEl('primary-tsv-input')) getEl('primary-tsv-input').value = data.primaryTsv || '';
      if (getEl('extra-tsv-input')) getEl('extra-tsv-input').value = data.extraTsv || '';

      setStatus(`✅ 已載入 GitHub 教材：${data.publisher || meta.publisher} ${data.grade || meta.grade} ${data.semester || meta.semester} ${data.lesson || meta.lesson}`, 'success');
    } catch (err) {
      console.warn('loadMaterialFromGithub error:', err);
      setStatus('找不到本課已儲存教材，或 GitHub 尚未部署完成。', 'warn');
      alert(`找不到本課教材：\n${meta.folderName}/${meta.fileName}\n\n可能原因：尚未儲存、路徑不同，或 GitHub raw 檔案尚未更新。`);
    }
  }

  function copyMaterialJson() {
    const data = getMaterialData();
    const content = JSON.stringify(data, null, 2);

    navigator.clipboard?.writeText(content)
      .then(() => setStatus('已複製 JSON，可手動貼到 GitHub。', 'success'))
      .catch(() => {
        console.log(content);
        setStatus('無法自動複製，已輸出到 console。', 'warn');
      });
  }

  function insertMaterialPanel() {
    if (getEl(PATCH_ID)) return;

    const controls = getEl('teaching-controls');
    if (!controls) return;

    const box = document.createElement('div');
    box.id = PATCH_ID;
    box.className = 'bg-emerald-50 p-4 rounded-xl border border-emerald-100 mb-2';
    box.innerHTML = `
      <p class="text-sm font-bold text-emerald-800 mb-2">
        <i data-lucide="save" class="w-4 h-4 inline"></i> GitHub 教材存取
      </p>
      <button id="btn-save-material-github" class="w-full mb-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded-lg shadow-sm text-sm transition-transform hover:-translate-y-0.5">
        儲存本課教材到 GitHub
      </button>
      <button id="btn-load-material-github" class="w-full mb-2 bg-sky-500 hover:bg-sky-600 text-white font-bold py-2 px-4 rounded-lg shadow-sm text-sm transition-transform hover:-translate-y-0.5">
        從 GitHub 載入本課教材
      </button>
      <button id="btn-copy-material-json" class="w-full mb-2 bg-slate-500 hover:bg-slate-600 text-white font-bold py-2 px-4 rounded-lg shadow-sm text-sm transition-transform hover:-translate-y-0.5">
        複製教材 JSON
      </button>
      <div id="material-github-status" class="text-xs font-bold text-slate-500 min-h-[1.25rem]">等待操作...</div>
    `;

    const firstChild = controls.firstElementChild;
    if (firstChild) controls.insertBefore(box, firstChild);
    else controls.appendChild(box);

    getEl('btn-save-material-github')?.addEventListener('click', saveMaterialToGithub);
    getEl('btn-load-material-github')?.addEventListener('click', loadMaterialFromGithub);
    getEl('btn-copy-material-json')?.addEventListener('click', copyMaterialJson);

    if (window.lucide) window.lucide.createIcons();
  }

  function applyPatch() {
    loadWorksheetExportPatch();
    insertMaterialPanel();
  }

  window.saveMaterialToGithub = saveMaterialToGithub;
  window.loadMaterialFromGithub = loadMaterialFromGithub;
  window.copyMaterialJson = copyMaterialJson;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyPatch);
  } else {
    applyPatch();
  }

  window.addEventListener('load', applyPatch);
  setTimeout(applyPatch, 300);
  setTimeout(applyPatch, 1200);
})();
