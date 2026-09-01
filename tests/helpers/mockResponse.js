function createMockResponse() {
  const res = {
    statusCode: 200,
    body: undefined,
  };

  res.status = jest.fn((code) => {
    res.statusCode = code;
    return res;
  });

  res.json = jest.fn((payload) => {
    res.body = payload;
    return res;
  });

  return res;
}

function createMockRequest(overrides = {}) {
  return {
    body: {},
    params: {},
    query: {},
    ...overrides,
  };
}

module.exports = {
  createMockResponse,
  createMockRequest,
};
