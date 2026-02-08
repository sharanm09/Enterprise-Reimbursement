const {
  parseRequestData,
  validateItems,
  calculateTotalAmount,
  determineReimbursementStatus
} = require('../../routes/reimbursements-validation-helpers');
const logger = require('../../utils/logger');

jest.mock('../../utils/logger', () => ({
  warn: jest.fn()
}));

describe('Reimbursements Validation Helpers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('parseRequestData', () => {
    test('should parse JSON string from req.body.data', () => {
      const req = {
        body: {
          data: JSON.stringify({ items: [{ amount: 100 }] })
        }
      };

      const result = parseRequestData(req);

      expect(result).toEqual({ items: [{ amount: 100 }] });
    });

    test('should use req.body directly when not a string', () => {
      const req = {
        body: { items: [{ amount: 100 }] }
      };

      const result = parseRequestData(req);

      expect(result).toEqual({ items: [{ amount: 100 }] });
    });

    test('should handle invalid JSON gracefully', () => {
      const req = {
        body: {
          data: 'invalid json{'
        }
      };

      const result = parseRequestData(req);

      expect(result).toEqual({ data: 'invalid json{' });
      expect(logger.warn).toHaveBeenCalled();
    });
  });

  describe('validateItems', () => {
    test('should return valid for non-empty array', () => {
      const result = validateItems([{ amount: 100 }]);

      expect(result.valid).toBe(true);
    });

    test('should return invalid for empty array', () => {
      const result = validateItems([]);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('required');
    });

    test('should return invalid for null', () => {
      const result = validateItems(null);

      expect(result.valid).toBe(false);
    });

    test('should return invalid for undefined', () => {
      const result = validateItems(undefined);

      expect(result.valid).toBe(false);
    });

    test('should return invalid for non-array', () => {
      const result = validateItems({});

      expect(result.valid).toBe(false);
    });
  });

  describe('calculateTotalAmount', () => {
    test('should calculate total for valid items', () => {
      const items = [
        { amount: 100 },
        { amount: 200 },
        { amount: 50 }
      ];

      const result = calculateTotalAmount(items);

      expect(result.valid).toBe(true);
      expect(result.totalAmount).toBe(350);
    });

    test('should handle string amounts', () => {
      const items = [
        { amount: '100.50' },
        { amount: '200.25' }
      ];

      const result = calculateTotalAmount(items);

      expect(result.valid).toBe(true);
      expect(result.totalAmount).toBe(300.75);
    });

    test('should throw error for invalid amount', () => {
      const items = [
        { amount: 'invalid' }
      ];

      expect(() => calculateTotalAmount(items)).toThrow('Invalid amount');
    });

    test('should throw error for negative amount', () => {
      const items = [
        { amount: -100 }
      ];

      expect(() => calculateTotalAmount(items)).toThrow('Invalid amount');
    });

    test('should return invalid for zero total', () => {
      const items = [
        { amount: 0 }
      ];

      const result = calculateTotalAmount(items);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('greater than 0');
    });

    test('should handle missing amount as 0', () => {
      const items = [
        { amount: 100 },
        {}
      ];

      const result = calculateTotalAmount(items);

      expect(result.valid).toBe(true);
      expect(result.totalAmount).toBe(100);
    });
  });

  describe('determineReimbursementStatus', () => {
    test('should return pending approval for submitted status', () => {
      const result = determineReimbursementStatus('submitted');

      expect(result).toBe('pending approval');
    });

    test('should return original status for other values', () => {
      expect(determineReimbursementStatus('draft')).toBe('draft');
      expect(determineReimbursementStatus('approved')).toBe('approved');
      expect(determineReimbursementStatus('rejected')).toBe('rejected');
    });
  });
});
