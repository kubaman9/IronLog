import { useState, useContext } from 'react'
import { AuthContext } from '../context/context'
import { API_URL } from '../config'
import './QuickAdd.css'

const LIFT_TYPES = ['Chest', 'Tricept', 'Bicept', 'Shoulders', 'Back', 'Abbs', 'Legs', 'Forearms']

type Props = {
    onClose: () => void
    onAdded: () => void
}

export default function QuickAdd({ onClose, onAdded }: Props) {
    const context = useContext(AuthContext)
    const [name, setName] = useState('')
    const [weight, setWeight] = useState('')
    const [type, setType] = useState('Chest')
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!name.trim()) return
        setLoading(true)
        try {
            await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${context.token}` },
                body: JSON.stringify({
                    query: `mutation {
                        createLift(liftInput: {
                            name: "${name.trim()}",
                            weight: ${parseInt(weight) || 0},
                            sets: 3,
                            reps: 10,
                            type: "${type}"
                        }) { _id }
                    }`
                })
            })
            onAdded()
            onClose()
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className='qa-overlay' onClick={onClose}>
            <div className='qa-sheet' onClick={e => e.stopPropagation()}>
                <div className='qa-handle' />
                <h3 className='qa-title'>Quick Add</h3>
                <form className='qa-form' onSubmit={handleSubmit}>
                    <input
                        className='qa-input'
                        type='text'
                        placeholder='Lift name (e.g. Bench Press)'
                        value={name}
                        onChange={e => setName(e.target.value)}
                        autoFocus
                    />
                    <div className='qa-row'>
                        <input
                            className='qa-input qa-weight'
                            type='number'
                            placeholder='Weight (lbs)'
                            min='0'
                            value={weight}
                            onChange={e => setWeight(e.target.value)}
                        />
                        <select
                            className='qa-input qa-type'
                            value={type}
                            onChange={e => setType(e.target.value)}
                        >
                            {LIFT_TYPES.map(t => <option key={t}>{t}</option>)}
                        </select>
                    </div>
                    <p className='qa-hint'>Sets & reps default to 3×10 — edit later in My Lifts.</p>
                    <button className='qa-submit' type='submit' disabled={loading || !name.trim()}>
                        {loading ? 'Adding…' : 'Add Lift'}
                    </button>
                </form>
            </div>
        </div>
    )
}
