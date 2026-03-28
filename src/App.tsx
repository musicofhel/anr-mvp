import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { Nav } from './components/Nav';
import { AuthPage } from './pages/AuthPage';
import { DashboardPage } from './pages/DashboardPage';
import { SubmitPage } from './pages/SubmitPage';
import { ReviewPage } from './pages/ReviewPage';
import { LeaderboardPage } from './pages/LeaderboardPage';

function Shell() {
  const { loading, user, label } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-xs text-gray-400 animate-pulse">Loading...</p>
      </div>
    );
  }

  if (!user || !label) return <AuthPage />;

  return (
    <div className="min-h-screen bg-white">
      <Nav />
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/submit" element={<SubmitPage />} />
        <Route path="/review" element={<ReviewPage />} />
        <Route path="/leaderboard" element={<LeaderboardPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Shell />
      </AuthProvider>
    </BrowserRouter>
  );
}
