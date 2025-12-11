// Shared filtering utilities to reduce duplication
export function applySearchFilter(items, search, searchFields = ['name', 'code', 'description', 'status']) {
  if (!search.trim()) return items;
  
  const query = search.toLowerCase();
  return items.filter(item => {
    const searchableText = searchFields
      .map(field => item[field] || '')
      .join(' ')
      .toLowerCase();
    return searchableText.includes(query);
  });
}

export function applyStatusFilter(items, statusFilter, selectedStatuses) {
  if (selectedStatuses.length > 0) {
    return items.filter(item => selectedStatuses.includes(item.status));
  }
  if (statusFilter !== 'all') {
    return items.filter(item => item.status === statusFilter);
  }
  return items;
}

export function applyDateRangeFilter(items, dateRangeStart, dateRangeEnd) {
  let filtered = [...items];
  
  if (dateRangeStart) {
    filtered = filtered.filter(item => {
      const itemDate = new Date(item.created_at || item.updated_at);
      return itemDate >= new Date(dateRangeStart);
    });
  }
  
  if (dateRangeEnd) {
    filtered = filtered.filter(item => {
      const itemDate = new Date(item.created_at || item.updated_at);
      const endDate = new Date(dateRangeEnd);
      endDate.setHours(23, 59, 59, 999);
      return itemDate <= endDate;
    });
  }
  
  return filtered;
}

export function applyAllFilters(items, filters) {
  const { search, searchFields, statusFilter, selectedStatuses, dateRangeStart, dateRangeEnd } = filters;
  
  let filtered = applySearchFilter(items, search, searchFields);
  filtered = applyStatusFilter(filtered, statusFilter, selectedStatuses);
  filtered = applyDateRangeFilter(filtered, dateRangeStart, dateRangeEnd);
  
  return filtered;
}


