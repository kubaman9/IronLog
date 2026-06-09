import './Homer.css'
import LiftRow from './LiftRow'
import SkeletonLiftRow from './SkeletonLiftRow'
import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useLifts } from '../utils/useLifts'
import { displayType } from '../utils/workout'

const SORT_OPTIONS = ['A–Z', 'Z–A', 'Weight ↑', 'Weight ↓', 'Most Sessions']

export default function MyLifts() {
    const navigate = useNavigate();
    const { lifts, loading, refresh } = useLifts();
    const [search, setSearch] = useState('');
    const [sort, setSort] = useState('A–Z');

    const filtered = lifts
        .filter(l => l.name.toLowerCase().includes(search.toLowerCase()))
        .sort((a, b) => {
            if (sort === 'A–Z') return a.name.localeCompare(b.name);
            if (sort === 'Z–A') return b.name.localeCompare(a.name);
            if (sort === 'Weight ↑') return a.weight - b.weight;
            if (sort === 'Weight ↓') return b.weight - a.weight;
            if (sort === 'Most Sessions') return (b.pastWeights?.length || 0) - (a.pastWeights?.length || 0);
            return 0;
        });

    const grouped: { [key: string]: any[] } = {};
    filtered.forEach(lift => {
        if (!grouped[lift.type]) grouped[lift.type] = [];
        grouped[lift.type].push(lift);
    });
    const sortedTypes = Object.keys(grouped).sort();

    return (
        <>
            <div className='Nav'>
                <h2 onClick={() => navigate('/Home')}>Home</h2>
                <h1>Lift Library</h1>
                <span />
            </div>

            <div className='list-controls'>
                <input
                    className='search-input'
                    type='text'
                    placeholder='Search lifts…'
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                />
                <select
                    className='sort-select'
                    value={sort}
                    onChange={e => setSort(e.target.value)}
                >
                    {SORT_OPTIONS.map(o => <option key={o}>{o}</option>)}
                </select>
            </div>

            <div>
                {loading ? (
                    <div className='section-card'>
                        <div className='section-card-header'><div className='skeleton skeleton-title' /></div>
                        {[1, 2, 3].map(i => <SkeletonLiftRow key={i} />)}
                    </div>
                ) : filtered.length > 0 ? (
                    sortedTypes.map(type => (
                        <div key={type} className='section-card'>
                            <div className='section-card-header'>
                                <h3>{displayType(type)}</h3>
                            </div>
                            {grouped[type].map(lift => (
                                <LiftRow
                                    key={lift._id}
                                    _id={lift._id}
                                    name={lift.name}
                                    weight={`${lift.weight} lbs`}
                                    reps={lift.reps}
                                    sets={lift.sets}
                                    type={lift.type}
                                    pastWeights={lift.pastWeights || []}
                                    sessions={lift.sessions}
                                    onMaxUpdate={() => refresh()}
                                />
                            ))}
                        </div>
                    ))
                ) : (
                    <div className='section-card'>
                        <p style={{ padding: '24px', color: 'var(--text-secondary)' }}>
                            {search ? 'No lifts match your search.' : 'No lifts found. Add one to get started!'}
                        </p>
                    </div>
                )}
            </div>

            <button className='fab' onClick={() => navigate('/liftModify')}>+</button>
        </>
    )
}
