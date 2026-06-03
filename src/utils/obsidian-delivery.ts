import type { ClipResult, ClipperSettings } from '../types/email';

// Tiered delivery: obsidian:// URI → clipboard → file download
export async function deliverToObsidian(
  clip: ClipResult,
  settings: ClipperSettings,
): Promise<{ success: boolean; method: string; error?: string }> {
  const method = settings.deliveryMethod;

  if (method === 'obsidian-uri') {
    const result = await tryObsidianUri(clip, settings);
    if (result.success) return result;
    // Fallback to clipboard
    const clipboardResult = await tryClipboard(clip);
    if (clipboardResult.success) return clipboardResult;
    return tryFileDownload(clip);
  }

  if (method === 'clipboard') {
    const result = await tryClipboard(clip);
    if (result.success) return result;
    return tryFileDownload(clip);
  }

  return tryFileDownload(clip);
}

async function tryObsidianUri(
  clip: ClipResult,
  settings: ClipperSettings,
): Promise<{ success: boolean; method: string; error?: string }> {
  try {
    if (!settings.vaultName) {
      return { success: false, method: 'obsidian-uri', error: 'Vault name required — set it in Settings' };
    }

    await navigator.clipboard.writeText(clip.markdown);

    // Build URI manually — URLSearchParams encodes spaces as + which Obsidian reads literally
    const enc = encodeURIComponent;
    const filePath = settings.folderPath
      ? `${settings.folderPath}/${clip.title}`
      : clip.title;

    const uri = `obsidian://new?vault=${enc(settings.vaultName)}&file=${enc(filePath)}&clipboard=true&overwrite=false`;

    if (uri.length > 2_000_000) {
      return { success: false, method: 'obsidian-uri', error: 'URI too long, falling back' };
    }

    window.location.href = uri;
    return { success: true, method: 'obsidian-uri' };
  } catch (err) {
    return { success: false, method: 'obsidian-uri', error: String(err) };
  }
}

async function tryClipboard(
  clip: ClipResult,
): Promise<{ success: boolean; method: string; error?: string }> {
  try {
    await navigator.clipboard.writeText(clip.markdown);
    return { success: true, method: 'clipboard' };
  } catch (err) {
    return { success: false, method: 'clipboard', error: String(err) };
  }
}

function tryFileDownload(
  clip: ClipResult,
): { success: boolean; method: string; error?: string } {
  try {
    const blob = new Blob([clip.markdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${clip.title}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return { success: true, method: 'file-download' };
  } catch (err) {
    return { success: false, method: 'file-download', error: String(err) };
  }
}
