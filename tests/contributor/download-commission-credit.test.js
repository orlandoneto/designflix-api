/**
 * Regressão: o download creditava o saldo de quem baixava, não do dono do
 * arquivo. A comissão ia para o colaborador e o `balance` para o downloader,
 * então `user_commissions` e `user.balance` divergiam.
 */

jest.mock('../../src/models', () => ({
  UserDownloads: { findOrCreate: jest.fn() },
  UserMainGrid: {},
  sequelize: {},
}));

jest.mock('../../src/services/user.service', () => ({
  _updateBalance: jest.fn(),
}));

jest.mock('../../src/services/user-commissions.service', () => ({
  _createCommission: jest.fn(),
}));

const { UserDownloads } = require('../../src/models');
const UserService = require('../../src/services/user.service');
const UserCommissionsServices = require('../../src/services/user-commissions.service');
const UserDownloadsServices = require('../../src/services/user-downloads.services');
const { createMockRequest, createMockResponse } = require('../helpers/mockResponse');

const DOWNLOADER_ID = 5;
const CONTRIBUTOR_ID = 9;

function requestFor(overrides = {}) {
  return createMockRequest({
    body: {
      user_id: DOWNLOADER_ID,
      contributor_image_user_id: CONTRIBUTOR_ID,
      user_main_grid_id: 77,
      ...overrides,
    },
  });
}

describe('createOrUpdateDownload — crédito da comissão', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    UserDownloads.findOrCreate.mockResolvedValue([
      { total_downloads: 1, save: jest.fn() },
      true,
    ]);
    UserCommissionsServices._createCommission.mockResolvedValue({
      success: true,
    });
    UserService._updateBalance.mockResolvedValue({ success: true });
  });

  it('credita o saldo do colaborador, não de quem baixou', async () => {
    const res = createMockResponse();
    await UserDownloadsServices.createOrUpdateDownload(requestFor(), res);

    expect(UserService._updateBalance).toHaveBeenCalledWith(CONTRIBUTOR_ID);
    expect(UserService._updateBalance).not.toHaveBeenCalledWith(DOWNLOADER_ID);
  });

  it('registra a comissão no colaborador informando quem baixou', async () => {
    const res = createMockResponse();
    await UserDownloadsServices.createOrUpdateDownload(requestFor(), res);

    expect(UserCommissionsServices._createCommission).toHaveBeenCalledWith(
      CONTRIBUTOR_ID,
      { downloaderUserId: DOWNLOADER_ID }
    );
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('auto-download registra o download mas não credita saldo', async () => {
    UserCommissionsServices._createCommission.mockResolvedValue({
      success: false,
      skipped: true,
      message: 'auto-download não gera comissão',
    });

    const res = createMockResponse();
    await UserDownloadsServices.createOrUpdateDownload(
      requestFor({ user_id: CONTRIBUTOR_ID }),
      res
    );

    expect(res.status).toHaveBeenCalledWith(201);
    expect(UserService._updateBalance).not.toHaveBeenCalled();
  });

  it('não credita saldo se a comissão falhar', async () => {
    UserCommissionsServices._createCommission.mockResolvedValue({
      success: false,
      error: 'db caiu',
    });

    const res = createMockResponse();
    await UserDownloadsServices.createOrUpdateDownload(requestFor(), res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(UserService._updateBalance).not.toHaveBeenCalled();
  });

  it('400 sem o id do contribuidor — ninguém para creditar', async () => {
    const res = createMockResponse();
    await UserDownloadsServices.createOrUpdateDownload(
      requestFor({ contributor_image_user_id: undefined }),
      res
    );

    expect(res.status).toHaveBeenCalledWith(400);
    expect(UserCommissionsServices._createCommission).not.toHaveBeenCalled();
  });

  it('download repetido incrementa o contador e credita de novo', async () => {
    const save = jest.fn();
    UserDownloads.findOrCreate.mockResolvedValue([
      { total_downloads: 3, save },
      false,
    ]);

    const res = createMockResponse();
    await UserDownloadsServices.createOrUpdateDownload(requestFor(), res);

    expect(save).toHaveBeenCalled();
    expect(UserService._updateBalance).toHaveBeenCalledWith(CONTRIBUTOR_ID);
  });
});
