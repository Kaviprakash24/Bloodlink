import React, { useContext } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthContext } from './context/AuthContext';
import MainLayout from './components/layout/MainLayout';

// Pages
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';

import DonorDashboard from './pages/DonorDashboard';
import RequesterDashboard from './pages/RequesterDashboard';
import HospitalDashboard from './pages/HospitalDashboard';
import AdminDashboard from './pages/AdminDashboard';

// Helper to get correct dashboard path based on role
const getRoleDashboardPath = (role) => {
  switch (role) {
    case 'DONOR':
    case 'REQUESTER':
      return '/dashboard';
    case 'HOSPITAL_ADMIN':
      return '/hospital-dashboard';
    case 'ADMIN':
      return '/admin-dashboard';
    default:
      return '/login';
  }
};

// Protected Route Wrapper
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useContext(AuthContext);
  
  if (loading) {
    return (
      <div className="min-h-screen flex justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  // If user tries to access a route they aren't allowed in, redirect to THEIR correct dashboard
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to={getRoleDashboardPath(user.role)} replace />;
  }
  
  return children;
};

const App = () => {
  const { user, loading } = useContext(AuthContext);

  if (loading) {
    return (
      <div className="min-h-screen flex justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route path="/" element={<Home />} />
        
        {/* Auth routes redirect to user's correct dashboard if already logged in */}
        <Route path="/login" element={!user ? <Login /> : <Navigate to={getRoleDashboardPath(user.role)} replace />} />
        <Route path="/register" element={!user ? <Register /> : <Navigate to={getRoleDashboardPath(user.role)} replace />} />
        
        {/* Dashboard for DONOR and REQUESTER */}
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute allowedRoles={['DONOR', 'REQUESTER']}>
              {user?.role === 'DONOR' ? <DonorDashboard /> : <RequesterDashboard />}
            </ProtectedRoute>
          } 
        />

        {/* Dashboard for HOSPITAL_ADMIN */}
        <Route 
          path="/hospital-dashboard" 
          element={
            <ProtectedRoute allowedRoles={['HOSPITAL_ADMIN']}>
              <HospitalDashboard />
            </ProtectedRoute>
          } 
        />

        {/* Dashboard for ADMIN */}
        <Route 
          path="/admin-dashboard" 
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <AdminDashboard />
            </ProtectedRoute>
          } 
        />

        {/* Catch-all route */}
        <Route path="*" element={<Navigate to={user ? getRoleDashboardPath(user.role) : '/'} replace />} />
      </Route>
    </Routes>
  );
}

export default App;
