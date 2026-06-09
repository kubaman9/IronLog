import { useState, useContext } from 'react'
import { useNavigate } from 'react-router-dom'
import { AuthContext } from '../context/context'
import { useUser } from './SignIn'
import { estimateMax } from '../utils/progression'
import { useLifts } from '../utils/useLifts'
import { displayType } from '../utils/workout'
import LiftRow from './LiftRow'
import './Homer.css'
import './Profile.css'

const ALL_TYPES = ['All', 'Chest', 'Tricept', 'Bicept', 'Shoulders', 'Back', 'Abbs', 'Legs', 'Forearms']
const MUSCLE_MAP: Record<string, string> = {
    Chest: 'Push', Shoulders: 'Push', Tricept: 'Push',
    Back: 'Pull', Bicept: 'Pull', Forearms: 'Pull',
    Legs: 'Legs', Abbs: 'Core',
}

export default function Profile() {
    const navigate = useNavigate()
    const context = useContext(AuthContext)
    const { username } = useUser()
    const { lifts, loading, refresh } = useLifts()
    const [typeFilter, setTypeFilter] = useState('All')
    const [search, setSearch] = useState('')
    const [sortBy, setSortBy] = useState<'weight' | 'sessions' | 'name' | 'estmax'>('weight')

    const initials = username
        ? username.replace(/@.*/, '').split(/[\s._]+/).map((w: string) => w[0]).join('').toUpperCase().slice(0, 2)
        : '?'

    const totalSessions = lifts.reduce((s, l) => s + (l.pastWeights?.length || 0), 0)
    const heaviest = lifts.length ? Math.max(...lifts.map(l => l.weight)) : 0
    const bestMax = lifts.length ? Math.max(...lifts.map(l => estimateMax(l.weight, l.reps))) : 0

    // Personal bests: top lift per muscle type by est. 1RM
    const personalBests: Record<string, { name: string; weight: number; estMax: number }> = {}
    lifts.forEach(l => {
        const em = estimateMax(l.weight, l.reps)
        if (!personalBests[l.type] || em > personalBests[l.type].estMax)
            personalBests[l.type] = { name: l.name, weight: l.weight, estMax: em }
    })
    const pbEntries = Object.entries(personalBests).sort((a, b) => b[1].estMax - a[1].estMax)

    // Recent activity: group all sessions by calendar day
    type ActDay = { dateMs: number; types: string[]; liftCount: number }
    const actMap = new Map<string, { dateMs: number; types: Set<string>; liftCount: number }>()
    lifts.forEach(l => {
        l.sessions?.forEach(s => {
            const ms = parseInt(s.date)
            if (isNaN(ms)) return
            const d = new Date(ms)
            const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
            if (!actMap.has(key)) actMap.set(key, { dateMs: ms, types: new Set(), liftCount: 0 })
            const e = actMap.get(key)!
            e.types.add(l.type)
            e.liftCount++
        })
    })
    const recentDays: ActDay[] = Array.from(actMap.values())
        .sort((a, b) => b.dateMs - a.dateMs)
        .slice(0, 8)
        .map(v => ({ dateMs: v.dateMs, types: Array.from(v.types), liftCount: v.liftCount }))

    const fmtActivityDate = (ms: number) => {
        const d = new Date(ms)
        const now = new Date()
        const diff = Math.floor((now.setHours(0,0,0,0) - d.setHours(0,0,0,0)) / 86400000)
        if (diff === 0) return 'Today'
        if (diff === 1) return 'Yesterday'
        return new Date(ms).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
    }

    // % per muscle category
    const catCounts: Record<string, number> = {}
    lifts.forEach(l => {
        const cat = MUSCLE_MAP[l.type] || l.type
        catCounts[cat] = (catCounts[cat] || 0) + 1
    })
    const catMax = Math.max(...Object.values(catCounts), 1)

    const filtered = lifts
        .filter(l => typeFilter === 'All' || l.type === typeFilter)
        .filter(l => l.name.toLowerCase().includes(search.toLowerCase()))
        .sort((a, b) => {
            if (sortBy === 'weight') return b.weight - a.weight
            if (sortBy === 'estmax') return estimateMax(b.weight, b.reps) - estimateMax(a.weight, a.reps)
            if (sortBy === 'sessions') return (b.pastWeights?.length || 0) - (a.pastWeights?.length || 0)
            return a.name.localeCompare(b.name)
        })

    return (
        <>
            <div className='Nav'>
                <h2 onClick={() => navigate('/Home')}>← Home</h2>
                <h1>Profile</h1>
                <span />
            </div>

            <div className='profile-hero'>
                <div className='profile-avatar-ring'>
                    <div className='profile-avatar-circle'>{initials}</div>
                </div>
                <div className='profile-username'>{username || 'Athlete'}</div>
                <div className='profile-tagline'>IronLog Athlete</div>

                {/* 4 core stats */}
                <div className='profile-stats-grid'>
                    <div className='profile-stat-box'>
                        <span className='profile-stat-num'>{lifts.length}</span>
                        <span className='profile-stat-lbl'>Exercises</span>
                    </div>
                    <div className='profile-stat-box'>
                        <span className='profile-stat-num'>{totalSessions}</span>
                        <span className='profile-stat-lbl'>Sessions</span>
                    </div>
                    <div className='profile-stat-box'>
                        <span className='profile-stat-num'>{heaviest}<span className='profile-stat-unit'>lb</span></span>
                        <span className='profile-stat-lbl'>Top Weight</span>
                    </div>
                    <div className='profile-stat-box accent-green'>
                        <span className='profile-stat-num'>{bestMax}<span className='profile-stat-unit'>lb</span></span>
                        <span className='profile-stat-lbl'>Est. Max</span>
                        <span className='profile-stat-hint'>1 rep max</span>
                    </div>
                </div>

                {/* Muscle category breakdown */}
                {Object.keys(catCounts).length > 0 && (
                    <div className='profile-muscle-breakdown'>
                        <div className='profile-breakdown-title'>Muscle Focus</div>
                        {Object.entries(catCounts)
                            .sort((a, b) => b[1] - a[1])
                            .map(([cat, count]) => (
                                <div key={cat} className='profile-breakdown-row'>
                                    <span className='profile-breakdown-label'>{cat}</span>
                                    <div className='profile-breakdown-bar-wrap'>
                                        <div
                                            className='profile-breakdown-bar'
                                            style={{ width: `${Math.round((count / catMax) * 100)}%` }}
                                        />
                                    </div>
                                    <span className='profile-breakdown-pct'>
                                        {Math.round((count / lifts.length) * 100)}%
                                    </span>
                                </div>
                            ))}
                    </div>
                )}

                <button className='profile-logout-btn' onClick={() => { context.logout(); navigate('/') }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                    Sign Out
                </button>
            </div>

            {pbEntries.length > 0 && (
                <div className='section-card profile-pbs-card'>
                    <div className='section-card-header'>
                        <h3>Personal Bests</h3>
                    </div>
                    <div className='profile-pb-list'>
                        {pbEntries.map(([type, pb]) => (
                            <div key={type} className='profile-pb-row'>
                                <span className='profile-pb-type'>{displayType(type)}</span>
                                <span className='profile-pb-name'>{pb.name}</span>
                                <span className='profile-pb-weight'>{pb.weight}<span className='profile-pb-unit'>lb</span></span>
                                <span className='profile-pb-max'>~{pb.estMax}<span className='profile-pb-unit'>1RM</span></span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {recentDays.length > 0 && (
                <div className='section-card profile-activity-card'>
                    <div className='section-card-header'>
                        <h3>Recent Activity</h3>
                    </div>
                    <div className='profile-activity-list'>
                        {recentDays.map((day, i) => (
                            <div key={i} className='profile-activity-row'>
                                <div className='profile-act-dot-col'>
                                    <div className={`profile-act-dot${i === 0 ? ' today' : ''}`} />
                                    {i < recentDays.length - 1 && <div className='profile-act-line' />}
                                </div>
                                <div className='profile-act-info'>
                                    <span className='profile-act-date'>{fmtActivityDate(day.dateMs)}</span>
                                    <span className='profile-act-types'>{day.types.map(displayType).join(' · ')}</span>
                                </div>
                                <span className='profile-act-count'>{day.liftCount} lift{day.liftCount !== 1 ? 's' : ''}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className='section-card profile-library-card'>
                <div className='section-card-header'>
                    <h3>Lift Library</h3>
                </div>
                <div className='profile-filters'>
                    <input className='search-input' placeholder='Search lifts…' value={search} onChange={e => setSearch(e.target.value)} />
                    <select className='sort-select' value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
                        {ALL_TYPES.map(t => <option key={t}>{t}</option>)}
                    </select>
                    <select className='sort-select' value={sortBy} onChange={e => setSortBy(e.target.value as any)}>
                        <option value='weight'>Weight ↓</option>
                        <option value='estmax'>Est. Max ↓</option>
                        <option value='sessions'>Sessions ↓</option>
                        <option value='name'>A–Z</option>
                    </select>
                </div>

                {loading ? (
                    <p className='profile-empty'>Loading…</p>
                ) : filtered.length === 0 ? (
                    <p className='profile-empty'>No lifts match.</p>
                ) : (
                    <div className='profile-lift-list'>
                        {filtered.map(l => (
                            <LiftRow
                                key={l._id}
                                _id={l._id}
                                name={l.name}
                                weight={`${l.weight} lbs`}
                                reps={l.reps}
                                sets={l.sets}
                                type={l.type}
                                pastWeights={l.pastWeights || []}
                                sessions={l.sessions}
                                onMaxUpdate={() => refresh()}
                            />
                        ))}
                    </div>
                )}
            </div>
            <div style={{ height: 40 }} />
        </>
    )
}
