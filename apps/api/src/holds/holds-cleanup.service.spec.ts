import { jest } from '@jest/globals';

import { HoldsCleanupService } from './holds-cleanup.service.js';

describe('HoldsCleanupService', () => {
  const expireAllStaleHoldsMock = jest.fn();

  const holdsServiceMock = {
    expireAllStaleHolds: expireAllStaleHoldsMock,
  };

  let service: HoldsCleanupService;

  beforeEach(() => {
    jest.clearAllMocks();

    service = new HoldsCleanupService(holdsServiceMock as never);
  });

  it('runs global stale hold cleanup', async () => {
    expireAllStaleHoldsMock.mockResolvedValue(undefined);

    await service.expireStaleHolds();

    expect(expireAllStaleHoldsMock).toHaveBeenCalledTimes(1);
  });
});
