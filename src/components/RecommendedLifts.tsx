import { useContext, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AuthContext } from '../context/context'
import { API_URL } from '../config'
import SkeletonLiftRow from './SkeletonLiftRow'
import './Homer.css'
import './RecommendedLifts.css'

type Lift = {
    _id: string
    name: string
    weight: number
    sets: number
    reps: number
    type: string
    pastWeights: number[]
}

type GroupSummary = {
    type: string
    lifts: Lift[]
    avgWeight: number
    totalSessions: number
    topLift: Lift
    suggestion: string
}

function buildSuggestion(lift: Lift): string {
    const sessions = lift.pastWeights?.length || 0
    const current = lift.weight
    if (sessions < 2) return `Log a few more sessions to get a progression suggestion.`
    const last = lift.pastWeights[sessions - 1]
    const prev = lift.pastWeights[sessions - 2]
    if (last > prev) return `Great progress! Try ${Math.round(current * 1.05)} lbs next session (+5%).`
    if (last === prev) return `Steady. Push for ${current + 5} lbs next time.`
    return `You dipped last session. Nail ${current} lbs consistently before going heavier.`
}

export default function RecommendedLifts() {
    const navigate = useNavigate()
    const context = useContext(AuthContext)
    const [groups, setGroups] = useState<GroupSummary[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        setLoading(true)
        fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${context.token}` },
            body: JSON.stringify({ query: `query { userLifts { _id name weight sets reps type pastWeights } }` })
        })
            .then(r => r.json())
            .then(data => {
                const lifts: Lift[] = data.data?.userLifts || []
                const byType: { [k: string]: Lift[] } = {}
                lifts.forEach(l => {
                    if (!byType[l.type]) byType[l.type] = []
                    byType[l.type].push(l)
                })
                const summaries: GroupSummary[] = Object.entries(byType).map(([type, ls]) => {
                    const totalSessions = ls.reduce((s, l) => s + (l.pastWeights?.length || 0), 0)
                    const avgWeight = Math.round(ls.reduce((s, l) => s + l.weight, 0) / ls.length)
                    const topLift = [...ls].sort((a, b) => b.weight - a.weight)[0]
                    return { type, lifts: ls, avgWeight, totalSessions, topLift, suggestion: buildSuggestion(topLift) }
                })
                setGroups(summaries.sort((a, b) => a.type.localeCompare(b.type)))
            })
            .catch(console.error)
            .finally(() => setLoading(false))
    }, [])

    return (
        <>
            <div className='Nav'>
                <h2 onClick={() => navigate('/Home')}>Home</h2>
                <h1>Recommended</h1>
                <span />
            </div>

            <div className='rec-intro'>
                <p>Based on your lift history, here's what to focus on next.</p>
            </div>

            {loading ? (
                <div className='section-card'>
                    <div className='section-card-header'><div className='skeleton skeleton-title' /></div>
                    {[1, 2].map(i => <SkeletonLiftRow key={i} />)}
                </div>
            ) : groups.length === 0 ? (
                <div className='section-card'>
                    <p style={{ padding: '24px', color: 'var(--text-secondary)' }}>
                        Add some lifts first to get recommendations!
                    </p>
                </div>
            ) : (
                groups.map(g => (
                    <div key={g.type} className='section-card rec-card'>
                        <div className='section-card-header'>
                            <h3>{g.type}</h3>
                            <span className='rec-sessions'>{g.totalSessions} sessions</span>
                        </div>

                        <div className='rec-stats-row'>
                            <div className='rec-stat'>
                                <span className='rec-stat-label'>Avg Weight</span>
                                <span className='rec-stat-value'>{g.avgWeight} lbs</span>
                            </div>
                            <div className='rec-stat'>
                                <span className='rec-stat-label'>Top Lift</span>
                                <span className='rec-stat-value'>{g.topLift.weight} lbs</span>
                            </div>
                            <div className='rec-stat'>
                                <span className='rec-stat-label'>Exercises</span>
                                <span className='rec-stat-value'>{g.lifts.length}</span>
                            </div>
                        </div>

                        <div className='rec-suggestion'>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                            <p><strong>{g.topLift.name}:</strong> {g.suggestion}</p>
                        </div>

                        <div className='rec-lift-list'>
                            {g.lifts
                                .sort((a, b) => b.weight - a.weight)
                                .map(l => (
                                    <div key={l._id} className='rec-lift-row'>
                                        <span className='rec-lift-name'>{l.name}</span>
                                        <span className='rec-lift-weight'>{l.weight} lbs</span>
                                        <span className='rec-lift-detail'>{l.sets}×{l.reps}</span>
                                        <span className='rec-lift-sessions'>{l.pastWeights?.length || 0} sessions</span>
                                    </div>
                                ))}
                        </div>
                    </div>
                ))
            )}
            <div style={{ height: 80 }} />
        </>
    )
}
