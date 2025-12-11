import React from 'react';
import PropTypes from 'prop-types';
import { useApprovalFilters } from '../../utils/useApprovalFilters';
import { useApprovalData } from '../../utils/useApprovalData';
import { useApprovalActions } from '../../utils/useApprovalActions';
import ApprovalFilters from './ApprovalFilters';
import ApprovalTable from './ApprovalTable';
import ApprovalItemModal from './ApprovalItemModal';
import ApprovalActionModal from './ApprovalActionModal';

/**
 * Shared approval page component to eliminate duplication
 * between ManagerApprovals and HRApprovals
 */
const ApprovalPage = ({ 
  approvalType, 
  title, 
  description, 
  emptyMessagePending, 
  emptyMessageApproved,
  statusOptions,
  formatStatusBadge 
}) => {
  const {
    allPendingItems,
    allApprovedItems,
    loading,
    activeTab,
    setActiveTab,
    fetchPendingItems,
    fetchApprovedItems
  } = useApprovalData(approvalType);

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
  } = useApprovalActions(approvalType, fetchPendingItems, fetchApprovedItems);

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
        <h1 className="text-sm font-bold text-slate-800">{title}</h1>
        <p className="text-xs text-slate-600 mt-1">{description}</p>
      </div>

      <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-slate-200 shadow-sm">
        <div className="border-b border-gray-200">
          <div className="flex">
            <button
              onClick={() => setActiveTab('pending')}
              className={`flex-1 px-4 py-2 text-xs font-semibold ${
                activeTab === 'pending'
                  ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Pending Approval ({pendingItems.length})
            </button>
            <button
              onClick={() => setActiveTab('approved')}
              className={`flex-1 px-4 py-2 text-xs font-semibold ${
                activeTab === 'approved'
                  ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Approved/Rejected ({approvedItems.length})
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
          statusOptions={statusOptions}
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
          type={approvalType}
          emptyMessagePending={emptyMessagePending}
          emptyMessageApproved={emptyMessageApproved}
        />
      </div>

      {selectedItem && !actionType && (
        <ApprovalItemModal
          selectedItem={selectedItem}
          onClose={() => setSelectedItem(null)}
          formatStatusBadge={formatStatusBadge}
        />
      )}

      {selectedItem && actionType && (
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
    </div>
  );
};

ApprovalPage.propTypes = {
  approvalType: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  description: PropTypes.string.isRequired,
  emptyMessagePending: PropTypes.string.isRequired,
  emptyMessageApproved: PropTypes.string.isRequired,
  statusOptions: PropTypes.arrayOf(PropTypes.string).isRequired,
  formatStatusBadge: PropTypes.func.isRequired
};

export default ApprovalPage;

