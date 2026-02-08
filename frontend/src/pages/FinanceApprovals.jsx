import React, { useState } from 'react';
import PropTypes from 'prop-types';
import axios from 'axios';
import logger from '../utils/logger';
import { formatCurrency } from '../utils/formatUtils';
import { useApprovalFilters } from '../utils/useApprovalFilters';
import { useApprovalData } from '../utils/useApprovalData';
import { useApprovalActions } from '../utils/useApprovalActions';
import ApprovalFilters from '../components/shared/ApprovalFilters';
import ApprovalTable from '../components/shared/ApprovalTable';
import ApprovalItemModal from '../components/shared/ApprovalItemModal';
import ApprovalActionModal from '../components/shared/ApprovalActionModal';

const APPROVAL_TYPE = 'finance';

const FinanceStatusBadge = ({ status }) => {
  if (status === 'pending') {
    return <span className="px-1.5 py-0.5 bg-yellow-500 text-white text-xs font-semibold rounded-full">Pending</span>;
  }
  if (status === 'approved_by_manager') {
    return <span className="px-1.5 py-0.5 bg-blue-500 text-white text-xs font-semibold rounded-full">Approved by Manager</span>;
  }
  if (status === 'approved_by_hr') {
    return <span className="px-1.5 py-0.5 bg-purple-500 text-white text-xs font-semibold rounded-full">Approved by HR</span>;
  }
  if (status === 'approved_by_finance') {
    return <span className="px-1.5 py-0.5 bg-green-500 text-white text-xs font-semibold rounded-full">Approved by Finance</span>;
  }
  if (status === 'paid') {
    return <span className="px-1.5 py-0.5 bg-green-600 text-white text-xs font-semibold rounded-full">Paid</span>;
  }
  if (status?.includes('rejected')) {
    return <span className="px-1.5 py-0.5 bg-red-500 text-white text-xs font-semibold rounded-full">Rejected</span>;
  }
  if (status && !['pending', 'approved_by_manager', 'approved_by_hr', 'approved_by_finance', 'paid'].includes(status) && !status?.includes('rejected')) {
    return <span className="px-1.5 py-0.5 bg-gray-500 text-white text-xs font-semibold rounded-full">{status}</span>;
  }
  return null;
};

FinanceStatusBadge.propTypes = {
  status: PropTypes.string
};

const FinanceApprovals = ({ user }) => {
  const {
    allPendingItems,
    allApprovedItems,
    loading,
    activeTab,
    setActiveTab,
    fetchPendingItems,
    fetchApprovedItems
  } = useApprovalData(APPROVAL_TYPE);

  const {
    pendingItems,
    approvedItems,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    dateRangeStart,
    setDateRangeStart,
    dateRangeEnd,
    setDateRangeEnd,
    showAdvancedFilters,
    setShowAdvancedFilters,
    clearFilters
  } = useApprovalFilters(allPendingItems, allApprovedItems, activeTab);

  const {
    selectedItem,
    setSelectedItem,
    actionType,
    setActionType,
    comments,
    setComments,
    handleApprove,
    handleReject,
    resetActionState
  } = useApprovalActions(APPROVAL_TYPE, fetchPendingItems, fetchApprovedItems);

  // Finance-specific payment state
  const [paidAmount, setPaidAmount] = useState('');
  const [tdsAmount, setTdsAmount] = useState('');
  const [finalAmount, setFinalAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Bank Transfer');
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);

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

  // Removed unused getStatusBadge function

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

        <ApprovalFilters
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          showAdvancedFilters={showAdvancedFilters}
          setShowAdvancedFilters={setShowAdvancedFilters}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          dateRangeStart={dateRangeStart}
          setDateRangeStart={setDateRangeStart}
          dateRangeEnd={dateRangeEnd}
          setDateRangeEnd={setDateRangeEnd}
          clearFilters={clearFilters}
          statusOptions={['all', 'pending', 'approved', 'paid', 'rejected']}
        />

        <ApprovalTable
          displayItems={displayItems}
          activeTab={activeTab}
          onView={(item) => setSelectedItem(item)}
          onApprove={(item) => {
            setSelectedItem(item);
            setActionType('approve');
          }}
          onReject={(item) => {
            setSelectedItem(item);
            setActionType('reject');
          }}
          type="finance"
          showFinanceStatus={true}
          emptyMessagePending="No items pending finance approval"
          emptyMessageApproved="No approved items"
          customActions={(item) => {
            if (activeTab === 'approved' && item.item_status === 'approved_by_finance') {
              return (
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
              );
            }
            return null;
          }}
        />
      </div>

      {selectedItem && !actionType && (
        <ApprovalItemModal
          selectedItem={selectedItem}
          onClose={() => setSelectedItem(null)}
          formatStatusBadge={(status) => <FinanceStatusBadge status={status} />}
        />
      )}

      {selectedItem && actionType && actionType !== 'mark-paid' && (
        <ApprovalActionModal
          selectedItem={selectedItem}
          actionType={actionType}
          comments={comments}
          setComments={setComments}
          onConfirm={() => {
            if (actionType === 'approve') {
              handleApprove(selectedItem.item_id || selectedItem.id);
            } else {
              handleReject(selectedItem.item_id || selectedItem.id);
            }
          }}
          onCancel={resetActionState}
        />
      )}

      {selectedItem && actionType === 'mark-paid' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-lg max-w-lg w-full my-4">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-sm font-semibold text-gray-800">Mark Item as Paid</h2>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <label htmlFor="item_amount_paid" className="text-xs font-semibold text-gray-600 block mb-1">Item Amount</label>
                <input
                  id="item_amount_paid"
                  type="text"
                  value={formatCurrency(selectedItem.amount)}
                  className="w-full text-xs border border-gray-300 rounded px-2 py-1 bg-gray-100 cursor-not-allowed"
                  readOnly
                />
              </div>
              <div>
                <label htmlFor="paid_amount" className="text-xs font-semibold text-gray-600 block mb-1">Paid Amount *</label>
                <input
                  id="paid_amount"
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
                <label htmlFor="tds_amount" className="text-xs font-semibold text-gray-600 block mb-1">TDS Amount</label>
                <input
                  id="tds_amount"
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
                <label htmlFor="final_amount" className="text-xs font-semibold text-gray-600 block mb-1">Final Amount *</label>
                <input
                  id="final_amount"
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
                <label htmlFor="payment_method" className="text-xs font-semibold text-gray-600 block mb-1">Payment Method</label>
                <select
                  id="payment_method"
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
                <label htmlFor="payment_reference" className="text-xs font-semibold text-gray-600 block mb-1">Payment Reference</label>
                <input
                  id="payment_reference"
                  type="text"
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  className="w-full text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Transaction ID or Reference Number"
                />
              </div>
              <div>
                <label htmlFor="payment_date" className="text-xs font-semibold text-gray-600 block mb-1">Payment Date</label>
                <input
                  id="payment_date"
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
                    resetActionState();
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

