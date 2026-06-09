import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './Homer.css';
import './ModifyLifts.css';
import { useContext } from 'react';
import { AuthContext } from '../context/context';
import { createLift, editLift, clearLiftsCache } from '../utils/api';

const liftTypes = [
    'Chest',
    'Tricept',
    'Bicept',
    'Shoulders',
    'Back',
    'Abbs',
    'Legs',
    'Forearms'
];

type LiftFormState = {
    _id?: string;
    name: string;
    weight: number;
    sets: number;
    reps: number;
    type: string;
};

const emptyLift: LiftFormState = {
    name: '',
    weight: 0,
    sets: 3,
    reps: 10,
    type: 'Chest'
};

export default function ModifyLifts() {
    const navigate = useNavigate();
    const location = useLocation();
    const context = useContext(AuthContext);
    const liftToEdit = (location.state as { lift?: LiftFormState })?.lift;
    const isEditMode = !!liftToEdit;
    const [lift, setLift] = useState<LiftFormState>(liftToEdit || emptyLift);

    const updateField = (field: keyof LiftFormState, value: string | number) => {
        if (field === 'weight' || field === 'sets' || field === 'reps') {
            setLift(prev => ({ ...prev, [field]: typeof value === 'string' ? parseInt(value) || 0 : value }));
        } else {
            setLift(prev => ({ ...prev, [field]: value }));
        }
    };

    const handleConfirm = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!lift.name.trim() || lift.sets <= 0 || lift.reps <= 0) {
            alert('Please fill in name, sets, and reps with valid numbers.');
            return;
        }

        const input = {
            name: lift.name.trim(),
            weight: lift.weight,
            sets: lift.sets,
            reps: lift.reps,
            type: lift.type,
        };

        const request = isEditMode && lift._id
            ? editLift(lift._id, input, context.token)
            : createLift(input, context.token);

        request
            .then(() => { clearLiftsCache(); navigate('/MyLifts'); })
            .catch(err => {
                console.error(err);
                alert('Could not save the lift. Please try again.');
            });

        setLift(emptyLift);
    };

    return (
        <>
            <div className='Nav'>
                <h2 onClick={() => navigate('/MyLifts')}>My Lifts</h2>
                <h1>Modify Lifts</h1>
                <h2 onClick={() => navigate('/Home')}>Home</h2>
            </div>

            <div className='section-card modify-lifts-card'>
                <div className='section-card-header modify-lifts-header'>
                    <h3>{isEditMode ? 'Edit Lift' : 'Add Lift'}</h3>
                </div>

                <form className='modify-lifts-form' onSubmit={handleConfirm}>
                    <label htmlFor='liftName'>Lift Name</label>
                    <input
                        id='liftName'
                        type='text'
                        placeholder='Bench Press'
                        value={lift.name}
                        onChange={(event) => updateField('name', event.target.value)}
                    />

                    <label>Weight</label>
                    <div className='ml-stepper'>
                        <button type='button' className='ml-step-btn' onClick={() => setLift(p => ({ ...p, weight: Math.max(0, (p.weight || 0) - 5) }))}>−</button>
                        <input type='number' inputMode='decimal' value={lift.weight || ''} placeholder='0'
                            onChange={e => updateField('weight', e.target.value)} />
                        <span className='ml-step-unit'>lbs</span>
                        <button type='button' className='ml-step-btn' onClick={() => setLift(p => ({ ...p, weight: (p.weight || 0) + 5 }))}>+</button>
                    </div>

                    <div className='modify-lifts-grid'>
                        <div>
                            <label>Sets</label>
                            <div className='ml-stepper'>
                                <button type='button' className='ml-step-btn' onClick={() => setLift(p => ({ ...p, sets: Math.max(1, p.sets - 1) }))}>−</button>
                                <input type='number' inputMode='numeric' value={lift.sets || ''} placeholder='1'
                                    onChange={e => updateField('sets', e.target.value)} />
                                <button type='button' className='ml-step-btn' onClick={() => setLift(p => ({ ...p, sets: Math.min(10, p.sets + 1) }))}>+</button>
                            </div>
                        </div>
                        <div>
                            <label>Reps</label>
                            <div className='ml-stepper'>
                                <button type='button' className='ml-step-btn' onClick={() => setLift(p => ({ ...p, reps: Math.max(1, p.reps - 1) }))}>−</button>
                                <input type='number' inputMode='numeric' value={lift.reps || ''} placeholder='1'
                                    onChange={e => updateField('reps', e.target.value)} />
                                <button type='button' className='ml-step-btn' onClick={() => setLift(p => ({ ...p, reps: Math.min(50, p.reps + 1) }))}>+</button>
                            </div>
                        </div>
                    </div>

                    <label htmlFor='liftType'>Type</label>
                    <select
                        id='liftType'
                        value={lift.type}
                        onChange={(event) => updateField('type', event.target.value)}
                    >
                        {liftTypes.map((liftType) => (
                            <option key={liftType} value={liftType}>
                                {liftType}
                            </option>
                        ))}
                    </select>

                    <button className='confirm-button' type='submit'>
                        {isEditMode ? 'Save Changes' : 'Add Lift'}
                    </button>
                </form>
            </div>
        </>
    );
}