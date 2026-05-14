import { useUser } from './SignIn'
import { useNavigate } from 'react-router-dom'
import './Homer.css'
import LiftRow from './LiftRow'
import { useContext, useEffect, useState } from 'react'
import { AuthContext } from '../context/context'
import { API_URL } from '../config'

export default function Home() {

    const { username } = useUser();
    const [lifts, setLifts] = useState<any[]>([]);
    const navigate = useNavigate();
    const context = useContext(AuthContext);

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

    const handleLogout = () => {
        context.logout();
        navigate('/');
    }

    return (
        <>
            <div className='Nav'>
                <h2 onClick={() => navigate('/MyLifts')}>My Lifts</h2>
                <h1>Home</h1>
                <h2 onClick={handleLogout} style={{ cursor: 'pointer', color: 'var(--accent)' }}>Logout</h2>
            </div>

            {username && (
                <p className='welcome-text'>
                    Welcome back, <strong>{username}</strong>
                </p>
            )}

            <div id='RecentLifts'>
                <div className='section-card'>
                    <div className='section-card-header'>
                        <h3>Recent Lifts</h3>
                    </div>
                    {lifts.length > 0 ? (
                                            lifts
                                                .sort((a, b) => (b.pastWeights?.length || 0) - (a.pastWeights?.length || 0))
                                                .map(lift => (
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
                                            ))
                                        ) : (
                                            <p>No lifts found. Add one to get started!</p>
                                        )}
                </div>
            </div>

            <button className='fab' onClick={() => navigate('/liftModify')}>+</button>
        </>
    )

}
