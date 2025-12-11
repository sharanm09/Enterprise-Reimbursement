const {
  buildPendingItemsQuery,
  buildApprovedItemsQuery,
  buildSuperAdminQuery
} = require('../../routes/approvals-query-helpers');

describe('Approvals Query Helpers Complete Coverage', () => {
  describe('buildPendingItemsQuery', () => {
    test('should build query for manager role', () => {
      const result = buildPendingItemsQuery('manager', 1);

      expect(result.query).toContain("ri.status = 'pending'");
      expect(result.query).toContain('u.manager_id = $1');
      expect(result.params).toEqual([1]);
    });

    test('should build query for hr role', () => {
      const result = buildPendingItemsQuery('hr');

      expect(result.query).toContain("ri.status = 'approved_by_manager'");
      expect(result.query).toContain("NOT IN ('approved_by_hr'");
      expect(result.params).toEqual([]);
    });

    test('should build query for finance role', () => {
      const result = buildPendingItemsQuery('finance');

      expect(result.query).toContain("ri.status = 'approved_by_hr'");
      expect(result.query).toContain("NOT IN ('approved_by_finance'");
      expect(result.params).toEqual([]);
    });

    test('should build default query for unknown role', () => {
      const result = buildPendingItemsQuery('unknown');

      expect(result.query).toContain("ri.status = 'pending'");
      expect(result.params).toEqual([]);
    });
  });

  describe('buildApprovedItemsQuery', () => {
    test('should build query for manager role', () => {
      const result = buildApprovedItemsQuery('manager', 1, 'manager');

      expect(result.query).toContain("ri.status = 'approved_by_manager'");
      expect(result.query).toContain('u.manager_id = $1');
      expect(result.params).toEqual([1]);
    });

    test('should build query for hr role', () => {
      const result = buildApprovedItemsQuery('hr', null, 'hr');

      expect(result.query).toContain("ri.status = 'approved_by_hr'");
      expect(result.query).toContain("rejected_by_hr");
      expect(result.params).toEqual([]);
    });

    test('should build query for finance role', () => {
      const result = buildApprovedItemsQuery('finance', null, 'finance');

      expect(result.query).toContain("ri.status = 'approved_by_finance'");
      expect(result.query).toContain("paid");
      expect(result.params).toEqual([]);
    });

    test('should build default query for unknown role', () => {
      const result = buildApprovedItemsQuery('unknown');

      expect(result.query).toContain("IN ('approved_by_manager'");
      expect(result.params).toEqual([]);
    });
  });

  describe('buildSuperAdminQuery', () => {
    describe('pending status', () => {
      test('should build query for manager level', () => {
        const result = buildSuperAdminQuery('pending', 'manager');

        expect(result.query).toContain("ri.status = $1");
        expect(result.params).toEqual(['pending']);
      });

      test('should build query for hr level', () => {
        const result = buildSuperAdminQuery('pending', 'hr');

        expect(result.query).toContain("ri.status = $1");
        expect(result.query).toContain('NOT EXISTS');
        expect(result.params).toEqual(['approved_by_manager', 'hr']);
      });

      test('should build query for finance level', () => {
        const result = buildSuperAdminQuery('pending', 'finance');

        expect(result.query).toContain("ri.status = $1");
        expect(result.query).toContain('NOT IN ($2, $3, $4)');
        expect(result.params).toEqual(['approved_by_hr', 'approved_by_finance', 'paid', 'rejected_by_finance']);
      });

      test('should handle unknown approval level', () => {
        const result = buildSuperAdminQuery('pending', 'unknown');

        expect(result.query).toContain('WHERE');
        expect(result.params).toEqual([]);
      });
    });

    describe('approved status', () => {
      test('should build query for manager level', () => {
        const result = buildSuperAdminQuery('approved', 'manager');

        expect(result.query).toContain('EXISTS');
        expect(result.query).toContain('approval_level = $1');
        expect(result.params).toEqual(['manager', 'approved']);
      });

      test('should build query for hr level', () => {
        const result = buildSuperAdminQuery('approved', 'hr');

        expect(result.query).toContain('EXISTS');
        expect(result.query).toContain('approval_level = $1');
        expect(result.params).toEqual(['hr', 'approved']);
      });

      test('should build query for finance level', () => {
        const result = buildSuperAdminQuery('approved', 'finance');

        expect(result.query).toContain("ri.status IN ($1, $2)");
        expect(result.params).toEqual(['approved_by_finance', 'paid']);
      });

      test('should handle unknown approval level', () => {
        const result = buildSuperAdminQuery('approved', 'unknown');

        expect(result.query).toContain('WHERE');
        expect(result.params).toEqual([]);
      });
    });

    describe('rejected status', () => {
      test('should build query for manager level', () => {
        const result = buildSuperAdminQuery('rejected', 'manager');

        expect(result.query).toContain("ri.status = $1");
        expect(result.params).toEqual(['rejected_by_manager']);
      });

      test('should build query for hr level', () => {
        const result = buildSuperAdminQuery('rejected', 'hr');

        expect(result.query).toContain("ri.status = $1");
        expect(result.params).toEqual(['rejected_by_hr']);
      });

      test('should build query for finance level', () => {
        const result = buildSuperAdminQuery('rejected', 'finance');

        expect(result.query).toContain("ri.status = $1");
        expect(result.params).toEqual(['rejected_by_finance']);
      });

      test('should handle unknown approval level', () => {
        const result = buildSuperAdminQuery('rejected', 'unknown');

        expect(result.query).toContain('WHERE');
        expect(result.params).toEqual([]);
      });
    });

    test('should handle unknown status', () => {
      const result = buildSuperAdminQuery('unknown', 'manager');

      expect(result.query).toContain('WHERE');
      expect(result.params).toEqual([]);
    });

    test('should include ORDER BY clause', () => {
      const result = buildSuperAdminQuery('pending', 'manager');

      expect(result.query).toContain('ORDER BY ri.created_at DESC');
    });
  });
});
