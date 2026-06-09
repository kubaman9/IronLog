import { useState, useEffect, useRef, useContext } from 'react'
import { useNavigate } from 'react-router-dom'
import { AuthContext } from '../context/context'
import { logSession, clearLiftsCache, getCachedLifts, createLift } from '../utils/api'
import { WORKOUT_KEY, PLACEHOLDERS, makeId, fmtTime, displayType, type WorkoutExercise, type ActiveWorkout } from '../utils/workout'
import { avgSessionSeconds, fmtDur, fmtDate, getWorkoutTimes, addWorkoutTime } from '../utils/liftTimes'
import { getNextTarget, getTrend } from '../utils/progression'
import { useLifts } from '../utils/useLifts'
import './Homer.css'
import './WorkoutSession.css'
import './QuickAdd.css'

const MUSCLE_TYPES = ['Chest', 'Tricept', 'Bicept', 'Shoulders', 'Back', 'Abbs', 'Legs', 'Forearms']

// Per-exercise duration = time between finishing the previous exercise and this
// one (in completion order). Robust even if all sets are checked in one tap.
function completionDurations(exercises: WorkoutExercise[], startTime: number): Record<string, number> {
    const completed = exercises.filter(e => e.completedAt).sort((a, b) => (a.completedAt! - b.completedAt!))
    const dur: Record<string, number> = {}
    let prev = startTime
    for (const ex of completed) {
        dur[ex.id] = Math.max(0, (ex.completedAt! - prev) / 1000)
        prev = ex.completedAt!
    }
    return dur
}

export default function WorkoutSession() {
    const navigate = useNavigate()
    const context = useContext(AuthContext)
    const { lifts: savedLifts, refresh: refreshLifts } = useLifts()
    const [sessionMode, setSessionMode] = useState<'planned' | 'on-the-go'>('planned')
    const [exercises, setExercises] = useState<WorkoutExercise[]>([])
    const [startTime, setStartTime] = useState(0)
    const [totalMinutes, setTotalMinutes] = useState(45)
    const [elapsed, setElapsed] = useState(0)
    const [loaded, setLoaded] = useState(false)
    const [paused, setPaused] = useState(false)
    const [pausedAt, setPausedAt] = useState(0)
    const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set())
    const [showAddEx, setShowAddEx] = useState(false)
    const [showAddLift, setShowAddLift] = useState(false)
    const [showGenerateLifts, setShowGenerateLifts] = useState(false)
    const [selectedGenIds, setSelectedGenIds] = useState<Set<string>>(new Set())
    const [sessionGroups, setSessionGroups] = useState<string[]>([])
    const [addLiftFilter, setAddLiftFilter] = useState<string>('')
    const [prCelebrate, setPrCelebrate] = useState(false)
    const swipeTouchY = useRef(0)

    const PR_EMOJIS = ['🏆', '💪', '🔥', '⚡', '🎯', '🚀']
    const prEmojiRef = useRef(PR_EMOJIS[0])

    const useSwipe = (onClose: () => void) => ({
        onTouchStart: (e: React.TouchEvent) => { swipeTouchY.current = e.touches[0].clientY },
        onTouchEnd: (e: React.TouchEvent) => { if (e.changedTouches[0].clientY - swipeTouchY.current > 70) onClose() }
    })
    const [qaName, setQaName] = useState('')
    const [qaWeight, setQaWeight] = useState('')
    const [qaType, setQaType] = useState('Chest')
    const [qaLoading, setQaLoading] = useState(false)
    const [showSummary, setShowSummary] = useState(false)
    const [finalElapsed, setFinalElapsed] = useState(0)
    const [saving, setSaving] = useState(false)
    const [cardFlash, setCardFlash] = useState<Record<string, 'pr' | 'target'>>({})
    const [valFlash, setValFlash] = useState<Record<string, 'wi' | 'wd' | 'ri' | 'rd'>>({})
    const [cName, setCName] = useState('')
    const [cWeight, setCWeight] = useState('')
    const [cType, setCType] = useState('')
    const [restSecsLeft, setRestSecsLeft] = useState<number | null>(null)
    const [restTarget, setRestTarget] = useState(() => {
        const saved = parseInt(localStorage.getItem('ironlog_rest') || '90')
        return isNaN(saved) ? 90 : Math.max(15, Math.min(300, saved))
    })
    const intervalRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined)
    const restRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined)

    useEffect(() => {
        const raw = localStorage.getItem(WORKOUT_KEY)
        if (!raw) { navigate('/workout-builder', { replace: true }); return }
        const saved: ActiveWorkout = JSON.parse(raw)
        setExercises(saved.exercises)
        setStartTime(saved.startTime)
        setTotalMinutes(saved.totalMinutes)
        setSessionMode(saved.mode || 'planned')
        setSessionGroups(saved.muscleGroups || [])
        setElapsed(Date.now() - saved.startTime)
        setLoaded(true)
    }, [])

    useEffect(() => {
        if (!loaded || !startTime || paused) return
        intervalRef.current = setInterval(() => setElapsed(Date.now() - startTime), 1000)
        return () => clearInterval(intervalRef.current)
    }, [loaded, startTime, paused])

    // Cleanup rest timer on unmount
    useEffect(() => () => clearInterval(restRef.current), [])

    // Auto-scroll to next incomplete exercise after a card collapses
    useEffect(() => {
        if (!loaded) return
        const firstId = exercises.find(e => !e.completedSets.every(Boolean))?.id
        if (!firstId) return
        const t = setTimeout(() => {
            const el = document.getElementById(`ws-ex-${firstId}`)
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }, 200)
        return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [collapsedIds])

    useEffect(() => {
        if (!loaded || !exercises.length) return
        const raw = localStorage.getItem(WORKOUT_KEY)
        if (!raw) return
        localStorage.setItem(WORKOUT_KEY, JSON.stringify({ ...JSON.parse(raw), exercises }))
    }, [exercises, loaded])

    const togglePause = () => {
        if (paused) {
            const pauseDuration = Date.now() - pausedAt
            setStartTime(t => t + pauseDuration)
            setPaused(false)
        } else {
            clearInterval(intervalRef.current)
            setPausedAt(Date.now())
            setPaused(true)
        }
    }

    const updateEx = (id: string, patch: Partial<WorkoutExercise>) =>
        setExercises(p => p.map(e => e.id === id ? { ...e, ...patch } : e))

    // Correct rapid-tap increments — reads latest state, fires micro-animation
    const stepEx = (exId: string, field: 'weight' | 'reps' | 'sets', delta: number) => {
        setExercises(p => p.map(e => {
            if (e.id !== exId) return e
            if (field === 'weight') return { ...e, weight: Math.max(0, (e.weight || 0) + delta) }
            if (field === 'sets') {
                const next = Math.max(1, Math.min(10, e.sets + delta))
                return { ...e, sets: next, completedSets: Array(next).fill(false).map((_, i) => e.completedSets[i] ?? false) }
            }
            return { ...e, reps: Math.max(1, e.reps + delta) }
        }))
        if (field === 'sets') return
        const type = field === 'weight' ? (delta > 0 ? 'wi' : 'wd') : (delta > 0 ? 'ri' : 'rd')
        setValFlash(p => ({ ...p, [exId]: type as 'wi' | 'wd' | 'ri' | 'rd' }))
        setTimeout(() => setValFlash(p => { const n = { ...p }; delete n[exId]; return n }), 400)
    }

    // Cumulative set selection: tap N → mark 1..N done; tap done N → unmark N..last
    const handleSetClick = (exId: string, idx: number) => {
        const ex = exercises.find(e => e.id === exId)!
        const wasDone = ex.completedSets[idx]
        const next = ex.completedSets.map((c, i) =>
            wasDone ? (i < idx ? c : false) : (i <= idx ? true : c)
        )
        const anyDone = next.some(Boolean)
        const allDone = next.every(Boolean)
        const patch: Partial<WorkoutExercise> = { completedSets: next }
        // Timing: start when the first set is checked, complete when all are done
        if (anyDone && !ex.startedAt) patch.startedAt = Date.now()
        if (!anyDone) patch.startedAt = undefined
        patch.completedAt = allDone ? Date.now() : undefined
        updateEx(exId, patch)
        if (allDone) {
            skipRest() // exercise done — cancel any active rest
            const sl = ex.liftId ? savedLifts.find(l => l._id === ex.liftId) ?? null : null
            const pw = sl?.pastWeights ?? []
            const flash = (sl && pw.length >= 1 && ex.weight > Math.max(...pw)) ? 'pr' as const
                : (sl && pw.length >= 2 && ex.weight >= getNextTarget(sl.weight, pw)) ? 'target' as const
                : null
            if (flash) {
                setCardFlash(prev => ({ ...prev, [exId]: flash }))
                if (flash === 'pr') {
                    prEmojiRef.current = PR_EMOJIS[Math.floor(Math.random() * PR_EMOJIS.length)]
                    setPrCelebrate(true)
                    setTimeout(() => setPrCelebrate(false), 2000)
                }
                setTimeout(() => {
                    setCollapsedIds(prev => new Set([...prev, exId]))
                    setCardFlash(prev => { const n = { ...prev }; delete n[exId]; return n })
                }, 1600)
            } else {
                setCollapsedIds(prev => new Set([...prev, exId]))
            }
        } else if (!wasDone && next.some(Boolean)) {
            // A set was just marked done but it wasn't the final one — start rest
            startRest(restTarget)
            setCollapsedIds(prev => { const s = new Set(prev); s.delete(exId); return s })
        } else {
            setCollapsedIds(prev => { const s = new Set(prev); s.delete(exId); return s })
        }
    }

    const startRest = (target: number) => {
        clearInterval(restRef.current)
        setRestSecsLeft(target)
        restRef.current = setInterval(() => {
            setRestSecsLeft(s => {
                if (s === null || s <= 1) {
                    clearInterval(restRef.current)
                    try { navigator.vibrate?.([180, 80, 180]) } catch { /* noop */ }
                    return null
                }
                return s - 1
            })
        }, 1000)
    }

    const skipRest = () => { clearInterval(restRef.current); setRestSecsLeft(null) }

    const adjustRestTarget = (delta: number) => {
        setRestTarget(prev => {
            const next = Math.max(15, Math.min(300, prev + delta))
            localStorage.setItem('ironlog_rest', String(next))
            if (restSecsLeft !== null) setRestSecsLeft(s => s !== null ? Math.max(0, s + delta) : null)
            return next
        })
    }

    const toggleCollapse = (id: string) =>
        setCollapsedIds(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s })

    const addCustomEx = () => {
        if (!cName.trim()) return
        setExercises(p => [...p, { id: makeId(), name: cName.trim(), type: cType || 'Custom', weight: parseInt(cWeight) || 0, reps: 10, sets: 3, completedSets: [false, false, false], isPlaceholder: true }])
        setCName(''); setCWeight(''); setCType(''); setShowAddEx(false)
    }

    const addLiftFromLibrary = (liftId: string) => {
        const lift = savedLifts.find(l => l._id === liftId)
        if (!lift) return
        setExercises(p => [...p, { id: makeId(), name: lift.name, type: lift.type, weight: lift.weight, reps: lift.reps, sets: lift.sets, completedSets: Array(lift.sets).fill(false), liftId: lift._id }])
        setShowAddLift(false)
    }

    const generateFromLifts = () => {
        const newExercises = savedLifts
            .filter(l => selectedGenIds.has(l._id))
            .map(l => ({ id: makeId(), name: l.name, type: l.type, weight: l.weight, reps: l.reps, sets: l.sets, completedSets: Array(l.sets).fill(false) as boolean[], liftId: l._id }))
        setExercises(p => [...p, ...newExercises])
        setSelectedGenIds(new Set())
        setShowGenerateLifts(false)
    }

    const toggleGenId = (id: string) =>
        setSelectedGenIds(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s })

    const submitQuickAdd = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!qaName.trim() || qaLoading) return
        setQaLoading(true)
        try {
            const created = await createLift({ name: qaName.trim(), weight: parseInt(qaWeight) || 0, sets: 3, reps: 10, type: qaType }, context.token)
            await refreshLifts()
            setExercises(p => [...p, { id: makeId(), name: created.name, type: created.type, weight: created.weight, reps: created.reps, sets: created.sets, completedSets: Array(created.sets).fill(false), liftId: created._id }])
            setQaName(''); setQaWeight(''); setQaType('Chest')
            setShowAddLift(false)
        } catch (err) { console.error(err) }
        finally { setQaLoading(false) }
    }

    const quit = () => {
        if (confirm('Quit this workout? Your progress will be lost.')) {
            clearInterval(intervalRef.current)
            localStorage.removeItem(WORKOUT_KEY)
            navigate('/workout-builder')
        }
    }

    const openSummary = () => {
        clearInterval(intervalRef.current)
        setFinalElapsed(elapsed)
        setShowSummary(true)
    }

    const exitWorkout = async () => {
        setSaving(true)
        if (finalElapsed > 0) addWorkoutTime(finalElapsed / 1000)
        // Log a session for every real lift you did at least one set of — even at
        // the same weight — with the date and how long it took (server-side).
        const durations = completionDurations(exercises, startTime)
        const toSave = exercises.filter(e => e.liftId && e.completedSets.some(Boolean))
        try {
            await Promise.all(toSave.map(ex =>
                logSession(ex.liftId!, ex.weight, Math.round(durations[ex.id] || 0), context.token)
            ))
            clearLiftsCache() // history changed — refetch fresh on next load
        } catch (err) { console.error(err) }
        localStorage.removeItem(WORKOUT_KEY)
        navigate('/Home')
    }

    if (!loaded) return null

    const totalSets = exercises.reduce((s, e) => s + e.sets, 0)
    const doneSets = exercises.reduce((s, e) => s + e.completedSets.filter(Boolean).length, 0)
    const progress = totalSets > 0 ? Math.round((doneSets / totalSets) * 100) : 0
    const overtime = sessionMode === 'planned' && elapsed > totalMinutes * 60 * 1000

    // Approximate wall clock that advances each tick (used for the live timer)
    const now = startTime + elapsed
    const durById = completionDurations(exercises, startTime)
    const exDuration = (ex: WorkoutExercise) => durById[ex.id] || 0
    // The "current" exercise is the first incomplete one; its live time runs from
    // the last completion (or workout start).
    const lastCompletionTs = exercises.reduce((m, e) => e.completedAt && e.completedAt > m ? e.completedAt : m, startTime)
    const firstIncompleteId = exercises.find(e => !e.completedSets.every(Boolean))?.id
    const liveSegment = Math.max(0, (now - lastCompletionTs) / 1000)

    // Prior per-lift average (from the pre-workout cache) for faster/slower badges
    const priorAvgById: Record<string, number> = {}
    ;(getCachedLifts(context.userId) || []).forEach(l => { priorAvgById[l._id] = avgSessionSeconds(l.sessions) })

    // Summary data
    const savedCount = exercises.filter(e => e.liftId && e.completedSets.some(Boolean)).length
    const totalVolume = exercises.reduce((sum, e) => {
        const done = e.completedSets.filter(Boolean).length
        return sum + (e.weight * done * e.reps)
    }, 0)
    const sessionDurs = exercises.map(exDuration).filter(d => d > 0)
    const avgSessionTime = sessionDurs.length
        ? Math.round(sessionDurs.reduce((a, b) => a + b, 0) / sessionDurs.length)
        : 0

    // Whole-workout duration history (prior workouts — this one isn't saved until exit)
    const priorWorkouts = getWorkoutTimes()
    const thisWorkoutSec = Math.round(finalElapsed / 1000)
    const sparkBars = [...priorWorkouts.slice(-9).map(w => ({ ...w, current: false })),
        { date: Date.now(), seconds: thisWorkoutSec, current: true }]
    const sparkMax = Math.max(...sparkBars.map(b => b.seconds), 1)
    const bestWorkout = priorWorkouts.length ? Math.min(...priorWorkouts.map(w => w.seconds)) : Infinity
    const lastWorkout = priorWorkouts.length ? priorWorkouts[priorWorkouts.length - 1].seconds : 0
    const isBestWorkout = thisWorkoutSec > 0 && thisWorkoutSec <= bestWorkout && priorWorkouts.length > 0
    const workoutDiff = lastWorkout ? thisWorkoutSec - lastWorkout : 0

    return (
        <>
            {/* PR Celebration overlay */}
            {prCelebrate && (
                <div className='ws-pr-overlay' aria-hidden>
                    <span className='ws-pr-emoji'>{prEmojiRef.current}</span>
                </div>
            )}

            <div className='ws-header'>
                <div className='ws-header-top'>
                    <button className='ws-quit-btn' onClick={quit}>✕ Quit</button>
                    <div className='ws-center-group'>
                        <div className='ws-timer-display'>
                            <span className={`ws-timer ${overtime ? 'overtime' : ''} ${paused ? 'paused' : ''}`}>{fmtTime(elapsed)}</span>
                            {sessionMode === 'planned' && <span className='ws-timer-total'>/ {totalMinutes}m</span>}
                        </div>
                        <button className={`ws-pause-btn ${paused ? 'paused' : ''}`} onClick={togglePause}>
                            {paused
                                ? <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                                : <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>}
                            {paused ? 'Resume' : 'Pause'}
                        </button>
                    </div>
                    <div className='ws-sets-counter'>{doneSets}<span>/{totalSets}</span></div>
                </div>
                <div className='ws-progress-track'>
                    <div className='ws-progress-fill' style={{ width: `${progress}%` }} />
                </div>
            </div>

            {paused && <div className='ws-paused-banner'>⏸ Workout Paused — tap Resume to continue</div>}

            {restSecsLeft !== null && (
                <div className='ws-rest-banner'>
                    <div className='ws-rest-timer-wrap'>
                        <svg className='ws-rest-ring-svg' viewBox='0 0 44 44' width='44' height='44'>
                            <circle className='ws-rest-ring-bg' cx='22' cy='22' r='19' />
                            <circle
                                className='ws-rest-ring-fill'
                                cx='22' cy='22' r='19'
                                strokeDasharray={`${2 * Math.PI * 19}`}
                                strokeDashoffset={`${2 * Math.PI * 19 * (1 - restSecsLeft / restTarget)}`}
                            />
                        </svg>
                        <span className='ws-rest-num'>{restSecsLeft}</span>
                    </div>
                    <div className='ws-rest-info'>
                        <span className='ws-rest-label'>Rest</span>
                        <div className='ws-rest-adj'>
                            <button className='ws-rest-adj-btn' onClick={() => adjustRestTarget(-15)}>−15s</button>
                            <span className='ws-rest-target-lbl'>{restTarget}s default</span>
                            <button className='ws-rest-adj-btn' onClick={() => adjustRestTarget(15)}>+15s</button>
                        </div>
                    </div>
                    <button className='ws-rest-skip' onClick={skipRest}>Skip →</button>
                </div>
            )}

            <div className='ws-page'>
                {exercises.map((ex, idx) => {
                    const allDone = ex.completedSets.every(Boolean)
                    const doneCt = ex.completedSets.filter(Boolean).length

                    if (collapsedIds.has(ex.id)) return (
                        <div key={ex.id} id={`ws-ex-${ex.id}`} className='ws-card ws-card-done ws-card-collapsed' onClick={() => toggleCollapse(ex.id)}>
                            <div className='ws-collapsed-row'>
                                <span className='ws-card-num done'>✓</span>
                                <span className='ws-collapsed-name'>{ex.name}</span>
                                <span className='ws-collapsed-meta'>{ex.sets}×{ex.reps}{ex.weight > 0 ? ` · ${ex.weight} lbs` : ''}</span>
                                {exDuration(ex) > 0 && <span className='ws-collapsed-time'>⏱ {fmtDur(exDuration(ex))}</span>}
                                <span className='ws-collapsed-type'>{displayType(ex.type)}</span>
                                <span className='ws-collapsed-expand'>↓</span>
                            </div>
                        </div>
                    )

                    const isActive = ex.id === firstIncompleteId
                    return (
                        <div key={ex.id} id={`ws-ex-${ex.id}`} className={`ws-card ${allDone ? 'ws-card-done' : ''} ${isActive ? 'ws-card-active' : ''} ${cardFlash[ex.id] === 'pr' ? 'ws-flash-pr' : cardFlash[ex.id] === 'target' ? 'ws-flash-target' : ''}`}>
                            <div className='ws-card-header'>
                                <div className='ws-card-title'>
                                    <span className='ws-card-num'>{idx + 1}</span>
                                    <span className='ws-card-name'>{ex.name}</span>
                                    {ex.isPlaceholder && <span className='ws-template-tag'>Template</span>}
                                </div>
                                <span className='ws-card-type'>{displayType(ex.type)}</span>
                            </div>
                            <div className='ws-card-inputs'>
                                <div className='ws-steppers-row'>
                                    <div className='ws-stepper-group'>
                                        <span className='ws-stepper-label'>Weight <span className='ws-step-unit-label'>lbs</span></span>
                                        <div className='ws-stepper'>
                                            <button className='ws-step-btn' onClick={() => stepEx(ex.id, 'weight', -5)}>−</button>
                                            <input type='number' inputMode='decimal'
                                                className={`ws-step-val ${valFlash[ex.id] === 'wi' ? 'vf-wi' : valFlash[ex.id] === 'wd' ? 'vf-wd' : ''}`}
                                                value={ex.weight || ''} placeholder='0'
                                                onChange={e => updateEx(ex.id, { weight: parseInt(e.target.value) || 0 })} />
                                            <button className='ws-step-btn' onClick={() => stepEx(ex.id, 'weight', 5)}>+</button>
                                        </div>
                                    </div>
                                    <div className='ws-stepper-group'>
                                        <span className='ws-stepper-label'>Reps</span>
                                        <div className='ws-stepper'>
                                            <button className='ws-step-btn' onClick={() => stepEx(ex.id, 'reps', -1)}>−</button>
                                            <input type='number' inputMode='numeric'
                                                className={`ws-step-val ${valFlash[ex.id] === 'ri' ? 'vf-ri' : valFlash[ex.id] === 'rd' ? 'vf-rd' : ''}`}
                                                value={ex.reps || ''}
                                                onChange={e => updateEx(ex.id, { reps: parseInt(e.target.value) || 0 })} />
                                            <button className='ws-step-btn' onClick={() => stepEx(ex.id, 'reps', 1)}>+</button>
                                        </div>
                                    </div>
                                    <div className='ws-card-meta'>
                                        <div className='ws-sets-adj'>
                                            <button className='ws-sets-adj-btn' onClick={e => { e.stopPropagation(); stepEx(ex.id, 'sets', -1) }} aria-label='Remove set'>−</button>
                                            <span className='ws-sets-adj-label'>{doneCt}/{ex.sets} sets</span>
                                            <button className='ws-sets-adj-btn' onClick={e => { e.stopPropagation(); stepEx(ex.id, 'sets', 1) }} aria-label='Add set'>+</button>
                                        </div>
                                        <span className={ex.id === firstIncompleteId ? 'ws-live-time' : ''}>
                                            {ex.id === firstIncompleteId ? `⏱ ${fmtDur(liveSegment)}` : `~${Math.ceil(ex.sets * 2)}m`}
                                        </span>
                                    </div>
                                </div>
                                {(() => {
                                    if (!ex.liftId) return null
                                    const sl = savedLifts.find(l => l._id === ex.liftId)
                                    if (!sl || (sl.pastWeights?.length ?? 0) < 1) return null
                                    const pw = sl.pastWeights ?? []
                                    const lastWeight = pw[pw.length - 1]
                                    const target = pw.length >= 2 ? getNextTarget(sl.weight, pw) : lastWeight
                                    const onTarget = (ex.weight || 0) >= target
                                    const isPR = (ex.weight || 0) > Math.max(...pw)
                                    const isStalled = pw.length >= 2 && !onTarget && getTrend(pw) === 'flat'
                                    const cls = onTarget ? (isPR ? 'is-pr' : 'on-target') : isStalled ? 'is-stalled' : ''
                                    return (
                                        <div className={`ws-prog-target ${cls}`}>
                                            <span className='ws-prog-last'>Last: {lastWeight} lbs</span>
                                            <span className='ws-prog-sep'>·</span>
                                            <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                                            {isPR && onTarget ? `PR! ${ex.weight} lbs` : `Goal: ${target} lbs`}
                                            {isStalled && <span className='ws-stall-badge'>⚠ stalled</span>}
                                            {onTarget && !isPR && <span className='ws-target-check'>✓</span>}
                                            {isPR && onTarget && <span className='ws-target-pr-badge'>new max</span>}
                                        </div>
                                    )
                                })()}
                            </div>
                            <div className='ws-sets'>
                                {ex.completedSets.map((done, i) => (
                                    <button key={i} className={`ws-set-btn ${done ? 'done' : ''}`} onClick={() => handleSetClick(ex.id, i)}>
                                        {done ? '✓' : i + 1}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )
                })}

                <button className='ws-add-ex-btn' onClick={() => setShowAddEx(true)}>+ Add Exercise</button>

                {sessionMode === 'planned' && doneSets === totalSets && totalSets > 0 && (
                    <div className='ws-complete-banner'>
                        <div className='ws-complete-icon'>🏆</div>
                        <div className='ws-complete-text'>
                            <strong>All sets done!</strong>
                            <span>{totalSets} sets · {fmtTime(elapsed)}</span>
                        </div>
                        <button className='ws-finish-btn' onClick={openSummary}>Finish →</button>
                    </div>
                )}
                <div style={{ height: sessionMode === 'on-the-go' ? 80 : 60 }} />
            </div>

            {/* On the Go persistent footer */}
            {sessionMode === 'on-the-go' && (
                <div className='ws-otg-footer'>
                    <button className='ws-otg-end-btn' onClick={openSummary}>End</button>
                    <button className='ws-otg-generate-btn' onClick={() => setShowGenerateLifts(true)}>
                        <span className='ws-otg-suggested'>Suggested</span>
                        Generate
                    </button>
                    <button className='ws-otg-add-btn' onClick={() => setShowAddLift(true)}>Add Lift</button>
                </div>
            )}

            {/* Add Lift sheet (On the Go) */}
            {showAddLift && (
                <div className='qa-overlay' onClick={() => setShowAddLift(false)}>
                    <div className='qa-sheet' onClick={e => e.stopPropagation()} {...useSwipe(() => setShowAddLift(false))}>
                        <div className='qa-handle' />
                        <div className='qa-sheet-header'>
                            <h3 className='qa-title'>Add Lift</h3>
                            <button className='qa-close-btn' onClick={() => setShowAddLift(false)}>✕</button>
                        </div>

                        {/* Type filter chips */}
                        {sessionGroups.length > 0 && (
                            <div className='ws-addlift-filters'>
                                <button className={`ws-addlift-chip ${addLiftFilter === '' ? 'active' : ''}`} onClick={() => setAddLiftFilter('')}>All</button>
                                {sessionGroups.map(g => (
                                    <button key={g} className={`ws-addlift-chip ${addLiftFilter === g ? 'active' : ''}`} onClick={() => setAddLiftFilter(f => f === g ? '' : g)}>{displayType(g)}</button>
                                ))}
                            </div>
                        )}

                        {/* Primary: From My Lifts */}
                        {savedLifts.length > 0 ? (
                            <div className='ws-addlift-section'>
                                <div className='ws-qs-label'>My Lifts</div>
                                {savedLifts
                                    .filter(l => !addLiftFilter || l.type === addLiftFilter)
                                    .map(l => (
                                    <div key={l._id} className='ws-lib-lift-row' onClick={() => addLiftFromLibrary(l._id)}>
                                        <div style={{ flex: 1 }}>
                                            <div className='ws-lib-lift-name'>{l.name}</div>
                                            <div className='ws-lib-lift-meta'>{displayType(l.type)} · {l.weight > 0 ? `${l.weight} lbs · ` : ''}{l.sets}×{l.reps}</div>
                                        </div>
                                        <span className='ws-lib-add-icon'>+</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className='ws-addlift-empty'>No saved lifts yet — add one below.</p>
                        )}

                    </div>
                </div>
            )}

            {/* Generate from Lifts sheet (On the Go) */}
            {showGenerateLifts && (
                <div className='qa-overlay' onClick={() => setShowGenerateLifts(false)}>
                    <div className='qa-sheet' onClick={e => e.stopPropagation()} {...useSwipe(() => setShowGenerateLifts(false))}>
                        <div className='qa-handle' />
                        <div className='qa-sheet-header'>
                            <h3 className='qa-title'>Generate from Lifts</h3>
                            <button className='qa-close-btn' onClick={() => setShowGenerateLifts(false)}>✕</button>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 16 }}>
                            {savedLifts.length === 0 && (
                                <p style={{ color: 'var(--text-secondary)', fontSize: 13, margin: 0 }}>No saved lifts yet. Add lifts in My Lifts first.</p>
                            )}
                            {savedLifts.map(l => {
                                const selected = selectedGenIds.has(l._id)
                                return (
                                    <div key={l._id} className={`ws-gen-lift-row${selected ? ' selected' : ''}`} onClick={() => toggleGenId(l._id)}>
                                        <div className='ws-gen-check'>{selected ? '✓' : ''}</div>
                                        <div style={{ flex: 1 }}>
                                            <div className='ws-lib-lift-name'>{l.name}</div>
                                            <div className='ws-lib-lift-meta'>{displayType(l.type)} · {l.weight > 0 ? `${l.weight} lbs · ` : ''}{l.sets}×{l.reps}</div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                        <button className='qa-submit' disabled={selectedGenIds.size === 0} onClick={generateFromLifts}>
                            Generate {selectedGenIds.size > 0 ? `${selectedGenIds.size} ` : ''}Lift{selectedGenIds.size !== 1 ? 's' : ''} →
                        </button>
                    </div>
                </div>
            )}

            {/* Add Exercise Sheet */}
            {showAddEx && (
                <div className='qa-overlay' onClick={() => setShowAddEx(false)}>
                    <div className='qa-sheet' onClick={e => e.stopPropagation()} {...useSwipe(() => setShowAddEx(false))}>
                        <div className='qa-handle' />
                        <div className='qa-sheet-header'>
                            <h3 className='qa-title'>Add Exercise</h3>
                            <button className='qa-close-btn' onClick={() => setShowAddEx(false)}>✕</button>
                        </div>

                        {/* From My Library — always shown first */}
                        {savedLifts.filter(l => !exercises.find(e => e.liftId === l._id)).length > 0 && (
                            <div className='ws-addlift-section'>
                                <div className='ws-qs-label'>From My Library</div>
                                {savedLifts
                                    .filter(l => !exercises.find(e => e.liftId === l._id))
                                    .map(l => (
                                        <div key={l._id} className='ws-lib-lift-row' onClick={() => {
                                            setExercises(p => [...p, { id: makeId(), name: l.name, type: l.type, weight: l.weight, reps: l.reps, sets: l.sets, completedSets: Array(l.sets).fill(false), liftId: l._id }])
                                            setShowAddEx(false)
                                        }}>
                                            <div style={{ flex: 1 }}>
                                                <div className='ws-lib-lift-name'>{l.name}</div>
                                                <div className='ws-lib-lift-meta'>{displayType(l.type)}{l.weight > 0 ? ` · ${l.weight} lbs` : ''} · {l.sets}×{l.reps}</div>
                                            </div>
                                            <span className='ws-lib-add-icon'>+</span>
                                        </div>
                                    ))}
                            </div>
                        )}

                        {/* Custom — quick add placeholder */}
                        <div className='ws-addlift-section ws-addex-custom'>
                            <div className='ws-qs-label'>Custom (not saved)</div>
                            <form className='qa-form' onSubmit={e => { e.preventDefault(); addCustomEx() }}>
                                <input className='qa-input' placeholder='Exercise name' value={cName} onChange={e => setCName(e.target.value)} />
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
                                <button className='qa-submit' type='submit' disabled={!cName.trim()}>Add to Workout</button>
                            </form>
                        </div>

                        <div className='ws-quick-suggestions'>
                            <div className='ws-qs-label'>Quick Add</div>
                            <div className='ws-qs-chips'>
                                {Object.values(PLACEHOLDERS).flat().filter(p => !exercises.find(e => e.name === p.name)).slice(0, 8).map(p => (
                                    <button key={p.name} className='ws-qs-chip' onClick={() => {
                                        setExercises(prev => [...prev, { id: makeId(), name: p.name, type: 'Custom', weight: p.weight, reps: p.reps, sets: 3, completedSets: [false, false, false], isPlaceholder: true }])
                                        setShowAddEx(false)
                                    }}>{p.name}</button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Workout Summary Overlay */}
            {showSummary && (() => {
                // Compute PRs at summary-show time (before save, so pastWeights still has old data)
                const prHits = exercises
                    .filter(ex => ex.liftId && ex.completedSets.some(Boolean))
                    .map(ex => {
                        const sl = savedLifts.find(l => l._id === ex.liftId)
                        const pw = sl?.pastWeights ?? []
                        const isPR = pw.length > 0 && ex.weight > Math.max(...pw)
                        return isPR ? { name: ex.name, weight: ex.weight } : null
                    })
                    .filter(Boolean) as { name: string; weight: number }[]

                return (
                <div className='ws-summary-overlay'>
                    <div className='ws-summary-card'>
                        <div className='ws-sum-trophy'>{prHits.length > 0 ? '🏅' : '🏆'}</div>
                        <h2 className='ws-sum-title'>Workout Complete</h2>

                        {prHits.length > 0 && (
                            <div className='ws-sum-prs'>
                                {prHits.map(pr => (
                                    <div key={pr.name} className='ws-sum-pr-row'>
                                        <span className='ws-sum-pr-badge'>PR</span>
                                        <span className='ws-sum-pr-name'>{pr.name}</span>
                                        <span className='ws-sum-pr-weight'>{pr.weight} lbs</span>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className='ws-sum-stats ws-sum-stats-4'>
                            <div className='ws-sum-stat'>
                                <span className='ws-sum-num'>{fmtTime(finalElapsed)}</span>
                                <span className='ws-sum-lbl'>Time</span>
                            </div>
                            <div className='ws-sum-stat'>
                                <span className='ws-sum-num'>{doneSets}<span className='ws-sum-unit'>/{totalSets}</span></span>
                                <span className='ws-sum-lbl'>Sets</span>
                            </div>
                            <div className='ws-sum-stat accent-green'>
                                <span className='ws-sum-num'>{Math.round(totalVolume / 1000) > 0 ? `${Math.round(totalVolume / 1000)}k` : totalVolume}</span>
                                <span className='ws-sum-lbl'>lbs Vol.</span>
                            </div>
                            <div className='ws-sum-stat'>
                                <span className='ws-sum-num'>{avgSessionTime > 0 ? fmtDur(avgSessionTime) : '—'}</span>
                                <span className='ws-sum-lbl'>Avg/Lift</span>
                            </div>
                        </div>

                        {/* Workout-time history — small but cool */}
                        {thisWorkoutSec > 0 && (
                            <div className={`ws-sum-history ${isBestWorkout ? 'best' : ''}`}>
                                <div className='ws-sum-history-head'>
                                    <svg className='ws-sum-clock' width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15.5 14"/></svg>
                                    <span className='ws-sum-history-label'>
                                        {priorWorkouts.length === 0
                                            ? 'First workout logged'
                                            : isBestWorkout
                                            ? 'New best — fastest workout yet!'
                                            : workoutDiff < 0
                                            ? `${fmtDur(-workoutDiff)} faster than last`
                                            : workoutDiff > 0
                                            ? `${fmtDur(workoutDiff)} slower than last`
                                            : 'Same pace as last'}
                                    </span>
                                </div>
                                <div className='ws-sum-spark'>
                                    {sparkBars.map((b, i) => (
                                        <div key={i}
                                            className={`ws-spark-bar ${b.current ? 'current' : ''} ${!b.current && b.seconds === bestWorkout ? 'best' : ''}`}
                                            style={{ height: `${Math.max(12, Math.round((b.seconds / sparkMax) * 100))}%` }}
                                            title={`${fmtDur(b.seconds)} · ${b.current ? 'this workout' : fmtDate(b.date)}`}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className='ws-sum-breakdown'>
                            <div className='ws-sum-breakdown-title'>Exercise Breakdown</div>
                            {exercises.map(ex => {
                                const done = ex.completedSets.filter(Boolean).length
                                const vol = ex.weight * done * ex.reps
                                const dur = exDuration(ex)
                                const prior = ex.liftId ? (priorAvgById[ex.liftId] || 0) : 0 // before this session
                                const faster = dur > 0 && prior > 0 && dur < prior
                                const slower = dur > 0 && prior > 0 && dur > prior
                                const isNew = dur > 0 && prior === 0
                                return (
                                    <div key={ex.id} className='ws-sum-ex-row'>
                                        <div className='ws-sum-ex-left'>
                                            <span className={`ws-sum-ex-dot ${done === ex.sets ? 'full' : done > 0 ? 'partial' : 'zero'}`} />
                                            <span className='ws-sum-ex-name'>{ex.name}</span>
                                        </div>
                                        <div className='ws-sum-ex-right'>
                                            <span>{done}/{ex.sets}</span>
                                            {vol > 0 && <span>{vol.toLocaleString()} lbs</span>}
                                            {dur > 0 && (
                                                <span className={`ws-sum-time ${faster ? 'faster' : slower ? 'slower' : isNew ? 'new' : ''}`}
                                                    title={isNew ? 'First timed session' : prior > 0 ? `Avg ${fmtDur(prior)}` : ''}>
                                                    {faster ? '↓' : slower ? '↑' : ''}{fmtDur(dur)}{isNew ? ' ·new' : ''}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>

                        {savedCount > 0 && (
                            <p className='ws-sum-save-note'>
                                {savedCount} lift{savedCount !== 1 ? 's' : ''} will be logged to your progression history.
                            </p>
                        )}
                        <button className='ws-finish-btn ws-sum-exit' onClick={exitWorkout} disabled={saving}>
                            {saving ? 'Saving…' : 'Save & Exit →'}
                        </button>
                    </div>
                </div>
                )
            })()}
        </>
    )
}
