import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import MasterDataFilters from '../../../components/shared/MasterDataFilters';

describe('MasterDataFilters', () => {
  const mockSetSearch = jest.fn();
  const mockSetShowAdvancedFilters = jest.fn();
  const mockHandleStatusToggle = jest.fn();
  const mockSetDateRangeStart = jest.fn();
  const mockSetDateRangeEnd = jest.fn();
  const mockClearFilters = jest.fn();

  const defaultProps = {
    search: '',
    setSearch: mockSetSearch,
    showAdvancedFilters: false,
    setShowAdvancedFilters: mockSetShowAdvancedFilters,
    selectedStatuses: [],
    handleStatusToggle: mockHandleStatusToggle,
    dateRangeStart: '',
    setDateRangeStart: mockSetDateRangeStart,
    dateRangeEnd: '',
    setDateRangeEnd: mockSetDateRangeEnd,
    clearFilters: mockClearFilters,
    statusOptions: ['active', 'inactive']
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render search input', () => {
    render(<MasterDataFilters {...defaultProps} />);
    expect(screen.getByPlaceholderText(/Search/i)).toBeInTheDocument();
  });

  it('should call setSearch when typing', () => {
    render(<MasterDataFilters {...defaultProps} />);
    const input = screen.getByPlaceholderText(/Search/i);
    fireEvent.change(input, { target: { value: 'test' } });
    expect(mockSetSearch).toHaveBeenCalledWith('test');
  });

  it('should toggle advanced filters', () => {
    render(<MasterDataFilters {...defaultProps} />);
    const toggleButton = screen.getByText(/Advanced Filters/i);
    fireEvent.click(toggleButton);
    expect(mockSetShowAdvancedFilters).toHaveBeenCalledWith(true);
  });

  it('should show advanced filters when showAdvancedFilters is true', () => {
    render(<MasterDataFilters {...defaultProps} showAdvancedFilters={true} />);
    expect(screen.getByText(/Status/i)).toBeInTheDocument();
  });

  it('should call handleStatusToggle when status is clicked', () => {
    render(<MasterDataFilters {...defaultProps} showAdvancedFilters={true} />);
    const statusButton = screen.getByText('active');
    fireEvent.click(statusButton);
    expect(mockHandleStatusToggle).toHaveBeenCalledWith('active');
  });

  it('should call clearFilters when clear button is clicked', () => {
    render(<MasterDataFilters {...defaultProps} showAdvancedFilters={true} />);
    const clearButton = screen.getByText(/Clear Filters/i);
    fireEvent.click(clearButton);
    expect(mockClearFilters).toHaveBeenCalled();
  });
});

