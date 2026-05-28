import React from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { LockKeyhole } from 'lucide-react';
import { AppLayout } from './layouts/AppLayout';
import { AuthProvider, useAuth } from './features/auth/context/AuthContext';
import { LoginPage } from './features/auth/pages/LoginPage';
import { DashboardPage } from './features/dashboard/pages/DashboardPage';
import { CompaniesPage } from './features/companies/pages/CompaniesPage';
import { CompanyDetailPage } from './features/companies/pages/CompanyDetailPage';
import { PipelinePage } from './features/sales/pipeline/pages/PipelinePage';
import { DealDetailPage } from './features/sales/pipeline/pages/DealDetailPage';
import { ContactsPage } from './features/contacts/pages/ContactsPage';
import { AssociatesPage } from './features/sales/associates/pages/AssociatesPage';
import { LeadsPage } from './features/sales/leads/pages/LeadsPage';
import { InvoicesPage } from './features/finance/invoices/pages/InvoicesPage';
import { ReceiptsPage } from './features/finance/receipts/pages/ReceiptsPage';
import { OrdersPage } from './features/finance/orders/pages/OrdersPage';
import { WorkOrderDetailsPage } from './features/finance/orders/pages/WorkOrderDetailsPage';
import { ClientsPage } from './features/finance/clients/pages/ClientsPage';
import { ClientDetailsPage } from './features/finance/clients/pages/ClientDetailsPage';
import { CreateOrderPage } from './features/finance/orders/pages/CreateOrderPage';
import { CollectionProjectionPage } from './features/finance/collection-projection/pages/CollectionProjectionPage';
import { FeaturePlaceholderPage } from './features/shared/pages/FeaturePlaceholderPage';
import { SettingsPage } from './features/settings/pages/SettingsPage';
import { AccessControlPage } from './features/access-control/pages/AccessControlPage';
import { MemberManagementPage } from './features/settings/pages/MemberManagementPage';
import { MyKeysPage } from './features/settings/pages/MyKeysPage';
import { TenantProfilePage } from './features/settings/pages/TenantProfilePage';

const AccessDeniedPage = ({ title = 'Access Denied', description }) => (
  <div className="space-y-6 animate-in fade-in duration-500">
    <div className="overflow-hidden rounded-[28px] border border-amber-200 bg-white shadow-sm dark:border-amber-500/20 dark:bg-neutral-900">
      <div className="bg-[radial-gradient(circle_at_top_left,_rgba(245,158,11,0.16),_transparent_34%),linear-gradient(135deg,_rgba(255,251,235,0.96),_rgba(255,255,255,0.9))] px-8 py-10 dark:bg-[radial-gradient(circle_at_top_left,_rgba(245,158,11,0.16),_transparent_34%),linear-gradient(135deg,_rgba(10,10,10,0.96),_rgba(23,23,23,0.88))]">
        <div className="inline-flex rounded-2xl bg-amber-100 p-3 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
          <LockKeyhole className="h-6 w-6" />
        </div>
        <h1 className="mt-4 text-3xl font-semibold text-slate-950 dark:text-white">{title}</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 dark:text-neutral-400">
          {description || 'Your account does not have permission to view this page.'}
        </p>
      </div>
    </div>
  </div>
);

const hasAllPermissions = (user, requiredPermissions = []) =>
  requiredPermissions.every((permission) => user?.permissions?.includes(permission));

const ProtectedRoute = ({ children, requireAdmin = false, requiredPermissions = [], deniedMessage }) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const routeScopeKey = `${user?.id || user?._id || user?.email || 'anonymous'}:${user?.tenantId || 'no-tenant'}`;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-neutral-950">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate type="navigate" to="/login" state={{ from: location }} replace />;
  }

  const isAdmin = user.roles?.includes('admin');
  const hasAccess = (!requireAdmin || isAdmin) && hasAllPermissions(user, requiredPermissions);

  if (!hasAccess) {
    return (
      <AppLayout key={routeScopeKey}>
        <AccessDeniedPage description={deniedMessage} />
      </AppLayout>
    );
  }

  return <AppLayout key={routeScopeKey}>{children}</AppLayout>;
};

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route
            path="/"
            element={
              <ProtectedRoute requiredPermissions={['read:main.dashboard']}>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/companies"
            element={
              <ProtectedRoute requiredPermissions={['read:sales.companies']}>
                <CompaniesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/companies/:id"
            element={
              <ProtectedRoute requiredPermissions={['read:sales.companies']}>
                <CompanyDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/contacts"
            element={
              <ProtectedRoute requiredPermissions={['read:sales.contacts']}>
                <ContactsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/associates"
            element={
              <ProtectedRoute requiredPermissions={['read:sales.associates']}>
                <AssociatesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/leads"
            element={
              <ProtectedRoute requiredPermissions={['read:sales.leads']}>
                <LeadsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/pipeline"
            element={
              <ProtectedRoute requiredPermissions={['read:sales.pipeline']}>
                <PipelinePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/pipeline/:id"
            element={
              <ProtectedRoute requiredPermissions={['read:sales.pipeline']}>
                <DealDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/orders"
            element={
              <ProtectedRoute requiredPermissions={['read:finance-ops.orders']}>
                <OrdersPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/orders/new"
            element={
              <ProtectedRoute requiredPermissions={['read:finance-ops.orders']}>
                <CreateOrderPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/client/:id/orders"
            element={
              <ProtectedRoute requiredPermissions={['read:finance-ops.clients.work-orders.details']}>
                <WorkOrderDetailsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/invoices"
            element={
              <ProtectedRoute requiredPermissions={['read:finance-ops.invoices']}>
                <InvoicesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/receipts"
            element={
              <ProtectedRoute requiredPermissions={['read:finance-ops.receipts']}>
                <ReceiptsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/collection-projection"
            element={
              <ProtectedRoute requiredPermissions={['read:finance-ops.collection-projection']}>
                <CollectionProjectionPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/clients"
            element={
              <ProtectedRoute requiredPermissions={['read:finance-ops.clients']}>
                <ClientsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/clients/:id/details"
            element={
              <ProtectedRoute requiredPermissions={['read:finance-ops.clients.details']}>
                <ClientDetailsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/registers"
            element={
              <ProtectedRoute requiredPermissions={['read:intelligence.registers']}>
                <FeaturePlaceholderPage
                  title="Registers"
                  description="Registers is exposed through purchased navigation. The page shell is in place while the workspace is built."
                />
              </ProtectedRoute>
            }
          />
          <Route
            path="/tax-reports"
            element={
              <ProtectedRoute requiredPermissions={['read:intelligence.tax-reports']}>
                <FeaturePlaceholderPage
                  title="Tax Reports"
                  description="Tax Reports is exposed through purchased navigation. The page shell is in place while the workspace is built."
                />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute requiredPermissions={['read:system.settings']}>
                <SettingsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings/access-control"
            element={
              <ProtectedRoute
                requireAdmin
                requiredPermissions={['manage:access']}
                deniedMessage="Only admin users with access control permission can open Access Control."
              >
                <AccessControlPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings/members"
            element={
              <ProtectedRoute
                requireAdmin
                requiredPermissions={['read:users']}
                deniedMessage="Only admin users with member management access can open Member Management."
              >
                <MemberManagementPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings/tenant-profile"
            element={
              <ProtectedRoute
                requireAdmin
                requiredPermissions={['read:system.tenant-profile']}
                deniedMessage="Only admin users with tenant profile access can open Tenant Profile."
              >
                <TenantProfilePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings/my-keys"
            element={
              <ProtectedRoute
                requireAdmin
                requiredPermissions={['read:system.my-keys']}
                deniedMessage="Only admin users with My Keys access can open My Keys."
              >
                <MyKeysPage />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate type="navigate" to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;

