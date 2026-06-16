import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import ErrorBoundary from './components/ErrorBoundary';
import ProtectedRoute from './components/ProtectedRoute';
import LicenseGate from './components/LicenseGate';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ProductsPage from './pages/products/ProductsPage';
import SuppliersPage from './pages/suppliers/SuppliersPage';
import InventoryPage from './pages/inventory/InventoryPage';
import ReportsPage from './pages/reports/ReportsPage';
import UsersPage from './pages/users/UsersPage';
import BranchesPage from './pages/branches/BranchesPage';
import PurchaseOrdersPage from './pages/purchase-orders/PurchaseOrdersPage';
import StockCountPage from './pages/stock-count/StockCountPage';
import AuditLogsPage from './pages/audit-logs/AuditLogsPage';
import TransferOrdersPage from './pages/transfer-orders/TransferOrdersPage';
import ActivatePage from './pages/activate/ActivatePage';
import SettingsPage from './pages/settings/SettingsPage';
import CustomersPage from './pages/customers/CustomersPage';
import SalesPage from './pages/sales/SalesPage';
import POSPage from './pages/pos/POSPage';
import ExpensesPage from './pages/expenses/ExpensesPage';
import KitSelectorPage from './pages/settings/KitSelectorPage';
import ProfilePage from './pages/ProfilePage';
import ForecastingPage from './pages/forecasting/ForecastingPage';
import DnaScorePage from './pages/dna-score/DnaScorePage';
import HealthScorePage from './pages/health-score/HealthScorePage';
import SimulatorPage from './pages/simulator/SimulatorPage';
import ApprovalsPage from './pages/approvals/ApprovalsPage';
import CompliancePage from './pages/compliance/CompliancePage';
import RecallsPage from './pages/recalls/RecallsPage';
import SupplierPortalPage from './pages/supplier-portal/SupplierPortalPage';
import SupplierPortalView from './pages/supplier-portal/SupplierPortalView';
import FranchisePage from './pages/franchise/FranchisePage';
import './app.css';

const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});

createRoot(document.getElementById('app')).render(
    <StrictMode>
        <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
            <ToastProvider>
            <AuthProvider>
                <BrowserRouter>
                    <Routes>
                        <Route path="/login"    element={<Login />} />
                        <Route path="/activate" element={<ProtectedRoute><ActivatePage /></ProtectedRoute>} />
                        <Route path="/" element={<Navigate to="/dashboard" replace />} />
                        <Route path="/dashboard"       element={<ProtectedRoute><LicenseGate><Dashboard /></LicenseGate></ProtectedRoute>} />
                        <Route path="/products/*"      element={<ProtectedRoute><LicenseGate><ProductsPage /></LicenseGate></ProtectedRoute>} />
                        <Route path="/suppliers/*"     element={<ProtectedRoute><LicenseGate><SuppliersPage /></LicenseGate></ProtectedRoute>} />
                        <Route path="/inventory/*"     element={<ProtectedRoute><LicenseGate><InventoryPage /></LicenseGate></ProtectedRoute>} />
                        <Route path="/reports/*"       element={<ProtectedRoute><LicenseGate><ReportsPage /></LicenseGate></ProtectedRoute>} />
                        <Route path="/users/*"         element={<ProtectedRoute><LicenseGate><UsersPage /></LicenseGate></ProtectedRoute>} />
                        <Route path="/branches/*"      element={<ProtectedRoute><LicenseGate><BranchesPage /></LicenseGate></ProtectedRoute>} />
                        <Route path="/purchase-orders/*" element={<ProtectedRoute><LicenseGate><PurchaseOrdersPage /></LicenseGate></ProtectedRoute>} />
                        <Route path="/stock-counts/*"  element={<ProtectedRoute><LicenseGate><StockCountPage /></LicenseGate></ProtectedRoute>} />
                        <Route path="/audit-logs/*"    element={<ProtectedRoute><LicenseGate><AuditLogsPage /></LicenseGate></ProtectedRoute>} />
                        <Route path="/transfer-orders/*" element={<ProtectedRoute><LicenseGate><TransferOrdersPage /></LicenseGate></ProtectedRoute>} />
                        <Route path="/settings/*"      element={<ProtectedRoute><LicenseGate><SettingsPage /></LicenseGate></ProtectedRoute>} />
                        <Route path="/customers/*"     element={<ProtectedRoute><LicenseGate><CustomersPage /></LicenseGate></ProtectedRoute>} />
                        <Route path="/sales/*"         element={<ProtectedRoute><LicenseGate><SalesPage /></LicenseGate></ProtectedRoute>} />
                        <Route path="/pos/*"           element={<ProtectedRoute><LicenseGate><POSPage /></LicenseGate></ProtectedRoute>} />
                        <Route path="/expenses/*"      element={<ProtectedRoute><LicenseGate><ExpensesPage /></LicenseGate></ProtectedRoute>} />
                        <Route path="/industry-kits/*" element={<ProtectedRoute><LicenseGate><KitSelectorPage /></LicenseGate></ProtectedRoute>} />
                        <Route path="/forecasting/*"   element={<ProtectedRoute><LicenseGate><ForecastingPage /></LicenseGate></ProtectedRoute>} />
                        <Route path="/dna-scores/*"    element={<ProtectedRoute><LicenseGate><DnaScorePage /></LicenseGate></ProtectedRoute>} />
                        <Route path="/health-score/*"  element={<ProtectedRoute><LicenseGate><HealthScorePage /></LicenseGate></ProtectedRoute>} />
                        <Route path="/simulator/*"     element={<ProtectedRoute><LicenseGate><SimulatorPage /></LicenseGate></ProtectedRoute>} />
                        <Route path="/approvals/*"       element={<ProtectedRoute><LicenseGate><ApprovalsPage /></LicenseGate></ProtectedRoute>} />
                        <Route path="/compliance/*"      element={<ProtectedRoute><LicenseGate><CompliancePage /></LicenseGate></ProtectedRoute>} />
                        <Route path="/recalls/*"         element={<ProtectedRoute><LicenseGate><RecallsPage /></LicenseGate></ProtectedRoute>} />
                        <Route path="/supplier-portal/*" element={<ProtectedRoute><LicenseGate><SupplierPortalPage /></LicenseGate></ProtectedRoute>} />
                        <Route path="/supplier-portal/:token" element={<SupplierPortalView />} />
                        <Route path="/franchise/*" element={<ProtectedRoute><LicenseGate><FranchisePage /></LicenseGate></ProtectedRoute>} />
                        <Route path="/profile"         element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
                    </Routes>
                </BrowserRouter>
            </AuthProvider>
            </ToastProvider>
        </QueryClientProvider>
        </ErrorBoundary>
    </StrictMode>
);
