import './App.css'
import SignIn from './components/SignIn'
import { Route, Routes } from 'react-router-dom'
import { UserProvider } from './components/SignIn'
import { AuthContext } from './context/context'
import { clearLiftsCache } from './utils/api'
import { useState, lazy, Suspense, useEffect } from 'react'

import BottomNav from './components/BottomNav'

// Route-level code splitting — each page is its own chunk, loaded on demand.
const Home = lazy(() => import('./components/Home'))
const MyLifts = lazy(() => import('./components/MyLifts'))
const ModifyLifts = lazy(() => import('./components/ModifyLifts'))
const RecommendedLifts = lazy(() => import('./components/RecommendedLifts'))
const Profile = lazy(() => import('./components/Profile'))
const WorkoutBuilder = lazy(() => import('./components/WorkoutBuilder'))
const WorkoutSession = lazy(() => import('./components/WorkoutSession'))
const Onboarding = lazy(() => import('./components/Onboarding'))

function RouteFallback() {
  return <div className='route-fallback'><div className='route-spinner' /></div>
}

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

  // Lock the app width to the actual viewport so a stray overflow can't be
  // scrolled to on mobile (keeps the layout from feeling "off").
  useEffect(() => {
    const lock = () => {
      const w = Math.round(window.innerWidth || window.visualViewport?.width || document.documentElement.clientWidth || 0);
      if (w > 0) document.documentElement.style.setProperty('--app-w', w + 'px');
    };
    lock();
    window.addEventListener('resize', lock);
    window.addEventListener('orientationchange', lock);
    window.visualViewport?.addEventListener('resize', lock);
    return () => {
      window.removeEventListener('resize', lock);
      window.removeEventListener('orientationchange', lock);
      window.visualViewport?.removeEventListener('resize', lock);
    };
  }, []);

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
    localStorage.removeItem('username');
    clearLiftsCache();
  };

  return (
    <AuthContext.Provider value={{ token, userId, login, logout }}>
      <UserProvider>
        <Suspense fallback={<RouteFallback />}>
          {token && <BottomNav />}
          <Routes>
            <Route path='/' element={<SignIn />} />
            <Route path='/Home' element={<Home />} />
            <Route path='/MyLifts' element={<MyLifts />} />
            <Route path='/Lift' element={<SignIn />} />
            <Route path='/liftModify' element={<ModifyLifts />} />
            <Route path='/recommended' element={<RecommendedLifts />} />
            <Route path='/profile' element={<Profile />} />
            <Route path='/onboarding' element={<Onboarding />} />
            <Route path='/workout-builder' element={<WorkoutBuilder />} />
            <Route path='/workout' element={<WorkoutSession />} />
          </Routes>
        </Suspense>
      </UserProvider>
    </AuthContext.Provider>
  )
}

export default App
