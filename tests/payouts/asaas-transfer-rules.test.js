const {
  ASAAS_TRANSFER_OPERATION_PIX,
  buildTransferPayloadAsaas,
} = require('../../src/services/payments/gateways/asaas/asaas-rules');

describe('buildTransferPayloadAsaas', () => {
  it('monta a transferência Pix com valor em reais', () => {
    const result = buildTransferPayloadAsaas({
      valueCents: 15000,
      pixKey: 'ana@example.com',
      description: 'Saque Designflix - colaborador 42',
    });

    expect(result).toEqual({
      ok: true,
      payload: {
        value: 150,
        operationType: ASAAS_TRANSFER_OPERATION_PIX,
        pixAddressKey: 'ana@example.com',
        description: 'Saque Designflix - colaborador 42',
      },
    });
  });

  it('inclui o tipo da chave só quando informado, normalizado', () => {
    const withType = buildTransferPayloadAsaas({
      valueCents: 10000,
      pixKey: '12345678909',
      pixKeyType: 'cpf',
    });
    expect(withType.payload.pixAddressKeyType).toBe('CPF');

    const withoutType = buildTransferPayloadAsaas({
      valueCents: 10000,
      pixKey: '12345678909',
    });
    expect(withoutType.payload).not.toHaveProperty('pixAddressKeyType');
    expect(withoutType.payload).not.toHaveProperty('description');
  });

  it('recusa valor zero, negativo ou não numérico', () => {
    expect(
      buildTransferPayloadAsaas({ valueCents: 0, pixKey: 'ana@example.com' })
    ).toEqual({ ok: false, message: 'Valor da transferência inválido' });
    expect(
      buildTransferPayloadAsaas({ valueCents: -100, pixKey: 'ana@example.com' })
        .ok
    ).toBe(false);
    expect(
      buildTransferPayloadAsaas({ valueCents: 'abc', pixKey: 'ana@example.com' })
        .ok
    ).toBe(false);
  });

  it('recusa chave Pix vazia', () => {
    expect(
      buildTransferPayloadAsaas({ valueCents: 10000, pixKey: '   ' })
    ).toEqual({ ok: false, message: 'Chave Pix é obrigatória' });
    expect(buildTransferPayloadAsaas({ valueCents: 10000 }).ok).toBe(false);
  });

  it('não deixa campo extra do cliente vazar para o Asaas', () => {
    const result = buildTransferPayloadAsaas({
      valueCents: 10000,
      pixKey: 'ana@example.com',
      bankAccount: { agency: '0001' },
    });

    expect(Object.keys(result.payload).sort()).toEqual([
      'operationType',
      'pixAddressKey',
      'value',
    ]);
  });
});
