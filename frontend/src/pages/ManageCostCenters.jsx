import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import logger from '../utils/logger';
import { FiPlus, FiEdit, FiTrash2, FiSearch, FiX, FiFilter } from 'react-icons/fi';

const ManageCostCenters = () => {
  const [costCenters, setCostCenters] = useState([]);
  const [allCostCenters, setAllCostCenters] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [selectedStatuses, setSelectedStatuses] = useState([]);
  const [dateRangeStart, setDateRangeStart] = useState('');
  const [dateRangeEnd, setDateRangeEnd] = useState('');
  const filterDropdownRef = useRef(null);
  const [editingCostCenter, setEditingCostCenter] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    department_id: '',
    description: '',
    status: 'active'
  });

  useEffect(() => {
    fetchDepartments();
  }, []);

  useEffect(() => {
    fetchCostCenters();
  }, [departmentFilter]);

  useEffect(() => {
    filterCostCenters();
  }, [search, selectedStatuses, dateRangeStart, dateRangeEnd, departmentFilter, allCostCenters]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(event.target)) {
        setShowAdvancedFilters(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchDepartments = async () => {
    try {
      const apiUrl = process.env.REACT_APP_API_URL;
      const response = await axios.get(
        `${apiUrl}/master-data/departments?status=active`,
        { withCredentials: true }
      );
      if (response.data.success) {
        setDepartments(response.data.data || []);
      }
    } catch (error) {
      logger.error('Error fetching departments:', error);
    }
  };

  const fetchCostCenters = async () => {
    try {
      const apiUrl = process.env.REACT_APP_API_URL;
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (departmentFilter !== 'all') params.append('department_id', departmentFilter);
      if (search) params.append('search', search);

      const response = await axios.get(
        `${apiUrl}/master-data/cost-centers?${params.toString()}`,
        { withCredentials: true }
      );

      if (response.data.success) {
        setAllCostCenters(response.data.data || []);
      }
    } catch (error) {
      logger.error('Error fetching cost centers:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterCostCenters = () => {
    let filtered = [...allCostCenters];

    // Department filter
    if (departmentFilter !== 'all') {
      filtered = filtered.filter(cc => cc.department_id === departmentFilter);
    }

    // Search filter
    if (search.trim()) {
      const query = search.toLowerCase();
      filtered = filtered.filter(cc => {
        const searchableText = [
          cc.name,
          cc.code,
          cc.description,
          cc.status,
          cc.department_name
        ].join(' ').toLowerCase();
        return searchableText.includes(query);
      });
    }

    // Status filter (multiple select)
    if (selectedStatuses.length > 0) {
      filtered = filtered.filter(cc => selectedStatuses.includes(cc.status));
    } else if (statusFilter !== 'all') {
      filtered = filtered.filter(cc => cc.status === statusFilter);
    }

    // Date range filter
    if (dateRangeStart) {
      filtered = filtered.filter(cc => {
        const ccDate = new Date(cc.created_at || cc.updated_at);
        return ccDate >= new Date(dateRangeStart);
      });
    }
    if (dateRangeEnd) {
      filtered = filtered.filter(cc => {
        const ccDate = new Date(cc.created_at || cc.updated_at);
        const endDate = new Date(dateRangeEnd);
        endDate.setHours(23, 59, 59, 999);
        return ccDate <= endDate;
      });
    }

    setCostCenters(filtered);
  };

  const handleStatusToggle = (status) => {
    setSelectedStatuses(prev => 
      prev.includes(status) 
        ? prev.filter(s => s !== status)
        : [...prev, status]
    );
  };

  const clearFilters = () => {
    setSelectedStatuses([]);
    setStatusFilter('all');
    setDateRangeStart('');
    setDateRangeEnd('');
    setSearch('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const apiUrl = process.env.REACT_APP_API_URL;
      
      if (editingCostCenter) {
        await axios.put(
          `${apiUrl}/master-data/cost-centers/${editingCostCenter.id}`,
          formData,
          { withCredentials: true }
        );
      } else {
        await axios.post(
          `${apiUrl}/master-data/cost-centers`,
          formData,
          { withCredentials: true }
        );
      }

      setShowModal(false);
      setEditingCostCenter(null);
      setFormData({ name: '', code: '', department_id: '', description: '', status: 'active' });
      fetchCostCenters();
    } catch (error) {
      logger.error('Error saving cost center:', error);
      alert(error.response?.data?.message || 'Failed to save cost center');
    }
  };

  const handleEdit = (cc) => {
    setEditingCostCenter(cc);
    setFormData({
      name: cc.name,
      code: cc.code,
      department_id: cc.department_id,
      description: cc.description || '',
      status: cc.status
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to deactivate this cost center?')) {
      return;
    }

    try {
      const apiUrl = process.env.REACT_APP_API_URL;
      await axios.delete(`${apiUrl}/master-data/cost-centers/${id}`, { withCredentials: true });
      fetchCostCenters();
    } catch (error) {
      logger.error('Error deleting cost center:', error);
      alert(error.response?.data?.message || 'Failed to deactivate cost center');
    }
  };

  const openAddModal = () => {
    setEditingCostCenter(null);
    setFormData({ name: '', code: '', department_id: '', description: '', status: 'active' });
    setShowModal(true);
  };

  const getStatusColor = (status) => {
    if (status === 'active') return 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 border border-green-200';
    return 'bg-gradient-to-r from-red-100 to-rose-100 text-red-700 border border-red-200';
  };

  return (
    <div className="space-y-4 min-h-[64px]">
      <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-slate-200 p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-sm font-bold text-slate-800">Cost Centers</h1>
            <p className="text-xs text-slate-600 mt-1">Manage cost center information</p>
          </div>
          <button
            onClick={openAddModal}
            className="flex items-center space-x-1 px-3 py-1.5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-xs font-semibold rounded-lg hover:from-blue-600 hover:to-indigo-700 shadow-md transition-all"
          >
            <FiPlus className="w-3 h-3" />
            <span>Add Cost Center</span>
          </button>
        </div>

        <div className="flex items-center space-x-2 mb-3">
          <div className="flex-1 relative flex items-center">
            <FiSearch className="absolute left-2 w-3.5 h-3.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, code, description..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full text-[9px] border border-gray-300 rounded-lg px-2 py-1.5 pl-8 text-gray-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2 text-gray-400 hover:text-gray-600"
              >
                <FiX className="w-3 h-3" />
              </button>
            )}
          </div>
          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="text-[9px] border border-gray-300 rounded-lg px-2 py-1.5 text-gray-600 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Departments</option>
            {departments.map(dept => (
              <option key={dept.id} value={dept.id}>{dept.name}</option>
            ))}
          </select>
          <div className="relative" ref={filterDropdownRef}>
            <button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className={`flex items-center space-x-1 px-3 py-1.5 text-[9px] font-medium rounded-lg border transition-colors ${
                (selectedStatuses.length > 0 || dateRangeStart || dateRangeEnd)
                  ? 'bg-blue-50 border-blue-300 text-blue-700'
                  : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <FiFilter className="w-3 h-3" />
              <span>Filters</span>
              {(selectedStatuses.length > 0 || dateRangeStart || dateRangeEnd) && (
                <span className="bg-blue-600 text-white rounded-full w-4 h-4 flex items-center justify-center text-[8px]">
                  {(selectedStatuses.length + (dateRangeStart ? 1 : 0) + (dateRangeEnd ? 1 : 0))}
                </span>
              )}
            </button>
            
            {showAdvancedFilters && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-50 p-3">
                <div className="space-y-3">
                  <div>
                    <label htmlFor="status-filter" className="block text-[9px] font-medium text-gray-600 mb-2">Status (Multiple Select)</label>
                    <div className="space-y-1">
                      {['active', 'inactive'].map(status => (
                        <label key={status} htmlFor={`status-${status}`} className="flex items-center space-x-2 cursor-pointer">
                          <input
                            id={`status-${status}`}
                            type="checkbox"
                            checked={selectedStatuses.includes(status)}
                            onChange={() => handleStatusToggle(status)}
                            className="w-3 h-3 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <span className="text-[9px] text-gray-700 capitalize">{status}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <label htmlFor="date-range-filter" className="block text-[9px] font-medium text-gray-600 mb-2">Date Range</label>
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
                  
                  {(selectedStatuses.length > 0 || dateRangeStart || dateRangeEnd) && (
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

        {loading ? (
          <div className="text-center py-8 text-[10px] text-gray-500">Loading...</div>
        ) : costCenters.length === 0 ? (
          <div className="text-center py-8 text-[10px] text-gray-500">No cost centers found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-1.5 px-2 text-[9px] font-medium text-gray-500 uppercase tracking-wide">Name</th>
                  <th className="text-left py-1.5 px-2 text-[9px] font-medium text-gray-500 uppercase tracking-wide">Code</th>
                  <th className="text-left py-1.5 px-2 text-[9px] font-medium text-gray-500 uppercase tracking-wide">Department</th>
                  <th className="text-left py-1.5 px-2 text-[9px] font-medium text-gray-500 uppercase tracking-wide">Description</th>
                  <th className="text-left py-1.5 px-2 text-[9px] font-medium text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="text-left py-1.5 px-2 text-[9px] font-medium text-gray-500 uppercase tracking-wide">Reimbursements</th>
                  <th className="text-left py-1.5 px-2 text-[9px] font-medium text-gray-500 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody>
                {costCenters.map((cc) => (
                  <tr key={cc.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="py-1.5 px-2 text-[10px] text-gray-900 font-medium">{cc.name}</td>
                    <td className="py-1.5 px-2 text-[10px] text-gray-600">{cc.code}</td>
                    <td className="py-1.5 px-2 text-[10px] text-gray-600">{cc.department_name || 'N/A'}</td>
                    <td className="py-1.5 px-2 text-[10px] text-gray-600">{cc.description || 'N/A'}</td>
                    <td className="py-1.5 px-2">
                      <span className={`px-1.5 py-0.5 text-[9px] font-medium rounded ${getStatusColor(cc.status)}`}>
                        {cc.status}
                      </span>
                    </td>
                    <td className="py-1.5 px-2 text-[10px] text-gray-600">{cc.reimbursement_count || 0}</td>
                    <td className="py-1.5 px-2">
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => handleEdit(cc)}
                          className="px-1.5 py-1 bg-gray-50 text-gray-700 text-[9px] font-medium rounded border border-gray-200 hover:bg-gray-100 hover:border-gray-300 transition-colors"
                        >
                          <FiEdit className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => handleDelete(cc.id)}
                          className="px-1.5 py-1 bg-gray-50 text-gray-700 text-[9px] font-medium rounded border border-gray-200 hover:bg-gray-100 hover:border-gray-300 transition-colors"
                        >
                          <FiTrash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-4 w-full max-w-md">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-bold text-indigo-900">
                {editingCostCenter ? 'Edit Cost Center' : 'Add Cost Center'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <FiX className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label htmlFor="department_id" className="text-xs font-medium text-gray-700 mb-0.5 block">
                  Department <span className="text-red-500">*</span>
                </label>
                <select
                  id="department_id"
                  value={formData.department_id}
                  onChange={(e) => setFormData({ ...formData, department_id: e.target.value })}
                  className="w-full text-xs border border-gray-300 rounded px-2 py-1 text-gray-600"
                  required
                >
                  <option value="">Select Department</option>
                  {departments.map(dept => (
                    <option key={dept.id} value={dept.id}>{dept.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="cost_center_name" className="text-xs font-medium text-gray-700 mb-0.5 block">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="cost_center_name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full text-xs border border-gray-300 rounded px-2 py-1 text-gray-600"
                  required
                />
              </div>

              <div>
                <label htmlFor="cost_center_code" className="text-xs font-medium text-gray-700 mb-0.5 block">
                  Code <span className="text-red-500">*</span>
                </label>
                <input
                  id="cost_center_code"
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  className="w-full text-xs border border-gray-300 rounded px-2 py-1 text-gray-600"
                  required
                />
              </div>

              <div>
                <label htmlFor="cost_center_description" className="text-xs font-medium text-gray-700 mb-0.5 block">
                  Description
                </label>
                <textarea
                  id="cost_center_description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows="2"
                  className="w-full text-xs border border-gray-300 rounded px-2 py-1 text-gray-600"
                />
              </div>

              <div>
                <label htmlFor="cost_center_status" className="text-xs font-medium text-gray-700 mb-0.5 block">
                  Status <span className="text-red-500">*</span>
                </label>
                <select
                  id="cost_center_status"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full text-xs border border-gray-300 rounded px-2 py-1 text-gray-600"
                  required
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-xs font-medium"
                >
                  {editingCostCenter ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageCostCenters;

