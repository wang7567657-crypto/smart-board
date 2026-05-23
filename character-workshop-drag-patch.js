// 修補：讓「部件拼貼」改成拖曳操作。
// 做法：不改原本拼貼邏輯，改用拖曳後自動觸發「選部件 → 放入格子」。
(function () {
  const STYLE_ID = 'cwf-drag-patch-style';
  let drag = null;

  function el(id) { return document.getElementById(id); }

  function installStyle() {
    if (el(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .cwf-card { cursor: grab !important; touch-action: none; user-select: none; }
      .cwf-card:active { cursor: grabbing !important; }
      .cwf-slot { transition: transform .15s ease, border-color .15s ease, background .15s ease; }
      .cwf-slot.cwf-drag-over { transform: scale(1.05); border-color: #f59e0b !important; background: #fffbeb !important; }
      .cwf-drag-ghost {
        position: fixed;
        z-index: 1000001;
        width: 84px;
        height: 70px;
        border-radius: 16px;
        border: 3px solid #f59e0b;
        background: #fff7ed;
        color: #0f172a;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 36px;
        font-weight: 900;
        font-family: 'Kaiti TC','BiauKai','DFKai-SB',serif;
        box-shadow: 0 14px 30px rgba(15,23,42,.28);
        pointer-events: none;
        transform: translate(-50%, -50%) scale(1.05);
      }
      .cwf-drag-tip {
        margin-top: 8px;
        text-align: center;
        color: #0f766e;
        font-weight: 900;
        font-size: 14px;
      }
    `;
    document.head.appendChild(style);
  }

  function closestCard(target) {
    return target && target.closest ? target.closest('[data-part]') : null;
  }

  function closestSlot(target) {
    return target && target.closest ? target.closest('[data-slot]') : null;
  }

  function clearOver() {
    document.querySelectorAll('.cwf-slot.cwf-drag-over').forEach(x => x.classList.remove('cwf-drag-over'));
  }

  function setGhostPosition(x, y) {
    if (!drag || !drag.ghost) return;
    drag.ghost.style.left = x + 'px';
    drag.ghost.style.top = y + 'px';
  }

  function endDrag(x, y) {
    if (!drag) return;
    const card = drag.card;
    const ghost = drag.ghost;
    clearOver();
    if (ghost) ghost.remove();

    const target = document.elementFromPoint(x, y);
    const slot = closestSlot(target);
    if (slot && card) {
      // 使用原本已存在的點選邏輯：先點部件，再點格子。
      card.click();
      setTimeout(() => slot.click(), 20);
    }
    drag = null;
  }

  function onPointerDown(e) {
    const card = closestCard(e.target);
    if (!card) return;
    // 只接管練習工坊裡的部件卡，不影響其他按鈕。
    if (!card.closest('#cw-fix-modal')) return;
    e.preventDefault();

    const part = card.dataset.part || card.textContent.trim();
    const ghost = document.createElement('div');
    ghost.className = 'cwf-drag-ghost';
    ghost.textContent = part;
    document.body.appendChild(ghost);

    drag = { card, ghost };
    setGhostPosition(e.clientX, e.clientY);
  }

  function onPointerMove(e) {
    if (!drag) return;
    e.preventDefault();
    setGhostPosition(e.clientX, e.clientY);
    clearOver();
    const target = document.elementFromPoint(e.clientX, e.clientY);
    const slot = closestSlot(target);
    if (slot && slot.closest('#cw-fix-modal')) slot.classList.add('cwf-drag-over');
  }

  function onPointerUp(e) {
    if (!drag) return;
    e.preventDefault();
    endDrag(e.clientX, e.clientY);
  }

  function enableNativeDrag() {
    document.querySelectorAll('#cw-fix-modal [data-part]').forEach(card => {
      if (card.dataset.dragReady) return;
      card.dataset.dragReady = '1';
      card.setAttribute('draggable', 'true');
      card.addEventListener('dragstart', ev => {
        ev.dataTransfer.setData('text/plain', card.dataset.part || card.textContent.trim());
        ev.dataTransfer.effectAllowed = 'move';
        window.__cwfNativeDragCard = card;
      });
    });

    document.querySelectorAll('#cw-fix-modal [data-slot]').forEach(slot => {
      if (slot.dataset.dropReady) return;
      slot.dataset.dropReady = '1';
      slot.addEventListener('dragover', ev => {
        ev.preventDefault();
        slot.classList.add('cwf-drag-over');
      });
      slot.addEventListener('dragleave', () => slot.classList.remove('cwf-drag-over'));
      slot.addEventListener('drop', ev => {
        ev.preventDefault();
        slot.classList.remove('cwf-drag-over');
        const card = window.__cwfNativeDragCard;
        if (card) {
          card.click();
          setTimeout(() => slot.click(), 20);
        }
      });
    });

    const bank = document.querySelector('#cw-fix-modal .cwf-bank');
    if (bank && !document.getElementById('cwf-drag-tip')) {
      const tip = document.createElement('div');
      tip.id = 'cwf-drag-tip';
      tip.className = 'cwf-drag-tip';
      tip.textContent = '請把部件拖到右邊格子中';
      bank.insertAdjacentElement('afterend', tip);
    }
  }

  function apply() {
    installStyle();
    enableNativeDrag();
  }

  document.addEventListener('pointerdown', onPointerDown, true);
  document.addEventListener('pointermove', onPointerMove, true);
  document.addEventListener('pointerup', onPointerUp, true);
  document.addEventListener('pointercancel', () => {
    if (drag && drag.ghost) drag.ghost.remove();
    drag = null;
    clearOver();
  }, true);

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', apply);
  else apply();
  window.addEventListener('load', apply);
  setInterval(apply, 600);
})();
