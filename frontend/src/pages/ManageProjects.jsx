import React from 'react';
import { FiPlus } from 'react-icons/fi';
import { useMasterDataFilters } from '../utils/useMasterDataFilters';
import { useMasterDataCRUD } from '../utils/useMasterDataCRUD';
import MasterDataFilters from '../components/shared/MasterDataFilters';
import MasterDataTable from '../components/shared/MasterDataTable';
import MasterDataForm from '../components/shared/MasterDataForm';
import { getMasterDataStatusColor } from '../utils/statusUtils';
import { formatDate, formatCurrency } from '../utils/formatUtils';

const ManageProjects = () => {
  const {
    allItems: allProjects,
    loading,
    showModal,
    setShowModal,
    editingItem: editingProject,
    formData,
    setFormData,
    handleSubmit,
    handleEdit,
    handleDelete,
    openAddModal
  } = useMasterDataCRUD('project', '/master-data/projects', {
    start_date: '',
    end_date: ''
  });

  const {
    items: projects,
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
  } = useMasterDataFilters(allProjects, ['name', 'code', 'description', 'status', 'start_date', 'end_date']);

  const dateFields = (
    <div className="grid grid-cols-2 gap-2">
      <div>
        <label htmlFor="start_date" className="text-xs font-medium text-gray-700 mb-0.5 block">
          Start Date<span className="text-red-500">*</span>
        </label>
        <input
          id="start_date"
          type="date"
          value={formData.start_date}
          onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
          className="w-full text-xs border border-gray-300 rounded px-2 py-1 text-gray-600"
        />
      </div>
      <div>
        <label htmlFor="end_date" className="text-xs font-medium text-gray-700 mb-0.5 block">
          End Date<span className="text-red-500">*</span>
        </label>
        <input
          id="end_date"
          type="date"
          value={formData.end_date}
          onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
          className="w-full text-xs border border-gray-300 rounded px-2 py-1 text-gray-600"
        />
      </div>
    </div>
  );

  const columns = [
    { key: 'name', label: 'Name', render: (item) => <span className="text-gray-900 font-medium">{item.name}</span> },
    { key: 'code', label: 'Code' },
    { key: 'description', label: 'Description' },
    { key: 'start_date', label: 'Start Date', render: (item) => formatDate(item.start_date) },
    { key: 'end_date', label: 'End Date', render: (item) => formatDate(item.end_date) },
    {
      key: 'status',
      label: 'Status',
      render: (item) => (
        <span className={`px-1.5 py-0.5 text-[9px] font-medium rounded ${getMasterDataStatusColor(item.status)}`}>
          {item.status}
        </span>
      )
    },
    { key: 'total_expenses', label: 'Expenses', render: (item) => formatCurrency(item.total_expenses || 0) },
    { key: 'reimbursement_count', label: 'Reimbursements', render: (item) => item.reimbursement_count || 0 }
  ];

  return (
    <div className="space-y-4 min-h-[64px]">
      <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-slate-200 p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-sm font-bold text-slate-800">Projects</h1>
            <p className="text-xs text-slate-600 mt-1">Manage project information</p>
          </div>
          <button
            onClick={openAddModal}
            className="flex items-center space-x-1 px-3 py-1.5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-xs font-semibold rounded-lg hover:from-blue-600 hover:to-indigo-700 shadow-md transition-all"
          >
            <FiPlus className="w-3 h-3" />
            <span>Add Project</span>
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
          items={projects}
          loading={loading}
          columns={columns}
          onEdit={handleEdit}
          onDelete={handleDelete}
          emptyMessage="No projects found"
        />
      </div>

      {showModal && (
        <MasterDataForm
          title={editingProject ? 'Edit Project' : 'Add Project'}
          editingItem={editingProject}
          formData={formData}
          setFormData={setFormData}
          handleSubmit={handleSubmit}
          onClose={() => setShowModal(false)}
          customFields={[dateFields]}
        />
      )}
    </div>
  );
};

export default ManageProjects;
