import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import axios from 'axios';
import logger from '../utils/logger';
import { FiFileText, FiCalendar, FiXCircle, FiEye, FiPlus, FiSearch, FiFilter, FiX } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';

const MyReimbursements = ({ user }) => {
  const [reimbursements, setReimbursements] = useState([]);
  const [allReimbursements, setAllReimbursements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReimbursement, setSelectedReimbursement] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [dateRangeStart, setDateRangeStart] = useState('');
  const [dateRangeEnd, setDateRangeEnd] = useState('');
  const filterDropdownRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(event.target)) {
        setShowAdvancedFilters(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    fetchReimbursements();
  }, []);

  useEffect(() => {
    filterReimbursements();
  }, [statusFilter, searchQuery, dateRangeStart, dateRangeEnd, allReimbursements]);

  const fetchReimbursements = async () => {
    try {
      setLoading(true);
      const apiUrl = process.env.REACT_APP_API_URL;
      const response = await axios.get(`${apiUrl}/reimbursements`, {
        withCredentials: true
      });
      
      if (response.data.success) {
        setAllReimbursements(response.data.data || []);
      }
    } catch (error) {
      logger.error('Error fetching reimbursements:', error);
      setAllReimbursements([]);
    } finally {
      setLoading(false);
    }
  };

  const filterReimbursements = () => {
    let filtered = [...allReimbursements];

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(r => r.status === statusFilter);
    }

    // Date range filter
    if (dateRangeStart) {
      filtered = filtered.filter(r => {
        const itemDate = new Date(r.request_date || r.created_at);
        return itemDate >= new Date(dateRangeStart);
      });
    }
    if (dateRangeEnd) {
      filtered = filtered.filter(r => {
        const itemDate = new Date(r.request_date || r.created_at);
        const endDate = new Date(dateRangeEnd);
        endDate.setHours(23, 59, 59, 999);
        return itemDate <= endDate;
      });
    }

    // Search filter (searches across all text fields)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(r => {
        const searchableText = [
          r.id,
          r.status,
          r.department_name,
          r.cost_center_name,
          r.project_name,
          r.description,
          formatCurrency(r.total_amount),
          formatDate(r.request_date || r.created_at)
        ].join(' ').toLowerCase();
        return searchableText.includes(query);
      });
    }

    setReimbursements(filtered);
  };

  const clearFilters = () => {
    setStatusFilter('all');
    setSearchQuery('');
    setDateRangeStart('');
    setDateRangeEnd('');
    setShowAdvancedFilters(false);
  };

  const getStatusBadge = (status) => {
    const getStatusColor = (status) => {
      switch (status?.toLowerCase()) {
        case 'draft':
          return 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 border border-gray-300';
        case 'submitted':
          return 'bg-gradient-to-r from-blue-100 to-cyan-100 text-blue-700 border border-blue-200';
        case 'pending approval':
        case 'pending':
          return 'bg-gradient-to-r from-amber-100 to-yellow-100 text-amber-700 border border-amber-200';
        case 'partially approved':
          return 'bg-gradient-to-r from-purple-100 to-pink-100 text-purple-700 border border-purple-200';
        case 'fully approved':
        case 'approved':
          return 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 border border-green-200';
        case 'paid':
          return 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 border border-green-200';
        case 'rejected':
          return 'bg-gradient-to-r from-red-100 to-rose-100 text-red-700 border border-red-200';
        default:
          return 'bg-gradient-to-r from-indigo-100 to-purple-100 text-indigo-700 border border-indigo-200';
      }
    };

    const statusLabels = {
      draft: 'Draft',
      submitted: 'Submitted',
      'pending approval': 'Pending Approval',
      'partially approved': 'Partially Approved',
      'fully approved': 'Fully Approved',
      approved: 'Approved',
      paid: 'Paid',
      rejected: 'Rejected'
    };
    
    const label = statusLabels[status?.toLowerCase()] || status || 'Unknown';
    
    return (
      <span className={`px-1.5 py-0.5 text-[9px] font-medium rounded ${getStatusColor(status)}`}>
        {label}
      </span>
    );
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

  const getTotalApprovedAmount = (reimbursement) => {
    if (!reimbursement.items || reimbursement.items.length === 0) return 0;
    return reimbursement.items
      .filter(item => item.status && item.status.toLowerCase().includes('approved'))
      .reduce((sum, item) => sum + Number.parseFloat(item.amount || 0), 0);
  };

  const getTotalPendingAmount = (reimbursement) => {
    if (!reimbursement.items || reimbursement.items.length === 0) return 0;
    return reimbursement.items
      .filter(item => !item.status || !item.status.toLowerCase().includes('approved') && !item.status.toLowerCase().includes('rejected'))
      .reduce((sum, item) => sum + Number.parseFloat(item.amount || 0), 0);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-[10px] text-gray-500 animate-pulse">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4 min-h-[64px]">
      <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-slate-200 p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-sm font-bold text-slate-800">My Reimbursements</h1>
            <p className="text-xs text-slate-600 mt-1">View and manage your reimbursement requests</p>
          </div>
          <button
            onClick={() => navigate('/create-reimbursement')}
            className="flex items-center space-x-1 px-3 py-1.5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-xs font-semibold rounded-lg hover:from-blue-600 hover:to-indigo-700 shadow-md transition-all"
          >
            <FiPlus className="w-3 h-3" />
            <span>Create New</span>
          </button>
        </div>
      </div>

      <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-slate-200 shadow-sm p-4">
        {/* Search Bar with Advanced Filter Icon */}
        <div className="mb-3">
          <div className="flex items-center space-x-2">
            <div className="flex-1 relative flex items-center">
              <FiSearch className="absolute left-2 w-3 h-3 text-gray-400" />
              <input
                type="text"
                placeholder="Search by ID, status, department, amount, date..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-[9px] border border-gray-300 rounded-lg text-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 text-gray-400 hover:text-gray-600"
                >
                  <FiX className="w-3 h-3" />
                </button>
              )}
            </div>
            <div className="relative" ref={filterDropdownRef}>
              <button
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className={`flex items-center space-x-1 px-3 py-1.5 text-[9px] font-medium rounded-lg border transition-colors ${
                  (statusFilter !== 'all' || dateRangeStart || dateRangeEnd)
                    ? 'bg-blue-50 border-blue-300 text-blue-700'
                    : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
                }`}
              >
                <FiFilter className="w-3 h-3" />
                <span>Filters</span>
                {(statusFilter !== 'all' || dateRangeStart || dateRangeEnd) && (
                  <span className="bg-blue-600 text-white rounded-full w-4 h-4 flex items-center justify-center text-[8px]">
                    {(statusFilter !== 'all' ? 1 : 0) + (dateRangeStart ? 1 : 0) + (dateRangeEnd ? 1 : 0)}
                  </span>
                )}
              </button>
              
              {showAdvancedFilters && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-50 p-3">
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[9px] font-medium text-gray-600 mb-2">Status</label>
                      <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="w-full text-[9px] border border-gray-300 rounded px-2 py-1 text-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white"
                      >
                        <option value="all">All Status</option>
                        <option value="draft">Draft</option>
                        <option value="submitted">Submitted</option>
                        <option value="pending approval">Pending Approval</option>
                        <option value="partially approved">Partially Approved</option>
                        <option value="fully approved">Fully Approved</option>
                        <option value="paid">Paid</option>
                        <option value="rejected">Rejected</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-[9px] font-medium text-gray-600 mb-2">Date Range</label>
                      <div className="space-y-2">
                        <input
                          type="date"
                          value={dateRangeStart}
                          onChange={(e) => setDateRangeStart(e.target.value)}
                          className="w-full text-[9px] border border-gray-300 rounded px-2 py-1 text-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white"
                          placeholder="Start Date"
                        />
                        <input
                          type="date"
                          value={dateRangeEnd}
                          onChange={(e) => setDateRangeEnd(e.target.value)}
                          className="w-full text-[9px] border border-gray-300 rounded px-2 py-1 text-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white"
                          placeholder="End Date"
                        />
                      </div>
                    </div>
                    
                    {(statusFilter !== 'all' || dateRangeStart || dateRangeEnd) && (
                      <button
                        onClick={clearFilters}
                        className="w-full text-[9px] text-red-600 hover:text-red-700 font-medium flex items-center justify-center space-x-1 pt-2 border-t border-gray-200"
                      >
                        <FiX className="w-3 h-3" />
                        <span>Clear Filters</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {reimbursements.length === 0 ? (
          <div className="text-center py-8">
            <FiFileText className="w-12 h-12 text-gray-300 mx-auto mb-2" />
            <p className="text-[10px] text-gray-500">No reimbursements found</p>
            <button
              onClick={() => navigate('/create-reimbursement')}
              className="mt-3 px-3 py-1 bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-[9px] font-medium rounded hover:from-blue-600 hover:to-indigo-700 transition-colors"
            >
              Create Your First Reimbursement
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-1.5 px-2 text-[9px] font-medium text-gray-500 uppercase tracking-wide">Request ID</th>
                  <th className="text-left py-1.5 px-2 text-[9px] font-medium text-gray-500 uppercase tracking-wide">Date</th>
                  <th className="text-left py-1.5 px-2 text-[9px] font-medium text-gray-500 uppercase tracking-wide">Department</th>
                  <th className="text-left py-1.5 px-2 text-[9px] font-medium text-gray-500 uppercase tracking-wide">Total Amount</th>
                  <th className="text-left py-1.5 px-2 text-[9px] font-medium text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="text-left py-1.5 px-2 text-[9px] font-medium text-gray-500 uppercase tracking-wide">Items</th>
                  <th className="text-left py-1.5 px-2 text-[9px] font-medium text-gray-500 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody>
                {reimbursements.map((reimbursement) => {
                  const approvedAmount = getTotalApprovedAmount(reimbursement);
                  const pendingAmount = getTotalPendingAmount(reimbursement);
                  
                  return (
                    <tr 
                      key={reimbursement.id} 
                      className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                    >
                      <td className="py-1.5 px-2 whitespace-nowrap">
                        <div className="text-[10px] text-gray-900 font-medium">
                          REQ-{reimbursement.id.substring(0, 8).toUpperCase()}
                        </div>
                      </td>
                      <td className="py-1.5 px-2 whitespace-nowrap">
                        <div className="text-[10px] text-gray-600">
                          {formatDate(reimbursement.request_date || reimbursement.created_at)}
                        </div>
                      </td>
                      <td className="py-1.5 px-2 whitespace-nowrap">
                        <div className="text-[10px] text-gray-600">
                          {reimbursement.department_name || 'N/A'}
                        </div>
                      </td>
                      <td className="py-1.5 px-2 whitespace-nowrap">
                        <div className="text-[10px] text-gray-900 font-medium">
                          {formatCurrency(reimbursement.total_amount)}
                        </div>
                        {approvedAmount > 0 && (
                          <div className="text-[9px] text-green-600">
                            Approved: {formatCurrency(approvedAmount)}
                          </div>
                        )}
                        {pendingAmount > 0 && (
                          <div className="text-[9px] text-amber-600">
                            Pending: {formatCurrency(pendingAmount)}
                          </div>
                        )}
                      </td>
                      <td className="py-1.5 px-2 whitespace-nowrap">
                        {getStatusBadge(reimbursement.status)}
                      </td>
                      <td className="py-1.5 px-2 whitespace-nowrap">
                        <div className="text-[10px] text-gray-600">
                          {reimbursement.items?.length || 0} item(s)
                        </div>
                      </td>
                      <td className="py-1.5 px-2">
                        <button
                          onClick={() => setSelectedReimbursement(reimbursement)}
                          className="px-1.5 py-1 bg-gray-50 text-gray-700 text-[9px] font-medium rounded border border-gray-200 hover:bg-gray-100 hover:border-gray-300 transition-colors"
                        >
                          <FiEye className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedReimbursement && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-800">
                Reimbursement Details - REQ-{selectedReimbursement.id.substring(0, 8).toUpperCase()}
              </h2>
              <button
                onClick={() => setSelectedReimbursement(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                <FiXCircle className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-gray-600">Status</label>
                  <div className="mt-1">{getStatusBadge(selectedReimbursement.status)}</div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600">Total Amount</label>
                  <div className="mt-1 text-xs font-semibold text-gray-800">
                    {formatCurrency(selectedReimbursement.total_amount)}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600">Department</label>
                  <div className="mt-1 text-xs text-gray-600">
                    {selectedReimbursement.department_name || 'N/A'}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600">Cost Center</label>
                  <div className="mt-1 text-xs text-gray-600">
                    {selectedReimbursement.cost_center_name || 'N/A'}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600">Project</label>
                  <div className="mt-1 text-xs text-gray-600">
                    {selectedReimbursement.project_name || 'N/A'}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600">Request Date</label>
                  <div className="mt-1 text-xs text-gray-600">
                    {formatDate(selectedReimbursement.request_date || selectedReimbursement.created_at)}
                  </div>
                </div>
              </div>

              {selectedReimbursement.description && (
                <div>
                  <label className="text-xs font-semibold text-gray-600">Description</label>
                  <div className="mt-1 text-xs text-gray-600">
                    {selectedReimbursement.description}
                  </div>
                </div>
              )}

              <div>
                <label className="text-xs font-semibold text-gray-600 mb-2 block">Line Items</label>
                <div className="space-y-2">
                  {selectedReimbursement.items?.map((item, index) => (
                    <div key={item.id || index} className="border border-gray-200 rounded p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-gray-800">
                          Item {index + 1}: {item.expense_type}
                        </span>
                        <span className="text-xs font-semibold text-gray-800">
                          {formatCurrency(item.amount)}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                        <div>
                          <span className="font-semibold">Category:</span> {item.expense_category_name || 'N/A'}
                        </div>
                        <div>
                          <span className="font-semibold">Date:</span> {formatDate(item.expense_date)}
                        </div>
                        {item.meal_type && (
                          <div>
                            <span className="font-semibold">Meal Type:</span> {item.meal_type}
                          </div>
                        )}
                        {item.people_count && (
                          <div>
                            <span className="font-semibold">People:</span> {item.people_count}
                          </div>
                        )}
                        {item.travel_purpose && (
                          <div>
                            <span className="font-semibold">Purpose:</span> {item.travel_purpose}
                          </div>
                        )}
                        {item.lodging_city && (
                          <div>
                            <span className="font-semibold">City:</span> {item.lodging_city}
                          </div>
                        )}
                        {item.status && (
                          <div className="col-span-2">
                            <span className="font-semibold">Status:</span> {getStatusBadge(item.status)}
                          </div>
                        )}
                      </div>
                      {item.description && (
                        <div className="mt-2 text-xs text-gray-600">
                          <span className="font-semibold">Remarks:</span> {item.description}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {selectedReimbursement.attachments && selectedReimbursement.attachments.length > 0 && (
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-2 block">Attachments</label>
                  <div className="space-y-1">
                    {selectedReimbursement.attachments.map((attachment) => (
                      <a
                        key={attachment.id}
                        href={`${process.env.REACT_APP_API_URL?.replace('/api', '')}${attachment.file_path}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center space-x-2 text-xs text-blue-600 hover:text-blue-800"
                      >
                        <FiFileText className="w-3 h-3" />
                        <span>{attachment.file_name}</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


MyReimbursements.propTypes = {
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

export default MyReimbursements;

