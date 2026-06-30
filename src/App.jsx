import { BrowserRouter, Navigate, Route, Routes, useParams } from 'react-router-dom';
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
import AiAssistantHistoryPage from '@/pages/dashboard/AiAssistantHistoryPage';
import AiAssistantMenuPage from '@/pages/dashboard/AiAssistantMenuPage';
import AiAssistantProfilePage from '@/pages/dashboard/AiAssistantProfilePage';
import AiAssistantRewardsPage from '@/pages/dashboard/AiAssistantRewardsPage';
import AiAssistantOffersPage from '@/pages/dashboard/AiAssistantOffersPage';
import AiAssistantNotificationsPage from '@/pages/dashboard/AiAssistantNotificationsPage';
import AiAssistantCalendarPage from '@/pages/dashboard/AiAssistantCalendarPage';
import GuidedIdeasPage from '@/pages/dashboard/GuidedIdeasPage';
import RestaurantPage from '@/pages/dashboard/RestaurantPage';
import AdminMerchantsPage from '@/pages/admin/AdminMerchantsPage';
import AdminProspectsPage from '@/pages/admin/AdminProspectsPage';
import AdminProspectDetailPage from '@/pages/admin/AdminProspectDetailPage';
import ProspectFormPage from '@/pages/prospect/ProspectFormPage';
import JoinPage from '@/pages/join/JoinPage';
import JoinSuccessPage from '@/pages/join/JoinSuccessPage';

function LegacyMenuRedirect() {
  const { uploadId } = useParams();
  return <Navigate to={`/dashboard/menu/${uploadId}`} replace />;
}

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

            {/* Public — formulaire commercial prospects */}
            <Route path="/prospect-form" element={<ProspectFormPage />} />

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
              path="/dashboard/restaurant"
              element={
                <MerchantProtectedRoute>
                  <RestaurantPage />
                </MerchantProtectedRoute>
              }
            />
            <Route
              path="/dashboard/ideas"
              element={
                <MerchantProtectedRoute>
                  <GuidedIdeasPage />
                </MerchantProtectedRoute>
              }
            />
            <Route
              path="/dashboard/menu"
              element={
                <MerchantProtectedRoute>
                  <AiAssistantUploadPage />
                </MerchantProtectedRoute>
              }
            />
            <Route
              path="/dashboard/menu/:uploadId"
              element={
                <MerchantProtectedRoute>
                  <AiAssistantMenuPage />
                </MerchantProtectedRoute>
              }
            />
            <Route
              path="/dashboard/ai-assistant"
              element={<Navigate to="/dashboard/ideas" replace />}
            />
            <Route
              path="/dashboard/ai-assistant/suggestions"
              element={<Navigate to="/dashboard/ideas?tab=offers" replace />}
            />
            <Route
              path="/dashboard/ai-assistant/upload"
              element={<Navigate to="/dashboard/menu" replace />}
            />
            <Route
              path="/dashboard/ai-assistant/menu/:uploadId"
              element={<LegacyMenuRedirect />}
            />
            <Route
              path="/dashboard/ai-assistant/history"
              element={
                <MerchantProtectedRoute>
                  <AiAssistantHistoryPage />
                </MerchantProtectedRoute>
              }
            />
            <Route
              path="/dashboard/ai-assistant/profile"
              element={<Navigate to="/dashboard/restaurant" replace />}
            />
            <Route
              path="/dashboard/ai-assistant/profile/advanced"
              element={
                <MerchantProtectedRoute>
                  <AiAssistantProfilePage />
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
            <Route
              path="/admin/prospects"
              element={
                <AdminProtectedRoute>
                  <AdminProspectsPage />
                </AdminProtectedRoute>
              }
            />
            <Route
              path="/admin/prospects/:id"
              element={
                <AdminProtectedRoute>
                  <AdminProspectDetailPage />
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
