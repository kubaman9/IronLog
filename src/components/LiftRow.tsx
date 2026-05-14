import { useState, type MouseEvent, useContext } from 'react'
import { useNavigate } from 'react-router-dom'
import { AuthContext } from '../context/context'
import MaxWeightModal from './MaxWeightModal'
import WeightChart from './WeightChart'

type LiftRowProps = {
    _id: string
    name: string
    weight: string
    reps: number
    sets: number
    type: string
    pastWeights: number[]
    onMaxUpdate: () => void
}

export default function LiftRow({ _id, name, weight, reps, sets, type, pastWeights, onMaxUpdate }: LiftRowProps) {
    const [showChart, setShowChart] = useState(false)
    const [showMaxModal, setShowMaxModal] = useState(false)
    const [isFlashing, setIsFlashing] = useState(false)
    const navigate = useNavigate()
    const context = useContext(AuthContext)

    const handleEdit = (event: MouseEvent<HTMLButtonElement>) => {
        event.stopPropagation()
        navigate('/liftModify', {
            state: {
                lift: {
                    _id,
                    name,
                    weight: parseInt(weight),
                    reps,
                    sets,
                    type
                }
            }
        })
    }

    const handleMaxClick = (event: MouseEvent<HTMLButtonElement>) => {
        event.stopPropagation()
        setShowMaxModal(true)
    }

    const handleMaxConfirm = (newWeightNum: number) => {
        setShowMaxModal(false)

        const updateQuery = `
            mutation {
                editLift(liftId: "${_id}", liftInput: {
                    name: "${name}",
                    weight: ${newWeightNum},
                    sets: ${sets},
                    reps: ${reps},
                    type: "${type}"
                }) {
                    _id
                    name
                    weight
                    pastWeights
                }
            }
        `

        fetch('http://localhost:3000/graphql', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${context.token}`
            },
            body: JSON.stringify({ query: updateQuery })
        })
            .then(res => res.json())
            .then(data => {
                if (data.errors) {
                    console.error(data.errors)
                    return
                }
                setIsFlashing(true)
                setTimeout(() => setIsFlashing(false), 1000)
                onMaxUpdate()
            })
            .catch(err => {
                console.error(err)
            })
    }

    const handleDelete = (event: MouseEvent<HTMLButtonElement>) => {
        event.stopPropagation()
        if (confirm(`Are you sure you want to delete ${name}?`)) {
            const deleteQuery = `
                mutation {
                    deleteLift(liftId: "${_id}") {
                        _id
                    }
                }
            `
            fetch('http://localhost:3000/graphql', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${context.token}`
                },
                body: JSON.stringify({ query: deleteQuery })
            })
                .then(res => res.json())
                .then(data => {
                    if (data.errors) {
                        console.error(data.errors)
                        return
                    }
                    onMaxUpdate()
                })
                .catch(err => {
                    console.error(err)
                })
        }
    }

    return (
        <div className={`lift-row-shell ${isFlashing ? 'flash-green' : ''}`}>
            <div className='lift-row' onClick={() => setShowChart(prev => !prev)} role='button' tabIndex={0}>
                <span className='lift-name'>{name}</span>
                <div className='lift-stat'>
                    <span>Weight</span>
                    <span>{weight}</span>
                </div>
                <div className='lift-stat'>
                    <span>Reps</span>
                    <span>{reps}</span>
                </div>
                <div className='lift-stat'>
                    <span>Sets</span>
                    <span>{sets}</span>
                </div>
                <div className='lift-stat'>
                    <span className='lift-badge'>{type}</span>
                </div>
            </div>
            {showChart && <WeightChart liftName={name} pastWeights={pastWeights} />}
            {showChart && (
                <div className='lift-actions-menu'>
                    <button type='button' className='lift-action-button lift-action-max' onClick={handleMaxClick}>
                        Max
                    </button>
                    <button type='button' className='lift-action-button lift-action-edit' onClick={handleEdit}>
                        Edit
                    </button>
                    <button type='button' className='lift-action-button lift-action-delete' onClick={handleDelete}>
                        Delete
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
