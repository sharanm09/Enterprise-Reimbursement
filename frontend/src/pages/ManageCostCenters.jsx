import React, { useState, useEffect } from 'react';
import axios from 'axios';
import logger from '../utils/logger';
import { FiPlus } from 'react-icons/fi';
import { useMasterDataFilters } from '../utils/useMasterDataFilters';
import { useMasterDataCRUD } from '../utils/useMasterDataCRUD';
import MasterDataFilters from '../components/shared/MasterDataFilters';
import MasterDataTable from '../components/shared/MasterDataTable';
import MasterDataForm from '../components/shared/MasterDataForm';
import { getMasterDataStatusColor } from '../utils/statusUtils';

const ManageCostCenters = () => {
  const [departments, setDepartments] = useState([]);
  const [departmentFilter, setDepartmentFilter] = useState('all');

  const {
    allItems: allCostCenters,
    loading,
    showModal,
    setShowModal,
    editingItem: editingCostCenter,
    formData,
    setFormData,
    handleSubmit,
    handleEdit,
    handleDelete,
    openAddModal,
    fetchItems: fetchCostCenters
  } = useMasterDataCRUD('cost center', '/master-data/cost-centers', {
    department_id: ''
  });

  const {
    items: filteredCostCenters,
    search,
    setSearch,
    selectedStatuses,
    handleStatusToggle,
    dateRangeStart,
    setDateRangeStart,
    dateRangeEnd,
    setDateRangeEnd,
    showAdvancedFilters,
    setShowAdvancedFilters,
    clearFilters
  } = useMasterDataFilters(allCostCenters, ['name', 'code', 'description', 'status', 'department_name']);

  const costCenters = departmentFilter === 'all' 
    ? filteredCostCenters
    : filteredCostCenters.filter(cc => cc.department_id === departmentFilter);

  useEffect(() => {
    fetchDepartments();
  }, []);

  useEffect(() => {
    fetchCostCenters();
  }, [departmentFilter]);

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

  const departmentField = (
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
  );

  const columns = [
    { key: 'name', label: 'Name', render: (item) => <span className="text-gray-900 font-medium">{item.name}</span> },
    { key: 'code', label: 'Code' },
    { key: 'department_name', label: 'Department' },
    { key: 'description', label: 'Description' },
    {
      key: 'status',
      label: 'Status',
      render: (item) => (
        <span className={`px-1.5 py-0.5 text-[9px] font-medium rounded ${getMasterDataStatusColor(item.status)}`}>
          {item.status}
        </span>
      )
    },
    { key: 'reimbursement_count', label: 'Reimbursements', render: (item) => item.reimbursement_count || 0 }
  ];

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
          <div className="flex-1">
            <MasterDataFilters
              search={search}
              setSearch={setSearch}
              showAdvancedFilters={showAdvancedFilters}
              setShowAdvancedFilters={setShowAdvancedFilters}
              selectedStatuses={selectedStatuses}
              handleStatusToggle={handleStatusToggle}
              dateRangeStart={dateRangeStart}
              setDateRangeStart={setDateRangeStart}
              dateRangeEnd={dateRangeEnd}
              setDateRangeEnd={setDateRangeEnd}
              clearFilters={clearFilters}
              statusOptions={['active', 'inactive']}
            />
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
        </div>

        <MasterDataTable
          items={costCenters}
          loading={loading}
          columns={columns}
          onEdit={handleEdit}
          onDelete={handleDelete}
          emptyMessage="No cost centers found"
        />
      </div>

      {showModal && (
        <MasterDataForm
          title={editingCostCenter ? 'Edit Cost Center' : 'Add Cost Center'}
          editingItem={editingCostCenter}
          formData={formData}
          setFormData={setFormData}
          handleSubmit={handleSubmit}
          onClose={() => setShowModal(false)}
          customFields={[departmentField]}
        />
      )}
    </div>
  );
};

export default ManageCostCenters;
