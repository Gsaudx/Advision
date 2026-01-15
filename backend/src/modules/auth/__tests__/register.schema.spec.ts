import { RegisterSchema } from '../schemas/register.schema';

describe('RegisterSchema', () => {
  const base = {
    name: 'John Doe',
    email: 'john@example.com',
    password: 'supersecret1',
  };

  describe('name', () => {
    it('rejects when name is too short', () => {
      const res = RegisterSchema.safeParse({ ...base, name: 'J' });
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.issues[0]?.message).toBe(
          'Nome deve ter pelo menos 2 caracteres',
        );
        expect(res.error.issues[0]?.path).toEqual(['name']);
      }
    });

    it('rejects when name is too long', () => {
      const res = RegisterSchema.safeParse({
        ...base,
        name: 'a'.repeat(101),
      });
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.issues[0]?.message).toBe(
          'Nome deve ter no maximo 100 caracteres',
        );
        expect(res.error.issues[0]?.path).toEqual(['name']);
      }
    });

    it('accepts valid name', () => {
      const res = RegisterSchema.safeParse({ ...base, name: 'Jo' });
      expect(res.success).toBe(true);
    });
  });

  describe('email', () => {
    it('rejects invalid email', () => {
      const res = RegisterSchema.safeParse({ ...base, email: 'not-an-email' });
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.issues[0]?.message).toBe('Email invalido');
        expect(res.error.issues[0]?.path).toEqual(['email']);
      }
    });

    it('accepts valid email', () => {
      const res = RegisterSchema.safeParse({ ...base, email: 'a@b.com' });
      expect(res.success).toBe(true);
    });
  });

  describe('password', () => {
    it('rejects when password is too short', () => {
      const res = RegisterSchema.safeParse({ ...base, password: '1234567' });
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.issues[0]?.message).toBe(
          'Senha deve ter pelo menos 8 caracteres',
        );
        expect(res.error.issues[0]?.path).toEqual(['password']);
      }
    });

    it('rejects when password is too long', () => {
      const res = RegisterSchema.safeParse({
        ...base,
        password: 'a'.repeat(101),
      });
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.issues[0]?.message).toBe(
          'Senha deve ter no maximo 100 caracteres',
        );
        expect(res.error.issues[0]?.path).toEqual(['password']);
      }
    });

    it('accepts valid password', () => {
      const res = RegisterSchema.safeParse({ ...base, password: '12345678' });
      expect(res.success).toBe(true);
    });
  });

  describe('role', () => {
    it('defaults role to ADVISOR when omitted', () => {
      const res = RegisterSchema.safeParse({ ...base });
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.role).toBe('ADVISOR');
      }
    });

    it('accepts role CLIENT', () => {
      const res = RegisterSchema.safeParse({ ...base, role: 'CLIENT' });
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.role).toBe('CLIENT');
      }
    });

    it('rejects invalid role', () => {
      const res = RegisterSchema.safeParse({ ...base, role: 'ADMIN' });
      expect(res.success).toBe(false);
      if (!res.success) {
        const issue = res.error.issues.find((i) => i.path.join('.') === 'role');
        expect(issue).toBeTruthy();
        expect(issue?.code).toBe('invalid_value');
      }
    });
  });

  describe('cpfCnpj', () => {
    it('allows cpfCnpj to be omitted', () => {
      const res = RegisterSchema.safeParse({ ...base });
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.cpfCnpj).toBeUndefined();
      }
    });

    it('allows cpfCnpj to be undefined explicitly', () => {
      const res = RegisterSchema.safeParse({ ...base, cpfCnpj: undefined });
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.cpfCnpj).toBeUndefined();
      }
    });

    it('transforms CPF with punctuation to digits only (11)', () => {
      const res = RegisterSchema.safeParse({
        ...base,
        cpfCnpj: '123.456.789-01',
      });
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.cpfCnpj).toBe('12345678901');
      }
    });

    it('transforms CNPJ with punctuation to digits only (14)', () => {
      const res = RegisterSchema.safeParse({
        ...base,
        cpfCnpj: '12.345.678/0001-90',
      });
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.cpfCnpj).toBe('12345678000190');
      }
    });

    it('rejects cpfCnpj when digits length is neither 11 nor 14', () => {
      const res = RegisterSchema.safeParse({ ...base, cpfCnpj: '1234' });
      expect(res.success).toBe(false);
      if (!res.success) {
        const issue = res.error.issues.find(
          (i) => i.path.join('.') === 'cpfCnpj',
        );
        expect(issue?.message).toBe(
          'CPF deve ter 11 digitos ou CNPJ deve ter 14 digitos',
        );
      }
    });
  });

  describe('phone', () => {
    it('allows phone to be omitted', () => {
      const res = RegisterSchema.safeParse({ ...base });
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.phone).toBeUndefined();
      }
    });

    it('accepts valid international phone format (+DDI + number)', () => {
      const res = RegisterSchema.safeParse({
        ...base,
        phone: '+5511999999999',
      });
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.phone).toBe('+5511999999999');
      }
    });

    it('rejects phone when missing "+" prefix', () => {
      const res = RegisterSchema.safeParse({ ...base, phone: '5511999999999' });
      expect(res.success).toBe(false);
      if (!res.success) {
        const issue = res.error.issues.find(
          (i) => i.path.join('.') === 'phone',
        );
        expect(issue?.message).toBe(
          'Telefone deve estar no formato internacional (+DDI + numero)',
        );
      }
    });

    it('rejects phone when too short', () => {
      const res = RegisterSchema.safeParse({ ...base, phone: '+123456789' }); // 9 digits
      expect(res.success).toBe(false);
      if (!res.success) {
        const issue = res.error.issues.find(
          (i) => i.path.join('.') === 'phone',
        );
        expect(issue?.message).toBe(
          'Telefone deve estar no formato internacional (+DDI + numero)',
        );
      }
    });

    it('rejects phone when too long', () => {
      const res = RegisterSchema.safeParse({
        ...base,
        phone: '+1234567890123456', // 16 digits
      });
      expect(res.success).toBe(false);
      if (!res.success) {
        const issue = res.error.issues.find(
          (i) => i.path.join('.') === 'phone',
        );
        expect(issue?.message).toBe(
          'Telefone deve estar no formato internacional (+DDI + numero)',
        );
      }
    });

    it('rejects phone when contains spaces or separators', () => {
      const res = RegisterSchema.safeParse({
        ...base,
        phone: '+55 11 99999-9999',
      });
      expect(res.success).toBe(false);
      if (!res.success) {
        const issue = res.error.issues.find(
          (i: any) => i.path.join('.') === 'phone',
        );
        expect(issue?.message).toBe(
          'Telefone deve estar no formato internacional (+DDI + numero)',
        );
      }
    });
  });

  describe('full object', () => {
    it('rejects when required fields are missing', () => {
      const res = RegisterSchema.safeParse({});
      expect(res.success).toBe(false);
      if (!res.success) {
        const paths = res.error.issues.map((i) => i.path.join('.'));
        expect(paths).toEqual(
          expect.arrayContaining(['name', 'email', 'password']),
        );
      }
    });
  });
});
