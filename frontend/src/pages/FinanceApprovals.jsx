import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import axios from 'axios';
import logger from '../utils/logger';
import { FiCheckCircle, FiXCircle, FiFileText, FiEye, FiX, FiSearch, FiFilter } from 'react-icons/fi';

const FinanceApprovals = ({ user }) => {
  const [pendingItems, setPendingItems] = useState([]);
  const [approvedItems, setApprovedItems] = useState([]);
  const [allPendingItems, setAllPendingItems] = useState([]);
  const [allApprovedItems, setAllApprovedItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null);
  const [actionType, setActionType] = useState(null);
  const [comments, setComments] = useState('');
  const [paidAmount, setPaidAmount] = useState('');
  const [tdsAmount, setTdsAmount] = useState('');
  const [finalAmount, setFinalAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Bank Transfer');
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [activeTab, setActiveTab] = useState('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateRangeStart, setDateRangeStart] = useState('');
  const [dateRangeEnd, setDateRangeEnd] = useState('');

  useEffect(() => {
    fetchPendingItems();
    fetchApprovedItems();
  }, []);

  useEffect(() => {
    if (activeTab === 'pending') {
      fetchPendingItems();
    } else {
      fetchApprovedItems();
    }
  }, [activeTab]);

  useEffect(() => {
    filterItems();
  }, [searchQuery, statusFilter, dateRangeStart, dateRangeEnd, activeTab, allPendingItems, allApprovedItems]);

  const fetchPendingItems = async () => {
    try {
      const apiUrl = process.env.REACT_APP_API_URL;
      const response = await axios.get(`${apiUrl}/approvals/finance/pending`, {
        withCredentials: true
      });
      
      if (response.data.success) {
        setAllPendingItems(response.data.data || []);
      }
    } catch (error) {
      logger.error('Error fetching pending approvals:', error);
      setAllPendingItems([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchApprovedItems = async () => {
    try {
      const apiUrl = process.env.REACT_APP_API_URL;
      const response = await axios.get(`${apiUrl}/approvals/finance/approved`, {
        withCredentials: true
      });
      
      if (response.data.success) {
        setAllApprovedItems(response.data.data || []);
      }
    } catch (error) {
      logger.error('Error fetching approved items:', error);
      setAllApprovedItems([]);
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

  const filterItems = () => {
    const sourceItems = activeTab === 'pending' ? allPendingItems : allApprovedItems;
    let filtered = [...sourceItems];

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(item => {
        const status = item.item_status?.toLowerCase() || '';
        return status.includes(statusFilter.toLowerCase());
      });
    }

    // Date range filter
    if (dateRangeStart) {
      filtered = filtered.filter(item => {
        const itemDate = new Date(item.expense_date || item.created_at);
        return itemDate >= new Date(dateRangeStart);
      });
    }
    if (dateRangeEnd) {
      filtered = filtered.filter(item => {
        const itemDate = new Date(item.expense_date || item.created_at);
        const endDate = new Date(dateRangeEnd);
        endDate.setHours(23, 59, 59, 999);
        return itemDate <= endDate;
      });
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(item => {
        const searchableText = [
          item.user_name,
          item.user_email,
          item.expense_type,
          item.expense_category_name,
          item.department_name,
          item.cost_center_name,
          item.project_name,
          item.item_status,
          formatCurrency(item.amount || 0),
          formatDate(item.expense_date)
        ].join(' ').toLowerCase();
        return searchableText.includes(query);
      });
    }

    if (activeTab === 'pending') {
      setPendingItems(filtered);
    } else {
      setApprovedItems(filtered);
    }
  };

  const clearFilters = () => {
    setStatusFilter('all');
    setSearchQuery('');
    setDateRangeStart('');
    setDateRangeEnd('');
    setShowAdvancedFilters(false);
  };

  const handleApprove = async (itemId) => {
    try {
      const apiUrl = process.env.REACT_APP_API_URL;
      const response = await axios.post(
        `${apiUrl}/approvals/finance/approve`,
        { itemId, comments: comments.trim() || null },
        { withCredentials: true }
      );
      
      if (response.data.success) {
        await fetchPendingItems();
        await fetchApprovedItems();
        setSelectedItem(null);
        setActionType(null);
        setComments('');
        alert('Item approved successfully');
      }
    } catch (error) {
      logger.error('Error approving item:', error);
      alert(error.response?.data?.message || 'Failed to approve item');
    }
  };

  const handleReject = async (itemId) => {
    if (!comments.trim()) {
      alert('Please provide a reason for rejection');
      return;
    }

    try {
      const apiUrl = process.env.REACT_APP_API_URL;
      const response = await axios.post(
        `${apiUrl}/approvals/finance/reject`,
        { itemId, comments: comments.trim() },
        { withCredentials: true }
      );
      
      if (response.data.success) {
        await fetchPendingItems();
        await fetchApprovedItems();
        setSelectedItem(null);
        setActionType(null);
        setComments('');
        alert('Item rejected successfully');
      }
    } catch (error) {
      logger.error('Error rejecting item:', error);
      alert(error.response?.data?.message || 'Failed to reject item');
    }
  };

  const calculateFinalAmount = (paid, tds) => {
    const paidVal = Number.parseFloat(paid || 0);
    const tdsVal = Number.parseFloat(tds || 0);
    return (paidVal - tdsVal).toFixed(2);
  };

  const handlePaidAmountChange = (value) => {
    setPaidAmount(value);
    const calculatedFinal = calculateFinalAmount(value, tdsAmount);
    setFinalAmount(calculatedFinal);
  };

  const handleTdsChange = (value) => {
    setTdsAmount(value);
    const calculatedFinal = calculateFinalAmount(paidAmount, value);
    setFinalAmount(calculatedFinal);
  };

  const handleMarkPaid = async (itemId, currentAmount) => {
    if (!itemId) {
      alert('Item ID is missing. Please try again.');
      logger.error('Item ID is missing:', itemId);
      return;
    }
    
    const paid = Number.parseFloat(paidAmount || currentAmount || 0);
    const tds = Number.parseFloat(tdsAmount || 0);
    const final = Number.parseFloat(finalAmount || calculateFinalAmount(paidAmount, tdsAmount));
    
    if (paid <= 0) {
      alert('Paid amount must be greater than 0');
      return;
    }

    const expectedFinal = paid - tds;
    if (Math.abs(final - expectedFinal) > 0.01) {
      alert(`Final Amount validation failed. Expected: $${expectedFinal.toFixed(2)} (Paid: $${paid.toFixed(2)} - TDS: $${tds.toFixed(2)}), Provided: $${final.toFixed(2)}`);
      return;
    }
    
    try {
      const apiUrl = process.env.REACT_APP_API_URL;
      const response = await axios.post(
        `${apiUrl}/approvals/finance/mark-paid`,
        { 
          itemId, 
          paidAmount: paid,
          tdsAmount: tds,
          finalAmount: final,
          paymentMethod,
          paymentReference,
          paymentDate
        },
        { withCredentials: true }
      );
      
      if (response.data.success) {
        await fetchApprovedItems();
        await fetchPendingItems();
        setPaidAmount('');
        setTdsAmount('');
        setFinalAmount('');
        setPaymentMethod('Bank Transfer');
        setPaymentReference('');
        setPaymentDate(new Date().toISOString().split('T')[0]);
        setSelectedItem(null);
        setActionType(null);
        alert('Item marked as paid successfully');
      }
    } catch (error) {
      logger.error('Error marking item as paid:', error);
      alert(error.response?.data?.message || 'Failed to mark item as paid');
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      'approved_by_finance': { color: 'bg-gradient-to-r from-indigo-100 to-purple-100 text-indigo-700 border-indigo-200', label: 'Approved by Finance' },
      'paid': { color: 'bg-gradient-to-r from-green-500 to-emerald-500 text-white', label: 'Paid' },
      'rejected_by_finance': { color: 'bg-gradient-to-r from-red-100 to-rose-100 text-red-700 border-red-200', label: 'Rejected by Finance' }
    };
    
    const config = statusConfig[status] || { color: 'bg-gradient-to-r from-indigo-100 to-purple-100 text-indigo-700 border-indigo-200', label: status || 'Unknown' };
    
    return (
      <span className={`px-2 py-1 ${config.color} text-[10px] font-semibold rounded-lg border ${config.color.includes('border') ? '' : 'border-0'} shadow-sm`}>
        {config.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-xs text-gray-600 animate-pulse">Loading...</div>
      </div>
    );
  }

  const displayItems = activeTab === 'pending' ? pendingItems : approvedItems;

  return (
    <div className="space-y-4 min-h-[64px]">
      <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-slate-200 p-4 shadow-sm">
        <h1 className="text-sm font-bold text-slate-800">Finance Approvals</h1>
        <p className="text-xs text-slate-600 mt-1">Review and approve all pending reimbursement items</p>
      </div>

      <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="border-b border-slate-200 bg-gradient-to-r from-blue-50 to-slate-50">
          <div className="flex">
            <button
              onClick={() => setActiveTab('pending')}
              className={`flex-1 px-4 py-3 text-xs font-semibold transition-all ${
                activeTab === 'pending'
                  ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white'
                  : 'text-slate-600 hover:text-slate-800 hover:bg-white/50'
              }`}
            >
              Pending ({pendingItems.length})
            </button>
            <button
              onClick={() => setActiveTab('approved')}
              className={`flex-1 px-4 py-3 text-xs font-semibold transition-all ${
                activeTab === 'approved'
                  ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white'
                  : 'text-slate-600 hover:text-slate-800 hover:bg-white/50'
              }`}
            >
              Approved ({approvedItems.length})
            </button>
          </div>
        </div>

        <div className="p-4 border-b border-gray-200">
          {/* Search Bar */}
          <div className="mb-3">
            <div className="relative">
              <FiSearch className="absolute left-2 top-1/2 transform -translate-y-1/2 w-3 h-3 text-gray-400" />
              <input
                type="text"
                placeholder="Search by employee, expense type, amount, date..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-[9px] border border-gray-300 rounded-lg text-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <FiX className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Advanced Filters */}
          <div>
            <button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className="flex items-center space-x-1 text-[9px] text-blue-600 hover:text-blue-700 font-medium"
            >
              <FiFilter className="w-3 h-3" />
              <span>Advanced Filters</span>
            </button>
            
            {showAdvancedFilters && (
              <div className="mt-2 p-3 bg-gray-50 rounded-lg border border-gray-200 space-y-2">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[9px] font-medium text-gray-600 mb-1">Status</label>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="w-full text-[9px] border border-gray-300 rounded px-2 py-1 text-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white"
                    >
                      <option value="all">All Status</option>
                      <option value="pending">Pending</option>
                      <option value="approved">Approved</option>
                      <option value="paid">Paid</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[9px] font-medium text-gray-600 mb-1">Start Date</label>
                    <input
                      type="date"
                      value={dateRangeStart}
                      onChange={(e) => setDateRangeStart(e.target.value)}
                      className="w-full text-[9px] border border-gray-300 rounded px-2 py-1 text-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-medium text-gray-600 mb-1">End Date</label>
                    <input
                      type="date"
                      value={dateRangeEnd}
                      onChange={(e) => setDateRangeEnd(e.target.value)}
                      className="w-full text-[9px] border border-gray-300 rounded px-2 py-1 text-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white"
                    />
                  </div>
                </div>
                {(statusFilter !== 'all' || dateRangeStart || dateRangeEnd) && (
                  <button
                    onClick={clearFilters}
                    className="text-[9px] text-red-600 hover:text-red-700 font-medium flex items-center space-x-1"
                  >
                    <FiX className="w-3 h-3" />
                    <span>Clear Filters</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {displayItems.length === 0 ? (
          <div className="text-center py-8">
            <FiCheckCircle className="w-12 h-12 text-gray-300 mx-auto mb-2" />
            <p className="text-xs text-gray-600">
              {activeTab === 'pending' ? 'No items pending finance approval' : 'No approved items'}
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
                  <th className="text-left py-1.5 px-2 text-[9px] font-medium text-gray-500 uppercase tracking-wide">Current Status</th>
                  {activeTab === 'approved' && (
                    <th className="text-left py-1.5 px-2 text-[9px] font-medium text-gray-500 uppercase tracking-wide">Finance Status</th>
                  )}
                  <th className="text-left py-1.5 px-2 text-[9px] font-medium text-gray-500 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody>
                {displayItems.map((item) => {
                  const getStatusColor = (status) => {
                    if (status === 'pending') return 'bg-gradient-to-r from-amber-100 to-yellow-100 text-amber-700 border border-amber-200';
                    if (status === 'approved_by_manager' || status === 'approved_by_hr' || status === 'approved_by_finance') return 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 border border-green-200';
                    if (status === 'paid') return 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 border border-green-200';
                    if (status && status.includes('rejected')) return 'bg-gradient-to-r from-red-100 to-rose-100 text-red-700 border border-red-200';
                    return 'bg-gradient-to-r from-indigo-100 to-purple-100 text-indigo-700 border border-indigo-200';
                  };
                  
                  const getStatusLabel = (status) => {
                    if (status === 'pending') return 'Pending';
                    if (status === 'approved_by_manager') return 'Approved by Manager';
                    if (status === 'approved_by_hr') return 'Approved by HR';
                    if (status === 'approved_by_finance') return 'Approved by Finance';
                    if (status === 'paid') return 'Paid';
                    if (status && status.includes('rejected')) return 'Rejected';
                    return status || 'Unknown';
                  };
                  
                  return (
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
                        <span className={`px-1.5 py-0.5 text-[9px] font-medium rounded ${getStatusColor(item.item_status)}`}>
                          {getStatusLabel(item.item_status)}
                        </span>
                        {item.reimbursement_status && (
                          <div className="text-[9px] text-gray-500 mt-0.5">Req: {item.reimbursement_status}</div>
                        )}
                      </td>
                      {activeTab === 'approved' && (
                        <td className="py-1.5 px-2 whitespace-nowrap">
                          <span className={`px-1.5 py-0.5 text-[9px] font-medium rounded ${getStatusColor(item.item_status)}`}>
                            {getStatusLabel(item.item_status)}
                          </span>
                        </td>
                      )}
                      <td className="py-1.5 px-2 whitespace-nowrap">
                        <div className="flex items-center space-x-1">
                          <button
                            onClick={() => setSelectedItem(item)}
                            className="px-1.5 py-1 bg-gray-50 text-gray-700 text-[9px] font-medium rounded border border-gray-200 hover:bg-gray-100 hover:border-gray-300 transition-colors"
                          >
                            <FiEye className="w-3 h-3" />
                          </button>
                        {activeTab === 'pending' && (
                          <>
                            <button
                              onClick={() => {
                                setSelectedItem(item);
                                setActionType('approve');
                              }}
                              className="px-1.5 py-1 bg-gray-50 text-gray-700 text-[9px] font-medium rounded border border-gray-200 hover:bg-gray-100 hover:border-gray-300 transition-colors"
                            >
                              <FiCheckCircle className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => {
                                setSelectedItem(item);
                                setActionType('reject');
                              }}
                              className="px-1.5 py-1 bg-gray-50 text-gray-700 text-[9px] font-medium rounded border border-gray-200 hover:bg-gray-100 hover:border-gray-300 transition-colors"
                            >
                              <FiXCircle className="w-3 h-3" />
                            </button>
                          </>
                        )}
                        {activeTab === 'approved' && item.item_status === 'approved_by_finance' && (
                          <button
                            onClick={() => {
                              setSelectedItem(item);
                              setActionType('mark-paid');
                              const invoiceAmt = item.amount || item.paid_amount || 0;
                              setPaidAmount(invoiceAmt);
                              setTdsAmount('');
                              const calculatedFinal = calculateFinalAmount(invoiceAmt, '');
                              setFinalAmount(calculatedFinal);
                              setPaymentMethod('Bank Transfer');
                              setPaymentReference('');
                              setPaymentDate(new Date().toISOString().split('T')[0]);
                            }}
                            className="px-2 py-1 bg-gray-900 text-white text-[9px] font-medium rounded hover:bg-gray-800 transition-colors"
                          >
                            Mark Paid
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedItem && !actionType && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-800">Item Details</h2>
              <button onClick={() => setSelectedItem(null)} className="text-gray-500 hover:text-gray-700">
                <FiX className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-gray-600">Employee Name</label>
                  <div className="mt-1 text-xs font-medium text-gray-800">{selectedItem.user_name || 'N/A'}</div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600">Employee Email</label>
                  <div className="mt-1 text-xs text-gray-600">{selectedItem.user_email || 'N/A'}</div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600">Amount</label>
                  <div className="mt-1 text-xs font-semibold text-gray-800">
                    {formatCurrency(selectedItem.amount || 0)}
                  </div>
                  {selectedItem.paid_amount && selectedItem.paid_amount !== selectedItem.amount && (
                    <div className="mt-1 text-xs text-green-600">
                      Paid: {formatCurrency(selectedItem.paid_amount)}
                    </div>
                  )}
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600">Expense Type</label>
                  <div className="mt-1 text-xs text-gray-800">{selectedItem.expense_type || 'N/A'}</div>
                  {selectedItem.expense_category_name && (
                    <div className="mt-0.5 text-xs text-gray-500">Category: {selectedItem.expense_category_name}</div>
                  )}
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600">Expense Date</label>
                  <div className="mt-1 text-xs text-gray-800">{formatDate(selectedItem.expense_date)}</div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600">Current Status</label>
                  <div className="mt-1">
                    {selectedItem.item_status === 'pending' && (
                      <span className="px-1.5 py-0.5 bg-yellow-500 text-white text-xs font-semibold rounded-full">Pending</span>
                    )}
                    {selectedItem.item_status === 'approved_by_manager' && (
                      <span className="px-1.5 py-0.5 bg-blue-500 text-white text-xs font-semibold rounded-full">Approved by Manager</span>
                    )}
                    {selectedItem.item_status === 'approved_by_hr' && (
                      <span className="px-1.5 py-0.5 bg-purple-500 text-white text-xs font-semibold rounded-full">Approved by HR</span>
                    )}
                    {selectedItem.item_status === 'approved_by_finance' && (
                      <span className="px-1.5 py-0.5 bg-green-500 text-white text-xs font-semibold rounded-full">Approved by Finance</span>
                    )}
                    {selectedItem.item_status === 'paid' && (
                      <span className="px-1.5 py-0.5 bg-green-600 text-white text-xs font-semibold rounded-full">Paid</span>
                    )}
                    {selectedItem.item_status && selectedItem.item_status.includes('rejected') && (
                      <span className="px-1.5 py-0.5 bg-red-500 text-white text-xs font-semibold rounded-full">Rejected</span>
                    )}
                    {selectedItem.item_status && !['pending', 'approved_by_manager', 'approved_by_hr', 'approved_by_finance', 'paid'].includes(selectedItem.item_status) && !selectedItem.item_status.includes('rejected') && (
                      <span className="px-1.5 py-0.5 bg-gray-500 text-white text-xs font-semibold rounded-full">{selectedItem.item_status}</span>
                    )}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600">Department</label>
                  <div className="mt-1 text-xs text-gray-800 font-medium">{selectedItem.department_name || 'N/A'}</div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600">Cost Center</label>
                  <div className="mt-1 text-xs text-gray-800 font-medium">{selectedItem.cost_center_name || 'N/A'}</div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600">Project</label>
                  <div className="mt-1 text-xs text-gray-800 font-medium">{selectedItem.project_name || 'N/A'}</div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600">Reimbursement Status</label>
                  <div className="mt-1 text-xs text-gray-800 font-medium">{selectedItem.reimbursement_status || 'N/A'}</div>
                </div>
              </div>

              {selectedItem.description && (
                <div>
                  <label className="text-xs font-semibold text-gray-600">Description</label>
                  <div className="mt-1 text-xs text-gray-800">{selectedItem.description}</div>
                </div>
              )}

              {selectedItem.approvals && selectedItem.approvals.length > 0 && (
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-2 block">Approval History</label>
                  <div className="space-y-2">
                    {selectedItem.approvals.map((approval, index) => (
                      <div key={index} className="border border-gray-200 rounded p-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-gray-800">
                            {approval.approval_level.toUpperCase()}
                          </span>
                          <span className={`text-xs px-1.5 py-0.5 rounded ${
                            approval.status === 'approved' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {approval.status}
                          </span>
                        </div>
                        <div className="text-xs text-gray-600 mt-1">
                          By: {approval.approver_name} on {formatDate(approval.created_at)}
                        </div>
                        {approval.comments && (
                          <div className="text-xs text-gray-600 mt-1">
                            Comments: {approval.comments}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedItem.attachments && selectedItem.attachments.length > 0 && (
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-2 block">Attachments</label>
                  <div className="space-y-1">
                    {selectedItem.attachments.map((attachment) => (
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

      {selectedItem && actionType && actionType !== 'mark-paid' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-sm font-semibold text-gray-800">
                {actionType === 'approve' ? 'Approve Item' : 'Reject Item'}
              </h2>
            </div>
            
            <div className="p-4 space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">
                  {actionType === 'reject' ? 'Rejection Reason *' : 'Comments (Optional)'}
                </label>
                <textarea
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  rows={4}
                  className="w-full text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  placeholder={actionType === 'reject' ? 'Please provide a reason for rejection...' : 'Add any comments...'}
                  required={actionType === 'reject'}
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => {
                    if (actionType === 'approve') {
                      handleApprove(selectedItem.item_id || selectedItem.id);
                    } else {
                      handleReject(selectedItem.item_id || selectedItem.id);
                    }
                  }}
                  className={`flex-1 px-3 py-1.5 text-xs font-semibold rounded text-white ${
                    actionType === 'approve'
                      ? 'bg-green-600 hover:bg-green-700'
                      : 'bg-red-600 hover:bg-red-700'
                  } transition-colors`}
                >
                  {actionType === 'approve' ? 'Approve' : 'Reject'}
                </button>
                <button
                  onClick={() => {
                    setActionType(null);
                    setComments('');
                    setSelectedItem(null);
                  }}
                  className="flex-1 px-3 py-1.5 text-xs font-semibold rounded bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedItem && actionType === 'mark-paid' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-lg max-w-lg w-full my-4">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-sm font-semibold text-gray-800">Mark Item as Paid</h2>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">Item Amount</label>
                <input
                  type="text"
                  value={formatCurrency(selectedItem.amount)}
                  className="w-full text-xs border border-gray-300 rounded px-2 py-1 bg-gray-100 cursor-not-allowed"
                  readOnly
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">Paid Amount *</label>
                <input
                  type="number"
                  step="0.01"
                  value={paidAmount}
                  onChange={(e) => handlePaidAmountChange(e.target.value)}
                  className="w-full text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter paid amount"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">TDS Amount</label>
                <input
                  type="number"
                  step="0.01"
                  value={tdsAmount}
                  onChange={(e) => handleTdsChange(e.target.value)}
                  className="w-full text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="0.00"
                  min="0"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">Final Amount *</label>
                <input
                  type="text"
                  value={formatCurrency(finalAmount || calculateFinalAmount(paidAmount, tdsAmount))}
                  className="w-full text-xs border border-gray-300 rounded px-2 py-1 bg-gray-100 cursor-not-allowed"
                  readOnly
                />
                <p className="text-xs text-gray-500 mt-0.5">
                  Formula: Paid Amount - TDS = {formatCurrency(calculateFinalAmount(paidAmount, tdsAmount))}
                </p>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Check">Check</option>
                  <option value="Cash">Cash</option>
                  <option value="Online Payment">Online Payment</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">Payment Reference</label>
                <input
                  type="text"
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  className="w-full text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Transaction ID or Reference Number"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">Payment Date</label>
                <input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="w-full text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              <div className="flex items-center space-x-2 pt-2">
                <button
                  onClick={() => {
                    const paid = Number.parseFloat(paidAmount || selectedItem.amount || 0);
                    const tds = Number.parseFloat(tdsAmount || 0);
                    const final = Number.parseFloat(finalAmount || calculateFinalAmount(paidAmount, tdsAmount));
                    
                    if (paid <= 0) {
                      alert('Paid amount must be greater than 0');
                      return;
                    }

                    const expectedFinal = paid - tds;
                    if (Math.abs(final - expectedFinal) > 0.01) {
                      alert(`Final Amount validation failed. Expected: $${expectedFinal.toFixed(2)} (Paid: $${paid.toFixed(2)} - TDS: $${tds.toFixed(2)}), Provided: $${final.toFixed(2)}`);
                      return;
                    }

                    handleMarkPaid(selectedItem.id || selectedItem.item_id, selectedItem.amount);
                  }}
                  className="flex-1 px-3 py-1.5 text-[10px] font-medium rounded text-white bg-gray-900 hover:bg-gray-800 transition-colors"
                >
                  Confirm Paid
                </button>
                <button
                  onClick={() => {
                    setActionType(null);
                    setPaidAmount('');
                    setTdsAmount('');
                    setFinalAmount('');
                    setPaymentMethod('Bank Transfer');
                    setPaymentReference('');
                    setPaymentDate(new Date().toISOString().split('T')[0]);
                  }}
                  className="flex-1 px-3 py-1.5 text-[10px] font-medium rounded bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


FinanceApprovals.propTypes = {
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

export default FinanceApprovals;

