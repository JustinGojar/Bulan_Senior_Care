import { o as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { M as submitSeniorEditRequest, b as getStoredUser, i as apiFetch } from "./router-D67W07gD.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/use-seniors-BRd-0AsJ.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var seniorCache = /* @__PURE__ */ new Map();
var SENIOR_CACHE_TTL = 2e3;
var SENIOR_CACHE_ROLES = /* @__PURE__ */ new Set([
	"admin",
	"head",
	"leader"
]);
async function getCachedSeniors(path) {
	const user = getStoredUser();
	const role = user?.role?.toLowerCase();
	if (!role || !SENIOR_CACHE_ROLES.has(role)) return apiFetch(path);
	const cacheKey = `${user?.id ?? "guest"}:${user?.role ?? "guest"}:${path}`;
	const cached = seniorCache.get(cacheKey);
	if (cached && cached.expiresAt > Date.now()) return cached.value;
	const value = await apiFetch(path);
	seniorCache.set(cacheKey, {
		value,
		expiresAt: Date.now() + SENIOR_CACHE_TTL
	});
	return value;
}
function clearSeniorCache() {
	seniorCache.clear();
}
function mapSenior(senior) {
	const birthdate = /* @__PURE__ */ new Date(`${String(senior.birthdate).slice(0, 10)}T00:00:00`);
	const age = Number.isNaN(birthdate.getTime()) ? 0 : Math.max(0, (/* @__PURE__ */ new Date()).getFullYear() - birthdate.getFullYear());
	const fallbackBenefit = age >= 100 ? "Centenarian Award" : age >= 90 ? "Nonagenarian Grant" : age >= 80 ? "Octogenarian Grant" : "Social Pension";
	return {
		id: senior.osca_id_number,
		name: [
			senior.first_name,
			senior.middle_name,
			senior.last_name
		].filter(Boolean).join(" "),
		birthdate: String(senior.birthdate).slice(0, 10),
		placeOfBirth: senior.place_of_birth ?? "",
		sex: senior.sex ?? "female",
		civilStatus: senior.civil_status ?? "",
		educationalAttainment: senior.educational_attainment ?? "",
		otherSkills: senior.other_skills ?? "",
		familyComposition: senior.family_composition ?? "",
		associationName: senior.association_name ?? "",
		associationAddress: senior.association_address ?? "",
		associationMembershipDate: senior.association_membership_date ?? "",
		associationPosition: senior.association_position ?? "",
		age,
		barangay: senior.barangay?.barangay_name ?? "Unassigned",
		address: senior.address ?? "",
		contact: senior.contact_number ?? "Not provided",
		benefit: senior.benefits?.[0]?.benefit_name ?? fallbackBenefit,
		status: senior.status === "active" ? "Active" : senior.status === "pending" ? "Pending" : "Inactive",
		photoPath: senior.photo_path,
		idDocumentPath: senior.id_document_path,
		validIdPath: senior.valid_id_path ?? senior.id_document_path,
		birthCertificatePath: senior.birth_certificate_path
	};
}
function useSeniors(options = {}) {
	const { pendingOnly = false, excludePending = false, page = 1, status, search = "", barangay = "" } = options;
	const [seniors, setSeniors] = (0, import_react.useState)([]);
	const [totalCount, setTotalCount] = (0, import_react.useState)(0);
	const [activeCount, setActiveCount] = (0, import_react.useState)(0);
	const [pendingCount, setPendingCount] = (0, import_react.useState)(0);
	const [inactiveCount, setInactiveCount] = (0, import_react.useState)(0);
	const [lastPage, setLastPage] = (0, import_react.useState)(1);
	const [loading, setLoading] = (0, import_react.useState)(true);
	const [error, setError] = (0, import_react.useState)(null);
	const [debouncedSearch, setDebouncedSearch] = (0, import_react.useState)(search.trim());
	(0, import_react.useEffect)(() => {
		const timeout = window.setTimeout(() => setDebouncedSearch(search.trim()), 250);
		return () => window.clearTimeout(timeout);
	}, [search]);
	const makeListPath = (0, import_react.useCallback)((requestedPage) => {
		const params = new URLSearchParams({
			per_page: "50",
			page: String(requestedPage)
		});
		if (pendingOnly) params.set("pending_only", "1");
		else if (excludePending) params.set("exclude_pending", "1");
		if (status) params.set("status", status);
		if (debouncedSearch) params.set("search", debouncedSearch);
		if (barangay) params.set("barangay", barangay);
		return `/seniors?${params.toString()}`;
	}, [
		pendingOnly,
		excludePending,
		status,
		debouncedSearch,
		barangay
	]);
	const listPath = makeListPath(page);
	(0, import_react.useEffect)(() => {
		let current = true;
		setLoading(true);
		setError(null);
		Promise.allSettled([getCachedSeniors(listPath), getCachedSeniors("/seniors?summary_only=1")]).then(([result, summaryResult]) => {
			if (result.status === "rejected") throw result.reason;
			const seniorData = result.value;
			const summary = summaryResult.status === "fulfilled" ? summaryResult.value : null;
			if (!current) return;
			setSeniors(seniorData.data.map(mapSenior));
			setLastPage(seniorData.last_page ?? 1);
			if (summary) {
				setTotalCount(summary.total);
				setActiveCount(summary.active);
				setPendingCount(summary.pending);
				setInactiveCount(summary.inactive);
			}
		}).catch((reason) => {
			if (!current) return;
			setError(reason.message);
			setSeniors([]);
		}).finally(() => {
			if (current) setLoading(false);
		});
		return () => {
			current = false;
		};
	}, [listPath]);
	return {
		seniors,
		totalCount,
		activeCount,
		pendingCount,
		inactiveCount,
		lastPage,
		loading,
		error,
		loadAllSeniors: (0, import_react.useCallback)(async () => {
			const firstPage = await apiFetch(makeListPath(1));
			const remainingPages = [];
			for (let firstPageNumber = 2; firstPageNumber <= firstPage.last_page; firstPageNumber += 4) {
				const pageNumbers = Array.from({ length: Math.min(4, firstPage.last_page - firstPageNumber + 1) }, (_, index) => firstPageNumber + index);
				remainingPages.push(...await Promise.all(pageNumbers.map((pageNumber) => apiFetch(makeListPath(pageNumber)))));
			}
			return [firstPage, ...remainingPages].flatMap((result) => result.data.map(mapSenior));
		}, [makeListPath]),
		createSenior: (0, import_react.useCallback)(async (draft) => {
			const body = new FormData();
			body.append("first_name", draft.firstName?.trim() ?? draft.name.trim());
			body.append("last_name", draft.lastName?.trim() ?? draft.name.trim());
			if (draft.middleName?.trim()) body.append("middle_name", draft.middleName.trim());
			body.append("birthdate", draft.birthdate ?? "");
			body.append("sex", draft.sex ?? "female");
			body.append("place_of_birth", draft.placeOfBirth?.trim() ?? "");
			body.append("civil_status", draft.civilStatus?.trim() ?? "");
			body.append("educational_attainment", draft.educationalAttainment?.trim() ?? "");
			body.append("other_skills", draft.otherSkills?.trim() ?? "");
			body.append("family_composition", draft.familyComposition?.trim() ?? "");
			body.append("association_name", draft.associationName?.trim() ?? "");
			body.append("association_address", draft.associationAddress?.trim() ?? "");
			body.append("association_membership_date", draft.associationMembershipDate ?? "");
			body.append("association_position", draft.associationPosition?.trim() ?? "");
			body.append("contact_number", draft.contact);
			body.append("status", "pending");
			body.append("barangay", draft.barangay);
			body.append("benefit", draft.benefit);
			if (draft.validId) body.append("valid_id", draft.validId);
			if (draft.birthCertificate) body.append("birth_certificate", draft.birthCertificate);
			if (draft.profilePhoto) body.append("profile_photo", draft.profilePhoto);
			const result = await apiFetch("/seniors", {
				method: "POST",
				body
			});
			clearSeniorCache();
			const mapped = mapSenior(result);
			if (!excludePending || mapped.status !== "Pending") {
				setSeniors((prev) => [mapped, ...prev]);
				setTotalCount((count) => count + 1);
			}
			if (mapped.status === "Pending") setPendingCount((count) => count + 1);
			return mapped;
		}, [excludePending]),
		updateSenior: (0, import_react.useCallback)(async (id, draft) => {
			if (getStoredUser()?.role === "leader") {
				await submitSeniorEditRequest(id, {
					first_name: draft.firstName?.trim() ?? draft.name.trim(),
					middle_name: draft.middleName?.trim() || null,
					last_name: draft.lastName?.trim() ?? draft.name.trim(),
					birthdate: draft.birthdate ?? "",
					place_of_birth: draft.placeOfBirth?.trim() || null,
					sex: draft.sex ?? "female",
					civil_status: draft.civilStatus?.trim() || null,
					educational_attainment: draft.educationalAttainment?.trim() || null,
					other_skills: draft.otherSkills?.trim() || null,
					family_composition: draft.familyComposition?.trim() || null,
					association_name: draft.associationName?.trim() || null,
					association_address: draft.associationAddress?.trim() || null,
					association_membership_date: draft.associationMembershipDate || null,
					association_position: draft.associationPosition?.trim() || null,
					address: draft.address.trim(),
					contact_number: draft.contact.trim() || null,
					barangay: draft.barangay,
					benefit: draft.benefit
				});
				return;
			}
			const body = new FormData();
			body.append("_method", "PUT");
			if (draft.firstName?.trim()) body.append("first_name", draft.firstName.trim());
			if (draft.middleName?.trim()) body.append("middle_name", draft.middleName.trim());
			if (draft.lastName?.trim()) body.append("last_name", draft.lastName.trim());
			if (draft.birthdate) body.append("birthdate", draft.birthdate);
			if (draft.placeOfBirth?.trim()) body.append("place_of_birth", draft.placeOfBirth.trim());
			if (draft.sex) body.append("sex", draft.sex);
			if (draft.civilStatus?.trim()) body.append("civil_status", draft.civilStatus.trim());
			if (draft.educationalAttainment?.trim()) body.append("educational_attainment", draft.educationalAttainment.trim());
			if (draft.otherSkills?.trim()) body.append("other_skills", draft.otherSkills.trim());
			if (draft.familyComposition?.trim()) body.append("family_composition", draft.familyComposition.trim());
			if (draft.associationName?.trim()) body.append("association_name", draft.associationName.trim());
			if (draft.associationAddress?.trim()) body.append("association_address", draft.associationAddress.trim());
			if (draft.associationMembershipDate) body.append("association_membership_date", draft.associationMembershipDate);
			if (draft.associationPosition?.trim()) body.append("association_position", draft.associationPosition.trim());
			if (draft.address.trim()) body.append("address", draft.address.trim());
			if (draft.contact.trim()) body.append("contact_number", draft.contact.trim());
			if (draft.barangay) body.append("barangay", draft.barangay);
			if (draft.benefit) body.append("benefit", draft.benefit);
			body.append("status", draft.status.toLowerCase());
			if (draft.validId) body.append("valid_id", draft.validId);
			if (draft.birthCertificate) body.append("birth_certificate", draft.birthCertificate);
			if (draft.profilePhoto) body.append("profile_photo", draft.profilePhoto);
			const result = await apiFetch(`/seniors/${id}`, {
				method: "POST",
				body
			});
			clearSeniorCache();
			const mapped = mapSenior(result);
			setSeniors((prev) => prev.flatMap((senior) => {
				if (senior.id !== id) return [senior];
				if (pendingOnly && mapped.status !== "Pending") return [];
				if (excludePending && mapped.status === "Pending") return [];
				return [mapped];
			}));
			setActiveCount((count) => {
				if (mapped.status === "Active" && draft.status !== "Active") return count + 1;
				if (mapped.status !== "Active" && draft.status === "Active") return Math.max(0, count - 1);
				return count;
			});
			setPendingCount((count) => {
				if (mapped.status === "Pending" && draft.status !== "Pending") return count + 1;
				if (mapped.status !== "Pending" && draft.status === "Pending") return Math.max(0, count - 1);
				return count;
			});
		}, [excludePending, pendingOnly]),
		deleteSenior: (0, import_react.useCallback)(async (id) => {
			await apiFetch(`/seniors/${id}`, { method: "DELETE" });
			clearSeniorCache();
			setSeniors((prev) => {
				const deleted = prev.find((senior) => senior.id === id);
				if (deleted?.status === "Active") setActiveCount((count) => Math.max(0, count - 1));
				if (deleted?.status === "Pending") setPendingCount((count) => Math.max(0, count - 1));
				return prev.filter((s) => s.id !== id);
			});
			setTotalCount((count) => Math.max(0, count - 1));
		}, [])
	};
}
//#endregion
export { useSeniors as t };
