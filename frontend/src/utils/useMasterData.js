// Shared hook for master data management (departments, cost-centers, projects)
import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import logger from './logger';

export function useMasterData(entityName, apiEndpoint, options = {}) {
  const {
    additionalFilters = {},
    fetchOnMount = true,
    initialFormData = {}
  } = options;

  const [items, setItems] = useState([]);
  const [allItems, setAllItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [selectedStatuses, setSelectedStatuses] = useState([]);
  const [dateRangeStart, setDateRangeStart] = useState('');
  const [dateRangeEnd, setDateRangeEnd] = useState('');
  const filterDropdownRef = useRef(null);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    status: 'active',
    ...initialFormData
  });

  useEffect(() => {
    if (fetchOnMount) {
      fetchItems();
    }
  }, [statusFilter, ...Object.values(additionalFilters)]);

  useEffect(() => {
    filterItems();
  }, [search, selectedStatuses, dateRangeStart, dateRangeEnd, allItems]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(event.target)) {
        setShowAdvancedFilters(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchItems = async () => {
    try {
      const apiUrl = process.env.REACT_APP_API_URL;
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (search) params.append('search', search);
      
      Object.entries(additionalFilters).forEach(([key, value]) => {
        if (value && value !== 'all') params.append(key, value);
      });

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

  const filterItems = () => {
    let filtered = [...allItems];

    // Search filter
    if (search.trim()) {
      const query = search.toLowerCase();
      filtered = filtered.filter(item => {
        const searchableFields = ['name', 'code', 'description', 'status'];
        const searchableText = searchableFields
          .map(field => item[field] || '')
          .join(' ')
          .toLowerCase();
        return searchableText.includes(query);
      });
    }

    // Status filter
    if (selectedStatuses.length > 0) {
      filtered = filtered.filter(item => selectedStatuses.includes(item.status));
    } else if (statusFilter !== 'all') {
      filtered = filtered.filter(item => item.status === statusFilter);
    }

    // Date range filter
    if (dateRangeStart) {
      filtered = filtered.filter(item => {
        const itemDate = new Date(item.created_at || item.updated_at);
        return itemDate >= new Date(dateRangeStart);
      });
    }
    if (dateRangeEnd) {
      filtered = filtered.filter(item => {
        const itemDate = new Date(item.created_at || item.updated_at);
        const endDate = new Date(dateRangeEnd);
        endDate.setHours(23, 59, 59, 999);
        return itemDate <= endDate;
      });
    }

    setItems(filtered);
  };

  const handleCreate = async () => {
    try {
      const apiUrl = process.env.REACT_APP_API_URL;
      const response = await axios.post(
        `${apiUrl}${apiEndpoint}`,
        formData,
        { withCredentials: true }
      );

      if (response.data.success) {
        await fetchItems();
        setShowModal(false);
        resetForm();
      }
    } catch (error) {
      logger.error(`Error creating ${entityName}:`, error);
    }
  };

  const handleUpdate = async () => {
    try {
      const apiUrl = process.env.REACT_APP_API_URL;
      const response = await axios.put(
        `${apiUrl}${apiEndpoint}/${editingItem.id}`,
        formData,
        { withCredentials: true }
      );

      if (response.data.success) {
        await fetchItems();
        setShowModal(false);
        resetForm();
      }
    } catch (error) {
      logger.error(`Error updating ${entityName}:`, error);
    }
  };

  const handleDelete = async (id) => {
    if (!globalThis.confirm(`Are you sure you want to deactivate this ${entityName}?`)) {
      return;
    }

    try {
      const apiUrl = process.env.REACT_APP_API_URL;
      const response = await axios.delete(
        `${apiUrl}${apiEndpoint}/${id}`,
        { withCredentials: true }
      );

      if (response.data.success) {
        await fetchItems();
      }
    } catch (error) {
      logger.error(`Error deleting ${entityName}:`, error);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      code: '',
      description: '',
      status: 'active',
      ...initialFormData
    });
    setEditingItem(null);
  };

  const openCreateModal = () => {
    resetForm();
    setShowModal(true);
  };

  const openEditModal = (item) => {
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

  return {
    items,
    allItems,
    loading,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    showModal,
    setShowModal,
    showAdvancedFilters,
    setShowAdvancedFilters,
    selectedStatuses,
    setSelectedStatuses,
    dateRangeStart,
    setDateRangeStart,
    dateRangeEnd,
    setDateRangeEnd,
    filterDropdownRef,
    editingItem,
    formData,
    setFormData,
    fetchItems,
    handleCreate,
    handleUpdate,
    handleDelete,
    openCreateModal,
    openEditModal,
    resetForm
  };
}


