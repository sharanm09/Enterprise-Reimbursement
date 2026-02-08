/**
 * Shared status badge formatters for approval pages
 */

export const getManagerStatusBadge = (status) => {
  if (status === 'pending') {
    return <span className="px-1.5 py-0.5 bg-yellow-500 text-white text-xs font-semibold rounded-full">Pending</span>;
  }
  if (status === 'approved_by_manager') {
    return <span className="px-1.5 py-0.5 bg-blue-500 text-white text-xs font-semibold rounded-full">Approved by Manager</span>;
  }
  if (status === 'rejected_by_manager') {
    return <span className="px-1.5 py-0.5 bg-red-500 text-white text-xs font-semibold rounded-full">Rejected by Manager</span>;
  }
  if (status && !['pending', 'approved_by_manager', 'rejected_by_manager'].includes(status)) {
    return <span className="px-1.5 py-0.5 bg-gray-500 text-white text-xs font-semibold rounded-full">{status}</span>;
  }
  return null;
};

export const getHRStatusBadge = (status) => {
  if (status === 'approved_by_manager') {
    return <span className="px-1.5 py-0.5 bg-blue-500 text-white text-xs font-semibold rounded-full">Approved by Manager</span>;
  }
  if (status === 'approved_by_hr') {
    return <span className="px-1.5 py-0.5 bg-purple-500 text-white text-xs font-semibold rounded-full">Approved by HR</span>;
  }
  if (status === 'rejected_by_hr') {
    return <span className="px-1.5 py-0.5 bg-red-500 text-white text-xs font-semibold rounded-full">Rejected by HR</span>;
  }
  if (status && !['approved_by_manager', 'approved_by_hr', 'rejected_by_hr'].includes(status)) {
    return <span className="px-1.5 py-0.5 bg-gray-500 text-white text-xs font-semibold rounded-full">{status}</span>;
  }
  return null;
};

