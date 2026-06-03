import { Test, TestingModule } from '@nestjs/testing';
import { SectorsReseedService } from '../services/sectors-reseed.service';
import { PrismaService } from '@/shared/prisma/prisma.service';
import { OpLabMarketService } from '@/modules/wallets/providers/oplab-market.service';

describe('SectorsReseedService', () => {
  let service: SectorsReseedService;
  let prisma: { asset: { findMany: jest.Mock; update: jest.Mock } };
  let oplab: { getMetadata: jest.Mock };

  beforeEach(async () => {
    prisma = {
      asset: {
        findMany: jest.fn(),
        update: jest.fn().mockResolvedValue({}),
      },
    };
    oplab = { getMetadata: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SectorsReseedService,
        { provide: PrismaService, useValue: prisma },
        { provide: OpLabMarketService, useValue: oplab },
      ],
    }).compile();

    service = module.get<SectorsReseedService>(SectorsReseedService);
  });

  it('returns zero counts when no assets need reseeding', async () => {
    prisma.asset.findMany.mockResolvedValue([]);
    const result = await service.reseed();
    expect(result).toEqual({ updated: 0, failed: 0, skipped: 0 });
  });

  it('updates assets that have sector metadata', async () => {
    prisma.asset.findMany.mockResolvedValue([
      { id: 'asset-1', ticker: 'PETR4' },
    ]);
    oplab.getMetadata.mockResolvedValue({ sector: 'Energy' });

    const result = await service.reseed();

    expect(prisma.asset.update).toHaveBeenCalledWith({
      where: { id: 'asset-1' },
      data: { sector: 'Energy' },
    });
    expect(result).toEqual({ updated: 1, failed: 0, skipped: 0 });
  });

  it('skips assets whose metadata has no sector', async () => {
    prisma.asset.findMany.mockResolvedValue([
      { id: 'asset-1', ticker: 'PETR4' },
    ]);
    oplab.getMetadata.mockResolvedValue({ sector: undefined });

    const result = await service.reseed();
    expect(result).toEqual({ updated: 0, failed: 0, skipped: 1 });
  });

  it('counts failed assets when metadata fetch throws', async () => {
    prisma.asset.findMany.mockResolvedValue([
      { id: 'asset-1', ticker: 'INVALID' },
    ]);
    oplab.getMetadata.mockRejectedValue(new Error('not found'));

    const result = await service.reseed();
    expect(result).toEqual({ updated: 0, failed: 1, skipped: 0 });
  });
});
