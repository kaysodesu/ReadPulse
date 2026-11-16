// ReadPulse popup logic
const WORDS_PER_MINUTE = 200;

const els = {
  words: document.getElementById("words"),
  chars: document.getElementById("chars"),
  time: document.getElementById("time"),
  button: document.getElementById("analyze"),
  label: document.getElementById("analyze-label"),
  message: document.getElementById("message"),
};

const numberFormat = new Intl.NumberFormat();

// Pure helpers (also exported for testing in Node).
function countWords(text) {
  return text.split(/\s+/).filter(Boolean).length;
}

function countChars(text) {
  return text.length;
}

function formatReadingTime(words) {
  if (words === 0) return "0 min";
  const minutes = words / WORDS_PER_MINUTE;
  if (minutes < 1) return "< 1 min";
  return `${Math.round(minutes)} min`;
}

function setLoading(isLoading) {
  document.body.classList.toggle("loading", isLoading);
  els.button.disabled = isLoading;
  els.label.textContent = isLoading ? "Analyzing…" : "Analyze page";
}

function showMessage(text, isError = false) {
  els.message.textContent = text;
  els.message.classList.toggle("error", isError);
}

function resetStats() {
  els.words.textContent = "–";
  els.chars.textContent = "–";
  els.time.textContent = "–";
}

function friendlyError(error, url) {
  const restricted = /^(chrome|edge|about|chrome-extension|devtools|view-source):/i;
  if (url && (restricted.test(url) || url.startsWith("https://chromewebstore.google.com") || url.startsWith("https://chrome.google.com/webstore"))) {
    return "Chrome doesn't let extensions read this page. Try a regular website.";
  }
  if (url && url.startsWith("file:")) {
    return "To read local files, enable \"Allow access to file URLs\" for ReadPulse in chrome://extensions.";
  }
  const msg = (error && error.message) || "";
  if (/cannot be scripted|cannot access|extensions gallery/i.test(msg)) {
    return "Chrome doesn't let extensions read this page. Try a regular website.";
  }
  return "Couldn't read this page. Try reloading it and analyzing again.";
}

async function analyze() {
  setLoading(true);
  showMessage("");
  let tab;

  try {
    [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || tab.id === undefined) throw new Error("No active tab found.");

    const [result] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => (document.body ? document.body.innerText : ""),
    });

    const text = (result && result.result) || "";
    const words = countWords(text);
    const chars = countChars(text);

    els.words.textContent = numberFormat.format(words);
    els.chars.textContent = numberFormat.format(chars);
    els.time.textContent = formatReadingTime(words);

    showMessage(words === 0 ? "No readable text found on this page." : `Based on ${WORDS_PER_MINUTE} words per minute.`);
  } catch (error) {
    resetStats();
    showMessage(friendlyError(error, tab && tab.url), true);
  } finally {
    setLoading(false);
  }
}

if (els.button) {
  els.button.addEventListener("click", analyze);
}

if (typeof module !== "undefined") {
  module.exports = { countWords, countChars, formatReadingTime };
}
