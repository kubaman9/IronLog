import './App.css'
import SignIn from './components/SignIn'
import Home from './components/Home'
import MyLifts from './components/MyLifts'
import ModifyLifts from './components/ModifyLifts'
import { Route, Routes } from 'react-router-dom'
import { UserProvider } from './components/SignIn'
import { AuthContext } from './context/context'
import { useState } from 'react'

function App() {

  const getValidToken = (key: 'token' | 'userId') => {
  const token = localStorage.getItem('token');
  if (!token) return null;

  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    if (payload.exp * 1000 < Date.now()) {
      localStorage.removeItem('token');
      localStorage.removeItem('userId');
      return null;
    }
  } catch {
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    return null;
  }

  return localStorage.getItem(key);
};

  const [token, setToken] = useState<string | null>(() => getValidToken('token'));
  const [userId, setUserId] = useState<string | null>(() => getValidToken('userId'));

  const login = (newToken: string, newUserId: string) => {
    setToken(newToken);
    setUserId(newUserId);
    localStorage.setItem('token', newToken);
    localStorage.setItem('userId', newUserId);
  };

  const logout = () => {
    setToken(null);
    setUserId(null);
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
  };

  return (
    <AuthContext.Provider value={{ token, userId, login, logout }}>
      <UserProvider>
        <Routes>
          <Route path='/' element={<SignIn />} />
          <Route path='/Home' element={<Home />} />
          <Route path='/MyLifts' element={<MyLifts />} />
          <Route path='/Lift' element={<SignIn />} />
          <Route path='/liftModify' element={<ModifyLifts />} />
        </Routes>
      </UserProvider>
    </AuthContext.Provider>
  )
}

export default App
