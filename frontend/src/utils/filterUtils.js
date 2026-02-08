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

function getItemDate(item) {
  return new Date(item.created_at || item.updated_at);
}

function filterByStartDate(items, dateRangeStart) {
  if (!dateRangeStart) {
    return items;
  }
  const startDate = new Date(dateRangeStart);
  return items.filter(item => {
    const itemDate = getItemDate(item);
    return itemDate >= startDate;
  });
}

function filterByEndDate(items, dateRangeEnd) {
  if (!dateRangeEnd) {
    return items;
  }
  const endDate = new Date(dateRangeEnd);
  endDate.setHours(23, 59, 59, 999);
  return items.filter(item => {
    const itemDate = getItemDate(item);
    return itemDate <= endDate;
  });
}

export function applyDateRangeFilter(items, dateRangeStart, dateRangeEnd) {
  let filtered = [...items];
  filtered = filterByStartDate(filtered, dateRangeStart);
  filtered = filterByEndDate(filtered, dateRangeEnd);
  return filtered;
}

function applyFilterChain(items, filterFunctions) {
  return filterFunctions.reduce((filteredItems, filterFn) => filterFn(filteredItems), items);
}

export function applyAllFilters(items, filters) {
  const { search, searchFields, statusFilter, selectedStatuses, dateRangeStart, dateRangeEnd } = filters;
  
  const filterChain = [
    (items) => applySearchFilter(items, search, searchFields),
    (items) => applyStatusFilter(items, statusFilter, selectedStatuses),
    (items) => applyDateRangeFilter(items, dateRangeStart, dateRangeEnd)
  ];
  
  return applyFilterChain(items, filterChain);
}


