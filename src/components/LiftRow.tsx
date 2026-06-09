import { useState, useRef, type MouseEvent, useContext } from 'react'
import { useNavigate } from 'react-router-dom'
import { AuthContext } from '../context/context'
import { logSession, deleteLift, type Session } from '../utils/api'
import MaxWeightModal from './MaxWeightModal'
import WeightChart from './WeightChart'
import { getTrend, estimateMax } from '../utils/progression'

type LiftRowProps = {
    _id: string
    name: string
    weight: string
    reps: number
    sets: number
    type: string
    pastWeights: number[]
    sessions?: Session[]
    onMaxUpdate: () => void
}

const TREND_LABEL: Record<string, string> = { up: '↑', down: '↓', flat: '→', new: 'New' }

export default function LiftRow({ _id, name, weight, reps, sets, type, pastWeights, sessions, onMaxUpdate }: LiftRowProps) {
    const [showChart, setShowChart] = useState(false)
    const [showMaxModal, setShowMaxModal] = useState(false)
    const [isFlashing, setIsFlashing] = useState(false)
    const [confirmDelete, setConfirmDelete] = useState(false)
    const shellRef = useRef<HTMLDivElement>(null)
    const navigate = useNavigate()
    const context = useContext(AuthContext)

    const trend = getTrend(pastWeights)
    const weightNum = parseInt(weight)
    const estMax = estimateMax(weightNum, reps)

    const handleEdit = (e: MouseEvent<HTMLButtonElement>) => {
        e.stopPropagation()
        navigate('/liftModify', { state: { lift: { _id, name, weight: weightNum, reps, sets, type } } })
    }

    const handleMaxClick = (e: MouseEvent<HTMLButtonElement>) => {
        e.stopPropagation()
        setShowMaxModal(true)
    }

    const handleMaxConfirm = (newWeightNum: number) => {
        setShowMaxModal(false)
        // A manual max is a session too (no timing) — logs the date + weight
        logSession(_id, newWeightNum, 0, context.token)
            .then(() => {
                shellRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                setTimeout(() => {
                    setIsFlashing(true)
                    setTimeout(() => setIsFlashing(false), 1400)
                }, 300)
                onMaxUpdate()
            })
            .catch(console.error)
    }

    const handleDelete = (e: MouseEvent<HTMLButtonElement>) => {
        e.stopPropagation()
        if (!confirmDelete) { setConfirmDelete(true); return }
        deleteLift(_id, context.token)
            .then(() => onMaxUpdate())
            .catch(console.error)
    }

    const lastSession = sessions?.length ? sessions[sessions.length - 1] : null
    const daysSince = lastSession
        ? Math.floor((Date.now() - parseInt(lastSession.date)) / 86400000)
        : null
    const daysLabel = daysSince === null ? null
        : daysSince === 0 ? 'Today'
        : daysSince === 1 ? 'Yesterday'
        : `${daysSince}d ago`

    return (
        <div ref={shellRef} className={`lift-row-shell ${isFlashing ? 'flash-green' : ''}`}>
            <div className='lift-row' onClick={() => setShowChart(prev => !prev)} role='button' tabIndex={0}>
                <div className='lift-row-top'>
                    <div className='lift-name-cell'>
                        <span className='lift-name'>{name}</span>
                        <span className={`lift-row-trend trend-${trend}`}>{TREND_LABEL[trend]}</span>
                    </div>
                    {daysLabel && (
                        <span className={`lift-days-ago ${daysSince === 0 ? 'today' : daysSince !== null && daysSince > 7 ? 'stale' : ''}`}>
                            {daysLabel}
                        </span>
                    )}
                </div>
                <div className='lift-row-sub'>
                    <span className='lift-sub-weight'>{weight}</span>
                    <span className='lift-sub-sep'>·</span>
                    <span className='lift-sub-detail'>{sets}×{reps}</span>
                    <span className='lift-sub-sep'>·</span>
                    <span className='lift-sub-est'>~{estMax} max</span>
                </div>
            </div>

            {showChart && (
                <div className='chart-slide-in'>
                    <WeightChart liftName={name} pastWeights={pastWeights} sessions={sessions} />
                </div>
            )}

            {showChart && (
                <div className='lift-actions-menu actions-slide-in'>
                    <button type='button' className='lift-action-button lift-action-max' onClick={handleMaxClick}>New Max</button>
                    <button type='button' className='lift-action-button lift-action-edit' onClick={handleEdit}>Edit</button>
                    <button
                        type='button'
                        className={`lift-action-button lift-action-delete${confirmDelete ? ' confirm' : ''}`}
                        onClick={handleDelete}
                        onBlur={() => setConfirmDelete(false)}
                    >
                        {confirmDelete ? 'Tap again to confirm' : 'Delete'}
                    </button>
                </div>
            )}

            {showMaxModal && (
                <MaxWeightModal
                    liftName={name}
                    currentWeight={weight}
                    onConfirm={handleMaxConfirm}
                    onCancel={() => setShowMaxModal(false)}
                />
            )}
        </div>
    )
}
