import { o as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { M as require_jsx_runtime, T as Slot, a as Overlay2, c as Title2, i as Description2, n as Cancel, o as Portal2, r as Content2, s as Root2, t as Action } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { a as bulkCreateSeniors, b as getStoredUser, i as apiFetch, k as reviewSeniorEditRequest, r as API_URL, v as getSeniorEditRequests } from "./router-D67W07gD.mjs";
import { G as Clipboard, R as Eye, S as Pencil, V as Download, Z as ChevronUp, et as ChevronDown, ft as Archive, o as Upload, s as Undo2, tt as Check, u as Trash2, v as Search, x as Plus } from "../_libs/lucide-react.mjs";
import { t as cva } from "../_libs/class-variance-authority+clsx.mjs";
import { n as cn, t as AppShell } from "./AppShell-CSdz8EAS.mjs";
import { t as BARANGAYS } from "./osca-data-CD4Joyu-.mjs";
import { t as useSeniors } from "./use-seniors-BRd-0AsJ.mjs";
import { t as loadPdfLogo } from "./pdf-DzIvGhFR.mjs";
import { a as DialogHeader, i as DialogFooter, n as DialogContent, o as DialogTitle, r as DialogDescription, t as Dialog } from "./dialog-CeycyYL_.mjs";
import { n as readSync, r as utils, t as SSF } from "../_libs/xlsx.mjs";
import { t as Root } from "../_libs/radix-ui__react-label.mjs";
import { a as SelectItemIndicator, c as SelectPortal, d as SelectSeparator$1, f as SelectTrigger$1, i as SelectItem$1, l as SelectScrollDownButton$1, m as SelectViewport, n as SelectContent$1, o as SelectItemText, p as SelectValue$1, r as SelectIcon, s as SelectLabel$1, t as Select$1, u as SelectScrollUpButton$1 } from "../_libs/@radix-ui/react-select+[...].mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/seniors-DZgmq6-b.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var Input = import_react.forwardRef(({ className, type, ...props }, ref) => {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
		type,
		className: cn("flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm", className),
		ref,
		...props
	});
});
Input.displayName = "Input";
var labelVariants = cva("text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70");
var Label = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Root, {
	ref,
	className: cn(labelVariants(), className),
	...props
}));
Label.displayName = Root.displayName;
var Select = Select$1;
var SelectValue = SelectValue$1;
var SelectTrigger = import_react.forwardRef(({ className, children, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SelectTrigger$1, {
	ref,
	className: cn("flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background cursor-pointer data-[placeholder]:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1", className),
	...props,
	children: [children, /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectIcon, {
		asChild: true,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronDown, { className: "h-4 w-4 opacity-50" })
	})]
}));
SelectTrigger.displayName = SelectTrigger$1.displayName;
var SelectScrollUpButton = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectScrollUpButton$1, {
	ref,
	className: cn("flex cursor-default items-center justify-center py-1", className),
	...props,
	children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronUp, { className: "h-4 w-4" })
}));
SelectScrollUpButton.displayName = SelectScrollUpButton$1.displayName;
var SelectScrollDownButton = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectScrollDownButton$1, {
	ref,
	className: cn("flex cursor-default items-center justify-center py-1", className),
	...props,
	children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronDown, { className: "h-4 w-4" })
}));
SelectScrollDownButton.displayName = SelectScrollDownButton$1.displayName;
var SelectContent = import_react.forwardRef(({ className, children, position = "popper", ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectPortal, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SelectContent$1, {
	ref,
	className: cn("relative z-50 max-h-(--radix-select-content-available-height) min-w-[8rem] overflow-y-auto overflow-x-hidden rounded-md border bg-popover text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 origin-(--radix-select-content-transform-origin)", position === "popper" && "data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1", className),
	position,
	...props,
	children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectScrollUpButton, {}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectViewport, {
			className: cn("p-1", position === "popper" && "h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]"),
			children
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectScrollDownButton, {})
	]
}) }));
SelectContent.displayName = SelectContent$1.displayName;
var SelectLabel = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectLabel$1, {
	ref,
	className: cn("px-2 py-1.5 text-sm font-semibold", className),
	...props
}));
SelectLabel.displayName = SelectLabel$1.displayName;
var SelectItem = import_react.forwardRef(({ className, children, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SelectItem$1, {
	ref,
	className: cn("relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-2 pr-8 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50", className),
	...props,
	children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
		className: "absolute right-2 flex h-3.5 w-3.5 items-center justify-center",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItemIndicator, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, { className: "h-4 w-4" }) })
	}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItemText, { children })]
}));
SelectItem.displayName = SelectItem$1.displayName;
var SelectSeparator = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectSeparator$1, {
	ref,
	className: cn("-mx-1 my-1 h-px bg-muted", className),
	...props
}));
SelectSeparator.displayName = SelectSeparator$1.displayName;
var BENEFITS = [
	"Social Pension",
	"Octogenarian Grant",
	"Nonagenarian Grant",
	"Centenarian Award"
];
var EMPTY = {
	name: "",
	birthdate: "",
	firstName: "",
	middleName: "",
	lastName: "",
	age: 0,
	barangay: BARANGAYS[0],
	address: "",
	contact: "",
	placeOfBirth: "",
	sex: "female",
	civilStatus: "",
	educationalAttainment: "",
	otherSkills: "",
	familyComposition: "",
	associationName: "",
	associationAddress: "",
	associationMembershipDate: "",
	associationPosition: "",
	benefit: "Social Pension",
	status: "Pending"
};
function benefitForAge(age) {
	if (age >= 100) return "Centenarian Award";
	if (age >= 90) return "Nonagenarian Grant";
	if (age >= 80) return "Octogenarian Grant";
	return "Social Pension";
}
function ageFromBirthdate(birthdate) {
	const date = /* @__PURE__ */ new Date(`${birthdate}T00:00:00`);
	if (Number.isNaN(date.getTime())) return 0;
	const today = /* @__PURE__ */ new Date();
	let age = today.getFullYear() - date.getFullYear();
	if (today.getMonth() < date.getMonth() || today.getMonth() === date.getMonth() && today.getDate() < date.getDate()) age -= 1;
	return age;
}
function SeniorFormDialog({ open, onOpenChange, senior, isLeader, leaderBarangay, onSubmit }) {
	const [draft, setDraft] = (0, import_react.useState)(EMPTY);
	const [validId, setValidId] = (0, import_react.useState)(null);
	const [birthCertificate, setBirthCertificate] = (0, import_react.useState)(null);
	const [validIdPreview, setValidIdPreview] = (0, import_react.useState)(null);
	const [birthCertificatePreview, setBirthCertificatePreview] = (0, import_react.useState)(null);
	const [error, setError] = (0, import_react.useState)(null);
	const [profilePhoto, setProfilePhoto] = (0, import_react.useState)(null);
	(0, import_react.useEffect)(() => {
		if (!open) return;
		setError(null);
		setValidId(null);
		setBirthCertificate(null);
		setProfilePhoto(null);
		setDraft(senior ? {
			name: senior.name,
			birthdate: senior.birthdate ?? "",
			firstName: senior.name.split(" ")[0] ?? "",
			middleName: senior.name.split(" ").slice(1, -1).join(" "),
			lastName: senior.name.split(" ").at(-1) ?? "",
			age: senior.birthdate ? ageFromBirthdate(senior.birthdate) : 0,
			barangay: senior.barangay,
			address: senior.address,
			contact: senior.contact,
			placeOfBirth: senior.placeOfBirth ?? "",
			sex: senior.sex ?? "female",
			civilStatus: senior.civilStatus ?? "",
			educationalAttainment: senior.educationalAttainment ?? "",
			otherSkills: senior.otherSkills ?? "",
			familyComposition: senior.familyComposition ?? "",
			associationName: senior.associationName ?? "",
			associationAddress: senior.associationAddress ?? "",
			associationMembershipDate: senior.associationMembershipDate ?? "",
			associationPosition: senior.associationPosition ?? "",
			benefit: senior.benefit,
			status: senior.status
		} : leaderBarangay ? {
			...EMPTY,
			barangay: leaderBarangay
		} : EMPTY);
	}, [
		open,
		senior,
		leaderBarangay
	]);
	(0, import_react.useEffect)(() => {
		if (!validId) {
			setValidIdPreview(null);
			return;
		}
		const preview = validId.type.startsWith("image/") ? URL.createObjectURL(validId) : null;
		setValidIdPreview(preview);
		return () => {
			if (preview) URL.revokeObjectURL(preview);
		};
	}, [validId]);
	(0, import_react.useEffect)(() => {
		if (!birthCertificate) {
			setBirthCertificatePreview(null);
			return;
		}
		const preview = birthCertificate.type.startsWith("image/") ? URL.createObjectURL(birthCertificate) : null;
		setBirthCertificatePreview(preview);
		return () => {
			if (preview) URL.revokeObjectURL(preview);
		};
	}, [birthCertificate]);
	const set = (key, value) => setDraft((d) => ({
		...d,
		[key]: value
	}));
	function submit() {
		if (!draft.firstName?.trim()) return setError("First name is required.");
		if (!draft.lastName?.trim()) return setError("Last name is required.");
		if (!draft.birthdate) return setError("Birthday is required.");
		const age = ageFromBirthdate(draft.birthdate);
		if (age < 60 || age > 130) return setError("Age must be 60 or older to qualify for OSCA benefits.");
		if (!draft.contact.trim()) return setError("Contact number is required.");
		if (!senior && !validId) return setError("A valid ID is required.");
		if (!senior && !birthCertificate) return setError("A birth certificate is required.");
		onSubmit({
			...draft,
			age,
			benefit: benefitForAge(age),
			name: [
				draft.firstName,
				draft.middleName,
				draft.lastName
			].filter(Boolean).join(" ").trim(),
			firstName: draft.firstName.trim(),
			middleName: draft.middleName?.trim() ?? "",
			lastName: draft.lastName.trim(),
			contact: draft.contact.trim(),
			validId,
			birthCertificate,
			profilePhoto
		});
		onOpenChange(false);
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Dialog, {
		open,
		onOpenChange,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogContent, {
			className: "max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-2xl",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogHeader, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogTitle, {
					className: "font-display",
					children: senior ? "Edit senior record" : "Register senior"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogDescription, { children: senior ? `Update the OSCA profile for ${senior.name}.` : "Add a new senior citizen to the Bulan OSCA registry." })] }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "space-y-6",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
							className: "rounded-2xl border border-border p-4",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground",
								children: "Personal information"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "mt-4 grid gap-4 sm:grid-cols-3",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
										htmlFor: "senior-last-name",
										children: "Surname"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
										id: "senior-last-name",
										value: draft.lastName ?? "",
										onChange: (e) => set("lastName", e.target.value),
										placeholder: "Santos",
										className: "mt-1.5"
									})] }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
										htmlFor: "senior-first-name",
										children: "First name"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
										id: "senior-first-name",
										value: draft.firstName ?? "",
										onChange: (e) => set("firstName", e.target.value),
										placeholder: "Maria",
										className: "mt-1.5"
									})] }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
										htmlFor: "senior-middle-name",
										children: "Middle name"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
										id: "senior-middle-name",
										value: draft.middleName ?? "",
										onChange: (e) => set("middleName", e.target.value),
										placeholder: "Luz",
										className: "mt-1.5"
									})] }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
										htmlFor: "senior-place-of-birth",
										children: "Place of birth"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
										id: "senior-place-of-birth",
										value: draft.placeOfBirth ?? "",
										onChange: (e) => set("placeOfBirth", e.target.value),
										placeholder: "Municipality, province",
										className: "mt-1.5"
									})] }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
										htmlFor: "senior-birthdate",
										children: "Date of birth"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
										id: "senior-birthdate",
										type: "date",
										value: draft.birthdate ?? "",
										onChange: (e) => {
											const birthdate = e.target.value;
											const age = ageFromBirthdate(birthdate);
											setDraft((d) => ({
												...d,
												birthdate,
												age,
												benefit: benefitForAge(age)
											}));
										},
										className: "mt-1.5"
									})] }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
										htmlFor: "senior-age",
										children: "Age"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
										id: "senior-age",
										value: draft.birthdate ? draft.age : "",
										placeholder: "Calculated automatically",
										readOnly: true,
										className: "mt-1.5"
									})] }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Sex" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Select, {
										value: draft.sex ?? "female",
										onValueChange: (value) => set("sex", value),
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectTrigger, {
											className: "mt-1.5",
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectValue, {})
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SelectContent, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
											value: "female",
											children: "Female"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
											value: "male",
											children: "Male"
										})] })]
									})] }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
										htmlFor: "senior-civil-status",
										children: "Civil status"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
										id: "senior-civil-status",
										value: draft.civilStatus ?? "",
										onChange: (e) => set("civilStatus", e.target.value),
										placeholder: "Single, married, widowed",
										className: "mt-1.5"
									})] }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
										htmlFor: "senior-contact",
										children: "Contact number"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
										id: "senior-contact",
										value: draft.contact,
										onChange: (e) => set("contact", e.target.value),
										placeholder: "0917-123-4567",
										className: "mt-1.5"
									})] })
								]
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
							className: "rounded-2xl border border-border p-4",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground",
								children: "Residence and eligibility"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "mt-4 grid gap-4 sm:grid-cols-2",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "sm:col-span-2",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
											htmlFor: "senior-address",
											children: "Complete address"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
											id: "senior-address",
											value: draft.address,
											onChange: (e) => set("address", e.target.value),
											placeholder: "House number, street, barangay, Bulan, Sorsogon",
											className: "mt-1.5"
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Barangay" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Select, {
										value: draft.barangay,
										onValueChange: (v) => set("barangay", v),
										disabled: !!leaderBarangay,
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectTrigger, {
											className: "mt-1.5",
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectValue, {})
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectContent, { children: BARANGAYS.map((barangay) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
											value: barangay,
											children: barangay
										}, barangay)) })]
									})] }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Benefit" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Select, {
										value: draft.benefit,
										onValueChange: (v) => set("benefit", v),
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectTrigger, {
											className: "mt-1.5",
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectValue, {})
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectContent, { children: BENEFITS.map((b) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
											value: b,
											children: b
										}, b)) })]
									})] })
								]
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
							className: "rounded-2xl border border-border p-4",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground",
								children: "Education, skills, and family"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "mt-4 space-y-4",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
										htmlFor: "senior-educational-attainment",
										children: "Educational attainment"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
										id: "senior-educational-attainment",
										value: draft.educationalAttainment ?? "",
										onChange: (event) => set("educationalAttainment", event.target.value),
										placeholder: "Highest educational attainment",
										className: "mt-1.5"
									})] }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
										htmlFor: "senior-other-skills",
										children: "Other skills"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
										id: "senior-other-skills",
										value: draft.otherSkills ?? "",
										onChange: (event) => set("otherSkills", event.target.value),
										placeholder: "Livelihood, trade, or other skills",
										className: "mt-1.5"
									})] }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
											htmlFor: "senior-family-composition",
											children: "Family composition"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
											id: "senior-family-composition",
											value: draft.familyComposition ?? "",
											onChange: (event) => set("familyComposition", event.target.value),
											placeholder: "Name | Relationship | Age | Status | Occupation",
											className: "mt-1.5 min-h-28 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
											className: "mt-1 text-xs text-muted-foreground",
											children: "You may enter one family member per line."
										})
									] })
								]
							})]
						}),
						senior && !isLeader && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "sm:col-span-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Eligibility status" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Select, {
								value: draft.status,
								onValueChange: (v) => set("status", v),
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectTrigger, {
									className: "mt-1.5",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectValue, {})
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SelectContent, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
									value: "Active",
									children: "Active"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
									value: "Inactive",
									children: "Inactive"
								})] })]
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
							className: "rounded-2xl border border-border p-4",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "border-b border-border pb-3",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-sm font-bold",
									children: "Membership to Senior Citizen Association"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "mt-1 text-xs text-muted-foreground",
									children: "Complete the association details shown on the registration form."
								})]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "mt-4 space-y-4",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
										htmlFor: "senior-association-name",
										children: "Name of association"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
										id: "senior-association-name",
										value: draft.associationName ?? "",
										onChange: (e) => set("associationName", e.target.value),
										placeholder: "Senior Citizens Association of...",
										className: "mt-1.5"
									})] }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
										htmlFor: "senior-association-address",
										children: "Address of association"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
										id: "senior-association-address",
										value: draft.associationAddress ?? "",
										onChange: (e) => set("associationAddress", e.target.value),
										placeholder: "Barangay, municipality, province",
										className: "mt-1.5"
									})] }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "grid gap-4 sm:grid-cols-2",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
											htmlFor: "senior-membership-date",
											children: "Date of membership"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
											id: "senior-membership-date",
											type: "date",
											value: draft.associationMembershipDate ?? "",
											onChange: (e) => set("associationMembershipDate", e.target.value),
											className: "mt-1.5"
										})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
											htmlFor: "senior-association-position",
											children: "Position"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
											id: "senior-association-position",
											value: draft.associationPosition ?? "",
											onChange: (e) => set("associationPosition", e.target.value),
											placeholder: "Member or officer",
											className: "mt-1.5"
										})] })]
									})
								]
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
							className: "rounded-2xl border border-border p-4",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground",
								children: "Documents and photo"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "mt-4 grid gap-4 sm:grid-cols-2",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
										htmlFor: "senior-profile-photo",
										children: "Profile Picture"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
										id: "senior-profile-photo",
										type: "file",
										accept: "image/jpeg,image/png,image/webp",
										capture: "user",
										onChange: (event) => setProfilePhoto(event.target.files?.[0] ?? null),
										className: "mt-1.5 cursor-pointer"
									})] }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Label, {
											htmlFor: "senior-valid-id",
											children: ["Valid ID", !senior && " *"]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
											id: "senior-valid-id",
											type: "file",
											accept: ".pdf,.jpg,.jpeg,.png",
											capture: "environment",
											required: !senior,
											onChange: (event) => {
												const file = event.target.files?.[0] ?? null;
												setValidId(file);
											},
											className: "mt-1.5 cursor-pointer"
										}),
										(validIdPreview || senior?.validIdPath) && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
											href: validIdPreview ?? `${API_URL.replace(/\/api$/, "")}/storage/${senior?.validIdPath}`,
											target: "_blank",
											rel: "noreferrer",
											className: "mt-2 block w-fit",
											children: validIdPreview ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
												src: validIdPreview,
												alt: "Valid ID preview",
												className: "h-24 w-24 rounded-xl border border-border object-cover"
											}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "text-xs text-muted-foreground",
												children: "Current Valid ID"
											})
										})
									] }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Label, {
											htmlFor: "senior-birth-certificate",
											children: ["Birth certificate", !senior && " *"]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
											id: "senior-birth-certificate",
											type: "file",
											accept: ".pdf,.jpg,.jpeg,.png",
											capture: "environment",
											required: !senior,
											onChange: (event) => {
												const file = event.target.files?.[0] ?? null;
												setBirthCertificate(file);
											},
											className: "mt-1.5 cursor-pointer"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
											className: "mt-1 text-xs text-muted-foreground",
											children: "PDF, JPG, or PNG up to 5 MB each."
										}),
										(birthCertificatePreview || senior?.birthCertificatePath) && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
											href: birthCertificatePreview ?? `${API_URL.replace(/\/api$/, "")}/storage/${senior?.birthCertificatePath}`,
											target: "_blank",
											rel: "noreferrer",
											className: "mt-2 block w-fit",
											children: birthCertificatePreview ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
												src: birthCertificatePreview,
												alt: "Birth Certificate preview",
												className: "h-24 w-24 rounded-xl border border-border object-cover"
											}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "text-xs text-muted-foreground",
												children: "Current Birth Certificate"
											})
										})
									] })
								]
							})]
						})
					]
				}),
				error && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-sm font-medium text-destructive",
					children: error
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogFooter, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					onClick: () => onOpenChange(false),
					className: "rounded-full bg-secondary px-6 py-3 text-sm font-semibold",
					children: "Cancel"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					onClick: submit,
					className: "bg-navy rounded-full px-6 py-3 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-card)]",
					children: senior ? "Save changes" : "Register senior"
				})] })
			]
		})
	});
}
var buttonVariants = cva("inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0", {
	variants: {
		variant: {
			default: "bg-primary text-primary-foreground shadow hover:bg-primary/90",
			destructive: "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
			outline: "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground",
			secondary: "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",
			ghost: "hover:bg-accent hover:text-accent-foreground",
			link: "text-primary underline-offset-4 hover:underline"
		},
		size: {
			default: "h-9 px-4 py-2",
			sm: "h-8 rounded-md px-3 text-xs",
			lg: "h-10 rounded-md px-8",
			icon: "h-9 w-9"
		}
	},
	defaultVariants: {
		variant: "default",
		size: "default"
	}
});
var Button = import_react.forwardRef(({ className, variant, size, asChild = false, ...props }, ref) => {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(asChild ? Slot : "button", {
		className: cn(buttonVariants({
			variant,
			size,
			className
		})),
		ref,
		...props
	});
});
Button.displayName = "Button";
var AlertDialog = Root2;
var AlertDialogPortal = Portal2;
var AlertDialogOverlay = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Overlay2, {
	className: cn("fixed inset-0 z-50 bg-black/50 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0", className),
	...props,
	ref
}));
AlertDialogOverlay.displayName = Overlay2.displayName;
var AlertDialogContent = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AlertDialogPortal, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlertDialogOverlay, {}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Content2, {
	ref,
	className: cn("fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 sm:rounded-lg", className),
	...props
})] }));
AlertDialogContent.displayName = Content2.displayName;
var AlertDialogHeader = ({ className, ...props }) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
	className: cn("flex flex-col space-y-2 text-center sm:text-left", className),
	...props
});
AlertDialogHeader.displayName = "AlertDialogHeader";
var AlertDialogFooter = ({ className, ...props }) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
	className: cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className),
	...props
});
AlertDialogFooter.displayName = "AlertDialogFooter";
var AlertDialogTitle = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Title2, {
	ref,
	className: cn("text-lg font-semibold", className),
	...props
}));
AlertDialogTitle.displayName = Title2.displayName;
var AlertDialogDescription = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Description2, {
	ref,
	className: cn("text-sm text-muted-foreground", className),
	...props
}));
AlertDialogDescription.displayName = Description2.displayName;
var AlertDialogAction = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Action, {
	ref,
	className: cn(buttonVariants(), className),
	...props
}));
AlertDialogAction.displayName = Action.displayName;
var AlertDialogCancel = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Cancel, {
	ref,
	className: cn(buttonVariants({ variant: "outline" }), "mt-2 sm:mt-0", className),
	...props
}));
AlertDialogCancel.displayName = Cancel.displayName;
var STATUS_CLASS = {
	Active: "text-success",
	Pending: "text-gold-foreground",
	Inactive: "text-destructive"
};
function initials(name) {
	return name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();
}
function avatarPath(senior) {
	if (senior.photoPath) return senior.photoPath;
	return senior.idDocumentPath && /\.(jpe?g|png|webp)$/i.test(senior.idDocumentPath) ? senior.idDocumentPath : null;
}
function isImageDocument(path) {
	return /\.(jpe?g|png|webp)$/i.test(path);
}
function normalizeBulkHeader(header) {
	return String(header ?? "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}
function normalizeBulkDate(value) {
	if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0, 10);
	if (typeof value === "number") {
		const date = SSF.parse_date_code(value);
		if (date) return `${date.y}-${String(date.m).padStart(2, "0")}-${String(date.d).padStart(2, "0")}`;
	}
	const text = String(value ?? "").trim();
	if (!text) return "";
	const parsed = new Date(text);
	return Number.isNaN(parsed.getTime()) ? text : parsed.toISOString().slice(0, 10);
}
async function readBulkRecords(file) {
	const workbook = readSync(await file.arrayBuffer(), {
		type: "array",
		cellDates: true
	});
	const sheet = workbook.Sheets[workbook.SheetNames[0]];
	if (!sheet) return [];
	const rows = utils.sheet_to_json(sheet, {
		header: 1,
		defval: ""
	});
	const headers = (rows[0] ?? []).map(normalizeBulkHeader);
	return rows.slice(1).filter((row) => row.some((value) => String(value ?? "").trim())).map((row) => Object.fromEntries(headers.map((header, index) => [header, row[index] ?? ""])));
}
async function imageDataUrl(source) {
	const response = typeof source === "string" ? await fetch(source) : null;
	if (response && !response.ok) throw new Error("Profile photo could not be loaded.");
	const blob = response ? await response.blob() : source;
	const objectUrl = URL.createObjectURL(blob);
	return new Promise((resolve, reject) => {
		const image = new Image();
		image.onload = () => {
			const canvas = document.createElement("canvas");
			const size = Math.min(image.naturalWidth || 600, image.naturalHeight || 600);
			canvas.width = size;
			canvas.height = size;
			const context = canvas.getContext("2d");
			if (!context) {
				URL.revokeObjectURL(objectUrl);
				reject(/* @__PURE__ */ new Error("Unable to prepare profile photo."));
				return;
			}
			const cropSize = Math.min(image.naturalWidth, image.naturalHeight);
			const offsetX = (image.naturalWidth - cropSize) / 2;
			const offsetY = (image.naturalHeight - cropSize) / 2;
			context.drawImage(image, offsetX, offsetY, cropSize, cropSize, 0, 0, size, size);
			URL.revokeObjectURL(objectUrl);
			resolve(canvas.toDataURL("image/jpeg", .92));
		};
		image.onerror = () => {
			URL.revokeObjectURL(objectUrl);
			reject(/* @__PURE__ */ new Error("Unable to read profile photo."));
		};
		image.src = objectUrl;
	});
}
async function downloadRegistrationForm(draft) {
	const { jsPDF } = await import("../_libs/jspdf.mjs").then((n) => /* @__PURE__ */ __toESM(n.t()));
	const document = new jsPDF();
	const pageWidth = document.internal.pageSize.getWidth();
	const left = 18;
	const right = pageWidth - 18;
	document.setDrawColor(35, 45, 55);
	document.setLineWidth(.4);
	document.rect(left, 12, 40, 45);
	document.setFont("helvetica", "bold");
	document.setFontSize(7);
	document.text("AN KAUPOD PO SANI NA", 21, 18);
	document.text("DOKUMENTO:", 21, 23);
	document.setFont("helvetica", "normal");
	[
		"1x1 PICTURE - 2pcs",
		"Birth Certificate",
		"Baptismal",
		"GSIS ID",
		"SSS ID",
		"Voter's ID",
		"National ID",
		"Brgy. ID",
		"Driver's License",
		"Passport ID"
	].forEach((item, index) => document.text(`> ${item}`, 21, 29 + index * 3.8));
	document.setFont("helvetica", "bold");
	document.setFontSize(10);
	document.text("OFFICE OF THE SENIOR CITIZEN'S AFFAIRS", 112, 19, { align: "center" });
	document.setFontSize(8);
	document.text("Municipality of Bulan, Sorsogon", 112, 25, { align: "center" });
	document.setFontSize(16);
	document.setTextColor(33, 91, 125);
	document.text("REGISTRATION FORM", 112, 39, { align: "center" });
	const oscaId = draft.id ?? draft.oscaIdNumber;
	if (oscaId) {
		document.setFontSize(9);
		document.setTextColor(0, 0, 0);
		document.text(`OSCA ID: ${oscaId}`, 112, 46, { align: "center" });
	}
	document.setTextColor(0, 0, 0);
	document.setDrawColor(35, 45, 55);
	document.rect(166, 13, 25, 25);
	const photoSource = draft.profilePhoto ?? (draft.photoPath ? `${API_URL.replace(/\/api$/, "")}/storage/${draft.photoPath}` : null);
	if (photoSource) try {
		const photoDataUrl = await imageDataUrl(photoSource);
		document.addImage(photoDataUrl, "JPEG", 167, 14, 23, 23);
	} catch {
		document.setFontSize(13);
		document.text("1x1", 178.5, 24, { align: "center" });
		document.setFontSize(6);
		document.text("Picture", 178.5, 31, { align: "center" });
	}
	else {
		document.setFontSize(13);
		document.text("1x1", 178.5, 24, { align: "center" });
		document.setFontSize(6);
		document.text("Picture", 178.5, 31, { align: "center" });
	}
	let y = 68;
	const line = (label, value, x, endX, lineY = y) => {
		document.setFont("helvetica", "bold");
		document.setFontSize(7.5);
		document.text(`${label}:`, x, lineY);
		document.setFont("helvetica", "normal");
		const startX = x + Math.max(25, document.getTextWidth(`${label}:`) + 2);
		document.line(startX, lineY + 1, endX, lineY + 1);
		if (value) document.text(document.splitTextToSize(value, Math.max(8, endX - startX - 2))[0] ?? value, startX + 2, lineY - 1);
	};
	document.setFont("helvetica", "bold");
	document.setFontSize(7.5);
	line("NAME", "", left, right);
	document.setFont("helvetica", "normal");
	document.setFontSize(7);
	document.text(draft.lastName ?? "", 43, y - 1, { align: "center" });
	document.text(draft.firstName ?? "", 101, y - 1, { align: "center" });
	document.text(draft.middleName ?? "", 157, y - 1, { align: "center" });
	document.setFontSize(6.5);
	document.text("(Surname)", 43, y + 5, { align: "center" });
	document.text("(First Name)", 101, y + 5, { align: "center" });
	document.text("(Middle Name)", 157, y + 5, { align: "center" });
	y += 15;
	line("PLACE OF BIRTH", draft.placeOfBirth ?? "", left, 104);
	line("AGE", String(draft.age || ""), 109, 143);
	line("CIVIL STATUS", draft.civilStatus ?? "", 146, right);
	y += 8;
	line("DATE OF BIRTH", draft.birthdate ?? "", left, 111);
	line("SEX", draft.sex ?? "", 115, right);
	y += 8;
	line("ADDRESS", draft.address, left, right);
	y += 8;
	line("EDUCATIONAL ATTAINMENT", draft.educationalAttainment ?? "", left, right);
	y += 8;
	line("OTHER SKILLS", draft.otherSkills ?? "", left, right);
	y += 10;
	document.setFont("helvetica", "bold");
	document.setFontSize(10);
	document.text("FAMILY COMPOSITION", pageWidth / 2, y, { align: "center" });
	y += 4;
	const tableTop = y;
	const tableHeight = 31;
	document.rect(left, tableTop, right - left, tableHeight);
	[
		64,
		112,
		139,
		166
	].forEach((x) => document.line(x, tableTop, x, tableTop + tableHeight));
	[
		tableTop + 7,
		tableTop + 13,
		tableTop + 19,
		tableTop + 25
	].forEach((rowY) => document.line(left, rowY, right, rowY));
	document.setFontSize(7);
	document.text("NAME", 42, tableTop + 5, { align: "center" });
	document.text("RELATIONSHIP", 88, tableTop + 5, { align: "center" });
	document.text("AGE", 125, tableTop + 5, { align: "center" });
	document.text("STATUS", 152, tableTop + 5, { align: "center" });
	document.text("OCCUPATION", 178, tableTop + 5, { align: "center" });
	document.setFont("helvetica", "normal");
	document.text(document.splitTextToSize(draft.familyComposition ?? "", 170)[0] ?? "", 20, tableTop + 11);
	y = tableTop + tableHeight + 13;
	document.setFont("helvetica", "bold");
	document.setFontSize(10);
	document.text("MEMBERSHIP TO SENIOR CITIZEN ASSOCIATION", pageWidth / 2, y, { align: "center" });
	y += 9;
	line("NAME OF ASSOCIATION", draft.associationName ?? "", left, right);
	y += 8;
	line("ADDRESS OF ASSOCIATION", draft.associationAddress ?? "", left, right);
	y += 8;
	line("DATE OF MEMBERSHIP", draft.associationMembershipDate ?? "", left, 111);
	line("POSITION", draft.associationPosition ?? "", 115, right);
	y += 17;
	document.setFont("helvetica", "normal");
	document.setFontSize(8);
	document.text("Signature of Ass. Pres. / Representative", 139, y, { align: "center" });
	y += 14;
	document.setFont("helvetica", "bold");
	document.text("I certify that the above information are true and correct in the best of my", pageWidth / 2, y, { align: "center" });
	document.text("knowledge and belief.", pageWidth / 2, y + 5, { align: "center" });
	y += 25;
	document.line(125, y, right, y);
	document.setFont("helvetica", "normal");
	document.text("Signature or thumb mark of Senior Citizen", 158, y + 6, { align: "center" });
	document.save(`osca-registration-${(draft.lastName || "senior").toLowerCase().replace(/[^a-z0-9]+/g, "-")}.pdf`);
}
function changedFields(request) {
	const changes = request.changes;
	const senior = request.senior;
	const currentName = senior ? [
		senior.first_name,
		senior.middle_name,
		senior.last_name
	].filter(Boolean).join(" ") : "";
	const nextName = [
		changes.first_name,
		changes.middle_name,
		changes.last_name
	].filter(Boolean).join(" ");
	const currentAge = senior?.birthdate ? (/* @__PURE__ */ new Date()).getFullYear() - Number(String(senior.birthdate).slice(0, 4)) : null;
	const nextAge = changes.birthdate ? (/* @__PURE__ */ new Date()).getFullYear() - Number(changes.birthdate.slice(0, 4)) : null;
	const fields = [];
	if (senior && currentName !== nextName) fields.push([
		"Name",
		currentName,
		nextName
	]);
	if (senior && currentAge !== nextAge) fields.push([
		"Age",
		currentAge ?? "None",
		nextAge ?? "None"
	]);
	if (senior && (senior.contact_number ?? "") !== (changes.contact_number ?? "")) fields.push([
		"Contact",
		senior.contact_number || "None",
		changes.contact_number || "None"
	]);
	if (senior && senior.barangay?.barangay_name !== changes.barangay) fields.push([
		"Barangay",
		senior.barangay?.barangay_name || "None",
		changes.barangay
	]);
	if (senior && senior.benefits?.[0]?.benefit_name !== changes.benefit) fields.push([
		"Benefit",
		senior.benefits[0]?.benefit_name || "None",
		changes.benefit
	]);
	if (senior && (senior.address ?? "") !== (changes.address ?? "")) fields.push([
		"Address",
		senior.address || "None",
		changes.address || "None"
	]);
	return fields;
}
function SeniorRecords() {
	const currentUser = getStoredUser();
	const isHead = currentUser?.role === "head";
	const isLeader = currentUser?.role === "leader";
	const isAdmin = currentUser?.role === "admin";
	const [filter, setFilter] = (0, import_react.useState)("All");
	const [barangayFilter, setBarangayFilter] = (0, import_react.useState)("All");
	const [query, setQuery] = (0, import_react.useState)("");
	const [page, setPage] = (0, import_react.useState)(1);
	const [exporting, setExporting] = (0, import_react.useState)(false);
	const { seniors, totalCount, activeCount, pendingCount, inactiveCount, lastPage, loading, error, loadAllSeniors, createSenior, updateSenior, deleteSenior } = useSeniors({
		page,
		status: filter === "All" ? void 0 : filter.toLowerCase(),
		search: query,
		barangay: barangayFilter === "All" ? "" : barangayFilter
	});
	const [formOpen, setFormOpen] = (0, import_react.useState)(false);
	const [editing, setEditing] = (0, import_react.useState)(null);
	const [viewing, setViewing] = (0, import_react.useState)(null);
	const [deleting, setDeleting] = (0, import_react.useState)(null);
	const [editRequests, setEditRequests] = (0, import_react.useState)([]);
	const [archiveOpen, setArchiveOpen] = (0, import_react.useState)(false);
	const [archivedRecords, setArchivedRecords] = (0, import_react.useState)([]);
	const [archiveLoading, setArchiveLoading] = (0, import_react.useState)(false);
	const [reviewingRequestId, setReviewingRequestId] = (0, import_react.useState)(null);
	const [benefitTransactions, setBenefitTransactions] = (0, import_react.useState)([]);
	const [bulkPreview, setBulkPreview] = (0, import_react.useState)(null);
	const bulkFileInput = (0, import_react.useRef)(null);
	(0, import_react.useEffect)(() => {
		if (isHead) getSeniorEditRequests().then(setEditRequests).catch(() => setEditRequests([]));
	}, [isHead]);
	(0, import_react.useEffect)(() => {
		if (!viewing) return;
		setBenefitTransactions([]);
		apiFetch(`/benefit-transactions?page=1&per_page=50`).then((result) => setBenefitTransactions(result.data)).catch(() => setBenefitTransactions([]));
	}, [viewing]);
	async function reviewEditRequest(request, status) {
		setReviewingRequestId(request.id);
		try {
			await reviewSeniorEditRequest(request.id, status);
			setEditRequests((current) => current.filter((item) => item.id !== request.id));
			toast.success(status === "approved" ? "Senior record update approved." : "Senior record update declined.");
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "Unable to review edit request.");
		} finally {
			setReviewingRequestId(null);
		}
	}
	const filters = (0, import_react.useMemo)(() => [
		{
			key: "All",
			count: totalCount
		},
		{
			key: "Active",
			count: activeCount
		},
		{
			key: "Pending",
			count: pendingCount
		},
		{
			key: "Inactive",
			count: inactiveCount
		}
	], [
		totalCount,
		activeCount,
		pendingCount,
		inactiveCount
	]);
	const rows = seniors;
	async function openArchive() {
		setArchiveOpen(true);
		setArchiveLoading(true);
		try {
			const result = await apiFetch("/seniors/archive");
			setArchivedRecords(result.data.filter((record) => Boolean(record?.osca_id_number)));
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "Unable to load the archive.");
		} finally {
			setArchiveLoading(false);
		}
	}
	async function restoreRecord(oscaId) {
		try {
			await apiFetch(`/seniors/archive/${encodeURIComponent(oscaId)}/restore`, { method: "POST" });
			setArchivedRecords((records) => records.filter((record) => record.osca_id_number !== oscaId));
			toast.success(`${oscaId} was restored.`);
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "Unable to restore the record.");
		}
	}
	async function handleBulkFile(event) {
		const file = event.target.files?.[0];
		event.target.value = "";
		if (!file) return;
		let records;
		try {
			records = await readBulkRecords(file);
		} catch {
			toast.error("Unable to read the file. Please upload a valid CSV or Excel file.");
			return;
		}
		if (records.length === 0) {
			toast.error("The file must contain a header row and at least one senior record.");
			return;
		}
		const normalizedRecords = records.map((record) => {
			const birthdate = normalizeBulkDate(record["birthdate"] ?? record["date_of_birth"] ?? record["dob"]);
			const age = (/* @__PURE__ */ new Date()).getFullYear() - Number(birthdate.slice(0, 4));
			const benefit = String(record["benefit"] ?? (age >= 100 ? "Centenarian Award" : age >= 90 ? "Nonagenarian Grant" : age >= 80 ? "Octogenarian Grant" : "Social Pension")).trim();
			return {
				first_name: String(record["first_name"] ?? "").trim(),
				middle_name: String(record["middle_name"] ?? "").trim(),
				last_name: String(record["last_name"] ?? "").trim(),
				birthdate,
				sex: String(record["sex"] ?? "").toLowerCase(),
				contact_number: String(record["contact_number"] ?? record["contact"] ?? "").trim(),
				barangay: String(record["barangay"] ?? "").trim(),
				address: String(record["address"] ?? "").trim(),
				benefit
			};
		});
		setBulkPreview(normalizedRecords);
	}
	async function confirmBulkImport() {
		if (!bulkPreview) return;
		try {
			const result = await bulkCreateSeniors(bulkPreview);
			const failed = result.failed.length;
			if (failed) toast.error(`${result.created.length} records added, ${failed} failed. ${result.failed[0]?.message ?? "Check the uploaded data."}`);
			else toast.success(`${result.created.length} senior records added and are pending review.`);
			setBulkPreview(null);
			window.location.reload();
		} catch (reason) {
			toast.error(reason instanceof Error ? reason.message : "Bulk upload failed.");
		}
	}
	async function exportRecords() {
		setExporting(true);
		try {
			const exportRows = await loadAllSeniors();
			if (exportRows.length === 0) {
				toast.error("There are no senior records to export.");
				return;
			}
			const { jsPDF } = await import("../_libs/jspdf.mjs").then((n) => /* @__PURE__ */ __toESM(n.t()));
			const document = new jsPDF({ orientation: "landscape" });
			const generatedDate = /* @__PURE__ */ new Date();
			const logoDataUrl = await loadPdfLogo();
			document.addImage(logoDataUrl, "PNG", 14, 7, 14, 14);
			document.setFontSize(18);
			document.text("Bulan SeniorCare", 32, 18);
			document.setFontSize(13);
			document.text("Senior Citizen Records", 14, 28);
			document.setFontSize(9);
			document.text(`Generated: ${generatedDate.toLocaleDateString()}`, 14, 36);
			document.text(`Records: ${exportRows.length}`, 14, 43);
			let y = 56;
			document.setFontSize(9);
			document.setFont("helvetica", "bold");
			document.text("Senior ID", 14, y);
			document.text("Name", 48, y);
			document.text("Age", 118, y);
			document.text("Barangay", 138, y);
			document.text("Contact", 195, y);
			document.text("Benefit", 235, y);
			document.text("Status", 275, y);
			document.setFont("helvetica", "normal");
			y += 7;
			exportRows.forEach((senior) => {
				if (y > 195) {
					document.addPage();
					y = 18;
				}
				document.text(senior.id, 14, y);
				document.text(document.splitTextToSize(senior.name, 62)[0] ?? senior.name, 48, y);
				document.text(String(senior.age), 118, y);
				document.text(document.splitTextToSize(senior.barangay, 52)[0] ?? senior.barangay, 138, y);
				document.text(document.splitTextToSize(senior.contact, 34)[0] ?? senior.contact, 195, y);
				document.text(document.splitTextToSize(senior.benefit, 34)[0] ?? senior.benefit, 235, y);
				document.text(senior.status, 275, y);
				y += 7;
			});
			document.save(`bulan-seniorcare-records-${generatedDate.toISOString().slice(0, 10)}.pdf`);
			toast.success("Senior records exported as PDF.");
		} catch {
			toast.error("Unable to export senior records.");
		} finally {
			setExporting(false);
		}
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AppShell, {
		title: "Senior Record",
		subtitle: "Manage all registered senior citizens",
		breadcrumb: ["Dashboard", "Senior Records"],
		actions: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex gap-3",
			children: [
				(isLeader || isAdmin) && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						onClick: () => bulkFileInput.current?.click(),
						className: "inline-flex items-center gap-2 rounded-full bg-card px-6 py-3.5 text-sm font-semibold shadow-[var(--shadow-soft)]",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Upload, { className: "h-4 w-4" }), " Bulk record"]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						ref: bulkFileInput,
						type: "file",
						accept: ".csv,.xls,.xlsx,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
						onChange: handleBulkFile,
						className: "hidden"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						onClick: () => {
							setEditing(null);
							setFormOpen(true);
						},
						className: "bg-navy inline-flex items-center gap-2 rounded-full px-6 py-3.5 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-card)]",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "h-4 w-4" }), " Register Senior"]
					})
				] }),
				isAdmin && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					onClick: openArchive,
					className: "inline-flex items-center gap-2 rounded-full bg-card px-6 py-3.5 text-sm font-semibold shadow-[var(--shadow-soft)]",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Archive, { className: "h-4 w-4" }), " Archive"]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					type: "button",
					onClick: exportRecords,
					disabled: exporting,
					className: "inline-flex items-center gap-2 rounded-full bg-card px-6 py-3.5 text-sm font-semibold shadow-[var(--shadow-soft)]",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Download, { className: "h-4 w-4" }),
						" ",
						exporting ? "Preparing..." : "Export"
					]
				})
			]
		}),
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-wrap items-center gap-3",
				children: [
					filters.map((f) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						onClick: () => {
							setFilter(f.key);
							setPage(1);
						},
						className: filter === f.key ? "bg-navy rounded-full px-6 py-3 text-sm font-bold text-primary-foreground shadow-[var(--shadow-soft)]" : "rounded-full bg-card px-6 py-3 text-sm font-semibold text-muted-foreground shadow-[var(--shadow-soft)]",
						children: [
							f.key,
							" ",
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "ml-1 opacity-70",
								children: f.count
							})
						]
					}, f.key)),
					!isLeader && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
						value: barangayFilter,
						onChange: (event) => {
							setBarangayFilter(event.target.value);
							setPage(1);
						},
						"aria-label": "Filter by barangay",
						className: "h-12 min-w-[240px] rounded-full bg-card px-5 text-sm font-semibold text-foreground shadow-[var(--shadow-soft)] outline-none focus:ring-2 focus:ring-ring/30",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
							value: "All",
							children: "All barangays"
						}), BARANGAYS.map((barangay) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
							value: barangay,
							children: barangay
						}, barangay))]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "relative min-w-[240px] flex-1",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Search, { className: "absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-muted-foreground" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							value: query,
							onChange: (e) => {
								setQuery(e.target.value);
								setPage(1);
							},
							placeholder: "Search by name or OSCA ID...",
							className: "h-12 w-full rounded-full bg-card pr-4 pl-11 text-sm shadow-[var(--shadow-soft)] outline-none focus:ring-2 focus:ring-ring/30"
						})]
					})
				]
			}),
			isHead && editRequests.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "surface-card mt-6 p-6",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "text-lg font-bold",
					children: "Senior record edit requests"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-1 text-sm text-muted-foreground",
					children: "Review changes submitted by BSCA before they update the official record."
				})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mt-5 space-y-3",
					children: editRequests.map((request) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-secondary p-4",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "text-sm",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "font-bold",
									children: request.senior ? [
										request.senior.first_name,
										request.senior.middle_name,
										request.senior.last_name
									].filter(Boolean).join(" ") : [
										request.changes?.first_name,
										request.changes?.middle_name,
										request.changes?.last_name
									].filter(Boolean).join(" ") || "Senior record"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
									className: "mt-1 text-xs text-muted-foreground",
									children: [
										request.senior?.osca_id_number ?? "Senior record",
										" · Requested by ",
										request.requester?.name ?? "Unknown user"
									]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "mt-2 space-y-1 text-xs text-muted-foreground",
									children: [changedFields(request).map(([field, current, next]) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
											className: "font-semibold text-foreground",
											children: [field, ":"]
										}),
										" ",
										current,
										" to ",
										next
									] }, field)), changedFields(request).length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "No changed values found." })]
								})
							]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								disabled: reviewingRequestId === request.id,
								onClick: () => reviewEditRequest(request, "declined"),
								className: "rounded-full bg-card px-4 py-2.5 text-sm font-semibold text-destructive disabled:opacity-50",
								children: reviewingRequestId === request.id ? "Saving..." : "Decline"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								disabled: reviewingRequestId === request.id,
								onClick: () => reviewEditRequest(request, "approved"),
								className: "bg-navy rounded-full px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50",
								children: reviewingRequestId === request.id ? "Saving..." : "Approve"
							})]
						})]
					}, request.id))
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "surface-card mt-6 overflow-x-auto p-2",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", {
					className: "w-full min-w-[880px] border-collapse text-sm",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tr", {
						className: "text-left text-muted-foreground",
						children: [
							"Name",
							"Senior ID",
							"Age",
							"Barangay",
							"Contact",
							"Benefit",
							"Status",
							"Actions"
						].map((h) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
							className: "px-5 py-5 font-bold text-foreground",
							children: h
						}, h))
					}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tbody", { children: [loading ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tr", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
						colSpan: 8,
						className: "px-5 py-12 text-center text-muted-foreground",
						children: "Loading senior records..."
					}) }) : error ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tr", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
						colSpan: 8,
						className: "px-5 py-12 text-center text-destructive",
						children: "Unable to load senior records. Please refresh and try again."
					}) }) : rows.map((s) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
						className: "border-t border-border",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
								className: "px-5 py-4",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-center gap-3",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "bg-navy grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full text-[11px] font-bold text-primary-foreground",
										children: avatarPath(s) ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
											src: `${API_URL.replace(/\/api$/, "")}/storage/${avatarPath(s)}`,
											alt: `${s.name} profile`,
											className: "h-full w-full object-cover",
											loading: "lazy",
											decoding: "async"
										}) : initials(s.name)
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "font-medium",
										children: s.name
									})]
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
								className: "px-5 py-4 text-muted-foreground",
								children: s.id
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
								className: "px-5 py-4",
								children: s.age
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
								className: "px-5 py-4 text-muted-foreground",
								children: s.barangay
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
								className: "px-5 py-4 text-muted-foreground",
								children: s.contact
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
								className: "px-5 py-4",
								children: s.benefit
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
								className: `px-5 py-4 font-bold ${STATUS_CLASS[s.status]}`,
								children: s.status
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
								className: "px-5 py-4",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex gap-2",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											"aria-label": `View record of ${s.name}`,
											onClick: () => setViewing(s),
											className: "grid h-9 w-9 place-items-center rounded-full bg-secondary transition-colors hover:bg-muted",
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Eye, { className: "h-4 w-4" })
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											"aria-label": `Edit record of ${s.name}`,
											onClick: () => {
												setEditing(s);
												setFormOpen(true);
											},
											className: "grid h-9 w-9 place-items-center rounded-full bg-secondary transition-colors hover:bg-muted",
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pencil, { className: "h-4 w-4" })
										}),
										isAdmin && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											"aria-label": `Delete record of ${s.name}`,
											onClick: () => setDeleting(s),
											className: "grid h-9 w-9 place-items-center rounded-full bg-secondary text-destructive transition-colors hover:bg-destructive/10",
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { className: "h-4 w-4" })
										}),
										!isAdmin && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											"aria-label": `Archive record of ${s.name}`,
											title: "Archive record",
											onClick: async () => {
												if (!window.confirm(`Archive the record of ${s.name}?`)) return;
												try {
													await apiFetch(`/seniors/${encodeURIComponent(s.id)}/archive`, { method: "POST" });
													toast.success(`${s.name}'s record was archived.`);
													window.location.reload();
												} catch (error) {
													toast.error(error instanceof Error ? error.message : "Unable to archive the record.");
												}
											},
											className: "grid h-9 w-9 place-items-center rounded-full bg-secondary text-muted-foreground transition-colors hover:bg-muted",
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Archive, { className: "h-4 w-4" })
										})
									]
								})
							})
						]
					}, s.id)), !loading && !error && rows.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tr", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
						colSpan: 8,
						className: "px-5 py-12 text-center text-muted-foreground",
						children: "No records match this filter."
					}) })] })]
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-4 flex items-center justify-between gap-3 text-sm text-muted-foreground",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
					"Page ",
					page,
					" of ",
					lastPage
				] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						disabled: page <= 1 || loading,
						onClick: () => setPage((current) => current - 1),
						className: "rounded-full bg-card px-4 py-2 font-semibold disabled:opacity-50",
						children: "Previous"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						disabled: page >= lastPage || loading,
						onClick: () => setPage((current) => current + 1),
						className: "rounded-full bg-card px-4 py-2 font-semibold disabled:opacity-50",
						children: "Next"
					})]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Dialog, {
				open: !!bulkPreview,
				onOpenChange: (open) => !open && setBulkPreview(null),
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogContent, {
					className: "max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-2xl",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogHeader, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogTitle, {
							className: "font-display",
							children: "Preview bulk import"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogDescription, { children: [
							"Review ",
							bulkPreview?.length ?? 0,
							" records before importing. Invalid rows will be rejected by the server."
						] })] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "max-h-80 overflow-auto rounded-xl border border-border",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", {
								className: "w-full text-left text-xs",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", {
									className: "bg-secondary",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
											className: "px-3 py-2",
											children: "Name"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
											className: "px-3 py-2",
											children: "Birthdate"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
											className: "px-3 py-2",
											children: "Sex"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
											className: "px-3 py-2",
											children: "Barangay"
										})
									] })
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: (bulkPreview ?? []).slice(0, 50).map((record, index) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
									className: "border-t border-border",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", {
											className: "px-3 py-2",
											children: [
												record.first_name,
												" ",
												record.last_name
											]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
											className: "px-3 py-2",
											children: record.birthdate
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
											className: "px-3 py-2",
											children: record.sex || "Missing"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
											className: "px-3 py-2",
											children: record.barangay || "Missing"
										})
									]
								}, `${record.first_name}-${record.last_name}-${index}`)) })]
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex justify-end gap-3",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								onClick: () => setBulkPreview(null),
								className: "rounded-full bg-secondary px-5 py-3 text-sm font-semibold",
								children: "Cancel"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								onClick: confirmBulkImport,
								className: "bg-navy rounded-full px-5 py-3 text-sm font-semibold text-primary-foreground",
								children: "Import records"
							})]
						})
					]
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Dialog, {
				open: archiveOpen,
				onOpenChange: setArchiveOpen,
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogContent, {
					className: "sm:max-w-lg",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogHeader, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogTitle, {
						className: "font-display",
						children: "Deleted record archive"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogDescription, { children: "OSCA IDs for records deleted by an administrator." })] }), archiveLoading ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "py-8 text-center text-sm text-muted-foreground",
						children: "Loading archive..."
					}) : archivedRecords.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "py-8 text-center text-sm text-muted-foreground",
						children: "No deleted records."
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "max-h-80 divide-y divide-border overflow-y-auto",
						children: archivedRecords.map((record) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center justify-between gap-4 py-3",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "font-semibold",
								children: record.osca_id_number
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "text-sm text-muted-foreground",
								children: [
									[record.first_name, record.last_name].filter(Boolean).join(" "),
									" · Deleted ",
									new Date(record.deleted_at).toLocaleDateString()
								]
							})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								onClick: () => restoreRecord(record.osca_id_number),
								"aria-label": `Restore ${record.osca_id_number}`,
								className: "grid h-9 w-9 shrink-0 place-items-center rounded-full bg-secondary text-foreground transition-colors hover:bg-muted",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Undo2, { className: "h-4 w-4" })
							})]
						}, record.osca_id_number))
					})]
				})
			}),
			(!isHead || !!editing) && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SeniorFormDialog, {
				open: formOpen,
				onOpenChange: setFormOpen,
				senior: editing,
				isLeader,
				leaderBarangay: isLeader ? BARANGAYS[(currentUser?.barangay_id ?? 0) - 1] : void 0,
				onSubmit: async (draft) => {
					try {
						if (editing) {
							await updateSenior(editing.id, draft);
							toast.success(isLeader ? "Update request sent to the Head for approval." : `${draft.name}'s record was updated.`);
						} else {
							const created = await createSenior(draft);
							await downloadRegistrationForm({
								...draft,
								id: created.id
							});
							toast.success(`${draft.name} was registered and is pending review.`);
						}
					} catch (reason) {
						toast.error(reason instanceof Error ? reason.message : "Unable to register senior.");
					}
				}
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Dialog, {
				open: !!viewing,
				onOpenChange: (o) => !o && setViewing(null),
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogContent, {
					className: "max-h-[calc(100vh-2rem)] overflow-y-auto bg-slate-50 sm:max-w-md",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogHeader, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogTitle, {
							className: "font-display text-lg",
							children: viewing?.name
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogDescription, {
							className: "flex items-center gap-2 text-xs",
							children: [
								"OSCA ID ",
								viewing?.id,
								viewing?.id && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
									type: "button",
									className: "inline-flex items-center gap-1 font-semibold text-foreground",
									onClick: () => navigator.clipboard.writeText(viewing.id).then(() => toast.success("OSCA ID copied.")),
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Clipboard, { className: "h-3 w-3" }), " Copy"]
								})
							]
						})] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dl", {
							className: "grid grid-cols-2 gap-x-8 gap-y-4 text-sm",
							children: [
								["Age", viewing?.age],
								["Barangay", viewing?.barangay],
								["Contact", viewing?.contact],
								["Benefit", viewing?.benefit],
								["Status", viewing?.status]
							].map(([label, value]) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
								className: "text-muted-foreground",
								children: label
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", {
								className: "mt-0.5 font-semibold",
								children: value
							})] }, String(label)))
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mt-5 border-t border-border pt-5",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-sm font-bold",
								children: "Registration information"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dl", {
								className: "mt-4 grid grid-cols-2 gap-x-8 gap-y-4 text-sm",
								children: [
									["Place of birth", viewing?.placeOfBirth || "Not provided"],
									["Date of birth", viewing?.birthdate || "Not provided"],
									["Sex", viewing?.sex ? viewing.sex.charAt(0).toUpperCase() + viewing.sex.slice(1) : "Not provided"],
									["Civil status", viewing?.civilStatus || "Not provided"],
									["Address", viewing?.address || "Not provided"],
									["Educational attainment", viewing?.educationalAttainment || "Not provided"],
									["Other skills", viewing?.otherSkills || "Not provided"]
								].map(([label, value]) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: label === "Address" || label === "Educational attainment" || label === "Other skills" ? "col-span-2" : "",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
										className: "text-muted-foreground",
										children: label
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", {
										className: "mt-0.5 font-semibold",
										children: value
									})]
								}, String(label)))
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mt-5 border-t border-border pt-5",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-sm font-bold",
								children: "Family composition"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-2 whitespace-pre-line rounded-xl bg-secondary px-3 py-3 text-sm",
								children: viewing?.familyComposition || "Not provided"
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mt-5 border-t border-border pt-5",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-sm font-bold",
								children: "Senior citizen association"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dl", {
								className: "mt-4 grid grid-cols-2 gap-x-8 gap-y-4 text-sm",
								children: [
									["Name of association", viewing?.associationName || "Not provided"],
									["Address of association", viewing?.associationAddress || "Not provided"],
									["Date of membership", viewing?.associationMembershipDate || "Not provided"],
									["Position", viewing?.associationPosition || "Not provided"]
								].map(([label, value]) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: label === "Name of association" || label === "Address of association" ? "col-span-2" : "",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
										className: "text-muted-foreground",
										children: label
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", {
										className: "mt-0.5 font-semibold",
										children: value
									})]
								}, String(label)))
							})]
						}),
						(() => {
							const history = benefitTransactions.filter((transaction) => transaction.senior.osca_id_number === viewing?.id).sort((first, second) => {
								const firstDate = first.date_distributed ?? first.created_at;
								const secondDate = second.date_distributed ?? second.created_at;
								return new Date(firstDate).getTime() - new Date(secondDate).getTime();
							});
							const latest = history.at(-1);
							return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "mt-5 border-t border-border pt-5",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "text-sm font-bold",
										children: "Benefit release history"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
										className: "mt-1 text-xs text-muted-foreground",
										children: ["Latest release: ", latest?.date_distributed ? (/* @__PURE__ */ new Date(`${latest.date_distributed}T00:00:00`)).toLocaleDateString() : "No release recorded"]
									}),
									history.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "mt-3 overflow-x-auto",
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", {
											className: "w-full table-fixed text-xs",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
												className: "border-b border-border text-left text-muted-foreground",
												children: [
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
														className: "w-[34%] px-1 py-2",
														children: "Release period"
													}),
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
														className: "w-[22%] px-1 py-2",
														children: "Actual date"
													}),
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
														className: "w-[20%] px-1 py-2",
														children: "Amount"
													}),
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
														className: "w-[24%] px-1 py-2",
														children: "Status"
													})
												]
											}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: history.map((transaction) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
												className: "border-b border-border last:border-0",
												children: [
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
														className: "truncate px-1 py-2 font-semibold",
														children: transaction.period_label ?? "-"
													}),
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
														className: "truncate px-1 py-2",
														children: transaction.date_distributed ? (/* @__PURE__ */ new Date(`${transaction.date_distributed}T00:00:00`)).toLocaleDateString() : "-"
													}),
													/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", {
														className: "truncate px-1 py-2",
														children: ["₱", Number(transaction.amount).toLocaleString()]
													}),
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
														className: "truncate px-1 py-2 font-semibold",
														children: transaction.status === "released" ? "Released" : transaction.status === "failed" ? "Not received" : "Pending"
													})
												]
											}, transaction.id)) })]
										})
									})
								]
							});
						})(),
						viewing && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mt-5 border-t border-border pt-5",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-sm font-bold",
								children: "Submitted files"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "mt-3 flex flex-wrap items-start gap-3",
								children: [
									viewing.photoPath && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("a", {
										href: `${API_URL.replace(/\/api$/, "")}/storage/${viewing.photoPath}`,
										target: "_blank",
										rel: "noreferrer",
										className: "flex w-20 flex-col gap-2 text-xs font-semibold",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
											src: `${API_URL.replace(/\/api$/, "")}/storage/${viewing.photoPath}`,
											alt: `${viewing.name} profile`,
											className: "h-20 w-20 rounded-xl border border-border object-cover"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Profile photo" })]
									}),
									viewing.idDocumentPath && !viewing.validIdPath && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("a", {
										href: `${API_URL.replace(/\/api$/, "")}/storage/${viewing.idDocumentPath}`,
										target: "_blank",
										rel: "noreferrer",
										className: "flex w-20 flex-col gap-2 text-xs font-semibold",
										children: [isImageDocument(viewing.idDocumentPath) && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
											src: `${API_URL.replace(/\/api$/, "")}/storage/${viewing.idDocumentPath}`,
											alt: "Valid ID",
											className: "h-20 w-20 rounded-xl border border-border object-cover"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Valid ID" })]
									}),
									viewing.validIdPath && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("a", {
										href: `${API_URL.replace(/\/api$/, "")}/storage/${viewing.validIdPath}`,
										target: "_blank",
										rel: "noreferrer",
										className: "flex w-20 flex-col gap-2 text-xs font-semibold",
										children: [isImageDocument(viewing.validIdPath) && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
											src: `${API_URL.replace(/\/api$/, "")}/storage/${viewing.validIdPath}`,
											alt: "Valid ID",
											className: "h-20 w-20 rounded-xl border border-border object-cover"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Valid ID" })]
									}),
									viewing.birthCertificatePath && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("a", {
										href: `${API_URL.replace(/\/api$/, "")}/storage/${viewing.birthCertificatePath}`,
										target: "_blank",
										rel: "noreferrer",
										className: "flex w-20 flex-col gap-2 text-xs font-semibold",
										children: [isImageDocument(viewing.birthCertificatePath) && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
											src: `${API_URL.replace(/\/api$/, "")}/storage/${viewing.birthCertificatePath}`,
											alt: "Birth Certificate",
											className: "h-20 w-20 rounded-xl border border-border object-cover"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Birth Certificate" })]
									}),
									!viewing.birthCertificatePath && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "rounded-xl border border-dashed border-border px-3 py-3 text-xs text-muted-foreground",
										children: "Birth Certificate not uploaded"
									})
								]
							})]
						}),
						viewing && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							type: "button",
							onClick: async () => {
								try {
									const nameParts = viewing.name.split(" ");
									await downloadRegistrationForm({
										...viewing,
										firstName: nameParts[0] ?? "",
										middleName: nameParts.slice(1, -1).join(" "),
										lastName: nameParts.at(-1) ?? "",
										status: viewing.status
									});
									toast.success("Registration form downloaded.");
								} catch {
									toast.error("Unable to download the registration form.");
								}
							},
							className: "mt-5 flex w-full items-center justify-center rounded-full bg-navy px-5 py-3 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-soft)]",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Download, { className: "mr-2 h-4 w-4" }), " Download Registration Form"]
						})
					]
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlertDialog, {
				open: !!deleting,
				onOpenChange: (o) => !o && setDeleting(null),
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AlertDialogContent, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AlertDialogHeader, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlertDialogTitle, { children: "Delete this senior record?" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AlertDialogDescription, { children: [
					deleting?.name,
					" (",
					deleting?.id,
					") will be removed from the OSCA registry. This action cannot be undone."
				] })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AlertDialogFooter, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlertDialogCancel, { children: "Cancel" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlertDialogAction, {
					onClick: () => {
						if (!deleting) return;
						deleteSenior(deleting.id);
						toast.success(`${deleting.name}'s record was deleted.`);
						setDeleting(null);
					},
					children: "Delete record"
				})] })] })
			})
		]
	});
}
//#endregion
export { SeniorRecords as component };
