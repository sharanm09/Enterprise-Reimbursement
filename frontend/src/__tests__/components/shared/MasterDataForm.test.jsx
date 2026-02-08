import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import MasterDataForm from '../../../components/shared/MasterDataForm';

describe('MasterDataForm', () => {
  const mockFormData = {
    name: '',
    code: '',
    description: '',
    status: 'active'
  };

  const mockSetFormData = jest.fn();
  const mockHandleSubmit = jest.fn((e) => e.preventDefault());
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render form with title', () => {
    render(
      <MasterDataForm
        title="Add Department"
        editingItem={null}
        formData={mockFormData}
        setFormData={mockSetFormData}
        handleSubmit={mockHandleSubmit}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText('Add Department')).toBeInTheDocument();
  });

  it('should render edit title when editing', () => {
    render(
      <MasterDataForm
        title="Edit Department"
        editingItem={{ id: 1 }}
        formData={mockFormData}
        setFormData={mockSetFormData}
        handleSubmit={mockHandleSubmit}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText('Edit Department')).toBeInTheDocument();
  });

  it('should render common fields', () => {
    render(
      <MasterDataForm
        title="Add Department"
        editingItem={null}
        formData={mockFormData}
        setFormData={mockSetFormData}
        handleSubmit={mockHandleSubmit}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByLabelText(/Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Code/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Description/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Status/i)).toBeInTheDocument();
  });

  it('should call setFormData when name changes', () => {
    render(
      <MasterDataForm
        title="Add Department"
        editingItem={null}
        formData={mockFormData}
        setFormData={mockSetFormData}
        handleSubmit={mockHandleSubmit}
        onClose={mockOnClose}
      />
    );

    const nameInput = screen.getByLabelText(/Name/i);
    fireEvent.change(nameInput, { target: { value: 'Test Name' } });

    expect(mockSetFormData).toHaveBeenCalledWith({
      ...mockFormData,
      name: 'Test Name'
    });
  });

  it('should call setFormData when code changes', () => {
    render(
      <MasterDataForm
        title="Add Department"
        editingItem={null}
        formData={mockFormData}
        setFormData={mockSetFormData}
        handleSubmit={mockHandleSubmit}
        onClose={mockOnClose}
      />
    );

    const codeInput = screen.getByLabelText(/Code/i);
    fireEvent.change(codeInput, { target: { value: 'test' } });

    expect(mockSetFormData).toHaveBeenCalledWith({
      ...mockFormData,
      code: 'TEST'
    });
  });

  it('should call handleSubmit when form is submitted', () => {
    render(
      <MasterDataForm
        title="Add Department"
        editingItem={null}
        formData={mockFormData}
        setFormData={mockSetFormData}
        handleSubmit={mockHandleSubmit}
        onClose={mockOnClose}
      />
    );

    const form = screen.getByRole('form') || screen.getByText('Create').closest('form');
    if (form) {
      fireEvent.submit(form);
      expect(mockHandleSubmit).toHaveBeenCalled();
    } else {
      const submitButton = screen.getByText('Create');
      fireEvent.click(submitButton);
      expect(mockHandleSubmit).toHaveBeenCalled();
    }
  });

  it('should call onClose when cancel is clicked', () => {
    render(
      <MasterDataForm
        title="Add Department"
        editingItem={null}
        formData={mockFormData}
        setFormData={mockSetFormData}
        handleSubmit={mockHandleSubmit}
        onClose={mockOnClose}
      />
    );

    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should show Update button when editing', () => {
    render(
      <MasterDataForm
        title="Edit Department"
        editingItem={{ id: 1 }}
        formData={mockFormData}
        setFormData={mockSetFormData}
        handleSubmit={mockHandleSubmit}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText('Update')).toBeInTheDocument();
  });

  it('should show Create button when not editing', () => {
    render(
      <MasterDataForm
        title="Add Department"
        editingItem={null}
        formData={mockFormData}
        setFormData={mockSetFormData}
        handleSubmit={mockHandleSubmit}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText('Create')).toBeInTheDocument();
  });

  it('should render custom fields', () => {
    const customField = <div data-testid="custom-field">Custom Field</div>;
    render(
      <MasterDataForm
        title="Add Project"
        editingItem={null}
        formData={{ ...mockFormData, start_date: '' }}
        setFormData={mockSetFormData}
        handleSubmit={mockHandleSubmit}
        onClose={mockOnClose}
        customFields={[customField]}
      />
    );

    expect(screen.getByTestId('custom-field')).toBeInTheDocument();
  });
});

