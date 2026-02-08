import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import ManageDepartments from '../../pages/ManageDepartments';
import { useMasterDataCRUD } from '../../utils/useMasterDataCRUD';
import { useMasterDataFilters } from '../../utils/useMasterDataFilters';

jest.mock('../../utils/useMasterDataCRUD');
jest.mock('../../utils/useMasterDataFilters');
jest.mock('../../components/shared/MasterDataFilters', () => {
  return function MockMasterDataFilters() {
    return <div data-testid="master-data-filters">Filters</div>;
  };
});
jest.mock('../../components/shared/MasterDataTable', () => {
  return function MockMasterDataTable({ items, loading }) {
    if (loading) return <div>Loading...</div>;
    return <div data-testid="master-data-table">{items.length} items</div>;
  };
});
jest.mock('../../components/shared/MasterDataForm', () => {
  return function MockMasterDataForm({ title }) {
    return <div data-testid="master-data-form">{title}</div>;
  };
});

describe('ManageDepartments', () => {
  const mockUseMasterDataCRUD = {
    allItems: [{ id: 1, name: 'Dept 1', code: 'D1', status: 'active' }],
    loading: false,
    showModal: false,
    setShowModal: jest.fn(),
    editingItem: null,
    formData: { name: '', code: '', description: '', status: 'active' },
    setFormData: jest.fn(),
    handleSubmit: jest.fn(),
    handleEdit: jest.fn(),
    handleDelete: jest.fn(),
    openAddModal: jest.fn()
  };

  const mockUseMasterDataFilters = {
    items: [{ id: 1, name: 'Dept 1', code: 'D1', status: 'active' }],
    search: '',
    setSearch: jest.fn(),
    statusFilter: 'all',
    setStatusFilter: jest.fn(),
    selectedStatuses: [],
    handleStatusToggle: jest.fn(),
    dateRangeStart: '',
    setDateRangeStart: jest.fn(),
    dateRangeEnd: '',
    setDateRangeEnd: jest.fn(),
    showAdvancedFilters: false,
    setShowAdvancedFilters: jest.fn(),
    clearFilters: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    useMasterDataCRUD.mockReturnValue(mockUseMasterDataCRUD);
    useMasterDataFilters.mockReturnValue(mockUseMasterDataFilters);
  });

  it('should render title and description', () => {
    render(<ManageDepartments />);
    expect(screen.getByText('Departments')).toBeInTheDocument();
    expect(screen.getByText(/Manage department information/i)).toBeInTheDocument();
  });

  it('should render add button', () => {
    render(<ManageDepartments />);
    expect(screen.getByText('Add Department')).toBeInTheDocument();
  });

  it('should render filters', () => {
    render(<ManageDepartments />);
    expect(screen.getByTestId('master-data-filters')).toBeInTheDocument();
  });

  it('should render table', () => {
    render(<ManageDepartments />);
    expect(screen.getByTestId('master-data-table')).toBeInTheDocument();
  });

  it('should show form when modal is open', () => {
    useMasterDataCRUD.mockReturnValue({
      ...mockUseMasterDataCRUD,
      showModal: true
    });

    render(<ManageDepartments />);
    expect(screen.getByTestId('master-data-form')).toBeInTheDocument();
  });
});

