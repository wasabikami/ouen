import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import LoginPage from "./pages/LoginPage";
import ProfileSetupPage from "./pages/ProfileSetupPage";
import PendingApprovalPage from "./pages/PendingApprovalPage";
import HomePage from "./pages/HomePage";
import OuenPage from "./pages/OuenPage";
import MyPage from "./pages/MyPage";
import MembersPage from "./pages/MembersPage";
import AdminPage from "./pages/AdminPage";
import "./index.css";

function PrivateRoute({ children }) {
  const { user, userProfile } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (!userProfile) return <Navigate to="/profile-setup" replace />;
  if (userProfile.status && userProfile.status !== "approved") return <PendingApprovalPage />;
  return children;
}

function AppRoutes() {
  const { user, userProfile } = useAuth();

  return (
    <Routes>
      <Route
        path="/login"
        element={!user ? <LoginPage /> : <Navigate to="/" replace />}
      />
      <Route
        path="/profile-setup"
        element={user && !userProfile ? <ProfileSetupPage /> : <Navigate to={user ? "/" : "/login"} replace />}
      />
      <Route path="/" element={<PrivateRoute><HomePage /></PrivateRoute>} />
      <Route path="/ouen" element={<PrivateRoute><OuenPage /></PrivateRoute>} />
      <Route path="/mypage" element={<PrivateRoute><MyPage /></PrivateRoute>} />
      <Route path="/members" element={<PrivateRoute><MembersPage /></PrivateRoute>} />
      <Route path="/admin" element={<PrivateRoute><AdminPage /></PrivateRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
