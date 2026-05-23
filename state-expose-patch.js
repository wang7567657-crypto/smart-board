// 局部修補：把 index.html 裡的 const state 暴露給外部補丁使用。
// 原因：index.html 使用 const state，外部 JS 不能用 window.state 直接取得，所以練習工坊抓不到已載入生字。
(function () {
  function exposeState() {
    try {
      if (typeof state !== 'undefined' && state && !window.state) {
        window.state = state;
      }
    } catch (e) {}
  }

  exposeState();
  window.addEventListener('load', exposeState);
  setTimeout(exposeState, 100);
  setTimeout(exposeState, 500);
  setTimeout(exposeState, 1200);
})();
