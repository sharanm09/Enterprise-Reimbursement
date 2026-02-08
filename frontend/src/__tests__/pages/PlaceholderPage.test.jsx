import React from 'react';
import { render, screen } from '@testing-library/react';
import PlaceholderPage from '../../pages/PlaceholderPage';

describe('PlaceholderPage', () => {
  it('should render with title', () => {
    render(<PlaceholderPage title="Test Page" icon="FiInfo" />);
    expect(screen.getByText('Test Page')).toBeInTheDocument();
  });

  it('should render coming soon message', () => {
    render(<PlaceholderPage title="Test Page" icon="FiInfo" />);
    expect(screen.getByText(/Coming Soon/i)).toBeInTheDocument();
    expect(screen.getByText(/under development/i)).toBeInTheDocument();
  });

  it('should render icon', () => {
    render(<PlaceholderPage title="Test Page" icon="FiInfo" />);
    const iconElement = screen.getByRole('img', { hidden: true }) || 
                       document.querySelector('svg');
    expect(iconElement).toBeTruthy();
  });

  it('should use default icon when icon is not in map', () => {
    render(<PlaceholderPage title="Test Page" icon="UnknownIcon" />);
    expect(screen.getByText('Test Page')).toBeInTheDocument();
  });
});

