const {
  mapUserRoles,
  mapAdminUserListItem,
  matchesRoleFilter,
  matchesSearch,
} = require('../../src/services/user/admin-user-list');

jest.mock('../../src/models', () => ({
  User: {
    findAll: jest.fn(),
  },
  UserMainGrid: {},
  UserPartners: {},
  Partners: {},
  ContributorApplication: {},
  sequelize: {},
  Sequelize: { Op: {}, fn: jest.fn(), col: jest.fn(), where: jest.fn(), literal: jest.fn() },
}));

const { User } = require('../../src/models');
const UserService = require('../../src/services/user.service');
const { createMockRequest, createMockResponse } = require('../helpers/mockResponse');

describe('admin-user-list helpers', () => {
  it('roles: comum sempre customer; contributor só se active', () => {
    expect(mapUserRoles({ contributor: 0, contributorStatus: 'none' })).toEqual({
      customer: true,
      contributor: false,
    });
    expect(mapUserRoles({ contributor: 1, contributorStatus: 'active' })).toEqual({
      customer: true,
      contributor: true,
    });
    expect(mapUserRoles({ contributor: 1, contributorStatus: 'pending' })).toEqual({
      customer: true,
      contributor: false,
    });
  });

  it('mapAdminUserListItem inclui papéis sem password', () => {
    const item = mapAdminUserListItem({
      id: 2,
      name: 'Jose',
      email: 'jose@a.com',
      password: 'secret',
      contributor: 1,
      contributorStatus: 'active',
      username: 'jose',
    });
    expect(item.roles).toEqual({ customer: true, contributor: true });
    expect(item.password).toBeUndefined();
    expect(item.contributor).toBe(1);
  });

  it('filtros role e busca', () => {
    const both = mapAdminUserListItem({
      id: 1,
      name: 'Ana',
      email: 'ana@a.com',
      contributorStatus: 'active',
      contributor: 1,
    });
    const onlyCustomer = mapAdminUserListItem({
      id: 2,
      name: 'Bob',
      email: 'bob@b.com',
      contributorStatus: 'none',
      contributor: 0,
    });

    expect(matchesRoleFilter(both, 'contributor')).toBe(true);
    expect(matchesRoleFilter(onlyCustomer, 'contributor')).toBe(false);
    expect(matchesRoleFilter(onlyCustomer, 'customer_only')).toBe(true);
    expect(matchesRoleFilter(both, 'customer_only')).toBe(false);
    expect(matchesSearch(both, 'ana')).toBe(true);
    expect(matchesSearch(both, 'xyz')).toBe(false);
  });
});

describe('GET /admin/users envelope', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('200 success + data com roles (usuário pode ser os dois)', async () => {
    User.findAll.mockResolvedValue([
      {
        get: () => ({
          id: 7,
          name: 'Marina',
          email: 'm@a.com',
          contributor: 1,
          contributorStatus: 'active',
        }),
      },
    ]);

    const req = createMockRequest({ query: {} });
    const res = createMockResponse();
    await UserService.getAll(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].roles).toEqual({ customer: true, contributor: true });
    expect(res.body.meta.total).toBe(1);
  });

  it('400 role inválido', async () => {
    const req = createMockRequest({ query: { role: 'admin' } });
    const res = createMockResponse();
    await UserService.getAll(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.body.success).toBe(false);
  });

  it('filtra contributor', async () => {
    User.findAll.mockResolvedValue([
      { get: () => ({ id: 1, name: 'A', email: 'a@a.com', contributorStatus: 'active', contributor: 1 }) },
      { get: () => ({ id: 2, name: 'B', email: 'b@b.com', contributorStatus: 'none', contributor: 0 }) },
    ]);
    const req = createMockRequest({ query: { role: 'contributor' } });
    const res = createMockResponse();
    await UserService.getAll(req, res);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].id).toBe(1);
  });
});
