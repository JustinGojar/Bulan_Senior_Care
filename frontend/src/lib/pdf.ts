import logo from "@/images/logo.png";

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
