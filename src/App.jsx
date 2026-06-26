import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { AuthProvider } from '@/lib/AuthContext';
import { queryClient } from '@/lib/query-client';
import ProtectedRoute from '@/components/ProtectedRoute';
import AuthPage from '@/pages/AuthPage';
import DashboardHomePage from '@/pages/dashboard/DashboardHomePage';
import BusinessSettingsPage from '@/pages/dashboard/BusinessSettingsPage';
import ProgramSettingsPage from '@/pages/dashboard/ProgramSettingsPage';
import QrPage from '@/pages/dashboard/QrPage';
import ScanPage from '@/pages/dashboard/ScanPage';
import CustomersPage from '@/pages/dashboard/CustomersPage';
import CustomerDetailPage from '@/pages/dashboard/CustomerDetailPage';
import OffersPage from '@/pages/dashboard/OffersPage';
import JoinPage from '@/pages/join/JoinPage';
import JoinSuccessPage from '@/pages/join/JoinSuccessPage';

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />

            {/* Public — inscription client */}
            <Route path="/join/:businessSlug" element={<JoinPage />} />
            <Route path="/join/:businessSlug/success" element={<JoinSuccessPage />} />

            <Route path="/auth" element={<AuthPage />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardHomePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/business"
              element={
                <ProtectedRoute>
                  <BusinessSettingsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/program"
              element={
                <ProtectedRoute>
                  <ProgramSettingsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/qr"
              element={
                <ProtectedRoute>
                  <QrPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/scan"
              element={
                <ProtectedRoute>
                  <ScanPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/customers"
              element={
                <ProtectedRoute>
                  <CustomersPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/customers/:membershipId"
              element={
                <ProtectedRoute>
                  <CustomerDetailPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/offers"
              element={
                <ProtectedRoute>
                  <OffersPage />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
        <Toaster richColors position="top-center" />
      </AuthProvider>
    </QueryClientProvider>
  );
}
