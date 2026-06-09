export default function SkeletonLiftRow() {
    return (
        <div className='skeleton-lift-row'>
            <div className='skeleton-row-top'>
                <div className='skeleton skeleton-name' />
                <div className='skeleton skeleton-badge' />
                <div style={{ flex: 1 }} />
                <div className='skeleton skeleton-days' />
            </div>
            <div className='skeleton-row-sub'>
                <div className='skeleton skeleton-stat' />
                <div className='skeleton skeleton-stat' />
                <div className='skeleton skeleton-stat' />
                <div className='skeleton skeleton-stat' />
                <div className='skeleton skeleton-stat' />
            </div>
        </div>
    )
}
