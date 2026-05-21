import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const AnalyticsModeEnum = z.enum(['CONSOLIDATED', 'DRILLDOWN']);
export const AnalyticsPeriodEnum = z.enum(['1M', '3M', '6M', '1A', 'YTD', 'CUSTOM']);

const BaseQuerySchema = z.object({
  mode: AnalyticsModeEnum.default('CONSOLIDATED'),
  walletId: z.string().uuid().optional(),
}).refine(
  (d) => d.mode !== 'DRILLDOWN' || !!d.walletId,
  { message: 'walletId é obrigatório no modo DRILLDOWN', path: ['walletId'] },
);

const PeriodQuerySchema = BaseQuerySchema.extend({
  period: AnalyticsPeriodEnum.default('1M'),
  from: z.string().optional(),
  to: z.string().optional(),
}).refine(
  (d) => d.period !== 'CUSTOM' || (!!d.from && !!d.to),
  { message: 'from e to são obrigatórios quando period=CUSTOM', path: ['from'] },
);

const EvolutionQuerySchema = z.object({
  period: AnalyticsPeriodEnum.default('1A'),
  from: z.string().optional(),
  to: z.string().optional(),
}).refine(
  (d) => d.period !== 'CUSTOM' || (!!d.from && !!d.to),
  { message: 'from e to são obrigatórios quando period=CUSTOM', path: ['from'] },
);

export class BaseQueryDto extends createZodDto(BaseQuerySchema) {}
export class PeriodQueryDto extends createZodDto(PeriodQuerySchema) {}
export class EvolutionQueryDto extends createZodDto(EvolutionQuerySchema) {}
