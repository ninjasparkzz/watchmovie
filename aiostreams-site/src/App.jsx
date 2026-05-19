import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppProvider } from './context/AppProvider';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import TitlePage from './pages/TitlePage';
import PlayerPage from './pages/PlayerPage';

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<HomePage />} />
            <Route path="watch/:type/:id" element={<TitlePage />} />
            <Route path="watch/:type/:id/play" element={<PlayerPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AppProvider>
  );
}
