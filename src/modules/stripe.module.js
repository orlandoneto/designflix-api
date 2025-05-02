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
            interval: "daily", // ou "weekly" ou "monthly"
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
 * Adiciona a chave PIX à conta conectada do usuário
 * @param {string} accountId - ID da conta conectada
 * @param {string} chavePix - Chave PIX do usuário
 */
async function addPixKeyToAccount(accountId, chavePix) {
  try {
    accountId,
      {
        external_account: {
          object: "bank_account",
          country: "BR",
          currency: "brl",
          account_holder_name: "Nome do Contribuidor", // Defina conforme necessário
          routing_number: chavePix, // Usando a chave PIX como 'routing_number'
          account_type: "checking", // Conta corrente
        },
      };
  } catch (error) {
    console.error("Erro ao adicionar chave PIX:", error);
    throw error;
  }
}

/**
 * Realiza o saque (payout) para a chave PIX do usuário
 * @param {string} userStripeAccountId - ID da conta conectada do usuário
 * @param {number} amount - Valor a ser sacado (em reais)
 */
async function makePayout(userStripeAccountId, amount) {
  try {
    const payout = await stripe.payouts.create(
      {
        amount: Math.round(amount * 100), // Convertendo para centavos
        currency: "brl",
        method: "instant", // Usar "instant" para PIX
      },
      {
        stripeAccount: userStripeAccountId, // Conta conectada
      }
    );

    console.log(
      `✅ Payout de R$ ${amount} enviado para a chave PIX do usuário.`
    );
    return payout;
  } catch (error) {
    console.error("Erro ao realizar o saque via PIX:", error);
    throw error;
  }
}

module.exports = {
  createConnectedAccount,
  addPixKeyToAccount,
  makePayout,
};
