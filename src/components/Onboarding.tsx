import { useState, useContext } from 'react'
import { useNavigate } from 'react-router-dom'
import { AuthContext } from '../context/context'
import { createLift, clearLiftsCache } from '../utils/api'
import { PLACEHOLDERS } from '../utils/workout'
import './Onboarding.css'

const MUSCLE_TYPES = ['Chest', 'Back', 'Legs', 'Shoulders', 'Bicept', 'Tricept', 'Abbs', 'Forearms']
const ICONS: Record<string, string> = {
    Chest: '💪', Back: '🔙', Legs: '🦵', Shoulders: '🏋️',
    Bicept: '💪', Tricept: '🦾', Abbs: '🎯', Forearms: '🤜',
}

export default function Onboarding() {
    const navigate = useNavigate()
    const context = useContext(AuthContext)
    const [groupIdx, setGroupIdx] = useState(0)
    const [picks, setPicks] = useState<Record<string, string[]>>({})
    const [step, setStep] = useState<'pick' | 'confirm'>('pick')
    const [busy, setBusy] = useState(false)

    const currentGroup = MUSCLE_TYPES[groupIdx]
    const currentPicks = picks[currentGroup] || []
    const totalGroups = MUSCLE_TYPES.length
    const isLastGroup = groupIdx === totalGroups - 1

    const advance = () => {
        if (groupIdx < totalGroups - 1) setGroupIdx(i => i + 1)
        else setStep('confirm')
    }

    const selectLift = (name: string) => {
        if (currentPicks.includes(name) || currentPicks.length >= 2) return
        const next = [...currentPicks, name]
        setPicks(p => ({ ...p, [currentGroup]: next }))
        if (next.length === 2) advance()
    }

    const allPicked = MUSCLE_TYPES.flatMap(g =>
        (picks[g] || []).map(name => {
            const ph = (PLACEHOLDERS[g] || []).find(p => p.name === name)!
            return { ...ph, type: g }
        })
    )

    const createLifts = async () => {
        setBusy(true)
        try {
            await Promise.all(allPicked.map(lift =>
                createLift({ name: lift.name, weight: lift.weight, sets: 3, reps: lift.reps, type: lift.type }, context.token)
            ))
            clearLiftsCache() // force fresh fetch on Home with the new lifts
        } catch (err) { console.error(err) }
        navigate('/Home')
    }

    if (step === 'confirm') return (
        <div className='ob-page'>
            <div className='ob-card'>
                <div className='ob-brand'>
                    <span className='ob-icon'>🏋️</span>
                    <h1 className='ob-title'>Your Starter Lifts</h1>
                    <p className='ob-sub'>These will be added to your library. Edit weights anytime.</p>
                </div>

                {allPicked.length === 0 ? (
                    <>
                        <p style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: 14 }}>
                            No exercises selected yet.
                        </p>
                        <button className='ob-cta' onClick={() => { setGroupIdx(0); setStep('pick') }}>
                            Pick Exercises
                        </button>
                    </>
                ) : (
                    <>
                        <div className='ob-lift-list'>
                            {allPicked.map((l, i) => (
                                <div key={i} className='ob-lift-row'>
                                    <div className='ob-lift-info'>
                                        <span className='ob-lift-name'>{l.name}</span>
                                        <span className='ob-lift-meta'>
                                            {l.type} · 3×{l.reps}
                                            {l.weight > 0 ? ` · ${l.weight} lbs` : ' · Bodyweight'}
                                        </span>
                                    </div>
                                    <span className='ob-lift-num'>{i + 1}</span>
                                </div>
                            ))}
                        </div>
                        <button className='ob-cta ob-cta-go' onClick={createLifts} disabled={busy}>
                            {busy ? 'Setting up…' : "Let's Go 🚀"}
                        </button>
                        <button className='ob-text-link' onClick={() => { setGroupIdx(0); setStep('pick') }}>
                            Back to picks
                        </button>
                    </>
                )}
            </div>
        </div>
    )

    return (
        <div className='ob-page'>
            <div className='ob-card'>
                {/* Progress dots */}
                <div className='ob-progress-dots'>
                    {MUSCLE_TYPES.map((g, i) => (
                        <span
                            key={g}
                            className={`ob-dot ${i < groupIdx ? 'done' : i === groupIdx ? 'active' : ''} ${(picks[g]?.length || 0) > 0 ? 'has-picks' : ''}`}
                        />
                    ))}
                </div>

                {/* Animated group content — key change triggers slide-in */}
                <div key={groupIdx} className='ob-group-content'>
                    <div className='ob-group-header'>
                        <span className='ob-group-icon'>{ICONS[currentGroup]}</span>
                        <div>
                            <div className='ob-group-name'>{currentGroup}</div>
                            <div className='ob-group-sub'>Pick 2 exercises</div>
                        </div>
                        <span className={`ob-count ${currentPicks.length === 2 ? 'full' : ''}`}>
                            {currentPicks.length}/2
                        </span>
                    </div>

                    <div className='ob-lift-options'>
                        {(PLACEHOLDERS[currentGroup] || []).map(ph => {
                            const sel = currentPicks.includes(ph.name)
                            const maxed = currentPicks.length >= 2 && !sel
                            return (
                                <button key={ph.name}
                                    className={`ob-lift-opt ${sel ? 'active' : ''}`}
                                    disabled={maxed}
                                    onClick={() => selectLift(ph.name)}
                                >
                                    <span className='ob-lift-opt-name'>{ph.name}</span>
                                    <span className='ob-lift-opt-meta'>
                                        {ph.weight > 0 ? `${ph.weight} lbs` : 'Bodyweight'} · {ph.reps} reps
                                    </span>
                                    {sel && <span className='ob-lift-opt-check'>✓</span>}
                                </button>
                            )
                        })}
                    </div>
                </div>

                <div className='ob-nav-row'>
                    <span className='ob-progress-text'>{groupIdx + 1} of {totalGroups}</span>
                    {isLastGroup ? (
                        <button className='ob-done' onClick={() => setStep('confirm')}>Done</button>
                    ) : (
                        <button className='ob-skip' onClick={advance}>Skip →</button>
                    )}
                </div>
            </div>
        </div>
    )
}
