/**
 * Shared status badge utilities to reduce duplication
 */

/**
 * Get status badge color classes
 * @param {string} status - Status string
 * @param {string} type - Type of approval (manager, hr, finance, general)
 * @returns {string} CSS classes for status badge
 */
export const getStatusColor = (status, type = 'general') => {
  if (!status) return 'bg-gradient-to-r from-slate-100 to-blue-100 text-slate-700 border border-slate-300';
  
  const statusLower = status.toLowerCase();
  
  // Pending status
  if (statusLower === 'pending') {
    return 'bg-gradient-to-r from-amber-100 to-yellow-100 text-amber-700 border border-amber-200';
  }
  
  // Approved statuses
  if (statusLower === 'approved_by_manager') {
    return type === 'hr' || type === 'finance' 
      ? 'bg-gradient-to-r from-blue-100 to-cyan-100 text-blue-700 border border-blue-200'
      : 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 border border-green-200';
  }
  if (statusLower === 'approved_by_hr') {
    return 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 border border-green-200';
  }
  if (statusLower === 'approved_by_finance') {
    return 'bg-gradient-to-r from-indigo-100 to-purple-100 text-indigo-700 border border-indigo-200';
  }
  if (statusLower === 'paid') {
    return 'bg-gradient-to-r from-emerald-100 to-teal-100 text-emerald-700 border border-emerald-200';
  }
  
  // Rejected statuses
  if (statusLower.includes('rejected')) {
    return 'bg-gradient-to-r from-red-100 to-rose-100 text-red-700 border border-red-200';
  }
  
  // Default
  return 'bg-gradient-to-r from-indigo-100 to-purple-100 text-indigo-700 border border-indigo-200';
};

/**
 * Get status label text
 * @param {string} status - Status string
 * @returns {string} Human-readable status label
 */
export const getStatusLabel = (status) => {
  if (!status) return 'Unknown';
  
  const statusLower = status.toLowerCase();
  
  const statusMap = {
    'pending': 'Pending',
    'approved_by_manager': 'Approved by Manager',
    'rejected_by_manager': 'Rejected by Manager',
    'approved_by_hr': 'Approved by HR',
    'rejected_by_hr': 'Rejected by HR',
    'approved_by_finance': 'Approved by Finance',
    'rejected_by_finance': 'Rejected by Finance',
    'paid': 'Paid'
  };
  
  if (statusMap[statusLower]) {
    return statusMap[statusLower];
  }
  
  if (statusLower.includes('rejected')) {
    return 'Rejected';
  }
  
  return status;
};

/**
 * Get master data status color (for departments, projects, cost centers)
 * @param {string} status - Status string (active/inactive)
 * @returns {string} CSS classes for status badge
 */
export const getMasterDataStatusColor = (status) => {
  if (status === 'active') {
    return 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 border border-green-200';
  }
  return 'bg-gradient-to-r from-red-100 to-rose-100 text-red-700 border border-red-200';
};

