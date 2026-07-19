import { Injectable } from '@nestjs/common';
import {
  EPF,
  ESI,
  INDIA_STATUTORY_AS_OF,
  INDIA_STATUTORY_NOTICE,
  PT_SLABS,
  TDS,
  TaxSlab,
} from './india-statutory.catalog';

export interface StatutoryInput {
  monthlyGross: number;
  monthlyBasic: number; // basic + DA (PF wages)
  state?: string; // state name, matched against PT slab keys
  regime?: 'NEW' | 'OLD';
  annualDeclaredDeductions?: number; // 80C etc. — old regime only
  pfOnActualBasic?: boolean; // contribute above the ₹15k ceiling (employer policy)
  esiExempt?: boolean;
}

export interface StatutoryResult {
  asOf: string;
  state: string | null;
  regime: 'NEW' | 'OLD';
  pf: {
    applicable: boolean;
    wages: number;
    employee: number;
    employerEps: number;
    employerEpf: number;
    edli: number;
    admin: number;
  };
  esi: { applicable: boolean; employee: number; employer: number };
  pt: { applicable: boolean; monthly: number };
  tds: {
    annualGross: number;
    standardDeduction: number;
    declaredDeductions: number;
    taxableIncome: number;
    annualTax: number;
    monthly: number;
  };
  monthlyEmployeeDeductions: number; // PF + ESI + PT + TDS (employee side)
  monthlyEmployerCost: number; // employer PF/EPS/EDLI/admin + employer ESI
  netMonthly: number;
  notice: string;
}

const r0 = (n: number) => Math.round(n);

@Injectable()
export class IndiaStatutoryService {
  /** Full config for UIs (state list, rates, slabs). */
  config() {
    return {
      asOf: INDIA_STATUTORY_AS_OF,
      epf: EPF,
      esi: ESI,
      ptStates: Object.keys(PT_SLABS),
      ptSlabs: PT_SLABS,
      tds: TDS,
      notice: INDIA_STATUTORY_NOTICE,
    };
  }

  /** Match a free-text location ("Pune, Maharashtra") to a PT state key. */
  resolveState(location?: string | null): string | null {
    if (!location) return null;
    const norm = location.trim().toUpperCase().replace(/[^A-Z]+/g, '_');
    for (const key of Object.keys(PT_SLABS)) {
      if (norm === key || norm.includes(key)) return key;
    }
    return null;
  }

  compute(input: StatutoryInput): StatutoryResult {
    const regime = input.regime === 'OLD' ? 'OLD' : 'NEW';
    const gross = Math.max(0, input.monthlyGross || 0);
    const basic = Math.max(0, input.monthlyBasic || 0);

    // EPF — on basic wages, capped at the ceiling unless the employer opts to
    // contribute on actual basic.
    const pfWages = input.pfOnActualBasic ? basic : Math.min(basic, EPF.wageCeiling);
    const epsWages = Math.min(basic, EPF.wageCeiling); // EPS is always capped
    const pfApplicable = basic > 0;
    const pfEmployee = pfApplicable ? r0(pfWages * EPF.employeeRate) : 0;
    const employerEps = pfApplicable ? r0(epsWages * EPF.employerEpsRate) : 0;
    const employerEpf = pfApplicable
      ? r0(pfWages * EPF.employeeRate) - employerEps // employer 12% minus EPS share
      : 0;
    const edli = pfApplicable ? r0(epsWages * EPF.edliRate) : 0;
    const admin = pfApplicable ? r0(pfWages * EPF.adminRate) : 0;

    // ESI — only while monthly gross is within the eligibility ceiling.
    const esiApplicable = !input.esiExempt && gross > 0 && gross <= ESI.grossEligibilityCeiling;
    const esiEmployee = esiApplicable ? Math.ceil(gross * ESI.employeeRate) : 0;
    const esiEmployer = esiApplicable ? Math.ceil(gross * ESI.employerRate) : 0;

    // Professional tax — state slab on monthly gross.
    const stateKey = this.resolveState(input.state);
    let pt = 0;
    if (stateKey) {
      for (const slab of PT_SLABS[stateKey]) {
        if (slab.upTo === null || gross <= slab.upTo) {
          pt = slab.monthly;
          break;
        }
      }
    }

    // TDS — annualized slab tax under the chosen regime.
    const cfg = TDS[regime];
    const annualGross = gross * 12;
    const declared = regime === 'OLD' ? Math.max(0, input.annualDeclaredDeductions ?? 0) : 0;
    const professionalTaxAnnual = pt * 12; // deductible u/s 16(iii)
    const taxable = Math.max(
      0,
      annualGross - cfg.standardDeduction - declared - professionalTaxAnnual,
    );
    let tax = this.slabTax(taxable, cfg.slabs);
    if (taxable <= cfg.rebateLimit) {
      tax = Math.max(0, tax - Math.min(tax, cfg.rebateCap)); // §87A rebate
    } else if (regime === 'NEW') {
      // Marginal relief just above the rebate threshold.
      tax = Math.min(tax, taxable - cfg.rebateLimit);
    }
    const annualTax = r0(tax * (1 + TDS.cessRate));
    const monthlyTds = r0(annualTax / 12);

    const employeeDeductions = pfEmployee + esiEmployee + pt + monthlyTds;
    const employerCost = employerEps + employerEpf + edli + admin + esiEmployer;

    return {
      asOf: INDIA_STATUTORY_AS_OF,
      state: stateKey,
      regime,
      pf: {
        applicable: pfApplicable,
        wages: pfWages,
        employee: pfEmployee,
        employerEps,
        employerEpf,
        edli,
        admin,
      },
      esi: { applicable: esiApplicable, employee: esiEmployee, employer: esiEmployer },
      pt: { applicable: pt > 0, monthly: pt },
      tds: {
        annualGross,
        standardDeduction: cfg.standardDeduction,
        declaredDeductions: declared,
        taxableIncome: taxable,
        annualTax,
        monthly: monthlyTds,
      },
      monthlyEmployeeDeductions: employeeDeductions,
      monthlyEmployerCost: employerCost,
      netMonthly: r0(gross - employeeDeductions),
      notice: INDIA_STATUTORY_NOTICE,
    };
  }

  private slabTax(taxable: number, slabs: TaxSlab[]): number {
    let tax = 0;
    let lower = 0;
    for (const slab of slabs) {
      const upper = slab.upTo ?? Infinity;
      if (taxable > lower) {
        tax += (Math.min(taxable, upper) - lower) * slab.rate;
      }
      lower = upper;
    }
    return tax;
  }
}
