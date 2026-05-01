const form = document.getElementById("settings-form");
const apiKeyInput = document.getElementById("api-key");
const profileInput = document.getElementById("profile");
const saveStatus = document.getElementById("save-status");

chrome.storage.sync.get(["apiKey", "profile"], ({ apiKey, profile }) => {
  if (apiKey) apiKeyInput.value = apiKey;
  if (profile) profileInput.value = profile;
});

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const apiKey = apiKeyInput.value.trim();
  const profile = profileInput.value.trim();

  chrome.storage.sync.set({ apiKey, profile }, () => {
    saveStatus.textContent = "Saved!";
    saveStatus.classList.add("visible");
    setTimeout(() => {
      saveStatus.textContent = "";
      saveStatus.classList.remove("visible");
    }, 2000);
  });
});
