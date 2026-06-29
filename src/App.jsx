import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { AuthProvider } from '@/lib/AuthContext';
import { queryClient } from '@/lib/query-client';
import MerchantProtectedRoute from '@/components/MerchantProtectedRoute';
import AdminProtectedRoute from '@/components/AdminProtectedRoute';
import AuthPage from '@/pages/AuthPage';
import DashboardHomePage from '@/pages/dashboard/DashboardHomePage';
import BusinessSettingsPage from '@/pages/dashboard/BusinessSettingsPage';
import ProgramSettingsPage from '@/pages/dashboard/ProgramSettingsPage';
import QrPage from '@/pages/dashboard/QrPage';
import ScanPage from '@/pages/dashboard/ScanPage';
import CustomersPage from '@/pages/dashboard/CustomersPage';
import CustomerDetailPage from '@/pages/dashboard/CustomerDetailPage';
import OffersPage from '@/pages/dashboard/OffersPage';
import AiAssistantUploadPage from '@/pages/dashboard/AiAssistantUploadPage';
import AiAssistantMenuPage from '@/pages/dashboard/AiAssistantMenuPage';
import AiAssistantProfilePage from '@/pages/dashboard/AiAssistantProfilePage';
import AiAssistantSuggestionsPage from '@/pages/dashboard/AiAssistantSuggestionsPage';
import AiAssistantRewardsPage from '@/pages/dashboard/AiAssistantRewardsPage';
import AiAssistantOffersPage from '@/pages/dashboard/AiAssistantOffersPage';
import AiAssistantNotificationsPage from '@/pages/dashboard/AiAssistantNotificationsPage';
import AiAssistantCalendarPage from '@/pages/dashboard/AiAssistantCalendarPage';
import AdminMerchantsPage from '@/pages/admin/AdminMerchantsPage';
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
                <MerchantProtectedRoute>
                  <DashboardHomePage />
                </MerchantProtectedRoute>
              }
            />
            <Route
              path="/dashboard/business"
              element={
                <MerchantProtectedRoute>
                  <BusinessSettingsPage />
                </MerchantProtectedRoute>
              }
            />
            <Route
              path="/dashboard/program"
              element={
                <MerchantProtectedRoute>
                  <ProgramSettingsPage />
                </MerchantProtectedRoute>
              }
            />
            <Route
              path="/dashboard/qr"
              element={
                <MerchantProtectedRoute>
                  <QrPage />
                </MerchantProtectedRoute>
              }
            />
            <Route
              path="/dashboard/scan"
              element={
                <MerchantProtectedRoute>
                  <ScanPage />
                </MerchantProtectedRoute>
              }
            />
            <Route
              path="/dashboard/customers"
              element={
                <MerchantProtectedRoute>
                  <CustomersPage />
                </MerchantProtectedRoute>
              }
            />
            <Route
              path="/dashboard/customers/:membershipId"
              element={
                <MerchantProtectedRoute>
                  <CustomerDetailPage />
                </MerchantProtectedRoute>
              }
            />
            <Route
              path="/dashboard/offers"
              element={
                <MerchantProtectedRoute>
                  <OffersPage />
                </MerchantProtectedRoute>
              }
            />
            <Route
              path="/dashboard/ai-assistant/upload"
              element={
                <MerchantProtectedRoute>
                  <AiAssistantUploadPage />
                </MerchantProtectedRoute>
              }
            />
            <Route
              path="/dashboard/ai-assistant/menu/:uploadId"
              element={
                <MerchantProtectedRoute>
                  <AiAssistantMenuPage />
                </MerchantProtectedRoute>
              }
            />
            <Route
              path="/dashboard/ai-assistant/profile"
              element={
                <MerchantProtectedRoute>
                  <AiAssistantProfilePage />
                </MerchantProtectedRoute>
              }
            />
            <Route
              path="/dashboard/ai-assistant/suggestions"
              element={
                <MerchantProtectedRoute>
                  <AiAssistantSuggestionsPage />
                </MerchantProtectedRoute>
              }
            />
            <Route
              path="/dashboard/ai-assistant/rewards"
              element={
                <MerchantProtectedRoute>
                  <AiAssistantRewardsPage />
                </MerchantProtectedRoute>
              }
            />
            <Route
              path="/dashboard/ai-assistant/offers"
              element={
                <MerchantProtectedRoute>
                  <AiAssistantOffersPage />
                </MerchantProtectedRoute>
              }
            />
            <Route
              path="/dashboard/ai-assistant/notifications"
              element={
                <MerchantProtectedRoute>
                  <AiAssistantNotificationsPage />
                </MerchantProtectedRoute>
              }
            />
            <Route
              path="/dashboard/ai-assistant/calendar"
              element={
                <MerchantProtectedRoute>
                  <AiAssistantCalendarPage />
                </MerchantProtectedRoute>
              }
            />
            <Route
              path="/admin/merchants"
              element={
                <AdminProtectedRoute>
                  <AdminMerchantsPage />
                </AdminProtectedRoute>
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
