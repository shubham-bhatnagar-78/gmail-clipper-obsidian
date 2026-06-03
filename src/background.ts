chrome.runtime.onInstalled.addListener(() => {
  console.log('Obsidian Gmail Clipper installed');
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'contentScriptReady') {
    console.log('Content script ready on tab', sender.tab?.id);
  }

  if (message.action === 'ensureContentScript') {
    const tabId = message.tabId;
    if (!tabId) { sendResponse({ success: false }); return true; }

    chrome.scripting.executeScript({
      target: { tabId },
      files: ['content.js'],
    }).then(() => {
      sendResponse({ success: true });
    }).catch(() => {
      // Already loaded or other error — still OK
      sendResponse({ success: true });
    });
    return true;
  }

  if (message.action === 'downloadMarkdown') {
    const { filename, content } = message;
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    chrome.downloads.download({
      url,
      filename: `${filename}.md`,
      saveAs: true,
    });
    sendResponse({ success: true });
    return true;
  }
});
