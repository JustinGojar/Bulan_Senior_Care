import type { jsPDF } from "jspdf";
import logo from "@/images/logo.png";

let printFrame: HTMLIFrameElement | null = null;
let printUrl: string | null = null;

/**
 * Opens the browser's print dialog for a generated PDF instead of downloading it.
 * The PDF loads in a hidden frame; if the browser can't print from it, it opens in a new tab.
 */
export function printPdf(pdf: jsPDF) {
  if (printUrl) URL.revokeObjectURL(printUrl);
  printFrame?.remove();
  printUrl = URL.createObjectURL(pdf.output("blob"));
  const url = printUrl;
  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;";
  frame.onload = () => {
    try {
      frame.contentWindow?.focus();
      frame.contentWindow?.print();
    } catch {
      window.open(url, "_blank");
    }
  };
  frame.src = url;
  document.body.appendChild(frame);
  printFrame = frame;
}

export async function loadPdfLogo(): Promise<string> {
  const response = await fetch(logo);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
