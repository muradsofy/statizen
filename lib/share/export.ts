"use client";

// Export helpers for the ShareCard. html-to-image and jspdf are heavy
// enough (~30 KB + ~150 KB gz) that we never want them in the initial
// bundle — every entry point here dynamic-imports them on demand.

/**
 * Render a ShareCard DOM node to a PNG Blob at its native size.
 *
 * The node should already be in the document (visible OR off-screen
 * positioned with opacity 0); html-to-image needs to read computed
 * styles, so a detached node won't work. The exported pixel size
 * matches `pixelRatio × node.clientWidth × node.clientHeight`.
 */
export async function nodeToPng(
  node: HTMLElement,
  opts: { pixelRatio?: number } = {},
): Promise<Blob> {
  const { toBlob } = await import("html-to-image");
  const blob = await toBlob(node, {
    pixelRatio: opts.pixelRatio ?? 2,
    cacheBust: true,
    backgroundColor: "#000000",
  });
  if (!blob) throw new Error("html-to-image returned no blob");
  return blob;
}

/** Save a Blob as a file via a temporary `<a download>` element. */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revoke on next tick so Safari has a chance to start the download.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Convert a PNG Blob to a one-page PDF. Sizes the page to match the
 * image aspect ratio so there are no white margins.
 */
export async function pngBlobToPdfBlob(png: Blob): Promise<Blob> {
  const { default: jsPDF } = await import("jspdf");
  const dataUrl = await blobToDataUrl(png);
  // Probe the image to size the page exactly to the bitmap aspect.
  const dims = await imageDims(dataUrl);
  // jsPDF default unit is "pt" (1/72 inch). 1080×1350 → 540×675 pt.
  const pdf = new jsPDF({
    orientation: dims.w > dims.h ? "landscape" : "portrait",
    unit: "pt",
    format: [dims.w / 2, dims.h / 2],
    compress: true,
  });
  pdf.addImage(dataUrl, "PNG", 0, 0, dims.w / 2, dims.h / 2);
  return pdf.output("blob");
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result as string);
    fr.onerror = reject;
    fr.readAsDataURL(blob);
  });
}

function imageDims(src: string): Promise<{ w: number; h: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
    img.onerror = reject;
    img.src = src;
  });
}

/**
 * Trigger the native OS share sheet with an image attachment, falling
 * back to a PNG download when Web Share doesn't support files.
 */
export async function shareImageNative(
  blob: Blob,
  filename: string,
  shareData: { title?: string; text?: string } = {},
): Promise<{ shared: boolean; reason?: string }> {
  const file = new File([blob], filename, { type: blob.type });
  const nav = navigator as Navigator & {
    canShare?: (d: ShareData) => boolean;
  };
  if (typeof navigator.share === "function" && nav.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ ...shareData, files: [file] });
      return { shared: true };
    } catch (err) {
      // User-cancelled or platform refused — fall through to download.
      if ((err as DOMException)?.name === "AbortError") {
        return { shared: false, reason: "cancelled" };
      }
      return { shared: false, reason: (err as Error).message };
    }
  }
  downloadBlob(blob, filename);
  return { shared: false, reason: "not-supported" };
}
