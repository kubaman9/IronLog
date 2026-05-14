import './Homer.css'
import LiftRow from './LiftRow'
import { useNavigate } from 'react-router-dom'
import { useContext, useEffect, useState } from 'react'
import { AuthContext } from '../context/context'
import { API_URL } from '../config'

export default function MyLifts() {
    const navigate = useNavigate();
    const context = useContext(AuthContext);
    const [lifts, setLifts] = useState<any[]>([]);

    useEffect(() => {
        fetchLifts();
    }, []);

    const fetchLifts = () => {
        let requestBody = {
            query: `
                query {
                    userLifts {
                        _id
                        name
                        weight
                        sets
                        reps
                        type
                        pastWeights
                    }
                }
            `};

        const token = context.token;

        fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                query: requestBody.query
            })
        }).then(res => {
            if (res.status !== 200 && res.status !== 201) {
                throw new Error('Failed to authenticate.');
            }
            return res.json();
        }).then(data => {
            console.log(data);
            if (data.data?.userLifts) {
                setLifts(data.data.userLifts);
            }
        }).catch(err => {
            console.error(err);
        });
    }

    const getLiftsGroupedByType = () => {
        const grouped: { [key: string]: any[] } = {};
        lifts.forEach(lift => {
            if (!grouped[lift.type]) {
                grouped[lift.type] = [];
            }
            grouped[lift.type].push(lift);
        });
        // Sort each group by pastWeights length
        Object.keys(grouped).forEach(type => {
            grouped[type].sort((a, b) => (b.pastWeights?.length || 0) - (a.pastWeights?.length || 0));
        });
        return grouped;
    }

    const groupedLifts = getLiftsGroupedByType();
    const sortedTypes = Object.keys(groupedLifts).sort();

    return (
        <>
            <div className='Nav'>
                <h2 onClick={() => navigate('/Home')}>Home</h2>
                <h1>My Lifts</h1>
                <h2 onClick={() => navigate('/liftModify')}>Add</h2>
            </div>

            <div>
                {lifts.length > 0 ? (
                    sortedTypes.map(type => (
                        <div key={type} className='section-card'>
                            <div className='section-card-header'>
                                <h3>{type}</h3>
                            </div>
                            {groupedLifts[type].map(lift => (
                                <LiftRow 
                                    key={lift._id}
                                    _id={lift._id}
                                    name={lift.name} 
                                    weight={`${lift.weight} lbs`}
                                    reps={lift.reps} 
                                    sets={lift.sets} 
                                    type={lift.type}
                                    pastWeights={lift.pastWeights || []}
                                    onMaxUpdate={fetchLifts}
                                />
                            ))}
                        </div>
                    ))
                ) : (
                    <div className='section-card'>
                        <p>No lifts found. Add one to get started!</p>
                    </div>
                )}
            </div>
        </>
    )
}

