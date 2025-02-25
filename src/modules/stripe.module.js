const stripe = require("../config/stripe");

/**
 * Cria uma conta conectada para o usuário no Stripe Connect
 * @param {string} userEmail - E-mail do usuário
 */
async function createConnectedAccount(userEmail) {
  try {
    const account = await stripe.accounts.create({
      type: "express",
      country: "BR",
      email: userEmail,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      settings: {
        payouts: {
          schedule: {
            interval: "manual", // Pagamento manual
          },
        },
      },
    });

    return account.id;
  } catch (error) {
    console.error("Erro ao criar a conta conectada:", error);
    throw error;
  }
}

/**
 * Atualiza a conta conectada com dados bancários para TED
 * @param {string} accountId - ID da conta conectada
 * @param {object} bankDetails - Dados bancários para saque via TED
 */
async function createTedPayout(accountId, bankDetails) {
  try {
    await stripe.accounts.createExternalAccount(accountId, {
      external_account: {
        object: "bank_account",
        country: "BR",
        currency: "brl",
        account_holder_name: bankDetails.holder_name,
        routing_number: bankDetails.bank_code, // Código do banco (ex: 001 para Banco do Brasil)
        account_number: `${bankDetails.account_number}-${bankDetails.account_check_digit}`, // Conta com dígito
        account_type: bankDetails.account_type, // "checking" ou "savings"
      },
    });

    console.log("✅ Conta bancária adicionada com sucesso!");
  } catch (error) {
    console.error("❌ Erro ao adicionar conta bancária:", error);
    throw error;
  }
}

/**
 * Realiza o pagamento para a conta conectada do usuário
 * @param {string} userStripeAccountId - ID da conta conectada do usuário
 * @param {number} amount - Valor a ser transferido (em reais)
 */
async function makeTransfer(userStripeAccountId, amount) {
  try {
    const transfer = await stripe.transfers.create({
      amount: Math.round(amount * 100), // Valor em centavos
      currency: "brl",
      destination: userStripeAccountId,
    });

    console.log(
      `✅ Transferência de R$ ${amount} enviada para a conta Stripe do usuário.`
    );
    return transfer;
  } catch (error) {
    console.error("❌ Erro ao realizar o repasse:", error);
    throw error;
  }
}

/**
 * Realiza o saque (payout) para a conta bancária do usuário via PIX ou TED
 * @param {string} userStripeAccountId - ID da conta conectada do usuário
 * @param {number} amount - Valor a ser sacado (em reais)
 */
async function makePayout(userStripeAccountId, amount) {
  try {
    const payout = await stripe.payouts.create(
      {
        amount: Math.round(amount * 100), // Valor em centavos
        currency: "brl",
        method: "instant", // Usar "instant" para PIX, "standard" para TED
      },
      {
        stripeAccount: userStripeAccountId, // Conta conectada
      }
    );

    console.log(`✅ Payout de R$ ${amount} enviado para o banco do usuário.`);
    return payout;
  } catch (error) {
    console.error("❌ Erro ao realizar o saque:", error);
    throw error;
  }
}

module.exports = {
  createConnectedAccount,
  createTedPayout,
  makeTransfer,
  makePayout,
};
