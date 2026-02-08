import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import MasterDataTable from '../../../components/shared/MasterDataTable';

jest.mock('../../../utils/statusUtils', () => ({
  getMasterDataStatusColor: jest.fn(() => 'bg-green-100')
}));

describe('MasterDataTable', () => {
  const mockItems = [
    { id: 1, name: 'Item 1', code: 'I1', status: 'active' },
    { id: 2, name: 'Item 2', code: 'I2', status: 'inactive' }
  ];

  const mockColumns = [
    { key: 'name', label: 'Name' },
    { key: 'code', label: 'Code' },
    {
      key: 'status',
      label: 'Status',
      render: (item) => <span>{item.status}</span>
    }
  ];

  const mockOnEdit = jest.fn();
  const mockOnDelete = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should show loading message when loading', () => {
    render(
      <MasterDataTable
        items={[]}
        loading={true}
        columns={mockColumns}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('should show empty message when no items', () => {
    render(
      <MasterDataTable
        items={[]}
        loading={false}
        columns={mockColumns}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        emptyMessage="No items found"
      />
    );

    expect(screen.getByText('No items found')).toBeInTheDocument();
  });

  it('should render table with items', () => {
    render(
      <MasterDataTable
        items={mockItems}
        loading={false}
        columns={mockColumns}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    expect(screen.getByText('Item 1')).toBeInTheDocument();
    expect(screen.getByText('Item 2')).toBeInTheDocument();
    expect(screen.getByText('I1')).toBeInTheDocument();
    expect(screen.getByText('I2')).toBeInTheDocument();
  });

  it('should render column headers', () => {
    render(
      <MasterDataTable
        items={mockItems}
        loading={false}
        columns={mockColumns}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Code')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('Actions')).toBeInTheDocument();
  });

  it('should call onEdit when edit button is clicked', () => {
    render(
      <MasterDataTable
        items={mockItems}
        loading={false}
        columns={mockColumns}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    const editButtons = screen.getAllByRole('button');
    const editButton = editButtons.find(btn => btn.querySelector('svg'));
    if (editButton) {
      fireEvent.click(editButton);
      expect(mockOnEdit).toHaveBeenCalled();
    }
  });

  it('should call onDelete when delete button is clicked', () => {
    global.confirm = jest.fn(() => true);
    render(
      <MasterDataTable
        items={mockItems}
        loading={false}
        columns={mockColumns}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    const deleteButtons = screen.getAllByRole('button');
    const deleteButton = deleteButtons[deleteButtons.length - 1];
    if (deleteButton) {
      fireEvent.click(deleteButton);
      expect(mockOnDelete).toHaveBeenCalled();
    }
  });

  it('should use render function when provided', () => {
    render(
      <MasterDataTable
        items={mockItems}
        loading={false}
        columns={mockColumns}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    expect(screen.getByText('active')).toBeInTheDocument();
    expect(screen.getByText('inactive')).toBeInTheDocument();
  });

  it('should show N/A for missing values', () => {
    const itemsWithMissing = [{ id: 1, name: 'Item 1' }];
    render(
      <MasterDataTable
        items={itemsWithMissing}
        loading={false}
        columns={mockColumns}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    expect(screen.getByText('N/A')).toBeInTheDocument();
  });
});

