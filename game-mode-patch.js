// 局部修補：讓「聽力闖關」可以正常使用
(function () {
  const GAME_TOTAL_LIMIT = 10;

  function el(id) { return document.getElementById(id); }

  function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function showFlex(node) {
    if (!node) return;
    node.classList.remove('hidden');
    node.classList.add('flex');
  }

  function hideFlex(node) {
    if (!node) return;
    node.classList.add('hidden');
    node.classList.remove('flex');
  }

  function getCurrentChars() {
    if (Array.isArray(window.state?.currentVocab) && window.state.currentVocab.length) {
      return window.state.currentVocab.filter(Boolean);
    }

    const pub = window.state?.selPub;
    const grade = window.state?.selGrade;
    const sem = window.state?.selSem;
    const les = window.state?.selLes;
    const fromDb = window.state?.db?.[pub]?.[grade]?.[sem]?.[les];
    if (Array.isArray(fromDb) && fromDb.length) return fromDb.filter(Boolean);

    return [];
  }

  async function getZhuyin(char) {
    const cached = window.state?.charInfo?.[char]?.zhuyin;
    if (cached) return cached;

    try {
      const base = typeof GITHUB_REPO_BASE !== 'undefined'
        ? GITHUB_REPO_BASE
        : 'https://raw.githubusercontent.com/wang7567657-crypto/my-chinese-assets/main/';
      const res = await fetch(`${base}charInfo/${encodeURIComponent(char)}.json?t=${Date.now()}`);
      if (res.ok) {
        const data = await res.json();
        if (data.zhuyin) return data.zhuyin;
      }
    } catch (e) {
      console.warn('讀取注音失敗，改用國字語音', e);
    }

    return '';
  }

  function stopGameAudio() {
    try {
      if (window.gameData?.audio) {
        window.gameData.audio.pause();
        window.gameData.audio.currentTime = 0;
      }
      if (window.speechSynthesis) window.speechSynthesis.cancel();
    } catch (e) {}
  }

  async function playCurrentAudio() {
    const item = window.gameData?.questions?.[window.gameData.index];
    if (!item) return;

    stopGameAudio();

    const icon = el('game-speaker-icon');
    if (icon) icon.classList.add('animate-pulse', 'text-rose-500');

    const vol = parseFloat(el('audio-volume')?.value || '0.8');
    const base = typeof GITHUB_REPO_BASE !== 'undefined'
      ? GITHUB_REPO_BASE
      : 'https://raw.githubusercontent.com/wang7567657-crypto/my-chinese-assets/main/';

    const audioTargets = [];
    if (item.zhuyin) audioTargets.push(item.zhuyin);
    audioTargets.push(item.char);

    let played = false;
    for (const target of audioTargets) {
      try {
        const audio = new Audio(`${base}soundData/${encodeURIComponent(target)}.mp3?t=${Date.now()}`);
        audio.volume = Math.max(0, Math.min(1, vol));
        window.gameData.audio = audio;
        await audio.play();
        played = true;
        audio.onended = () => icon?.classList.remove('animate-pulse', 'text-rose-500');
        break;
      } catch (e) {
        played = false;
      }
    }

    if (!played && window.speechSynthesis) {
      try {
        const u = new SpeechSynthesisUtterance(item.zhuyin || item.char);
        u.lang = 'zh-TW';
        u.rate = 0.9;
        u.volume = Math.max(0, Math.min(1, vol));
        u.onend = () => icon?.classList.remove('animate-pulse', 'text-rose-500');
        window.speechSynthesis.speak(u);
      } catch (e) {
        icon?.classList.remove('animate-pulse', 'text-rose-500');
      }
    }
  }

  function buildOptions(answer, allChars) {
    const wrongPool = shuffle(allChars.filter(c => c !== answer));
    const options = [answer, ...wrongPool.slice(0, 3)];
    return shuffle(options);
  }

  function renderQuestion() {
    const gd = window.gameData;
    const item = gd.questions[gd.index];
    if (!item) return finishGame();

    gd.isAnswering = false;

    const progress = el('game-progress');
    const score = el('game-score');
    const zhuyinDisplay = el('game-zhuyin-display');
    const optionsContainer = el('game-options-container');

    if (progress) progress.textContent = `第 ${gd.index + 1} / ${gd.questions.length} 題`;
    if (score) score.textContent = gd.score;
    if (zhuyinDisplay) zhuyinDisplay.textContent = item.zhuyin || '聽聲音選字';

    const options = buildOptions(item.char, gd.allChars);
    optionsContainer.innerHTML = options.map(char => `
      <button type="button" data-game-option="${char}" class="game-option-btn bg-white hover:bg-indigo-50 border-[4px] border-indigo-100 hover:border-indigo-400 text-indigo-900 rounded-3xl py-7 md:py-8 text-6xl md:text-7xl font-black shadow-md hover:shadow-xl transition-all active:scale-95" style="font-family:'Kaiti TC','BiauKai','DFKai-SB',serif;">
        ${char}
      </button>
    `).join('');

    optionsContainer.querySelectorAll('[data-game-option]').forEach(btn => {
      btn.addEventListener('click', () => chooseAnswer(btn.dataset.gameOption, btn));
    });

    if (window.lucide) window.lucide.createIcons();
    setTimeout(playCurrentAudio, 350);
  }

  function chooseAnswer(choice, btn) {
    const gd = window.gameData;
    if (!gd || gd.isAnswering) return;
    gd.isAnswering = true;
    stopGameAudio();

    const item = gd.questions[gd.index];
    const isCorrect = choice === item.char;

    const buttons = document.querySelectorAll('[data-game-option]');
    buttons.forEach(b => {
      b.disabled = true;
      if (b.dataset.gameOption === item.char) {
        b.classList.remove('border-indigo-100', 'bg-white');
        b.classList.add('border-emerald-400', 'bg-emerald-100', 'text-emerald-800');
      }
    });

    if (isCorrect) {
      gd.score += 10;
      btn.classList.add('scale-105');
    } else {
      btn.classList.remove('border-indigo-100', 'bg-white');
      btn.classList.add('border-rose-400', 'bg-rose-100', 'text-rose-700', 'animate-shake');
    }

    if (el('game-score')) el('game-score').textContent = gd.score;

    gd.nextQuestionTimer = setTimeout(() => {
      gd.index += 1;
      if (gd.index >= gd.questions.length) finishGame();
      else renderQuestion();
    }, isCorrect ? 800 : 1300);
  }

  function finishGame() {
    stopGameAudio();
    hideFlex(el('game-setup-screen'));
    hideFlex(el('game-play-screen'));
    showFlex(el('game-result-screen'));
    if (el('game-final-score')) el('game-final-score').textContent = window.gameData?.score || 0;
    if (window.lucide) window.lucide.createIcons();
  }

  window.initGame = function () {
    stopGameAudio();
    if (window.gameData?.nextQuestionTimer) clearTimeout(window.gameData.nextQuestionTimer);

    showFlex(el('game-setup-screen'));
    hideFlex(el('game-play-screen'));
    hideFlex(el('game-result-screen'));

    const chars = getCurrentChars();
    const setup = el('game-setup-screen');
    const oldNote = el('game-setup-note');
    if (oldNote) oldNote.remove();

    if (!chars.length && setup) {
      const note = document.createElement('div');
      note.id = 'game-setup-note';
      note.className = 'mt-4 text-rose-500 font-black text-center bg-rose-50 border border-rose-200 px-5 py-3 rounded-2xl';
      note.textContent = '請先回到生字教學載入課文，再進入聽力闖關。';
      setup.appendChild(note);
    }
  };

  window.startGame = async function () {
    const chars = Array.from(new Set(getCurrentChars()));
    if (!chars.length) {
      alert('請先載入一課生字，再開始聽力闖關。');
      window.toggleAppMode?.('teaching');
      return;
    }

    if (chars.length < 2) {
      alert('至少需要 2 個生字才能進行闖關。');
      return;
    }

    const selected = shuffle(chars).slice(0, Math.min(GAME_TOTAL_LIMIT, chars.length));
    const questions = [];
    for (const char of selected) {
      questions.push({ char, zhuyin: await getZhuyin(char) });
    }

    window.gameData = {
      allChars: chars,
      questions,
      index: 0,
      score: 0,
      isAnswering: false,
      audio: null,
      nextQuestionTimer: null
    };

    hideFlex(el('game-setup-screen'));
    hideFlex(el('game-result-screen'));
    showFlex(el('game-play-screen'));
    renderQuestion();
  };

  window.replayGameAudio = function () {
    playCurrentAudio();
  };

  function patchToggleGameCleanup() {
    if (window.__gamePatchToggleWrapped || typeof window.toggleAppMode !== 'function') return;
    const oldToggle = window.toggleAppMode;
    window.toggleAppMode = function (mode) {
      if (mode !== 'game') stopGameAudio();
      const result = oldToggle.apply(this, arguments);
      if (mode === 'game') setTimeout(() => window.initGame(), 50);
      return result;
    };
    window.__gamePatchToggleWrapped = true;
  }

  function applyPatch() {
    patchToggleGameCleanup();
    if (window.lucide) window.lucide.createIcons();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', applyPatch);
  else applyPatch();
  window.addEventListener('load', applyPatch);
  setTimeout(applyPatch, 300);
  setTimeout(applyPatch, 1200);
})();
