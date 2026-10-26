import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import DashboardLayout from './layouts/DashboardLayout';

// Lazy loading all pages for Code-Splitting
const LoginPage = React.lazy(() => import('./pages/LoginPage'));
const DashboardOverview = React.lazy(() => import('./pages/DashboardOverview'));
const POSPage = React.lazy(() => import('./pages/POSPage'));
const ItemsPage = React.lazy(() => import('./pages/ItemsPage'));
const CustomersPage = React.lazy(() => import('./pages/CustomersPage'));
const OrdersHistoryPage = React.lazy(() => import('./pages/OrdersHistoryPage'));
const UsersPage = React.lazy(() => import('./pages/UsersPage'));
const SettingsPage = React.lazy(() => import('./pages/SettingsPage'));
const ExpensesPage = React.lazy(() => import('./pages/ExpensesPage'));
const ExchangeRatesHistoryPage = React.lazy(() => import('./pages/ExchangeRatesHistoryPage'));
const DataSheetsPage = React.lazy(() => import('./pages/DataSheetsPage'));

// A sleek inline loader to prevent jarring white screens during lazy loading
const PageLoader = () => (
  <div className="flex h-screen w-full items-center justify-center bg-background/50">
    <div className="flex flex-col items-center gap-3">
      <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
    </div>
  </div>
);

function App() {
  const isAuthenticated = !!localStorage.getItem('newpower_token');

  return (
    <div dir="rtl" className="rtl">
      <Router>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            
            <Route 
              path="/dashboard/*" 
              element={
                isAuthenticated ? (
                  <DashboardLayout>
                    <Suspense fallback={<PageLoader />}>
                      <Routes>
                        <Route path="/" element={<DashboardOverview />} />
                        <Route path="/sales" element={<POSPage />} />
                        <Route path="/items" element={<ItemsPage />} />
                        <Route path="/datasheets" element={<DataSheetsPage />} />
                        <Route path="/customers" element={<CustomersPage />} />
                        
                        <Route path="/orders" element={<OrdersHistoryPage />} />
                        <Route path="/users" element={<UsersPage />} />
                        <Route path="/expenses" element={<ExpensesPage />} />
                        <Route path="/exchange-rates" element={<ExchangeRatesHistoryPage />} />

                        <Route path="/settings" element={<SettingsPage />} />
                      </Routes>
                    </Suspense>
                  </DashboardLayout>
                ) : (
                  <Navigate to="/login" />
                )
              }
            />

            <Route path="/" element={<Navigate to="/dashboard" />} />
          </Routes>
        </Suspense>
      </Router>
    </div>
  );
}

export default App;
