import { useState, useEffect } from 'react';
import axios from 'axios';
import logger from './logger';

/**
 * Shared hook for fetching approval data to reduce duplication
 */
export const useApprovalData = (approvalType) => {
  const [allPendingItems, setAllPendingItems] = useState([]);
  const [allApprovedItems, setAllApprovedItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending');

  const fetchPendingItems = async () => {
    try {
      const apiUrl = process.env.REACT_APP_API_URL;
      const response = await axios.get(`${apiUrl}/approvals/${approvalType}/pending`, {
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
      const response = await axios.get(`${apiUrl}/approvals/${approvalType}/approved`, {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  return {
    allPendingItems,
    allApprovedItems,
    loading,
    activeTab,
    setActiveTab,
    fetchPendingItems,
    fetchApprovedItems
  };
};

