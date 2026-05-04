const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";
const OPENAI_MODEL = "gpt-4o-mini";
const MAX_PAGE_TEXT = 8000;

chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "OPEN_OPTIONS") {
    chrome.runtime.openOptionsPage();
  }
});

chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id) return;

  const url = tab.url ?? "";
  if (url.startsWith("chrome://") || url.startsWith("chrome-extension://") || url.startsWith("about:")) {
    return;
  }

  try {
    await ensureContentScript(tab.id);
  } catch {
    return;
  }

  const { apiKey, profile } = await chrome.storage.sync.get(["apiKey", "profile"]);

  if (!apiKey || !profile) {
    await sendToTab(tab.id, { type: "SHOW_NEEDS_CONFIG" });
    return;
  }

  await sendToTab(tab.id, { type: "START_ANALYSIS" });

  let pageText;
  try {
    const response = await sendToTab(tab.id, { type: "SCRAPE_PAGE" });
    pageText = response?.text;
  } catch {
    await sendToTab(tab.id, { type: "SHOW_ERROR", message: "Could not read page content. Try reloading the tab and clicking the extension again." });
    return;
  }

  if (!pageText) {
    await sendToTab(tab.id, { type: "SHOW_ERROR", message: "No readable content found on this page." });
    return;
  }

  let result;
  try {
    result = await classifyWithOpenAI(apiKey, profile, pageText);
  } catch (err) {
    await sendToTab(tab.id, { type: "SHOW_ERROR", message: err.message || "OpenAI API error." });
    return;
  }

  await sendToTab(tab.id, { type: "SHOW_RESULT", data: { ...result, charCount: pageText.length } });
});

async function ensureContentScript(tabId) {
  try {
    await sendToTab(tabId, { type: "PING" });
  } catch {
    await chrome.scripting.executeScript({ target: { tabId }, files: ["content.js"] });
    await chrome.scripting.insertCSS({ target: { tabId }, files: ["content.css"] });
  }
}

async function classifyWithOpenAI(apiKey, profile, pageText) {
  const truncated = pageText.slice(0, MAX_PAGE_TEXT);

  const response = await fetch(OPENAI_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      max_tokens: 1024,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You are a job-match assistant. Analyze the webpage text and decide if it is a job posting.
Return ONLY valid JSON matching this exact schema — no markdown fences, no explanation, no extra text:
{
  "isJobPosting": boolean,
  "jobTitle": string | null,
  "company": string | null,
  "matchScore": number,
  "matchedSkills": string[],
  "missingSkills": string[],
  "summary": string
}
matchScore is 0-100. matchedSkills and missingSkills list specific technologies/skills. summary is 1-2 sentences.`,
        },
        {
          role: "user",
          content: `## My Profile\n${profile}\n\n## Webpage Content\n${truncated}`,
        },
      ],
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    if (response.status === 401) throw new Error("Invalid API key. Check your settings.");
    if (response.status === 429) throw new Error("OpenAI rate limit hit. Wait a moment and try again.");
    throw new Error(`API error ${response.status}: ${body.slice(0, 200)}`);
  }

  const json = await response.json();
  const text = json.choices?.[0]?.message?.content ?? "";

  try {
    return JSON.parse(text);
  } catch {
    throw new Error("OpenAI returned invalid JSON.");
  }
}

function sendToTab(tabId, message) {
  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tabId, message, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve(response);
      }
    });
  });
}
