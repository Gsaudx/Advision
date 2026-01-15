import { BadRequestException, type ExecutionContext } from '@nestjs/common';
import { LocalAuthGuard } from '../guards/local-auth.guard';

describe('LocalAuthGuard', () => {
  const createContext = (body: unknown): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({ body }),
      }),
    }) as ExecutionContext;

  it('throws BadRequestException when body is invalid', () => {
    const guard = new LocalAuthGuard();

    expect(() => guard.canActivate(createContext({}))).toThrow(
      BadRequestException,
    );
  });

  it('delegates to AuthGuard when body is valid', () => {
    const basePrototype = Object.getPrototypeOf(LocalAuthGuard.prototype) as {
      canActivate: () => boolean;
    };
    const canActivateSpy = jest
      .spyOn(basePrototype, 'canActivate')
      .mockReturnValue(true);
    const guard = new LocalAuthGuard();

    const result = guard.canActivate(
      createContext({ email: 'user@example.com', password: 'secret' }),
    );

    expect(result).toBe(true);
    expect(canActivateSpy).toHaveBeenCalledTimes(1);

    canActivateSpy.mockRestore();
  });
});
