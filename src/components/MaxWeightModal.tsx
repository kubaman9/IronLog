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

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleConfirm()
        } else if (e.key === 'Escape') {
            onCancel()
        }
    }

    return (
        <div className='modal-overlay' onClick={onCancel}>
            <div className='modal-content' onClick={(e) => e.stopPropagation()}>
                <div className='modal-header'>
                    <h3>Update Max Weight</h3>
                    <button className='modal-close' onClick={onCancel}>×</button>
                </div>
                <div className='modal-body'>
                    <p>Enter new max weight for <strong>{liftName}</strong>:</p>
                    <input
                        type='number'
                        value={inputValue}
                        onChange={(e) => {
                            setInputValue(e.target.value)
                            setError('')
                        }}
                        onKeyPress={handleKeyPress}
                        placeholder='e.g. 185'
                        autoFocus
                        className='modal-input'
                    />
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
