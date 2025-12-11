import React from 'react';
import PropTypes from 'prop-types';
import { FiSearch, FiFilter, FiX } from 'react-icons/fi';

const ApprovalFilters = ({
  searchQuery,
  setSearchQuery,
  showAdvancedFilters,
  setShowAdvancedFilters,
  statusFilter,
  setStatusFilter,
  dateRangeStart,
  setDateRangeStart,
  dateRangeEnd,
  setDateRangeEnd,
  clearFilters,
  statusOptions = ['all', 'pending', 'approved', 'rejected']
}) => {
  return (
    <div className="p-4 border-b border-gray-200">
      {/* Search Bar */}
      <div className="mb-3">
        <div className="relative">
          <FiSearch className="absolute left-2 top-1/2 transform -translate-y-1/2 w-3 h-3 text-gray-400" />
          <input
            type="text"
            placeholder="Search by employee, expense type, amount, date..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-[9px] border border-gray-300 rounded-lg text-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <FiX className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Advanced Filters */}
      <div>
        <button
          onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
          className="flex items-center space-x-1 text-[9px] text-blue-600 hover:text-blue-700 font-medium"
        >
          <FiFilter className="w-3 h-3" />
          <span>Advanced Filters</span>
        </button>
        
        {showAdvancedFilters && (
          <div className="mt-2 p-3 bg-gray-50 rounded-lg border border-gray-200 space-y-2">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <div>
                <label htmlFor="status-filter" className="block text-[9px] font-medium text-gray-600 mb-1">Status</label>
                <select
                  id="status-filter"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full text-[9px] border border-gray-300 rounded px-2 py-1 text-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white"
                >
                  {statusOptions.map(option => (
                    <option key={option} value={option}>
                      {option === 'all' ? 'All Status' : option.charAt(0).toUpperCase() + option.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="date-start-filter" className="block text-[9px] font-medium text-gray-600 mb-1">Start Date</label>
                <input
                  id="date-start-filter"
                  type="date"
                  value={dateRangeStart}
                  onChange={(e) => setDateRangeStart(e.target.value)}
                  className="w-full text-[9px] border border-gray-300 rounded px-2 py-1 text-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white"
                />
              </div>
              <div>
                <label htmlFor="date-end-filter" className="block text-[9px] font-medium text-gray-600 mb-1">End Date</label>
                <input
                  id="date-end-filter"
                  type="date"
                  value={dateRangeEnd}
                  onChange={(e) => setDateRangeEnd(e.target.value)}
                  className="w-full text-[9px] border border-gray-300 rounded px-2 py-1 text-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white"
                />
              </div>
            </div>
            {(statusFilter !== 'all' || dateRangeStart || dateRangeEnd) && (
              <button
                onClick={clearFilters}
                className="text-[9px] text-red-600 hover:text-red-700 font-medium flex items-center space-x-1"
              >
                <FiX className="w-3 h-3" />
                <span>Clear Filters</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

ApprovalFilters.propTypes = {
  searchQuery: PropTypes.string.isRequired,
  setSearchQuery: PropTypes.func.isRequired,
  showAdvancedFilters: PropTypes.bool.isRequired,
  setShowAdvancedFilters: PropTypes.func.isRequired,
  statusFilter: PropTypes.string.isRequired,
  setStatusFilter: PropTypes.func.isRequired,
  dateRangeStart: PropTypes.string.isRequired,
  setDateRangeStart: PropTypes.func.isRequired,
  dateRangeEnd: PropTypes.string.isRequired,
  setDateRangeEnd: PropTypes.func.isRequired,
  clearFilters: PropTypes.func.isRequired,
  statusOptions: PropTypes.arrayOf(PropTypes.string)
};

export default ApprovalFilters;

