import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import axios from 'axios';
import logger from '../utils/logger';
import { FiCheckCircle } from 'react-icons/fi';
import { formatDate, formatCurrency } from '../utils/formatUtils';
import ApprovalTable from '../components/shared/ApprovalTable';
import ApprovalItemModal from '../components/shared/ApprovalItemModal';
import { getStatusColor, getStatusLabel } from '../utils/statusUtils';

const SuperadminApprovals = ({ user }) => {
  const [roleTab, setRoleTab] = useState('manager'); // manager, hr, finance
  const [statusTab, setStatusTab] = useState('pending'); // pending, approved, rejected
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null);

  useEffect(() => {
    fetchItems();
  }, [roleTab, statusTab]);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const apiUrl = process.env.REACT_APP_API_URL;
      const response = await axios.get(`${apiUrl}/approvals/superadmin/${roleTab}/${statusTab}`, {
        withCredentials: true
      });
      
      if (response.data.success) {
        setItems(response.data.data || []);
      }
    } catch (error) {
      logger.error('Error fetching approvals:', error);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    return (
      <span className={`px-1.5 py-0.5 text-[9px] font-medium rounded ${getStatusColor(status, 'general')}`}>
        {getStatusLabel(status)}
      </span>
    );
  };

  const getPendingCount = async (role, status) => {
    try {
      const apiUrl = process.env.REACT_APP_API_URL;
      const response = await axios.get(`${apiUrl}/approvals/superadmin/${role}/${status}`, {
        withCredentials: true
      });
      return response.data.success ? (response.data.data || []).length : 0;
    } catch (error) {
      return 0;
    }
  };

  const [counts, setCounts] = useState({
    manager: { pending: 0, approved: 0, rejected: 0 },
    hr: { pending: 0, approved: 0, rejected: 0 },
    finance: { pending: 0, approved: 0, rejected: 0 }
  });

  useEffect(() => {
    const fetchCounts = async () => {
      const newCounts = {
        manager: {
          pending: await getPendingCount('manager', 'pending'),
          approved: await getPendingCount('manager', 'approved'),
          rejected: await getPendingCount('manager', 'rejected')
        },
        hr: {
          pending: await getPendingCount('hr', 'pending'),
          approved: await getPendingCount('hr', 'approved'),
          rejected: await getPendingCount('hr', 'rejected')
        },
        finance: {
          pending: await getPendingCount('finance', 'pending'),
          approved: await getPendingCount('finance', 'approved'),
          rejected: await getPendingCount('finance', 'rejected')
        }
      };
      setCounts(newCounts);
    };
    fetchCounts();
  }, [roleTab, statusTab]);

  if (loading && items.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-xs text-gray-600 animate-pulse">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4 min-h-[64px]">
      <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-slate-200 p-4 shadow-sm">
        <h1 className="text-sm font-bold text-slate-800">Superadmin Approvals</h1>
        <p className="text-xs text-slate-600 mt-1">View all approvals across Manager, HR, and Finance</p>
      </div>

      {/* Role Tabs */}
      <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-slate-200 shadow-sm">
        <div className="border-b border-gray-200">
          <div className="flex">
            <button
              onClick={() => {
                setRoleTab('manager');
                setStatusTab('pending');
              }}
              className={`flex-1 px-4 py-2 text-xs font-semibold ${
                roleTab === 'manager'
                  ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Manager
            </button>
            <button
              onClick={() => {
                setRoleTab('hr');
                setStatusTab('pending');
              }}
              className={`flex-1 px-4 py-2 text-xs font-semibold ${
                roleTab === 'hr'
                  ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              HR
            </button>
            <button
              onClick={() => {
                setRoleTab('finance');
                setStatusTab('pending');
              }}
              className={`flex-1 px-4 py-2 text-xs font-semibold ${
                roleTab === 'finance'
                  ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Finance
            </button>
          </div>
        </div>

        {/* Status Tabs */}
        <div className="border-b border-gray-200 bg-gradient-to-r from-slate-50 to-blue-50">
          <div className="flex">
            <button
              onClick={() => setStatusTab('pending')}
              className={`flex-1 px-4 py-2 text-xs font-semibold ${
                statusTab === 'pending'
                  ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Pending ({counts[roleTab]?.pending || 0})
            </button>
            <button
              onClick={() => setStatusTab('approved')}
              className={`flex-1 px-4 py-2 text-xs font-semibold ${
                statusTab === 'approved'
                  ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Approved ({counts[roleTab]?.approved || 0})
            </button>
            <button
              onClick={() => setStatusTab('rejected')}
              className={`flex-1 px-4 py-2 text-xs font-semibold ${
                statusTab === 'rejected'
                  ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Rejected ({counts[roleTab]?.rejected || 0})
            </button>
          </div>
        </div>

        {/* Items Table */}
        <ApprovalTable
          displayItems={items}
          activeTab={statusTab}
          onView={(item) => setSelectedItem(item)}
          type="general"
          emptyMessagePending={`No ${statusTab} items for ${roleTab}`}
          emptyMessageApproved={`No ${statusTab} items for ${roleTab}`}
        />
      </div>

      {/* Item Detail Modal */}
      {selectedItem && (
        <ApprovalItemModal
          selectedItem={selectedItem}
          onClose={() => setSelectedItem(null)}
          formatStatusBadge={(status) => getStatusBadge(status)}
        />
      )}
    </div>
  );
};


SuperadminApprovals.propTypes = {
  user: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    displayName: PropTypes.string,
    email: PropTypes.string,
    role: PropTypes.shape({
      name: PropTypes.string,
      displayName: PropTypes.string
    })
  }),
};

export default SuperadminApprovals;

