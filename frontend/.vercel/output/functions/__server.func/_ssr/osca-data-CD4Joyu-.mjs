//#region node_modules/.nitro/vite/services/ssr/assets/osca-data-CD4Joyu-.js
var BENEFIT_PROGRAMS = [
	{
		name: "Social Pension",
		type: "social_pension",
		minAge: 60,
		amount: "₱3,000",
		schedule: "Quarterly",
		funding: "National"
	},
	{
		name: "Octogenarian Grant",
		type: "octogenarian",
		minAge: 80,
		maxAge: 85,
		amount: "₱10,000",
		schedule: "One-time",
		funding: "National"
	},
	{
		name: "Nonagenarian Grant",
		type: "nonagenarian",
		minAge: 90,
		maxAge: 95,
		amount: "₱10,000",
		schedule: "One-time",
		funding: "National"
	},
	{
		name: "Centenarian Award",
		type: "centenarian",
		minAge: 100,
		maxAge: 100,
		amount: "₱100,000",
		schedule: "One-time",
		funding: "National"
	},
	{
		name: "Precentenarian Program",
		type: "precentenarian",
		minAge: 85,
		maxAge: 99,
		amount: "Variable",
		schedule: "When funds are available",
		funding: "Municipal"
	},
	{
		name: "Provincial Program",
		type: "provincial",
		minAge: 80,
		maxAge: 99,
		amount: "₱5,000",
		schedule: "When funds are available",
		funding: "Provincial"
	}
];
function findNewEligibilityFlags(seniors) {
	return seniors.flatMap((senior) => {
		const program = BENEFIT_PROGRAMS.find((program) => senior.age >= program.minAge && (program.maxAge === void 0 || senior.age <= program.maxAge) && program.type !== "social_pension");
		return program ? [{
			senior,
			program,
			reason: `${senior.name} is ${senior.age}, within the ${program.name} age bracket.`
		}] : [];
	});
}
var BARANGAYS = [
	"A. Bonifacio (Tinurilan)",
	"Abad Santos (Kambal)",
	"Aguinaldo (Lipata Dako)",
	"Antipolo",
	"Aquino (Imelda)",
	"Beguin",
	"Bical",
	"Bonga",
	"Butag",
	"Cadandanan",
	"Calomagon",
	"Calpi",
	"Cocok-Cabitan",
	"Daganas",
	"Danao",
	"Dolos",
	"E. Quirino (Pinangomhan)",
	"Fabrica",
	"G. Del Pilar (Tanga)",
	"Gate",
	"Inararan",
	"J. Gerona (Biton)",
	"J.P. Laurel (Pon-od)",
	"Jamorawon",
	"Lajong",
	"Libertad (Calle Putol)",
	"Magsaysay (Bongog)",
	"Managa-naga",
	"Marinab",
	"Montecalvario",
	"N. Roque (Calayugan)",
	"Namo",
	"Nasuje",
	"Obrero",
	"Osmeña (Lipata Saday)",
	"Otavi",
	"Padre Diaz",
	"Palale",
	"Quezon (Cabarawan)",
	"R. Gerona (Butag)",
	"Recto",
	"Roxas (Busay)",
	"Sagrada",
	"San Francisco (Polot)",
	"San Isidro (Cabugaan)",
	"San Juan Bag-o",
	"San Juan Daan",
	"San Rafael (Togbongon)",
	"San Ramon",
	"San Vicente",
	"Santa Remedios",
	"Santa Teresita (Trece)",
	"Sigad",
	"Somagongsong",
	"Tarhan",
	"Taromata",
	"Zone 1 (Ilawod)",
	"Zone 2 (Sabang)",
	"Zone 3 (Central)",
	"Zone 4 (Central Business District)",
	"Zone 5 (Canipaan)",
	"Zone 6 (Baybay)",
	"Zone 7 (Iraya)",
	"Zone 8 (Loyo)"
];
var names = [
	"Maria L. Santos",
	"Jose R. Reyes",
	"Rosa C. Dela Cruz",
	"Antonio P. Flores",
	"Elena C. Bernardo",
	"Benjamin M. Villanueva",
	"Lourdes G. Magno",
	"Jecel Garbin",
	"Jasmin Sabawil",
	"Renzo J. Jazareno",
	"Justin L. Gojar",
	"Corazon B. Espinosa",
	"Pedro T. Gallanosa",
	"Nenita F. Guilay",
	"Ramon D. Gerona",
	"Teresita A. Golpeo",
	"Danilo S. Hallare",
	"Miguela V. Fuentes"
];
function benefitFor(age, i) {
	if (age >= 100) return "Centenarian";
	if (age >= 90) return "Nonagenarian";
	if (age >= 80) return "Octogenarian";
	return i % 3 === 0 ? "Social Pension" : "Social Pension";
}
var AGES = [
	73,
	67,
	89,
	91,
	67,
	88,
	79,
	86,
	77,
	68,
	71,
	94,
	82,
	65,
	101,
	76,
	84,
	69
];
names.map((name, i) => {
	const age = AGES[i] ?? 70;
	const status = i % 5 === 2 || i % 7 === 3 ? "Inactive" : i % 6 === 4 ? "Pending" : "Active";
	return {
		id: `BSC-2024-${String(i + 1).padStart(4, "0")}`,
		name,
		age,
		barangay: BARANGAYS[i % BARANGAYS.length] ?? BARANGAYS[0],
		address: "",
		contact: `09${17 + i % 8}-${String(100 + i * 7).slice(0, 3)}-${String(4e3 + i * 131).slice(0, 4)}`,
		benefit: benefitFor(age, i),
		status
	};
});
//#endregion
export { BENEFIT_PROGRAMS as n, findNewEligibilityFlags as r, BARANGAYS as t };
