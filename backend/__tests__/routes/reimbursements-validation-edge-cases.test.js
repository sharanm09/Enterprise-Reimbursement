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

describe('Reimbursements Validation Helpers Edge Cases', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('parseRequestData', () => {
    test('should handle req.body.data as object', () => {
      const req = {
        body: {
          data: { items: [{ amount: 100 }] }
        }
      };

      const result = parseRequestData(req);

      expect(result).toEqual({ items: [{ amount: 100 }] });
    });

    test('should handle malformed JSON string', () => {
      const req = {
        body: {
          data: '{invalid json'
        }
      };

      const result = parseRequestData(req);

      expect(result).toEqual({ data: '{invalid json' });
      expect(logger.warn).toHaveBeenCalled();
    });

    test('should handle nested JSON strings', () => {
      const req = {
        body: {
          data: JSON.stringify({ items: [{ amount: 100 }], nested: { value: 'test' } })
        }
      };

      const result = parseRequestData(req);

      expect(result.items).toHaveLength(1);
      expect(result.nested.value).toBe('test');
    });
  });

  describe('validateItems', () => {
    test('should return invalid for array with null elements', () => {
      const result = validateItems([null, undefined]);

      expect(result.valid).toBe(false);
    });

    test('should return invalid for array-like object', () => {
      const result = validateItems({ length: 1, 0: { amount: 100 } });

      expect(result.valid).toBe(false);
    });
  });

  describe('calculateTotalAmount', () => {
    test('should handle very large amounts', () => {
      const items = [
        { amount: '999999999.99' },
        { amount: '0.01' }
      ];

      const result = calculateTotalAmount(items);

      expect(result.valid).toBe(true);
      expect(result.totalAmount).toBe(1000000000);
    });

    test('should handle decimal precision', () => {
      const items = [
        { amount: '100.999' },
        { amount: '200.001' }
      ];

      const result = calculateTotalAmount(items);

      expect(result.valid).toBe(true);
      expect(result.totalAmount).toBeCloseTo(301, 2);
    });

    test('should handle scientific notation strings', () => {
      const items = [
        { amount: '1e2' }
      ];

      const result = calculateTotalAmount(items);

      expect(result.valid).toBe(true);
      expect(result.totalAmount).toBe(100);
    });

    test('should throw error for zero amount', () => {
      const items = [
        { amount: 0 }
      ];

      const result = calculateTotalAmount(items);

      expect(result.valid).toBe(false);
    });

    test('should handle mixed valid and invalid amounts', () => {
      const items = [
        { amount: 100 },
        { amount: 'invalid' }
      ];

      expect(() => calculateTotalAmount(items)).toThrow('Invalid amount');
    });
  });

  describe('determineReimbursementStatus', () => {
    test('should handle case-insensitive submitted status', () => {
      expect(determineReimbursementStatus('SUBMITTED')).toBe('pending approval');
      expect(determineReimbursementStatus('Submitted')).toBe('pending approval');
    });

    test('should handle all status values', () => {
      const statuses = ['draft', 'submitted', 'approved', 'rejected', 'paid', 'pending'];
      
      statuses.forEach(status => {
        const result = determineReimbursementStatus(status);
        if (status === 'submitted') {
          expect(result).toBe('pending approval');
        } else {
          expect(result).toBe(status);
        }
      });
    });
  });
});


