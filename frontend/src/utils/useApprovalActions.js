import { useState } from 'react';
import axios from 'axios';
import logger from './logger';

/**
 * Shared hook for approval actions (approve, reject) to reduce duplication
 * across ManagerApprovals, HRApprovals, and FinanceApprovals
 */
export const useApprovalActions = (approvalType, fetchPendingItems, fetchApprovedItems) => {
  const [selectedItem, setSelectedItem] = useState(null);
  const [actionType, setActionType] = useState(null);
  const [comments, setComments] = useState('');

  const handleApprove = async (itemId) => {
    try {
      const apiUrl = process.env.REACT_APP_API_URL;
      const response = await axios.post(
        `${apiUrl}/approvals/${approvalType}/approve`,
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
        `${apiUrl}/approvals/${approvalType}/reject`,
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

  const resetActionState = () => {
    setActionType(null);
    setComments('');
    setSelectedItem(null);
  };

  return {
    selectedItem,
    setSelectedItem,
    actionType,
    setActionType,
    comments,
    setComments,
    handleApprove,
    handleReject,
    resetActionState
  };
};

