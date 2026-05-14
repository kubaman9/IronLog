import { useState, createContext, useContext } from 'react'
import { useNavigate } from 'react-router-dom';
import type { ReactNode } from 'react'
import AuthContext from '../context/context'
import { API_URL } from '../config'

import './SignIn.css'

type UserContextType = {
    username: string
    setUsername: (name: string) => void
}

export const UserContext = createContext<UserContextType>({
    username: '',
    setUsername: () => {}
})

export const UserProvider = ({ children }: { children: ReactNode }) => {
    const [username, setUsername] = useState('')

    return (
        <UserContext.Provider value={{ username, setUsername }}>
            {children}
        </UserContext.Provider>
    )
}

export const useUser = () => useContext(UserContext)

export default function SignIn() {

    const { username, setUsername} = useUser();
    const authContext = useContext(AuthContext);
    const [password, setPassword] = useState('')
    const [isSignUp, setIsSignUp] = useState(false);
    const navigate = useNavigate();

    const toggleSignUp = () => {
        setIsSignUp(prev => !prev);
    };

    const submitHandler = (event: React.FormEvent<HTMLButtonElement>) => {
        event.preventDefault();
        if (username.trim() === '' || password.trim() === '') {
            alert('Please enter both username and password.');
            return;
        }

        let requestBody = {
            query: `
                query {
                    login(email: "${username}", password: "${password}") {
                        userId
                        token
                        tokenExpiration
                    }
                }
            `};

        let requestBodySignUp = {
            query: `
                mutation {
                    createUser(userInput: {email: "${username}", password: "${password}"}) {
                        _id
                        email
                    }
                }
            `};

        fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                query: isSignUp ? requestBodySignUp.query : requestBody.query
            })
        }).then(res => {
            if (res.status !== 200 && res.status !== 201) {
                throw new Error('Failed to authenticate.');
            }
            return res.json();
        }).then(data => {
            if (!isSignUp) {
                authContext.login(data.data.login.token, data.data.login.userId);
            }
            console.log(data);
            navigate('/Home');
        }).catch(err => {
            console.error(err);
        });
    }

    return (
        <div id='box'>
            <div className='sign-in-brand'>
                <span className='sign-in-icon'>🏋️</span>
                <h1>IronLog</h1>
                <p className='sign-in-tagline'>Track every rep. Own every PR.</p>
            </div>

            <div className='input-group'>
                <label htmlFor='username'>Username</label>
                <input
                    id='username'
                    type='text'
                    placeholder='Enter your username'
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                />
            </div>

            <div className='input-group'>
                <label htmlFor='password'>Password</label>
                <input
                    id='password'
                    type='password'
                    placeholder='Enter your password'
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                />
            </div>

            <button onClick={submitHandler}>{isSignUp ? 'Sign Up' : 'Sign In'}</button>
            <button onClick={toggleSignUp}>Switch to {isSignUp ? 'Sign In' : 'Sign Up'}</button>
        </div>
    )
}
