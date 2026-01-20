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

  describe('clientCode', () => {
    it('does not accept empty string as clientCode', () => {
      const res = CreateClientInputSchema.safeParse({
        ...validBase,
        clientCode: '',
      });
      expect(res.success).toBe(false);
    });

    it('accepts valid clientCode', () => {
      const res = CreateClientInputSchema.safeParse({
        ...validBase,
        clientCode: '12345678',
      });
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.clientCode).toBe('12345678');
      }
    });
  });
});

describe('UpdateClientInputSchema', () => {
  describe('nullable code', () => {
    it('accepts null clientCode', () => {
      const res = UpdateClientInputSchema.safeParse({
        clientCode: null,
      });
      expect(res.success).toBe(false);
      if (res.success) {
        expect(res.data.clientCode).toBeNull();
      }
    });

    it('accepts valid clientCode', () => {
      const res = UpdateClientInputSchema.safeParse({
        clientCode: '12345678',
      });
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.clientCode).toBe('12345678');
      }
    });
  });
});
