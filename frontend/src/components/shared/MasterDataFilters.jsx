import React, { useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import { FiSearch, FiFilter, FiX } from 'react-icons/fi';

const MasterDataFilters = ({
  search,
  setSearch,
  showAdvancedFilters,
  setShowAdvancedFilters,
  selectedStatuses,
  handleStatusToggle,
  dateRangeStart,
  setDateRangeStart,
  dateRangeEnd,
  setDateRangeEnd,
  clearFilters,
  statusOptions = ['active', 'inactive']
}) => {
  const filterDropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(event.target)) {
        setShowAdvancedFilters(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [setShowAdvancedFilters]);

  return (
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
                  {statusOptions.map(status => (
                    <label key={status} className="flex items-center space-x-2 cursor-pointer">
                      <input
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
  );
};

MasterDataFilters.propTypes = {
  search: PropTypes.string.isRequired,
  setSearch: PropTypes.func.isRequired,
  showAdvancedFilters: PropTypes.bool.isRequired,
  setShowAdvancedFilters: PropTypes.func.isRequired,
  selectedStatuses: PropTypes.arrayOf(PropTypes.string).isRequired,
  handleStatusToggle: PropTypes.func.isRequired,
  dateRangeStart: PropTypes.string.isRequired,
  setDateRangeStart: PropTypes.func.isRequired,
  dateRangeEnd: PropTypes.string.isRequired,
  setDateRangeEnd: PropTypes.func.isRequired,
  clearFilters: PropTypes.func.isRequired,
  statusOptions: PropTypes.arrayOf(PropTypes.string)
};

MasterDataFilters.defaultProps = {
  statusOptions: ['active', 'inactive']
};

export default MasterDataFilters;

