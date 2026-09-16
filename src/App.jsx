import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { SessionProvider } from './context/SessionContext'
import { SheetsDataProvider } from './context/SheetsDataProvider'
import ErrorBoundary from './components/ErrorBoundary'
import GoogleSheetsModal from './components/GoogleSheetsModal'
import ModernAppLayout from './components/ModernAppLayout'
import ModernDashboardPage from './pages/ModernDashboardPage'
import ModernAnalyzerPage from './pages/ModernAnalyzerPage'
import ModernHistoryPage from './pages/ModernHistoryPage'
import ModernSettingsPage from './pages/ModernSettingsPage'

function AppRoutes() {
  const { isConnected, connect } = useAuth()

  if (!isConnected) {
    return <GoogleSheetsModal onSetup={connect} />
  }

  return (
    <SessionProvider>
      <SheetsDataProvider>
        <ModernAppLayout>
          <Routes>
            <Route path="/" element={<ModernDashboardPage />} />
            <Route path="/analyzer" element={<ModernAnalyzerPage />} />
            <Route path="/history" element={<ModernHistoryPage />} />
            <Route path="/settings" element={<ModernSettingsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ModernAppLayout>
      </SheetsDataProvider>
    </SessionProvider>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </ErrorBoundary>
    </BrowserRouter>
  )
}
