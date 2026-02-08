import React from 'react';
import { render, screen } from '@testing-library/react';
import ManageProjects from '../../pages/ManageProjects';
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
  return function MockMasterDataTable() {
    return <div data-testid="master-data-table">Table</div>;
  };
});
jest.mock('../../components/shared/MasterDataForm', () => {
  return function MockMasterDataForm() {
    return <div data-testid="master-data-form">Form</div>;
  };
});

describe('ManageProjects', () => {
  const mockUseMasterDataCRUD = {
    allItems: [],
    loading: false,
    showModal: false,
    setShowModal: jest.fn(),
    editingItem: null,
    formData: { name: '', code: '', description: '', status: 'active', start_date: '', end_date: '' },
    setFormData: jest.fn(),
    handleSubmit: jest.fn(),
    handleEdit: jest.fn(),
    handleDelete: jest.fn(),
    openAddModal: jest.fn()
  };

  const mockUseMasterDataFilters = {
    items: [],
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
    render(<ManageProjects />);
    expect(screen.getByText('Projects')).toBeInTheDocument();
    expect(screen.getByText(/Manage project information/i)).toBeInTheDocument();
  });

  it('should render add button', () => {
    render(<ManageProjects />);
    expect(screen.getByText('Add Project')).toBeInTheDocument();
  });
});

