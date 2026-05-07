/**
 * App.jsx — Root router
 */
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider }  from './context/AuthContext';
import ProtectedRoute    from './components/ProtectedRoute';

import Login              from './pages/Login';
import Dashboard          from './pages/Dashboard';
import CustomBuckets      from './pages/CustomBuckets';
import AutoResponseRules  from './pages/AutoResponseRules';
import PendingResponses   from './pages/PendingResponses';
import LandingPage        from './pages/LandingPage';
import Compose            from './pages/Compose';
import PrivacyPolicy      from './pages/PrivacyPolicy';
import TermsOfService     from './pages/TermsOfService';

const App = () => (
  <AuthProvider>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login"    element={<Login />} />

        <Route path="/dashboard" element={
          <ProtectedRoute><Dashboard /></ProtectedRoute>
        }/>
        <Route path="/custom-buckets" element={
          <ProtectedRoute><CustomBuckets /></ProtectedRoute>
        }/>
        <Route path="/auto-response-rules" element={
          <ProtectedRoute><AutoResponseRules /></ProtectedRoute>
        }/>
        <Route path="/pending-responses" element={
          <ProtectedRoute><PendingResponses /></ProtectedRoute>
        }/>
        <Route path="/compose" element={
          <ProtectedRoute><Compose /></ProtectedRoute>
        }/>

        {/* Public pages (required for Google OAuth verification) */}
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/terms"   element={<TermsOfService />} />

        {/* Default → Landing Page */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>

    <Toaster
      position="bottom-right"
      toastOptions={{
        style: {
          background: '#1a1a2e',
          color:      '#f1f5f9',
          border:     '1px solid rgba(255,255,255,0.08)',
          fontSize:   '0.875rem',
        },
        success: { iconTheme: { primary: '#10b981', secondary: '#fff' } },
        error:   { iconTheme: { primary: '#f43f5e', secondary: '#fff' } },
      }}
    />
  </AuthProvider>
);

export default App;
