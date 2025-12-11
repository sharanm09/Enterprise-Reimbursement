import { formatDate, formatCurrency } from '../../utils/formatUtils';

describe('formatUtils', () => {
  describe('formatDate', () => {
    it('should format a valid date string', () => {
      const dateString = '2024-01-15T10:30:00Z';
      const result = formatDate(dateString);
      expect(result).toBeTruthy();
      expect(typeof result).toBe('string');
      expect(result).not.toBe('N/A');
    });

    it('should return N/A for null', () => {
      expect(formatDate(null)).toBe('N/A');
    });

    it('should return N/A for undefined', () => {
      expect(formatDate(undefined)).toBe('N/A');
    });

    it('should return N/A for empty string', () => {
      expect(formatDate('')).toBe('N/A');
    });

    it('should format different date formats', () => {
      expect(formatDate('2024-12-25')).toBeTruthy();
      expect(formatDate('2024-01-01T00:00:00.000Z')).toBeTruthy();
    });
  });

  describe('formatCurrency', () => {
    it('should format positive numbers', () => {
      const result = formatCurrency(100);
      expect(result).toContain('$');
      expect(result).toContain('100');
    });

    it('should format zero', () => {
      const result = formatCurrency(0);
      expect(result).toContain('$');
      expect(result).toContain('0');
    });

    it('should format decimal numbers', () => {
      const result = formatCurrency(99.99);
      expect(result).toContain('$');
      expect(result).toContain('99.99');
    });

    it('should handle null', () => {
      const result = formatCurrency(null);
      expect(result).toContain('$');
      expect(result).toContain('0');
    });

    it('should handle undefined', () => {
      const result = formatCurrency(undefined);
      expect(result).toContain('$');
      expect(result).toContain('0');
    });

    it('should format large numbers', () => {
      const result = formatCurrency(1000000);
      expect(result).toContain('$');
      expect(result).toContain('1,000,000');
    });

    it('should format negative numbers', () => {
      const result = formatCurrency(-100);
      expect(result).toContain('$');
      expect(result).toContain('-');
    });
  });
});

