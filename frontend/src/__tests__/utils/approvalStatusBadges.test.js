import React from 'react';
import { render } from '@testing-library/react';
import { getManagerStatusBadge, getHRStatusBadge } from '../../utils/approvalStatusBadges';

describe('approvalStatusBadges', () => {
  describe('getManagerStatusBadge', () => {
    it('should return pending badge for pending status', () => {
      const badge = getManagerStatusBadge('pending');
      const { container } = render(badge);
      expect(container.textContent).toBe('Pending');
    });

    it('should return approved badge for approved_by_manager', () => {
      const badge = getManagerStatusBadge('approved_by_manager');
      const { container } = render(badge);
      expect(container.textContent).toBe('Approved by Manager');
    });

    it('should return rejected badge for rejected_by_manager', () => {
      const badge = getManagerStatusBadge('rejected_by_manager');
      const { container } = render(badge);
      expect(container.textContent).toBe('Rejected by Manager');
    });

    it('should return generic badge for unknown status', () => {
      const badge = getManagerStatusBadge('unknown_status');
      const { container } = render(badge);
      expect(container.textContent).toBe('unknown_status');
    });

    it('should return null for null status', () => {
      const badge = getManagerStatusBadge(null);
      expect(badge).toBeNull();
    });

    it('should return null for empty string', () => {
      const badge = getManagerStatusBadge('');
      expect(badge).toBeNull();
    });

    it('should return null for undefined status', () => {
      const badge = getManagerStatusBadge(undefined);
      expect(badge).toBeNull();
    });
  });

  describe('getHRStatusBadge', () => {
    it('should return approved badge for approved_by_manager', () => {
      const badge = getHRStatusBadge('approved_by_manager');
      const { container } = render(badge);
      expect(container.textContent).toBe('Approved by Manager');
    });

    it('should return approved badge for approved_by_hr', () => {
      const badge = getHRStatusBadge('approved_by_hr');
      const { container } = render(badge);
      expect(container.textContent).toBe('Approved by HR');
    });

    it('should return rejected badge for rejected_by_hr', () => {
      const badge = getHRStatusBadge('rejected_by_hr');
      const { container } = render(badge);
      expect(container.textContent).toBe('Rejected by HR');
    });

    it('should return generic badge for unknown status', () => {
      const badge = getHRStatusBadge('unknown_status');
      const { container } = render(badge);
      expect(container.textContent).toBe('unknown_status');
    });

    it('should return null for null status', () => {
      const badge = getHRStatusBadge(null);
      expect(badge).toBeNull();
    });

    it('should return null for empty string', () => {
      const badge = getHRStatusBadge('');
      expect(badge).toBeNull();
    });

    it('should return null for undefined status', () => {
      const badge = getHRStatusBadge(undefined);
      expect(badge).toBeNull();
    });

    it('should return null for pending status', () => {
      const badge = getHRStatusBadge('pending');
      expect(badge).toBeNull();
    });
  });
});

