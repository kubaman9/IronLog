import { useUser } from './SignIn'
import { useNavigate } from 'react-router-dom'
import './Homer.css'
import './HomeBento.css'
import LiftRow from './LiftRow'
import SkeletonLiftRow from './SkeletonLiftRow'
import QuickAdd from './QuickAdd'
import { useState, useContext } from 'react'
import { AuthContext } from '../context/context'
import { getTrend, getNextTarget, estimateMax } from '../utils/progression'
import { WORKOUT_KEY } from '../utils/workout'
import { avgSecondsAcross, fmtDur, computeWorkoutStreak, lastWorkoutDaysAgo } from '../utils/liftTimes'
import { useLifts } from '../utils/useLifts'
import { displayType } from '../utils/workout'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'

const MUSCLE_MAP: Record<string, string> = {
    Chest: 'Push', Shoulders: 'Push', Tricept: 'Push',
    Back: 'Pull', Bicept: 'Pull', Forearms: 'Pull',
    Legs: 'Legs', Abbs: 'Core',
}
const CAT_COLORS: Record<string, string> = {
    Push: '#aa3bff', Pull: '#22c55e', Legs: '#f59e0b', Core: '#06b6d4',
}

const PieTip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null
    return (
        <div className='bento-pie-tip'>
            <span style={{ color: payload[0].payload.fill }}>{payload[0].name}</span>
            <strong>{payload[0].value} sess</strong>
        </div>
    )
}

export default function Home() {
    const { username } = useUser()
    const { lifts, loading, refresh } = useLifts()
    const [showQuickAdd, setShowQuickAdd] = useState(false)
    const [menuOpen, setMenuOpen] = useState(false)
    const navigate = useNavigate()
    const context = useContext(AuthContext)

    const activeWorkout = !!localStorage.getItem(WORKOUT_KEY)

    const go = (path: string) => { setMenuOpen(false); navigate(path) }
    const logout = () => { setMenuOpen(false); context.logout(); navigate('/') }

    const bySession = [...lifts].sort((a, b) => (b.pastWeights?.length || 0) - (a.pastWeights?.length || 0))
    const top5 = bySession.slice(0, 5)

    // Stats
    const totalSessions = lifts.reduce((s, l) => s + (l.pastWeights?.length || 0), 0)
    const topPR = lifts.length ? Math.max(...lifts.map(l => l.weight)) : 0
    const bestMax = lifts.length ? Math.max(...lifts.map(l => estimateMax(l.weight, l.reps))) : 0
    const totalVolume = lifts.reduce((s, l) => s + l.weight * l.sets * l.reps, 0)
    const avgTime = avgSecondsAcross(lifts)
    // Extra bento stats
    const improving = lifts.filter(l => getTrend(l.pastWeights || []) === 'up').length
    const muscleGroups = new Set(lifts.map(l => l.type)).size
    const totalSets = lifts.reduce((s, l) => s + l.sets, 0)
    const avgWeight = lifts.length ? Math.round(lifts.reduce((s, l) => s + l.weight, 0) / lifts.length) : 0

    // Pie data — muscle category sessions
    const catSessions: Record<string, number> = {}
    lifts.forEach(l => {
        const cat = MUSCLE_MAP[l.type] || l.type
        catSessions[cat] = (catSessions[cat] || 0) + (l.pastWeights?.length || 0)
    })
    const pieData = Object.entries(catSessions)
        .filter(([, v]) => v > 0)
        .map(([name, value]) => ({ name, value, fill: CAT_COLORS[name] || '#aa3bff' }))

    const balanceMax = Math.max(...Object.values(catSessions), 1)

    const goals = bySession
        .filter(l => (l.pastWeights?.length || 0) >= 1 && getTrend(l.pastWeights) !== 'down')
        .slice(0, 5)
        .map(l => ({ l, target: getNextTarget(l.weight, l.pastWeights), trend: getTrend(l.pastWeights) }))

    const streak = computeWorkoutStreak(lifts)
    const daysAgo = lastWorkoutDaysAgo(lifts)

    // Per-muscle last-trained date
    const lastTrainedByType: Record<string, number> = {}
    lifts.forEach(l => {
        const lastMs = l.sessions?.length
            ? Math.max(...l.sessions.map(s => parseInt(String(s.date))).filter(Boolean))
            : 0
        if (lastMs && (!lastTrainedByType[l.type] || lastMs > lastTrainedByType[l.type]))
            lastTrainedByType[l.type] = lastMs
    })
    const readyGroups = Object.entries(lastTrainedByType)
        .map(([type, ms]) => ({ type, daysAgo: Math.floor((Date.now() - ms) / 86400000) }))
        .filter(g => g.daysAgo >= 2)
        .sort((a, b) => b.daysAgo - a.daysAgo)
        .slice(0, 4)

    const hasData = !loading && lifts.length > 0

    return (
        <>
            <div className='Nav'>
                <span />
                <h1>IronLog</h1>
                <button className='nav-menu-btn' onClick={() => setMenuOpen(o => !o)} aria-label='Menu' aria-expanded={menuOpen}>
                    {menuOpen
                        ? <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                        : <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>}
                </button>
            </div>

            {menuOpen && (
                <>
                    <div className='nav-menu-backdrop' onClick={() => setMenuOpen(false)} />
                    <div className='nav-menu' role='menu'>
                        <button className='nav-menu-item' onClick={() => go('/profile')}>
                            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/></svg>
                            Profile
                        </button>
                        <button className='nav-menu-item' onClick={() => go('/recommended')}>
                            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                            Progression
                        </button>
                        <button className='nav-menu-item' onClick={() => go('/MyLifts')}>
                            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
                            Lift Library
                        </button>
                        <div className='nav-menu-divider' />
                        <button className='nav-menu-item nav-menu-logout' onClick={logout}>
                            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                            Log Out
                        </button>
                    </div>
                </>
            )}

            <div className='home-streak-bar'>
                {username && <span className='home-streak-name'>Hey, <strong>{username.replace(/@.*/, '')}</strong></span>}
                {streak >= 2 ? (
                    <span className='home-streak-fire'>🔥 {streak}-day streak</span>
                ) : daysAgo === 0 ? (
                    <span className='home-streak-today'>Trained today ✓</span>
                ) : daysAgo === 1 ? (
                    <span className='home-streak-warn'>Last workout: yesterday</span>
                ) : daysAgo !== null && daysAgo >= 3 ? (
                    <span className='home-streak-cold'>{daysAgo}d since last workout</span>
                ) : null}
            </div>

            {readyGroups.length > 0 && (
                <div className='home-ready-row'>
                    <span className='home-ready-label'>Train today:</span>
                    {readyGroups.map(g => (
                        <button
                            key={g.type}
                            className={`home-ready-chip ${g.daysAgo >= 5 ? 'overdue' : ''}`}
                            onClick={() => navigate('/workout-builder', { state: { groups: [g.type] } })}
                        >
                            {displayType(g.type)}
                            <span className='home-ready-days'>{g.daysAgo}d</span>
                        </button>
                    ))}
                </div>
            )}

            <div className='home-body'>
            <div className='home-col-main'>
            {/* ── Top Lifts (FIRST) ── */}
            <div id='RecentLifts'>
                <div className='section-card'>
                    <div className='section-card-header'>
                        <h3>Top Lifts</h3>
                        {lifts.length > 5 && (
                            <span className='section-card-more' onClick={() => navigate('/MyLifts')}>+{lifts.length - 5} more</span>
                        )}
                    </div>
                    {loading ? (
                        [1, 2, 3].map(i => <SkeletonLiftRow key={i} />)
                    ) : top5.length > 0 ? (
                        top5.map(lift => (
                            <LiftRow
                                key={lift._id}
                                _id={lift._id}
                                name={lift.name}
                                weight={`${lift.weight} lbs`}
                                reps={lift.reps}
                                sets={lift.sets}
                                type={lift.type}
                                pastWeights={lift.pastWeights || []}
                                sessions={lift.sessions}
                                onMaxUpdate={() => refresh()}
                            />
                        ))
                    ) : (
                        <p style={{ padding: '24px', color: 'var(--text-secondary)' }}>No lifts yet. Tap "Quick Add" below to start!</p>
                    )}
                </div>
            </div>

            {/* Workout CTA */}
            <button
                className={`home-workout-btn ${activeWorkout ? 'resume' : ''}`}
                onClick={() => navigate(activeWorkout ? '/workout' : '/workout-builder')}
            >
                {activeWorkout ? (
                    <>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                        Resume Active Workout
                    </>
                ) : (
                    <>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>
                        Start Workout
                    </>
                )}
            </button>

            {/* Quick Add — under Start Workout */}
            <button className='home-quickadd-btn' onClick={() => setShowQuickAdd(true)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Quick Add Lift
            </button>
            </div>{/* /home-col-main */}

            <div className='home-col-side'>
            {/* ── Bento Dashboard ── */}
            {hasData && (
                <div className='home-bento'>

                    {/* Row 1: Pie + 2×2 stats */}
                    <div className='bento-pie-cell'>
                        <div className='bento-cell-label'>Muscle Focus</div>
                        <ResponsiveContainer width="100%" height={160}>
                            <PieChart>
                                <Pie data={pieData} cx="50%" cy="50%" innerRadius={48} outerRadius={72} paddingAngle={4} dataKey="value" stroke="none">
                                    {pieData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                                </Pie>
                                <Tooltip content={<PieTip />} />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className='bento-pie-legend'>
                            {pieData.map(d => (
                                <div key={d.name} className='pie-legend-item'>
                                    <span className='pie-dot' style={{ background: d.fill }} />
                                    <span className='pie-legend-name'>{d.name}</span>
                                    <span className='pie-legend-val'>{d.value}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className='bento-stats-2x2'>
                        <div className='bento-stat-box'>
                            <span className='bento-stat-lbl'>Sessions</span>
                            <span className='bento-stat-num'>{totalSessions}</span>
                        </div>
                        <div className='bento-stat-box'>
                            <span className='bento-stat-lbl'>Lifts</span>
                            <span className='bento-stat-num'>{lifts.length}</span>
                        </div>
                        <div className='bento-stat-box bento-accent'>
                            <span className='bento-stat-lbl'>Top PR</span>
                            <span className='bento-stat-num'>{topPR}<span className='bento-unit'>lb</span></span>
                        </div>
                        <div className='bento-stat-box bento-green'>
                            <span className='bento-stat-lbl'>Est. Max</span>
                            <span className='bento-stat-num'>{bestMax}<span className='bento-unit'>lb</span></span>
                        </div>
                    </div>

                    {/* Row 2: more stats strip */}
                    <div className='bento-mini-stats'>
                        <div className='bento-mini'>
                            <span className='bento-mini-num bento-mini-up'>{improving}</span>
                            <span className='bento-mini-lbl'>Improving</span>
                        </div>
                        <div className='bento-mini'>
                            <span className='bento-mini-num'>{muscleGroups}</span>
                            <span className='bento-mini-lbl'>Groups</span>
                        </div>
                        <div className='bento-mini'>
                            <span className='bento-mini-num'>{avgWeight}<span className='bento-unit'>lb</span></span>
                            <span className='bento-mini-lbl'>Avg Wt</span>
                        </div>
                        <div className='bento-mini'>
                            <span className='bento-mini-num'>{totalSets}</span>
                            <span className='bento-mini-lbl'>Total Sets</span>
                        </div>
                    </div>

                    {/* Row 3: Volume + Avg lift time wide stat */}
                    <div className='bento-wide-stat'>
                        <div className='bento-wide-left'>
                            <span className='bento-wide-label'>Total Volume Lifted</span>
                            <span className='bento-wide-hint'>weight × sets × reps across all exercises</span>
                        </div>
                        <div className='bento-wide-figures'>
                            <span className='bento-wide-num'>{Math.round(totalVolume / 1000).toLocaleString()}k <span className='bento-wide-unit'>lbs</span></span>
                            {avgTime > 0 && (
                                <span className='bento-wide-sub'>⏱ {fmtDur(avgTime)} <span className='bento-wide-unit'>avg/lift</span></span>
                            )}
                        </div>
                    </div>

                    {/* Row 4: Balance bars */}
                    <div className='bento-balance-cell'>
                        <div className='bento-cell-label'>Training Balance</div>
                        <div className='bento-balance-bars'>
                            {Object.entries(catSessions).sort((a, b) => b[1] - a[1]).map(([cat, val]) => (
                                <div key={cat} className='bento-bar-row'>
                                    <span className='bento-bar-label'>{cat}</span>
                                    <div className='bento-bar-track'>
                                        <div
                                            className='bento-bar-fill'
                                            style={{ width: `${Math.round((val / balanceMax) * 100)}%`, background: CAT_COLORS[cat] || 'var(--accent)' }}
                                        />
                                    </div>
                                    <span className='bento-bar-val'>{val}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Row 5: Next Session Targets */}
                    {goals.length > 0 && (
                        <div className='bento-targets-cell'>
                            <div className='bento-cell-label'>
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                                Next Session Targets
                            </div>
                            <div className='bento-targets-list'>
                                {goals.map(({ l, target, trend }) => (
                                    <div key={l._id} className='bento-target-row'>
                                        <div className='bento-target-left'>
                                            <span className={`lift-row-trend trend-${trend}`}>{trend === 'up' ? '↑' : trend === 'flat' ? '→' : 'New'}</span>
                                            <span className='bento-target-name'>{l.name}</span>
                                            <span className='bento-target-type'>{l.type}</span>
                                        </div>
                                        <span className='bento-target-val'>{target} lbs</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                </div>
            )}
            </div>{/* /home-col-side */}
            </div>{/* /home-body */}

            {showQuickAdd && <QuickAdd onClose={() => setShowQuickAdd(false)} onAdded={() => refresh()} />}
        </>
    )
}
