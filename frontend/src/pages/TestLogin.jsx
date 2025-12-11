import React, { useState, useEffect } from 'react';
import axios from 'axios';
import logger from '../utils/logger';
import { useNavigate } from 'react-router-dom';
import { FiLogIn, FiAlertCircle } from 'react-icons/fi';

const TestLogin = () => {
  const [testUsers, setTestUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchTestUsers();
  }, []);

  const fetchTestUsers = async () => {
    try {
      const apiUrl = process.env.REACT_APP_API_URL;
      const response = await axios.get(`${apiUrl}/auth/test-users`, {
        withCredentials: true
      });
      if (response.data.success) {
        setTestUsers(response.data.users);
      }
    } catch (error) {
      logger.error('Error fetching test users:', error);
      setError('Failed to load test users');
    } finally {
      setLoading(false);
    }
  };

  const handleTestLogin = async (userId) => {
    try {
      setError('');
      const apiUrl = process.env.REACT_APP_API_URL;
      const response = await axios.post(
        `${apiUrl}/auth/test-login`,
        { userId },
        { withCredentials: true }
      );
      
      if (response.data.success) {
        window.location.href = '/dashboard';
      } else {
        setError(response.data.message || 'Login failed');
      }
    } catch (error) {
      logger.error('Error logging in:', error);
      setError(error.response?.data?.message || 'Failed to login as test user');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <div className="text-xs text-gray-600 animate-pulse">Loading test users...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg p-6 max-w-2xl w-full">
        <div className="flex items-center space-x-2 mb-4">
          <FiAlertCircle className="w-5 h-5 text-yellow-500" />
          <h1 className="text-lg font-semibold text-gray-800">Test User Login</h1>
        </div>
        
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-6">
          <p className="text-xs text-yellow-800">
            <strong>⚠️ Development Mode Only:</strong> This page allows you to login as test users without Azure SSO authentication. 
            This feature is only available in development environment.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
            <p className="text-xs text-red-800">{error}</p>
          </div>
        )}

        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Available Test Users:</h2>
          
          {testUsers.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-xs text-gray-500">No test users found. Please create test users first.</p>
            </div>
          ) : (
            testUsers.map((user) => (
              <button
                key={user.id}
                onClick={() => handleTestLogin(user.id)}
                className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-blue-50 border border-gray-200 hover:border-blue-300 rounded-lg transition-all duration-200 group"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-sm group-hover:bg-blue-700 transition-colors">
                    {user.displayName.charAt(0).toUpperCase()}
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-semibold text-gray-800">{user.displayName}</div>
                    <div className="text-xs text-gray-500">{user.email}</div>
                    {user.role && (
                      <div className="mt-1">
                        <span className="px-2 py-0.5 bg-blue-600 text-white text-xs font-semibold rounded-full">
                          {user.role.displayName}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                <FiLogIn className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
              </button>
            ))
          )}
        </div>

        <div className="mt-6 pt-6 border-t border-gray-200">
          <button
            onClick={() => navigate('/')}
            className="w-full px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 text-sm font-semibold rounded-lg transition-colors"
          >
            Back to Azure Login
          </button>
        </div>
      </div>
    </div>
  );
};

export default TestLogin;

