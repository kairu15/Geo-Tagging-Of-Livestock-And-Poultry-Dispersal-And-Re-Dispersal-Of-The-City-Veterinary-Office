import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './routes/ProtectedRoute';

// Layout
import Layout from './components/Layout';

// Pages
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import AnimalsListPage from './pages/AnimalsListPage';
import AnimalDetailPage from './pages/AnimalDetailPage';
import BeneficiariesPage from './pages/BeneficiariesPage';
import BeneficiaryDetailPage from './pages/BeneficiaryDetailPage';
import DisperseAnimalPage from './pages/DisperseAnimalPage';
import RedisperseAnimalPage from './pages/RedisperseAnimalPage';
import ReportsPage from './pages/ReportsPage';
import AnimalRegistrationPage from './pages/AnimalRegistrationPage';
import SpeciesManagementPage from './pages/SpeciesManagementPage';
import GeoTagMapPage from './pages/GeoTagMapPage';
import AnimalGeoProfilePage from './pages/AnimalGeoProfilePage';
import TagAnimalPage from './pages/TagAnimalPage';
import HandoffPage from './pages/HandoffPage';
import CheckInPage from './pages/CheckInPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchInterval: false,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />

            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route index element={<DashboardPage />} />
              <Route path="animals" element={<AnimalsListPage />} />
              <Route path="animals/register" element={<AnimalRegistrationPage />} />
              <Route path="animals/:id" element={<AnimalDetailPage />} />
              <Route path="beneficiaries" element={<BeneficiariesPage />} />
              <Route path="beneficiaries/:id" element={<BeneficiaryDetailPage />} />
              <Route
                path="dispersal"
                element={
                  <ProtectedRoute requiredRole={['ADMIN', 'OFFICER', 'SUPERVISOR']}>
                    <DisperseAnimalPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="redispersal"
                element={
                  <ProtectedRoute requiredRole={['ADMIN', 'OFFICER', 'SUPERVISOR']}>
                    <RedisperseAnimalPage />
                  </ProtectedRoute>
                }
              />
              <Route path="reports" element={<ReportsPage />} />
              <Route path="species" element={
                <ProtectedRoute requiredRole={['ADMIN', 'OFFICER', 'SUPERVISOR']}>
                  <SpeciesManagementPage />
                </ProtectedRoute>
              } />
              {/* Geo-Tagging routes */}
              <Route path="geo-tracking/map" element={<GeoTagMapPage />} />
              <Route path="geo-tracking/profile/:id" element={<AnimalGeoProfilePage />} />
              <Route path="geo-tracking/lookup/:tagCode" element={<AnimalGeoProfilePage />} />
              <Route path="geo-tracking/lookup" element={<AnimalGeoProfilePage />} />
              <Route path="geo-tracking/tag" element={
                <ProtectedRoute requiredRole={['ADMIN', 'OFFICER', 'SUPERVISOR']}>
                  <TagAnimalPage />
                </ProtectedRoute>
              } />
              <Route path="geo-tracking/handoff" element={
                <ProtectedRoute requiredRole={['ADMIN', 'OFFICER', 'SUPERVISOR']}>
                  <HandoffPage />
                </ProtectedRoute>
              } />
              <Route path="geo-tracking/checkin" element={
                <ProtectedRoute requiredRole={['ADMIN', 'OFFICER', 'SUPERVISOR']}>
                  <CheckInPage />
                </ProtectedRoute>
              } />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
