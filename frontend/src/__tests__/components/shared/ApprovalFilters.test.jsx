import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ApprovalFilters from '../../../components/shared/ApprovalFilters';

describe('ApprovalFilters', () => {
  const mockSetSearchQuery = jest.fn();
  const mockSetShowAdvancedFilters = jest.fn();
  const mockSetStatusFilter = jest.fn();
  const mockSetDateRangeStart = jest.fn();
  const mockSetDateRangeEnd = jest.fn();
  const mockClearFilters = jest.fn();

  const defaultProps = {
    searchQuery: '',
    setSearchQuery: mockSetSearchQuery,
    showAdvancedFilters: false,
    setShowAdvancedFilters: mockSetShowAdvancedFilters,
    statusFilter: 'all',
    setStatusFilter: mockSetStatusFilter,
    dateRangeStart: '',
    setDateRangeStart: mockSetDateRangeStart,
    dateRangeEnd: '',
    setDateRangeEnd: mockSetDateRangeEnd,
    clearFilters: mockClearFilters,
    statusOptions: ['all', 'pending', 'approved', 'rejected']
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render search input', () => {
    render(<ApprovalFilters {...defaultProps} />);
    expect(screen.getByPlaceholderText(/Search by employee/i)).toBeInTheDocument();
  });

  it('should call setSearchQuery when typing', () => {
    render(<ApprovalFilters {...defaultProps} />);
    const input = screen.getByPlaceholderText(/Search by employee/i);
    fireEvent.change(input, { target: { value: 'test' } });
    expect(mockSetSearchQuery).toHaveBeenCalledWith('test');
  });

  it('should show clear button when searchQuery has value', () => {
    render(<ApprovalFilters {...defaultProps} searchQuery="test" />);
    const clearButton = screen.getByRole('button', { name: '' });
    expect(clearButton).toBeInTheDocument();
  });

  it('should clear search when clear button is clicked', () => {
    render(<ApprovalFilters {...defaultProps} searchQuery="test" />);
    const clearButton = screen.getByRole('button', { name: '' });
    fireEvent.click(clearButton);
    expect(mockSetSearchQuery).toHaveBeenCalledWith('');
  });

  it('should toggle advanced filters', () => {
    render(<ApprovalFilters {...defaultProps} />);
    const toggleButton = screen.getByText('Advanced Filters');
    fireEvent.click(toggleButton);
    expect(mockSetShowAdvancedFilters).toHaveBeenCalledWith(true);
  });

  it('should show advanced filters when showAdvancedFilters is true', () => {
    render(<ApprovalFilters {...defaultProps} showAdvancedFilters={true} />);
    expect(screen.getByLabelText(/Status/i)).toBeInTheDocument();
  });

  it('should call setStatusFilter when status changes', () => {
    render(<ApprovalFilters {...defaultProps} showAdvancedFilters={true} />);
    const statusSelect = screen.getByLabelText(/Status/i);
    fireEvent.change(statusSelect, { target: { value: 'pending' } });
    expect(mockSetStatusFilter).toHaveBeenCalledWith('pending');
  });

  it('should call setDateRangeStart when start date changes', () => {
    render(<ApprovalFilters {...defaultProps} showAdvancedFilters={true} />);
    const startDateInput = screen.getByLabelText(/Start Date/i);
    fireEvent.change(startDateInput, { target: { value: '2024-01-01' } });
    expect(mockSetDateRangeStart).toHaveBeenCalledWith('2024-01-01');
  });

  it('should call setDateRangeEnd when end date changes', () => {
    render(<ApprovalFilters {...defaultProps} showAdvancedFilters={true} />);
    const endDateInput = screen.getByLabelText(/End Date/i);
    fireEvent.change(endDateInput, { target: { value: '2024-12-31' } });
    expect(mockSetDateRangeEnd).toHaveBeenCalledWith('2024-12-31');
  });
});

