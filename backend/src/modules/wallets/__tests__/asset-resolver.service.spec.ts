import { Test, TestingModule } from '@nestjs/testing';
import { AssetResolverService } from '../services/asset-resolver.service';
import { PrismaService } from '@/shared/prisma/prisma.service';

describe('AssetResolverService', () => {
  let service: AssetResolverService;
  let prisma: {
    asset: {
      findUnique: jest.Mock;
      findUniqueOrThrow: jest.Mock;
      upsert: jest.Mock;
    };
  };
  let marketData: {
    getMetadata: jest.Mock;
  };

  const stockAsset = {
    id: 'asset-123',
    ticker: 'PETR4',
    name: 'Petrobras PN',
    type: 'STOCK',
    sector: 'Energy',
    market: 'B3',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    prisma = {
      asset: {
        findUnique: jest.fn(),
        findUniqueOrThrow: jest.fn(),
        upsert: jest.fn(),
      },
    };

    marketData = {
      getMetadata: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AssetResolverService,
        { provide: PrismaService, useValue: prisma },
        { provide: 'MARKET_DATA_PROVIDER', useValue: marketData },
      ],
    }).compile();

    service = module.get(AssetResolverService);
    jest.clearAllMocks();
  });

  describe('ensureAssetExists', () => {
    it('returns existing asset without calling market data', async () => {
      prisma.asset.findUnique.mockResolvedValue(stockAsset);

      const result = await service.ensureAssetExists('PETR4');

      expect(result).toEqual(stockAsset);
      expect(prisma.asset.findUnique).toHaveBeenCalledWith({
        where: { ticker: 'PETR4' },
      });
      expect(marketData.getMetadata).not.toHaveBeenCalled();
      expect(prisma.asset.upsert).not.toHaveBeenCalled();
    });

    it('creates stock asset with correct fields', async () => {
      prisma.asset.findUnique.mockResolvedValue(null);
      marketData.getMetadata.mockResolvedValue({
        ticker: 'VALE3',
        type: 'STOCK',
        name: 'Vale ON',
        sector: 'Mining',
      });
      prisma.asset.upsert.mockResolvedValue({
        ...stockAsset,
        id: 'new-asset',
        ticker: 'VALE3',
        name: 'Vale ON',
        sector: 'Mining',
      });

      const result = await service.ensureAssetExists('VALE3');

      expect(marketData.getMetadata).toHaveBeenCalledWith('VALE3');
      expect(prisma.asset.upsert).toHaveBeenCalledWith({
        where: { ticker: 'VALE3' },
        create: {
          ticker: 'VALE3',
          name: 'Vale ON',
          type: 'STOCK',
          sector: 'Mining',
          market: 'B3',
        },
        update: {},
      });
      expect(result.ticker).toBe('VALE3');
    });

    it('creates option with underlying asset recursively', async () => {
      const underlyingAsset = { ...stockAsset, id: 'underlying-123' };

      // First call for option - not found
      prisma.asset.findUnique.mockResolvedValueOnce(null);
      // Second call for underlying - not found
      prisma.asset.findUnique.mockResolvedValueOnce(null);

      // Metadata for option
      marketData.getMetadata.mockResolvedValueOnce({
        ticker: 'PETR4A100',
        type: 'OPTION',
        name: 'PETR4 Call 100',
        underlyingSymbol: 'PETR4',
        strikePrice: 100,
        expirationDate: new Date('2025-01-15'),
        optionType: 'CALL',
        exerciseType: 'AMERICAN',
      });

      // Metadata for underlying
      marketData.getMetadata.mockResolvedValueOnce({
        ticker: 'PETR4',
        type: 'STOCK',
        name: 'Petrobras PN',
        sector: 'Energy',
      });

      // Upsert underlying
      prisma.asset.upsert.mockResolvedValueOnce(underlyingAsset);

      // Upsert option
      const optionAsset = {
        id: 'option-123',
        ticker: 'PETR4A100',
        name: 'PETR4 Call 100',
        type: 'OPTION',
        market: 'B3',
      };
      prisma.asset.upsert.mockResolvedValueOnce(optionAsset);

      const result = await service.ensureAssetExists('PETR4A100');

      expect(result.ticker).toBe('PETR4A100');
      expect(prisma.asset.upsert).toHaveBeenCalledTimes(2);

      // Check option creation includes optionDetail
      const optionCall = prisma.asset.upsert.mock.calls[1][0];
      expect(optionCall.create.optionDetail).toBeDefined();
      expect(optionCall.create.optionDetail.create.underlyingAssetId).toBe(
        'underlying-123',
      );
    });

    it('defaults exerciseType to AMERICAN when not provided', async () => {
      prisma.asset.findUnique.mockResolvedValueOnce(null);
      prisma.asset.findUnique.mockResolvedValueOnce({ id: 'underlying-123' });

      marketData.getMetadata.mockResolvedValue({
        ticker: 'PETR4A100',
        type: 'OPTION',
        name: 'PETR4 Call 100',
        underlyingSymbol: 'PETR4',
        strikePrice: 100,
        expirationDate: new Date('2025-01-15'),
        optionType: 'CALL',
        // exerciseType not provided
      });

      prisma.asset.upsert.mockResolvedValue({
        id: 'option-123',
        ticker: 'PETR4A100',
      });

      await service.ensureAssetExists('PETR4A100');

      const optionCall = prisma.asset.upsert.mock.calls[0][0];
      expect(optionCall.create.optionDetail.create.exerciseType).toBe(
        'AMERICAN',
      );
    });

    it('handles race condition (P2002) gracefully', async () => {
      prisma.asset.findUnique.mockResolvedValue(null);
      marketData.getMetadata.mockResolvedValue({
        ticker: 'RACE1',
        type: 'STOCK',
        name: 'Race Asset',
      });

      // Simulate unique constraint violation
      const p2002Error = { code: 'P2002' };
      prisma.asset.upsert.mockRejectedValue(p2002Error);
      prisma.asset.findUniqueOrThrow.mockResolvedValue({
        id: 'existing-asset',
        ticker: 'RACE1',
      });

      const result = await service.ensureAssetExists('RACE1');

      expect(result.id).toBe('existing-asset');
      expect(prisma.asset.findUniqueOrThrow).toHaveBeenCalledWith({
        where: { ticker: 'RACE1' },
      });
    });

    it('rethrows non-P2002 errors', async () => {
      prisma.asset.findUnique.mockResolvedValue(null);
      marketData.getMetadata.mockResolvedValue({
        ticker: 'ERROR1',
        type: 'STOCK',
        name: 'Error Asset',
      });

      const otherError = new Error('Database connection failed');
      prisma.asset.upsert.mockRejectedValue(otherError);

      await expect(service.ensureAssetExists('ERROR1')).rejects.toThrow(
        'Database connection failed',
      );
    });
  });
});
