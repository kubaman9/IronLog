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
  const [token, setToken] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const login = (newToken: string, newUserId: string) => {
    setToken(newToken);
    setUserId(newUserId);
  };

  const logout = () => {
    setToken(null);
    setUserId(null);
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
