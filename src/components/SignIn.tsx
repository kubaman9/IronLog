import { useState, createContext, useContext } from 'react'
import { useNavigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import AuthContext from '../context/context'
import { loginRequest, signUpRequest } from '../utils/api'
import './SignIn.css'

type UserContextType = { username: string; setUsername: (name: string) => void }

export const UserContext = createContext<UserContextType>({ username: '', setUsername: () => {} })

export const UserProvider = ({ children }: { children: ReactNode }) => {
    const [username, setUsername] = useState(() => localStorage.getItem('username') || '')

    const setAndPersist = (name: string) => {
        setUsername(name)
        if (name) localStorage.setItem('username', name)
    }

    return (
        <UserContext.Provider value={{ username, setUsername: setAndPersist }}>
            {children}
        </UserContext.Provider>
    )
}

export const useUser = () => useContext(UserContext)

export default function SignIn() {
    const { username, setUsername } = useUser()
    const authContext = useContext(AuthContext)
    const [password, setPassword] = useState('')
    const [isSignUp, setIsSignUp] = useState(false)
    const [error, setError] = useState('')
    const [busy, setBusy] = useState(false)
    const navigate = useNavigate()

    const submitHandler = async (e: React.FormEvent) => {
        e.preventDefault()
        const user = username.trim()
        if (!user || !password) { setError('Enter both username and password.'); return }
        if (isSignUp && password.length < 6) { setError('Password must be at least 6 characters.'); return }
        setError(''); setBusy(true)

        try {
            if (isSignUp) {
                try {
                    await signUpRequest(user, password)
                } catch {
                    setError('Username already taken or invalid.'); return
                }
                const { login } = await loginRequest(user, password)
                authContext.login(login.token, login.userId)
                navigate('/onboarding')
            } else {
                const { login } = await loginRequest(user, password)
                authContext.login(login.token, login.userId)
                navigate('/Home')
            }
        } catch (err: any) {
            const msg = String(err?.message || '')
            if (/password/i.test(msg)) setError('Incorrect password.')
            else if (/exist/i.test(msg)) setError('No account with that username.')
            else setError('Could not connect. Please try again.')
        } finally {
            setBusy(false)
        }
    }

    return (
        <form id='box' onSubmit={submitHandler}>
            <div className='sign-in-brand'>
                <span className='sign-in-icon'>🏋️</span>
                <h1>IronLog</h1>
                <p className='sign-in-tagline'>Track every rep. Own every PR.</p>
            </div>

            <div className='input-group'>
                <label htmlFor='username'>Username</label>
                <input id='username' name='username' type='text' placeholder='Enter your username'
                    autoComplete='username' autoCapitalize='none' spellCheck={false}
                    value={username} onChange={e => setUsername(e.target.value)} />
            </div>

            <div className='input-group'>
                <label htmlFor='password'>Password</label>
                <input id='password' name='password' type='password' placeholder='Enter your password'
                    autoComplete={isSignUp ? 'new-password' : 'current-password'}
                    value={password} onChange={e => setPassword(e.target.value)} />
            </div>

            {error && <p className='sign-in-error'>{error}</p>}

            <button type='submit' disabled={busy}>
                {busy ? '…' : isSignUp ? 'Create Account' : 'Sign In'}
            </button>
            <button type='button' className='sign-in-toggle' onClick={() => { setIsSignUp(p => !p); setError('') }}>
                {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
            </button>
        </form>
    )
}
