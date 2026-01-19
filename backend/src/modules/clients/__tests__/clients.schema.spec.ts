import {
  CreateClientInputSchema,
  UpdateClientInputSchema,
} from '../schemas/clients.schema';

describe('CreateClientInputSchema', () => {
  const validBase = {
    name: 'John Doe',
    phone: '+5511999999999',
    cpf: '12345678901',
  };

  describe('phone preprocess', () => {
    it('converts empty string to undefined', () => {
      const res = CreateClientInputSchema.safeParse({
        ...validBase,
        phone: '',
      });
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.phone).toBeUndefined();
      }
    });

    it('converts whitespace-only string to undefined', () => {
      const res = CreateClientInputSchema.safeParse({
        ...validBase,
        phone: '   ',
      });
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.phone).toBeUndefined();
      }
    });

    it('passes through valid phone number', () => {
      const res = CreateClientInputSchema.safeParse({
        ...validBase,
        phone: '+5511999999999',
      });
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.phone).toBe('+5511999999999');
      }
    });

    it('passes through undefined', () => {
      const res = CreateClientInputSchema.safeParse({
        ...validBase,
        phone: undefined,
      });
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.phone).toBeUndefined();
      }
    });

    it('rejects invalid phone format', () => {
      const res = CreateClientInputSchema.safeParse({
        ...validBase,
        phone: '11999999999', // missing +
      });
      expect(res.success).toBe(false);
    });
  });

  describe('email', () => {
    it('accepts empty string as email', () => {
      const res = CreateClientInputSchema.safeParse({
        ...validBase,
        email: '',
      });
      expect(res.success).toBe(true);
    });

    it('accepts valid email', () => {
      const res = CreateClientInputSchema.safeParse({
        ...validBase,
        email: 'test@example.com',
      });
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.email).toBe('test@example.com');
      }
    });
  });

  describe('riskProfile', () => {
    it('defaults to MODERATE when omitted', () => {
      const res = CreateClientInputSchema.safeParse(validBase);
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.riskProfile).toBe('MODERATE');
      }
    });

    it('accepts CONSERVATIVE', () => {
      const res = CreateClientInputSchema.safeParse({
        ...validBase,
        riskProfile: 'CONSERVATIVE',
      });
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.riskProfile).toBe('CONSERVATIVE');
      }
    });

    it('accepts AGGRESSIVE', () => {
      const res = CreateClientInputSchema.safeParse({
        ...validBase,
        riskProfile: 'AGGRESSIVE',
      });
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.riskProfile).toBe('AGGRESSIVE');
      }
    });
  });
});

describe('UpdateClientInputSchema', () => {
  describe('nullablePhoneSchema preprocess', () => {
    it('converts empty string to null', () => {
      const res = UpdateClientInputSchema.safeParse({
        phone: '',
      });
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.phone).toBeNull();
      }
    });

    it('converts whitespace-only string to null', () => {
      const res = UpdateClientInputSchema.safeParse({
        phone: '   ',
      });
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.phone).toBeNull();
      }
    });

    it('passes through valid phone number', () => {
      const res = UpdateClientInputSchema.safeParse({
        phone: '+5511999999999',
      });
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.phone).toBe('+5511999999999');
      }
    });

    it('passes through null', () => {
      const res = UpdateClientInputSchema.safeParse({
        phone: null,
      });
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.phone).toBeNull();
      }
    });

    it('passes through undefined (field omitted)', () => {
      const res = UpdateClientInputSchema.safeParse({});
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.phone).toBeUndefined();
      }
    });

    it('rejects invalid phone format', () => {
      const res = UpdateClientInputSchema.safeParse({
        phone: '11999999999', // missing +
      });
      expect(res.success).toBe(false);
    });
  });

  describe('nullable email', () => {
    it('accepts null email', () => {
      const res = UpdateClientInputSchema.safeParse({
        email: null,
      });
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.email).toBeNull();
      }
    });

    it('accepts valid email', () => {
      const res = UpdateClientInputSchema.safeParse({
        email: 'new@example.com',
      });
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.email).toBe('new@example.com');
      }
    });
  });

  describe('partial updates', () => {
    it('allows updating only name', () => {
      const res = UpdateClientInputSchema.safeParse({
        name: 'New Name',
      });
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.name).toBe('New Name');
      }
    });

    it('allows updating only riskProfile', () => {
      const res = UpdateClientInputSchema.safeParse({
        riskProfile: 'AGGRESSIVE',
      });
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.riskProfile).toBe('AGGRESSIVE');
      }
    });

    it('allows empty object (no updates)', () => {
      const res = UpdateClientInputSchema.safeParse({});
      expect(res.success).toBe(true);
    });
  });
});
