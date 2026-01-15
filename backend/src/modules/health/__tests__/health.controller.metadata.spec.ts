import { HealthController } from '../controllers/health.controller';
import 'reflect-metadata';

describe('HealthController - Decorator Metadata', () => {
  it('should have correct @Controller path', () => {
    const path = Reflect.getMetadata('path', HealthController);
    expect(path).toBe('health');
  });

  it('should have @ApiTags metadata', () => {
    const tags = Reflect.getMetadata('swagger/apiUseTags', HealthController);
    expect(tags).toEqual(['Health']);
  });

  it('should have @Get metadata on check method', () => {
    const path = Reflect.getMetadata('path', HealthController.prototype.check);
    const method = Reflect.getMetadata(
      'method',
      HealthController.prototype.check,
    );

    expect(path).toBe('/');
    expect(method).toBe(0); // GET = 0
  });

  it('should have @ApiOperation on check method', () => {
    const operation = Reflect.getMetadata(
      'swagger/apiOperation',
      HealthController.prototype.check,
    );

    expect(operation).toMatchObject({
      summary: 'Verifica status da API',
      description: expect.stringContaining('Retorna o status da aplicacao'),
    });
  });

  it('should have @ApiResponse decorators on check method', () => {
    const responses = Reflect.getMetadata(
      'swagger/apiResponse',
      HealthController.prototype.check,
    );

    expect(responses).toHaveProperty('200');
    expect(responses).toHaveProperty('503');
    expect(responses['200'].description).toBe('Sistema operacional');
    expect(responses['503'].description).toBe(
      'Sistema com falha (banco desconectado)',
    );
  });
});
