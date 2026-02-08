import { useState, useEffect } from 'react';
import axios from 'axios';
import logger from './logger';

/**
 * Shared hook for master data CRUD operations to reduce duplication
 * Used by ManageDepartments, ManageProjects, ManageCostCenters
 */
export const useMasterDataCRUD = (entityName, apiEndpoint, initialFormData = {}) => {
  const [allItems, setAllItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    status: 'active',
    ...initialFormData
  });

  const defaultFormData = {
    name: '',
    code: '',
    description: '',
    status: 'active',
    ...initialFormData
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      const apiUrl = process.env.REACT_APP_API_URL;
      const params = new URLSearchParams();
      const response = await axios.get(
        `${apiUrl}${apiEndpoint}?${params.toString()}`,
        { withCredentials: true }
      );

      if (response.data.success) {
        setAllItems(response.data.data || []);
      }
    } catch (error) {
      logger.error(`Error fetching ${entityName}:`, error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const apiUrl = process.env.REACT_APP_API_URL;
      
      if (editingItem) {
        await axios.put(
          `${apiUrl}${apiEndpoint}/${editingItem.id}`,
          formData,
          { withCredentials: true }
        );
      } else {
        await axios.post(
          `${apiUrl}${apiEndpoint}`,
          formData,
          { withCredentials: true }
        );
      }

      setShowModal(false);
      setEditingItem(null);
      setFormData(defaultFormData);
      fetchItems();
    } catch (error) {
      logger.error(`Error saving ${entityName}:`, error);
      alert(error.response?.data?.message || `Failed to save ${entityName}`);
    }
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setFormData({
      name: item.name || '',
      code: item.code || '',
      description: item.description || '',
      status: item.status || 'active',
      ...Object.keys(initialFormData).reduce((acc, key) => {
        acc[key] = item[key] || initialFormData[key];
        return acc;
      }, {})
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!globalThis.confirm(`Are you sure you want to deactivate this ${entityName}?`)) {
      return;
    }

    try {
      const apiUrl = process.env.REACT_APP_API_URL;
      await axios.delete(`${apiUrl}${apiEndpoint}/${id}`, { withCredentials: true });
      fetchItems();
    } catch (error) {
      logger.error(`Error deleting ${entityName}:`, error);
      alert(error.response?.data?.message || `Failed to deactivate ${entityName}`);
    }
  };

  const openAddModal = () => {
    setEditingItem(null);
    setFormData(defaultFormData);
    setShowModal(true);
  };

  return {
    allItems,
    loading,
    showModal,
    setShowModal,
    editingItem,
    formData,
    setFormData,
    fetchItems,
    handleSubmit,
    handleEdit,
    handleDelete,
    openAddModal
  };
};

