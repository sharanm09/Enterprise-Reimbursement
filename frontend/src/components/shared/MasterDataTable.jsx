import React from 'react';
import PropTypes from 'prop-types';
import { FiEdit, FiTrash2 } from 'react-icons/fi';

/**
 * Shared table component for master data entities
 */
const MasterDataTable = ({
  items,
  loading,
  columns,
  onEdit,
  onDelete,
  emptyMessage = 'No items found'
}) => {
  if (loading) {
    return <div className="text-center py-8 text-[10px] text-gray-500">Loading...</div>;
  }

  if (items.length === 0) {
    return <div className="text-center py-8 text-[10px] text-gray-500">{emptyMessage}</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-200">
            {columns.map((col) => (
              <th
                key={col.key}
                className="text-left py-1.5 px-2 text-[9px] font-medium text-gray-500 uppercase tracking-wide"
              >
                {col.label}
              </th>
            ))}
            <th className="text-left py-1.5 px-2 text-[9px] font-medium text-gray-500 uppercase tracking-wide">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
              {columns.map((col) => (
                <td key={col.key} className="py-1.5 px-2 text-[10px] text-gray-600">
                  {col.render ? col.render(item) : item[col.key] || 'N/A'}
                </td>
              ))}
              <td className="py-1.5 px-2">
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => onEdit(item)}
                    className="px-1.5 py-1 bg-gray-50 text-gray-700 text-[9px] font-medium rounded border border-gray-200 hover:bg-gray-100 hover:border-gray-300 transition-colors"
                  >
                    <FiEdit className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => onDelete(item.id)}
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
  );
};

MasterDataTable.propTypes = {
  items: PropTypes.array.isRequired,
  loading: PropTypes.bool.isRequired,
  columns: PropTypes.arrayOf(
    PropTypes.shape({
      key: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
      render: PropTypes.func
    })
  ).isRequired,
  onEdit: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
  emptyMessage: PropTypes.string
};

export default MasterDataTable;

