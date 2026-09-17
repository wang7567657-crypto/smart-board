(() => {
  "use strict";

  if (window.__sunshineAiApprovalGuardInstalled) return;
  window.__sunshineAiApprovalGuardInstalled = true;

  const originalFetch = window.fetch.bind(window);
  let activeApproval = null;
  let approvedUntil = 0;

  function readRequest(input, init = {}) {
    const url = typeof input === "string" ? input : (input && input.url) || "";
    const method = String(init.method || (input && input.method) || "GET").toUpperCase();
    const body = typeof init.body === "string" ? init.body : "";
    return { url, method, body };
  }

  function isAiTodoRequest(input, init) {
    const { url, method, body } = readRequest(input, init);
    if (method === "GET" || method === "HEAD" || method === "OPTIONS") return false;

    const aiEndpoint =
      /sunshine-request-bridge/i.test(url) ||
      /\/api\/(?:generate|ai|queue|request|pending|lesson)/i.test(url) ||
      /aiRequests\/pending/i.test(url);

    const aiPayload =
      /"taskType"\s*:/i.test(body) ||
      /"requestId"\s*:/i.test(body) ||
      /"uploadToGithub"\s*:\s*true/i.test(body);

    return aiEndpoint || (/workers\.dev/i.test(url) && aiPayload);
  }

  function requestSummary(input, init) {
    const { url, body } = readRequest(input, init);
    let data = null;
    try { data = body ? JSON.parse(body) : null; } catch (_) {}

    const source = data && data.input ? data.input : (data || {});
    const parts = [
      source.publisher,
      source.grade,
      source.semester,
      source.lesson,
      data && data.taskType,
      source.char ? `生字：${source.char}` : "",
      source.targetChar ? `生字：${source.targetChar}` : ""
    ].filter(Boolean);

    if (parts.length) return parts.join("・");
    if (/generate-image/i.test(url)) return "產生圖片並建立 AI 任務";
    if (/generate-vocab/i.test(url)) return "產生造詞並建立 AI 任務";
    return "智慧黑板準備建立新的 AI 待辦";
  }

  function ensureStyles() {
    if (document.getElementById("sunshine-ai-approval-style")) return;
    const style = document.createElement("style");
    style.id = "sunshine-ai-approval-style";
    style.textContent = `
      #sunshine-ai-approval {
        position: fixed; inset: 0; z-index: 2147483647;
        display: flex; align-items: center; justify-content: center;
        padding: 20px; background: rgba(15, 23, 42, .72);
        backdrop-filter: blur(5px);
      }
      #sunshine-ai-approval .approval-card {
        width: min(520px, 100%); border-radius: 24px; background: #fff;
        padding: 28px; box-shadow: 0 28px 80px rgba(15, 23, 42, .35);
        font-family: system-ui, -apple-system, "Segoe UI", "Noto Sans TC", sans-serif;
      }
      #sunshine-ai-approval .approval-icon {
        width: 58px; height: 58px; border-radius: 18px;
        display: grid; place-items: center; margin-bottom: 18px;
        color: #7c3aed; background: #ede9fe; font-size: 30px;
      }
      #sunshine-ai-approval h2 { margin: 0 0 10px; color: #0f172a; font-size: 24px; }
      #sunshine-ai-approval p { margin: 0; color: #475569; line-height: 1.7; }
      #sunshine-ai-approval .approval-summary {
        margin-top: 16px; padding: 14px 16px; border-radius: 14px;
        background: #f8fafc; border: 1px solid #e2e8f0;
        color: #334155; font-weight: 700; overflow-wrap: anywhere;
      }
      #sunshine-ai-approval .approval-note {
        margin-top: 12px; color: #64748b; font-size: 14px;
      }
      #sunshine-ai-approval .approval-actions {
        display: grid; grid-template-columns: 1fr 1.35fr; gap: 12px; margin-top: 24px;
      }
      #sunshine-ai-approval button {
        min-height: 50px; border: 0; border-radius: 14px;
        font-size: 17px; font-weight: 800; cursor: pointer;
      }
      #sunshine-ai-cancel { color: #475569; background: #e2e8f0; }
      #sunshine-ai-approve { color: #fff; background: #7c3aed; }
      #sunshine-ai-approve:hover { background: #6d28d9; }
      #sunshine-ai-cancel:hover { background: #cbd5e1; }
      @media (max-width: 520px) {
        #sunshine-ai-approval .approval-card { padding: 22px; border-radius: 20px; }
        #sunshine-ai-approval .approval-actions { grid-template-columns: 1fr; }
      }
    `;
    document.head.appendChild(style);
  }

  function askForApproval(summary) {
    if (Date.now() < approvedUntil) return Promise.resolve(true);
    if (activeApproval) return activeApproval;

    activeApproval = new Promise((resolve) => {
      ensureStyles();

      const overlay = document.createElement("div");
      overlay.id = "sunshine-ai-approval";
      overlay.setAttribute("role", "dialog");
      overlay.setAttribute("aria-modal", "true");
      overlay.setAttribute("aria-labelledby", "sunshine-ai-approval-title");
      overlay.innerHTML = `
        <div class="approval-card">
          <div class="approval-icon">✦</div>
          <h2 id="sunshine-ai-approval-title">要送出 AI 待辦嗎？</h2>
          <p>智慧黑板尚未送出資料。請先確認這次要建立的內容：</p>
          <div class="approval-summary"></div>
          <p class="approval-note">按下「同意送出」後，這次操作產生的同批待辦才會送出。</p>
          <div class="approval-actions">
            <button id="sunshine-ai-cancel" type="button">取消</button>
            <button id="sunshine-ai-approve" type="button">同意送出</button>
          </div>
        </div>
      `;
      overlay.querySelector(".approval-summary").textContent = summary;
      document.body.appendChild(overlay);

      const finish = (approved) => {
        document.removeEventListener("keydown", onKeydown);
        overlay.remove();
        if (approved) approvedUntil = Date.now() + 8000;
        activeApproval = null;
        resolve(approved);
      };
      const onKeydown = (event) => {
        if (event.key === "Escape") finish(false);
      };

      overlay.querySelector("#sunshine-ai-cancel").addEventListener("click", () => finish(false));
      overlay.querySelector("#sunshine-ai-approve").addEventListener("click", () => finish(true));
      document.addEventListener("keydown", onKeydown);
      overlay.querySelector("#sunshine-ai-approve").focus();
    });

    return activeApproval;
  }

  window.fetch = async function(input, init) {
    if (isAiTodoRequest(input, init)) {
      const approved = await askForApproval(requestSummary(input, init));
      if (!approved) {
        return new Response(JSON.stringify({
          ok: false,
          cancelled: true,
          error: "使用者取消送出 AI 待辦"
        }), {
          status: 499,
          headers: { "Content-Type": "application/json; charset=utf-8" }
        });
      }
    }
    return originalFetch(input, init);
  };
})();
