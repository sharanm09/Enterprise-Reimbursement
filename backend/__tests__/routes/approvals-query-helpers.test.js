const { buildPendingItemsQuery, buildApprovedItemsQuery } = require('../../routes/approvals-query-helpers');

describe('Approvals Query Helpers', () => {
  describe('buildPendingItemsQuery', () => {
    test('should build query for manager role', () => {
      const { query, params } = buildPendingItemsQuery('manager', 123);

      expect(query).toContain('WHERE');
      expect(query).toContain('manager_id');
      expect(query).toContain('$1');
    });

    test('should build query for hr role', () => {
      const { query, params } = buildPendingItemsQuery('hr');

      expect(query).toContain('WHERE');
      expect(query).toContain('approved_by_manager');
      expect(params).toEqual([]);
    });

    test('should build query for finance role', () => {
      const { query, params } = buildPendingItemsQuery('finance');

      expect(query).toContain('WHERE');
      expect(query).toContain('approved_by_hr');
      expect(params).toEqual([]);
    });

    test('should build query for superadmin role', () => {
      const { query, params } = buildPendingItemsQuery('superadmin');

      expect(query).toContain('WHERE');
      expect(params).toEqual([]);
    });
  });

  describe('buildApprovedItemsQuery', () => {
    test('should build query for manager role', () => {
      const { query, params } = buildApprovedItemsQuery('manager', 123, 'manager');

      expect(query).toContain('WHERE');
      expect(query).toContain('manager_id');
      expect(params).toContain(123);
    });

    test('should build query for hr role', () => {
      const { query, params } = buildApprovedItemsQuery('hr', null, 'hr');

      expect(query).toContain('WHERE');
      expect(query).toContain('approved_by_hr');
      expect(params).toEqual([]);
    });

    test('should build query for finance role', () => {
      const { query, params } = buildApprovedItemsQuery('finance', null, 'finance');

      expect(query).toContain('WHERE');
      expect(query).toContain('approved_by_finance');
      expect(params).toEqual([]);
    });

    test('should build query for superadmin role', () => {
      const { query, params } = buildApprovedItemsQuery('superadmin', null, null);

      expect(query).toContain('WHERE');
      expect(params).toEqual([]);
    });
  });
});

