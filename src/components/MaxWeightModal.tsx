import { useState } from 'react'
import './MaxWeightModal.css'

type MaxWeightModalProps = {
    liftName: string
    currentWeight: string
    onConfirm: (newWeight: number) => void
    onCancel: () => void
}

export default function MaxWeightModal({ liftName, currentWeight, onConfirm, onCancel }: MaxWeightModalProps) {
    const [inputValue, setInputValue] = useState(currentWeight.split(' ')[0])
    const [error, setError] = useState('')

    const handleConfirm = () => {
        const newWeight = parseInt(inputValue)
        if (isNaN(newWeight) || newWeight <= 0) {
            setError('Please enter a valid weight')
            return
        }
        onConfirm(newWeight)
    }

    return (
        <div className='modal-overlay' onClick={onCancel}>
            <div className='modal-content' onClick={(e) => e.stopPropagation()}>
                <div className='modal-header'>
                    <h3>Update Max Weight</h3>
                    <button className='modal-close' onClick={onCancel}>×</button>
                </div>
                <div className='modal-body'>
                    <p>New max for <strong>{liftName}</strong></p>
                    <div className='modal-stepper'>
                        <button type='button' onClick={() => { setInputValue(String(Math.max(0, (parseInt(inputValue) || 0) - 5))); setError('') }}>−</button>
                        <input type='number' inputMode='decimal' value={inputValue} placeholder='0' autoFocus
                            onChange={e => { setInputValue(e.target.value); setError('') }}
                            onKeyDown={e => e.key === 'Enter' && handleConfirm()} />
                        <span className='modal-step-unit'>lbs</span>
                        <button type='button' onClick={() => { setInputValue(String((parseInt(inputValue) || 0) + 5)); setError('') }}>+</button>
                    </div>
                    {error && <p className='modal-error'>{error}</p>}
                </div>
                <div className='modal-footer'>
                    <button className='modal-button modal-button-cancel' onClick={onCancel}>
                        Cancel
                    </button>
                    <button className='modal-button modal-button-confirm' onClick={handleConfirm}>
                        Confirm
                    </button>
                </div>
            </div>
        </div>
    )
}
