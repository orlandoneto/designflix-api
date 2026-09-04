const UploadService = require('../../src/services/upload.service');
const { createMockRequest, createMockResponse } = require('../helpers/mockResponse');

jest.mock('../../src/models', () => ({
  User: {
    update: jest.fn(),
  },
}));

const { User } = require('../../src/models');
const UserService = require('../../src/services/user.service');

describe('Avatar HTTP envelope', () => {
  const upload = new UploadService();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('POST avatar resposta 200 com success + data.url', async () => {
    const req = createMockRequest({
      file: { location: 'https://cdn.example/profile/a.jpg' },
    });
    const res = createMockResponse();

    await upload.file(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.body).toEqual({
      success: true,
      message: 'Avatar enviado',
      data: { url: 'https://cdn.example/profile/a.jpg' },
    });
  });

  it('POST avatar 400 sem arquivo', async () => {
    const req = createMockRequest({});
    const res = createMockResponse();

    await upload.file(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.body).toEqual({
      success: false,
      message: 'Nenhum arquivo enviado',
    });
  });

  it('DELETE /user/:id/photo 200 envelope', async () => {
    User.update.mockResolvedValue([1]);
    const req = createMockRequest({ params: { userId: '2' } });
    const res = createMockResponse();

    await UserService.removeUserPhoto(req, res);

    expect(User.update).toHaveBeenCalledWith({ photo: null }, { where: { id: '2' } });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toEqual({ photo: null });
    expect(res.body.message).toBe('Foto removida com sucesso');
  });

  it('DELETE /user/:id/photo 500 genérico (sem err.message cru)', async () => {
    User.update.mockRejectedValue(new Error('ECONNREFUSED secret'));
    const req = createMockRequest({ params: { userId: '2' } });
    const res = createMockResponse();

    await UserService.removeUserPhoto(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.body).toEqual({
      success: false,
      message: 'Erro ao remover a foto',
    });
  });
});
