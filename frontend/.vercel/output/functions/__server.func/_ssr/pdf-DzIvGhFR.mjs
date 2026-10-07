import { n as logo_default } from "./router-D67W07gD.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/pdf-DzIvGhFR.js
async function loadPdfLogo() {
	const blob = await (await fetch(logo_default)).blob();
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onloadend = () => resolve(String(reader.result));
		reader.onerror = reject;
		reader.readAsDataURL(blob);
	});
}
//#endregion
export { loadPdfLogo as t };
