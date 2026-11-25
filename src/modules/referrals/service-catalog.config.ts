export type ServiceFormType =
  | 'REAL_ESTATE'
  | 'GOLDEN_VISA'
  | 'MORTGAGE'
  | 'COMPANY_FORMATION'
  | 'CORPORATE_ADVISORY';

export interface ServiceMetadataDefaults {
  formType: ServiceFormType;
  categoryGroup: 'Real Estate' | 'Mortgage & Finance' | 'Corporate Advisory' | 'Residency' | 'Other Approved Services';
  eligibilityInfo: string;
  requiredDocs: string[];
  expectedWorkflow: string;
  commissionDisclosure: string;
  defaultPackages?: Array<{
    slug: string;
    name: string;
    description: string;
    visaCount: number | null;
    basePriceAed: number | null;
  }>;
}

export function inferServiceFormType(slug: string): ServiceFormType {
  if (/golden-visa|visa|residen/i.test(slug)) return 'GOLDEN_VISA';
  if (/mortgage|refinanc|finance/i.test(slug)) return 'MORTGAGE';
  if (/free-zone|mainland|formation|setup|licen/i.test(slug)) return 'COMPANY_FORMATION';
  if (/property|real-estate|off-plan|resale|developer/i.test(slug)) return 'REAL_ESTATE';
  return 'CORPORATE_ADVISORY';
}

export function getServiceMetadataDefaults(slug: string): ServiceMetadataDefaults {
  const formType = inferServiceFormType(slug);
  switch (formType) {
    case 'REAL_ESTATE':
      return {
        formType,
        categoryGroup: 'Real Estate',
        eligibilityInfo: 'Open to UAE residents and international buyers/investors aged 21+ with verifiable identity and source of funds.',
        requiredDocs: ['Passport copy', 'Emirates ID (if UAE resident)', 'Proof of funds / pre-approval (when requested by developer)'],
        expectedWorkflow: 'Referral Submission → Agency Review (if applicable) → Prospera Intake → Specialist Broker Assignment → Viewing & Reservation → SPA & Closing',
        commissionDisclosure: 'Commission is conditional upon completed transaction closing, developer/seller settlement, and compliance clearance. Rates are governed by the active rule at milestone.',
      };
    case 'MORTGAGE':
      return {
        formType,
        categoryGroup: 'Mortgage & Finance',
        eligibilityInfo: 'Salaried employees, self-employed business owners, and qualifying non-residents meeting UAE Central Bank LTV and DBR thresholds.',
        requiredDocs: ['Passport & Emirates ID', 'Salary certificate or trade license', '6 months personal/company bank statements', 'Property Memorandum of Understanding (if ready)'],
        expectedWorkflow: 'Referral Submission → Prospera Intake → Mortgage Advisor Assignment → Bank Pre-Approval → Valuation → Final Offer Letter & Disbursal',
        commissionDisclosure: 'Mortgage referral fee is conditional upon bank facility disbursal and verified lender settlement.',
      };
    case 'GOLDEN_VISA':
      return {
        formType,
        categoryGroup: 'Residency',
        eligibilityInfo: 'Qualifying UAE property investors (AED 2M+ threshold), entrepreneurs, specialized talents, or eligible senior executives subject to ICP/GDRFA rules.',
        requiredDocs: ['Passport copy (6+ months validity)', 'Current UAE visa / Emirates ID', 'Title Deed or Oqood / investment proof', 'Health insurance & medical fitness'],
        expectedWorkflow: 'Referral Submission → Prospera Intake → Residency Specialist Review → Eligibility Check → ICP/GDRFA Application → Visa & Emirates ID Issuance',
        commissionDisclosure: 'Advisory commission is conditional upon confirmed eligibility, engagement fee settlement, and application processing.',
      };
    case 'COMPANY_FORMATION':
      return {
        formType,
        categoryGroup: 'Corporate Advisory',
        eligibilityInfo: 'Entrepreneurs, SMEs, and international corporates establishing UAE Mainland or approved Free Zone entities subject to KYC and activity approvals.',
        requiredDocs: ['Passport copies of all shareholders', 'UAE entry stamp / visa copy (if applicable)', 'Proposed trade name options (3 choices)', 'Brief business activity description'],
        expectedWorkflow: 'Referral Submission → Prospera Intake → Corporate Structuring Call → Jurisdiction & Package Selection → KYC & Licensing → Establishment Card & Visas',
        commissionDisclosure: 'Commission is conditional upon license issuance and full setup invoice settlement.',
        defaultPackages: /free-zone/i.test(slug)
          ? [
              { slug: 'zero-visa', name: 'Zero Visa Package', description: 'Trade license + flexi-desk / virtual facility without residency visa quota.', visaCount: 0, basePriceAed: null },
              { slug: 'one-visa', name: 'One Visa Package', description: 'Trade license + 1 residency visa allocation + establishment card.', visaCount: 1, basePriceAed: null },
              { slug: 'two-visas', name: 'Two Visas Package', description: 'Trade license + 2 residency visa allocations + establishment card.', visaCount: 2, basePriceAed: null },
              { slug: 'multi-visa-custom', name: 'Additional / Multi-Visa Package', description: 'Custom 3+ visa quota and physical office/warehouse options.', visaCount: 3, basePriceAed: null },
            ]
          : undefined,
      };
    default:
      return {
        formType: 'CORPORATE_ADVISORY',
        categoryGroup: 'Corporate Advisory',
        eligibilityInfo: 'UAE and international corporate entities requiring licensing, banking support, restructuring, or logistics advisory.',
        requiredDocs: ['Company Trade License & MOA', 'Shareholder passports & Emirates IDs', 'Corporate profile / bank reference'],
        expectedWorkflow: 'Referral Submission → Prospera Intake → Advisory Scoping → Engagement Letter → Execution & Delivery',
        commissionDisclosure: 'Commission is conditional upon signed engagement and cleared advisory fee.',
      };
  }
}

export function formatStructuredRequirements(data: Record<string, unknown>): string {
  const labels: Record<string, string> = {
    formType: 'Service Track',
    transactionStage: 'Stage',
    propertyType: 'Property Type',
    intent: 'Intention',
    location: 'Location',
    budgetAed: 'Budget (AED)',
    preferredUnitType: 'Preferred Unit',
    financingRequired: 'Financing Required',
    expectedTimeline: 'Expected Timeline',
    eligibilityRoute: 'Eligibility Route',
    investmentCategory: 'Investment Category',
    approximateValueAed: 'Approx. Income/Investment (AED)',
    currentResidencyStatus: 'Current Residency Status',
    propertyValueAed: 'Property Value (AED)',
    downPaymentAed: 'Down Payment (AED)',
    estimatedFinanceAmountAed: 'Estimated Finance (AED)',
    incomeBand: 'Income Band',
    employmentType: 'Employment Type',
    structureType: 'Structure',
    preferredFreeZone: 'Preferred Free Zone',
    businessActivity: 'Business Activity',
    shareholdersCount: 'Shareholders',
    visaRequirementCount: 'Visa Requirement',
    facilityRequirement: 'Facility Requirement',
    estimatedSetupBudgetAed: 'Setup Budget (AED)',
    desiredStartDate: 'Desired Start Date',
    existingCompanyStatus: 'Existing Company Status',
    advisoryCategory: 'Advisory Category',
    jurisdiction: 'Jurisdiction',
    businessRequirement: 'Business Requirement',
    clientObjective: 'Client Objective',
  };

  return Object.entries(data)
    .filter(([k, v]) => k !== 'formType' && v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${labels[k] || k}: ${Array.isArray(v) ? v.join(', ') : String(v)}`)
    .join('\n')
    .slice(0, 1200);
}
