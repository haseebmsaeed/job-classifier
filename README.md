# Job Classifier

A Chrome extension that analyzes job postings against your profile using AI. Click the extension icon on any job listing to instantly see your match score, which skills you have, and which ones you're missing.

---

## Download

1. Go to the [Releases](../../releases) page of this repository
2. Download the latest `job-classifier.zip`
3. Unzip it to a permanent folder on your computer (e.g. `~/Downloads/job-classifier`)

> Do not delete the folder after installing — Chrome loads the extension directly from it.

If you prefer to clone instead:

```bash
git clone https://github.com/haseebsaeed/job-classifier.git
```

---

## Install in Chrome

1. Open Chrome and navigate to `chrome://extensions`
2. Enable **Developer mode** using the toggle in the top-right corner
3. Click **Load unpacked**
4. Select the `job-classifier` folder you downloaded/cloned
5. The extension icon (blue square) will appear in your toolbar — if it's hidden, click the puzzle piece icon and pin it

---

## Get an OpenAI API Key

The extension uses OpenAI's `gpt-4o-mini` model to classify jobs. You need an API key to use it.

1. Go to [platform.openai.com](https://platform.openai.com) and sign in (or create a free account)
2. Click your profile icon in the top-right → **Your profile** → **User API keys** — or go directly to [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
3. Click **Create new secret key**, give it a name (e.g. `job-classifier`), and click **Create**
4. Copy the key — it starts with `sk-` — and save it somewhere safe. You won't be able to see it again.

> **Cost:** `gpt-4o-mini` costs $0.15 per million input tokens. Each job analysis uses roughly 1,000–2,000 tokens, so you can analyze thousands of jobs for less than a dollar.

---

## Setup

1. Click the extension icon in your toolbar
2. When the overlay appears, click **Open Settings**
   - Or right-click the extension icon and choose **Options**
3. Paste your OpenAI API key into the **OpenAI API Key** field
4. Paste your resume, bio, or a list of your skills into the **Your Profile** field — the more detail you include, the more accurate the match will be
5. Click **Save Settings**

---

## Usage

1. Navigate to any job posting (LinkedIn, Greenhouse, Lever, Indeed, etc.)
2. Click the extension icon
3. A panel slides in with:
   - Job title and company
   - Match score (0–100%)
   - Skills you already have
   - Skills you're missing
   - A short summary
4. Click **✕** to dismiss the panel

---

## Notes

- Your API key and profile are stored in Chrome's local sync storage and are never sent anywhere except directly to OpenAI's API.
- The extension only runs when you click the icon — it does not scan pages automatically.
- If a page is not a job posting, the panel will say so and close.
