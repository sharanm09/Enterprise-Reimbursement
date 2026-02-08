import React from 'react';
import { FiPlus } from 'react-icons/fi';
import { useMasterDataFilters } from '../utils/useMasterDataFilters';
import { useMasterDataCRUD } from '../utils/useMasterDataCRUD';
import MasterDataFilters from '../components/shared/MasterDataFilters';
import MasterDataTable from '../components/shared/MasterDataTable';
import MasterDataForm from '../components/shared/MasterDataForm';
import { getMasterDataStatusColor } from '../utils/statusUtils';

const ManageDepartments = () => {
  const {
    allItems: allDepartments,
    loading,
    showModal,
    setShowModal,
    editingItem: editingDepartment,
    formData,
    setFormData,
    handleSubmit,
    handleEdit,
    handleDelete,
    openAddModal
  } = useMasterDataCRUD('department', '/master-data/departments');

  const {
    items: departments,
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
  } = useMasterDataFilters(allDepartments, ['name', 'code', 'description', 'status']);

  const columns = [
    { key: 'name', label: 'Name', render: (item) => <span className="text-gray-900 font-medium">{item.name}</span> },
    { key: 'code', label: 'Code' },
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
    { key: 'cost_center_count', label: 'Cost Centers', render: (item) => item.cost_center_count || 0 }
  ];

  return (
    <div className="space-y-4 min-h-[64px]">
      <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-slate-200 p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-sm font-bold text-slate-800">Departments</h1>
            <p className="text-xs text-slate-600 mt-1">Manage department information</p>
          </div>
          <button
            onClick={openAddModal}
            className="flex items-center space-x-1 px-3 py-1.5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-xs font-semibold rounded-lg hover:from-blue-600 hover:to-indigo-700 shadow-md transition-all"
          >
            <FiPlus className="w-3 h-3" />
            <span>Add Department</span>
          </button>
        </div>

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

        <MasterDataTable
          items={departments}
          loading={loading}
          columns={columns}
          onEdit={handleEdit}
          onDelete={handleDelete}
          emptyMessage="No departments found"
        />
      </div>

      {showModal && (
        <MasterDataForm
          title={editingDepartment ? 'Edit Department' : 'Add Department'}
          editingItem={editingDepartment}
          formData={formData}
          setFormData={setFormData}
          handleSubmit={handleSubmit}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
};

export default ManageDepartments;
