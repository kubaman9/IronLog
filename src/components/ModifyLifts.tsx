import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './Homer.css';
import './ModifyLifts.css';
import { useContext } from 'react';
import { AuthContext } from '../context/context';

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
    sets: 0,
    reps: 0,
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

        let requestBody = {
            query: `
                mutation {
                    createLift(liftInput: {
                        name: "${lift.name}",
                        weight: ${lift.weight},
                        sets: ${lift.sets},
                        reps: ${lift.reps},
                        type: "${lift.type}"
                    }) {
                        _id
                        name
                    }
                }
            `};

        let requestBodyEdit = {
            query: `
                mutation {
                    editLift(liftId: "${lift._id}", liftInput: {
                        name: "${lift.name}",
                        weight: ${lift.weight},
                        sets: ${lift.sets},
                        reps: ${lift.reps},
                        type: "${lift.type}"
                    }) {
                        _id
                        name
                    }
                }
            `};

        const token = context.token;

        fetch('http://localhost:3000/graphql', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                query: isEditMode ? requestBodyEdit.query : requestBody.query
            })
        }).then(res => {
            if (res.status !== 200 && res.status !== 201) {
                throw new Error('Failed to authenticate.');
            }
            return res.json();
        }).then(data => {
            console.log(data);
            navigate('/MyLifts');
        }).catch(err => {
            console.error(err);
        });

        console.log(`${isEditMode ? 'Editing' : 'Adding'} lift`, lift);
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

                    <label htmlFor='liftWeight'>Weight</label>
                    <input
                        id='liftWeight'
                        type='number'
                        min='0'
                        placeholder='e.g. 185'
                        value={lift.weight || ''}
                        onChange={(event) => updateField('weight', event.target.value)}
                    />

                    <div className='modify-lifts-grid'>
                        <div>
                            <label htmlFor='liftSets'>Sets</label>
                            <input
                                id='liftSets'
                                type='number'
                                min='1'
                                placeholder='3'
                                value={lift.sets || ''}
                                onChange={(event) => updateField('sets', event.target.value)}
                            />
                        </div>
                        <div>
                            <label htmlFor='liftReps'>Reps</label>
                            <input
                                id='liftReps'
                                type='number'
                                min='1'
                                placeholder='10'
                                value={lift.reps || ''}
                                onChange={(event) => updateField('reps', event.target.value)}
                            />
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
                        Confirm
                    </button>
                </form>
            </div>
        </>
    );
}