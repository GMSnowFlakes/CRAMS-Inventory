import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import ErrorBoundary from './components/ErrorBoundary';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Demo from './pages/Demo';
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
import UpdaterPage from './pages/updater/UpdaterPage';
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
                        <Route path="/demo"      element={<Demo />} />
                        <Route path="/" element={<Navigate to="/dashboard" replace />} />
                        <Route path="/dashboard"       element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                        <Route path="/products/*"      element={<ProtectedRoute><ProductsPage /></ProtectedRoute>} />
                        <Route path="/suppliers/*"     element={<ProtectedRoute><SuppliersPage /></ProtectedRoute>} />
                        <Route path="/inventory/*"     element={<ProtectedRoute><InventoryPage /></ProtectedRoute>} />
                        <Route path="/reports/*"       element={<ProtectedRoute><ReportsPage /></ProtectedRoute>} />
                        <Route path="/users/*"         element={<ProtectedRoute><UsersPage /></ProtectedRoute>} />
                        <Route path="/branches/*"      element={<ProtectedRoute><BranchesPage /></ProtectedRoute>} />
                        <Route path="/purchase-orders/*" element={<ProtectedRoute><PurchaseOrdersPage /></ProtectedRoute>} />
                        <Route path="/stock-counts/*"  element={<ProtectedRoute><StockCountPage /></ProtectedRoute>} />
                        <Route path="/audit-logs/*"    element={<ProtectedRoute><AuditLogsPage /></ProtectedRoute>} />
                        <Route path="/transfer-orders/*" element={<ProtectedRoute><TransferOrdersPage /></ProtectedRoute>} />
                        <Route path="/transfers/*" element={<Navigate to="/transfer-orders" replace />} />
                        <Route path="/settings/*"      element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
                        <Route path="/customers/*"     element={<ProtectedRoute><CustomersPage /></ProtectedRoute>} />
                        <Route path="/sales/*"         element={<ProtectedRoute><SalesPage /></ProtectedRoute>} />
                        <Route path="/pos/*"           element={<ProtectedRoute><POSPage /></ProtectedRoute>} />
                        <Route path="/expenses/*"      element={<ProtectedRoute><ExpensesPage /></ProtectedRoute>} />
                        <Route path="/industry-kits/*" element={<ProtectedRoute><KitSelectorPage /></ProtectedRoute>} />
                        <Route path="/forecasting/*"   element={<ProtectedRoute><ForecastingPage /></ProtectedRoute>} />
                        <Route path="/dna-scores/*"    element={<ProtectedRoute><DnaScorePage /></ProtectedRoute>} />
                        <Route path="/health-score/*"  element={<ProtectedRoute><HealthScorePage /></ProtectedRoute>} />
                        <Route path="/simulator/*"     element={<ProtectedRoute><SimulatorPage /></ProtectedRoute>} />
                        <Route path="/approvals/*"       element={<ProtectedRoute><ApprovalsPage /></ProtectedRoute>} />
                        <Route path="/compliance/*"      element={<ProtectedRoute><CompliancePage /></ProtectedRoute>} />
                        <Route path="/recalls/*"         element={<ProtectedRoute><RecallsPage /></ProtectedRoute>} />
                        <Route path="/supplier-portal/*" element={<ProtectedRoute><SupplierPortalPage /></ProtectedRoute>} />
                        <Route path="/supplier-portal/:token" element={<SupplierPortalView />} />
                        <Route path="/franchise/*" element={<ProtectedRoute><FranchisePage /></ProtectedRoute>} />
                        <Route path="/updates"         element={<ProtectedRoute><UpdaterPage /></ProtectedRoute>} />
                        <Route path="/profile"         element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
                    </Routes>
                </BrowserRouter>
            </AuthProvider>
            </ToastProvider>
        </QueryClientProvider>
        </ErrorBoundary>
    </StrictMode>
);
