import { getStatusColor, getStatusLabel, getMasterDataStatusColor } from '../../utils/statusUtils';

describe('statusUtils', () => {
  describe('getStatusColor', () => {
    it('should return default color for null status', () => {
      const result = getStatusColor(null);
      expect(result).toContain('slate');
    });

    it('should return default color for undefined status', () => {
      const result = getStatusColor(undefined);
      expect(result).toContain('slate');
    });

    it('should return pending color for pending status', () => {
      const result = getStatusColor('pending');
      expect(result).toContain('amber');
    });

    it('should return approved color for approved_by_manager', () => {
      const result = getStatusColor('approved_by_manager');
      expect(result).toContain('green');
    });

    it('should return approved color for approved_by_hr', () => {
      const result = getStatusColor('approved_by_hr');
      expect(result).toContain('green');
    });

    it('should return approved color for approved_by_finance', () => {
      const result = getStatusColor('approved_by_finance');
      expect(result).toContain('indigo');
    });

    it('should return paid color for paid status', () => {
      const result = getStatusColor('paid');
      expect(result).toContain('emerald');
    });

    it('should return rejected color for rejected statuses', () => {
      expect(getStatusColor('rejected_by_manager')).toContain('red');
      expect(getStatusColor('rejected_by_hr')).toContain('red');
      expect(getStatusColor('rejected_by_finance')).toContain('red');
    });

    it('should handle case insensitive status', () => {
      expect(getStatusColor('PENDING')).toContain('amber');
      expect(getStatusColor('Approved_By_Manager')).toContain('green');
    });

    it('should return default color for unknown status', () => {
      const result = getStatusColor('unknown_status');
      expect(result).toContain('indigo');
    });

    it('should handle type parameter for hr type', () => {
      const result = getStatusColor('approved_by_manager', 'hr');
      expect(result).toContain('blue');
    });

    it('should handle type parameter for finance type', () => {
      const result = getStatusColor('approved_by_manager', 'finance');
      expect(result).toContain('blue');
    });
  });

  describe('getStatusLabel', () => {
    it('should return Unknown for null', () => {
      expect(getStatusLabel(null)).toBe('Unknown');
    });

    it('should return Unknown for undefined', () => {
      expect(getStatusLabel(undefined)).toBe('Unknown');
    });

    it('should return correct label for pending', () => {
      expect(getStatusLabel('pending')).toBe('Pending');
    });

    it('should return correct label for approved_by_manager', () => {
      expect(getStatusLabel('approved_by_manager')).toBe('Approved by Manager');
    });

    it('should return correct label for rejected_by_manager', () => {
      expect(getStatusLabel('rejected_by_manager')).toBe('Rejected by Manager');
    });

    it('should return correct label for approved_by_hr', () => {
      expect(getStatusLabel('approved_by_hr')).toBe('Approved by HR');
    });

    it('should return correct label for rejected_by_hr', () => {
      expect(getStatusLabel('rejected_by_hr')).toBe('Rejected by HR');
    });

    it('should return correct label for approved_by_finance', () => {
      expect(getStatusLabel('approved_by_finance')).toBe('Approved by Finance');
    });

    it('should return correct label for rejected_by_finance', () => {
      expect(getStatusLabel('rejected_by_finance')).toBe('Rejected by Finance');
    });

    it('should return correct label for paid', () => {
      expect(getStatusLabel('paid')).toBe('Paid');
    });

    it('should handle case insensitive status', () => {
      expect(getStatusLabel('PENDING')).toBe('Pending');
      expect(getStatusLabel('Approved_By_Manager')).toBe('Approved by Manager');
    });

    it('should return Rejected for any rejected status', () => {
      expect(getStatusLabel('rejected_something')).toBe('Rejected');
    });

    it('should return original status for unknown status', () => {
      expect(getStatusLabel('unknown_status')).toBe('unknown_status');
    });
  });

  describe('getMasterDataStatusColor', () => {
    it('should return green for active status', () => {
      const result = getMasterDataStatusColor('active');
      expect(result).toContain('green');
    });

    it('should return red for inactive status', () => {
      const result = getMasterDataStatusColor('inactive');
      expect(result).toContain('red');
    });

    it('should return red for any non-active status', () => {
      expect(getMasterDataStatusColor('deleted')).toContain('red');
      expect(getMasterDataStatusColor('')).toContain('red');
    });
  });
});

