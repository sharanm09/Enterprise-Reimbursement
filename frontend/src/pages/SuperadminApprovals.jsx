import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import axios from 'axios';
import logger from '../utils/logger';
import { FiCheckCircle, FiFileText, FiEye, FiX } from 'react-icons/fi';

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

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount || 0);
  };

  const getStatusBadge = (status) => {
    const getStatusColor = (status) => {
      if (status === 'pending') return 'bg-gradient-to-r from-amber-100 to-yellow-100 text-amber-700 border border-amber-200';
      if (status === 'approved_by_manager') return 'bg-gradient-to-r from-blue-100 to-cyan-100 text-blue-700 border border-blue-200';
      if (status === 'approved_by_hr') return 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 border border-green-200';
      if (status === 'approved_by_finance') return 'bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-700 border border-blue-200';
      if (status === 'paid') return 'bg-gradient-to-r from-emerald-100 to-teal-100 text-emerald-700 border border-emerald-200';
      if (status && status.includes('rejected')) return 'bg-gradient-to-r from-red-100 to-rose-100 text-red-700 border border-red-200';
      return 'bg-gradient-to-r from-slate-100 to-blue-100 text-slate-700 border border-slate-300';
    };
    
    const getStatusLabel = (status) => {
      if (status === 'pending') return 'Pending';
      if (status === 'approved_by_manager') return 'Approved by Manager';
      if (status === 'rejected_by_manager') return 'Rejected by Manager';
      if (status === 'approved_by_hr') return 'Approved by HR';
      if (status === 'rejected_by_hr') return 'Rejected by HR';
      if (status === 'approved_by_finance') return 'Approved by Finance';
      if (status === 'rejected_by_finance') return 'Rejected by Finance';
      if (status === 'paid') return 'Paid';
      return status || 'Unknown';
    };

    return (
      <span className={`px-1.5 py-0.5 text-[9px] font-medium rounded ${getStatusColor(status)}`}>
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
        {items.length === 0 ? (
          <div className="text-center py-8">
            <FiCheckCircle className="w-12 h-12 text-gray-300 mx-auto mb-2" />
            <p className="text-xs text-gray-600">
              No {statusTab} items for {roleTab}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-1.5 px-2 text-[9px] font-medium text-gray-500 uppercase tracking-wide">Employee</th>
                  <th className="text-left py-1.5 px-2 text-[9px] font-medium text-gray-500 uppercase tracking-wide">Expense Type</th>
                  <th className="text-left py-1.5 px-2 text-[9px] font-medium text-gray-500 uppercase tracking-wide">Amount</th>
                  <th className="text-left py-1.5 px-2 text-[9px] font-medium text-gray-500 uppercase tracking-wide">Date</th>
                  <th className="text-left py-1.5 px-2 text-[9px] font-medium text-gray-500 uppercase tracking-wide">Department</th>
                  <th className="text-left py-1.5 px-2 text-[9px] font-medium text-gray-500 uppercase tracking-wide">Cost Center</th>
                  <th className="text-left py-1.5 px-2 text-[9px] font-medium text-gray-500 uppercase tracking-wide">Project</th>
                  <th className="text-left py-1.5 px-2 text-[9px] font-medium text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="text-left py-1.5 px-2 text-[9px] font-medium text-gray-500 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.item_id || item.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="py-1.5 px-2 whitespace-nowrap">
                      <div className="text-[10px] text-gray-900 font-medium">{item.user_name || 'Unknown'}</div>
                      <div className="text-[9px] text-gray-500">{item.user_email || ''}</div>
                    </td>
                    <td className="py-1.5 px-2 whitespace-nowrap">
                      <div className="text-[10px] text-gray-900 font-medium">{item.expense_type || 'N/A'}</div>
                      {item.expense_category_name && (
                        <div className="text-[9px] text-gray-500">{item.expense_category_name}</div>
                      )}
                    </td>
                    <td className="py-1.5 px-2 whitespace-nowrap">
                      <div className="text-[10px] font-medium text-gray-900">
                        {formatCurrency(item.amount || 0)}
                      </div>
                      {item.paid_amount && item.paid_amount !== item.amount && (
                        <div className="text-[9px] text-gray-600">
                          Paid: {formatCurrency(item.paid_amount)}
                        </div>
                      )}
                    </td>
                    <td className="py-1.5 px-2 whitespace-nowrap">
                      <div className="text-[10px] text-gray-600">{formatDate(item.expense_date)}</div>
                    </td>
                    <td className="py-1.5 px-2 whitespace-nowrap">
                      <div className="text-[10px] text-gray-600">{item.department_name || 'N/A'}</div>
                    </td>
                    <td className="py-1.5 px-2 whitespace-nowrap">
                      <div className="text-[10px] text-gray-600">{item.cost_center_name || 'N/A'}</div>
                    </td>
                    <td className="py-1.5 px-2 whitespace-nowrap">
                      <div className="text-[10px] text-gray-600">{item.project_name || 'N/A'}</div>
                    </td>
                    <td className="py-1.5 px-2 whitespace-nowrap">
                      {getStatusBadge(item.item_status)}
                    </td>
                    <td className="py-1.5 px-2 whitespace-nowrap">
                      <button
                        onClick={() => setSelectedItem(item)}
                        className="px-1.5 py-1 bg-gray-50 text-gray-700 text-[9px] font-medium rounded border border-gray-200 hover:bg-gray-100 hover:border-gray-300 transition-colors"
                      >
                        <FiEye className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Item Detail Modal */}
      {selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full my-4 max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-800">Item Details</h2>
              <button
                onClick={() => setSelectedItem(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                <FiX className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">Employee</label>
                  <div className="text-xs text-gray-800">{selectedItem.user_name || 'N/A'}</div>
                  <div className="text-xs text-gray-500">{selectedItem.user_email || ''}</div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">Status</label>
                  {getStatusBadge(selectedItem.item_status)}
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">Expense Type</label>
                  <div className="text-xs text-gray-800">{selectedItem.expense_type || 'N/A'}</div>
                  {selectedItem.expense_category_name && (
                    <div className="text-xs text-gray-500">{selectedItem.expense_category_name}</div>
                  )}
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">Amount</label>
                  <div className="text-xs font-semibold text-gray-800">
                    {formatCurrency(selectedItem.amount || 0)}
                  </div>
                  {selectedItem.paid_amount && selectedItem.paid_amount !== selectedItem.amount && (
                    <div className="text-xs text-green-600 mt-1">
                      Paid: {formatCurrency(selectedItem.paid_amount)}
                    </div>
                  )}
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">Expense Date</label>
                  <div className="text-xs text-gray-800">{formatDate(selectedItem.expense_date)}</div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">Department</label>
                  <div className="text-xs text-gray-800">{selectedItem.department_name || 'N/A'}</div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">Cost Center</label>
                  <div className="text-xs text-gray-800">{selectedItem.cost_center_name || 'N/A'}</div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">Project</label>
                  <div className="text-xs text-gray-800">{selectedItem.project_name || 'N/A'}</div>
                </div>
              </div>
              {selectedItem.description && (
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">Description</label>
                  <div className="text-xs text-gray-800">{selectedItem.description}</div>
                </div>
              )}
              {selectedItem.approvals && selectedItem.approvals.length > 0 && (
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">Approval History</label>
                  <div className="space-y-2">
                    {selectedItem.approvals.map((approval, idx) => (
                      <div key={idx} className="text-xs bg-gray-50 p-2 rounded">
                        <div className="font-semibold text-gray-800">
                          {approval.approval_level.toUpperCase()}: {approval.status === 'approved' ? 'Approved' : 'Rejected'}
                        </div>
                        <div className="text-gray-600">By: {approval.approver_name || 'Unknown'}</div>
                        <div className="text-gray-500">{formatDate(approval.created_at)}</div>
                        {approval.comments && (
                          <div className="text-gray-700 mt-1">Comments: {approval.comments}</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {selectedItem.attachments && selectedItem.attachments.length > 0 && (
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">Attachments</label>
                  <div className="space-y-1">
                    {selectedItem.attachments.map((attachment, idx) => (
                      <div key={idx} className="text-xs text-blue-600 hover:underline">
                        <FiFileText className="inline w-3 h-3 mr-1" />
                        {attachment.file_name}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setSelectedItem(null)}
                  className="px-3 py-1.5 text-xs font-semibold rounded bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
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

