import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { WORKOUT_KEY, PLACEHOLDERS, makeId, displayType, type WorkoutExercise } from '../utils/workout'
import { useLifts } from '../utils/useLifts'
import type { Lift as UserLift } from '../utils/api'
import './Homer.css'
import './WorkoutBuilder.css'
import './QuickAdd.css'

const MUSCLE_TYPES = ['Chest', 'Tricept', 'Bicept', 'Shoulders', 'Back', 'Abbs', 'Legs', 'Forearms']
const DURATIONS = [20, 30, 45, 60, 90]

function buildPlan(groups: string[], totalMin: number, sets: number, lifts: UserLift[]): WorkoutExercise[] {
    const count = Math.max(2, Math.floor((totalMin * 60) / (sets * 120 + 60)))
    const matching = lifts.filter(l => groups.includes(l.type)).sort((a, b) => (b.pastWeights?.length || 0) - (a.pastWeights?.length || 0))
    const plan: WorkoutExercise[] = matching.slice(0, count).map(l => ({ id: makeId(), name: l.name, type: l.type, weight: l.weight, reps: l.reps, sets, completedSets: Array(sets).fill(false), liftId: l._id }))
    const used = new Set(plan.map(e => e.name))
    outer: for (let a = 0; plan.length < count && a < 4; a++) {
        for (const g of groups) {
            for (const ph of (PLACEHOLDERS[g] || [])) {
                if (!used.has(ph.name) && plan.length < count) {
                    used.add(ph.name)
                    plan.push({ id: makeId(), name: ph.name, type: g, weight: ph.weight, reps: ph.reps, sets, completedSets: Array(sets).fill(false), isPlaceholder: true })
                }
            }
        }
        if (plan.length < count) break outer
    }
    return plan
}

export default function WorkoutBuilder() {
    const navigate = useNavigate()
    const location = useLocation()
    const { lifts: userLifts, loading } = useLifts()
    const [mode, setMode] = useState<'planned' | 'on-the-go'>('planned')
    const [groups, setGroups] = useState<string[]>((location.state as any)?.groups || [])
    const [duration, setDuration] = useState(45)
    const [setsPerEx, setSetsPerEx] = useState(3)
    const [plan, setPlan] = useState<WorkoutExercise[]>([])
    const [showSplit, setShowSplit] = useState(false)
    const [showCustom, setShowCustom] = useState(false)
    const [cName, setCName] = useState('')
    const [cWeight, setCWeight] = useState('')
    const [cType, setCType] = useState('')
    // Drag state
    const [dragIdx, setDragIdx] = useState<number | null>(null)
    const [dragOverIdx, setDragOverIdx] = useState<number | null>(null)

    useEffect(() => {
        if (groups.length > 0) setPlan(buildPlan(groups, duration, setsPerEx, userLifts))
        else setPlan([])
    }, [groups, duration, setsPerEx, userLifts])

    const toggleGroup = (g: string) =>
        setGroups(p => p.includes(g) ? p.filter(x => x !== g) : p.length < 3 ? [...p, g] : p)

    const removeEx = (id: string) => setPlan(p => p.filter(e => e.id !== id))

    const addFromLibrary = (l: UserLift) => {
        if (plan.find(e => e.name === l.name)) return
        setPlan(p => [...p, { id: makeId(), name: l.name, type: l.type, weight: l.weight, reps: l.reps, sets: setsPerEx, completedSets: Array(setsPerEx).fill(false), liftId: l._id }])
    }

    const addCustom = () => {
        if (!cName.trim()) return
        setPlan(p => [...p, { id: makeId(), name: cName.trim(), type: cType || groups[0] || 'Custom', weight: parseInt(cWeight) || 0, reps: 10, sets: setsPerEx, completedSets: Array(setsPerEx).fill(false), isPlaceholder: true }])
        setCName(''); setCWeight(''); setCType(''); setShowCustom(false)
    }

    // ── Drag handlers ──
    const onPlanDragStart = (e: React.DragEvent, idx: number) => {
        e.dataTransfer.setData('src', 'plan'); e.dataTransfer.setData('idx', String(idx)); e.dataTransfer.effectAllowed = 'move'
        setDragIdx(idx)
    }
    const onLibDragStart = (e: React.DragEvent, liftId: string) => {
        e.dataTransfer.setData('src', 'lib'); e.dataTransfer.setData('liftId', liftId); e.dataTransfer.effectAllowed = 'copy'
    }
    const onDragOver = (e: React.DragEvent, idx: number) => { e.preventDefault(); setDragOverIdx(idx) }
    const onDrop = (e: React.DragEvent, targetIdx: number) => {
        e.preventDefault()
        e.stopPropagation() // prevent the panel-level drop from also firing (was forcing items to the bottom)
        const src = e.dataTransfer.getData('src')
        if (src === 'plan') {
            const from = parseInt(e.dataTransfer.getData('idx'))
            if (from !== targetIdx) {
                const next = [...plan]; const [item] = next.splice(from, 1); next.splice(targetIdx, 0, item); setPlan(next)
            }
        } else if (src === 'lib') {
            const liftId = e.dataTransfer.getData('liftId')
            const lift = userLifts.find(l => l._id === liftId)
            if (lift && !plan.find(e => e.name === lift.name)) {
                const next = [...plan]
                const newEx: WorkoutExercise = { id: makeId(), name: lift.name, type: lift.type, weight: lift.weight, reps: lift.reps, sets: setsPerEx, completedSets: Array(setsPerEx).fill(false) }
                next.splice(targetIdx, 0, newEx); setPlan(next)
            }
        }
        setDragIdx(null); setDragOverIdx(null)
    }
    const onDragEnd = () => { setDragIdx(null); setDragOverIdx(null) }
    const onPlanDrop = (e: React.DragEvent) => { e.preventDefault(); onDrop(e, plan.length) }

    const generate = () => {
        if (!plan.length && mode === 'planned') return
        localStorage.setItem(WORKOUT_KEY, JSON.stringify({ exercises: plan, startTime: Date.now(), totalMinutes: duration, muscleGroups: groups, mode }))
        navigate('/workout')
    }

    const estMin = plan.reduce((s, e) => s + Math.ceil((e.sets * 120 + 60) / 60), 0)
    // Library panel shows ALL lifts matching the selected groups (in-plan ones marked "Added")
    const typeLifts = userLifts.filter(l => groups.includes(l.type))

    return (
        <>
            <div className='Nav'>
                <h2 onClick={() => navigate('/Home')}>← Home</h2>
                <h1>Build Workout</h1>
                <span />
            </div>

            <div className='wb-page'>
                <div className='wb-mode-row'>
                    <button className={`wb-mode-card ${mode === 'planned' ? 'active' : ''}`} onClick={() => setMode('planned')}>
                        <div className='wb-mode-card-title'>Planned</div>
                        <div className='wb-mode-card-desc'>Structured session with a defined exercise list. Ends when all sets are done.</div>
                    </button>
                    <button className={`wb-mode-card ${mode === 'on-the-go' ? 'active' : ''}`} onClick={() => setMode('on-the-go')}>
                        <div className='wb-mode-card-title'>On the Go</div>
                        <div className='wb-mode-card-desc'>No fixed plan. Add lifts mid-session. Ends only when you say so.</div>
                    </button>
                </div>

                {mode === 'planned' && (
                <div className='wb-section'>
                    <div className='wb-section-title'>Muscle Groups <span className='wb-hint'>up to 3</span></div>
                    <div className='wb-chips'>
                        {MUSCLE_TYPES.map(g => (
                            <button key={g} className={`wb-chip ${groups.includes(g) ? 'active' : ''}`}
                                onClick={() => toggleGroup(g)} disabled={!groups.includes(g) && groups.length >= 3}>{displayType(g)}</button>
                        ))}
                    </div>
                </div>
                )}

                <div className='wb-section'>
                    <div className='wb-section-title'>Duration & Sets</div>
                    {mode === 'planned' && (
                    <div className='wb-chips'>
                        {DURATIONS.map(d => (
                            <button key={d} className={`wb-chip ${duration === d ? 'active' : ''}`} onClick={() => setDuration(d)}>{d}m</button>
                        ))}
                    </div>
                    )}
                    <div className='wb-sets-row'>
                        <span className='wb-sets-label'>Default sets per exercise</span>
                        <div className='wb-stepper'>
                            <button onClick={() => setSetsPerEx(s => Math.max(1, s - 1))}>−</button>
                            <span>{setsPerEx}</span>
                            <button onClick={() => setSetsPerEx(s => Math.min(6, s + 1))}>+</button>
                        </div>
                    </div>
                    {plan.length > 0 && (
                        <div className='wb-estimate'>
                            <span className='wb-est-num'>{plan.length}</span> exercises
                            <span className='wb-est-dot'>·</span>
                            <span className='wb-est-num'>~{estMin}</span> min
                            <span className='wb-est-dot'>·</span>
                            <span className='wb-est-num'>{plan.length * setsPerEx}</span> sets
                        </div>
                    )}
                </div>

                {mode === 'on-the-go' && (
                    <div className='wb-otg-cta'>
                        <div className='wb-otg-icon'>🏃</div>
                        <div className='wb-otg-text'>
                            <strong>Start fresh</strong>
                            <span>Add exercises mid-session from your lift library</span>
                        </div>
                    </div>
                )}

                {groups.length > 0 && (
                    <div className='wb-section'>
                        <div className='wb-section-title'>
                            Workout Plan
                            <span className='wb-hint'>drag to reorder</span>
                        </div>
                        <div className='wb-plan-list'
                            onDragOver={e => { if (plan.length === 0) e.preventDefault() }}
                            onDrop={plan.length === 0 ? onPlanDrop : undefined}
                        >
                            {plan.map((ex, i) => (
                                <div key={ex.id}
                                    draggable
                                    className={`wb-plan-row ${dragOverIdx === i ? 'drag-over' : ''} ${dragIdx === i ? 'dragging' : ''}`}
                                    onDragStart={e => onPlanDragStart(e, i)}
                                    onDragOver={e => onDragOver(e, i)}
                                    onDrop={e => onDrop(e, i)}
                                    onDragEnd={onDragEnd}
                                >
                                    <span className='wb-drag-handle'>⠿</span>
                                    <span className='wb-plan-num'>{i + 1}</span>
                                    <div className='wb-plan-info'>
                                        <span className='wb-plan-name'>{ex.name}</span>
                                        <span className='wb-plan-meta'>
                                            {ex.type} · {ex.sets}×{ex.reps}
                                            {ex.weight > 0 ? ` · ${ex.weight} lbs` : ' · Bodyweight'}
                                            {ex.isPlaceholder && <span className='wb-tag'>Template</span>}
                                        </span>
                                    </div>
                                    <button className='wb-remove' onClick={() => removeEx(ex.id)}>×</button>
                                </div>
                            ))}
                            {/* Drop zone at end */}
                            <div className={`wb-drop-zone ${dragOverIdx === plan.length ? 'active' : ''}`}
                                onDragOver={e => { e.preventDefault(); setDragOverIdx(plan.length) }}
                                onDrop={onPlanDrop}
                                onDragLeave={() => setDragOverIdx(null)}
                            />
                        </div>
                        <div className='wb-add-row'>
                            <button className='wb-add-btn' onClick={() => setShowSplit(true)}>
                                + Add from My Lifts
                            </button>
                            <button className='wb-add-btn accent' onClick={() => setShowCustom(true)}>
                                + Custom
                            </button>
                        </div>
                    </div>
                )}

                {(plan.length > 0 || mode === 'on-the-go') && (
                    <button className='wb-generate-btn' onClick={generate}>Start Workout →</button>
                )}

                {groups.length === 0 && !loading && (
                    <div className='wb-empty'>Select muscle groups above to build your workout</div>
                )}
            </div>

            {/* Split Panel — My Lifts ↔ Workout Plan */}
            {showSplit && (
                <div className='wb-split-overlay'>
                    <div className='wb-split-header'>
                        <span className='wb-split-title'>Add from My Lifts</span>
                        <button className='wb-split-close' onClick={() => setShowSplit(false)}>✕ Done</button>
                    </div>
                    <div className='wb-split-body'>
                        {/* Library panel */}
                        <div className='wb-split-panel wb-split-lib'>
                            <div className='wb-split-panel-label'>My Lifts · {groups.join(' · ')}</div>
                            <div className='wb-split-list'>
                                {typeLifts.length === 0 && (
                                    <p className='wb-split-empty'>No saved lifts for these muscle groups yet.</p>
                                )}
                                {typeLifts.map(l => {
                                    const inPlan = plan.some(e => e.name === l.name)
                                    return (
                                        <div key={l._id}
                                            draggable={!inPlan}
                                            className={`wb-split-lib-row ${inPlan ? 'added' : ''}`}
                                            onDragStart={inPlan ? undefined : e => onLibDragStart(e, l._id)}
                                            onClick={inPlan ? undefined : () => addFromLibrary(l)}
                                        >
                                            <span className='wb-split-drag'>⠿</span>
                                            <div className='wb-split-info'>
                                                <span className='wb-split-name'>{l.name}</span>
                                                <span className='wb-split-meta'>{l.type} · {l.weight} lbs · {l.sets}×{l.reps}</span>
                                            </div>
                                            {inPlan
                                                ? <span className='wb-split-added'>✓ Added</span>
                                                : <span className='wb-split-add'>+</span>}
                                        </div>
                                    )
                                })}
                            </div>
                        </div>

                        {/* Plan panel */}
                        <div className='wb-split-panel wb-split-plan'
                            onDragOver={e => { e.preventDefault(); if (dragOverIdx === null) setDragOverIdx(plan.length) }}
                            onDrop={onPlanDrop}
                            onDragLeave={() => setDragOverIdx(null)}
                        >
                            <div className='wb-split-panel-label'>Workout Plan — drag to reorder</div>
                            <div className='wb-split-list'>
                                {plan.length === 0 && (
                                    <div className='wb-split-drop-hint'>Drag exercises here</div>
                                )}
                                {plan.map((ex, i) => (
                                    <div key={ex.id}
                                        draggable
                                        className={`wb-split-plan-row ${dragOverIdx === i ? 'drag-over' : ''} ${dragIdx === i ? 'dragging' : ''}`}
                                        onDragStart={e => onPlanDragStart(e, i)}
                                        onDragOver={e => onDragOver(e, i)}
                                        onDrop={e => onDrop(e, i)}
                                        onDragEnd={onDragEnd}
                                    >
                                        <span className='wb-split-drag'>⠿</span>
                                        <span className='wb-split-num'>{i + 1}</span>
                                        <div className='wb-split-info'>
                                            <span className='wb-split-name'>{ex.name}</span>
                                            <span className='wb-split-meta'>{ex.type}{ex.isPlaceholder ? ' · Template' : ''}</span>
                                        </div>
                                        <button className='wb-split-remove' onClick={() => removeEx(ex.id)}>×</button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Custom Exercise */}
            {showCustom && (
                <div className='qa-overlay' onClick={() => setShowCustom(false)}>
                    <div className='qa-sheet' onClick={e => e.stopPropagation()}>
                        <div className='qa-handle' />
                        <h3 className='qa-title'>Custom Exercise</h3>
                        <form className='qa-form' onSubmit={e => { e.preventDefault(); addCustom() }}>
                            <input className='qa-input' placeholder='Exercise name' value={cName} onChange={e => setCName(e.target.value)} autoFocus />
                            <div className='qa-row'>
                                <div className='qa-stepper'>
                                    <button type='button' onClick={() => setCWeight(String(Math.max(0, (parseInt(cWeight) || 0) - 5)))}>−</button>
                                    <input className='qa-weight-val' type='number' inputMode='decimal' placeholder='0' value={cWeight} onChange={e => setCWeight(e.target.value)} />
                                    <span className='qa-step-unit'>lbs</span>
                                    <button type='button' onClick={() => setCWeight(String((parseInt(cWeight) || 0) + 5))}>+</button>
                                </div>
                                <select className='qa-input qa-type' value={cType} onChange={e => setCType(e.target.value)}>
                                    <option value=''>Type…</option>
                                    {MUSCLE_TYPES.map(t => <option key={t}>{t}</option>)}
                                </select>
                            </div>
                            <button className='qa-submit' type='submit' disabled={!cName.trim()}>Add Exercise</button>
                        </form>
                    </div>
                </div>
            )}
        </>
    )
}
