import { useState, useCallback, useEffect, useRef } from 'react'
import { User, Save, RotateCcw, ChevronDown, ChevronRight, ChevronLeft, Plus, Pencil, Trash2, X } from 'lucide-react'

// ---------- Types ----------
type NameQuality = 'Full name reported' | 'Partial / street name / code name' | "Client doesn't know" | 'Client prefers not to answer' | 'Data not collected'
type SuffixOption = 'None' | 'Jr.' | 'Sr.' | 'II' | 'III' | 'IV' | 'V' | 'MD' | 'PhD' | 'Other'
type DOBQuality = 'Full DOB reported' | 'Approximate / partial' | "Client doesn't know" | 'Client prefers not to answer' | 'Data not collected'
type SSNQuality = 'Full SSN' | 'Approximate / partial' | "Client doesn't know" | 'Client prefers not to answer' | 'Data not collected'
type GenderOption = 'Woman / Girl' | 'Man / Boy' | 'Culturally specific identity (e.g., Two-Spirit)' | 'Transgender' | 'Non-Binary' | 'Questioning' | 'Different identity (specify)' | "Client doesn't know" | 'Client prefers not to answer' | 'Data not collected'
type SexOption = 'Female' | 'Male' | "Client doesn't know" | 'Client prefers not to answer' | 'Data not collected'
type RaceEthnicityOption = 'American Indian / Alaska Native / Indigenous' | 'Asian / Asian American' | 'Black / African American / African' | 'Native Hawaiian / Pacific Islander' | 'White' | 'Hispanic/Latina/o' | 'Middle Eastern / North African' | "Client doesn't know" | 'Client prefers not to answer' | 'Data not collected'
type PrimaryLanguageOption = 'English' | 'Spanish' | 'French' | 'Italian' | 'German' | 'Greek' | 'Polish' | 'Portuguese' | 'Russian' | 'Swedish' | 'American Sign Language' | 'Other (specify)' | "Client doesn't know" | 'Client prefers not to answer'
type VeteranStatusOption = 'Yes' | 'No' | "Don't know" | 'Prefer not to answer' | 'Data not collected'
type BranchOption = 'Army' | 'Air Force' | 'Navy' | 'Marines' | 'Coast Guard' | 'Space Force'
type DischargeOption = 'Honorable' | 'General' | 'Other than honorable' | 'Bad conduct' | 'Dishonorable' | 'Uncharacterized'
type VASHStatusOption = 'Admitted' | 'Needs screening' | 'Interested list' | 'Vouchered' | 'Various ineligible reasons'
type PriorLivingOption = 'Homeless' | 'Place not meant for habitation' | 'Emergency shelter' | 'Safe haven' | 'Institutional' | 'Jail' | 'Hospital' | 'Psychiatric facility' | 'Detox' | 'Nursing home' | 'Foster care' | 'Temporary' | 'Transitional housing' | 'Staying with friends' | 'Staying with family' | 'Hotel/motel' | 'Permanent' | 'Rental with subsidy' | 'Rental without subsidy' | 'Owned with subsidy' | 'Owned without subsidy'
type LengthOfStayOption = '1 night or less' | '2–6 nights' | '1 week–1 month' | '1–3 months' | '3–12 months' | '1 year+'
type YesNoDkRefused = 'Yes' | 'No' | "Don't know" | 'Prefer not to answer' | 'Refused' | 'Data not collected'
type SubstanceUseOption = 'No' | 'Alcohol' | 'Drug' | 'Both'
type DVHowLongAgoOption = '< 3 months' | '3–6 months' | '6–12 months' | '1+ year'
type EmploymentTypeOption = 'Full-time' | 'Part-time' | 'Seasonal / day labor'
type EducationOption = '< Grade 5' | 'Grades 5–6' | 'Grades 7–8' | 'Grades 9–11' | 'High school' | 'GED' | 'Some college' | 'Associate' | 'Bachelor' | 'Graduate' | 'Vocational cert'
type SexualOrientationOption = 'Heterosexual' | 'Gay' | 'Lesbian' | 'Bisexual' | 'Questioning' | 'Other' | "Don't know" | 'Refused'
type GeographyLocationOption = 'LA County' | 'Other Southern CA' | 'Other CA' | 'Out of state' | 'Outside U.S.'
type PreferredLanguageOption = 'English' | 'Spanish' | 'Russian' | 'French' | 'Armenian' | 'ASL' | 'Portuguese' | 'Chinese' | 'Korean' | 'Arabic' | 'Other'
type HouseholdRelationOption = 'Head of household' | 'Child' | 'Spouse/partner' | 'Other relation' | 'Non-relation'
type MemberTypeOption =
  | 'Head of Household'
  | 'Spouse'
  | 'Son'
  | 'Daughter'
  | 'Brother'
  | 'Sister'
  | 'Mother'
  | 'Father'
  | 'Other relation'
  | 'Non-related household member'
type CurrentLivingSituationOption =
  | 'Place not meant for habitation (e.g., a vehicle, an abandoned building, bus/train/subway station/airport or anywhere outside)'
  | 'Emergency shelter, including hotel or motel paid for with emergency shelter voucher, or RHY-funded Host Home shelter'
  | 'Safe Haven'
  | 'Foster care home or foster care group home'
  | 'Hospital or other residential non-psychiatric medical facility'
  | 'Jail, prison or juvenile detention facility'
  | 'Long-term care facility or nursing home'
  | 'Psychiatric hospital or other psychiatric facility'
  | 'Substance abuse treatment facility or detox center'
  | 'Residential project or halfway house with no homeless criteria'
  | 'Hotel or motel paid for without emergency shelter voucher'
  | "Staying or living in a friend's room, apartment or house"
  | "Staying or living in a family member's room, apartment or house"
  | 'Rental by client, no ongoing housing subsidy'
  | 'Rental by client, with ongoing housing subsidy'
  | 'Owned by client, with ongoing housing subsidy'
  | 'Owned by client, no ongoing housing subsidy'
  | 'Other'
  | 'Worker unable to determine'
  | 'Data not collected'
type RentalSubsidyTypeOption = 'Government rental assistance' | 'Private rental assistance' | 'RRH' | 'VASH' | 'Other'
type YesNoOption = 'Yes' | 'No' | ''
type ProfileStatus = 'Draft' | 'In Review' | 'Complete'

interface EmergencyContact { name: string; phone: string; email: string }

interface HouseholdMember {
  id: string
  name: string
  memberType: MemberTypeOption | ''
  startDate: string
}

interface ClientProfile {
  firstName: string
  middleName: string
  lastName: string
  suffix: SuffixOption | ''
  alias: string
  nameQuality: NameQuality | ''
  dateOfBirth: string
  dobQuality: DOBQuality | ''
  ssn: string
  ssnQuality: SSNQuality | ''
  gender: GenderOption[]
  genderOther: string
  pronouns: string
  sex: SexOption | ''
  raceEthnicity: RaceEthnicityOption[]
  tribalAffiliation: string
  primaryLanguage: PrimaryLanguageOption | ''
  primaryLanguageOther: string
  hasDisability: 'Yes' | 'No' | ''
  needsMobilityAccommodations: 'Yes' | 'No' | ''
  mobilityFeatures: string[]
  mobilityFeaturesOther: string
  sensoryAccommodations: string[]
  veteranStatus: VeteranStatusOption | ''
  branch: BranchOption | ''
  discharge: DischargeOption | ''
  vashStatus: VASHStatusOption | ''
  emergencyContact: EmergencyContact
  householdComposition: HouseholdRelationOption[]
  householdMembers: HouseholdMember[]
  dateOfContact: string
  currentLivingSituation: CurrentLivingSituationOption | ''
  locationDetails: string
  leavingWithin14Days: YesNoOption
  subsequentResidenceIdentified: YesNoOption
  resourcesForHousing: YesNoOption
  leaseInLast60Days: YesNoOption
  movedTwiceIn60Days: YesNoOption
  rentalSubsidyType: RentalSubsidyTypeOption | ''
  priorLivingSituation: PriorLivingOption | ''
  lengthOfStay: LengthOfStayOption | ''
  firstTimeHomeless: YesNoDkRefused | ''
  timesHomelessPastYear: string
  timesHomelessPast3Years: string
  monthsHomelessPast3Years: string
  physicalDisability: YesNoDkRefused | ''
  chronicHealthCondition: YesNoDkRefused | ''
  hivAids: YesNoDkRefused | ''
  mentalHealthDisorder: YesNoDkRefused | ''
  substanceUse: SubstanceUseOption | ''
  survivorOfDV: YesNoDkRefused | ''
  dvHowLongAgo: DVHowLongAgoOption | ''
  currentlyFleeing: 'Yes' | 'No' | ''
  currentlyEmployed: YesNoDkRefused | ''
  employmentType: EmploymentTypeOption | ''
  cashIncomeSources: string[]
  cashIncomeOther: string
  nonCashBenefits: string[]
  nonCashOther: string
  coveredByInsurance: YesNoDkRefused | ''
  insuranceTypes: string[]
  insuranceOther: string
  highestEducation: EducationOption | ''
  sexualOrientation: SexualOrientationOption | ''
  sexualOrientationOther: string
  livedOutsideLACounty: 'Yes' | 'No' | ''
  previousLocation: GeographyLocationOption | ''
  translationNeeded: 'Yes' | 'No' | ''
  preferredLanguage: PreferredLanguageOption | ''
  preferredLanguageOther: string
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

const CURRENT_LIVING_SITUATION_OPTIONS: CurrentLivingSituationOption[] = [
  'Place not meant for habitation (e.g., a vehicle, an abandoned building, bus/train/subway station/airport or anywhere outside)',
  'Emergency shelter, including hotel or motel paid for with emergency shelter voucher, or RHY-funded Host Home shelter',
  'Safe Haven',
  'Foster care home or foster care group home',
  'Hospital or other residential non-psychiatric medical facility',
  'Jail, prison or juvenile detention facility',
  'Long-term care facility or nursing home',
  'Psychiatric hospital or other psychiatric facility',
  'Substance abuse treatment facility or detox center',
  'Residential project or halfway house with no homeless criteria',
  'Hotel or motel paid for without emergency shelter voucher',
  "Staying or living in a friend's room, apartment or house",
  "Staying or living in a family member's room, apartment or house",
  'Rental by client, no ongoing housing subsidy',
  'Rental by client, with ongoing housing subsidy',
  'Owned by client, with ongoing housing subsidy',
  'Owned by client, no ongoing housing subsidy',
  'Other',
  'Worker unable to determine',
  'Data not collected',
]

const TEMP_OR_PERM_HOUSING_OPTIONS: CurrentLivingSituationOption[] = [
  "Staying or living in a friend's room, apartment or house",
  "Staying or living in a family member's room, apartment or house",
  'Rental by client, no ongoing housing subsidy',
  'Rental by client, with ongoing housing subsidy',
  'Owned by client, with ongoing housing subsidy',
  'Owned by client, no ongoing housing subsidy',
  'Other',
  'Worker unable to determine',
]

const RENTAL_SUBSIDY_TYPE_OPTIONS: RentalSubsidyTypeOption[] = [
  'Government rental assistance',
  'Private rental assistance',
  'RRH',
  'VASH',
  'Other',
]

function generateMemberId(): string {
  return `hm-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

// ---------- Demo data ----------
const DEMO_PROFILE: ClientProfile = {
  firstName: 'Maria',
  middleName: 'Elena',
  lastName: 'Santos',
  suffix: 'None',
  alias: 'Mari',
  nameQuality: 'Full name reported',
  dateOfBirth: '1985-06-12',
  dobQuality: 'Full DOB reported',
  ssn: '',
  ssnQuality: '',
  gender: ['Woman / Girl'],
  genderOther: '',
  pronouns: 'she/her',
  sex: 'Female',
  raceEthnicity: ['Hispanic/Latina/o'],
  tribalAffiliation: '',
  primaryLanguage: 'Spanish',
  primaryLanguageOther: '',
  hasDisability: 'No',
  needsMobilityAccommodations: 'No',
  mobilityFeatures: [],
  mobilityFeaturesOther: '',
  sensoryAccommodations: [],
  veteranStatus: 'No',
  branch: '',
  discharge: '',
  vashStatus: '',
  emergencyContact: { name: 'Rosa Santos', phone: '(213) 555-0123', email: 'rosa.s@email.com' },
  householdComposition: ['Head of household', 'Child'],
  householdMembers: [
    { id: 'demo-hm-1', name: 'Maria Santos', memberType: 'Head of Household', startDate: '2026-05-13' },
    { id: 'demo-hm-2', name: 'Diego Santos', memberType: 'Son', startDate: '2026-05-13' },
  ],
  dateOfContact: '2026-05-13',
  currentLivingSituation: "Staying or living in a family member's room, apartment or house",
  locationDetails: 'Sister\'s apartment, Echo Park',
  leavingWithin14Days: 'Yes',
  subsequentResidenceIdentified: 'No',
  resourcesForHousing: 'No',
  leaseInLast60Days: 'No',
  movedTwiceIn60Days: 'Yes',
  rentalSubsidyType: '',
  priorLivingSituation: 'Staying with family',
  lengthOfStay: '1–3 months',
  firstTimeHomeless: 'No',
  timesHomelessPastYear: '2–3',
  timesHomelessPast3Years: '2–3',
  monthsHomelessPast3Years: '1–12 months',
  physicalDisability: 'No',
  chronicHealthCondition: 'Yes',
  hivAids: 'No',
  mentalHealthDisorder: 'No',
  substanceUse: 'No',
  survivorOfDV: 'Yes',
  dvHowLongAgo: '< 3 months',
  currentlyFleeing: 'Yes',
  currentlyEmployed: 'No',
  employmentType: '',
  cashIncomeSources: ['TANF / CalWORKs', 'SNAP / CalFresh'],
  cashIncomeOther: '',
  nonCashBenefits: ['SNAP / CalFresh', 'WIC'],
  nonCashOther: '',
  coveredByInsurance: 'Yes',
  insuranceTypes: ['Medicaid / Medi-Cal'],
  insuranceOther: '',
  highestEducation: 'High school',
  sexualOrientation: 'Heterosexual',
  sexualOrientationOther: '',
  livedOutsideLACounty: 'No',
  previousLocation: 'LA County',
  translationNeeded: 'Yes',
  preferredLanguage: 'Spanish',
  preferredLanguageOther: '',
}

// ---------- Empty profile ----------
const EMPTY_PROFILE: ClientProfile = {
  firstName: '',
  middleName: '',
  lastName: '',
  suffix: '',
  alias: '',
  nameQuality: '',
  dateOfBirth: '',
  dobQuality: '',
  ssn: '',
  ssnQuality: '',
  gender: [],
  genderOther: '',
  pronouns: '',
  sex: '',
  raceEthnicity: [],
  tribalAffiliation: '',
  primaryLanguage: '',
  primaryLanguageOther: '',
  hasDisability: '',
  needsMobilityAccommodations: '',
  mobilityFeatures: [],
  mobilityFeaturesOther: '',
  sensoryAccommodations: [],
  veteranStatus: '',
  branch: '',
  discharge: '',
  vashStatus: '',
  emergencyContact: { name: '', phone: '', email: '' },
  householdComposition: [],
  householdMembers: [],
  dateOfContact: '',
  currentLivingSituation: '',
  locationDetails: '',
  leavingWithin14Days: '',
  subsequentResidenceIdentified: '',
  resourcesForHousing: '',
  leaseInLast60Days: '',
  movedTwiceIn60Days: '',
  rentalSubsidyType: '',
  priorLivingSituation: '',
  lengthOfStay: '',
  firstTimeHomeless: '',
  timesHomelessPastYear: '',
  timesHomelessPast3Years: '',
  monthsHomelessPast3Years: '',
  physicalDisability: '',
  chronicHealthCondition: '',
  hivAids: '',
  mentalHealthDisorder: '',
  substanceUse: '',
  survivorOfDV: '',
  dvHowLongAgo: '',
  currentlyFleeing: '',
  currentlyEmployed: '',
  employmentType: '',
  cashIncomeSources: [],
  cashIncomeOther: '',
  nonCashBenefits: [],
  nonCashOther: '',
  coveredByInsurance: '',
  insuranceTypes: [],
  insuranceOther: '',
  highestEducation: '',
  sexualOrientation: '',
  sexualOrientationOther: '',
  livedOutsideLACounty: '',
  previousLocation: '',
  translationNeeded: '',
  preferredLanguage: '',
  preferredLanguageOther: '',
}

// ---------- Section config for nav ----------
const TOP_NAV: { id: string; label: string }[] = [
  { id: 'profile', label: 'Profile' },
  { id: 'assessments', label: 'Assessments' },
  { id: 'notes', label: 'Notes' },
]

const SECTIONS: { id: string; label: string }[] = [
  { id: 'profile', label: 'Client Profile' },
  { id: 'identity', label: 'Identity & Basic Info' },
  { id: 'gender', label: 'Gender & Identity' },
  { id: 'race', label: 'Race & Ethnicity' },
  { id: 'language', label: 'Language' },
  { id: 'disability', label: 'Disability & ADA' },
  { id: 'veteran', label: 'Veteran Status' },
  { id: 'contact', label: 'Contact & Household' },
  { id: 'current-living', label: 'Current Living Situation' },
  { id: 'living', label: 'Current Living Situation' },
  { id: 'homelessness', label: 'Homelessness History' },
  { id: 'health', label: 'Health & Conditions' },
  { id: 'dv', label: 'Domestic Violence / Safety' },
  { id: 'employment', label: 'Employment & Income' },
  { id: 'insurance', label: 'Health Insurance' },
  { id: 'education', label: 'Education' },
  { id: 'sexual-orientation', label: 'Sexual Orientation' },
  { id: 'geography', label: 'Geography' },
  { id: 'translation', label: 'Translation & Language Support' },
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

function MultiSelectDropdown<T extends string>({
  options,
  value,
  onChange,
  otherOption,
  otherValue,
  onOtherChange,
  className,
}: {
  options: T[]
  value: T[]
  onChange: (v: T[]) => void
  otherOption?: T
  otherValue?: string
  onOtherChange?: (v: string) => void
  className?: string
}) {
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = Array.from(e.target.selectedOptions, (opt) => opt.value as T)
    onChange(selected)
  }
  return (
    <div className="space-y-2">
      <select
        multiple
        value={value}
        onChange={handleChange}
        className={cn(
          'w-full min-h-[80px] rounded border border-slate-200 bg-slate-50 py-2 pl-3 pr-8 text-sm text-slate-900 focus:border-blue-500 focus:outline-none',
          className
        )}
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
      <p className="text-xs text-slate-500">Hold Ctrl (Windows) or Cmd (Mac) to select multiple.</p>
      {otherOption && value.includes(otherOption) && onOtherChange !== undefined && (
        <input
          type="text"
          value={otherValue ?? ''}
          onChange={(e) => onOtherChange(e.target.value)}
          placeholder="Specify"
          className="w-full border-0 border-b border-slate-300 bg-transparent px-0 py-2 text-sm placeholder:text-slate-400 focus:border-blue-500 focus:outline-none"
        />
      )}
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
  validationErrors,
}: {
  profile: ClientProfile
  status: ProfileStatus
  onSave: () => void
  onReset: () => void
  onLoadDemo: () => void
  validationErrors: string[]
}) {
  const displayName = [profile.firstName, profile.lastName].filter(Boolean).join(' ') || 'New client'
  return (
    <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 bg-white px-6 py-3 shadow-sm">
      <div className="flex items-center gap-3">
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
                onClick={() => onSectionChange(s.id)}
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

function validateProfile(p: ClientProfile): string[] {
  const errs: string[] = []
  if (!p.firstName?.trim()) errs.push('First name')
  if (!p.lastName?.trim()) errs.push('Last name')
  if (!p.dateOfBirth?.trim()) errs.push('Date of birth')
  if (!p.nameQuality) errs.push('Name quality')
  if (!p.dobQuality) errs.push('DOB quality')
  return errs
}

// ---------- Main App ----------
export default function App() {
  const [clientProfile, setClientProfile] = useState<ClientProfile>(() => ({ ...EMPTY_PROFILE, dateOfContact: todayISO() }))
  const [profileStatus, setProfileStatus] = useState<ProfileStatus>('Draft')
  const [jsonPreviewOpen, setJsonPreviewOpen] = useState(false)
  const [saved, setSaved] = useState(false)
  const [currentSectionId, setCurrentSectionId] = useState('profile')
  const [memberModalOpen, setMemberModalOpen] = useState(false)
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null)

  const update = useCallback(<K extends keyof ClientProfile>(key: K, value: ClientProfile[K]) => {
    setClientProfile((prev) => ({ ...prev, [key]: value }))
  }, [])

  const updateEmergency = useCallback((field: keyof EmergencyContact, value: string) => {
    setClientProfile((prev) => ({
      ...prev,
      emergencyContact: { ...prev.emergencyContact, [field]: value },
    }))
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
    if (validateProfile(clientProfile).length > 0) return
    setProfileStatus('Complete')
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }, [clientProfile])

  const handleReset = useCallback(() => {
    setClientProfile({ ...EMPTY_PROFILE, dateOfContact: todayISO() })
    setProfileStatus('Draft')
  }, [])

  const handleLoadDemo = useCallback(() => {
    setClientProfile({ ...DEMO_PROFILE })
    setProfileStatus('Draft')
  }, [])

  const errors = validateProfile(clientProfile)

  const nameQualityOptions: NameQuality[] = ['Full name reported', 'Partial / street name / code name', "Client doesn't know", 'Client prefers not to answer', 'Data not collected']
  const dobQualityOptions: DOBQuality[] = ['Full DOB reported', 'Approximate / partial', "Client doesn't know", 'Client prefers not to answer', 'Data not collected']
  const ssnQualityOptions: SSNQuality[] = ['Full SSN', 'Approximate / partial', "Client doesn't know", 'Client prefers not to answer', 'Data not collected']
  const genderOptions: GenderOption[] = ['Woman / Girl', 'Man / Boy', 'Culturally specific identity (e.g., Two-Spirit)', 'Transgender', 'Non-Binary', 'Questioning', 'Different identity (specify)', "Client doesn't know", 'Client prefers not to answer', 'Data not collected']
  const sexOptions: SexOption[] = ['Female', 'Male', "Client doesn't know", 'Client prefers not to answer', 'Data not collected']
  const raceOptions: RaceEthnicityOption[] = ['American Indian / Alaska Native / Indigenous', 'Asian / Asian American', 'Black / African American / African', 'Native Hawaiian / Pacific Islander', 'White', 'Hispanic/Latina/o', 'Middle Eastern / North African', "Client doesn't know", 'Client prefers not to answer', 'Data not collected']
  const primaryLangOptions: PrimaryLanguageOption[] = ['English', 'Spanish', 'French', 'Italian', 'German', 'Greek', 'Polish', 'Portuguese', 'Russian', 'Swedish', 'American Sign Language', 'Other (specify)', "Client doesn't know", 'Client prefers not to answer']
  const veteranOptions: VeteranStatusOption[] = ['Yes', 'No', "Don't know", 'Prefer not to answer', 'Data not collected']
  const branchOptions: BranchOption[] = ['Army', 'Air Force', 'Navy', 'Marines', 'Coast Guard', 'Space Force']
  const dischargeOptions: DischargeOption[] = ['Honorable', 'General', 'Other than honorable', 'Bad conduct', 'Dishonorable', 'Uncharacterized']
  const vashOptions: VASHStatusOption[] = ['Admitted', 'Needs screening', 'Interested list', 'Vouchered', 'Various ineligible reasons']
  const yesNoDk: YesNoDkRefused[] = ['Yes', 'No', "Don't know", 'Prefer not to answer', 'Refused', 'Data not collected']
  const substanceOptions: SubstanceUseOption[] = ['No', 'Alcohol', 'Drug', 'Both']
  const dvHowLongOptions: DVHowLongAgoOption[] = ['< 3 months', '3–6 months', '6–12 months', '1+ year']
  const employmentTypeOptions: EmploymentTypeOption[] = ['Full-time', 'Part-time', 'Seasonal / day labor']
  const cashIncomeOpts = ['Earned income', 'SSI', 'SSDI', 'Unemployment', 'TANF / CalWORKs', 'GA/GR', 'Pension', 'Child support', 'VA benefits', 'Other']
  const nonCashOpts = ['SNAP / CalFresh', 'WIC', 'CalWORKs services', 'Other']
  const insuranceTypeOpts = ['Medicaid / Medi-Cal', 'Medicare', 'VA', 'Employer insurance', 'Private', 'COBRA', 'Other']
  const educationOptions: EducationOption[] = ['< Grade 5', 'Grades 5–6', 'Grades 7–8', 'Grades 9–11', 'High school', 'GED', 'Some college', 'Associate', 'Bachelor', 'Graduate', 'Vocational cert']
  const sexualOrientationOptions: SexualOrientationOption[] = ['Heterosexual', 'Gay', 'Lesbian', 'Bisexual', 'Questioning', 'Other', "Don't know", 'Refused']
  const geographyOptions: GeographyLocationOption[] = ['LA County', 'Other Southern CA', 'Other CA', 'Out of state', 'Outside U.S.']
  const preferredLangOptions: PreferredLanguageOption[] = ['English', 'Spanish', 'Russian', 'French', 'Armenian', 'ASL', 'Portuguese', 'Chinese', 'Korean', 'Arabic', 'Other']
  const householdOptions: HouseholdRelationOption[] = ['Head of household', 'Child', 'Spouse/partner', 'Other relation', 'Non-relation']
  const mobilityOptions = ['Elevator / no stairs', 'Wheelchair accessible', 'Accessible tub/shower', 'Oxygen tank', 'Service animal', 'Other']
  const sensoryOptions = ['Vision impairment', 'Hearing impairment']
  const suffixOptions: SuffixOption[] = ['None', 'Jr.', 'Sr.', 'II', 'III', 'IV', 'V', 'MD', 'PhD', 'Other']

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
      <ProfileHeader profile={clientProfile} status={profileStatus} onSave={handleSave} onReset={handleReset} onLoadDemo={handleLoadDemo} validationErrors={errors} />
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
            {/* Client Profile overview */}
            <SectionCard id="profile" title="Client Profile">
              <p className="text-sm text-slate-600">
                {clientProfile.firstName || clientProfile.lastName
                  ? `Profile for ${[clientProfile.firstName, clientProfile.lastName].filter(Boolean).join(' ')}. Complete the sections below.`
                  : 'New client intake. Complete each section to build the client profile.'}
              </p>
            </SectionCard>

            <SectionCard id="identity" title="Identity & Basic Info">
              <FormField label="Social Security Number">
                <div className="flex items-center gap-1">
                  <input type="text" inputMode="numeric" maxLength={3} value={ssnParts[0]} onChange={(e) => setSsnParts(e.target.value, ssnParts[1], ssnParts[2])} className={cn(inputBase, 'w-16 text-center')} placeholder="000" />
                  <span className="text-slate-400">-</span>
                  <input type="text" inputMode="numeric" maxLength={2} value={ssnParts[1]} onChange={(e) => setSsnParts(ssnParts[0], e.target.value, ssnParts[2])} className={cn(inputBase, 'w-12 text-center')} placeholder="00" />
                  <span className="text-slate-400">-</span>
                  <input type="text" inputMode="numeric" maxLength={4} value={ssnParts[2]} onChange={(e) => setSsnParts(ssnParts[0], ssnParts[1], e.target.value)} className={cn(inputBase, 'w-20 text-center')} placeholder="0000" />
                </div>
              </FormField>
              <FormField label="Quality of SSN">
                <select value={clientProfile.ssnQuality} onChange={(e) => update('ssnQuality', e.target.value as SSNQuality | '')} className={selectBase}>
                  <option value="">Data not collected</option>
                  {ssnQualityOptions.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </FormField>
              <FormField label="Last Name" required error={!clientProfile.lastName?.trim() ? 'Required' : undefined}>
                <input type="text" value={clientProfile.lastName} onChange={(e) => update('lastName', e.target.value)} className={inputBase} placeholder="Last name" />
              </FormField>
              <FormField label="First Name" required error={!clientProfile.firstName?.trim() ? 'Required' : undefined}>
                <input type="text" value={clientProfile.firstName} onChange={(e) => update('firstName', e.target.value)} className={inputBase} placeholder="First name" />
              </FormField>
              <FormField label="Quality of Name" required error={!clientProfile.nameQuality ? 'Required' : undefined}>
                <select value={clientProfile.nameQuality} onChange={(e) => update('nameQuality', e.target.value as NameQuality | '')} className={selectBase}>
                  <option value="">Select</option>
                  {nameQualityOptions.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </FormField>
              <FormField label="Quality of DOB" required error={!clientProfile.dobQuality ? 'Required' : undefined}>
                <select value={clientProfile.dobQuality} onChange={(e) => update('dobQuality', e.target.value as DOBQuality | '')} className={selectBase}>
                  <option value="">Select</option>
                  {dobQualityOptions.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </FormField>
              <FormField label="Date of Birth" required error={!clientProfile.dateOfBirth ? 'Required' : undefined}>
                <input type="date" value={clientProfile.dateOfBirth} onChange={(e) => update('dateOfBirth', e.target.value)} className={inputBase} />
              </FormField>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,180px)_1fr] sm:gap-6">
                <label className="flex items-center text-sm font-medium text-slate-800">Middle Name</label>
                <div className="flex gap-4">
                  <input type="text" value={clientProfile.middleName} onChange={(e) => update('middleName', e.target.value)} className={cn(inputBase, 'flex-1')} placeholder="Middle name" />
                  <div className="w-28 shrink-0">
                    <label className="mb-1 block text-xs font-medium text-slate-500">Suffix</label>
                    <select value={clientProfile.suffix || 'None'} onChange={(e) => update('suffix', e.target.value as SuffixOption | '')} className={selectBase}>
                      {suffixOptions.map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                </div>
              </div>
              <FormField label="Alias">
                <input type="text" value={clientProfile.alias} onChange={(e) => update('alias', e.target.value)} className={inputBase} placeholder="Alias" />
              </FormField>
            </SectionCard>

          <SectionCard id="gender" title="Gender & Identity">
            <FormField label="Gender (multi-select)">
              <MultiSelectDropdown options={genderOptions} value={clientProfile.gender} onChange={(v) => update('gender', v)} otherOption="Different identity (specify)" otherValue={clientProfile.genderOther} onOtherChange={(v) => update('genderOther', v)} />
            </FormField>
            <FormField label="Pronouns">
              <input type="text" value={clientProfile.pronouns} onChange={(e) => update('pronouns', e.target.value)} className={inputBase} placeholder="e.g. she/her, they/them" />
            </FormField>
            <FormField label="Sex (funding field)">
              <select value={clientProfile.sex} onChange={(e) => update('sex', e.target.value as SexOption | '')} className={cn(selectBase, 'max-w-xs')}>
                <option value="">Select</option>
                {sexOptions.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </FormField>
          </SectionCard>

          <SectionCard id="race" title="Race & Ethnicity">
            <FormField label="Race / Ethnicity (multi-select)">
              <MultiSelectDropdown options={raceOptions} value={clientProfile.raceEthnicity} onChange={(v) => update('raceEthnicity', v)} />
            </FormField>
            {clientProfile.raceEthnicity.some((r) => r.includes('American Indian') || r.includes('Alaska Native') || r.includes('Indigenous')) && (
              <FormField label="Tribal Affiliation">
                <input type="text" value={clientProfile.tribalAffiliation} onChange={(e) => update('tribalAffiliation', e.target.value)} className={inputBase} placeholder="If AI/AN" />
              </FormField>
            )}
          </SectionCard>

          <SectionCard id="language" title="Language">
            <FormField label="Primary Language">
              <select value={clientProfile.primaryLanguage} onChange={(e) => update('primaryLanguage', e.target.value as PrimaryLanguageOption | '')} className={cn(selectBase, 'max-w-xs')}>
                <option value="">Select</option>
                {primaryLangOptions.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </FormField>
            {clientProfile.primaryLanguage === 'Other (specify)' && (
              <FormField label="Other language">
                <input type="text" value={clientProfile.primaryLanguageOther} onChange={(e) => update('primaryLanguageOther', e.target.value)} className={cn(inputBase, 'max-w-xs')} />
              </FormField>
            )}
          </SectionCard>

          <SectionCard id="disability" title="Disability & ADA">
            <FormField label="Has any disability">
              <select value={clientProfile.hasDisability} onChange={(e) => update('hasDisability', e.target.value as 'Yes' | 'No' | '')} className={cn(selectBase, 'max-w-xs')}>
                <option value="">Select</option>
                <option value="Yes">Yes</option>
                <option value="No">No</option>
              </select>
            </FormField>
            <FormField label="Needs mobility accommodations">
              <select value={clientProfile.needsMobilityAccommodations} onChange={(e) => update('needsMobilityAccommodations', e.target.value as 'Yes' | 'No' | '')} className={cn(selectBase, 'max-w-xs')}>
                <option value="">Select</option>
                <option value="Yes">Yes</option>
                <option value="No">No</option>
              </select>
            </FormField>
            <FormField label="Mobility features (multi-select)">
              <MultiSelectDropdown options={mobilityOptions} value={clientProfile.mobilityFeatures} onChange={(v) => update('mobilityFeatures', v)} otherOption="Other" otherValue={clientProfile.mobilityFeaturesOther} onOtherChange={(v) => update('mobilityFeaturesOther', v)} />
            </FormField>
            <FormField label="Sensory accommodations (multi-select)">
              <MultiSelectDropdown options={sensoryOptions} value={clientProfile.sensoryAccommodations} onChange={(v) => update('sensoryAccommodations', v)} />
            </FormField>
          </SectionCard>

          <SectionCard id="veteran" title="Veteran Status">
            <FormField label="Veteran Status">
              <select value={clientProfile.veteranStatus} onChange={(e) => update('veteranStatus', e.target.value as VeteranStatusOption | '')} className={cn(selectBase, 'max-w-xs')}>
                <option value="">Select</option>
                {veteranOptions.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </FormField>
            {clientProfile.veteranStatus === 'Yes' && (
              <>
                <FormField label="Branch">
                  <select value={clientProfile.branch} onChange={(e) => update('branch', e.target.value as BranchOption | '')} className={cn(selectBase, 'max-w-xs')}>
                    <option value="">Select</option>
                    {branchOptions.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                </FormField>
                <FormField label="Discharge">
                  <select value={clientProfile.discharge} onChange={(e) => update('discharge', e.target.value as DischargeOption | '')} className={cn(selectBase, 'max-w-xs')}>
                    <option value="">Select</option>
                    {dischargeOptions.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                </FormField>
                <FormField label="VASH Status">
                  <select value={clientProfile.vashStatus} onChange={(e) => update('vashStatus', e.target.value as VASHStatusOption | '')} className={cn(selectBase, 'max-w-xs')}>
                    <option value="">Select</option>
                    {vashOptions.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                </FormField>
              </>
            )}
          </SectionCard>

          <SectionCard id="contact" title="Contact & Household">
            <FormField label="Emergency contact name">
              <input type="text" value={clientProfile.emergencyContact.name} onChange={(e) => updateEmergency('name', e.target.value)} className={inputBase} />
            </FormField>
            <FormField label="Phone">
              <input type="text" value={clientProfile.emergencyContact.phone} onChange={(e) => updateEmergency('phone', e.target.value)} className={inputBase} />
            </FormField>
            <FormField label="Email">
              <input type="email" value={clientProfile.emergencyContact.email} onChange={(e) => updateEmergency('email', e.target.value)} className={inputBase} />
            </FormField>
            <FormField label="Household composition (multi-select)">
              <MultiSelectDropdown options={householdOptions} value={clientProfile.householdComposition} onChange={(v) => update('householdComposition', v)} />
            </FormField>

            <div className="border-t border-slate-200 pt-5">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-800">Household Members</h3>
                <button
                  type="button"
                  onClick={openAddMember}
                  aria-label="Add Household Member"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Household Member
                </button>
              </div>
              {clientProfile.householdMembers.length === 0 ? (
                <p className="rounded border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-xs text-slate-500">
                  No household members added.
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
                        <p className="text-sm font-medium text-slate-900">{m.name || <span className="italic text-slate-400">Unnamed</span>}</p>
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
            </div>
          </SectionCard>

          <SectionCard id="homelessness" title="Homelessness History">
            <FormField label="First time homeless">
              <select value={clientProfile.firstTimeHomeless} onChange={(e) => update('firstTimeHomeless', e.target.value as YesNoDkRefused | '')} className={cn(selectBase, 'max-w-xs')}>
                <option value="">Select</option>
                {yesNoDk.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </FormField>
            <FormField label="Times homeless (past year)">
              <select value={clientProfile.timesHomelessPastYear} onChange={(e) => update('timesHomelessPastYear', e.target.value)} className={selectBase}>
                <option value="">Select</option>
                {['None', '1', '2–3', '4+'].map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </FormField>
            <FormField label="Times homeless (past 3 years)">
              <select value={clientProfile.timesHomelessPast3Years} onChange={(e) => update('timesHomelessPast3Years', e.target.value)} className={selectBase}>
                <option value="">Select</option>
                {['None', '1', '2–3', '4+'].map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </FormField>
            <FormField label="Months homeless (past 3 years)">
              <select value={clientProfile.monthsHomelessPast3Years} onChange={(e) => update('monthsHomelessPast3Years', e.target.value)} className={selectBase}>
                <option value="">Select</option>
                <option value="1–12 months">1–12 months</option>
                <option value="More than 12">More than 12</option>
              </select>
            </FormField>
          </SectionCard>

          <SectionCard id="health" title="Health & Conditions">
            <FormField label="Physical disability">
              <select value={clientProfile.physicalDisability} onChange={(e) => update('physicalDisability', e.target.value as YesNoDkRefused | '')} className={cn(selectBase, 'max-w-xs')}>
                <option value="">Select</option>
                {yesNoDk.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </FormField>
            <FormField label="Chronic health condition">
              <select value={clientProfile.chronicHealthCondition} onChange={(e) => update('chronicHealthCondition', e.target.value as YesNoDkRefused | '')} className={cn(selectBase, 'max-w-xs')}>
                <option value="">Select</option>
                {yesNoDk.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </FormField>
            <FormField label="HIV/AIDS">
              <select value={clientProfile.hivAids} onChange={(e) => update('hivAids', e.target.value as YesNoDkRefused | '')} className={cn(selectBase, 'max-w-xs')}>
                <option value="">Select</option>
                {yesNoDk.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </FormField>
            <FormField label="Mental health disorder">
              <select value={clientProfile.mentalHealthDisorder} onChange={(e) => update('mentalHealthDisorder', e.target.value as YesNoDkRefused | '')} className={cn(selectBase, 'max-w-xs')}>
                <option value="">Select</option>
                {yesNoDk.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </FormField>
            <FormField label="Substance use">
              <select value={clientProfile.substanceUse} onChange={(e) => update('substanceUse', e.target.value as SubstanceUseOption | '')} className={cn(selectBase, 'max-w-xs')}>
                <option value="">Select</option>
                {substanceOptions.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </FormField>
          </SectionCard>

          <SectionCard id="dv" title="Domestic Violence / Safety">
            <FormField label="Survivor of DV / IPV">
              <select value={clientProfile.survivorOfDV} onChange={(e) => update('survivorOfDV', e.target.value as YesNoDkRefused | '')} className={cn(selectBase, 'max-w-xs')}>
                <option value="">Select</option>
                {yesNoDk.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </FormField>
            {clientProfile.survivorOfDV === 'Yes' && (
              <>
                <FormField label="How long ago">
                  <select value={clientProfile.dvHowLongAgo} onChange={(e) => update('dvHowLongAgo', e.target.value as DVHowLongAgoOption | '')} className={cn(selectBase, 'max-w-xs')}>
                    <option value="">Select</option>
                    {dvHowLongOptions.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                </FormField>
                <FormField label="Currently fleeing">
                  <select value={clientProfile.currentlyFleeing} onChange={(e) => update('currentlyFleeing', e.target.value as 'Yes' | 'No' | '')} className={cn(selectBase, 'max-w-xs')}>
                    <option value="">Select</option>
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
                  </select>
                </FormField>
              </>
            )}
          </SectionCard>

          <SectionCard id="employment" title="Employment & Income">
            <FormField label="Currently employed">
              <select value={clientProfile.currentlyEmployed} onChange={(e) => update('currentlyEmployed', e.target.value as YesNoDkRefused | '')} className={cn(selectBase, 'max-w-xs')}>
                <option value="">Select</option>
                {yesNoDk.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </FormField>
            {clientProfile.currentlyEmployed === 'Yes' && (
              <FormField label="Employment type">
                <select value={clientProfile.employmentType} onChange={(e) => update('employmentType', e.target.value as EmploymentTypeOption | '')} className={cn(selectBase, 'max-w-xs')}>
                  <option value="">Select</option>
                  {employmentTypeOptions.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </FormField>
            )}
            <FormField label="Cash income sources (multi-select)">
              <MultiSelectDropdown options={cashIncomeOpts} value={clientProfile.cashIncomeSources} onChange={(v) => update('cashIncomeSources', v)} otherOption="Other" otherValue={clientProfile.cashIncomeOther} onOtherChange={(v) => update('cashIncomeOther', v)} />
            </FormField>
            <FormField label="Non-cash benefits (multi-select)">
              <MultiSelectDropdown options={nonCashOpts} value={clientProfile.nonCashBenefits} onChange={(v) => update('nonCashBenefits', v)} otherOption="Other" otherValue={clientProfile.nonCashOther} onOtherChange={(v) => update('nonCashOther', v)} />
            </FormField>
          </SectionCard>

          <SectionCard id="insurance" title="Health Insurance">
            <FormField label="Covered by insurance">
              <select value={clientProfile.coveredByInsurance} onChange={(e) => update('coveredByInsurance', e.target.value as YesNoDkRefused | '')} className={cn(selectBase, 'max-w-xs')}>
                <option value="">Select</option>
                {yesNoDk.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </FormField>
            <FormField label="Types (multi-select)">
              <MultiSelectDropdown options={insuranceTypeOpts} value={clientProfile.insuranceTypes} onChange={(v) => update('insuranceTypes', v)} otherOption="Other" otherValue={clientProfile.insuranceOther} onOtherChange={(v) => update('insuranceOther', v)} />
            </FormField>
          </SectionCard>

          <SectionCard id="education" title="Education">
            <FormField label="Highest education">
              <select value={clientProfile.highestEducation} onChange={(e) => update('highestEducation', e.target.value as EducationOption | '')} className={cn(selectBase, 'max-w-xs')}>
                <option value="">Select</option>
                {educationOptions.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </FormField>
          </SectionCard>

          <SectionCard id="sexual-orientation" title="Sexual Orientation">
            <FormField label="Sexual orientation">
              <select value={clientProfile.sexualOrientation} onChange={(e) => update('sexualOrientation', e.target.value as SexualOrientationOption | '')} className={cn(selectBase, 'max-w-xs')}>
                <option value="">Select</option>
                {sexualOrientationOptions.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </FormField>
            {clientProfile.sexualOrientation === 'Other' && (
              <FormField label="Other (specify)">
                <input type="text" value={clientProfile.sexualOrientationOther} onChange={(e) => update('sexualOrientationOther', e.target.value)} className={cn(inputBase, 'max-w-xs')} />
              </FormField>
            )}
          </SectionCard>

          <SectionCard id="geography" title="Geography">
            <FormField label="Lived outside LA County">
              <select value={clientProfile.livedOutsideLACounty} onChange={(e) => update('livedOutsideLACounty', e.target.value as 'Yes' | 'No' | '')} className={cn(selectBase, 'max-w-xs')}>
                <option value="">Select</option>
                <option value="Yes">Yes</option>
                <option value="No">No</option>
              </select>
            </FormField>
            {clientProfile.livedOutsideLACounty === 'Yes' && (
              <FormField label="Previous location">
                <select value={clientProfile.previousLocation} onChange={(e) => update('previousLocation', e.target.value as GeographyLocationOption | '')} className={cn(selectBase, 'max-w-xs')}>
                  <option value="">Select</option>
                  {geographyOptions.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </FormField>
            )}
          </SectionCard>

          <SectionCard id="translation" title="Translation & Language Support">
            <FormField label="Translation needed">
              <select value={clientProfile.translationNeeded} onChange={(e) => update('translationNeeded', e.target.value as 'Yes' | 'No' | '')} className={cn(selectBase, 'max-w-xs')}>
                <option value="">Select</option>
                <option value="Yes">Yes</option>
                <option value="No">No</option>
              </select>
            </FormField>
            <FormField label="Preferred language">
              <select value={clientProfile.preferredLanguage} onChange={(e) => update('preferredLanguage', e.target.value as PreferredLanguageOption | '')} className={cn(selectBase, 'max-w-xs')}>
                <option value="">Select</option>
                {preferredLangOptions.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </FormField>
            {clientProfile.preferredLanguage === 'Other' && (
              <FormField label="Other language">
                <input type="text" value={clientProfile.preferredLanguageOther} onChange={(e) => update('preferredLanguageOther', e.target.value)} className={cn(inputBase, 'max-w-xs')} />
              </FormField>
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
            <SectionCard id="current-living" title="Current Living Situation">
              <FormField label="Date of Contact">
                <input
                  type="date"
                  name="date-of-contact"
                  aria-label="Date of Contact"
                  value={clientProfile.dateOfContact}
                  onChange={(e) => update('dateOfContact', e.target.value)}
                  className={cn(inputBase, 'max-w-xs')}
                />
              </FormField>
              <FormField label="Current Living Situation">
                <select
                  name="current-living-situation"
                  aria-label="Current Living Situation"
                  value={clientProfile.currentLivingSituation}
                  onChange={(e) => update('currentLivingSituation', e.target.value as CurrentLivingSituationOption | '')}
                  className={selectBase}
                >
                  <option value="">Select</option>
                  {CURRENT_LIVING_SITUATION_OPTIONS.map((o) => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
              </FormField>
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

              {clientProfile.currentLivingSituation === 'Rental by client, with ongoing housing subsidy' && (
                <FormField label="Rental Subsidy Type">
                  <select
                    name="rental-subsidy-type"
                    aria-label="Rental Subsidy Type"
                    value={clientProfile.rentalSubsidyType}
                    onChange={(e) => update('rentalSubsidyType', e.target.value as RentalSubsidyTypeOption | '')}
                    className={cn(selectBase, 'max-w-xs')}
                  >
                    <option value="">Select</option>
                    {RENTAL_SUBSIDY_TYPE_OPTIONS.map((o) => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </select>
                </FormField>
              )}

              {TEMP_OR_PERM_HOUSING_OPTIONS.includes(clientProfile.currentLivingSituation as CurrentLivingSituationOption) && (
                <>
                  <FormField label="Leaving within 14 days?">
                    <select
                      name="leaving-within-14-days"
                      aria-label="Is client going to have to leave their current living situation within 14 days?"
                      value={clientProfile.leavingWithin14Days}
                      onChange={(e) => update('leavingWithin14Days', e.target.value as YesNoOption)}
                      className={cn(selectBase, 'max-w-xs')}
                    >
                      <option value="">Select</option>
                      <option value="Yes">Yes</option>
                      <option value="No">No</option>
                    </select>
                  </FormField>
                  <FormField label="Subsequent residence identified?">
                    <select
                      name="subsequent-residence-identified"
                      aria-label="Has a subsequent residence been identified?"
                      value={clientProfile.subsequentResidenceIdentified}
                      onChange={(e) => update('subsequentResidenceIdentified', e.target.value as YesNoOption)}
                      className={cn(selectBase, 'max-w-xs')}
                    >
                      <option value="">Select</option>
                      <option value="Yes">Yes</option>
                      <option value="No">No</option>
                    </select>
                  </FormField>
                  <FormField label="Resources for permanent housing?">
                    <select
                      name="resources-for-housing"
                      aria-label="Does individual or family have resources or support networks to obtain other permanent housing?"
                      value={clientProfile.resourcesForHousing}
                      onChange={(e) => update('resourcesForHousing', e.target.value as YesNoOption)}
                      className={cn(selectBase, 'max-w-xs')}
                    >
                      <option value="">Select</option>
                      <option value="Yes">Yes</option>
                      <option value="No">No</option>
                    </select>
                  </FormField>
                  <FormField label="Lease in last 60 days?">
                    <select
                      name="lease-in-last-60-days"
                      aria-label="Has the client had a lease or ownership interest in a permanent housing unit in the last 60 days?"
                      value={clientProfile.leaseInLast60Days}
                      onChange={(e) => update('leaseInLast60Days', e.target.value as YesNoOption)}
                      className={cn(selectBase, 'max-w-xs')}
                    >
                      <option value="">Select</option>
                      <option value="Yes">Yes</option>
                      <option value="No">No</option>
                    </select>
                  </FormField>
                  <FormField label="Moved 2+ times in last 60 days?">
                    <select
                      name="moved-twice-in-60-days"
                      aria-label="Has the client moved 2 or more times in the last 60 days?"
                      value={clientProfile.movedTwiceIn60Days}
                      onChange={(e) => update('movedTwiceIn60Days', e.target.value as YesNoOption)}
                      className={cn(selectBase, 'max-w-xs')}
                    >
                      <option value="">Select</option>
                      <option value="Yes">Yes</option>
                      <option value="No">No</option>
                    </select>
                  </FormField>
                </>
              )}
            </SectionCard>
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
              <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                  <h3 className="text-sm font-semibold text-slate-800">Household Members</h3>
                  <button
                    type="button"
                    onClick={() => setCurrentSectionId('household')}
                    aria-label="Manage household"
                    className="rounded border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Manage
                  </button>
                </div>
                <div className="px-4 py-3">
                  {clientProfile.householdMembers.length === 0 ? (
                    <p className="text-xs text-slate-500">No active members</p>
                  ) : (
                    <ul className="space-y-2">
                      {clientProfile.householdMembers.map((m) => (
                        <li key={m.id} className="text-xs">
                          <p className="font-medium text-slate-800">{m.name || 'Unnamed'}</p>
                          <p className="text-slate-500">{m.memberType || '—'}</p>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </aside>
          )}
          </div>
          </form>
        </main>
      </div>

      {/* Mobile section nav */}
      <div className="border-t border-slate-200 bg-white px-4 py-3 lg:hidden">
        <label className="block text-xs font-medium text-slate-500">Jump to section</label>
        <select className="mt-1 w-full rounded border border-slate-200 bg-slate-50 px-3 py-2 text-sm" onChange={(e) => { const id = e.target.value; if (id) { setCurrentSectionId(id); document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }); } }}>
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
