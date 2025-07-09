const { UserPayout, User } = require("../models");
const stripeModule = require("../modules/stripe.module");
const { PALN_COMMISSION } = require("../utils/constants/constants");

class UserPayoutsServices {
  async requestPayout(req, res) {
    const { userId, amount } = req.body; // O usuário escolhe o valor do saque


    try {
      // Verifica o saldo do usuário
      const user = await User.findOne({
        where: { id: userId },
        attributes: ["balance", "stripe_account_id", "last_payout"],
      });

      if (!user) {
        return res
          .status(404)
          .json({ success: false, message: "Usuário não encontrado." });
      }

      // Verifica se o saldo é suficiente
      if (user.balance < amount) {
        return res
          .status(400)
          .json({ success: false, message: "Saldo insuficiente para saque." });
      }

      // Verifica se o valor do saque é maior ou igual ao mínimo definido
      const minPayoutAmount = PALN_COMMISSION.payout_contributor; // Valor já está em centavos
      if (amount < minPayoutAmount) {
        return res.status(400).json({
          success: false,
          message: `O valor do saque deve ser maior ou igual a R$ ${(minPayoutAmount / 100).toFixed(2)}.`,
        });
      }

      // Verifica se já houve um saque neste mês
      const currentDate = new Date();
      const lastPayoutDate = user.last_payout
        ? new Date(user.last_payout)
        : null;

      if (
        lastPayoutDate &&
        lastPayoutDate.getMonth() === currentDate.getMonth()
      ) {
        return res.status(400).json({
          success: false,
          message: "Você já solicitou um saque este mês.",
        });
      }

      // Adiciona as taxas de saque do Stripe
      const stripeFee = amount * 0.0149 + 0.25; // Taxa de 1.49% + R$ 0,25
      const finalAmount = amount - stripeFee;

      // Transfere o valor para a conta do usuário no Stripe
      await stripeModule.makeTransfer(user.stripe_account_id, finalAmount);

      // Registra o pagamento
      await UserPayout.create({
        user_id: userId,
        amount: finalAmount,
        requested_at: new Date(),
        status: "paid",
      });

      // Atualiza o saldo do usuário e a data do último saque
      await User.update(
        {
          balance: user.balance - amount,
          last_payout: new Date(),
        },
        { where: { id: userId } }
      );

      res.status(200).json({
        success: true,
        message: `Saque de R$ ${finalAmount.toFixed(2)} realizado com sucesso.`,
        transfer,
      });
    } catch (error) {
      console.error("Erro ao processar saque:", error);
      res
        .status(500)
        .json({ success: false, message: "Erro ao processar saque." });
    }
  }

  async choosePayoutMethod(req, res) {
    const { userId, paymentMethod } = req.body;

    try {
      const user = await User.findOne({
        where: { id: userId },
        attributes: ["stripe_account_id"],
      });

      if (!user) {
        return res
          .status(404)
          .json({ success: false, message: "Usuário não encontrado." });
      }

      await stripeModule.updatePaymentMethod(user.stripe_account_id, paymentMethod);

      res.status(200).json({
        success: true,
        message: `Método de pagamento atualizado para ${paymentMethod}.`,
      });
    } catch (error) {
      console.error("Erro ao atualizar o método de pagamento:", error);
      res.status(500).json({
        success: false,
        message: "Erro ao atualizar o método de pagamento.",
      });
    }
  }
}

module.exports = new UserPayoutsServices();
