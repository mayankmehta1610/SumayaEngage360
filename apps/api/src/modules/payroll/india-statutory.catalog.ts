// India statutory payroll catalog — EPF, ESI, Professional Tax and income-tax
// (TDS) parameters. This is jurisdiction reference data (like the country
// catalog), not tenant business data; rates carry an as-of marker and should be
// reviewed each fiscal year. Tenants can override PT via CountryConfig later.

export const INDIA_STATUTORY_AS_OF = 'FY 2025-26';

export const EPF = {
  employeeRate: 0.12, // of PF wages (basic + DA)
  employerEpsRate: 0.0833, // pension, on wages capped at the ceiling
  employerEpfRate: 0.0367, // employer PF remainder
  edliRate: 0.005,
  adminRate: 0.005,
  wageCeiling: 15000, // monthly EPS/EDLI wage ceiling
};

export const ESI = {
  employeeRate: 0.0075,
  employerRate: 0.0325,
  grossEligibilityCeiling: 21000, // monthly gross above this = out of ESI
};

export interface PtSlab {
  upTo: number | null; // monthly gross ceiling, null = no upper bound
  monthly: number; // PT per month in INR
}

// State-wise professional tax slabs (monthly gross → monthly PT).
// States/UTs not listed levy no professional tax (e.g. Delhi, Haryana,
// Uttar Pradesh, Rajasthan, Uttarakhand, Himachal Pradesh, J&K, Goa).
export const PT_SLABS: Record<string, PtSlab[]> = {
  MAHARASHTRA: [
    { upTo: 7500, monthly: 0 },
    { upTo: 10000, monthly: 175 },
    { upTo: null, monthly: 200 }, // ₹300 in February — annual ₹2500
  ],
  KARNATAKA: [
    { upTo: 24999, monthly: 0 },
    { upTo: null, monthly: 200 },
  ],
  WEST_BENGAL: [
    { upTo: 10000, monthly: 0 },
    { upTo: 15000, monthly: 110 },
    { upTo: 25000, monthly: 130 },
    { upTo: 40000, monthly: 150 },
    { upTo: null, monthly: 200 },
  ],
  TAMIL_NADU: [
    { upTo: 21000, monthly: 0 },
    { upTo: 30000, monthly: 100 },
    { upTo: 45000, monthly: 235 },
    { upTo: 60000, monthly: 510 },
    { upTo: 75000, monthly: 760 },
    { upTo: null, monthly: 1095 },
  ],
  TELANGANA: [
    { upTo: 15000, monthly: 0 },
    { upTo: 20000, monthly: 150 },
    { upTo: null, monthly: 200 },
  ],
  ANDHRA_PRADESH: [
    { upTo: 15000, monthly: 0 },
    { upTo: 20000, monthly: 150 },
    { upTo: null, monthly: 200 },
  ],
  GUJARAT: [
    { upTo: 12000, monthly: 0 },
    { upTo: null, monthly: 200 },
  ],
  MADHYA_PRADESH: [
    { upTo: 18750, monthly: 0 },
    { upTo: 25000, monthly: 125 },
    { upTo: 33333, monthly: 167 },
    { upTo: null, monthly: 208 }, // ₹212 in the final month — annual ₹2500
  ],
  KERALA: [
    // Levied half-yearly by municipality; expressed monthly for payroll.
    { upTo: 12000, monthly: 0 },
    { upTo: 18000, monthly: 100 },
    { upTo: null, monthly: 200 },
  ],
  ODISHA: [
    { upTo: 13304, monthly: 0 },
    { upTo: 25000, monthly: 125 },
    { upTo: null, monthly: 200 },
  ],
  ASSAM: [
    { upTo: 10000, monthly: 0 },
    { upTo: 15000, monthly: 150 },
    { upTo: 25000, monthly: 180 },
    { upTo: null, monthly: 208 },
  ],
  BIHAR: [
    { upTo: 25000, monthly: 0 },
    { upTo: 41666, monthly: 83 },
    { upTo: 83333, monthly: 167 },
    { upTo: null, monthly: 208 },
  ],
  JHARKHAND: [
    { upTo: 25000, monthly: 0 },
    { upTo: 41666, monthly: 100 },
    { upTo: 66666, monthly: 150 },
    { upTo: 83333, monthly: 175 },
    { upTo: null, monthly: 208 },
  ],
  CHHATTISGARH: [
    { upTo: 8333, monthly: 0 },
    { upTo: 12500, monthly: 130 },
    { upTo: 16667, monthly: 150 },
    { upTo: 20833, monthly: 200 },
    { upTo: null, monthly: 208 },
  ],
  PUNJAB: [
    // State development tax — flat on income above the basic-exemption level.
    { upTo: 20833, monthly: 0 },
    { upTo: null, monthly: 200 },
  ],
  SIKKIM: [
    { upTo: 20000, monthly: 0 },
    { upTo: 30000, monthly: 125 },
    { upTo: 40000, monthly: 150 },
    { upTo: null, monthly: 200 },
  ],
  MEGHALAYA: [
    { upTo: 4166, monthly: 0 },
    { upTo: 6250, monthly: 16 },
    { upTo: 8333, monthly: 25 },
    { upTo: 12500, monthly: 41 },
    { upTo: 16666, monthly: 62 },
    { upTo: 20833, monthly: 83 },
    { upTo: 25000, monthly: 104 },
    { upTo: null, monthly: 208 },
  ],
  TRIPURA: [
    { upTo: 7500, monthly: 0 },
    { upTo: 15000, monthly: 150 },
    { upTo: null, monthly: 208 },
  ],
  PUDUCHERRY: [
    { upTo: 16666, monthly: 0 },
    { upTo: 33333, monthly: 41 },
    { upTo: 50000, monthly: 83 },
    { upTo: 66666, monthly: 125 },
    { upTo: 83333, monthly: 166 },
    { upTo: null, monthly: 208 },
  ],
};

export interface TaxSlab {
  upTo: number | null; // annual taxable income ceiling
  rate: number;
}

export const TDS = {
  cessRate: 0.04,
  NEW: {
    standardDeduction: 75000,
    rebateLimit: 1200000, // 87A — zero tax up to this taxable income
    rebateCap: 60000,
    slabs: [
      { upTo: 400000, rate: 0 },
      { upTo: 800000, rate: 0.05 },
      { upTo: 1200000, rate: 0.1 },
      { upTo: 1600000, rate: 0.15 },
      { upTo: 2000000, rate: 0.2 },
      { upTo: 2400000, rate: 0.25 },
      { upTo: null, rate: 0.3 },
    ] as TaxSlab[],
  },
  OLD: {
    standardDeduction: 50000,
    rebateLimit: 500000,
    rebateCap: 12500,
    slabs: [
      { upTo: 250000, rate: 0 },
      { upTo: 500000, rate: 0.05 },
      { upTo: 1000000, rate: 0.2 },
      { upTo: null, rate: 0.3 },
    ] as TaxSlab[],
  },
};

export const INDIA_STATUTORY_NOTICE =
  `Rates and slabs as of ${INDIA_STATUTORY_AS_OF}. EPF/ESI/PT/TDS obligations vary by ` +
  'state, establishment, headcount and employee category — review every fiscal year ' +
  'and against current EPFO, ESIC, state PT and CBDT notifications before filing.';
