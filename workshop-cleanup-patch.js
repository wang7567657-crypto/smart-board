// 清理舊版練習工坊入口，避免多個版本互相干擾。
(function(){
  function cleanup(){
    ['tab-workshop','tab-workshop-template'].forEach(function(id){var x=document.getElementById(id); if(x) x.remove();});
  }
  cleanup();
  window.addEventListener('load', cleanup);
  setInterval(cleanup, 1000);
})();
