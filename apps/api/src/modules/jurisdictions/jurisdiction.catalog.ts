export interface JurisdictionField {
  key: string;
  label: string;
  type: 'TEXT' | 'DATE' | 'SELECT' | 'BOOLEAN' | 'TEXTAREA';
  required?: boolean;
  options?: string[];
  sensitive?: boolean;
  stage: 'CLIENT_INTAKE' | 'CANDIDATE' | 'OFFER' | 'PREBOARDING' | 'VERIFICATION';
}

export interface AuthorizationOption {
  code: string;
  label: string;
  sponsorshipRequired?: boolean;
  employerSpecific?: boolean;
}

export interface JurisdictionDefinition {
  code: string;
  name: string;
  currency: string;
  timezone: string;
  memberStateRequired?: boolean;
  employerFields: JurisdictionField[];
  candidateFields: JurisdictionField[];
  authorizationTypes: AuthorizationOption[];
  verificationMethods: string[];
  lifecycle: string[];
  officialSources: { label: string; url: string }[];
  notice: string;
}

const sharedCandidate: JurisdictionField[] = [
  { key: 'legalName', label: 'Legal name', type: 'TEXT', required: true, stage: 'CANDIDATE' },
  { key: 'preferredName', label: 'Preferred name', type: 'TEXT', stage: 'CANDIDATE' },
  { key: 'dateOfBirth', label: 'Date of birth', type: 'DATE', required: true, sensitive: true, stage: 'PREBOARDING' },
  { key: 'nationality', label: 'Nationality', type: 'TEXT', required: true, sensitive: true, stage: 'PREBOARDING' },
  { key: 'residentialAddress', label: 'Residential address', type: 'TEXTAREA', required: true, sensitive: true, stage: 'PREBOARDING' },
  { key: 'emergencyContact', label: 'Emergency contact', type: 'TEXTAREA', required: true, sensitive: true, stage: 'PREBOARDING' },
];

function gccJurisdiction(
  code: string, name: string, currency: string, timezone: string,
  authorityLabel: string, officialUrl: string, nationalIdLabel: string,
): JurisdictionDefinition {
  return {
    code, name, currency, timezone,
    employerFields: [
      { key: 'commercialRegistration', label: 'Commercial registration/licence', type: 'TEXT', required: true, stage: 'CLIENT_INTAKE' },
      { key: 'establishmentNumber', label: 'Labour/immigration establishment number', type: 'TEXT', stage: 'CLIENT_INTAKE' },
      { key: 'sponsorDetails', label: 'Employer/sponsor details', type: 'TEXTAREA', required: true, stage: 'CLIENT_INTAKE' },
      { key: 'occupationCode', label: 'Approved profession/occupation', type: 'TEXT', required: true, stage: 'OFFER' },
      { key: 'nationalisationStatus', label: 'Nationalisation/quota status', type: 'TEXT', stage: 'OFFER' },
    ],
    candidateFields: [...sharedCandidate,
      { key: 'passportExpiry', label: 'Passport expiry date', type: 'DATE', required: true, sensitive: true, stage: 'PREBOARDING' },
      { key: 'nationalIdLast4', label: `${nationalIdLabel} last four digits`, type: 'TEXT', sensitive: true, stage: 'PREBOARDING' },
      { key: 'medicalFitness', label: 'Medical fitness completed', type: 'BOOLEAN', stage: 'VERIFICATION' },
      { key: 'qualificationAttestation', label: 'Qualification attestation/reference', type: 'TEXT', stage: 'VERIFICATION' },
      { key: 'contractAcknowledged', label: 'Registered employment contract acknowledged', type: 'BOOLEAN', required: true, stage: 'OFFER' },
    ],
    authorizationTypes: [
      { code: 'NATIONAL', label: `${name} citizen` }, { code: 'GCC_NATIONAL', label: 'Other GCC national' },
      { code: 'EMPLOYER_SPONSORED', label: 'Employer-sponsored work and residence permit', sponsorshipRequired: true, employerSpecific: true },
      { code: 'FAMILY_RESIDENCE_PERMIT', label: 'Family residence holder with work permit', employerSpecific: true },
      { code: 'TEMPORARY_MISSION', label: 'Temporary/mission work permit', sponsorshipRequired: true, employerSpecific: true },
      { code: 'DOMESTIC_WORKER', label: 'Domestic worker permit', sponsorshipRequired: true, employerSpecific: true },
      { code: 'INVESTOR_SELF_SPONSORED', label: 'Investor/self-sponsored residence with work approval' },
      { code: 'OTHER', label: 'Other authority-approved work status' },
    ],
    verificationMethods: [`${authorityLabel} permit/status verification`, 'Residence card examination', 'Registered employment contract', 'Medical/identity completion evidence'],
    lifecycle: ['Client licence and quota intake', 'Candidate passport/profile and consent', 'Offer and registered contract', 'Work permit/entry authorization', 'Medical and biometrics', 'Residence/national ID issuance', 'Payroll/deployment activation', 'Renewal, transfer or cancellation'],
    officialSources: [{ label: authorityLabel, url: officialUrl }],
    notice: `Requirements vary by occupation, employer category and worker nationality. Confirm current ${authorityLabel} rules before employment or deployment.`,
  };
}

export const JURISDICTIONS: Record<string, JurisdictionDefinition> = {
  US: {
    code: 'US', name: 'United States', currency: 'USD', timezone: 'America/New_York',
    employerFields: [
      { key: 'ein', label: 'Employer identification number (EIN)', type: 'TEXT', sensitive: true, stage: 'CLIENT_INTAKE' },
      { key: 'everifyNumber', label: 'E-Verify company ID', type: 'TEXT', stage: 'CLIENT_INTAKE' },
      { key: 'socCode', label: 'SOC occupation code', type: 'TEXT', stage: 'OFFER' },
      { key: 'worksite', label: 'Primary worksite and state', type: 'TEXT', required: true, stage: 'OFFER' },
      { key: 'wageBasis', label: 'Wage and pay basis', type: 'TEXT', required: true, stage: 'OFFER' },
    ],
    candidateFields: [...sharedCandidate,
      { key: 'ssnLast4', label: 'SSN last four digits', type: 'TEXT', sensitive: true, stage: 'PREBOARDING' },
      { key: 'i9Path', label: 'I-9 document path', type: 'SELECT', required: true, options: ['List A', 'List B + List C', 'Receipt/temporary evidence'], stage: 'VERIFICATION' },
      { key: 'remoteHire', label: 'Remote I-9 examination used', type: 'BOOLEAN', stage: 'VERIFICATION' },
    ],
    authorizationTypes: [
      { code: 'US_CITIZEN', label: 'US citizen' }, { code: 'PERMANENT_RESIDENT', label: 'Lawful permanent resident' },
      { code: 'EAD', label: 'Employment Authorization Document' },
      { code: 'H1B', label: 'H-1B specialty occupation', sponsorshipRequired: true, employerSpecific: true },
      { code: 'H1B1', label: 'H-1B1 (Chile/Singapore)', sponsorshipRequired: true, employerSpecific: true },
      { code: 'H2A', label: 'H-2A agricultural worker', sponsorshipRequired: true, employerSpecific: true },
      { code: 'H2B', label: 'H-2B temporary non-agricultural worker', sponsorshipRequired: true, employerSpecific: true },
      { code: 'L1A', label: 'L-1A intracompany manager/executive', sponsorshipRequired: true, employerSpecific: true },
      { code: 'L1B', label: 'L-1B specialized knowledge', sponsorshipRequired: true, employerSpecific: true },
      { code: 'O1', label: 'O-1 extraordinary ability', sponsorshipRequired: true, employerSpecific: true },
      { code: 'TN', label: 'TN USMCA professional', sponsorshipRequired: true, employerSpecific: true },
      { code: 'E3', label: 'E-3 Australian specialty occupation', sponsorshipRequired: true, employerSpecific: true },
      { code: 'E1_E2', label: 'E-1/E-2 treaty worker', employerSpecific: true },
      { code: 'F1_CPT', label: 'F-1 curricular practical training', employerSpecific: true },
      { code: 'F1_OPT', label: 'F-1 OPT/STEM OPT' }, { code: 'J1', label: 'J-1 exchange visitor', employerSpecific: true },
      { code: 'OTHER', label: 'Other employment-authorized status' },
    ],
    verificationMethods: ['Form I-9 document examination', 'E-Verify', 'Reverification'],
    lifecycle: ['Client/worksite intake', 'Candidate consent and profile', 'Work authorization assessment', 'Sponsorship case if required', 'Offer and wage review', 'Form I-9 verification', 'Expiry/reverification monitoring', 'Assignment closure and retention'],
    officialSources: [
      { label: 'USCIS Form I-9', url: 'https://www.uscis.gov/i-9' },
      { label: 'USCIS temporary workers', url: 'https://www.uscis.gov/working-in-the-united-states/temporary-nonimmigrant-workers' },
    ],
    notice: 'Configuration support only. Employers must use current USCIS/DHS instructions and qualified immigration counsel where appropriate.',
  },
  GB: {
    code: 'GB', name: 'United Kingdom', currency: 'GBP', timezone: 'Europe/London',
    employerFields: [
      { key: 'companiesHouseNumber', label: 'Companies House number', type: 'TEXT', stage: 'CLIENT_INTAKE' },
      { key: 'sponsorLicenceNumber', label: 'Sponsor licence number', type: 'TEXT', stage: 'CLIENT_INTAKE' },
      { key: 'socCode', label: 'Occupation code', type: 'TEXT', stage: 'OFFER' },
      { key: 'workLocation', label: 'Work location', type: 'TEXT', required: true, stage: 'OFFER' },
    ],
    candidateFields: [...sharedCandidate,
      { key: 'nationalInsuranceNumber', label: 'National Insurance number', type: 'TEXT', sensitive: true, stage: 'PREBOARDING' },
      { key: 'shareCode', label: 'Right-to-work share code', type: 'TEXT', sensitive: true, stage: 'VERIFICATION' },
      { key: 'studentTermDates', label: 'Student term and vacation dates', type: 'TEXTAREA', stage: 'VERIFICATION' },
    ],
    authorizationTypes: [
      { code: 'BRITISH_IRISH', label: 'British or Irish citizen' }, { code: 'SETTLED_STATUS', label: 'Settled/pre-settled status' },
      { code: 'SKILLED_WORKER', label: 'Skilled Worker', sponsorshipRequired: true, employerSpecific: true },
      { code: 'HEALTH_CARE_WORKER', label: 'Health and Care Worker', sponsorshipRequired: true, employerSpecific: true },
      { code: 'GLOBAL_BUSINESS_MOBILITY', label: 'Global Business Mobility', sponsorshipRequired: true, employerSpecific: true },
      { code: 'SCALE_UP', label: 'Scale-up Worker' }, { code: 'GLOBAL_TALENT', label: 'Global Talent' },
      { code: 'GRADUATE', label: 'Graduate visa' }, { code: 'HPI', label: 'High Potential Individual' },
      { code: 'YOUTH_MOBILITY', label: 'Youth Mobility Scheme' }, { code: 'TEMPORARY_WORKER', label: 'Temporary Worker', sponsorshipRequired: true, employerSpecific: true },
      { code: 'DEPENDANT', label: 'Dependant with work rights' }, { code: 'OTHER', label: 'Other permission to work' },
    ],
    verificationMethods: ['Home Office online share-code check', 'Original document check', 'IDVT', 'Employer Checking Service'],
    lifecycle: ['Client/sponsor intake', 'Candidate consent and profile', 'Right-to-work route selection', 'Online/document check', 'Offer and sponsorship', 'Repeat check scheduling', 'Employment and retention closeout'],
    officialSources: [{ label: 'GOV.UK right to work', url: 'https://www.gov.uk/check-job-applicant-right-to-work' }, { label: 'GOV.UK work visas', url: 'https://www.gov.uk/browse/visas-immigration/work-visas' }],
    notice: 'Right-to-work rules and visa routes change. Always follow current Home Office guidance.',
  },
  CA: {
    code: 'CA', name: 'Canada', currency: 'CAD', timezone: 'America/Toronto',
    employerFields: [
      { key: 'businessNumber', label: 'CRA business number', type: 'TEXT', sensitive: true, stage: 'CLIENT_INTAKE' },
      { key: 'province', label: 'Province or territory', type: 'TEXT', required: true, stage: 'CLIENT_INTAKE' },
      { key: 'lmiaNumber', label: 'LMIA number (when applicable)', type: 'TEXT', stage: 'OFFER' },
      { key: 'offerEmploymentNumber', label: 'Employer Portal offer number', type: 'TEXT', stage: 'OFFER' },
      { key: 'nocCode', label: 'NOC/TEER code', type: 'TEXT', stage: 'OFFER' },
    ],
    candidateFields: [...sharedCandidate,
      { key: 'sinLast4', label: 'SIN last four digits', type: 'TEXT', sensitive: true, stage: 'PREBOARDING' },
      { key: 'provinceResidence', label: 'Province of residence', type: 'TEXT', stage: 'PREBOARDING' },
      { key: 'medicalRequired', label: 'Immigration medical required', type: 'BOOLEAN', stage: 'VERIFICATION' },
    ],
    authorizationTypes: [
      { code: 'CANADIAN_CITIZEN', label: 'Canadian citizen' }, { code: 'PERMANENT_RESIDENT', label: 'Permanent resident' },
      { code: 'EMPLOYER_SPECIFIC_LMIA', label: 'Employer-specific permit (LMIA)', sponsorshipRequired: true, employerSpecific: true },
      { code: 'EMPLOYER_SPECIFIC_IMP', label: 'Employer-specific permit (LMIA-exempt/IMP)', sponsorshipRequired: true, employerSpecific: true },
      { code: 'OPEN_WORK_PERMIT', label: 'Open work permit' }, { code: 'PGWP', label: 'Post-graduation work permit' },
      { code: 'IEC', label: 'International Experience Canada' }, { code: 'STUDY_PERMIT', label: 'Study permit with work conditions' },
      { code: 'OTHER', label: 'Other authorization/exemption' },
    ],
    verificationMethods: ['Inspect citizenship/PR evidence', 'Inspect work permit conditions', 'IRCC Employer Portal reference', 'LMIA decision documentation'],
    lifecycle: ['Province/client intake', 'NOC/TEER and role assessment', 'LMIA or exemption decision', 'Offer/employer portal process', 'Permit verification', 'Employment-condition monitoring', 'Six-year employer record clock where applicable'],
    officialSources: [{ label: 'IRCC work permits', url: 'https://www.canada.ca/en/immigration-refugees-citizenship/services/work-canada.html' }, { label: 'Employer-specific permits', url: 'https://www.canada.ca/en/immigration-refugees-citizenship/services/work-canada/employer-specific.html' }],
    notice: 'Province, occupation and program affect requirements. Confirm current IRCC/ESDC rules.',
  },
  AU: {
    code: 'AU', name: 'Australia', currency: 'AUD', timezone: 'Australia/Sydney',
    employerFields: [
      { key: 'abn', label: 'Australian Business Number (ABN)', type: 'TEXT', stage: 'CLIENT_INTAKE' },
      { key: 'sponsorApproval', label: 'Sponsor approval/reference', type: 'TEXT', stage: 'CLIENT_INTAKE' },
      { key: 'anzscoCode', label: 'ANZSCO occupation code', type: 'TEXT', stage: 'OFFER' },
      { key: 'workLocation', label: 'Work location/state', type: 'TEXT', required: true, stage: 'OFFER' },
    ],
    candidateFields: [...sharedCandidate,
      { key: 'tfnLast4', label: 'TFN last four digits', type: 'TEXT', sensitive: true, stage: 'PREBOARDING' },
      { key: 'vevoConsent', label: 'VEVO consent recorded', type: 'BOOLEAN', required: true, stage: 'VERIFICATION' },
      { key: 'skillsAssessment', label: 'Skills assessment reference', type: 'TEXT', stage: 'VERIFICATION' },
    ],
    authorizationTypes: [
      { code: 'AU_CITIZEN', label: 'Australian citizen' }, { code: 'PERMANENT_RESIDENT', label: 'Permanent resident' },
      { code: 'SUBCLASS_482', label: 'Skills in Demand visa (subclass 482)', sponsorshipRequired: true, employerSpecific: true },
      { code: 'SUBCLASS_186', label: 'Employer Nomination Scheme (186)', sponsorshipRequired: true, employerSpecific: true },
      { code: 'SUBCLASS_494', label: 'Skilled Employer Sponsored Regional (494)', sponsorshipRequired: true, employerSpecific: true },
      { code: 'SKILLED_189_190_491', label: 'Skilled 189/190/491' }, { code: 'SUBCLASS_485', label: 'Temporary Graduate (485)' },
      { code: 'WORKING_HOLIDAY', label: 'Working Holiday 417/462' }, { code: 'STUDENT', label: 'Student visa with work conditions' },
      { code: 'PARTNER', label: 'Partner visa with work rights' }, { code: 'OTHER', label: 'Other visa with work rights' },
    ],
    verificationMethods: ['VEVO check', 'Citizenship evidence', 'Visa grant notice'],
    lifecycle: ['Client/sponsor intake', 'Role and ANZSCO assessment', 'Candidate consent', 'VEVO work-rights check', 'Nomination/sponsorship if required', 'Offer and deployment', 'Condition/expiry monitoring'],
    officialSources: [{ label: 'Home Affairs employer options', url: 'https://immi.homeaffairs.gov.au/visas/employing-and-sponsoring-someone/explore-options-for-employers' }],
    notice: 'Visa subclasses and work conditions change. Verify every visa holder through current Home Affairs services.',
  },
  NZ: {
    code: 'NZ', name: 'New Zealand', currency: 'NZD', timezone: 'Pacific/Auckland',
    employerFields: [
      { key: 'nzbn', label: 'New Zealand Business Number', type: 'TEXT', stage: 'CLIENT_INTAKE' },
      { key: 'irdNumber', label: 'Employer IRD number', type: 'TEXT', sensitive: true, stage: 'CLIENT_INTAKE' },
      { key: 'accreditationType', label: 'AEWV accreditation type', type: 'SELECT', options: ['Standard', 'High-volume', 'Triangular/placement'], stage: 'CLIENT_INTAKE' },
      { key: 'jobCheckNumber', label: 'Job check/token reference', type: 'TEXT', stage: 'OFFER' },
      { key: 'anzscoNolCode', label: 'ANZSCO/NOL occupation code', type: 'TEXT', stage: 'OFFER' },
    ],
    candidateFields: [...sharedCandidate,
      { key: 'irdLast4', label: 'IRD number last four digits', type: 'TEXT', sensitive: true, stage: 'PREBOARDING' },
      { key: 'visaViewConsent', label: 'VisaView consent recorded', type: 'BOOLEAN', required: true, stage: 'VERIFICATION' },
      { key: 'occupationalRegistration', label: 'Occupational registration', type: 'TEXT', stage: 'VERIFICATION' },
    ],
    authorizationTypes: [
      { code: 'NZ_CITIZEN', label: 'New Zealand citizen' }, { code: 'NZ_RESIDENT', label: 'Resident/permanent resident' },
      { code: 'AEWV', label: 'Accredited Employer Work Visa', sponsorshipRequired: true, employerSpecific: true },
      { code: 'OPEN_WORK_VISA', label: 'Open work visa' }, { code: 'POST_STUDY', label: 'Post Study Work Visa' },
      { code: 'WORKING_HOLIDAY', label: 'Working Holiday Visa' }, { code: 'PARTNER_WORK', label: 'Partner of a worker/student' },
      { code: 'SEASONAL', label: 'Seasonal AEWV/RSE route', sponsorshipRequired: true, employerSpecific: true },
      { code: 'SPECIFIC_PURPOSE', label: 'Specific Purpose Work Visa', employerSpecific: true }, { code: 'OTHER', label: 'Other work permission' },
    ],
    verificationMethods: ['VisaView', 'Visa grant letter/eVisa', 'Citizenship/residence evidence'],
    lifecycle: ['Employer accreditation', 'Job check', 'Candidate suitability and consent', 'Visa application/verification', 'Employment agreement', 'Settlement support', 'Condition and expiry monitoring'],
    officialSources: [{ label: 'Immigration NZ employers', url: 'https://www.immigration.govt.nz/work/for-employers/' }, { label: 'AEWV', url: 'https://www.immigration.govt.nz/visas/accredited-employer-work-visa/' }],
    notice: 'Accreditation, job-check and visa conditions must be verified against current Immigration New Zealand guidance.',
  },
  EU: {
    code: 'EU', name: 'European Union', currency: 'EUR', timezone: 'Europe/Brussels', memberStateRequired: true,
    employerFields: [
      { key: 'memberState', label: 'Destination EU member state', type: 'TEXT', required: true, stage: 'CLIENT_INTAKE' },
      { key: 'companyRegistration', label: 'Company registration number', type: 'TEXT', stage: 'CLIENT_INTAKE' },
      { key: 'vatNumber', label: 'VAT/tax number', type: 'TEXT', sensitive: true, stage: 'CLIENT_INTAKE' },
      { key: 'occupationCode', label: 'National occupation code', type: 'TEXT', stage: 'OFFER' },
    ],
    candidateFields: [...sharedCandidate,
      { key: 'memberState', label: 'Destination member state', type: 'TEXT', required: true, stage: 'CANDIDATE' },
      { key: 'nationalIdentifierLast4', label: 'National identifier last four digits', type: 'TEXT', sensitive: true, stage: 'PREBOARDING' },
      { key: 'dataProcessingBasis', label: 'Recruitment data-processing basis', type: 'SELECT', required: true, options: ['Contract/pre-contract', 'Legal obligation', 'Legitimate interests', 'Consent'], stage: 'CANDIDATE' },
      { key: 'retentionNoticeAccepted', label: 'Privacy/retention notice acknowledged', type: 'BOOLEAN', required: true, stage: 'CANDIDATE' },
    ],
    authorizationTypes: [
      { code: 'EU_EEA_CITIZEN', label: 'EU/EEA citizen exercising free movement' },
      { code: 'PERMANENT_RESIDENT', label: 'Permanent/long-term resident' },
      { code: 'NATIONAL_WORK_PERMIT', label: 'National work/residence permit', sponsorshipRequired: true, employerSpecific: true },
      { code: 'SINGLE_PERMIT', label: 'Single Permit', sponsorshipRequired: true, employerSpecific: true },
      { code: 'EU_BLUE_CARD', label: 'EU Blue Card', sponsorshipRequired: true, employerSpecific: true },
      { code: 'ICT_PERMIT', label: 'Intra-corporate transferee permit', sponsorshipRequired: true, employerSpecific: true },
      { code: 'RESEARCHER_STUDENT', label: 'Researcher/student work rights' },
      { code: 'SEASONAL_WORKER', label: 'Seasonal worker permit', sponsorshipRequired: true, employerSpecific: true },
      { code: 'TEMPORARY_PROTECTION', label: 'Temporary protection/work access' }, { code: 'OTHER', label: 'Member-state authorization' },
    ],
    verificationMethods: ['Member-state immigration portal', 'Residence/work permit examination', 'EU citizen identity evidence'],
    lifecycle: ['Select destination member state', 'Client and role intake', 'Privacy notice and lawful-basis record', 'Free-movement/permit assessment', 'National filing or EU route', 'Right-to-work verification', 'Expiry and mobility monitoring', 'Retention/deletion closeout'],
    officialSources: [{ label: 'EU Immigration Portal', url: 'https://immigration-portal.ec.europa.eu/index_en' }, { label: 'EU Blue Card', url: 'https://home-affairs.ec.europa.eu/policies/migration-and-asylum/eu-immigration-portal/eu-blue-card_en' }],
    notice: 'Employment and immigration rules are member-state specific; EU selection always requires the destination member state.',
  },
  AE: {
    code: 'AE', name: 'United Arab Emirates', currency: 'AED', timezone: 'Asia/Dubai',
    employerFields: [
      { key: 'tradeLicence', label: 'Trade licence number and emirate/free zone', type: 'TEXT', required: true, stage: 'CLIENT_INTAKE' },
      { key: 'mohreEstablishment', label: 'MoHRE/authority establishment number', type: 'TEXT', stage: 'CLIENT_INTAKE' },
      { key: 'immigrationCard', label: 'Immigration establishment card reference', type: 'TEXT', stage: 'CLIENT_INTAKE' },
      { key: 'permitQuota', label: 'Approved work-permit quota', type: 'TEXT', stage: 'OFFER' },
      { key: 'profession', label: 'Approved profession', type: 'TEXT', required: true, stage: 'OFFER' },
    ],
    candidateFields: [...sharedCandidate,
      { key: 'passportExpiry', label: 'Passport expiry date', type: 'DATE', required: true, sensitive: true, stage: 'PREBOARDING' },
      { key: 'emiratesIdLast4', label: 'Emirates ID last four digits', type: 'TEXT', sensitive: true, stage: 'PREBOARDING' },
      { key: 'medicalFitness', label: 'Medical fitness completed', type: 'BOOLEAN', required: true, stage: 'VERIFICATION' },
      { key: 'qualificationAttestation', label: 'Attested qualification/reference', type: 'TEXT', stage: 'VERIFICATION' },
      { key: 'mohreOfferAccepted', label: 'MoHRE offer/contract accepted', type: 'BOOLEAN', required: true, stage: 'OFFER' },
    ],
    authorizationTypes: [
      { code: 'UAE_GCC_NATIONAL', label: 'UAE/GCC national permit' },
      { code: 'OUTSIDE_RECRUITMENT', label: 'Recruit worker from outside UAE', sponsorshipRequired: true, employerSpecific: true },
      { code: 'TRANSFER_PERMIT', label: 'Transfer between establishments', sponsorshipRequired: true, employerSpecific: true },
      { code: 'FAMILY_SPONSORED', label: 'Family-sponsored resident work permit', employerSpecific: true },
      { code: 'TEMPORARY', label: 'Temporary work permit', sponsorshipRequired: true, employerSpecific: true },
      { code: 'MISSION', label: 'Mission work permit', sponsorshipRequired: true, employerSpecific: true },
      { code: 'PART_TIME', label: 'Part-time work permit', employerSpecific: true },
      { code: 'STUDENT', label: 'Student training/employment permit', employerSpecific: true },
      { code: 'GOLDEN_RESIDENCE', label: 'Golden Residence holder permit', employerSpecific: true },
      { code: 'GREEN_SKILLED', label: 'Green visa skilled employee' },
      { code: 'FREELANCE', label: 'Freelance work permit' },
      { code: 'DOMESTIC_WORKER', label: 'Domestic worker visa', sponsorshipRequired: true, employerSpecific: true },
      { code: 'OTHER', label: 'Other MoHRE/free-zone permit' },
    ],
    verificationMethods: ['MoHRE work permit/contract verification', 'ICP/GDRFA residence status', 'Emirates ID', 'Medical fitness completion'],
    lifecycle: ['Employer licence, establishment and quota intake', 'Signed official job offer', 'Work permit/entry authorization', 'Arrival and medical fitness', 'Biometrics and Emirates ID', 'Residence permit', 'Payroll/deployment activation', 'Renewal, transfer or cancellation'],
    officialSources: [{ label: 'UAE work permits', url: 'https://u.ae/en/information-and-services/jobs/employment-in-the-private-sector/job-offers-and-work-permits-and-contracts/work-permits' }, { label: 'UAE work residence', url: 'https://u.ae/en/information-and-services/visa-and-emirates-id/residence-visas/residence-visa-for-working-in-the-uae' }],
    notice: 'Mainland, free-zone and domestic-worker processes differ. Use the responsible authority and current UAE rules for the actual employer.',
  },
  SA: gccJurisdiction('SA', 'Saudi Arabia', 'SAR', 'Asia/Riyadh', 'Ministry of Human Resources and Qiwa', 'https://www.hrsd.gov.sa/en/ministry-services/services/%D8%A5%D8%B5%D8%AF%D8%A7%D8%B1-%D9%88-%D8%AA%D8%AC%D8%AF%D9%8A%D8%AF-%D8%B1%D8%AE%D8%B5-%D8%A7%D9%84%D8%B9%D9%85%D9%84', 'Iqama'),
  QA: gccJurisdiction('QA', 'Qatar', 'QAR', 'Asia/Qatar', 'Qatar Ministry of Labour', 'https://www.mol.gov.qa/', 'Qatar ID'),
  BH: gccJurisdiction('BH', 'Bahrain', 'BHD', 'Asia/Bahrain', 'Labour Market Regulatory Authority', 'https://www.lmra.gov.bh/', 'CPR'),
  KW: gccJurisdiction('KW', 'Kuwait', 'KWD', 'Asia/Kuwait', 'Kuwait Government Online / Public Authority for Manpower', 'https://e.gov.kw/sites/kgoenglish/Pages/Services/MOI/PrivateSectorWorkEntryVisa.aspx', 'Civil ID'),
  OM: gccJurisdiction('OM', 'Oman', 'OMR', 'Asia/Muscat', 'Oman Ministry of Labour / Gov.om', 'https://gov.om/en/w/get-a-work-visa', 'Resident card'),
};

export const SUPPORTED_JURISDICTION_CODES = Object.keys(JURISDICTIONS);

export function jurisdiction(code: string) {
  return JURISDICTIONS[code.trim().toUpperCase()];
}
