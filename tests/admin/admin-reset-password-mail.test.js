jest.mock('../../src/models', () => ({
  Admin: {
    findOne: jest.fn(),
    update: jest.fn(),
  },
}));

jest.mock('../../src/utils/mailTransport', () => ({
  createMailTransport: jest.fn(),
  getEmailFrom: jest.fn(),
}));

const { Admin } = require('../../src/models');
const mailTransport = require('../../src/utils/mailTransport');
const AdminService = require('../../src/services/admin.service');
const { createMockRequest, createMockResponse } = require('../helpers/mockResponse');

describe('AdminService.resetPassword — envio de e-mail', () => {
  let transporter;
  let savedUser;

  beforeEach(() => {
    savedUser = process.env.EMAIL_USER_SMTP;
    process.env.EMAIL_USER_SMTP = 'login@smtp-brevo.com';
    transporter = {
      use: jest.fn(),
      sendMail: jest.fn().mockResolvedValue({ response: '250 queued' }),
    };
    mailTransport.createMailTransport.mockImplementation(() => transporter);
    mailTransport.getEmailFrom.mockImplementation(() => 'Designflix <remetente@example.com>');
    Admin.findOne.mockResolvedValue({ id: 7, email: 'admin@example.com', name: 'Admin' });
    Admin.update.mockResolvedValue([1]);
  });

  afterEach(() => {
    if (savedUser === undefined) delete process.env.EMAIL_USER_SMTP;
    else process.env.EMAIL_USER_SMTP = savedUser;
  });

  it('usa o transporte compartilhado (587/STARTTLS) e EMAIL_FROM como remetente', async () => {
    const res = createMockResponse();

    await new AdminService().resetPassword(
      createMockRequest({ body: { email: 'admin@example.com' } }),
      res
    );

    expect(mailTransport.createMailTransport).toHaveBeenCalledTimes(1);
    expect(transporter.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        from: 'Designflix <remetente@example.com>',
        to: 'admin@example.com',
      })
    );
    expect(transporter.sendMail.mock.calls[0][0].from).not.toBe('login@smtp-brevo.com');
    expect(res.statusCode).toBe(200);
  });
});