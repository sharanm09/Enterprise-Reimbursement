import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Layout from './Layout';

describe('Layout Component', () => {
  const mockUser = {
    displayName: 'John Doe',
    role: {
      name: 'employee',
      displayName: 'Employee'
    }
  };

  const mockOnLogout = jest.fn();
  const mockOnNavigate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render layout with children', () => {
    render(
      <Layout user={mockUser} onLogout={mockOnLogout} onNavigate={mockOnNavigate}>
        <div>Test Content</div>
      </Layout>
    );
    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('should display user information', () => {
    render(
      <Layout user={mockUser} onLogout={mockOnLogout} onNavigate={mockOnNavigate}>
        <div>Test</div>
      </Layout>
    );
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Employee')).toBeInTheDocument();
  });

  it('should call onLogout when logout button is clicked', () => {
    render(
      <Layout user={mockUser} onLogout={mockOnLogout} onNavigate={mockOnNavigate}>
        <div>Test</div>
      </Layout>
    );
    
    const userButton = screen.getByText('John Doe').closest('button');
    fireEvent.click(userButton);
    
    const logoutButton = screen.getByText('Logout');
    fireEvent.click(logoutButton);
    
    expect(mockOnLogout).toHaveBeenCalledTimes(1);
  });

  it('should handle navigation when menu item is clicked', () => {
    render(
      <Layout user={mockUser} onLogout={mockOnLogout} onNavigate={mockOnNavigate} currentPage="dashboard">
        <div>Test</div>
      </Layout>
    );
    
    const dashboardButton = screen.getByText('Dashboard');
    fireEvent.click(dashboardButton);
    
    expect(mockOnNavigate).toHaveBeenCalledWith('/dashboard');
  });

  it('should show correct navigation items for employee role', () => {
    render(
      <Layout user={mockUser} onLogout={mockOnLogout} onNavigate={mockOnNavigate}>
        <div>Test</div>
      </Layout>
    );
    
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('My Reimbursements')).toBeInTheDocument();
    expect(screen.queryByText('User Management')).not.toBeInTheDocument();
  });

  it('should show admin navigation items for superadmin role', () => {
    const adminUser = {
      ...mockUser,
      role: {
        name: 'superadmin',
        displayName: 'Super Admin'
      }
    };
    
    render(
      <Layout user={adminUser} onLogout={mockOnLogout} onNavigate={mockOnNavigate}>
        <div>Test</div>
      </Layout>
    );
    
    expect(screen.getByText('User Management')).toBeInTheDocument();
    expect(screen.getByText('Departments')).toBeInTheDocument();
  });
});



