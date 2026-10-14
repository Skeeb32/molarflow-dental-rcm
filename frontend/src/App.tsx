import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Activity, ArrowRight, BadgeDollarSign, Bell, BriefcaseBusiness,
  Check, ChevronDown, CircleHelp, ClipboardList, Command, CreditCard, Filter, LayoutDashboard,
  LifeBuoy, MoreHorizontal, Plus, Search, Settings2, ShieldCheck, Sparkles, Stethoscope,
  UsersRound, WalletCards, X,
} from 'lucide-react'
import { api, type Claim, type ClaimStatus, type Opportunity, type Practice, type Product } from './api'
import type { AuthUser } from './auth/auth'

type Page = 'Overview' | 'Claims' | 'Practices' | 'Products & sales'

const money = (amount: string | number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(Number(amount))
const shortDate = (value: string) => new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(`${value}T12:00:00`))
const todayLabel = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).format(new Date()).toUpperCase()
const statusLabel: Record<ClaimStatus, string> = { submitted: 'Submitted', in_review: 'In review', follow_up: 'Follow-up', denied: 'Denied', paid: 'Paid' }

function App({ user, onLogout }: { user?: AuthUser; onLogout?: () => Promise<void> }) {
  const previewView = new URLSearchParams(window.location.search).get('view')
  const [page, setPage] = useState<Page>(previewView === 'claims' || previewView === 'claim-detail' ? 'Claims' : 'Overview')
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Claim | null>(null)
  const queryClient = useQueryClient()
  const overviewQuery = useQuery({ queryKey: ['overview'], queryFn: api.overview })
  const claimsQuery = useQuery({ queryKey: ['claims', filter, search], queryFn: () => api.claims(filter, search) })
  const practicesQuery = useQuery({ queryKey: ['practices'], queryFn: api.practices })
  const productsQuery = useQuery({ queryKey: ['products'], queryFn: api.products })
  const opportunitiesQuery = useQuery({ queryKey: ['opportunities'], queryFn: api.opportunities })
  useEffect(() => {
    if (previewView === 'claim-detail' && claimsQuery.data?.length && !selected) {
      setSelected(claimsQuery.data.find((claim) => claim.id === 9) ?? claimsQuery.data[0])
    }
  }, [previewView, claimsQuery.data, selected])
  const followUpMutation = useMutation({
    mutationFn: (claim: Claim) => api.updateClaim(claim.id, { status: 'follow_up', follow_up_note: 'Follow-up queued by operations team' }),
    onSuccess: (updated) => setSelected((current) => current?.id === updated.id ? updated : current),
    onMutate: async (claim) => {
      await queryClient.cancelQueries({ queryKey: ['claims'] })
      const previous = queryClient.getQueriesData<Claim[]>({ queryKey: ['claims'] })
      queryClient.setQueriesData<Claim[]>({ queryKey: ['claims'] }, (rows) => rows?.map((row) => row.id === claim.id ? { ...row, status: 'follow_up' } : row))
      return { previous }
    },
    onError: (_error, _claim, context) => context?.previous.forEach(([key, data]) => queryClient.setQueryData(key, data)),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['claims'] })
      queryClient.invalidateQueries({ queryKey: ['overview'] })
    },
  })

  const claims = claimsQuery.data ?? []
  const practices = practicesQuery.data ?? []
  const products = productsQuery.data ?? []
  const opportunities = opportunitiesQuery.data ?? []
  const practiceName = user?.practices[0]?.name ?? 'Northstar Dental'
  const operatorName = user?.full_name || 'Demo operator'
  const initials = operatorName.split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() || '').join('') || 'MF'
  const topClaims = useMemo(() => [...claims].sort((a, b) => b.age_days - a.age_days).slice(0, 5), [claims])

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand"><div className="brand-mark"><Stethoscope size={18} strokeWidth={2.4} /></div><span>molarflow</span><span className="brand-dot">.</span></div>
        <div className="workspace-switch"><div className="workspace-avatar">{practiceName[0]}</div><div className="workspace-copy"><strong>{practiceName}</strong><span>Clinic stakeholder workspace</span></div><ChevronDown size={15} /></div>
        <div className="nav-label">WORKSPACE</div>
        <nav className="main-nav" aria-label="Main navigation">
          <NavItem icon={<LayoutDashboard size={17} />} label="Overview" active={page === 'Overview'} onClick={() => setPage('Overview')} />
          <NavItem icon={<ClipboardList size={17} />} label="Claims" count={overviewQuery.data?.open_claims} active={page === 'Claims'} onClick={() => setPage('Claims')} />
          <NavItem icon={<UsersRound size={17} />} label="Practices" active={page === 'Practices'} onClick={() => setPage('Practices')} />
          <NavItem icon={<BriefcaseBusiness size={17} />} label="Products & sales" active={page === 'Products & sales'} onClick={() => setPage('Products & sales')} />
        </nav>
        <div className="nav-label nav-label-lower">MANAGE</div>
        <nav className="main-nav" aria-label="Management navigation">
          <NavItem icon={<CreditCard size={17} />} label="Patient payments" onClick={() => setPage('Claims')} />
          <NavItem icon={<Activity size={17} />} label="Reports" onClick={() => setPage('Overview')} />
          <NavItem icon={<Settings2 size={17} />} label="Settings" onClick={() => setPage('Practices')} />
        </nav>
        <div className="sidebar-bottom">
          <div className="support-card"><div className="support-icon"><LifeBuoy size={17} /></div><strong>Need a hand?</strong><span>Visit the help center</span><ArrowRight size={15} className="support-arrow" /></div>
          <button className="profile-button" onClick={onLogout} disabled={!onLogout}><div className="profile-avatar">{initials}</div><span className="profile-copy"><strong>{operatorName}</strong><small>{user ? 'Clinic stakeholder · Sign out' : 'Demo workspace'}</small></span><MoreHorizontal size={19} /></button>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar"><div className="breadcrumbs"><span>{practiceName}</span><span className="crumb-slash">/</span><strong>{page}</strong></div><div className="topbar-actions"><div className="searchbox top-search"><Search size={15} /><input aria-label="Search workspace" placeholder="Search anything..." onChange={(event) => setSearch(event.target.value)} /><kbd><Command size={10} /> K</kbd></div><button className="icon-button" aria-label="Help"><CircleHelp size={18} /></button><button className="icon-button notification-button" aria-label="Notifications"><Bell size={18} /><i /></button><div className="top-avatar">{initials}</div></div></header>
        <div className="page-wrap">
          {page === 'Overview' && <OverviewPage overview={overviewQuery.data} claims={topClaims} practices={practices} opportunities={opportunities} loading={overviewQuery.isLoading} error={overviewQuery.isError || claimsQuery.isError} onOpenClaim={(claim) => { setSelected(claim); setPage('Claims') }} onFollowUp={(claim) => followUpMutation.mutate(claim)} />}
          {page === 'Claims' && <ClaimsPage claims={claims} loading={claimsQuery.isLoading} error={claimsQuery.isError} filter={filter} search={search} selected={selected} mutationPending={followUpMutation.isPending} onFilter={setFilter} onSearch={setSearch} onSelect={setSelected} onFollowUp={(claim) => followUpMutation.mutate(claim)} />}
          {page === 'Practices' && <PracticesPage practices={practices} loading={practicesQuery.isLoading} />}
          {page === 'Products & sales' && <SalesPage products={products} opportunities={opportunities} loading={productsQuery.isLoading || opportunitiesQuery.isLoading} />}
        </div>
        <footer className="page-footer"><span><ShieldCheck size={13} />{user ? 'Protected stakeholder workspace · clinic-scoped records' : 'Demo workspace · synthetic records only'}</span><span>© 2026 MolarFlow</span></footer>
      </main>
    </div>
  )
}

function NavItem({ icon, label, count, active, onClick }: { icon: React.ReactNode; label: string; count?: number; active?: boolean; onClick: () => void }) {
  return <button className={`nav-item ${active ? 'active' : ''}`} onClick={onClick}>{icon}<span>{label}</span>{count ? <span className="nav-count">{count}</span> : null}</button>
}

function OverviewPage({ overview, claims, practices, opportunities, loading, error, onOpenClaim, onFollowUp }: {
  overview?: { claim_count: number; open_claims: number; expected_reimbursement: string; over_30_days: number; denied_claims: number; pipeline_value: string; status_counts: Record<string, number> }
  claims: Claim[]; practices: Practice[]; opportunities: Opportunity[]; loading: boolean; error: boolean
  onOpenClaim: (claim: Claim) => void; onFollowUp: (claim: Claim) => void
}) {
  const attention = practices.filter((practice) => practice.stage === 'at_risk')
  const chartStatuses = [['follow_up', 'Follow-up'], ['in_review', 'In review'], ['submitted', 'Submitted'], ['denied', 'Denied'], ['paid', 'Paid']] as const
  const maxStatusCount = Math.max(1, ...chartStatuses.map(([key]) => overview?.status_counts?.[key] ?? 0))
  return <>
    <div className="page-heading"><div><div className="eyebrow">{todayLabel} <span className="live-pill"><i /> LIVE OVERVIEW</span></div><h1>Good morning, Shaqib <span className="wave">✳</span></h1><p>Here’s what’s happening across your revenue cycle today.</p></div><button className="primary-button" onClick={() => claims[0] && onOpenClaim(claims[0])}><ClipboardList size={15} /> Review claims</button></div>
    {error && <ErrorBanner />}
    <section className="metric-grid" aria-label="Revenue cycle summary">
      <MetricCard title="Open claims" value={loading ? '—' : String(overview?.open_claims ?? 0)} detail="Across all payers" icon={<ClipboardList size={17} />} accent="sage" />
      <MetricCard title="Expected reimbursement" value={loading ? '—' : money(overview?.expected_reimbursement ?? 0)} detail="Open claims only" icon={<WalletCards size={17} />} accent="cream" />
      <MetricCard title="Aging over 30 days" value={loading ? '—' : String(overview?.over_30_days ?? 0)} detail="Needs a follow-up" icon={<Activity size={17} />} accent="peach" />
      <MetricCard title="Denials to work" value={loading ? '—' : String(overview?.denied_claims ?? 0)} detail="Across active practices" icon={<BadgeDollarSign size={17} />} accent="blue" />
    </section>
    <section className="content-grid overview-grid">
      <div className="panel claims-panel"><div className="panel-heading"><div><h2>Claims needing attention</h2><p>Start with the oldest items in your queue.</p></div><button className="text-button" onClick={() => onOpenClaim(claims[0])}>View all claims <ArrowRight size={14} /></button></div>
        <div className="table-wrap"><table><thead><tr><th>CLAIM / PRACTICE</th><th>PAYER</th><th>AGE</th><th>EXPECTED</th><th>STATUS</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>
          {loading ? <TableLoading /> : error ? <tr><td colSpan={6}><ErrorBanner /></td></tr> : claims.length ? claims.map((claim) => <ClaimRow key={claim.id} claim={claim} onSelect={() => onOpenClaim(claim)} onFollowUp={() => onFollowUp(claim)} />) : <tr><td colSpan={6}><EmptyState /></td></tr>}
        </tbody></table></div>
        <button className="mobile-view-all" onClick={() => onOpenClaim(claims[0])}>Open claims queue <ArrowRight size={14} /></button>
      </div>
      <aside className="right-rail">
        <div className="panel trend-panel"><div className="panel-heading compact"><div><h2>Claims by status</h2><p>Current queue composition</p></div><button className="more-button" aria-label="More claim status options"><MoreHorizontal size={18} /></button></div><div className="pulse-value">{overview?.claim_count ?? 0} <span>total claims</span></div><div className="chart-legend"><span><i /> Current records</span><span>By claim state</span></div><div className="status-chart" aria-label="Claim counts by status">{chartStatuses.map(([key, label], index) => <div className="status-chart-row" key={key}><span>{label}</span><div className="status-track"><i className={`status-fill fill-${index}`} style={{ width: `${((overview?.status_counts?.[key] ?? 0) / maxStatusCount) * 100}%` }} /></div><strong>{overview?.status_counts?.[key] ?? 0}</strong></div>)}</div></div>
        <div className="insight-card"><div className="insight-spark"><Sparkles size={16} /></div><div className="insight-title">A good week to follow up</div><p>{overview?.over_30_days ?? 0} claims are past 30 days. Practices with a weekly payer touchpoint resolve aging claims sooner.</p><button onClick={() => onOpenClaim(claims[0])}>Review aged claims <ArrowRight size={13} /></button><div className="insight-decoration">✳</div></div>
      </aside>
    </section>
    <section className="bottom-grid"><div className="panel practice-panel"><div className="panel-heading"><div><h2>Practice health</h2><p>Accounts that may need a closer look.</p></div><span className="small-count">{attention.length} need attention</span></div><div className="practice-list">{practices.slice(0, 4).map((practice) => <PracticeRow key={practice.id} practice={practice} />)}</div></div>
      <div className="panel pipeline-panel"><div className="panel-heading"><div><h2>Growth pipeline</h2><p>Product conversations in motion.</p></div><button className="more-button" aria-label="More pipeline options"><MoreHorizontal size={18} /></button></div><div className="pipeline-total">{money(overview?.pipeline_value ?? 0)}<span>potential monthly value</span></div><div className="opportunity-list">{opportunities.slice(0, 3).map((opportunity) => <OpportunityRow key={opportunity.id} opportunity={opportunity} />)}</div></div></section>
  </>
}

function MetricCard({ title, value, detail, icon, accent }: { title: string; value: string; detail: string; icon: React.ReactNode; accent: string }) {
  return <article className="metric-card"><div className={`metric-icon ${accent}`}>{icon}</div><div className="metric-title">{title}</div><div className="metric-value">{value}</div><div className="metric-foot"><span>{detail}</span></div></article>
}

function ClaimRow({ claim, onSelect, onFollowUp }: { claim: Claim; onSelect: () => void; onFollowUp: () => void }) {
  return <tr><td><button className="claim-name-button" onClick={onSelect}><strong>{claim.reference}</strong><span>{claim.practice_name} · {claim.procedure}</span></button></td><td>{claim.payer}</td><td><span className={`age ${claim.age_days >= 30 ? 'aged' : ''}`}>{claim.age_days} days</span></td><td className="amount-cell">{money(claim.expected_amount)}</td><td><StatusBadge status={claim.status} /></td><td><button className="row-action" onClick={onFollowUp} aria-label={`Queue follow-up for ${claim.reference}`}><ArrowRight size={15} /></button></td></tr>
}

function StatusBadge({ status }: { status: ClaimStatus }) {
  return <span className={`status-badge status-${status}`}><i />{statusLabel[status]}</span>
}

function PracticeRow({ practice }: { practice: Practice }) {
  const initials = practice.name.split(' ').slice(0, 2).map((word) => word[0]).join('')
  const stage = practice.stage === 'at_risk' ? 'Needs attention' : practice.stage === 'onboarding' ? 'Onboarding' : 'Healthy'
  return <div className="practice-row"><div className={`practice-initial ${practice.stage}`}>{initials}</div><div className="practice-main"><strong>{practice.name}</strong><span>{practice.locations} locations · {practice.region}</span></div><div className={`health-state ${practice.stage}`}><i />{stage}</div><div className="practice-mrr">{money(practice.mrr)}<small>MRR</small></div></div>
}

function OpportunityRow({ opportunity }: { opportunity: Opportunity }) {
  return <div className="opportunity-row"><div className="opportunity-icon"><BadgeDollarSign size={15} /></div><div className="opportunity-copy"><strong>{opportunity.product_name}</strong><span>{opportunity.practice_name} · {opportunity.stage}</span></div><div className="opportunity-value">{money(opportunity.value)}<small>{shortDate(opportunity.due_date)}</small></div></div>
}

function ClaimsPage({ claims, loading, error, filter, search, selected, mutationPending, onFilter, onSearch, onSelect, onFollowUp }: {
  claims: Claim[]; loading: boolean; error: boolean; filter: string; search: string; selected: Claim | null; mutationPending: boolean
  onFilter: (value: string) => void; onSearch: (value: string) => void; onSelect: (claim: Claim | null) => void; onFollowUp: (claim: Claim) => void
}) {
  return <>
    <div className="page-heading claims-heading"><div><div className="eyebrow">REVENUE CYCLE</div><h1>Claims queue</h1><p>Keep payer follow-up moving and protect expected collections.</p></div><button className="primary-button"><Plus size={16} /> New claim</button></div>
    {error && <ErrorBanner />}
    <div className="queue-summary"><div><span>All claims</span><strong>{claims.length}</strong></div><div><span>Follow-up</span><strong>{claims.filter((claim) => claim.status === 'follow_up').length}</strong></div><div><span>Denied</span><strong>{claims.filter((claim) => claim.status === 'denied').length}</strong></div><div><span>Expected in queue</span><strong>{money(claims.reduce((sum, claim) => sum + Number(claim.expected_amount), 0))}</strong></div></div>
    <div className="panel queue-panel"><div className="queue-toolbar"><div className="filter-tabs" role="tablist" aria-label="Filter claims">{[['all', 'All claims'], ['follow_up', 'Follow-up'], ['denied', 'Denied'], ['in_review', 'In review']].map(([value, label]) => <button key={value} role="tab" aria-selected={filter === value} className={filter === value ? 'selected' : ''} onClick={() => onFilter(value)}>{label}</button>)}</div><div className="toolbar-controls"><div className="searchbox"><Search size={15} /><input aria-label="Search claims" placeholder="Search claims..." value={search} onChange={(event) => onSearch(event.target.value)} /></div><button className="secondary-button"><Filter size={14} /> Filters</button></div></div>
      <div className="table-wrap queue-table"><table><thead><tr><th>CLAIM / PRACTICE</th><th>PAYER</th><th>SUBMITTED</th><th>AGE</th><th>BILLED</th><th>EXPECTED</th><th>STATUS</th><th></th></tr></thead><tbody>{loading ? <TableLoading columns={8} /> : claims.length ? claims.map((claim) => <tr key={claim.id} className={selected?.id === claim.id ? 'selected-row' : ''} onClick={() => onSelect(claim)}><td><button className="claim-name-button" onClick={(event) => { event.stopPropagation(); onSelect(claim) }}><strong>{claim.reference}</strong><span>{claim.practice_name} · {claim.procedure}</span></button></td><td>{claim.payer}</td><td>{shortDate(claim.submitted_at)}</td><td><span className={`age ${claim.age_days >= 30 ? 'aged' : ''}`}>{claim.age_days} days</span></td><td>{money(claim.billed_amount)}</td><td className="amount-cell">{money(claim.expected_amount)}</td><td><StatusBadge status={claim.status} /></td><td><button className="row-action" aria-label={`Open ${claim.reference}`} onClick={(event) => { event.stopPropagation(); onSelect(claim) }}><ArrowRight size={15} /></button></td></tr>) : <tr><td colSpan={8}><EmptyState /></td></tr>}</tbody></table></div>
      <div className="table-pagination"><span>Showing <strong>{claims.length}</strong> claims</span><div><button disabled>Previous</button><button disabled>Next</button></div></div>
    </div>
    {selected && <div className="detail-backdrop" onClick={() => onSelect(null)}><section className="detail-drawer" onClick={(event) => event.stopPropagation()} aria-label={`Claim ${selected.reference} details`}><div className="drawer-heading"><div><span className="eyebrow">CLAIM DETAIL</span><h2>{selected.reference}</h2></div><button className="icon-button" onClick={() => onSelect(null)} aria-label="Close claim details"><X size={18} /></button></div><StatusBadge status={selected.status} /><div className="drawer-practice"><div className="practice-initial">{selected.practice_name.split(' ').slice(0, 2).map((part) => part[0]).join('')}</div><div><strong>{selected.practice_name}</strong><span>{selected.procedure}</span></div></div><div className="detail-list"><Detail label="Payer" value={selected.payer} /><Detail label="Submitted" value={`${shortDate(selected.submitted_at)} · ${selected.age_days} days ago`} /><Detail label="Billed amount" value={money(selected.billed_amount)} /><Detail label="Expected reimbursement" value={money(selected.expected_amount)} /><Detail label="Patient responsibility" value={money(selected.patient_responsibility)} />{selected.denial_reason && <Detail label="Denial reason" value={selected.denial_reason} />}</div><div className="note-box"><span>LAST FOLLOW-UP</span><p>{selected.follow_up_note || 'No follow-up note yet.'}</p></div><button className="primary-button drawer-action" disabled={mutationPending || selected.status === 'follow_up'} onClick={() => onFollowUp(selected)}>{selected.status === 'follow_up' ? <><Check size={15} /> In follow-up</> : <><ArrowRight size={15} /> Queue payer follow-up</>}</button></section></div>}
  </>
}

function Detail({ label, value }: { label: string; value: string }) { return <div className="detail-item"><span>{label}</span><strong>{value}</strong></div> }

function PracticesPage({ practices, loading }: { practices: Practice[]; loading: boolean }) {
  return <><div className="page-heading"><div><div className="eyebrow">CUSTOMER OPERATIONS</div><h1>Practice accounts</h1><p>Connect customer health, product footprint, and RCM follow-up.</p></div><button className="primary-button"><Plus size={16} /> Add practice</button></div><div className="account-summary"><div><span>Practice accounts</span><strong>{loading ? '—' : practices.length}</strong></div><div><span>Active locations</span><strong>{loading ? '—' : practices.reduce((sum, p) => sum + p.locations, 0)}</strong></div><div><span>Monthly recurring revenue</span><strong>{loading ? '—' : money(practices.reduce((sum, p) => sum + Number(p.mrr), 0))}</strong></div><div><span>Need attention</span><strong>{loading ? '—' : practices.filter((p) => p.stage === 'at_risk').length}</strong></div></div><div className="panel account-panel"><div className="panel-heading"><div><h2>All practices</h2><p>Customer portfolio and next best actions.</p></div><button className="secondary-button"><Filter size={14} /> Filter</button></div><div className="table-wrap"><table><thead><tr><th>PRACTICE</th><th>LOCATIONS</th><th>STATUS</th><th>PRODUCTS</th><th>MRR</th><th>NEXT STEP</th></tr></thead><tbody>{loading ? <TableLoading columns={6} /> : practices.map((practice) => <tr key={practice.id}><td><div className="account-name"><div className={`practice-initial ${practice.stage}`}>{practice.name.split(' ').slice(0, 2).map((p) => p[0]).join('')}</div><div><strong>{practice.name}</strong><span>{practice.region}</span></div></div></td><td>{practice.locations} locations</td><td><span className={`health-state ${practice.stage}`}><i />{practice.stage === 'at_risk' ? 'Needs attention' : practice.stage === 'onboarding' ? 'Onboarding' : 'Healthy'}</span></td><td><div className="product-tags">{practice.products.map((product) => <span key={product}>{product}</span>)}</div></td><td className="amount-cell">{money(practice.mrr)}</td><td className="next-step">{practice.next_step}</td></tr>)}</tbody></table></div></div></>
}

function SalesPage({ products, opportunities, loading }: { products: Product[]; opportunities: Opportunity[]; loading: boolean }) {
  const pipeline = opportunities.reduce((sum, row) => sum + Number(row.value), 0)
  return <><div className="page-heading"><div><div className="eyebrow">COMMERCIAL OPERATIONS</div><h1>Products & sales</h1><p>Grow practice value with products tied to real RCM needs.</p></div><button className="primary-button"><Plus size={16} /> New opportunity</button></div><div className="account-summary sales-summary"><div><span>Open opportunities</span><strong>{loading ? '—' : opportunities.length}</strong></div><div><span>Pipeline value / month</span><strong>{loading ? '—' : money(pipeline)}</strong></div><div><span>Products live</span><strong>{loading ? '—' : products.length}</strong></div><div><span>Product accounts</span><strong>{loading ? '—' : products.every((product) => product.active_accounts !== undefined) ? products.reduce((sum, product) => sum + (product.active_accounts ?? 0), 0) : '—'}</strong></div></div><div className="sales-layout"><section className="panel catalog-panel"><div className="panel-heading"><div><h2>Product catalog</h2><p>Solutions for practice operations.</p></div><button className="more-button" aria-label="Product options"><MoreHorizontal size={18} /></button></div><div className="product-list">{products.map((product, index) => <ProductCard key={product.id} product={product} index={index} />)}</div></section><section className="panel opportunities-panel"><div className="panel-heading"><div><h2>Opportunities</h2><p>Next steps across the pipeline.</p></div><button className="secondary-button"><Filter size={14} /> Filter</button></div><div className="opportunity-table">{opportunities.map((opportunity) => <div className="opportunity-card" key={opportunity.id}><div className="opportunity-card-top"><span className={`stage-pill stage-${opportunity.stage}`}>{opportunity.stage}</span><strong>{money(opportunity.value)}<small>/mo</small></strong></div><h3>{opportunity.product_name}</h3><p>{opportunity.practice_name}</p><div className="opportunity-note">{opportunity.note}</div><div className="opportunity-meta"><span>Owner · {opportunity.owner}</span><span>Due {shortDate(opportunity.due_date)}</span></div></div>)}</div></section></div></>
}

function ProductCard({ product, index }: { product: Product; index: number }) {
  const Icon = [Activity, ShieldCheck, WalletCards][index % 3]
  return <article className="product-card"><div className={`product-icon product-icon-${index % 3}`}><Icon size={19} /></div><div className="product-card-copy"><div className="product-card-title"><h3>{product.name}</h3><span>{product.category}</span></div><p>{product.description}</p><div className="product-card-foot">{product.active_accounts !== undefined && <span><strong>{product.active_accounts}</strong> practices live</span>}<strong>{money(product.monthly_price)}<small>/mo</small></strong></div></div></article>
}

function TableLoading({ columns = 6 }: { columns?: number }) { return <>{Array.from({ length: 4 }).map((_, row) => <tr key={row} className="skeleton-row"><td colSpan={columns}><span /></td></tr>)}</> }
function EmptyState() { return <div className="empty-state"><div><Check size={18} /></div><strong>You’re all caught up</strong><span>No claims match this view right now.</span></div> }
function ErrorBanner() { return <div className="error-banner" role="alert">We couldn’t load the latest workspace data. Check that the Django API is running, then refresh.</div> }

export default App
