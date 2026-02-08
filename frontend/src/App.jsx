import React, { useState, useEffect } from 'react';
import { PublicClientApplication } from '@azure/msal-browser';
import { MsalProvider, useMsal, useIsAuthenticated } from '@azure/msal-react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { msalConfig, loginRequest } from './authConfig';
import axios from 'axios';
import logger from './utils/logger';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import UserManagement from './pages/UserManagement';
import PlaceholderPage from './pages/PlaceholderPage';
import CreateReimbursement from './pages/CreateReimbursement';
import MyReimbursements from './pages/MyReimbursements';
import FinanceApprovals from './pages/FinanceApprovals';
import ManagerApprovals from './pages/ManagerApprovals';
import HRApprovals from './pages/HRApprovals';
import SuperadminApprovals from './pages/SuperadminApprovals';
import ManageDepartments from './pages/ManageDepartments';
import ManageCostCenters from './pages/ManageCostCenters';
import ManageProjects from './pages/ManageProjects';
import TestLogin from './pages/TestLogin';
import { FiLogIn } from 'react-icons/fi';

const msalInstance = new PublicClientApplication(msalConfig);

function AppContent() {
  const { instance, accounts } = useMsal();
  const isAuthenticated = useIsAuthenticated();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const checkAuth = async () => {
      await fetchUserFromBackend();
    };
    checkAuth();
  }, [isAuthenticated, accounts]);

  const fetchUserFromBackend = async () => {
    try {
      const apiUrl = process.env.REACT_APP_API_URL;
      const response = await axios.get(`${apiUrl}/auth/user`, {
        withCredentials: true
      });

      if (response.data.success) {
        setUser(response.data.user);
        return true;
      }
    } catch (error) {
      if (error.response?.status === 401) {
        setUser(null);
      }
    } finally {
      setLoading(false);
    }
    return false;
  };

  const handleLogin = async () => {
    try {
      const response = await instance.loginPopup(loginRequest);
      const idToken = response.idToken;

      if (!idToken) {
        logger.error('No ID token received from Azure');
        return;
      }

      try {
        const apiUrl = process.env.REACT_APP_API_URL;
        const backendResponse = await axios.post(
          `${apiUrl}/auth/validate-token`,
          { idToken },
          { withCredentials: true }
        );

        if (backendResponse.data.success) {
          setUser(backendResponse.data.user);
          navigate('/dashboard');
        }
      } catch (backendError) {
        logger.error('Backend validation error:', backendError);
        await fetchUserFromBackend();
      }
    } catch (error) {
      if (error.errorCode !== 'user_cancelled') {
        logger.error('Login error:', error);
      }
    }
  };

  const handleLogout = async () => {
    // 1. Clear backend session
    try {
      const apiUrl = process.env.REACT_APP_API_URL;
      await axios.get(`${apiUrl}/auth/logout`, {
        withCredentials: true
      });
    } catch (error) {
      logger.error('Backend logout error:', error);
      // Continue to local cleanup even if backend fails
    }

    // 2. Clear MSAL session if exists
    try {
      const activeAccount = instance.getActiveAccount();
      const accounts = instance.getAllAccounts();

      if (activeAccount || accounts.length > 0) {
        await instance.logoutPopup();
      }
    } catch (error) {
      // Ignore "interaction_in_progress" or other MSAL errors during logout
      // We still want to clear local state
      logger.error('MSAL logout error:', error);
    }

    // 3. Clear local state and redirect
    setUser(null);
    navigate('/');
  };

  const handleNavigation = (path) => {
    navigate(path);
  };

  const getCurrentPage = () => {
    const path = location.pathname;
    const pageMap = {
      '/dashboard': 'dashboard',
      '/users': 'users',
      '/departments': 'departments',
      '/cost-centers': 'cost-centers',
      '/projects': 'projects',
      '/my-reimbursements': 'my-reimbursements',
      '/create-reimbursement': 'create-reimbursement',
      '/manager-approvals': 'manager-approvals',
      '/hr-approvals': 'hr-approvals',
      '/finance-approvals': 'finance-approvals',
      '/superadmin-approvals': 'superadmin-approvals',
      '/all-reimbursements': 'all-reimbursements'
    };
    return pageMap[path] || 'dashboard';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-sm text-gray-600 animate-pulse font-semibold">Loading...</div>
      </div>
    );
  }

  if (!user) {
    if (location.pathname === '/test-login') {
      return <TestLogin />;
    }

    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 border border-gray-200">
          <div className="text-center mb-4">
            <div className="inline-block p-3 bg-blue-600 rounded-full mb-3">
              <FiLogIn className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 mb-1">
              Azure SSO Login
            </h2>
            <p className="text-sm text-gray-600">Please login with your Azure account to continue</p>
          </div>
          <button
            onClick={handleLogin}
            className="w-full px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-semibold shadow-md hover:shadow-lg flex items-center justify-center space-x-2 mb-3"
          >
            <FiLogIn className="w-4 h-4" />
            <span>Login with Azure</span>
          </button>
          <button
            onClick={() => navigate('/test-login')}
            className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm font-semibold"
          >
            Test Login (Development Only)
          </button>
        </div>
      </div>
    );
  }

  return (
    <Layout
      user={user}
      onLogout={handleLogout}
      onNavigate={handleNavigation}
      currentPage={getCurrentPage()}
    >
      <Routes>
        <Route path="/dashboard" element={<Dashboard user={user} />} />
        {user?.role?.name === 'superadmin' && (
          <Route path="/users" element={<UserManagement />} />
        )}
        {(user?.role?.name === 'superadmin' || user?.role?.name === 'hr') && (
          <>
            <Route path="/departments" element={<ManageDepartments />} />
            <Route path="/cost-centers" element={<ManageCostCenters />} />
            <Route path="/projects" element={<ManageProjects />} />
          </>
        )}
        <Route path="/my-reimbursements" element={<MyReimbursements user={user} />} />
        <Route path="/create-reimbursement" element={<CreateReimbursement user={user} />} />
        <Route path="/manager-approvals" element={<ManagerApprovals user={user} />} />
        <Route path="/hr-approvals" element={<HRApprovals user={user} />} />
        <Route path="/finance-approvals" element={<FinanceApprovals user={user} />} />
        {user?.role?.name === 'superadmin' && (
          <Route path="/superadmin-approvals" element={<SuperadminApprovals user={user} />} />
        )}
        <Route path="/all-reimbursements" element={<PlaceholderPage title="All Reimbursements" icon="FiList" />} />
        <Route path="*" element={<Dashboard user={user} />} />
      </Routes>
    </Layout>
  );
}

function App() {
  return (
    <MsalProvider instance={msalInstance}>
      <Router>
        <AppContent />
      </Router>
    </MsalProvider>
  );
}

export default App;
