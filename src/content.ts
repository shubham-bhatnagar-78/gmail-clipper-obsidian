import { extractThread, isGmailEmailView, debugSelectors } from './utils/gmail-extractor';
import type { EmailThread } from './types/email';

interface ExtractResponse {
  success: boolean;
  thread?: EmailThread;
  error?: string;
  isEmailView: boolean;
  debug?: Record<string, unknown>;
}

function handleExtractRequest(): ExtractResponse {
  if (!isGmailEmailView()) {
    // Even if not "email view", try to extract — maybe our detection is wrong
    const debug = debugSelectors();
    const thread = extractThread();
    if (thread && thread.messages.length > 0) {
      return { success: true, thread, isEmailView: true, debug };
    }
    return {
      success: false,
      isEmailView: false,
      error: 'No email body found in DOM',
      debug,
    };
  }

  try {
    const thread = extractThread();
    if (!thread || thread.messages.length === 0) {
      return {
        success: false,
        isEmailView: true,
        error: 'Found email view but could not extract messages',
        debug: debugSelectors(),
      };
    }
    return { success: true, thread, isEmailView: true };
  } catch (err) {
    return {
      success: false,
      isEmailView: true,
      error: String(err),
      debug: debugSelectors(),
    };
  }
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.action === 'extractEmail') {
    const result = handleExtractRequest();
    sendResponse(result);
    return true;
  }

  if (message.action === 'checkGmail') {
    sendResponse({ isEmailView: isGmailEmailView() });
    return true;
  }

  if (message.action === 'debugSelectors') {
    sendResponse(debugSelectors());
    return true;
  }
});

chrome.runtime.sendMessage({ action: 'contentScriptReady' });
