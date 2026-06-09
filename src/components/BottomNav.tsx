import { useNavigate, useLocation } from 'react-router-dom'
import './BottomNav.css'

const HIDDEN_ROUTES = new Set(['/', '/onboarding', '/recommended', '/workout'])

const tabs = [
    {
        to: '/Home',
        label: 'Home',
        icon: (active: boolean) => (
            <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
        ),
    },
    {
        to: '/MyLifts',
        label: 'Library',
        icon: (active: boolean) => (
            <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
            </svg>
        ),
    },
    {
        to: '/workout-builder',
        label: 'Workout',
        icon: (_active: boolean) => (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8h1a4 4 0 0 1 0 8h-1" />
                <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />
                <line x1="6" y1="1" x2="6" y2="4" />
                <line x1="10" y1="1" x2="10" y2="4" />
                <line x1="14" y1="1" x2="14" y2="4" />
            </svg>
        ),
        cta: true,
    },
    {
        to: '/profile',
        label: 'Profile',
        icon: (active: boolean) => (
            <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
            </svg>
        ),
    },
]

export default function BottomNav() {
    const navigate = useNavigate()
    const { pathname } = useLocation()

    if (HIDDEN_ROUTES.has(pathname)) return null

    return (
        <nav className='bottom-nav'>
            {tabs.map(tab => {
                const active = pathname === tab.to || (tab.to === '/MyLifts' && pathname === '/liftModify')
                return (
                    <button
                        key={tab.to}
                        className={`bn-tab${active ? ' active' : ''}${tab.cta ? ' cta' : ''}`}
                        onClick={() => navigate(tab.to)}
                        aria-label={tab.label}
                    >
                        <span className='bn-icon'>{tab.icon(active)}</span>
                        <span className='bn-label'>{tab.label}</span>
                    </button>
                )
            })}
        </nav>
    )
}
