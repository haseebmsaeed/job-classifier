if (window.__jobClassifierLoaded) {
  // already injected — nothing to do
} else {

window.__jobClassifierLoaded = true;

const OVERLAY_ID = "job-classifier-overlay";

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  switch (message.type) {
    case "PING":
      sendResponse({});
      break;
    case "SCRAPE_PAGE":
      sendResponse({ text: scrapePage() });
      break;
    case "START_ANALYSIS":
      showOverlay("loading");
      sendResponse({});
      break;
    case "SHOW_RESULT":
      showOverlay("result", message.data);
      sendResponse({});
      break;
    case "SHOW_NEEDS_CONFIG":
      showOverlay("needs-config");
      sendResponse({});
      break;
    case "SHOW_ERROR":
      showOverlay("error", { message: message.message });
      sendResponse({});
      break;
  }
  return true;
});

function scrapePage() {
  const parts = [];

  const title = document.title;
  if (title) parts.push(`Title: ${title}`);

  const metaDesc = document.querySelector('meta[name="description"]')?.content;
  if (metaDesc) parts.push(`Meta description: ${metaDesc}`);

  document.querySelectorAll("h1, h2, h3").forEach((el) => {
    const text = el.innerText?.trim();
    if (text) parts.push(text);
  });

  document.querySelectorAll("p, li").forEach((el) => {
    const text = el.innerText?.trim();
    if (text && text.length > 20) parts.push(text);
  });

  return parts.join("\n").slice(0, 8000);
}

function getOrCreateOverlay() {
  let overlay = document.getElementById(OVERLAY_ID);
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = OVERLAY_ID;
    document.body.appendChild(overlay);
  }
  return overlay;
}

function showOverlay(state, data = {}) {
  const overlay = getOrCreateOverlay();
  overlay.className = "";
  overlay.innerHTML = buildOverlayHTML(state, data);

  const closeBtn = overlay.querySelector(".jc-close");
  if (closeBtn) {
    closeBtn.addEventListener("click", () => overlay.remove());
  }

  const settingsLink = overlay.querySelector(".jc-settings-link");
  if (settingsLink) {
    settingsLink.addEventListener("click", () => {
      chrome.runtime.sendMessage({ type: "OPEN_OPTIONS" });
    });
  }
}

function buildOverlayHTML(state, data) {
  const header = `
    <div class="jc-header">
      <span class="jc-title">Job Classifier</span>
      <button class="jc-close" aria-label="Close">&#10005;</button>
    </div>`;

  if (state === "loading") {
    return `<div class="jc-panel jc-loading">${header}<div class="jc-body"><div class="jc-spinner"></div><p>Analyzing page…</p></div></div>`;
  }

  if (state === "needs-config") {
    return `<div class="jc-panel">${header}<div class="jc-body jc-config-msg"><p>Set your API key and profile before analyzing.</p><button class="jc-settings-link jc-btn">Open Settings</button></div></div>`;
  }

  if (state === "error") {
    return `<div class="jc-panel jc-error">${header}<div class="jc-body"><p class="jc-error-text">${escHtml(data.message || "An error occurred.")}</p></div></div>`;
  }

  if (state === "result") {
    if (!data.isJobPosting) {
      const hint = data.charCount
        ? `Analyzed ${data.charCount.toLocaleString()} characters — no job description found.`
        : "No job description found on this page.";
      return `<div class="jc-panel">${header}<div class="jc-body"><p class="jc-not-job">Not a job posting.</p><p class="jc-not-job-hint">${escHtml(hint)}</p></div></div>`;
    }

    const score = Math.max(0, Math.min(100, Math.round(data.matchScore ?? 0)));
    const scoreClass = score >= 70 ? "jc-score-high" : score >= 40 ? "jc-score-mid" : "jc-score-low";

    const matchedHTML = (data.matchedSkills ?? []).length
      ? `<div class="jc-skills-section"><div class="jc-skills-label jc-matched-label">Matched Skills</div><ul class="jc-skills-list">${(data.matchedSkills ?? []).map((s) => `<li class="jc-skill jc-skill-match"><span class="jc-check">&#10003;</span>${escHtml(s)}</li>`).join("")}</ul></div>`
      : "";

    const missingHTML = (data.missingSkills ?? []).length
      ? `<div class="jc-skills-section"><div class="jc-skills-label jc-missing-label">Missing Skills</div><ul class="jc-skills-list">${(data.missingSkills ?? []).map((s) => `<li class="jc-skill jc-skill-missing"><span class="jc-cross">&#10007;</span>${escHtml(s)}</li>`).join("")}</ul></div>`
      : "";

    const summaryHTML = data.summary
      ? `<p class="jc-summary">${escHtml(data.summary)}</p>`
      : "";

    return `
      <div class="jc-panel">
        ${header}
        <div class="jc-body">
          <div class="jc-job-info">
            ${data.jobTitle ? `<div class="jc-job-title">${escHtml(data.jobTitle)}</div>` : ""}
            ${data.company ? `<div class="jc-company">${escHtml(data.company)}</div>` : ""}
          </div>
          <div class="jc-score-section">
            <div class="jc-score-label">Match Score</div>
            <div class="jc-score-bar-wrap">
              <div class="jc-score-bar ${scoreClass}" style="width:${score}%"></div>
            </div>
            <div class="jc-score-value ${scoreClass}">${score}%</div>
          </div>
          ${matchedHTML}
          ${missingHTML}
          ${summaryHTML}
        </div>
      </div>`;
  }

  return "";
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

} // end __jobClassifierLoaded guard
