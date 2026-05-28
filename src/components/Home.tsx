import { useUser } from './SignIn'
import { useNavigate } from 'react-router-dom'
import './Homer.css'
import LiftRow from './LiftRow'
import SkeletonLiftRow from './SkeletonLiftRow'
import QuickAdd from './QuickAdd'
import { useContext, useEffect, useState } from 'react'
import { AuthContext } from '../context/context'
import { API_URL } from '../config'

export default function Home() {
    const { username } = useUser();
    const [lifts, setLifts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showQuickAdd, setShowQuickAdd] = useState(false);
    const navigate = useNavigate();
    const context = useContext(AuthContext);

    useEffect(() => { fetchLifts(); }, []);

    const fetchLifts = () => {
        setLoading(true);
        const token = context.token;
        fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ query: `query { userLifts { _id name weight sets reps type pastWeights } }` })
        })
            .then(res => res.json())
            .then(data => { if (data.data?.userLifts) setLifts(data.data.userLifts); })
            .catch(err => console.error(err))
            .finally(() => setLoading(false));
    }

    const handleLogout = () => { context.logout(); navigate('/'); }

    const sorted = [...lifts].sort((a, b) => (b.pastWeights?.length || 0) - (a.pastWeights?.length || 0));

    return (
        <>
            <div className='Nav'>
                <h2 onClick={() => navigate('/MyLifts')}>My Lifts</h2>
                <h1>Home</h1>
                <h2 onClick={handleLogout}>Logout</h2>
            </div>

            {username && <p className='welcome-text'>Welcome back, <strong>{username}</strong></p>}

            <div id='RecentLifts'>
                <div className='section-card'>
                    <div className='section-card-header'>
                        <h3>Recent Lifts</h3>
                    </div>
                    {loading ? (
                        [1, 2, 3].map(i => <SkeletonLiftRow key={i} />)
                    ) : sorted.length > 0 ? (
                        sorted.map(lift => (
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
                        <p style={{ padding: '24px', color: 'var(--text-secondary)' }}>No lifts yet. Tap + to add one!</p>
                    )}
                </div>
            </div>

            <div className='home-nav-row'>
                <button className='home-nav-btn' onClick={() => navigate('/recommended')}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                    Recommended
                </button>
            </div>

            {showQuickAdd && (
                <QuickAdd
                    onClose={() => setShowQuickAdd(false)}
                    onAdded={fetchLifts}
                />
            )}

            <button className='fab' onClick={() => setShowQuickAdd(true)}>+</button>
        </>
    )
}
