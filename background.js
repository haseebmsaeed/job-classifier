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
    await sendToTab(tab.id, { type: "SHOW_ERROR", message: "Could not scrape page." });
    return;
  }

  if (!pageText) {
    await sendToTab(tab.id, { type: "SHOW_ERROR", message: "No page content found." });
    return;
  }

  let result;
  try {
    result = await classifyWithOpenAI(apiKey, profile, pageText);
  } catch (err) {
    await sendToTab(tab.id, { type: "SHOW_ERROR", message: err.message || "OpenAI API error." });
    return;
  }

  await sendToTab(tab.id, { type: "SHOW_RESULT", data: result });
});

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
