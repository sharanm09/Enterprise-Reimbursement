import React from 'react';
import { render, screen } from '@testing-library/react';
import ManageCostCenters from '../../pages/ManageCostCenters';
import { useMasterDataCRUD } from '../../utils/useMasterDataCRUD';
import { useMasterDataFilters } from '../../utils/useMasterDataFilters';
import axios from 'axios';

jest.mock('../../utils/useMasterDataCRUD');
jest.mock('../../utils/useMasterDataFilters');
jest.mock('axios');
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

describe('ManageCostCenters', () => {
  const mockUseMasterDataCRUD = {
    allItems: [],
    loading: false,
    showModal: false,
    setShowModal: jest.fn(),
    editingItem: null,
    formData: { name: '', code: '', description: '', status: 'active', department_id: '' },
    setFormData: jest.fn(),
    handleSubmit: jest.fn(),
    handleEdit: jest.fn(),
    handleDelete: jest.fn(),
    openAddModal: jest.fn(),
    fetchItems: jest.fn()
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
    process.env.REACT_APP_API_URL = 'http://localhost:3001';
    axios.get.mockResolvedValue({ data: { success: true, data: [] } });
    useMasterDataCRUD.mockReturnValue(mockUseMasterDataCRUD);
    useMasterDataFilters.mockReturnValue(mockUseMasterDataFilters);
  });

  it('should render title and description', () => {
    render(<ManageCostCenters />);
    expect(screen.getByText('Cost Centers')).toBeInTheDocument();
    expect(screen.getByText(/Manage cost center information/i)).toBeInTheDocument();
  });

  it('should render add button', () => {
    render(<ManageCostCenters />);
    expect(screen.getByText('Add Cost Center')).toBeInTheDocument();
  });

  it('should render department filter', () => {
    render(<ManageCostCenters />);
    expect(screen.getByText('All Departments')).toBeInTheDocument();
  });
});

