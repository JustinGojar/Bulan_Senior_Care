export type Senior = {
  id: string;
  name: string;
  age: number;
  barangay: string;
  contact: string;
  benefit: string;
  status: "Active" | "Pending" | "Inactive";
  photoPath?: string | null;
  idDocumentPath?: string | null;
};

export type BenefitProgram = {
  name: string;
  type:
    | "social_pension"
    | "octogenarian"
    | "nonagenarian"
    | "centenarian"
    | "precentenarian"
    | "provincial";
  minAge: number;
  maxAge?: number;
  amount: string;
  schedule: "Quarterly" | "One-time" | "When funds are available";
  funding: "National" | "Municipal" | "Provincial";
};

export const BENEFIT_PROGRAMS: BenefitProgram[] = [
  {
    name: "Social Pension",
    type: "social_pension",
    minAge: 60,
    amount: "₱3,000",
    schedule: "Quarterly",
    funding: "National",
  },
  {
    name: "Octogenarian Grant",
    type: "octogenarian",
    minAge: 80,
    maxAge: 85,
    amount: "₱10,000",
    schedule: "One-time",
    funding: "National",
  },
  {
    name: "Nonagenarian Grant",
    type: "nonagenarian",
    minAge: 90,
    maxAge: 95,
    amount: "₱10,000",
    schedule: "One-time",
    funding: "National",
  },
  {
    name: "Centenarian Award",
    type: "centenarian",
    minAge: 100,
    maxAge: 100,
    amount: "₱100,000",
    schedule: "One-time",
    funding: "National",
  },
  {
    name: "Precentenarian Program",
    type: "precentenarian",
    minAge: 85,
    maxAge: 99,
    amount: "Variable",
    schedule: "When funds are available",
    funding: "Municipal",
  },
  {
    name: "Provincial Program",
    type: "provincial",
    minAge: 80,
    maxAge: 99,
    amount: "₱5,000",
    schedule: "When funds are available",
    funding: "Provincial",
  },
];

export type EligibilityFlag = {
  senior: Senior;
  program: BenefitProgram;
  reason: string;
};

export function findNewEligibilityFlags(seniors: Senior[]): EligibilityFlag[] {
  return seniors.flatMap((senior) =>
    BENEFIT_PROGRAMS.filter(
      (program) =>
        senior.age >= program.minAge &&
        (program.maxAge === undefined || senior.age <= program.maxAge) &&
        program.type !== "social_pension",
    ).map((program) => ({
      senior,
      program,
      reason: `${senior.name} is ${senior.age}, within the ${program.name} age bracket.`,
    })),
  );
}

export const BARANGAYS = [
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
  "Zone 8 (Loyo)",
];

const names = [
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
  "Miguela V. Fuentes",
];

function benefitFor(age: number, i: number) {
  if (age >= 100) return "Centenarian";
  if (age >= 90) return "Nonagenarian";
  if (age >= 80) return "Octogenarian";
  return i % 3 === 0 ? "Social Pension" : "Social Pension";
}

const AGES = [73, 67, 89, 91, 67, 88, 79, 86, 77, 68, 71, 94, 82, 65, 101, 76, 84, 69];

export const SENIORS: Senior[] = names.map((name, i) => {
  const age = AGES[i] ?? 70;
  const status: Senior["status"] =
    i % 5 === 2 || i % 7 === 3 ? "Inactive" : i % 6 === 4 ? "Pending" : "Active";
  return {
    id: `BSC-2024-${String(i + 1).padStart(4, "0")}`,
    name,
    age,
    barangay: BARANGAYS[i % BARANGAYS.length] ?? BARANGAYS[0]!,
    contact: `09${17 + (i % 8)}-${String(100 + i * 7).slice(0, 3)}-${String(4000 + i * 131).slice(0, 4)}`,
    benefit: benefitFor(age, i),
    status,
  };
});

export const STATS = {
  totalRegistered: 1245,
  benefitsDistributed: "₱2.5M",
  activeSeniors: 980,
  pending: 132,
  inactive: 133,
  received: 842,
  pendingBenefits: 403,
};

export const ZONE_PARTICIPANTS = [
  { zone: "Zone 1", total: 8 },
  { zone: "Zone 2", total: 22 },
  { zone: "Zone 3", total: 28 },
  { zone: "Zone 4", total: 34 },
  { zone: "Zone 5", total: 38 },
  { zone: "Zone 6", total: 85 },
  { zone: "Zone 7", total: 62 },
  { zone: "Zone 8", total: 78 },
];

export const AGE_DISTRIBUTION = [
  { age: "60", male: 44, female: 52 },
  { age: "70", male: 46, female: 65 },
  { age: "80", male: 22, female: 16 },
  { age: "90", male: 3, female: 5 },
  { age: "100", male: 1, female: 2 },
];

export const BENEFIT_RECORDS = [
  { name: "Social Pension", value: 520 },
  { name: "Octogenarian", value: 380 },
  { name: "Nonagenarian", value: 180 },
  { name: "Centenarian", value: 65 },
];

export const BARANGAY_SUMMARY = [
  { barangay: "Poblacion", registered: 312, released: 264 },
  { barangay: "Salog", registered: 245, released: 198 },
  { barangay: "Calpi", registered: 189, released: 141 },
  { barangay: "Panlayaan", registered: 174, released: 132 },
  { barangay: "Fabrica", registered: 168, released: 107 },
];

export const ANNOUNCEMENTS = [
  { title: "Quarterly benefit distribution scheduled for Apr 25", date: "Apr 18, 2026" },
  { title: "Updated ID validation process effective May 1", date: "Apr 15, 2026" },
  { title: "Health screening drive at Bulan Gymnasium", date: "Apr 10, 2026" },
];

export const DISTRIBUTION_STATUS = [
  { label: "Completed", value: 842, total: 1245, tone: "gold" as const },
  { label: "In Progress", value: 271, total: 1245, tone: "navy" as const },
  { label: "Pending", value: 132, total: 1245, tone: "coral" as const },
];
