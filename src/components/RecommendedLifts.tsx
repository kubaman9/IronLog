import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getTrend, estimateMax, getNextTarget as calcNextTarget } from '../utils/progression'
import { useLifts } from '../utils/useLifts'
import { displayType } from '../utils/workout'
import type { Lift } from '../utils/api'
import LiftRow from './LiftRow'
import './Homer.css'
import './RecommendedLifts.css'

const volumeLoad = (l: Lift) => l.weight * l.sets * l.reps

const avgProgressionRate = (pw: number[]): number => {
    if (pw.length < 2) return 0
    const gains = pw.slice(1).map((w, i) => w - pw[i])
    return Math.round(gains.reduce((s, g) => s + g, 0) / gains.length * 10) / 10
}

const getNote = (lift: Lift): { weight: number; note: string } => {
    const sessions = lift.pastWeights?.length || 0
    const trend = getTrend(lift.pastWeights || [])
    const cur = lift.weight
    if (sessions < 2) return { weight: cur, note: 'Log more sessions for a target.' }
    if (trend === 'down') return { weight: cur, note: 'Consolidate — nail this weight first.' }
    if (trend === 'flat') return { weight: cur + 5, note: `Plateau: try +5 lbs or ${lift.reps + 2} reps.` }
    const bump = calcNextTarget(cur, lift.pastWeights) - cur
    const lvl = sessions < 8 ? 'Beginner' : sessions < 20 ? 'Intermediate' : 'Advanced'
    return { weight: cur + bump, note: `${lvl} progression: +${bump} lbs.` }
}

type MuscleCategory = 'Push' | 'Pull' | 'Legs' | 'Core'
const MUSCLE_MAP: Record<string, MuscleCategory> = {
    Chest: 'Push', Shoulders: 'Push', Tricept: 'Push',
    Back: 'Pull', Bicept: 'Pull', Forearms: 'Pull',
    Legs: 'Legs', Abbs: 'Core',
}

type Group = {
    type: string; lifts: Lift[]; avgWeight: number; totalSessions: number
    totalVolume: number; topLift: Lift; bestMax: number; progressionRate: number
    muscleCategory: MuscleCategory; avgSessions: number
}

function buildGroups(lifts: Lift[]): Group[] {
    const byType: Record<string, Lift[]> = {}
    lifts.forEach(l => { if (!byType[l.type]) byType[l.type] = []; byType[l.type].push(l) })
    return Object.entries(byType).map(([type, ls]): Group => {
        const totalSessions = ls.reduce((s, l) => s + (l.pastWeights?.length || 0), 0)
        const avgWeight = Math.round(ls.reduce((s, l) => s + l.weight, 0) / ls.length)
        const totalVolume = ls.reduce((s, l) => s + volumeLoad(l), 0)
        const topLift = [...ls].sort((a, b) => b.weight - a.weight)[0]
        const bestMax = Math.max(...ls.map(l => estimateMax(l.weight, l.reps)))
        const progressionRate = avgProgressionRate(topLift.pastWeights || [])
        const muscleCategory = MUSCLE_MAP[type] || 'Push'
        const avgSessions = Math.round(totalSessions / ls.length)
        return { type, lifts: ls, avgWeight, totalSessions, totalVolume, topLift, bestMax, progressionRate, muscleCategory, avgSessions }
    }).sort((a, b) => a.type.localeCompare(b.type))
}

export default function RecommendedLifts() {
    const navigate = useNavigate()
    const { lifts: allLifts, loading, refresh } = useLifts()
    const [expanded, setExpanded] = useState<string | null>(null)

    const groups = buildGroups(allLifts)

    const balance = { Push: 0, Pull: 0, Legs: 0, Core: 0 }
    groups.forEach(g => { balance[g.muscleCategory] = (balance[g.muscleCategory] || 0) + g.totalSessions })
    const balanceMax = Math.max(...Object.values(balance), 1)

    const topGoals = allLifts
        .filter(l => (l.pastWeights?.length || 0) >= 1)
        .map(l => ({ lift: l, ...getNote(l) }))
        .filter(g => getTrend(g.lift.pastWeights) !== 'down')
        .sort((a, b) => (b.lift.pastWeights?.length || 0) - (a.lift.pastWeights?.length || 0))
        .slice(0, 6)

    const totalSessions = allLifts.reduce((s, l) => s + (l.pastWeights?.length || 0), 0)
    const totalVolume = allLifts.reduce((s, l) => s + volumeLoad(l), 0)
    const avgProgressRate = (() => {
        const rates = allLifts.map(l => avgProgressionRate(l.pastWeights || [])).filter(r => r !== 0)
        return rates.length ? (rates.reduce((s, r) => s + r, 0) / rates.length).toFixed(1) : '0'
    })()

    return (
        <>
            <div className='Nav'>
                <h2 onClick={() => navigate('/Home')}>Home</h2>
                <h1>Progression</h1>
                <span />
            </div>

            {!loading && allLifts.length > 0 && (
                <>
                    {/* ── Overview stats ── */}
                    <div className='rec-overview-stats'>
                        <div className='rec-ov-stat'>
                            <span className='rec-ov-num'>{allLifts.length}</span>
                            <span className='rec-ov-lbl'>Exercises</span>
                        </div>
                        <div className='rec-ov-stat'>
                            <span className='rec-ov-num'>{totalSessions}</span>
                            <span className='rec-ov-lbl'>Sessions</span>
                        </div>
                        <div className='rec-ov-stat'>
                            <span className='rec-ov-num'>{Math.round(totalVolume / 1000)}k</span>
                            <span className='rec-ov-lbl'>Vol (lbs)</span>
                        </div>
                        <div className='rec-ov-stat'>
                            <span className='rec-ov-num accent-green'>+{avgProgressRate}</span>
                            <span className='rec-ov-lbl'>Avg Gain</span>
                        </div>
                    </div>

                    {/* ── Next Session Goals ── */}
                    <div className='rec-wide-card'>
                        <div className='rec-goals-header'>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                            Next Session Goals
                        </div>
                        <div className='rec-goals-list'>
                            {topGoals.length === 0 ? (
                                <p className='rec-empty'>Log more sessions to unlock goals.</p>
                            ) : topGoals.map(({ lift, weight, note }) => (
                                <div key={lift._id} className='rec-goal-row'>
                                    <div className='rec-goal-left'>
                                        <div className='rec-goal-name-row'>
                                            <span className={`lift-row-trend trend-${getTrend(lift.pastWeights)}`}>
                                                {getTrend(lift.pastWeights) === 'up' ? '↑' : getTrend(lift.pastWeights) === 'flat' ? '→' : 'New'}
                                            </span>
                                            <span className='rec-goal-name'>{lift.name}</span>
                                        </div>
                                        <span className='rec-goal-note'>{note}</span>
                                    </div>
                                    <div className='rec-goal-target'>
                                        <span className='rec-goal-weight'>{weight}</span>
                                        <span className='rec-goal-unit'>lbs</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* ── Muscle Balance ── */}
                    <div className='rec-wide-card'>
                        <div className='rec-goals-header'>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                            Muscle Group Balance
                        </div>
                        <div className='rec-balance-grid'>
                            {(['Push', 'Pull', 'Legs', 'Core'] as const).map(cat => (
                                <div key={cat} className='rec-balance-item'>
                                    <div className='rec-balance-label'>{cat}</div>
                                    <div className='rec-balance-bar-wrap'>
                                        <div className={`rec-balance-bar bar-${cat.toLowerCase()}`} style={{ width: `${Math.round((balance[cat] / balanceMax) * 100)}%` }} />
                                    </div>
                                    <div className='rec-balance-count'>{balance[cat]} sess</div>
                                </div>
                            ))}
                        </div>
                        {balance.Push > 0 && balance.Pull > 0 && (
                            <div className='rec-balance-insight'>
                                {balance.Push / Math.max(balance.Pull, 1) > 1.6
                                    ? '⚡ Push-heavy — add more Pull to protect shoulders.'
                                    : balance.Pull / Math.max(balance.Push, 1) > 1.6
                                    ? '⚡ Pull-heavy — balance with more Push sessions.'
                                    : balance.Legs === 0
                                    ? "⚡ No leg sessions — don't skip leg day!"
                                    : '✓ Good push/pull balance. Keep it up.'}
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* ── Per-group cards ── */}
            {loading ? (
                <div className='rec-wide-card'>
                    <div className='section-card-header'><div className='skeleton skeleton-title' /></div>
                    {[1, 2, 3].map(i => <div key={i} className='skeleton-lift-row'><div className='skeleton skeleton-name' /></div>)}
                </div>
            ) : groups.length === 0 ? (
                <div className='rec-wide-card'>
                    <p style={{ padding: '24px', color: 'var(--text-secondary)' }}>Add some lifts to see progression!</p>
                </div>
            ) : groups.map(g => {
                const isOpen = expanded === g.type
                const topNote = getNote(g.topLift)
                const trendIcon = g.progressionRate > 0 ? '↑' : g.progressionRate < 0 ? '↓' : '→'
                const trendClass = g.progressionRate > 0 ? 'trend-up' : g.progressionRate < 0 ? 'trend-down' : 'trend-flat'

                return (
                    <div key={g.type} className='rec-wide-card rec-group-card'>
                        {/* Header */}
                        <div className='section-card-header rec-card-header-clickable' onClick={() => setExpanded(isOpen ? null : g.type)}>
                            <div>
                                <h3>{displayType(g.type)}</h3>
                                <span className={`rec-trend-badge ${trendClass}`}>{trendIcon} {Math.abs(g.progressionRate)} lbs/sess</span>
                            </div>
                            <div className='rec-header-right'>
                                <span className='rec-sessions'>{g.totalSessions} sessions</span>
                                <span className='rec-chevron'>{isOpen ? '▲' : '▼'}</span>
                            </div>
                        </div>

                        {/* 5 stats */}
                        <div className='rec-stats-row'>
                            <div className='rec-stat'>
                                <span className='rec-stat-label'>Avg Wt</span>
                                <span className='rec-stat-value'>{g.avgWeight}<span className='rec-stat-unit'>lb</span></span>
                            </div>
                            <div className='rec-stat'>
                                <span className='rec-stat-label'>Est. Max</span>
                                <span className='rec-stat-value rec-stat-green'>{g.bestMax}<span className='rec-stat-unit'>lb</span></span>
                            </div>
                            <div className='rec-stat'>
                                <span className='rec-stat-label'>Volume</span>
                                <span className='rec-stat-value'>{Math.round(g.totalVolume / 1000)}k<span className='rec-stat-unit'>lb</span></span>
                            </div>
                            <div className='rec-stat'>
                                <span className='rec-stat-label'>Exercises</span>
                                <span className='rec-stat-value'>{g.lifts.length}</span>
                            </div>
                            <div className='rec-stat'>
                                <span className='rec-stat-label'>Avg Sess</span>
                                <span className='rec-stat-value'>{g.avgSessions}</span>
                            </div>
                        </div>

                        {/* Suggestion */}
                        <div className='rec-suggestion'>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                            <p>
                                <strong>{g.topLift.name}:</strong> {topNote.note}
                                {topNote.weight !== g.topLift.weight && <span className='rec-target-pill'>→ {topNote.weight} lbs</span>}
                            </p>
                        </div>

                        {/* Expanded: full LiftRow components */}
                        {isOpen && (
                            <div className='chart-slide-in'>
                                {g.lifts
                                    .sort((a, b) => b.weight - a.weight)
                                    .map(l => (
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
                )
            })}
            <div style={{ height: 80 }} />
        </>
    )
}
