export type ClaimStatus = 'submitted' | 'in_review' | 'follow_up' | 'denied' | 'paid'
export type Claim = {
  id: number
  reference: string
  practice: number
  practice_name: string
  payer: string
  procedure: string
  submitted_at: string
  billed_amount: string
  expected_amount: string
  patient_responsibility: string
  status: ClaimStatus
  denial_reason: string
  follow_up_note: string
  age_days: number
}
export type Practice = {
  id: number; name: string; region: string; locations: number; stage: 'live' | 'onboarding' | 'at_risk'
  mrr: string; products: string[]; next_step: string; claim_count: number
}
export type Product = { id: number; name: string; category: string; description: string; monthly_price: string; active_accounts: number }
export type Opportunity = {
  id: number; practice: number; practice_name: string; product: number; product_name: string
  stage: string; value: string; owner: string; due_date: string; note: string
}
export type Overview = {
  claim_count: number; open_claims: number; denied_claims: number; over_30_days: number
  expected_reimbursement: string; practice_count: number; pipeline_value: string; status_counts: Record<string, number>
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  })
  if (!response.ok) {
    const detail = await response.text()
    throw new Error(detail || `Request failed (${response.status})`)
  }
  return response.json() as Promise<T>
}

// GitHub Pages has no Django process. In that build, use the same fictional
// seed records in memory so visitors can explore the interface without a server.
const demoMode = import.meta.env.VITE_DEMO_MODE === 'true'
const today = new Date()
const isoDate = (offset: number) => {
  const date = new Date(today)
  date.setDate(date.getDate() - offset)
  return date.toISOString().slice(0, 10)
}
const futureDate = (offset: number) => {
  const date = new Date(today)
  date.setDate(date.getDate() + offset)
  return date.toISOString().slice(0, 10)
}

const demoProducts: Product[] = [
  { id: 1, name: 'Claims Assist', category: 'Revenue cycle', description: 'Claim scrubbing and submission visibility', monthly_price: '349.00', active_accounts: 18 },
  { id: 2, name: 'Eligibility Check', category: 'Patient access', description: 'Coverage checks before the visit', monthly_price: '189.00', active_accounts: 24 },
  { id: 3, name: 'Patient Pay', category: 'Collections', description: 'Digital statements and flexible payment plans', monthly_price: '129.00', active_accounts: 11 },
]
const demoPractices: Practice[] = [
  { id: 1, name: 'Northstar Dental Group', region: 'Midwest', locations: 8, stage: 'live', mrr: '4280.00', products: ['Claims Assist', 'Eligibility Check'], next_step: 'Review aging trend with billing lead', claim_count: 3 },
  { id: 2, name: 'Juniper Family Dentistry', region: 'Great Lakes', locations: 3, stage: 'onboarding', mrr: '980.00', products: ['Eligibility Check'], next_step: 'Complete payer enrollment checklist', claim_count: 2 },
  { id: 3, name: 'Brightline Smiles', region: 'Southeast', locations: 5, stage: 'at_risk', mrr: '2140.00', products: ['Claims Assist', 'Patient Pay'], next_step: 'Schedule collections workflow review', claim_count: 2 },
  { id: 4, name: 'Cedar Grove Dental Partners', region: 'Midwest', locations: 2, stage: 'live', mrr: '1675.00', products: ['Claims Assist'], next_step: 'Introduce patient payment plans', claim_count: 2 },
  { id: 5, name: 'Harborview Dentistry', region: 'Northeast', locations: 4, stage: 'live', mrr: '3250.00', products: ['Eligibility Check', 'Patient Pay'], next_step: 'Share quarterly performance recap', claim_count: 1 },
]
const demoRows: Array<[number, string, string, number, ClaimStatus, number, number, number, string, string]> = [
  [0, 'Delta Dental', 'D2740 · Crown', 34, 'follow_up', 1240, 890, 180, 'Narrative requested', 'Attach clinical narrative and resubmit'],
  [0, 'Aetna Dental', 'D1110 · Prophylaxis', 8, 'in_review', 186, 132, 54, '', 'Payer review in progress'],
  [1, 'Cigna Dental', 'D2392 · Resin, 2 surfaces', 47, 'denied', 328, 236, 92, 'Frequency limitation', 'Confirm prior service history'],
  [2, 'MetLife Dental', 'D4341 · Periodontal scaling', 22, 'follow_up', 890, 622, 110, '', 'Check attachment receipt with payer'],
  [3, 'Guardian Dental', 'D0120 · Periodic exam', 12, 'submitted', 148, 104, 44, '', 'Awaiting payer acknowledgement'],
  [4, 'Delta Dental', 'D2950 · Core buildup', 56, 'denied', 415, 292, 80, 'Documentation incomplete', 'Request chart note from practice'],
  [0, 'United Concordia', 'D2740 · Crown', 18, 'in_review', 1320, 940, 190, '', 'Payer review in progress'],
  [1, 'Aetna Dental', 'D0140 · Limited exam', 5, 'paid', 112, 79, 33, '', 'Payment posted'],
  [2, 'Cigna Dental', 'D4341 · Periodontal scaling', 39, 'follow_up', 760, 535, 120, 'X-ray attachment missing', 'Upload current radiographs'],
  [3, 'MetLife Dental', 'D2391 · Resin, 1 surface', 15, 'submitted', 205, 144, 61, '', 'Awaiting payer acknowledgement'],
]
let demoClaims: Claim[] = demoRows.map(([practiceIndex, payer, procedure, age, status, billed, expected, responsibility, denial, note], index) => ({
  id: index + 1, reference: `MF-${today.getFullYear()}-${String(index + 1).padStart(4, '0')}`,
  practice: practiceIndex + 1, practice_name: demoPractices[practiceIndex].name, payer, procedure,
  submitted_at: isoDate(age), billed_amount: String(billed), expected_amount: String(expected),
  patient_responsibility: String(responsibility), status, denial_reason: denial, follow_up_note: note, age_days: age,
}))
const demoOpportunities: Opportunity[] = [
  { id: 1, practice: 2, practice_name: demoPractices[1].name, product: 1, product_name: demoProducts[0].name, stage: 'pilot', value: '1047.00', owner: 'Morgan Lee', due_date: futureDate(3), note: 'Pilot starts after payer enrollment' },
  { id: 2, practice: 3, practice_name: demoPractices[2].name, product: 2, product_name: demoProducts[1].name, stage: 'discovery', value: '945.00', owner: 'Avery Chen', due_date: futureDate(6), note: 'Map front-desk verification steps' },
  { id: 3, practice: 4, practice_name: demoPractices[3].name, product: 3, product_name: demoProducts[2].name, stage: 'qualified', value: '387.00', owner: 'Morgan Lee', due_date: futureDate(9), note: 'Requested payment plan walkthrough' },
  { id: 4, practice: 5, practice_name: demoPractices[4].name, product: 1, product_name: demoProducts[0].name, stage: 'proposal', value: '1396.00', owner: 'Riley James', due_date: futureDate(12), note: 'Proposal includes four locations' },
]
const demoOverview = (): Overview => {
  const counts = Object.fromEntries(['submitted', 'in_review', 'follow_up', 'denied', 'paid'].map((status) => [status, demoClaims.filter((claim) => claim.status === status).length]))
  return {
    claim_count: demoClaims.length,
    open_claims: demoClaims.filter((claim) => !['paid', 'denied'].includes(claim.status)).length,
    denied_claims: counts.denied,
    over_30_days: demoClaims.filter((claim) => claim.age_days > 30 && !['paid', 'denied'].includes(claim.status)).length,
    expected_reimbursement: demoClaims.filter((claim) => claim.status !== 'paid').reduce((sum, claim) => sum + Number(claim.expected_amount), 0).toFixed(2),
    practice_count: demoPractices.length,
    pipeline_value: demoOpportunities.reduce((sum, opportunity) => sum + Number(opportunity.value), 0).toFixed(2),
    status_counts: counts,
  }
}
const demoApi = {
  overview: async () => demoOverview(),
  claims: async (status: string, search: string) => demoClaims.filter((claim) => (status === 'all' || claim.status === status) && (!search.trim() || `${claim.reference} ${claim.payer} ${claim.procedure} ${claim.practice_name}`.toLowerCase().includes(search.trim().toLowerCase()))),
  updateClaim: async (id: number, update: Partial<Pick<Claim, 'status' | 'follow_up_note'>>) => {
    demoClaims = demoClaims.map((claim) => claim.id === id ? { ...claim, ...update } : claim)
    const updated = demoClaims.find((claim) => claim.id === id)
    if (!updated) throw new Error('Claim not found')
    return updated
  },
  practices: async () => demoPractices,
  products: async () => demoProducts,
  opportunities: async () => demoOpportunities,
}

export const api = {
  overview: () => demoMode ? demoApi.overview() : request<Overview>('overview/'),
  claims: (status: string, search: string) => {
    if (demoMode) return demoApi.claims(status, search)
    const params = new URLSearchParams()
    if (status !== 'all') params.set('status', status)
    if (search.trim()) params.set('search', search.trim())
    return request<Claim[]>(`claims/?${params.toString()}`)
  },
  updateClaim: (id: number, update: Partial<Pick<Claim, 'status' | 'follow_up_note'>>) => demoMode ? demoApi.updateClaim(id, update) : request<Claim>(`claims/${id}/`, { method: 'PATCH', body: JSON.stringify(update) }),
  practices: () => demoMode ? demoApi.practices() : request<Practice[]>('practices/'),
  products: () => demoMode ? demoApi.products() : request<Product[]>('products/'),
  opportunities: () => demoMode ? demoApi.opportunities() : request<Opportunity[]>('opportunities/'),
}
