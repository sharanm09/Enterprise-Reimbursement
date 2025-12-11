import React from 'react';
import PropTypes from 'prop-types';
import { FiX } from 'react-icons/fi';

/**
 * Shared form component for master data entities
 */
const MasterDataForm = ({
  title,
  editingItem,
  formData,
  setFormData,
  handleSubmit,
  onClose,
  customFields = []
}) => {
  const commonFields = (
    <>
      <div>
        <label htmlFor="name" className="text-xs font-medium text-gray-700 mb-0.5 block">
          Name <span className="text-red-500">*</span>
        </label>
        <input
          id="name"
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="w-full text-xs border border-gray-300 rounded px-2 py-1 text-gray-600"
          required
        />
      </div>

      <div>
        <label htmlFor="code" className="text-xs font-medium text-gray-700 mb-0.5 block">
          Code <span className="text-red-500">*</span>
        </label>
        <input
          id="code"
          type="text"
          value={formData.code}
          onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
          className="w-full text-xs border border-gray-300 rounded px-2 py-1 text-gray-600"
          required
        />
      </div>

      <div>
        <label htmlFor="description" className="text-xs font-medium text-gray-700 mb-0.5 block">
          Description<span className="text-red-500">*</span>
        </label>
        <textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          rows="2"
          className="w-full text-xs border border-gray-300 rounded px-2 py-1 text-gray-600"
        />
      </div>
    </>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl p-4 w-full max-w-md">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-bold text-indigo-900">{title}</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <FiX className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {commonFields}
          {customFields}
          <div>
            <label htmlFor="status" className="text-xs font-medium text-gray-700 mb-0.5 block">
              Status <span className="text-red-500">*</span>
            </label>
            <select
              id="status"
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
              onClick={onClose}
              className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors text-xs font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-xs font-medium"
            >
              {editingItem ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

MasterDataForm.propTypes = {
  title: PropTypes.string.isRequired,
  editingItem: PropTypes.object,
  formData: PropTypes.object.isRequired,
  setFormData: PropTypes.func.isRequired,
  handleSubmit: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
  customFields: PropTypes.arrayOf(PropTypes.node)
};

export default MasterDataForm;

