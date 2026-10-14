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

export const api = {
  overview: () => request<Overview>('overview/'),
  claims: (status: string, search: string) => {
    const params = new URLSearchParams()
    if (status !== 'all') params.set('status', status)
    if (search.trim()) params.set('search', search.trim())
    return request<Claim[]>(`claims/?${params.toString()}`)
  },
  updateClaim: (id: number, update: Partial<Pick<Claim, 'status' | 'follow_up_note'>>) =>
    request<Claim>(`claims/${id}/`, { method: 'PATCH', body: JSON.stringify(update) }),
  practices: () => request<Practice[]>('practices/'),
  products: () => request<Product[]>('products/'),
  opportunities: () => request<Opportunity[]>('opportunities/'),
}
