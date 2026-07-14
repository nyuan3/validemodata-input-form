import { useState, useCallback, useEffect, useRef } from 'react'
import { User, Save, RotateCcw, ChevronDown, ChevronRight, ChevronLeft, Plus, Pencil, Trash2, X, Search, ArrowLeft, Users } from 'lucide-react'

// ---------- Types ----------
// HUD HMIS standard response codes. The data-quality fields, veteran status,
// disabling condition, etc. all store the HUD numeric code as a string.
type DataQualityCode = '1' | '2' | '8' | '9' | '99'
type VeteranCode = '0' | '1' | '8' | '9' | '99'
type DisablingCode = '0' | '1' | '8' | '9' | '99'
type RelationshipCode = '1' | '2' | '3' | '4' | '5'
type LengthOfStayCode = '10' | '11' | '2' | '3' | '4' | '5' | '8' | '9' | '99'
type TimesHomelessCode = '1' | '2' | '3' | '4' | '8' | '9' | '99'

interface CodeOption {
  value: string
  label: string
  description?: string
}
type MemberTypeOption =
  | 'Head of Household'
  | 'Spouse'
  | 'Spouse/Partner'
  | 'Son'
  | 'Daughter'
  | 'Child'
  | 'Brother'
  | 'Sister'
  | 'Sibling'
  | 'Mother'
  | 'Father'
  | 'Parent'
  | 'Other relation'
  | 'Other'
  | 'Non-related household member'
type ProfileStatus = 'Draft' | 'In Review' | 'Complete'

interface HouseholdMember {
  id: string
  name: string
  memberType: MemberTypeOption | ''
  startDate: string
}

// HMIS Client Data — mirrors the HUD HMIS Data Standards schema.
interface ClientProfile {
  // 1. Client Name
  firstName: string
  middleName: string
  lastName: string
  suffix: string
  nameDataQuality: DataQualityCode | ''
  // 2. Social Security Number
  ssn: string
  ssnDataQuality: DataQualityCode | ''
  // 3. Date of Birth
  dob: string
  dobDataQuality: DataQualityCode | ''
  // Sex
  sex: string
  // 4. Race and Ethnicity (multi-select; codes 8/9/99 are mutually exclusive)
  raceEthnicity: string[]
  raceEthnicityAdditional: string
  // 5. Veteran Status
  veteranStatus: VeteranCode | ''
  // 6. Disabling Condition
  disablingCondition: DisablingCode | ''
  // 7. Project Enrollment Dates
  projectStartDate: string
  projectExitDate: string
  housingMoveInDate: string
  dateOfEngagement: string
  bedNightDates: string[]
  // 8. Destination at Exit
  destinationType: string
  destinationRentalSubsidyType: string
  destinationOtherDescription: string
  // 9. Relationship to Head of Household
  relationshipToHoH: RelationshipCode | ''
  // 10. CoC Code
  cocCode: string
  // 11. Prior Living Situation
  priorResidenceType: string
  priorRentalSubsidyType: string
  lengthOfStay: LengthOfStayCode | ''
  homelessnessStartDate: string
  timesHomelessPast3Years: TimesHomelessCode | ''
  monthsHomelessPast3Years: string
  // Income from Any Source
  income: IncomeRecord
  // Non-Cash Benefits
  nonCash: NonCashRecord
  // Health Insurance
  insurance: InsuranceRecord
  // Disability & Health Conditions (each element is its own section with its
  // own information date, per the HMIS schema)
  physicalDisabilityInfoDate: string
  physicalDisability: string
  physicalDisabilityIndefinite: string
  developmentalDisabilityInfoDate: string
  developmentalDisability: string
  chronicHealthInfoDate: string
  chronicHealthCondition: string
  chronicHealthIndefinite: string
  hivAidsInfoDate: string
  hivAids: string
  mentalHealthInfoDate: string
  mentalHealthDisorder: string
  mentalHealthIndefinite: string
  substanceUseInfoDate: string
  substanceUseDisorder: string
  substanceUseIndefinite: string
  // Survivor of Domestic Violence
  dvInfoDate: string
  survivorOfDV: string
  dvWhenOccurred: string
  dvCurrentlyFleeing: string
  // Coordinated Entry (repeatable)
  ceEvents: CEEvent[]
  ceAssessments: CEAssessment[]

  // ----- Retained operational fields (used by Household & Assessments tabs,
  // not part of the HMIS profile schema) -----
  householdMembers: HouseholdMember[]
  currentLivingSituation: string
  locationDetails: string
  leavingWithin14Days: string
  subsequentResidenceIdentified: string
  resourcesForHousing: string
  leaseInLast60Days: string
  movedTwiceIn60Days: string
  clsRentalSubsidyType: string
  clsInformationDate: string
  clsVerifiedBy: string
}

function cn(...classes: (string | undefined | false)[]): string {
  return classes.filter(Boolean).join(' ')
}

function todayISO(): string {
  const d = new Date()
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

const MEMBER_TYPE_OPTIONS: MemberTypeOption[] = [
  'Head of Household',
  'Spouse',
  'Son',
  'Daughter',
  'Brother',
  'Sister',
  'Mother',
  'Father',
  'Other relation',
  'Non-related household member',
]

// Current Living Situation values that trigger the temporary/permanent housing
// follow-up questions (stored as Appendix A codes).
const TEMP_OR_PERM_HOUSING_OPTIONS: string[] = [
  'staying_with_friend',
  'staying_with_family',
  'rental_no_subsidy',
  'rental_with_ongoing_subsidy',
  'owned_with_subsidy',
  'owned_no_subsidy',
  'other',
  'worker_unable_to_determine',
]

function generateMemberId(): string {
  return `hm-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

// ---------- HMIS schema option lists ----------
const NAME_DQ_OPTIONS: CodeOption[] = [
  { value: '1', label: 'Full name reported' },
  { value: '2', label: 'Partial, street name, or code name reported' },
  { value: '8', label: "Client doesn't know" },
  { value: '9', label: 'Client prefers not to answer' },
  { value: '99', label: 'Data not collected' },
]

const SSN_DQ_OPTIONS: CodeOption[] = [
  { value: '1', label: 'Full SSN reported' },
  { value: '2', label: 'Approximate or partial SSN reported' },
  { value: '8', label: "Client doesn't know" },
  { value: '9', label: 'Client prefers not to answer' },
  { value: '99', label: 'Data not collected' },
]

const DOB_DQ_OPTIONS: CodeOption[] = [
  { value: '1', label: 'Full DOB reported' },
  { value: '2', label: 'Approximate or partial DOB reported' },
  { value: '8', label: "Client doesn't know" },
  { value: '9', label: 'Client prefers not to answer' },
  { value: '99', label: 'Data not collected' },
]

const RACE_ETHNICITY_OPTIONS: CodeOption[] = [
  { value: '1', label: 'American Indian, Alaska Native, or Indigenous' },
  { value: '2', label: 'Asian or Asian American' },
  { value: '3', label: 'Black, African American, or African' },
  { value: '4', label: 'Hispanic/Latina/o' },
  { value: '5', label: 'Middle Eastern or North African' },
  { value: '6', label: 'Native Hawaiian or Pacific Islander' },
  { value: '7', label: 'White' },
  { value: '8', label: "Client doesn't know" },
  { value: '9', label: 'Client prefers not to answer' },
  { value: '99', label: 'Data not collected' },
]
// Codes 8/9/99 must not be combined with any other race/ethnicity selection.
const RACE_EXCLUSIVE_CODES = new Set(['8', '9', '99'])

const VETERAN_STATUS_OPTIONS: CodeOption[] = [
  { value: '0', label: 'No' },
  { value: '1', label: 'Yes' },
  { value: '8', label: "Client doesn't know" },
  { value: '9', label: 'Client prefers not to answer' },
  { value: '99', label: 'Data not collected' },
]

const DISABLING_CONDITION_OPTIONS: CodeOption[] = [
  { value: '0', label: 'No' },
  { value: '1', label: 'Yes' },
  { value: '8', label: "Client doesn't know" },
  { value: '9', label: 'Client prefers not to answer' },
  { value: '99', label: 'Data not collected' },
]

const RELATIONSHIP_TO_HOH_OPTIONS: CodeOption[] = [
  { value: '1', label: 'Self (Head of Household)' },
  { value: '2', label: "Head of Household's child" },
  { value: '3', label: "Head of Household's spouse or partner" },
  { value: '4', label: "Head of Household's other relation member" },
  { value: '5', label: 'Other: non-relation member' },
]

const LENGTH_OF_STAY_OPTIONS: CodeOption[] = [
  { value: '10', label: 'One night or less' },
  { value: '11', label: 'Two to six nights' },
  { value: '2', label: 'One week or more, but less than one month' },
  { value: '3', label: 'One month or more, but less than 90 days' },
  { value: '4', label: '90 days or more, but less than one year' },
  { value: '5', label: 'One year or longer' },
  { value: '8', label: "Client doesn't know" },
  { value: '9', label: 'Client prefers not to answer' },
  { value: '99', label: 'Data not collected' },
]

const TIMES_HOMELESS_OPTIONS: CodeOption[] = [
  { value: '1', label: 'One time' },
  { value: '2', label: 'Two times' },
  { value: '3', label: 'Three times' },
  { value: '4', label: 'Four or more times' },
  { value: '8', label: "Client doesn't know" },
  { value: '9', label: 'Client prefers not to answer' },
  { value: '99', label: 'Data not collected' },
]

// Months-homeless count values are normalized into the 1xx range to keep them
// unique: the source schema reused codes 8/9 for both month counts and the
// "doesn't know / prefers not to answer" data-quality responses. 101 = first
// month, 102–112 = 2–12 months, 113 = more than 12 months.
const MONTHS_HOMELESS_OPTIONS: CodeOption[] = [
  { value: '101', label: 'One month (this time is the first month)' },
  { value: '102', label: '2 months' },
  { value: '103', label: '3 months' },
  { value: '104', label: '4 months' },
  { value: '105', label: '5 months' },
  { value: '106', label: '6 months' },
  { value: '107', label: '7 months' },
  { value: '108', label: '8 months' },
  { value: '109', label: '9 months' },
  { value: '110', label: '10 months' },
  { value: '111', label: '11 months' },
  { value: '112', label: '12 months' },
  { value: '113', label: 'More than 12 months' },
  { value: '8', label: "Client doesn't know" },
  { value: '9', label: 'Client prefers not to answer' },
  { value: '99', label: 'Data not collected' },
]

// Appendix A – Living Situation Option List (shared by Destination and Prior
// Living Situation). The two sentinel values the schema's conditional logic
// keys on are `rental_with_ongoing_subsidy` and `other`.
const LIVING_SITUATION_OPTIONS: CodeOption[] = [
  { value: 'place_not_meant_for_habitation', label: 'Place not meant for habitation (e.g., a vehicle, abandoned building, or anywhere outside)' },
  { value: 'emergency_shelter', label: 'Emergency shelter, incl. hotel/motel paid with ES voucher, or RHY-funded Host Home shelter' },
  { value: 'safe_haven', label: 'Safe Haven' },
  { value: 'foster_care', label: 'Foster care home or foster care group home' },
  { value: 'hospital_non_psychiatric', label: 'Hospital or other residential non-psychiatric medical facility' },
  { value: 'jail_prison', label: 'Jail, prison or juvenile detention facility' },
  { value: 'long_term_care', label: 'Long-term care facility or nursing home' },
  { value: 'psychiatric', label: 'Psychiatric hospital or other psychiatric facility' },
  { value: 'substance_abuse', label: 'Substance abuse treatment facility or detox center' },
  { value: 'residential_no_homeless_criteria', label: 'Residential project or halfway house with no homeless criteria' },
  { value: 'hotel_motel_no_voucher', label: 'Hotel or motel paid for without emergency shelter voucher' },
  { value: 'staying_with_friend', label: "Staying or living in a friend's room, apartment or house" },
  { value: 'staying_with_family', label: "Staying or living in a family member's room, apartment or house" },
  { value: 'rental_no_subsidy', label: 'Rental by client, no ongoing housing subsidy' },
  { value: 'rental_with_ongoing_subsidy', label: 'Rental by client, with ongoing housing subsidy' },
  { value: 'owned_with_subsidy', label: 'Owned by client, with ongoing housing subsidy' },
  { value: 'owned_no_subsidy', label: 'Owned by client, no ongoing housing subsidy' },
  { value: 'permanent_housing_formerly_homeless', label: 'Permanent housing (other than RRH) for formerly homeless persons' },
  { value: 'rapid_rehousing', label: 'Rapid re-housing' },
  { value: 'transitional_housing', label: 'Transitional housing for homeless persons' },
  { value: 'other', label: 'Other' },
  { value: 'worker_unable_to_determine', label: 'Worker unable to determine' },
  { value: 'client_doesnt_know', label: "Client doesn't know" },
  { value: 'client_prefers_not_to_answer', label: 'Client prefers not to answer' },
  { value: 'data_not_collected', label: 'Data not collected' },
]

// Appendix A – Rental Subsidy Type list (used when the residence is
// `rental_with_ongoing_subsidy`).
const HMIS_RENTAL_SUBSIDY_OPTIONS: CodeOption[] = [
  { value: 'gpd_tip', label: 'GPD TIP housing subsidy' },
  { value: 'vash', label: 'VASH housing subsidy (HUD-VASH)' },
  { value: 'rrh', label: 'RRH or equivalent subsidy' },
  { value: 'hcv', label: 'Housing Choice Voucher (tenant-based Section 8)' },
  { value: 'public_housing', label: 'Public housing unit' },
  { value: 'rental_subsidized', label: 'Rental by client in a subsidized housing unit' },
  { value: 'other_ph_dedicated', label: 'Other permanent housing dedicated for formerly homeless persons' },
  { value: 'other_subsidy', label: 'Other (non-TH) housing subsidy' },
]

// A select bound to a list of HUD code options. Stores `option.value`.
function CodeSelect({
  value,
  onChange,
  options,
  className,
  placeholder = 'Select',
  ariaLabel,
}: {
  value: string
  onChange: (v: string) => void
  options: CodeOption[]
  className?: string
  placeholder?: string
  ariaLabel?: string
}) {
  return (
    <select aria-label={ariaLabel} value={value} onChange={(e) => onChange(e.target.value)} className={className}>
      <option value="">{placeholder}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  )
}

// ---------- Shared HUD code option lists ----------
// Yes/No with the standard "don't know / prefers not / not collected" tail.
const YES_NO_DK_OPTIONS: CodeOption[] = [
  { value: '0', label: 'No' },
  { value: '1', label: 'Yes' },
  { value: '8', label: "Client doesn't know" },
  { value: '9', label: 'Client prefers not to answer' },
  { value: '99', label: 'Data not collected' },
]
// Plain Yes/No (used by income source, non-cash, and insurance sub-fields).
const YES_NO_OPTIONS: CodeOption[] = [
  { value: '0', label: 'No' },
  { value: '1', label: 'Yes' },
]

const SEX_OPTIONS: CodeOption[] = [
  { value: '0', label: 'Female' },
  { value: '1', label: 'Male' },
  { value: '8', label: "Client doesn't know" },
  { value: '9', label: 'Client prefers not to answer' },
  { value: '99', label: 'Data not collected' },
]

const SUBSTANCE_USE_OPTIONS: CodeOption[] = [
  { value: '0', label: 'No' },
  { value: '1', label: 'Alcohol use disorder' },
  { value: '2', label: 'Drug use disorder' },
  { value: '3', label: 'Both alcohol and drug use disorders' },
  { value: '8', label: "Client doesn't know" },
  { value: '9', label: 'Client prefers not to answer' },
  { value: '99', label: 'Data not collected' },
]

const DV_WHEN_OPTIONS: CodeOption[] = [
  { value: '1', label: 'Within the past three months' },
  { value: '2', label: 'Three to six months ago (excluding six months exactly)' },
  { value: '3', label: 'Six months to one year ago (excluding one year exactly)' },
  { value: '4', label: 'One year ago, or more' },
  { value: '8', label: "Client doesn't know" },
  { value: '9', label: 'Client prefers not to answer' },
  { value: '99', label: 'Data not collected' },
]

const NO_INSURANCE_REASON_OPTIONS: CodeOption[] = [
  { value: '1', label: 'Applied; decision pending' },
  { value: '2', label: 'Applied; client not eligible' },
  { value: '3', label: 'Client did not apply' },
  { value: '4', label: 'Insurance type N/A for this client' },
  { value: '8', label: "Client doesn't know" },
  { value: '9', label: 'Client prefers not to answer' },
  { value: '99', label: 'Data not collected' },
]

// Coordinated Entry Event types (Data Element 4.20).
const CE_EVENT_OPTIONS: CodeOption[] = [
  { value: '1', label: 'Referral to a Prevention Assistance project' },
  { value: '2', label: 'Problem Solving/Diversion/Rapid Resolution intervention or service' },
  { value: '3', label: 'Referral to a scheduled CE Crisis Needs Assessment' },
  { value: '4', label: 'Referral to a scheduled CE Housing Needs Assessment' },
  { value: '5', label: 'Referral to post-placement/follow-up case management' },
  { value: '6', label: 'Referral to a Street Outreach project or services' },
  { value: '7', label: 'Referral to a Housing Navigation project or services' },
  { value: '8', label: 'Referral to Non-continuum services: Ineligible for continuum services' },
  { value: '9', label: 'Referral to Non-continuum services: No availability in continuum services' },
  { value: '10', label: 'Referral to Emergency Shelter bed opening' },
  { value: '11', label: 'Referral to Transitional Housing bed/unit opening' },
  { value: '12', label: 'Referral to Joint TH-RRH project/unit/resource opening' },
  { value: '13', label: 'Referral to RRH project resource opening' },
  { value: '14', label: 'Referral to PSH project resource opening' },
  { value: '15', label: 'Referral to Other PH project/unit/resource opening' },
  { value: '16', label: 'Referral to emergency assistance/flex fund/furniture assistance' },
  { value: '17', label: 'Referral to a Housing Stability Voucher' },
]
// Event types that involve a housing/crisis project referral (need project + result).
const CE_REFERRAL_EVENT_TYPES = new Set(['10', '11', '12', '13', '14', '15', '17'])

const REFERRAL_RESULT_OPTIONS: CodeOption[] = [
  { value: '1', label: 'Successful referral: client accepted' },
  { value: '2', label: 'Unsuccessful referral: client rejected' },
  { value: '3', label: 'Unsuccessful referral: provider rejected' },
]

const CE_ASSESSMENT_TYPE_OPTIONS: CodeOption[] = [
  { value: '1', label: 'Phone' },
  { value: '2', label: 'Virtual' },
  { value: '3', label: 'In Person' },
]
const CE_ASSESSMENT_LEVEL_OPTIONS: CodeOption[] = [
  { value: '1', label: 'Crisis Needs Assessment' },
  { value: '2', label: 'Housing Needs Assessment' },
]
const CE_PRIORITIZATION_OPTIONS: CodeOption[] = [
  { value: '1', label: 'Placed on prioritization list' },
  { value: '2', label: 'Not placed on prioritization list' },
]

// Source definitions that drive the Income / Non-Cash / Insurance sections.
const INCOME_SOURCES: { key: string; label: string }[] = [
  { key: 'earned', label: 'Earned income (employment)' },
  { key: 'unemployment', label: 'Unemployment Insurance' },
  { key: 'ssi', label: 'Supplemental Security Income (SSI)' },
  { key: 'ssdi', label: 'Social Security Disability Insurance (SSDI)' },
  { key: 'vaServiceConnected', label: 'VA Service-Connected Disability Compensation' },
  { key: 'vaNonServiceConnected', label: 'VA Non-Service-Connected Disability Pension' },
  { key: 'privateDisability', label: 'Private Disability Insurance' },
  { key: 'workersComp', label: "Worker's Compensation" },
  { key: 'tanf', label: 'Temporary Assistance for Needy Families (TANF)' },
  { key: 'generalAssistance', label: 'General Assistance (GA)' },
  { key: 'socialSecurityRetirement', label: 'Retirement Income from Social Security' },
  { key: 'pension', label: 'Pension/Retirement from a former job' },
  { key: 'childSupport', label: 'Child Support' },
  { key: 'alimony', label: 'Alimony and other spousal support' },
  { key: 'other', label: 'Other income source' },
]
const NONCASH_SOURCES: { key: string; label: string }[] = [
  { key: 'snap', label: 'SNAP / Food Stamps' },
  { key: 'wic', label: 'WIC' },
  { key: 'tanfChildCare', label: 'TANF Child Care Services' },
  { key: 'tanfTransportation', label: 'TANF Transportation Services' },
  { key: 'otherTanf', label: 'Other TANF-Funded Services' },
  { key: 'other', label: 'Other Non-Cash Benefit' },
]
const INSURANCE_TYPES: { key: string; label: string }[] = [
  { key: 'medicaid', label: 'Medicaid' },
  { key: 'medicare', label: 'Medicare' },
  { key: 'schip', label: "State Children's Health Insurance Program (CHIP)" },
  { key: 'vha', label: "Veteran's Health Administration (VHA)" },
  { key: 'employer', label: 'Employer-Provided Health Insurance' },
  { key: 'cobra', label: 'Health Insurance obtained through COBRA' },
  { key: 'privatePay', label: 'Private Pay Health Insurance' },
  { key: 'stateAdults', label: 'State Health Insurance for Adults' },
  { key: 'indianHealth', label: 'Indian Health Services Program' },
  { key: 'other', label: 'Other Health Insurance' },
]

// ---------- Nested record types & factories ----------
interface AmountSource {
  has: string
  amount: string
}
interface IncomeRecord {
  informationDate: string
  fromAnySource: string
  sources: Record<string, AmountSource>
  otherName: string
}
interface NonCashRecord {
  informationDate: string
  fromAnySource: string
  flags: Record<string, string>
  otherSource: string
}
interface InsuranceRecord {
  informationDate: string
  covered: string
  flags: Record<string, string>
  otherSource: string
  noInsuranceReason: string
}
interface CEEvent {
  id: string
  eventDate: string
  eventType: string
  diversionResult: string
  aftercareResult: string
  referralProjectId: string
  referralResult: string
  referralResultDate: string
}
interface CEAssessment {
  id: string
  assessmentDate: string
  assessmentLocation: string
  assessmentType: string
  assessmentLevel: string
  prioritizationStatus: string
  notes: string
}

function emptyIncome(): IncomeRecord {
  const sources: Record<string, AmountSource> = {}
  for (const s of INCOME_SOURCES) sources[s.key] = { has: '', amount: '' }
  return { informationDate: '', fromAnySource: '', sources, otherName: '' }
}
function emptyNonCash(): NonCashRecord {
  const flags: Record<string, string> = {}
  for (const s of NONCASH_SOURCES) flags[s.key] = ''
  return { informationDate: '', fromAnySource: '', flags, otherSource: '' }
}
function emptyInsurance(): InsuranceRecord {
  const flags: Record<string, string> = {}
  for (const s of INSURANCE_TYPES) flags[s.key] = ''
  return { informationDate: '', covered: '', flags, otherSource: '', noInsuranceReason: '' }
}
function generateSubId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

// ---------- Demo data ----------
const DEMO_PROFILE: ClientProfile = {
  firstName: 'Maria',
  middleName: 'Elena',
  lastName: 'Santos',
  suffix: '',
  nameDataQuality: '1',
  ssn: '123456789',
  ssnDataQuality: '1',
  dob: '1985-06-12',
  dobDataQuality: '1',
  sex: '0',
  raceEthnicity: ['4'],
  raceEthnicityAdditional: '',
  veteranStatus: '0',
  disablingCondition: '1',
  projectStartDate: '2026-05-13',
  projectExitDate: '',
  housingMoveInDate: '',
  dateOfEngagement: '2026-05-15',
  bedNightDates: [],
  destinationType: 'staying_with_family',
  destinationRentalSubsidyType: '',
  destinationOtherDescription: '',
  relationshipToHoH: '1',
  cocCode: 'CA-600',
  priorResidenceType: 'staying_with_family',
  priorRentalSubsidyType: '',
  lengthOfStay: '3',
  homelessnessStartDate: '2026-02-01',
  timesHomelessPast3Years: '2',
  monthsHomelessPast3Years: '104',
  income: {
    ...emptyIncome(),
    informationDate: '2026-05-13',
    fromAnySource: '1',
    sources: { ...emptyIncome().sources, earned: { has: '1', amount: '800' }, tanf: { has: '1', amount: '500' } },
  },
  nonCash: {
    ...emptyNonCash(),
    informationDate: '2026-05-13',
    fromAnySource: '1',
    flags: { ...emptyNonCash().flags, snap: '1', wic: '1' },
  },
  insurance: {
    ...emptyInsurance(),
    informationDate: '2026-05-13',
    covered: '1',
    flags: { ...emptyInsurance().flags, medicaid: '1' },
  },
  physicalDisabilityInfoDate: '2026-05-13',
  physicalDisability: '0',
  physicalDisabilityIndefinite: '',
  developmentalDisabilityInfoDate: '2026-05-13',
  developmentalDisability: '0',
  chronicHealthInfoDate: '2026-05-13',
  chronicHealthCondition: '1',
  chronicHealthIndefinite: '1',
  hivAidsInfoDate: '2026-05-13',
  hivAids: '0',
  mentalHealthInfoDate: '2026-05-13',
  mentalHealthDisorder: '0',
  mentalHealthIndefinite: '',
  substanceUseInfoDate: '2026-05-13',
  substanceUseDisorder: '0',
  substanceUseIndefinite: '',
  dvInfoDate: '2026-05-13',
  survivorOfDV: '1',
  dvWhenOccurred: '1',
  dvCurrentlyFleeing: '1',
  ceEvents: [],
  ceAssessments: [],
  householdMembers: [
    { id: 'demo-hm-1', name: 'Maria Santos', memberType: 'Head of Household', startDate: '2026-05-13' },
    { id: 'demo-hm-2', name: 'Diego Santos', memberType: 'Son', startDate: '2026-05-13' },
  ],
  currentLivingSituation: 'staying_with_family',
  locationDetails: "Sister's apartment, Echo Park",
  leavingWithin14Days: '1',
  subsequentResidenceIdentified: '0',
  resourcesForHousing: '0',
  leaseInLast60Days: '0',
  movedTwiceIn60Days: '1',
  clsRentalSubsidyType: '',
  clsInformationDate: '2026-05-13',
  clsVerifiedBy: '',
}

// ---------- Empty profile ----------
const EMPTY_PROFILE: ClientProfile = {
  firstName: '',
  middleName: '',
  lastName: '',
  suffix: '',
  nameDataQuality: '',
  ssn: '',
  ssnDataQuality: '',
  dob: '',
  dobDataQuality: '',
  sex: '',
  raceEthnicity: [],
  raceEthnicityAdditional: '',
  veteranStatus: '',
  disablingCondition: '',
  projectStartDate: '',
  projectExitDate: '',
  housingMoveInDate: '',
  dateOfEngagement: '',
  bedNightDates: [],
  destinationType: '',
  destinationRentalSubsidyType: '',
  destinationOtherDescription: '',
  relationshipToHoH: '',
  cocCode: '',
  priorResidenceType: '',
  priorRentalSubsidyType: '',
  lengthOfStay: '',
  homelessnessStartDate: '',
  timesHomelessPast3Years: '',
  monthsHomelessPast3Years: '',
  income: emptyIncome(),
  nonCash: emptyNonCash(),
  insurance: emptyInsurance(),
  physicalDisabilityInfoDate: '',
  physicalDisability: '',
  physicalDisabilityIndefinite: '',
  developmentalDisabilityInfoDate: '',
  developmentalDisability: '',
  chronicHealthInfoDate: '',
  chronicHealthCondition: '',
  chronicHealthIndefinite: '',
  hivAidsInfoDate: '',
  hivAids: '',
  mentalHealthInfoDate: '',
  mentalHealthDisorder: '',
  mentalHealthIndefinite: '',
  substanceUseInfoDate: '',
  substanceUseDisorder: '',
  substanceUseIndefinite: '',
  dvInfoDate: '',
  survivorOfDV: '',
  dvWhenOccurred: '',
  dvCurrentlyFleeing: '',
  ceEvents: [],
  ceAssessments: [],
  householdMembers: [],
  currentLivingSituation: '',
  locationDetails: '',
  leavingWithin14Days: '',
  subsequentResidenceIdentified: '',
  resourcesForHousing: '',
  leaseInLast60Days: '',
  movedTwiceIn60Days: '',
  clsRentalSubsidyType: '',
  clsInformationDate: '',
  clsVerifiedBy: '',
}

// ---------- Section config for nav ----------
const TOP_NAV: { id: string; label: string }[] = [
  { id: 'profile', label: 'Profile' },
  { id: 'assessments', label: 'Assessments' },
  { id: 'notes', label: 'Notes' },
]

const SECTIONS: { id: string; label: string }[] = [
  { id: 'client_name', label: 'Client Name' },
  { id: 'ssn', label: 'Social Security Number' },
  { id: 'date_of_birth', label: 'Date of Birth' },
  { id: 'sex', label: 'Sex' },
  { id: 'race_ethnicity', label: 'Race & Ethnicity' },
  { id: 'veteran_status', label: 'Veteran Status' },
  { id: 'disabling_condition', label: 'Disabling Condition' },
  { id: 'enrollment_dates', label: 'Project Enrollment Dates' },
  { id: 'destination', label: 'Destination at Exit' },
  { id: 'relationship_hoh', label: 'Relationship to Head of Household' },
  { id: 'coc_code', label: 'CoC Code' },
  { id: 'prior_living_situation', label: 'Prior Living Situation' },
  { id: 'income', label: 'Income from Any Source' },
  { id: 'non_cash_benefits', label: 'Non-Cash Benefits' },
  { id: 'health_insurance', label: 'Health Insurance' },
  { id: 'disability_health', label: 'Disability & Health Conditions' },
  { id: 'domestic_violence', label: 'Survivor of Domestic Violence' },
]

// ---------- Reusable components ----------
function SectionCard({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="mb-5 text-base font-semibold text-slate-800">{title}</h2>
      <div className="space-y-5">{children}</div>
    </section>
  )
}

// Two-column row: label left, control right (HMIS-style)
function FormField({ label, required, error, children, className }: { label: string; required?: boolean; error?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,180px)_1fr] sm:gap-6', className)}>
      <label className="flex items-center text-sm font-medium text-slate-800">
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      <div className="min-w-0">
        {children}
        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      </div>
    </div>
  )
}

function AddHouseholdMemberModal({
  open,
  initialMember,
  onSave,
  onClose,
}: {
  open: boolean
  initialMember: HouseholdMember | null
  onSave: (m: HouseholdMember) => void
  onClose: () => void
}) {
  const [name, setName] = useState('')
  const [memberType, setMemberType] = useState<MemberTypeOption | ''>('')
  const [startDate, setStartDate] = useState<string>(todayISO())
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    if (initialMember) {
      setName(initialMember.name)
      setMemberType(initialMember.memberType)
      setStartDate(initialMember.startDate || todayISO())
    } else {
      setName('')
      setMemberType('')
      setStartDate(todayISO())
    }
  }, [open, initialMember])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const handleBackdrop = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose()
  }

  const handleSave = () => {
    if (!memberType) return
    onSave({
      id: initialMember?.id ?? generateMemberId(),
      name: name.trim(),
      memberType,
      startDate: startDate || todayISO(),
    })
  }

  const inputBase = 'w-full border-0 border-b border-slate-300 bg-transparent px-0 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-0'
  const selectBase = 'w-full rounded border border-slate-200 bg-slate-50 py-2 pl-3 pr-8 text-sm text-slate-900 focus:border-blue-500 focus:outline-none'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
      onMouseDown={handleBackdrop}
      role="presentation"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="ADD TO HOUSEHOLD"
        className="w-full max-w-md rounded-lg bg-white shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-800">Add to Household</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-4 px-5 py-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Name</label>
            <input
              type="text"
              name="member-name"
              aria-label="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputBase}
              placeholder="Member name"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">
              Member Type<span className="ml-0.5 text-red-500">*</span>
            </label>
            <select
              name="member-type"
              aria-label="Member Type"
              value={memberType}
              onChange={(e) => setMemberType(e.target.value as MemberTypeOption | '')}
              className={selectBase}
            >
              <option value="">Select</option>
              {MEMBER_TYPE_OPTIONS.map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Start Date</label>
            <input
              type="date"
              name="member-start-date"
              aria-label="Start Date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className={inputBase}
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            aria-label="Cancel"
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!memberType}
            aria-label="Save"
            className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
}

function ProfileHeader({
  profile,
  status,
  onSave,
  onReset,
  onLoadDemo,
  onBack,
  validationErrors,
}: {
  profile: ClientProfile
  status: ProfileStatus
  onSave: () => void
  onReset: () => void
  onLoadDemo: () => void
  onBack?: () => void
  validationErrors: string[]
}) {
  const displayName = [profile.firstName, profile.lastName].filter(Boolean).join(' ') || 'New client'
  return (
    <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 bg-white px-6 py-3 shadow-sm">
      <div className="flex items-center gap-3">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            aria-label="Back to clients"
            className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            All Clients
          </button>
        )}
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
          <User className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-lg font-semibold text-slate-900">{displayName}</h1>
          <span className={cn(
            'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
            status === 'Complete' && 'bg-emerald-100 text-emerald-800',
            status === 'In Review' && 'bg-amber-100 text-amber-800',
            status === 'Draft' && 'bg-slate-100 text-slate-700'
          )}>{status}</span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {validationErrors.length > 0 && (
          <span className="text-sm text-amber-600">{validationErrors.length} required</span>
        )}
        <button type="button" onClick={onLoadDemo} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50" aria-label="Load demo data">
          Load Demo
        </button>
        <button type="button" onClick={onReset} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50" aria-label="Reset">
          <RotateCcw className="h-4 w-4" />
          Reset
        </button>
        <button type="button" onClick={onSave} className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700" aria-label="Save">
          <Save className="h-4 w-4" />
          Save
        </button>
      </div>
    </header>
  )
}

function StickySectionNav({ sections, currentSectionId, onSectionChange }: { sections: { id: string; label: string }[]; currentSectionId: string; onSectionChange: (id: string) => void }) {
  return (
    <nav className="section-nav sticky top-0 z-20 flex max-h-screen w-56 shrink-0 flex-col overflow-y-auto border-r border-slate-700 bg-[#3C474E] py-4">
      <div className="mb-3 px-4">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Intake</span>
      </div>
      <ul className="space-y-0.5 px-2">
        {sections.map((s) => {
          const isActive = s.id === currentSectionId
          return (
            <li key={s.id}>
              <a
                href={`#${s.id}`}
                onClick={(e) => {
                  e.preventDefault()
                  onSectionChange(s.id)
                }}
                className={cn(
                  'block rounded px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive ? 'bg-[#606C7B] text-white' : 'text-slate-300 hover:bg-slate-600/50 hover:text-white'
                )}
              >
                {s.label}
              </a>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

const COC_CODE_PATTERN = /^[A-Z]{2}-\d{3}$/

function validateProfile(p: ClientProfile): string[] {
  const errs: string[] = []
  // Required: Name/DOB data-quality markers, Sex, and Race/Ethnicity. The name and DOB
  // values themselves are optional — the quality code records why one is missing.
  if (!p.nameDataQuality) errs.push('Name Data Quality')
  if (!p.dobDataQuality) errs.push('DOB Data Quality')
  if (!p.sex) errs.push('Sex')
  if (p.raceEthnicity.length === 0) errs.push('Race and Ethnicity')
  // Consistency checks — only fire when a value is entered
  // DOB codes 8/9/99 are not valid when a date is entered
  if (p.dob && (p.dobDataQuality === '8' || p.dobDataQuality === '9' || p.dobDataQuality === '99')) {
    errs.push('DOB conflicts with DOB Data Quality')
  }
  if (p.cocCode?.trim() && !COC_CODE_PATTERN.test(p.cocCode.trim())) errs.push('CoC Code format (XX-XXX)')
  return errs
}

// ---------- Clients (list-level) ----------
type ClientStatus = 'Draft' | 'Active' | 'Complete'

interface Client {
  id: string
  createdAt: string // ISO date
  caseManager: string
  profile: ClientProfile
}

const CLIENTS_STORAGE_KEY = 'hmis-intake-clients'

function generateClientId(): string {
  return `cl-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function clientDisplayName(p: ClientProfile): string {
  const full = [p.firstName, p.lastName].filter(Boolean).join(' ').trim()
  return full || 'Unnamed client'
}

function deriveClientStatus(p: ClientProfile): ClientStatus {
  // A nameless client still counts as started once a Name Data Quality code is chosen
  const hasIdentity = !!(p.firstName?.trim() || p.lastName?.trim() || p.nameDataQuality)
  if (!hasIdentity) return 'Draft'
  if (validateProfile(p).length === 0) return 'Complete'
  return 'Active'
}

function statusBadgeClass(s: ClientStatus): string {
  if (s === 'Complete') return 'bg-emerald-100 text-emerald-800'
  if (s === 'Active') return 'bg-amber-100 text-amber-800'
  return 'bg-slate-100 text-slate-700'
}

function formatDate(iso: string): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

function buildSeedClients(): Client[] {
  const baseDay = new Date()
  const daysAgo = (n: number) => {
    const d = new Date(baseDay)
    d.setDate(d.getDate() - n)
    return d.toISOString().slice(0, 10)
  }
  return [
    {
      id: generateClientId(),
      createdAt: daysAgo(12),
      caseManager: 'Nathan Yuan',
      profile: { ...DEMO_PROFILE },
    },
    {
      id: generateClientId(),
      createdAt: daysAgo(6),
      caseManager: 'Priya Patel',
      profile: { ...EMPTY_PROFILE, firstName: 'James', lastName: 'Okafor', nameDataQuality: '1' },
    },
    {
      id: generateClientId(),
      createdAt: daysAgo(3),
      caseManager: 'Marcus Lee',
      profile: { ...EMPTY_PROFILE, firstName: 'Lin', lastName: 'Tran', nameDataQuality: '1' },
    },
    {
      id: generateClientId(),
      createdAt: daysAgo(1),
      caseManager: 'Elena Rodríguez',
      profile: { ...EMPTY_PROFILE },
    },
  ]
}

function loadClients(): Client[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(CLIENTS_STORAGE_KEY)
    if (!raw) {
      const seeded = buildSeedClients()
      window.localStorage.setItem(CLIENTS_STORAGE_KEY, JSON.stringify(seeded))
      return seeded
    }
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed as Client[]
  } catch {
    return []
  }
}

function saveClients(clients: Client[]): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(CLIENTS_STORAGE_KEY, JSON.stringify(clients))
  } catch {
    /* ignore quota errors */
  }
}

function upsertClient(client: Client): Client[] {
  const all = loadClients()
  const idx = all.findIndex((c) => c.id === client.id)
  const next = idx >= 0 ? all.map((c) => (c.id === client.id ? client : c)) : [...all, client]
  saveClients(next)
  return next
}

// Wipe every client profile along with the household and recent-search data that
// references them, leaving the app in a clean empty state.
function deleteAllClients(): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(CLIENTS_STORAGE_KEY, JSON.stringify([]))
    window.localStorage.setItem(HOUSEHOLDS_STORAGE_KEY, JSON.stringify([]))
    window.localStorage.removeItem(RECENT_SEARCHES_STORAGE_KEY)
  } catch {
    /* ignore quota errors */
  }
}

// ---------- Hash routing ----------
type Route =
  | { name: 'list' }
  | { name: 'intake'; clientId: string }
  | { name: 'household'; clientId: string }

function parseHash(): Route {
  const raw = (typeof window !== 'undefined' ? window.location.hash : '') || ''
  const path = raw.replace(/^#/, '')
  const hh = path.match(/^\/clients\/([^/]+)\/household$/)
  if (hh) return { name: 'household', clientId: decodeURIComponent(hh[1]) }
  const m = path.match(/^\/clients\/(.+)$/)
  if (m) return { name: 'intake', clientId: decodeURIComponent(m[1]) }
  return { name: 'list' }
}

function navigateToList(): void {
  if (typeof window !== 'undefined') window.location.hash = '/clients'
}

function navigateToClient(id: string): void {
  if (typeof window !== 'undefined') window.location.hash = `/clients/${encodeURIComponent(id)}`
}

function navigateToHousehold(id: string): void {
  if (typeof window !== 'undefined') window.location.hash = `/clients/${encodeURIComponent(id)}/household`
}

// ---------- Status badge ----------
function StatusBadge({ status }: { status: ClientStatus }) {
  return (
    <span className={cn('inline-flex rounded-full px-2 py-0.5 text-xs font-medium', statusBadgeClass(status))}>
      {status}
    </span>
  )
}

// ---------- Household data model ----------
interface HouseholdMembership {
  clientId: string
  memberType: MemberTypeOption
  startDate: string // ISO yyyy-mm-dd (joined)
  exitDate?: string // ISO yyyy-mm-dd (left)
}

interface Household {
  id: string
  createdAt: string
  members: HouseholdMembership[]
}

const HOUSEHOLDS_STORAGE_KEY = 'hmis-intake-households'
const RECENT_SEARCHES_STORAGE_KEY = 'hmis-intake-recent-searches'

const HOH_RELATIONSHIP_OPTIONS: MemberTypeOption[] = ['Spouse/Partner', 'Child', 'Sibling', 'Parent', 'Other']

function generateHouseholdId(): string {
  return `hh-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function isActiveMembership(m: HouseholdMembership, ref = todayISO()): boolean {
  return !m.exitDate || m.exitDate > ref
}

function getActiveMembers(h: Household, ref = todayISO()): HouseholdMembership[] {
  return h.members.filter((m) => isActiveMembership(m, ref))
}

function getPastMembers(h: Household, ref = todayISO()): HouseholdMembership[] {
  return h.members.filter((m) => !isActiveMembership(m, ref))
}

function getHeadOfHousehold(h: Household, ref = todayISO()): HouseholdMembership | null {
  return getActiveMembers(h, ref).find((m) => m.memberType === 'Head of Household') ?? null
}

function findActiveHouseholdForClient(clientId: string, households: Household[]): Household | null {
  return households.find((h) => h.members.some((m) => m.clientId === clientId && isActiveMembership(m))) ?? null
}

function findPastHouseholdsForClient(clientId: string, households: Household[]): Household[] {
  return households.filter(
    (h) =>
      h.members.some((m) => m.clientId === clientId && !isActiveMembership(m)) &&
      !h.members.some((m) => m.clientId === clientId && isActiveMembership(m))
  )
}

function loadHouseholds(): Household[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(HOUSEHOLDS_STORAGE_KEY)
    if (!raw) {
      const seeded = buildSeedHouseholds()
      window.localStorage.setItem(HOUSEHOLDS_STORAGE_KEY, JSON.stringify(seeded))
      return seeded
    }
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    // Heal legacy data: collapse duplicate active memberships per client per household,
    // keeping the most recently started entry.
    const healed = (parsed as Household[]).map((h) => {
      const seen = new Map<string, HouseholdMembership>()
      const out: HouseholdMembership[] = []
      for (const m of h.members) {
        if (!isActiveMembership(m)) {
          out.push(m)
          continue
        }
        const prev = seen.get(m.clientId)
        if (!prev) {
          seen.set(m.clientId, m)
        } else if ((m.startDate || '') > (prev.startDate || '')) {
          seen.set(m.clientId, m)
        }
      }
      out.push(...seen.values())
      return { ...h, members: out }
    })
    return healed
  } catch {
    return []
  }
}

function saveHouseholds(households: Household[]): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(HOUSEHOLDS_STORAGE_KEY, JSON.stringify(households))
  } catch {
    /* ignore */
  }
}

function buildSeedHouseholds(): Household[] {
  const clients = loadClients()
  if (clients.length < 2) return []
  const hoh = clients[0]
  const partner = clients[1]
  return [
    {
      id: generateHouseholdId(),
      createdAt: hoh.createdAt,
      members: [
        { clientId: hoh.id, memberType: 'Head of Household', startDate: hoh.createdAt },
        { clientId: partner.id, memberType: 'Spouse/Partner', startDate: partner.createdAt },
      ],
    },
  ]
}

// ---------- Recent searches ----------
function loadRecentClientIds(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(RECENT_SEARCHES_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((x) => typeof x === 'string').slice(0, 10)
  } catch {
    return []
  }
}

function recordRecentClient(clientId: string): string[] {
  if (typeof window === 'undefined') return []
  const prev = loadRecentClientIds().filter((id) => id !== clientId)
  const next = [clientId, ...prev].slice(0, 10)
  try {
    window.localStorage.setItem(RECENT_SEARCHES_STORAGE_KEY, JSON.stringify(next))
  } catch {
    /* ignore */
  }
  return next
}

// ---------- Household page (and modals) ----------
type HHModalState =
  | { kind: 'none' }
  | { kind: 'add'; targetClientId: string }
  | { kind: 'join-empty'; targetClientId: string; targetHouseholdId: string }
  | { kind: 'choose-direction'; targetClientId: string; targetHouseholdId: string }
  | { kind: 'leave-and-join'; leaverClientId: string; destinationHouseholdId: string }
  | { kind: 'exit'; clientId: string }
  | { kind: 'reactivate-conflict'; clientName: string }

function HouseholdPage({
  clientId,
  onBackToIntake,
  onOpenClient,
}: {
  clientId: string
  onBackToIntake: () => void
  onOpenClient: (id: string) => void
}) {
  const [clients] = useState<Client[]>(() => loadClients())
  const [households, setHouseholds] = useState<Household[]>(() => loadHouseholds())
  const [recentIds, setRecentIds] = useState<string[]>(() => loadRecentClientIds())
  const [query, setQuery] = useState('')
  const [modal, setModal] = useState<HHModalState>({ kind: 'none' })

  const clientById = (id: string) => clients.find((c) => c.id === id) ?? null
  const currentClient = clientById(clientId)

  const currentHousehold = findActiveHouseholdForClient(clientId, households)
  const currentActiveMembers = currentHousehold ? getActiveMembers(currentHousehold) : []
  const currentPastMembers = currentHousehold ? getPastMembers(currentHousehold) : []

  const previousHouseholds = findPastHouseholdsForClient(clientId, households)
  const previousHouseholdMembers = previousHouseholds.flatMap((h) =>
    h.members
      .filter((m) => m.clientId !== clientId)
      .map((m) => ({ membership: m, household: h }))
  )

  const recentClients = recentIds
    .map((id) => clientById(id))
    .filter((c): c is Client => !!c && c.id !== clientId)

  const q = query.trim().toLowerCase()
  const searchResults = q
    ? clients
        .filter((c) => c.id !== clientId)
        .filter((c) => clientDisplayName(c.profile).toLowerCase().includes(q))
        .slice(0, 25)
    : []

  const startActionForClient = (targetId: string) => {
    const target = clientById(targetId)
    if (!target) return
    const targetHousehold = findActiveHouseholdForClient(targetId, households)
    if (!targetHousehold) {
      setModal({ kind: 'add', targetClientId: targetId })
      return
    }
    if (!currentHousehold) {
      setModal({ kind: 'join-empty', targetClientId: targetId, targetHouseholdId: targetHousehold.id })
    } else if (currentHousehold.id === targetHousehold.id) {
      return
    } else {
      setModal({ kind: 'choose-direction', targetClientId: targetId, targetHouseholdId: targetHousehold.id })
    }
  }

  const handleAdd = (memberType: MemberTypeOption, startDate: string) => {
    if (modal.kind !== 'add') return
    // Bail if target is already an active member anywhere — one household per client
    if (findActiveHouseholdForClient(modal.targetClientId, households)) {
      setModal({ kind: 'none' })
      return
    }
    let nextHouseholds = [...households]
    let hh = findActiveHouseholdForClient(clientId, nextHouseholds)
    if (!hh) {
      hh = {
        id: generateHouseholdId(),
        createdAt: todayISO(),
        members: [{ clientId, memberType: 'Head of Household', startDate: todayISO() }],
      }
      nextHouseholds = [...nextHouseholds, hh]
    }
    const updated: Household = {
      ...hh,
      members: [...hh.members, { clientId: modal.targetClientId, memberType, startDate }],
    }
    nextHouseholds = nextHouseholds.map((x) => (x.id === updated.id ? updated : x))
    saveHouseholds(nextHouseholds)
    setHouseholds(nextHouseholds)
    setModal({ kind: 'none' })
  }

  const handleJoinEmpty = (memberType: MemberTypeOption, startDate: string) => {
    if (modal.kind !== 'join-empty') return
    // Bail if current client already has an active household — one household per client
    if (findActiveHouseholdForClient(clientId, households)) {
      setModal({ kind: 'none' })
      return
    }
    const destHH = households.find((h) => h.id === modal.targetHouseholdId)
    if (!destHH) return
    const updated: Household = {
      ...destHH,
      members: [...destHH.members, { clientId, memberType, startDate }],
    }
    const next = households.map((h) => (h.id === updated.id ? updated : h))
    saveHouseholds(next)
    setHouseholds(next)
    setModal({ kind: 'none' })
  }

  const handleLeaveAndJoin = (params: {
    leaverClientId: string
    destinationHouseholdId: string
    endDate: string
    newHeadClientId: string | null
    newMemberType: MemberTypeOption
    newStartDate: string
  }) => {
    const { leaverClientId, destinationHouseholdId, endDate, newHeadClientId, newMemberType, newStartDate } = params
    const sourceHH = findActiveHouseholdForClient(leaverClientId, households)
    if (!sourceHH) return
    if (sourceHH.id === destinationHouseholdId) {
      // would create an active duplicate in the same household
      setModal({ kind: 'none' })
      return
    }
    const updatedSource: Household = {
      ...sourceHH,
      members: sourceHH.members.map((m) => {
        if (m.clientId === leaverClientId && isActiveMembership(m)) return { ...m, exitDate: endDate }
        if (newHeadClientId && m.clientId === newHeadClientId && isActiveMembership(m))
          return { ...m, memberType: 'Head of Household' as MemberTypeOption }
        return m
      }),
    }
    const destHH = households.find((h) => h.id === destinationHouseholdId)
    if (!destHH) return
    const updatedDest: Household = {
      ...destHH,
      members: [
        ...destHH.members,
        { clientId: leaverClientId, memberType: newMemberType, startDate: newStartDate },
      ],
    }
    const next = households.map((h) =>
      h.id === updatedSource.id ? updatedSource : h.id === updatedDest.id ? updatedDest : h
    )
    saveHouseholds(next)
    setHouseholds(next)
    setModal({ kind: 'none' })
  }

  const handleExit = (params: { clientId: string; exitDate: string; newHeadClientId: string | null }) => {
    const { clientId: exitId, exitDate, newHeadClientId } = params
    const hh = findActiveHouseholdForClient(exitId, households)
    if (!hh) return
    const updated: Household = {
      ...hh,
      members: hh.members.map((m) => {
        if (m.clientId === exitId && isActiveMembership(m)) return { ...m, exitDate }
        if (newHeadClientId && m.clientId === newHeadClientId && isActiveMembership(m))
          return { ...m, memberType: 'Head of Household' as MemberTypeOption }
        return m
      }),
    }
    const next = households.map((h) => (h.id === updated.id ? updated : h))
    saveHouseholds(next)
    setHouseholds(next)
    setModal({ kind: 'none' })
  }

  const handleReactivate = (membership: HouseholdMembership, household: Household) => {
    // Block if the client has ANY active membership — same household or not.
    // (One household per client at a time; reactivating would create a duplicate active row.)
    const conflict = findActiveHouseholdForClient(membership.clientId, households)
    if (conflict) {
      setModal({
        kind: 'reactivate-conflict',
        clientName: clientDisplayName(clientById(membership.clientId)?.profile ?? EMPTY_PROFILE),
      })
      return
    }
    const updated: Household = {
      ...household,
      members: household.members.map((m) =>
        m.clientId === membership.clientId && m.startDate === membership.startDate ? { ...m, exitDate: undefined } : m
      ),
    }
    const next = households.map((h) => (h.id === updated.id ? updated : h))
    saveHouseholds(next)
    setHouseholds(next)
  }

  const remember = (id: string) => setRecentIds(recordRecentClient(id))

  if (!currentClient) {
    return (
      <div className="flex min-h-screen flex-col bg-slate-100">
        <header className="flex h-12 items-center bg-[#3C474E] px-6">
          <span className="text-base font-medium text-white">Demo Agency</span>
        </header>
        <main className="mx-auto w-full max-w-3xl px-6 py-12">
          <p className="text-sm text-slate-700">Client not found.</p>
          <button
            type="button"
            onClick={onBackToIntake}
            className="mt-4 inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Back
          </button>
        </main>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-100">
      <header className="flex h-12 items-center bg-[#3C474E] px-6">
        <span className="text-base font-medium text-white">Demo Agency</span>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 bg-white px-6 py-3 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBackToIntake}
            aria-label="Back to intake"
            className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Intake
          </button>
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-slate-900">Household Management</h1>
            <p className="text-xs text-slate-500">{clientDisplayName(currentClient.profile)}</p>
          </div>
        </div>
      </div>

      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-6">
            <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-4 py-3">
                <h2 className="text-base font-semibold text-slate-800">Search Clients</h2>
              </div>
              <div className="space-y-3 px-4 py-4">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search by name"
                    className="w-full rounded border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm text-slate-900 focus:border-blue-500 focus:outline-none"
                  />
                </div>
                {q && (
                  <SearchResults
                    clients={searchResults}
                    allClients={clients}
                    households={households}
                    currentHouseholdId={currentHousehold?.id}
                    onOpen={(id) => {
                      remember(id)
                      onOpenClient(id)
                    }}
                    onAction={(id) => {
                      remember(id)
                      startActionForClient(id)
                    }}
                  />
                )}
              </div>
            </section>

            <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-4 py-3">
                <h2 className="text-base font-semibold text-slate-800">Household History</h2>
                <p className="mt-0.5 text-xs text-slate-500">Members who previously belonged to this household.</p>
              </div>
              {currentHousehold && currentPastMembers.length > 0 ? (
                <ul className="divide-y divide-slate-200">
                  {currentPastMembers.map((m) => {
                    const c = clientById(m.clientId)
                    return (
                      <li key={`${m.clientId}-${m.startDate}`} className="flex items-center justify-between gap-3 px-4 py-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-900">
                            {c ? clientDisplayName(c.profile) : 'Unknown client'}
                          </p>
                          <p className="text-xs text-slate-500">
                            {m.memberType} · {formatDate(m.startDate)} – {m.exitDate ? formatDate(m.exitDate) : '—'}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleReactivate(m, currentHousehold!)}
                          className="rounded border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                        >
                          Reactivate
                        </button>
                      </li>
                    )
                  })}
                </ul>
              ) : (
                <p className="px-4 py-6 text-sm text-slate-500">No past members.</p>
              )}
            </section>

            <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-4 py-3">
                <h2 className="text-base font-semibold text-slate-800">Previous Household History</h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  Clients who shared a previous household with {clientDisplayName(currentClient.profile)}.
                </p>
              </div>
              {previousHouseholdMembers.length > 0 ? (
                <ul className="divide-y divide-slate-200">
                  {previousHouseholdMembers.map(({ membership, household }) => {
                    const c = clientById(membership.clientId)
                    return (
                      <li
                        key={`${household.id}-${membership.clientId}-${membership.startDate}`}
                        className="flex items-center justify-between gap-3 px-4 py-3"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-900">
                            {c ? clientDisplayName(c.profile) : 'Unknown client'}
                          </p>
                          <p className="text-xs text-slate-500">
                            {membership.memberType} · {formatDate(membership.startDate)} –{' '}
                            {membership.exitDate ? formatDate(membership.exitDate) : 'present'}
                          </p>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              ) : (
                <p className="px-4 py-6 text-sm text-slate-500">No prior households on record.</p>
              )}
            </section>
          </div>

          <aside className="space-y-6">
            <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-4 py-3">
                <h3 className="text-sm font-semibold text-slate-800">Current Household Members</h3>
              </div>
              {currentHousehold && currentActiveMembers.length > 0 ? (
                <ul className="divide-y divide-slate-200">
                  {currentActiveMembers.map((m) => {
                    const c = clientById(m.clientId)
                    return (
                      <li key={m.clientId} className="flex items-center justify-between gap-2 px-4 py-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-900">
                            {c ? clientDisplayName(c.profile) : 'Unknown'}
                          </p>
                          <p className="text-xs text-slate-500">{m.memberType} · since {formatDate(m.startDate)}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setModal({ kind: 'exit', clientId: m.clientId })}
                          aria-label="Edit membership"
                          className="inline-flex items-center gap-1 rounded border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                        >
                          <Pencil className="h-3 w-3" />
                          Edit
                        </button>
                      </li>
                    )
                  })}
                </ul>
              ) : (
                <p className="px-4 py-6 text-sm text-slate-500">No current household. Search to add a member.</p>
              )}
            </section>

            <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-4 py-3">
                <h3 className="text-sm font-semibold text-slate-800">Your Recent Client Searches</h3>
              </div>
              {recentClients.length > 0 ? (
                <ul className="divide-y divide-slate-200">
                  {recentClients.map((c) => (
                    <RecentClientRow
                      key={c.id}
                      client={c}
                      households={households}
                      currentHouseholdId={currentHousehold?.id}
                      onOpen={() => {
                        remember(c.id)
                        onOpenClient(c.id)
                      }}
                      onAction={() => {
                        remember(c.id)
                        startActionForClient(c.id)
                      }}
                    />
                  ))}
                </ul>
              ) : (
                <p className="px-4 py-6 text-xs text-slate-500">No recent searches yet.</p>
              )}
            </section>
          </aside>
        </div>
      </main>

      {modal.kind === 'add' && (
        <AddToHouseholdModal
          targetName={clientDisplayName(clientById(modal.targetClientId)?.profile ?? EMPTY_PROFILE)}
          currentName={clientDisplayName(currentClient.profile)}
          willCreate={!currentHousehold}
          onClose={() => setModal({ kind: 'none' })}
          onSave={handleAdd}
        />
      )}
      {modal.kind === 'join-empty' && (
        <JoinHouseholdModal
          currentName={clientDisplayName(currentClient.profile)}
          targetName={clientDisplayName(clientById(modal.targetClientId)?.profile ?? EMPTY_PROFILE)}
          onClose={() => setModal({ kind: 'none' })}
          onSave={handleJoinEmpty}
        />
      )}
      {modal.kind === 'choose-direction' && (
        <ChooseDirectionModal
          currentName={clientDisplayName(currentClient.profile)}
          targetName={clientDisplayName(clientById(modal.targetClientId)?.profile ?? EMPTY_PROFILE)}
          onClose={() => setModal({ kind: 'none' })}
          onChooseA={() =>
            setModal({ kind: 'leave-and-join', leaverClientId: clientId, destinationHouseholdId: modal.targetHouseholdId })
          }
          onChooseB={() => {
            const ch = findActiveHouseholdForClient(clientId, households)
            if (!ch) return
            setModal({ kind: 'leave-and-join', leaverClientId: modal.targetClientId, destinationHouseholdId: ch.id })
          }}
        />
      )}
      {modal.kind === 'leave-and-join' && (
        <LeaveAndJoinModal
          leaverName={clientDisplayName(clientById(modal.leaverClientId)?.profile ?? EMPTY_PROFILE)}
          leaverClientId={modal.leaverClientId}
          destinationHouseholdId={modal.destinationHouseholdId}
          households={households}
          clients={clients}
          onClose={() => setModal({ kind: 'none' })}
          onSave={handleLeaveAndJoin}
        />
      )}
      {modal.kind === 'exit' && (
        <ExitMembershipModal
          clientName={clientDisplayName(clientById(modal.clientId)?.profile ?? EMPTY_PROFILE)}
          clientId={modal.clientId}
          households={households}
          clients={clients}
          onClose={() => setModal({ kind: 'none' })}
          onSave={handleExit}
        />
      )}
      {modal.kind === 'reactivate-conflict' && (
        <ReactivateConflictModal clientName={modal.clientName} onClose={() => setModal({ kind: 'none' })} />
      )}
    </div>
  )
}

// ---------- Household sub-components ----------
function HouseholdContextLabel({
  households,
  clients,
  clientId,
}: {
  households: Household[]
  clients: Client[]
  clientId: string
}) {
  const hh = findActiveHouseholdForClient(clientId, households)
  if (!hh) return <span className="text-xs text-slate-400">No household</span>
  const hohMembership = getHeadOfHousehold(hh)
  const hoh = hohMembership ? clients.find((c) => c.id === hohMembership.clientId) : null
  const memberCount = getActiveMembers(hh).length
  return (
    <span className="text-xs text-slate-500">
      {hoh ? `HoH: ${clientDisplayName(hoh.profile)}` : 'No HoH'} · {memberCount} member{memberCount === 1 ? '' : 's'}
    </span>
  )
}

function ActionIcon({ kind, onClick }: { kind: 'add' | 'join'; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      aria-label={kind === 'add' ? 'Add to household' : 'Join household'}
      title={kind === 'add' ? 'Add to household' : 'Join household'}
      className={cn(
        'inline-flex items-center gap-1 rounded border px-2 py-1 text-xs font-medium opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100',
        kind === 'add'
          ? 'border-blue-200 bg-white text-blue-700 hover:bg-blue-50'
          : 'border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-50'
      )}
    >
      {kind === 'add' ? <Plus className="h-3 w-3" /> : <Users className="h-3 w-3" />}
      {kind === 'add' ? 'Add' : 'Join'}
    </button>
  )
}

function SearchResults({
  clients,
  allClients,
  households,
  currentHouseholdId,
  onOpen,
  onAction,
}: {
  clients: Client[]
  allClients: Client[]
  households: Household[]
  currentHouseholdId?: string
  onOpen: (id: string) => void
  onAction: (id: string) => void
}) {
  if (clients.length === 0) {
    return <p className="px-2 py-3 text-sm text-slate-500">No matches.</p>
  }
  return (
    <ul className="divide-y divide-slate-200 rounded border border-slate-200">
      {clients.map((c) => {
        const hh = findActiveHouseholdForClient(c.id, households)
        const inCurrent = !!hh && hh.id === currentHouseholdId
        const status = deriveClientStatus(c.profile)
        return (
          <li
            key={c.id}
            className="group flex items-center justify-between gap-3 bg-white px-4 py-2.5 hover:bg-slate-50"
          >
            <button type="button" onClick={() => onOpen(c.id)} className="flex min-w-0 flex-1 flex-col text-left">
              <span className="flex items-center gap-2">
                <span className="truncate text-sm font-medium text-slate-900">{clientDisplayName(c.profile)}</span>
                <StatusBadge status={status} />
              </span>
              <HouseholdContextLabel households={households} clients={allClients} clientId={c.id} />
            </button>
            {inCurrent ? (
              <span className="text-xs font-medium text-slate-400">In household</span>
            ) : (
              <ActionIcon kind={hh ? 'join' : 'add'} onClick={() => onAction(c.id)} />
            )}
          </li>
        )
      })}
    </ul>
  )
}

function RecentClientRow({
  client,
  households,
  currentHouseholdId,
  onOpen,
  onAction,
}: {
  client: Client
  households: Household[]
  currentHouseholdId?: string
  onOpen: () => void
  onAction: () => void
}) {
  const hh = findActiveHouseholdForClient(client.id, households)
  const inCurrent = !!hh && hh.id === currentHouseholdId
  return (
    <li className="group flex items-center justify-between gap-2 px-4 py-2.5 hover:bg-slate-50">
      <button type="button" onClick={onOpen} className="flex min-w-0 flex-1 flex-col text-left">
        <span className="truncate text-sm font-medium text-slate-900">{clientDisplayName(client.profile)}</span>
        <span className="text-xs text-slate-500">{inCurrent ? 'In this household' : hh ? 'In a household' : 'No household'}</span>
      </button>
      {inCurrent ? (
        <span className="text-xs font-medium text-slate-400">In household</span>
      ) : (
        <ActionIcon kind={hh ? 'join' : 'add'} onClick={onAction} />
      )}
    </li>
  )
}

// ---------- Household modals ----------
function ModalShell({
  title,
  onClose,
  children,
  footer,
}: {
  title: string
  onClose: () => void
  children: React.ReactNode
  footer: React.ReactNode
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="w-full max-w-lg rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
          <h2 className="text-base font-semibold text-slate-800">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-4 px-5 py-4">{children}</div>
        <div className="flex items-center justify-end gap-2 border-t border-slate-200 bg-slate-50 px-5 py-3">
          {footer}
        </div>
      </div>
    </div>
  )
}

function RelationshipSelect({
  value,
  onChange,
}: {
  value: MemberTypeOption | ''
  onChange: (v: MemberTypeOption | '') => void
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as MemberTypeOption | '')}
      className="w-full rounded border border-slate-200 bg-slate-50 py-2 pl-3 pr-8 text-sm text-slate-900 focus:border-blue-500 focus:outline-none"
    >
      <option value="">Select relationship</option>
      {HOH_RELATIONSHIP_OPTIONS.map((o) => (
        <option key={o} value={o}>{o}</option>
      ))}
    </select>
  )
}

function AddToHouseholdModal({
  targetName,
  currentName,
  willCreate,
  onClose,
  onSave,
}: {
  targetName: string
  currentName: string
  willCreate: boolean
  onClose: () => void
  onSave: (memberType: MemberTypeOption, startDate: string) => void
}) {
  const [memberType, setMemberType] = useState<MemberTypeOption | ''>('')
  const [startDate, setStartDate] = useState<string>(todayISO())
  const canSave = !!memberType && !!startDate
  return (
    <ModalShell
      title="Add to Household"
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            Cancel
          </button>
          <button
            type="button"
            disabled={!canSave}
            onClick={() => canSave && onSave(memberType as MemberTypeOption, startDate)}
            className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
          >
            Save
          </button>
        </>
      }
    >
      <p className="text-sm text-slate-600">
        Add <strong>{targetName}</strong> to <strong>{currentName}</strong>'s household
        {willCreate ? ` (a new household will be created with ${currentName} as Head of Household).` : '.'}
      </p>
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-800">Member Type</label>
        <RelationshipSelect value={memberType} onChange={setMemberType} />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-800">Start Date</label>
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="w-full border-0 border-b border-slate-300 bg-transparent px-0 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none"
        />
      </div>
    </ModalShell>
  )
}

function JoinHouseholdModal({
  currentName,
  targetName,
  onClose,
  onSave,
}: {
  currentName: string
  targetName: string
  onClose: () => void
  onSave: (memberType: MemberTypeOption, startDate: string) => void
}) {
  const [memberType, setMemberType] = useState<MemberTypeOption | ''>('')
  const [startDate, setStartDate] = useState<string>(todayISO())
  const canSave = !!memberType && !!startDate
  return (
    <ModalShell
      title="Join Household"
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            Cancel
          </button>
          <button
            type="button"
            disabled={!canSave}
            onClick={() => canSave && onSave(memberType as MemberTypeOption, startDate)}
            className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
          >
            Save
          </button>
        </>
      }
    >
      <p className="text-sm text-slate-600">
        <strong>{currentName}</strong> will join <strong>{targetName}</strong>'s household.
      </p>
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-800">{currentName}'s relationship to Head of Household</label>
        <RelationshipSelect value={memberType} onChange={setMemberType} />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-800">Start Date</label>
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="w-full border-0 border-b border-slate-300 bg-transparent px-0 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none"
        />
      </div>
    </ModalShell>
  )
}

function ChooseDirectionModal({
  currentName,
  targetName,
  onClose,
  onChooseA,
  onChooseB,
}: {
  currentName: string
  targetName: string
  onClose: () => void
  onChooseA: () => void
  onChooseB: () => void
}) {
  return (
    <ModalShell
      title="Both clients are in households"
      onClose={onClose}
      footer={
        <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
          Cancel
        </button>
      }
    >
      <p className="text-sm text-slate-600">Choose which client leaves their household.</p>
      <button
        type="button"
        onClick={onChooseA}
        className="block w-full rounded border border-slate-200 bg-white p-3 text-left text-sm hover:border-blue-300 hover:bg-blue-50"
      >
        <p className="font-medium text-slate-900">{currentName} leaves their household</p>
        <p className="text-xs text-slate-500">{currentName} joins {targetName}'s household.</p>
      </button>
      <button
        type="button"
        onClick={onChooseB}
        className="block w-full rounded border border-slate-200 bg-white p-3 text-left text-sm hover:border-blue-300 hover:bg-blue-50"
      >
        <p className="font-medium text-slate-900">{targetName} leaves their household</p>
        <p className="text-xs text-slate-500">{targetName} joins {currentName}'s household.</p>
      </button>
    </ModalShell>
  )
}

function LeaveAndJoinModal({
  leaverName,
  leaverClientId,
  destinationHouseholdId,
  households,
  clients,
  onClose,
  onSave,
}: {
  leaverName: string
  leaverClientId: string
  destinationHouseholdId: string
  households: Household[]
  clients: Client[]
  onClose: () => void
  onSave: (params: {
    leaverClientId: string
    destinationHouseholdId: string
    endDate: string
    newHeadClientId: string | null
    newMemberType: MemberTypeOption
    newStartDate: string
  }) => void
}) {
  const sourceHH = findActiveHouseholdForClient(leaverClientId, households)
  const leaverMembership = sourceHH?.members.find((m) => m.clientId === leaverClientId && isActiveMembership(m))
  const leaverIsHoH = leaverMembership?.memberType === 'Head of Household'
  const otherActive = sourceHH ? getActiveMembers(sourceHH).filter((m) => m.clientId !== leaverClientId) : []

  const [endDate, setEndDate] = useState<string>(todayISO())
  const [newHeadClientId, setNewHeadClientId] = useState<string>('')
  const [memberType, setMemberType] = useState<MemberTypeOption | ''>('')
  const [startDate, setStartDate] = useState<string>(todayISO())

  const endDateError =
    leaverMembership && endDate && endDate < leaverMembership.startDate
      ? 'End date cannot be earlier than the join date.'
      : ''
  const needsNewHead = !!leaverIsHoH && otherActive.length > 0
  const canSave =
    !!endDate && !endDateError && !!memberType && !!startDate && (!needsNewHead || !!newHeadClientId)

  return (
    <ModalShell
      title="Transfer to another household"
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            Cancel
          </button>
          <button
            type="button"
            disabled={!canSave}
            onClick={() =>
              canSave &&
              onSave({
                leaverClientId,
                destinationHouseholdId,
                endDate,
                newHeadClientId: needsNewHead ? newHeadClientId : null,
                newMemberType: memberType as MemberTypeOption,
                newStartDate: startDate,
              })
            }
            className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
          >
            Save
          </button>
        </>
      }
    >
      <div className="rounded border border-slate-200 bg-slate-50 px-3 py-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Leaving household</p>
        <p className="mt-1 text-sm text-slate-800">{leaverName}</p>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-800">End Date</label>
        <input
          type="date"
          value={endDate}
          min={leaverMembership?.startDate}
          onChange={(e) => setEndDate(e.target.value)}
          className="w-full border-0 border-b border-slate-300 bg-transparent px-0 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none"
        />
        {endDateError && <p className="mt-1 text-xs text-red-600">{endDateError}</p>}
      </div>

      {needsNewHead && (
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-800">New Head of Household</label>
          <select
            value={newHeadClientId}
            onChange={(e) => setNewHeadClientId(e.target.value)}
            className="w-full rounded border border-slate-200 bg-slate-50 py-2 pl-3 pr-8 text-sm text-slate-900 focus:border-blue-500 focus:outline-none"
          >
            <option value="">Select new Head</option>
            {otherActive.map((m) => {
              const c = clients.find((x) => x.id === m.clientId)
              return (
                <option key={m.clientId} value={m.clientId}>
                  {c ? clientDisplayName(c.profile) : m.clientId}
                </option>
              )
            })}
          </select>
        </div>
      )}

      <div className="rounded border border-slate-200 bg-slate-50 px-3 py-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Joining household</p>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-800">Member Type</label>
        <RelationshipSelect value={memberType} onChange={setMemberType} />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-800">Start Date</label>
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="w-full border-0 border-b border-slate-300 bg-transparent px-0 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none"
        />
      </div>
    </ModalShell>
  )
}

function ExitMembershipModal({
  clientName,
  clientId,
  households,
  clients,
  onClose,
  onSave,
}: {
  clientName: string
  clientId: string
  households: Household[]
  clients: Client[]
  onClose: () => void
  onSave: (params: { clientId: string; exitDate: string; newHeadClientId: string | null }) => void
}) {
  const hh = findActiveHouseholdForClient(clientId, households)
  const membership = hh?.members.find((m) => m.clientId === clientId && isActiveMembership(m))
  const isHoH = membership?.memberType === 'Head of Household'
  const otherActive = hh ? getActiveMembers(hh).filter((m) => m.clientId !== clientId) : []

  const [exited, setExited] = useState<boolean>(false)
  const [exitDate, setExitDate] = useState<string>(todayISO())
  const [newHeadClientId, setNewHeadClientId] = useState<string>('')

  const dateError =
    exited && membership && exitDate && exitDate < membership.startDate
      ? 'Exit date cannot be earlier than join date.'
      : ''
  const needsNewHead = exited && !!isHoH && otherActive.length > 0
  const canSave = !exited ? true : !!exitDate && !dateError && (!needsNewHead || !!newHeadClientId)

  return (
    <ModalShell
      title="Exit Global Household"
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            Cancel
          </button>
          <button
            type="button"
            disabled={!exited || !canSave}
            onClick={() =>
              exited &&
              canSave &&
              onSave({
                clientId,
                exitDate,
                newHeadClientId: needsNewHead ? newHeadClientId : null,
              })
            }
            className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
          >
            Save
          </button>
        </>
      }
    >
      <p className="text-sm text-slate-600">
        Member: <strong>{clientName}</strong>
      </p>
      <label className="flex items-center gap-3">
        <input
          type="checkbox"
          checked={exited}
          onChange={(e) => setExited(e.target.checked)}
          className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
        />
        <span className="text-sm font-medium text-slate-800">Exited Household</span>
      </label>

      {exited && (
        <>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-800">Exit Date</label>
            <input
              type="date"
              value={exitDate}
              min={membership?.startDate}
              onChange={(e) => setExitDate(e.target.value)}
              className="w-full border-0 border-b border-slate-300 bg-transparent px-0 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none"
            />
            {dateError && <p className="mt-1 text-xs text-red-600">{dateError}</p>}
          </div>
          {needsNewHead && (
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-800">New Head of Household</label>
              <select
                value={newHeadClientId}
                onChange={(e) => setNewHeadClientId(e.target.value)}
                className="w-full rounded border border-slate-200 bg-slate-50 py-2 pl-3 pr-8 text-sm text-slate-900 focus:border-blue-500 focus:outline-none"
              >
                <option value="">Select new Head</option>
                {otherActive.map((m) => {
                  const c = clients.find((x) => x.id === m.clientId)
                  return (
                    <option key={m.clientId} value={m.clientId}>
                      {c ? clientDisplayName(c.profile) : m.clientId}
                    </option>
                  )
                })}
              </select>
            </div>
          )}
          {isHoH && otherActive.length === 0 && (
            <p className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              This is the only active member. The household will be left without a Head of Household.
            </p>
          )}
        </>
      )}
    </ModalShell>
  )
}

function ReactivateConflictModal({ clientName, onClose }: { clientName: string; onClose: () => void }) {
  return (
    <ModalShell
      title="Cannot reactivate"
      onClose={onClose}
      footer={
        <button type="button" onClick={onClose} className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700">
          OK
        </button>
      }
    >
      <p className="text-sm text-slate-700">
        <strong>{clientName}</strong> is currently a member of another household and cannot be reactivated here. End that membership first.
      </p>
    </ModalShell>
  )
}

// ---------- Clients list page ----------
function ClientsListPage({ onOpenClient, onNewClient }: { onOpenClient: (id: string) => void; onNewClient: () => void }) {
  const [clients, setClients] = useState<Client[]>(() => loadClients())
  const [query, setQuery] = useState('')
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false)

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === CLIENTS_STORAGE_KEY) setClients(loadClients())
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const handleDeleteAll = () => {
    deleteAllClients()
    setClients([])
    setQuery('')
    setConfirmDeleteAll(false)
  }

  const totals = clients.reduce(
    (acc, c) => {
      const s = deriveClientStatus(c.profile)
      acc.total++
      acc[s]++
      return acc
    },
    { total: 0, Draft: 0, Active: 0, Complete: 0 } as { total: number; Draft: number; Active: number; Complete: number }
  )

  const q = query.trim().toLowerCase()
  const filtered = q
    ? clients.filter((c) => clientDisplayName(c.profile).toLowerCase().includes(q))
    : clients

  const sorted = [...filtered].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))

  return (
    <div className="flex min-h-screen flex-col bg-slate-100">
      <header className="flex h-12 items-center bg-[#3C474E] px-6">
        <span className="text-base font-medium text-white">Demo Agency</span>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 bg-white px-6 py-3 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
            <Users className="h-5 w-5" />
          </div>
          <h1 className="text-lg font-semibold text-slate-900">Clients</h1>
        </div>
        <div className="flex items-center gap-2">
          {clients.length > 0 && (
            <button
              type="button"
              onClick={() => setConfirmDeleteAll(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4" />
              Delete All
            </button>
          )}
          <button
            type="button"
            onClick={onNewClient}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            New Client
          </button>
        </div>
      </div>

      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: 'Total', value: totals.total, tone: 'text-slate-900' },
            { label: 'Active', value: totals.Active, tone: 'text-amber-700' },
            { label: 'Draft', value: totals.Draft, tone: 'text-slate-700' },
            { label: 'Complete', value: totals.Complete, tone: 'text-emerald-700' },
          ].map((s) => (
            <div key={s.label} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500">{s.label}</p>
              <p className={cn('mt-1 text-2xl font-semibold', s.tone)}>{s.value}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-4 py-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search clients by name"
                className="w-full max-w-md rounded border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm text-slate-900 focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {sorted.length === 0 ? (
            <p className="px-4 py-12 text-center text-sm text-slate-500">
              {clients.length === 0 ? 'No clients yet. Click New Client to get started.' : 'No clients match your search.'}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs font-medium uppercase tracking-wider text-slate-500">
                  <tr>
                    <th scope="col" className="px-4 py-3">Client</th>
                    <th scope="col" className="px-4 py-3">Status</th>
                    <th scope="col" className="px-4 py-3">Created</th>
                    <th scope="col" className="px-4 py-3">Case manager</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {sorted.map((c) => {
                    const status = deriveClientStatus(c.profile)
                    return (
                      <tr
                        key={c.id}
                        onClick={() => onOpenClient(c.id)}
                        className="cursor-pointer hover:bg-slate-50"
                      >
                        <td className="px-4 py-3 font-medium text-slate-900">{clientDisplayName(c.profile)}</td>
                        <td className="px-4 py-3"><StatusBadge status={status} /></td>
                        <td className="px-4 py-3 text-slate-600">{formatDate(c.createdAt)}</td>
                        <td className="px-4 py-3 text-slate-600">{c.caseManager || 'Unassigned'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {confirmDeleteAll && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-red-100 text-red-600">
                <Trash2 className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h2 className="text-base font-semibold text-slate-900">Delete all profiles?</h2>
                <p className="mt-1 text-sm text-slate-600">
                  This permanently deletes all {clients.length} client {clients.length === 1 ? 'profile' : 'profiles'} along with their
                  household and recent-search data. This cannot be undone.
                </p>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmDeleteAll(false)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteAll}
                className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700"
              >
                <Trash2 className="h-4 w-4" />
                Delete All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ---------- Main App ----------
function IntakeForm({ clientId, onBack }: { clientId: string; onBack: () => void }) {
  const initialClient = (() => {
    const all = loadClients()
    return all.find((c) => c.id === clientId) ?? null
  })()
  const [clientProfile, setClientProfile] = useState<ClientProfile>(
    () => initialClient?.profile ?? { ...EMPTY_PROFILE }
  )
  const [profileStatus, setProfileStatus] = useState<ProfileStatus>('Draft')
  const [jsonPreviewOpen, setJsonPreviewOpen] = useState(false)
  const [saved, setSaved] = useState(false)
  const [currentSectionId, setCurrentSectionId] = useState('profile')
  const [memberModalOpen, setMemberModalOpen] = useState(false)
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null)
  const caseManagerRef = useRef<string>(initialClient?.caseManager ?? 'Unassigned')
  const createdAtRef = useRef<string>(initialClient?.createdAt ?? todayISO())

  const update = useCallback(<K extends keyof ClientProfile>(key: K, value: ClientProfile[K]) => {
    setClientProfile((prev) => ({ ...prev, [key]: value }))
  }, [])

  // Race/Ethnicity multi-select with mutual-exclusivity for codes 8/9/99.
  const toggleRaceEthnicity = useCallback((code: string) => {
    setClientProfile((prev) => {
      const has = prev.raceEthnicity.includes(code)
      let next: string[]
      if (RACE_EXCLUSIVE_CODES.has(code)) {
        next = has ? [] : [code]
      } else {
        const base = prev.raceEthnicity.filter((c) => !RACE_EXCLUSIVE_CODES.has(c))
        next = has ? base.filter((c) => c !== code) : [...base, code]
      }
      return { ...prev, raceEthnicity: next }
    })
  }, [])

  // ----- Nested record updaters -----
  const updateIncomeField = useCallback((field: 'informationDate' | 'fromAnySource' | 'otherName', value: string) => {
    setClientProfile((prev) => ({ ...prev, income: { ...prev.income, [field]: value } }))
  }, [])
  const updateIncomeSource = useCallback((key: string, part: 'has' | 'amount', value: string) => {
    setClientProfile((prev) => ({
      ...prev,
      income: { ...prev.income, sources: { ...prev.income.sources, [key]: { ...prev.income.sources[key], [part]: value } } },
    }))
  }, [])
  const updateNonCashField = useCallback((field: 'informationDate' | 'fromAnySource' | 'otherSource', value: string) => {
    setClientProfile((prev) => ({ ...prev, nonCash: { ...prev.nonCash, [field]: value } }))
  }, [])
  const updateNonCashFlag = useCallback((key: string, value: string) => {
    setClientProfile((prev) => ({ ...prev, nonCash: { ...prev.nonCash, flags: { ...prev.nonCash.flags, [key]: value } } }))
  }, [])
  const updateInsuranceField = useCallback((field: 'informationDate' | 'covered' | 'otherSource' | 'noInsuranceReason', value: string) => {
    setClientProfile((prev) => ({ ...prev, insurance: { ...prev.insurance, [field]: value } }))
  }, [])
  const updateInsuranceFlag = useCallback((key: string, value: string) => {
    setClientProfile((prev) => ({ ...prev, insurance: { ...prev.insurance, flags: { ...prev.insurance.flags, [key]: value } } }))
  }, [])

  // ----- Repeatable list handlers (bed nights, CE events, CE assessments) -----
  const addBedNight = useCallback(() => {
    setClientProfile((prev) => ({ ...prev, bedNightDates: [...prev.bedNightDates, todayISO()] }))
  }, [])
  const updateBedNight = useCallback((index: number, value: string) => {
    setClientProfile((prev) => ({ ...prev, bedNightDates: prev.bedNightDates.map((d, i) => (i === index ? value : d)) }))
  }, [])
  const removeBedNight = useCallback((index: number) => {
    setClientProfile((prev) => ({ ...prev, bedNightDates: prev.bedNightDates.filter((_, i) => i !== index) }))
  }, [])

  const addCEEvent = useCallback(() => {
    setClientProfile((prev) => ({
      ...prev,
      ceEvents: [
        ...prev.ceEvents,
        { id: generateSubId('ce'), eventDate: todayISO(), eventType: '', diversionResult: '', aftercareResult: '', referralProjectId: '', referralResult: '', referralResultDate: '' },
      ],
    }))
  }, [])
  const updateCEEvent = useCallback((id: string, field: keyof CEEvent, value: string) => {
    setClientProfile((prev) => ({ ...prev, ceEvents: prev.ceEvents.map((e) => (e.id === id ? { ...e, [field]: value } : e)) }))
  }, [])
  const removeCEEvent = useCallback((id: string) => {
    setClientProfile((prev) => ({ ...prev, ceEvents: prev.ceEvents.filter((e) => e.id !== id) }))
  }, [])

  const addCEAssessment = useCallback(() => {
    setClientProfile((prev) => ({
      ...prev,
      ceAssessments: [
        ...prev.ceAssessments,
        { id: generateSubId('cea'), assessmentDate: todayISO(), assessmentLocation: '', assessmentType: '', assessmentLevel: '', prioritizationStatus: '', notes: '' },
      ],
    }))
  }, [])
  const updateCEAssessment = useCallback((id: string, field: keyof CEAssessment, value: string) => {
    setClientProfile((prev) => ({ ...prev, ceAssessments: prev.ceAssessments.map((a) => (a.id === id ? { ...a, [field]: value } : a)) }))
  }, [])
  const removeCEAssessment = useCallback((id: string) => {
    setClientProfile((prev) => ({ ...prev, ceAssessments: prev.ceAssessments.filter((a) => a.id !== id) }))
  }, [])

  const openAddMember = useCallback(() => {
    setEditingMemberId(null)
    setMemberModalOpen(true)
  }, [])

  const openEditMember = useCallback((id: string) => {
    setEditingMemberId(id)
    setMemberModalOpen(true)
  }, [])

  const closeMemberModal = useCallback(() => {
    setMemberModalOpen(false)
    setEditingMemberId(null)
  }, [])

  const saveMember = useCallback((member: HouseholdMember) => {
    setClientProfile((prev) => {
      const exists = prev.householdMembers.some((m) => m.id === member.id)
      const householdMembers = exists
        ? prev.householdMembers.map((m) => (m.id === member.id ? member : m))
        : [...prev.householdMembers, member]
      return { ...prev, householdMembers }
    })
    setMemberModalOpen(false)
    setEditingMemberId(null)
  }, [])

  const removeMember = useCallback((id: string) => {
    setClientProfile((prev) => ({
      ...prev,
      householdMembers: prev.householdMembers.filter((m) => m.id !== id),
    }))
  }, [])

  const handleSave = useCallback(() => {
    const hasErrors = validateProfile(clientProfile).length > 0
    upsertClient({
      id: clientId,
      createdAt: createdAtRef.current,
      caseManager: caseManagerRef.current,
      profile: clientProfile,
    })
    if (!hasErrors) setProfileStatus('Complete')
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }, [clientProfile, clientId])

  const handleReset = useCallback(() => {
    setClientProfile({ ...EMPTY_PROFILE })
    setProfileStatus('Draft')
  }, [])

  const handleLoadDemo = useCallback(() => {
    setClientProfile({ ...DEMO_PROFILE })
    setProfileStatus('Draft')
  }, [])

  const errors = validateProfile(clientProfile)

  const totalMonthlyIncome = INCOME_SOURCES.reduce((sum, s) => {
    const src = clientProfile.income.sources[s.key]
    return sum + (src?.has === '1' ? parseFloat(src.amount) || 0 : 0)
  }, 0)

  // SSN as three parts for display/edit
  const ssnParts = (() => {
    const cleaned = (clientProfile.ssn || '').replace(/\D/g, '')
    return [cleaned.slice(0, 3), cleaned.slice(3, 5), cleaned.slice(5, 9)]
  })()
  const setSsnParts = (p1: string, p2: string, p3: string) => {
    const joined = [p1, p2, p3].map((p) => p.replace(/\D/g, '')).join('')
    update('ssn', joined)
  }

  const inputBase = 'w-full border-0 border-b border-slate-300 bg-transparent px-0 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-0'
  const selectBase = 'w-full rounded border border-slate-200 bg-slate-50 py-2 pl-3 pr-8 text-sm text-slate-900 focus:border-blue-500 focus:outline-none'

  return (
    <div className="flex min-h-screen flex-col bg-slate-100">
      {/* App header - dark bar */}
      <header className="flex h-12 items-center bg-[#3C474E] px-6">
        <span className="text-base font-medium text-white">Demo Agency</span>
      </header>
      <ProfileHeader profile={clientProfile} status={profileStatus} onSave={handleSave} onReset={handleReset} onLoadDemo={handleLoadDemo} onBack={onBack} validationErrors={errors} />
      {saved && <div className="bg-emerald-600 px-6 py-2 text-center text-sm font-medium text-white">Profile saved.</div>}

      <div className="flex flex-1">
        <aside className="hidden shrink-0 lg:block">
          <StickySectionNav sections={TOP_NAV} currentSectionId={currentSectionId} onSectionChange={setCurrentSectionId} />
        </aside>

        <main className="min-w-0 flex-1 bg-white">  
          <form onSubmit={(e) => e.preventDefault()}>
          <div className="flex gap-6 px-6 py-8">
          <div className="mx-auto w-full max-w-3xl space-y-6">
            {currentSectionId === 'profile' && (
            <>
            {/* 1. Client Name */}
            <SectionCard id="client_name" title="Client Name">
              <FormField label="First Name">
                <input type="text" value={clientProfile.firstName} onChange={(e) => update('firstName', e.target.value)} className={inputBase} placeholder="First name" />
              </FormField>
              <FormField label="Middle Name">
                <input type="text" value={clientProfile.middleName} onChange={(e) => update('middleName', e.target.value)} className={inputBase} placeholder="Middle name or initial" />
              </FormField>
              <FormField label="Last Name">
                <input type="text" value={clientProfile.lastName} onChange={(e) => update('lastName', e.target.value)} className={inputBase} placeholder="Last name" />
              </FormField>
              <FormField label="Suffix">
                <input type="text" value={clientProfile.suffix} onChange={(e) => update('suffix', e.target.value)} className={cn(inputBase, 'max-w-xs')} placeholder="e.g. Jr., Sr., III" />
              </FormField>
              <FormField label="Name Data Quality" required error={!clientProfile.nameDataQuality ? 'Required' : undefined}>
                <CodeSelect ariaLabel="Name Data Quality" value={clientProfile.nameDataQuality} onChange={(v) => update('nameDataQuality', v as DataQualityCode | '')} options={NAME_DQ_OPTIONS} className={selectBase} />
              </FormField>
            </SectionCard>

            {/* 2. Social Security Number */}
            <SectionCard id="ssn" title="Social Security Number">
              <FormField label="Social Security Number">
                <div className="flex items-center gap-1">
                  <input type="text" inputMode="numeric" maxLength={3} value={ssnParts[0]} onChange={(e) => setSsnParts(e.target.value, ssnParts[1], ssnParts[2])} className={cn(inputBase, 'w-16 text-center')} placeholder="000" />
                  <span className="text-slate-400">-</span>
                  <input type="text" inputMode="numeric" maxLength={2} value={ssnParts[1]} onChange={(e) => setSsnParts(ssnParts[0], e.target.value, ssnParts[2])} className={cn(inputBase, 'w-12 text-center')} placeholder="00" />
                  <span className="text-slate-400">-</span>
                  <input type="text" inputMode="numeric" maxLength={4} value={ssnParts[2]} onChange={(e) => setSsnParts(ssnParts[0], ssnParts[1], e.target.value)} className={cn(inputBase, 'w-20 text-center')} placeholder="0000" />
                </div>
              </FormField>
              <FormField label="SSN Data Quality">
                <CodeSelect ariaLabel="SSN Data Quality" value={clientProfile.ssnDataQuality} onChange={(v) => update('ssnDataQuality', v as DataQualityCode | '')} options={SSN_DQ_OPTIONS} className={selectBase} />
              </FormField>
            </SectionCard>

            {/* 3. Date of Birth */}
            <SectionCard id="date_of_birth" title="Date of Birth">
              <FormField label="Date of Birth">
                <input type="date" value={clientProfile.dob} onChange={(e) => update('dob', e.target.value)} className={cn(inputBase, 'max-w-xs')} />
              </FormField>
              <FormField label="DOB Data Quality" required error={!clientProfile.dobDataQuality ? 'Required' : clientProfile.dob && ['8', '9', '99'].includes(clientProfile.dobDataQuality) ? 'Not valid with a date entered' : undefined}>
                <CodeSelect ariaLabel="Date of Birth Data Quality" value={clientProfile.dobDataQuality} onChange={(v) => update('dobDataQuality', v as DataQualityCode | '')} options={DOB_DQ_OPTIONS} className={selectBase} />
              </FormField>
            </SectionCard>

            {/* Sex */}
            <SectionCard id="sex" title="Sex">
              <FormField label="Sex" required error={!clientProfile.sex ? 'Required' : undefined}>
                <CodeSelect ariaLabel="Sex" value={clientProfile.sex} onChange={(v) => update('sex', v)} options={SEX_OPTIONS} className={cn(selectBase, 'max-w-md')} />
              </FormField>
            </SectionCard>

            {/* 4. Race and Ethnicity */}
            <SectionCard id="race_ethnicity" title="Race and Ethnicity">
              <FormField label="Race and Ethnicity" required error={clientProfile.raceEthnicity.length === 0 ? 'Select at least one' : undefined}>
                <fieldset className="space-y-2">
                  <p className="text-xs text-slate-500">Select all that apply. &ldquo;Client doesn&rsquo;t know&rdquo;, &ldquo;prefers not to answer&rdquo;, and &ldquo;Data not collected&rdquo; cannot be combined with other selections.</p>
                  {RACE_ETHNICITY_OPTIONS.map((o) => (
                    <label key={o.value} className="flex items-start gap-2 text-sm text-slate-800">
                      <input type="checkbox" checked={clientProfile.raceEthnicity.includes(o.value)} onChange={() => toggleRaceEthnicity(o.value)} className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                      <span>{o.label}</span>
                    </label>
                  ))}
                </fieldset>
              </FormField>
              <FormField label="Additional Detail">
                <input type="text" value={clientProfile.raceEthnicityAdditional} onChange={(e) => update('raceEthnicityAdditional', e.target.value)} className={inputBase} placeholder="Optional free-text" />
              </FormField>
            </SectionCard>

            {/* 5. Veteran Status */}
            <SectionCard id="veteran_status" title="Veteran Status">
              <FormField label="Veteran Status">
                <CodeSelect ariaLabel="Veteran Status" value={clientProfile.veteranStatus} onChange={(v) => update('veteranStatus', v as VeteranCode | '')} options={VETERAN_STATUS_OPTIONS} className={cn(selectBase, 'max-w-md')} />
              </FormField>
            </SectionCard>

            {/* 6. Disabling Condition */}
            <SectionCard id="disabling_condition" title="Disabling Condition">
              <FormField label="Disabling Condition">
                <CodeSelect ariaLabel="Disabling Condition" value={clientProfile.disablingCondition} onChange={(v) => update('disablingCondition', v as DisablingCode | '')} options={DISABLING_CONDITION_OPTIONS} className={cn(selectBase, 'max-w-md')} />
              </FormField>
            </SectionCard>

            {/* 7. Project Enrollment Dates */}
            <SectionCard id="enrollment_dates" title="Project Enrollment Dates">
              <FormField label="Project Start Date">
                <input type="date" value={clientProfile.projectStartDate} onChange={(e) => update('projectStartDate', e.target.value)} className={cn(inputBase, 'max-w-xs')} />
              </FormField>
              <FormField label="Project Exit Date">
                <input type="date" value={clientProfile.projectExitDate} onChange={(e) => update('projectExitDate', e.target.value)} className={cn(inputBase, 'max-w-xs')} />
              </FormField>
              <FormField label="Housing Move-in Date">
                <input type="date" value={clientProfile.housingMoveInDate} onChange={(e) => update('housingMoveInDate', e.target.value)} className={cn(inputBase, 'max-w-xs')} />
              </FormField>
              <FormField label="Date of Engagement">
                <input type="date" value={clientProfile.dateOfEngagement} onChange={(e) => update('dateOfEngagement', e.target.value)} className={cn(inputBase, 'max-w-xs')} />
              </FormField>
              <div className="border-t border-slate-200 pt-5">
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-800">Bed-Night Dates</h3>
                    <p className="text-xs text-slate-500">Night-by-night shelters: one entry per bed night used.</p>
                  </div>
                  <button type="button" onClick={addBedNight} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50">
                    <Plus className="h-3.5 w-3.5" />
                    Add Bed Night
                  </button>
                </div>
                {clientProfile.bedNightDates.length === 0 ? (
                  <p className="rounded border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-center text-xs text-slate-500">No bed nights recorded.</p>
                ) : (
                  <ul className="space-y-2">
                    {clientProfile.bedNightDates.map((d, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <input type="date" aria-label={`Bed-night date ${i + 1}`} value={d} onChange={(e) => updateBedNight(i, e.target.value)} className={cn(inputBase, 'max-w-xs')} />
                        <button type="button" onClick={() => removeBedNight(i)} aria-label="Remove bed night" className="rounded border border-red-200 bg-white p-1.5 text-red-600 hover:bg-red-50">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </SectionCard>

            {/* 8. Destination at Exit */}
            <SectionCard id="destination" title="Destination at Exit">
              <FormField label="Type of Residence">
                <CodeSelect ariaLabel="Destination Type of Residence" value={clientProfile.destinationType} onChange={(v) => update('destinationType', v)} options={LIVING_SITUATION_OPTIONS} className={selectBase} />
              </FormField>
              {clientProfile.destinationType === 'rental_with_ongoing_subsidy' && (
                <FormField label="Rental Subsidy Type">
                  <CodeSelect ariaLabel="Destination Rental Subsidy Type" value={clientProfile.destinationRentalSubsidyType} onChange={(v) => update('destinationRentalSubsidyType', v)} options={HMIS_RENTAL_SUBSIDY_OPTIONS} className={selectBase} />
                </FormField>
              )}
              {clientProfile.destinationType === 'other' && (
                <FormField label="Other Residence Description">
                  <input type="text" value={clientProfile.destinationOtherDescription} onChange={(e) => update('destinationOtherDescription', e.target.value)} className={inputBase} placeholder="Describe the residence" />
                </FormField>
              )}
            </SectionCard>

            {/* 9. Relationship to Head of Household */}
            <SectionCard id="relationship_hoh" title="Relationship to Head of Household">
              <FormField label="Relationship to HoH">
                <CodeSelect ariaLabel="Relationship to Head of Household" value={clientProfile.relationshipToHoH} onChange={(v) => update('relationshipToHoH', v as RelationshipCode | '')} options={RELATIONSHIP_TO_HOH_OPTIONS} className={selectBase} />
              </FormField>
            </SectionCard>

            {/* 10. CoC Code */}
            <SectionCard id="coc_code" title="CoC Code">
              <FormField label="CoC Code" error={clientProfile.cocCode.trim() && !COC_CODE_PATTERN.test(clientProfile.cocCode.trim()) ? 'Format must be XX-XXX (e.g., CA-501)' : undefined}>
                <input type="text" value={clientProfile.cocCode} onChange={(e) => update('cocCode', e.target.value.toUpperCase())} className={cn(inputBase, 'max-w-xs')} placeholder="CA-501" />
              </FormField>
            </SectionCard>

            {/* 11. Prior Living Situation */}
            <SectionCard id="prior_living_situation" title="Prior Living Situation">
              <FormField label="Type of Residence">
                <CodeSelect ariaLabel="Prior Type of Residence" value={clientProfile.priorResidenceType} onChange={(v) => update('priorResidenceType', v)} options={LIVING_SITUATION_OPTIONS} className={selectBase} />
              </FormField>
              {clientProfile.priorResidenceType === 'rental_with_ongoing_subsidy' && (
                <FormField label="Rental Subsidy Type">
                  <CodeSelect ariaLabel="Prior Rental Subsidy Type" value={clientProfile.priorRentalSubsidyType} onChange={(v) => update('priorRentalSubsidyType', v)} options={HMIS_RENTAL_SUBSIDY_OPTIONS} className={selectBase} />
                </FormField>
              )}
              <FormField label="Length of Stay">
                <CodeSelect ariaLabel="Length of Stay in Prior Living Situation" value={clientProfile.lengthOfStay} onChange={(v) => update('lengthOfStay', v as LengthOfStayCode | '')} options={LENGTH_OF_STAY_OPTIONS} className={selectBase} />
              </FormField>
              <FormField label="Homelessness Start Date">
                <input type="date" value={clientProfile.homelessnessStartDate} onChange={(e) => update('homelessnessStartDate', e.target.value)} className={cn(inputBase, 'max-w-xs')} />
              </FormField>
              <FormField label="Times Homeless (past 3 yrs)">
                <CodeSelect ariaLabel="Number of Times Homeless in Past 3 Years" value={clientProfile.timesHomelessPast3Years} onChange={(v) => update('timesHomelessPast3Years', v as TimesHomelessCode | '')} options={TIMES_HOMELESS_OPTIONS} className={selectBase} />
              </FormField>
              <FormField label="Months Homeless (past 3 yrs)">
                <CodeSelect ariaLabel="Total Months Homeless in Past 3 Years" value={clientProfile.monthsHomelessPast3Years} onChange={(v) => update('monthsHomelessPast3Years', v)} options={MONTHS_HOMELESS_OPTIONS} className={selectBase} />
              </FormField>
            </SectionCard>

            {/* Income from Any Source */}
            <SectionCard id="income" title="Income from Any Source">
              <FormField label="Information Date">
                <input type="date" value={clientProfile.income.informationDate} onChange={(e) => updateIncomeField('informationDate', e.target.value)} className={cn(inputBase, 'max-w-xs')} />
              </FormField>
              <FormField label="Income from Any Source">
                <CodeSelect ariaLabel="Income from Any Source" value={clientProfile.income.fromAnySource} onChange={(v) => updateIncomeField('fromAnySource', v)} options={YES_NO_DK_OPTIONS} className={cn(selectBase, 'max-w-md')} />
              </FormField>
              {clientProfile.income.fromAnySource === '1' && (
                <div className="space-y-3 border-t border-slate-200 pt-4">
                  <p className="text-xs font-medium text-slate-500">Record each source the client receives and its monthly amount.</p>
                  {INCOME_SOURCES.map((s) => {
                    const src = clientProfile.income.sources[s.key]
                    return (
                      <div key={s.key} className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto_auto] sm:items-center">
                        <span className="text-sm text-slate-800">{s.label}</span>
                        <CodeSelect ariaLabel={s.label} value={src.has} onChange={(v) => updateIncomeSource(s.key, 'has', v)} options={YES_NO_OPTIONS} className={cn(selectBase, 'sm:w-24')} />
                        {src.has === '1' ? (
                          <div className="flex items-center gap-1">
                            <span className="text-sm text-slate-400">$</span>
                            <input type="number" min="0" inputMode="decimal" aria-label={`${s.label} monthly amount`} value={src.amount} onChange={(e) => updateIncomeSource(s.key, 'amount', e.target.value)} className={cn(inputBase, 'w-24')} placeholder="0" />
                            <span className="text-xs text-slate-400">/mo</span>
                          </div>
                        ) : (
                          <span />
                        )}
                      </div>
                    )
                  })}
                  {clientProfile.income.sources.other?.has === '1' && (
                    <FormField label="Other income source name">
                      <input type="text" value={clientProfile.income.otherName} onChange={(e) => updateIncomeField('otherName', e.target.value)} className={inputBase} placeholder="Specify source" />
                    </FormField>
                  )}
                  <div className="flex items-center justify-between border-t border-slate-200 pt-3 text-sm">
                    <span className="font-medium text-slate-700">Total Monthly Income</span>
                    <span className="font-semibold text-slate-900">${totalMonthlyIncome.toLocaleString()}</span>
                  </div>
                </div>
              )}
            </SectionCard>

            {/* Non-Cash Benefits */}
            <SectionCard id="non_cash_benefits" title="Non-Cash Benefits">
              <FormField label="Information Date">
                <input type="date" value={clientProfile.nonCash.informationDate} onChange={(e) => updateNonCashField('informationDate', e.target.value)} className={cn(inputBase, 'max-w-xs')} />
              </FormField>
              <FormField label="Benefit from Any Source">
                <CodeSelect ariaLabel="Non-Cash Benefit from Any Source" value={clientProfile.nonCash.fromAnySource} onChange={(v) => updateNonCashField('fromAnySource', v)} options={YES_NO_DK_OPTIONS} className={cn(selectBase, 'max-w-md')} />
              </FormField>
              {clientProfile.nonCash.fromAnySource === '1' && (
                <div className="space-y-3 border-t border-slate-200 pt-4">
                  {NONCASH_SOURCES.map((s) => (
                    <div key={s.key} className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto] sm:items-center">
                      <span className="text-sm text-slate-800">{s.label}</span>
                      <CodeSelect ariaLabel={s.label} value={clientProfile.nonCash.flags[s.key]} onChange={(v) => updateNonCashFlag(s.key, v)} options={YES_NO_OPTIONS} className={cn(selectBase, 'sm:w-24')} />
                    </div>
                  ))}
                  {clientProfile.nonCash.flags.other === '1' && (
                    <FormField label="Other benefit source">
                      <input type="text" value={clientProfile.nonCash.otherSource} onChange={(e) => updateNonCashField('otherSource', e.target.value)} className={inputBase} placeholder="Specify source" />
                    </FormField>
                  )}
                </div>
              )}
            </SectionCard>

            {/* Health Insurance */}
            <SectionCard id="health_insurance" title="Health Insurance">
              <FormField label="Information Date">
                <input type="date" value={clientProfile.insurance.informationDate} onChange={(e) => updateInsuranceField('informationDate', e.target.value)} className={cn(inputBase, 'max-w-xs')} />
              </FormField>
              <FormField label="Covered by Health Insurance">
                <CodeSelect ariaLabel="Covered by Health Insurance" value={clientProfile.insurance.covered} onChange={(v) => updateInsuranceField('covered', v)} options={YES_NO_DK_OPTIONS} className={cn(selectBase, 'max-w-md')} />
              </FormField>
              {clientProfile.insurance.covered === '1' && (
                <div className="space-y-3 border-t border-slate-200 pt-4">
                  {INSURANCE_TYPES.map((s) => (
                    <div key={s.key} className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto] sm:items-center">
                      <span className="text-sm text-slate-800">{s.label}</span>
                      <CodeSelect ariaLabel={s.label} value={clientProfile.insurance.flags[s.key]} onChange={(v) => updateInsuranceFlag(s.key, v)} options={YES_NO_OPTIONS} className={cn(selectBase, 'sm:w-24')} />
                    </div>
                  ))}
                  {clientProfile.insurance.flags.other === '1' && (
                    <FormField label="Other insurance source">
                      <input type="text" value={clientProfile.insurance.otherSource} onChange={(e) => updateInsuranceField('otherSource', e.target.value)} className={inputBase} placeholder="Specify source" />
                    </FormField>
                  )}
                </div>
              )}
              {clientProfile.insurance.covered === '0' && (
                <FormField label="Reason not covered (HOPWA)">
                  <CodeSelect ariaLabel="Reason not covered" value={clientProfile.insurance.noInsuranceReason} onChange={(v) => updateInsuranceField('noInsuranceReason', v)} options={NO_INSURANCE_REASON_OPTIONS} className={selectBase} />
                </FormField>
              )}
            </SectionCard>

            {/* Physical Disability */}
            <SectionCard id="physical_disability" title="Physical Disability">
              <FormField label="Information Date">
                <input type="date" value={clientProfile.physicalDisabilityInfoDate} onChange={(e) => update('physicalDisabilityInfoDate', e.target.value)} className={cn(inputBase, 'max-w-xs')} />
              </FormField>
              <FormField label="Physical Disability">
                <CodeSelect ariaLabel="Physical Disability" value={clientProfile.physicalDisability} onChange={(v) => update('physicalDisability', v)} options={YES_NO_DK_OPTIONS} className={cn(selectBase, 'max-w-md')} />
              </FormField>
              {clientProfile.physicalDisability === '1' && (
                <FormField label="↳ Long-continuing & impairs independent living">
                  <CodeSelect ariaLabel="Physical disability indefinite and impairs independent living" value={clientProfile.physicalDisabilityIndefinite} onChange={(v) => update('physicalDisabilityIndefinite', v)} options={YES_NO_DK_OPTIONS} className={cn(selectBase, 'max-w-md')} />
                </FormField>
              )}
            </SectionCard>

            {/* Developmental Disability */}
            <SectionCard id="developmental_disability" title="Developmental Disability">
              <FormField label="Information Date">
                <input type="date" value={clientProfile.developmentalDisabilityInfoDate} onChange={(e) => update('developmentalDisabilityInfoDate', e.target.value)} className={cn(inputBase, 'max-w-xs')} />
              </FormField>
              <FormField label="Developmental Disability">
                <CodeSelect ariaLabel="Developmental Disability" value={clientProfile.developmentalDisability} onChange={(v) => update('developmentalDisability', v)} options={YES_NO_DK_OPTIONS} className={cn(selectBase, 'max-w-md')} />
              </FormField>
            </SectionCard>

            {/* Chronic Health Condition */}
            <SectionCard id="chronic_health_condition" title="Chronic Health Condition">
              <FormField label="Information Date">
                <input type="date" value={clientProfile.chronicHealthInfoDate} onChange={(e) => update('chronicHealthInfoDate', e.target.value)} className={cn(inputBase, 'max-w-xs')} />
              </FormField>
              <FormField label="Chronic Health Condition">
                <CodeSelect ariaLabel="Chronic Health Condition" value={clientProfile.chronicHealthCondition} onChange={(v) => update('chronicHealthCondition', v)} options={YES_NO_DK_OPTIONS} className={cn(selectBase, 'max-w-md')} />
              </FormField>
              {clientProfile.chronicHealthCondition === '1' && (
                <FormField label="↳ Long-continuing & impairs independent living">
                  <CodeSelect ariaLabel="Chronic health condition indefinite and impairs independent living" value={clientProfile.chronicHealthIndefinite} onChange={(v) => update('chronicHealthIndefinite', v)} options={YES_NO_DK_OPTIONS} className={cn(selectBase, 'max-w-md')} />
                </FormField>
              )}
            </SectionCard>

            {/* HIV/AIDS */}
            <SectionCard id="hiv_aids" title="HIV/AIDS">
              <FormField label="Information Date">
                <input type="date" value={clientProfile.hivAidsInfoDate} onChange={(e) => update('hivAidsInfoDate', e.target.value)} className={cn(inputBase, 'max-w-xs')} />
              </FormField>
              <FormField label="HIV/AIDS">
                <CodeSelect ariaLabel="HIV/AIDS" value={clientProfile.hivAids} onChange={(v) => update('hivAids', v)} options={YES_NO_DK_OPTIONS} className={cn(selectBase, 'max-w-md')} />
              </FormField>
            </SectionCard>

            {/* Mental Health Disorder */}
            <SectionCard id="mental_health_disorder" title="Mental Health Disorder">
              <FormField label="Information Date">
                <input type="date" value={clientProfile.mentalHealthInfoDate} onChange={(e) => update('mentalHealthInfoDate', e.target.value)} className={cn(inputBase, 'max-w-xs')} />
              </FormField>
              <FormField label="Mental Health Disorder">
                <CodeSelect ariaLabel="Mental Health Disorder" value={clientProfile.mentalHealthDisorder} onChange={(v) => update('mentalHealthDisorder', v)} options={YES_NO_DK_OPTIONS} className={cn(selectBase, 'max-w-md')} />
              </FormField>
              {clientProfile.mentalHealthDisorder === '1' && (
                <FormField label="↳ Long-continuing & impairs independent living">
                  <CodeSelect ariaLabel="Mental health disorder indefinite and impairs independent living" value={clientProfile.mentalHealthIndefinite} onChange={(v) => update('mentalHealthIndefinite', v)} options={YES_NO_DK_OPTIONS} className={cn(selectBase, 'max-w-md')} />
                </FormField>
              )}
            </SectionCard>

            {/* Substance Use Disorder */}
            <SectionCard id="substance_use_disorder" title="Substance Use Disorder">
              <FormField label="Information Date">
                <input type="date" value={clientProfile.substanceUseInfoDate} onChange={(e) => update('substanceUseInfoDate', e.target.value)} className={cn(inputBase, 'max-w-xs')} />
              </FormField>
              <FormField label="Substance Use Disorder">
                <CodeSelect ariaLabel="Substance Use Disorder" value={clientProfile.substanceUseDisorder} onChange={(v) => update('substanceUseDisorder', v)} options={SUBSTANCE_USE_OPTIONS} className={cn(selectBase, 'max-w-md')} />
              </FormField>
              {['1', '2', '3'].includes(clientProfile.substanceUseDisorder) && (
                <FormField label="↳ Long-continuing & impairs independent living">
                  <CodeSelect ariaLabel="Substance use disorder indefinite and impairs independent living" value={clientProfile.substanceUseIndefinite} onChange={(v) => update('substanceUseIndefinite', v)} options={YES_NO_DK_OPTIONS} className={cn(selectBase, 'max-w-md')} />
                </FormField>
              )}
            </SectionCard>

            {/* Survivor of Domestic Violence */}
            <SectionCard id="domestic_violence" title="Survivor of Domestic Violence">
              <FormField label="Information Date">
                <input type="date" value={clientProfile.dvInfoDate} onChange={(e) => update('dvInfoDate', e.target.value)} className={cn(inputBase, 'max-w-xs')} />
              </FormField>
              <FormField label="Survivor of Domestic Violence">
                <CodeSelect ariaLabel="Survivor of Domestic Violence" value={clientProfile.survivorOfDV} onChange={(v) => update('survivorOfDV', v)} options={YES_NO_DK_OPTIONS} className={cn(selectBase, 'max-w-md')} />
              </FormField>
              {clientProfile.survivorOfDV === '1' && (
                <>
                  <FormField label="When experience occurred">
                    <CodeSelect ariaLabel="When experience occurred" value={clientProfile.dvWhenOccurred} onChange={(v) => update('dvWhenOccurred', v)} options={DV_WHEN_OPTIONS} className={selectBase} />
                  </FormField>
                  <FormField label="Currently fleeing?">
                    <CodeSelect ariaLabel="Currently fleeing" value={clientProfile.dvCurrentlyFleeing} onChange={(v) => update('dvCurrentlyFleeing', v)} options={YES_NO_DK_OPTIONS} className={cn(selectBase, 'max-w-md')} />
                  </FormField>
                </>
              )}
            </SectionCard>

          {/* Collapsible JSON preview */}
          <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
            <button type="button" onClick={() => setJsonPreviewOpen((o) => !o)} className="flex w-full items-center justify-between px-6 py-4 text-left hover:bg-slate-50">
              <span className="font-medium text-slate-800">Data preview (JSON)</span>
              {jsonPreviewOpen ? <ChevronDown className="h-4 w-4 text-slate-500" /> : <ChevronRight className="h-4 w-4 text-slate-500" />}
            </button>
            {jsonPreviewOpen && (
              <pre className="max-h-96 overflow-auto border-t border-slate-200 bg-slate-50 p-4 text-xs text-slate-700">
                {JSON.stringify(clientProfile, null, 2)}
              </pre>
            )}
          </div>
          </>
          )}

          {currentSectionId === 'assessments' && (
            <>
            <SectionCard id="current-living" title="Current Living Situation">
              <FormField label="Information Date">
                <input
                  type="date"
                  aria-label="Information Date"
                  value={clientProfile.clsInformationDate}
                  onChange={(e) => update('clsInformationDate', e.target.value)}
                  className={cn(inputBase, 'max-w-xs')}
                />
              </FormField>
              <FormField label="Current Living Situation">
                <CodeSelect
                  ariaLabel="Current Living Situation"
                  value={clientProfile.currentLivingSituation}
                  onChange={(v) => update('currentLivingSituation', v)}
                  options={LIVING_SITUATION_OPTIONS}
                  className={selectBase}
                />
              </FormField>

              {clientProfile.currentLivingSituation === 'rental_with_ongoing_subsidy' && (
                <FormField label="Rental Subsidy Type">
                  <CodeSelect
                    ariaLabel="Rental Subsidy Type"
                    value={clientProfile.clsRentalSubsidyType}
                    onChange={(v) => update('clsRentalSubsidyType', v)}
                    options={HMIS_RENTAL_SUBSIDY_OPTIONS}
                    className={cn(selectBase, 'max-w-xs')}
                  />
                </FormField>
              )}

              <FormField label="Living Situation Verified By">
                <input
                  type="text"
                  aria-label="Living Situation Verified By"
                  value={clientProfile.clsVerifiedBy}
                  onChange={(e) => update('clsVerifiedBy', e.target.value)}
                  className={inputBase}
                  placeholder="CE projects only"
                />
              </FormField>

              {TEMP_OR_PERM_HOUSING_OPTIONS.includes(clientProfile.currentLivingSituation) && (
                <>
                  <FormField label="Leaving within 14 days?">
                    <CodeSelect
                      ariaLabel="Is client going to have to leave their current living situation within 14 days?"
                      value={clientProfile.leavingWithin14Days}
                      onChange={(v) => update('leavingWithin14Days', v)}
                      options={YES_NO_DK_OPTIONS}
                      className={cn(selectBase, 'max-w-xs')}
                    />
                  </FormField>
                  {clientProfile.leavingWithin14Days === '1' && (
                    <FormField label="Subsequent residence identified?">
                      <CodeSelect
                        ariaLabel="Has a subsequent residence been identified?"
                        value={clientProfile.subsequentResidenceIdentified}
                        onChange={(v) => update('subsequentResidenceIdentified', v)}
                        options={YES_NO_DK_OPTIONS}
                        className={cn(selectBase, 'max-w-xs')}
                      />
                    </FormField>
                  )}
                  <FormField label="Resources for permanent housing?">
                    <CodeSelect
                      ariaLabel="Does individual or family have resources or support networks to obtain other permanent housing?"
                      value={clientProfile.resourcesForHousing}
                      onChange={(v) => update('resourcesForHousing', v)}
                      options={YES_NO_DK_OPTIONS}
                      className={cn(selectBase, 'max-w-xs')}
                    />
                  </FormField>
                  <FormField label="Lease in last 60 days?">
                    <CodeSelect
                      ariaLabel="Has the client had a lease or ownership interest in a permanent housing unit in the last 60 days?"
                      value={clientProfile.leaseInLast60Days}
                      onChange={(v) => update('leaseInLast60Days', v)}
                      options={YES_NO_DK_OPTIONS}
                      className={cn(selectBase, 'max-w-xs')}
                    />
                  </FormField>
                  <FormField label="Moved 2+ times in last 60 days?">
                    <CodeSelect
                      ariaLabel="Has the client moved 2 or more times in the last 60 days?"
                      value={clientProfile.movedTwiceIn60Days}
                      onChange={(v) => update('movedTwiceIn60Days', v)}
                      options={YES_NO_DK_OPTIONS}
                      className={cn(selectBase, 'max-w-xs')}
                    />
                  </FormField>
                </>
              )}

              <FormField label="Location Details">
                <input
                  type="text"
                  name="location-details"
                  aria-label="Location Details"
                  value={clientProfile.locationDetails}
                  onChange={(e) => update('locationDetails', e.target.value)}
                  className={inputBase}
                  placeholder="Optional"
                />
              </FormField>
            </SectionCard>

            {/* Coordinated Entry Event (repeatable) */}
            <SectionCard id="ce_event" title="Coordinated Entry Events">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-500">Referrals and diversion interventions during a CE enrollment.</p>
                <button type="button" onClick={addCEEvent} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50">
                  <Plus className="h-3.5 w-3.5" />
                  Add Event
                </button>
              </div>
              {clientProfile.ceEvents.length === 0 ? (
                <p className="rounded border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-xs text-slate-500">No coordinated entry events.</p>
              ) : (
                <ul className="space-y-4">
                  {clientProfile.ceEvents.map((ev) => (
                    <li key={ev.id} className="rounded border border-slate-200 p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Event</span>
                        <button type="button" onClick={() => removeCEEvent(ev.id)} aria-label="Remove event" className="rounded border border-red-200 bg-white px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50">
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                      <div className="space-y-3">
                        <FormField label="Date of Event">
                          <input type="date" aria-label="Date of Event" value={ev.eventDate} onChange={(e) => updateCEEvent(ev.id, 'eventDate', e.target.value)} className={cn(inputBase, 'max-w-xs')} />
                        </FormField>
                        <FormField label="Event">
                          <CodeSelect ariaLabel="Event" value={ev.eventType} onChange={(v) => updateCEEvent(ev.id, 'eventType', v)} options={CE_EVENT_OPTIONS} className={selectBase} />
                        </FormField>
                        {ev.eventType === '2' && (
                          <FormField label="Diversion result: client housed?">
                            <CodeSelect ariaLabel="Problem Solving result client housed" value={ev.diversionResult} onChange={(v) => updateCEEvent(ev.id, 'diversionResult', v)} options={YES_NO_OPTIONS} className={cn(selectBase, 'max-w-md')} />
                          </FormField>
                        )}
                        {ev.eventType === '5' && (
                          <FormField label="Enrolled in Aftercare project?">
                            <CodeSelect ariaLabel="Enrolled in Aftercare project" value={ev.aftercareResult} onChange={(v) => updateCEEvent(ev.id, 'aftercareResult', v)} options={YES_NO_OPTIONS} className={cn(selectBase, 'max-w-md')} />
                          </FormField>
                        )}
                        {CE_REFERRAL_EVENT_TYPES.has(ev.eventType) && (
                          <FormField label="Referral location (Project name / ID)">
                            <input type="text" aria-label="Referral location" value={ev.referralProjectId} onChange={(e) => updateCEEvent(ev.id, 'referralProjectId', e.target.value)} className={inputBase} placeholder="Project name and/or HMIS Project ID" />
                          </FormField>
                        )}
                        {CE_REFERRAL_EVENT_TYPES.has(ev.eventType) && ev.referralProjectId.trim() !== '' && (
                          <>
                            <FormField label="Referral Result">
                              <CodeSelect ariaLabel="Referral Result" value={ev.referralResult} onChange={(v) => updateCEEvent(ev.id, 'referralResult', v)} options={REFERRAL_RESULT_OPTIONS} className={selectBase} />
                            </FormField>
                            {ev.referralResult !== '' && (
                              <FormField label="Date of Result">
                                <input type="date" aria-label="Date of Result" value={ev.referralResultDate} onChange={(e) => updateCEEvent(ev.id, 'referralResultDate', e.target.value)} className={cn(inputBase, 'max-w-xs')} />
                              </FormField>
                            )}
                          </>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </SectionCard>

            {/* Coordinated Entry Assessment (repeatable) */}
            <SectionCard id="ce_assessment" title="Coordinated Entry Assessments">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-500">CE assessments conducted during an enrollment.</p>
                <button type="button" onClick={addCEAssessment} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50">
                  <Plus className="h-3.5 w-3.5" />
                  Add Assessment
                </button>
              </div>
              {clientProfile.ceAssessments.length === 0 ? (
                <p className="rounded border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-xs text-slate-500">No coordinated entry assessments.</p>
              ) : (
                <ul className="space-y-4">
                  {clientProfile.ceAssessments.map((a) => (
                    <li key={a.id} className="rounded border border-slate-200 p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Assessment</span>
                        <button type="button" onClick={() => removeCEAssessment(a.id)} aria-label="Remove assessment" className="rounded border border-red-200 bg-white px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50">
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                      <div className="space-y-3">
                        <FormField label="Date of Assessment">
                          <input type="date" aria-label="Date of Assessment" value={a.assessmentDate} onChange={(e) => updateCEAssessment(a.id, 'assessmentDate', e.target.value)} className={cn(inputBase, 'max-w-xs')} />
                        </FormField>
                        <FormField label="Assessment Location">
                          <input type="text" aria-label="Assessment Location" value={a.assessmentLocation} onChange={(e) => updateCEAssessment(a.id, 'assessmentLocation', e.target.value)} className={inputBase} placeholder="Location" />
                        </FormField>
                        <FormField label="Assessment Type">
                          <CodeSelect ariaLabel="Assessment Type" value={a.assessmentType} onChange={(v) => updateCEAssessment(a.id, 'assessmentType', v)} options={CE_ASSESSMENT_TYPE_OPTIONS} className={cn(selectBase, 'max-w-md')} />
                        </FormField>
                        <FormField label="Assessment Level">
                          <CodeSelect ariaLabel="Assessment Level" value={a.assessmentLevel} onChange={(v) => updateCEAssessment(a.id, 'assessmentLevel', v)} options={CE_ASSESSMENT_LEVEL_OPTIONS} className={cn(selectBase, 'max-w-md')} />
                        </FormField>
                        <FormField label="Prioritization Status">
                          <CodeSelect ariaLabel="Prioritization Status" value={a.prioritizationStatus} onChange={(v) => updateCEAssessment(a.id, 'prioritizationStatus', v)} options={CE_PRIORITIZATION_OPTIONS} className={selectBase} />
                        </FormField>
                        <FormField label="Questions / Answers / Results">
                          <textarea aria-label="Assessment notes" value={a.notes} onChange={(e) => updateCEAssessment(a.id, 'notes', e.target.value)} rows={3} className={cn(selectBase, 'min-h-[72px]')} placeholder="Locally determined questions, answers, and results" />
                        </FormField>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </SectionCard>
            </>
          )}

          {currentSectionId === 'notes' && (
            <SectionCard id="notes" title="Notes">
              <p className="text-sm text-slate-500">No notes yet.</p>
            </SectionCard>
          )}

          {currentSectionId === 'household' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setCurrentSectionId('profile')}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Back to Profile
                </button>
                <button
                  type="button"
                  onClick={openAddMember}
                  aria-label="Add Household Member"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                  <Plus className="h-4 w-4" />
                  Add Household Member
                </button>
              </div>

              <SectionCard id="household-management" title="Household Management">
                {clientProfile.householdMembers.length === 0 ? (
                  <p className="rounded border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
                    No household members yet. Click <strong>Add Household Member</strong> to get started.
                  </p>
                ) : (
                  <ul className="divide-y divide-slate-200 overflow-hidden rounded border border-slate-200" aria-label="Household Members">
                    {clientProfile.householdMembers.map((m) => (
                      <li
                        key={m.id}
                        data-member-id={m.id}
                        data-member-type={m.memberType}
                        data-member-start-date={m.startDate}
                        data-member-name={m.name}
                        className="flex flex-wrap items-center justify-between gap-3 bg-white px-4 py-3"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-slate-900">
                            {m.name || <span className="italic text-slate-400">Unnamed</span>}
                          </p>
                          <p className="text-xs text-slate-500">
                            <span aria-label="Member Type">{m.memberType || '—'}</span>
                            <span className="mx-1.5 text-slate-300">|</span>
                            <span aria-label="Start Date">{m.startDate || '—'}</span>
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => openEditMember(m.id)}
                            aria-label="Edit"
                            className="inline-flex items-center gap-1 rounded border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                          >
                            <Pencil className="h-3 w-3" />
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => removeMember(m.id)}
                            aria-label="Remove"
                            className="inline-flex items-center gap-1 rounded border border-red-200 bg-white px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="h-3 w-3" />
                            Remove
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </SectionCard>
            </div>
          )}
          </div>
          {currentSectionId === 'profile' && (
            <aside className="hidden w-72 shrink-0 space-y-4 xl:block">
              <HouseholdSidePanel clientId={clientId} onManage={() => navigateToHousehold(clientId)} />
            </aside>
          )}
          </div>
          </form>
        </main>
      </div>

      {/* Mobile section nav */}
      <div className="border-t border-slate-200 bg-white px-4 py-3 lg:hidden">
        <label className="block text-xs font-medium text-slate-500">Jump to section</label>
        <select className="mt-1 w-full rounded border border-slate-200 bg-slate-50 px-3 py-2 text-sm" onChange={(e) => { const id = e.target.value; if (id) { setCurrentSectionId('profile'); requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })); } }}>
          <option value="">Select section...</option>
          {SECTIONS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
      </div>

      <AddHouseholdMemberModal
        open={memberModalOpen}
        initialMember={editingMemberId ? clientProfile.householdMembers.find((m) => m.id === editingMemberId) ?? null : null}
        onSave={saveMember}
        onClose={closeMemberModal}
      />
    </div>
  )
}

function HouseholdSidePanel({ clientId, onManage }: { clientId: string; onManage: () => void }) {
  const households = loadHouseholds()
  const clients = loadClients()
  const hh = findActiveHouseholdForClient(clientId, households)
  const members = hh ? getActiveMembers(hh) : []
  return (
    <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <h3 className="text-sm font-semibold text-slate-800">Household Members</h3>
        <button
          type="button"
          onClick={onManage}
          aria-label="Manage household"
          className="rounded border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
        >
          Manage
        </button>
      </div>
      <div className="px-4 py-3">
        {members.length === 0 ? (
          <p className="text-xs text-slate-500">No active members</p>
        ) : (
          <ul className="space-y-2">
            {members.map((m) => {
              const c = clients.find((x) => x.id === m.clientId)
              return (
                <li key={m.clientId} className="text-xs">
                  <p className="font-medium text-slate-800">{c ? clientDisplayName(c.profile) : 'Unknown'}</p>
                  <p className="text-slate-500">{m.memberType}</p>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}

// ---------- Top-level route switcher ----------
export default function App() {
  const [route, setRoute] = useState<Route>(() => parseHash())

  useEffect(() => {
    const onHashChange = () => setRoute(parseHash())
    window.addEventListener('hashchange', onHashChange)
    if (!window.location.hash) window.location.hash = '/clients'
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  const handleOpenClient = useCallback((id: string) => navigateToClient(id), [])
  const handleBackToList = useCallback(() => navigateToList(), [])
  const handleNewClient = useCallback(() => {
    const next: Client = {
      id: generateClientId(),
      createdAt: todayISO(),
      caseManager: 'Unassigned',
      profile: { ...EMPTY_PROFILE },
    }
    upsertClient(next)
    navigateToClient(next.id)
  }, [])

  if (route.name === 'intake') {
    return <IntakeForm key={route.clientId} clientId={route.clientId} onBack={handleBackToList} />
  }
  if (route.name === 'household') {
    return (
      <HouseholdPage
        key={route.clientId}
        clientId={route.clientId}
        onBackToIntake={() => navigateToClient(route.clientId)}
        onOpenClient={(id) => navigateToHousehold(id)}
      />
    )
  }
  return <ClientsListPage onOpenClient={handleOpenClient} onNewClient={handleNewClient} />
}
