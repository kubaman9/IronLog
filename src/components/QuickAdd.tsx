import { useState, useContext, useEffect, useRef } from 'react'
import { AuthContext } from '../context/context'
import { createLift } from '../utils/api'
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
    const [sheetPad, setSheetPad] = useState(36)
    const sheetRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const viewport = window.visualViewport
        if (!viewport) return

        const onResize = () => {
            const keyboardHeight = window.innerHeight - viewport.height - viewport.offsetTop
            setSheetPad(Math.max(36, keyboardHeight + 16))
        }

        viewport.addEventListener('resize', onResize)
        viewport.addEventListener('scroll', onResize)
        return () => {
            viewport.removeEventListener('resize', onResize)
            viewport.removeEventListener('scroll', onResize)
        }
    }, [])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!name.trim()) return
        setLoading(true)
        try {
            await createLift({ name: name.trim(), weight: parseInt(weight) || 0, sets: 3, reps: 10, type }, context.token)
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
            <div
                ref={sheetRef}
                className='qa-sheet'
                style={{ paddingBottom: sheetPad }}
                onClick={e => e.stopPropagation()}
            >
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
                        <div className='qa-stepper'>
                            <button type='button' onClick={() => setWeight(String(Math.max(0, (parseInt(weight) || 0) - 5)))}>−</button>
                            <input className='qa-weight-val' type='number' inputMode='decimal' placeholder='0'
                                value={weight} onChange={e => setWeight(e.target.value)} />
                            <span className='qa-step-unit'>lbs</span>
                            <button type='button' onClick={() => setWeight(String((parseInt(weight) || 0) + 5))}>+</button>
                        </div>
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
