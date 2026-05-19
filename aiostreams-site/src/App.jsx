import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import TitlePage from './pages/TitlePage';
import PlayerPage from './pages/PlayerPage';
import CommunityPage from './pages/CommunityPage';
import ProfilePage from './pages/ProfilePage';
import AdminPage from './pages/AdminPage';
import WatchPartyPage from './pages/WatchPartyPage';
import { CommunityProvider } from './context/CommunityProvider';

export default function App() {
  return (
    <AppProvider>
      <CommunityProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<HomePage />} />
              <Route path="community" element={<CommunityPage />} />
              <Route path="profile" element={<ProfilePage />} />
              <Route path="admin" element={<AdminPage />} />
              <Route path="party/:roomId" element={<WatchPartyPage />} />
              <Route path="watch/:type/:id" element={<TitlePage />} />
              <Route path="watch/:type/:id/play" element={<PlayerPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </CommunityProvider>
    </AppProvider>
  );
}
