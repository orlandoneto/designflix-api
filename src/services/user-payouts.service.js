const { UserPayout, User } = require("../models");
const stripe = require("../config/stripe"); // Certifique-se de que o Stripe está configurado corretamente

class UserPayoutsServices {
  async requestPayout(req, res) {
    const { userId, amount } = req.body; // O usuário escolhe o valor do saque

    try {
      // Verifica o saldo do usuário
      const user = await User.findOne({
        where: { id: userId },
        attributes: ["balance", "stripe_account", "last_payout"],
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

      // Verifica se o valor do saque é maior ou igual a R$ 100,00
      if (amount < 100) {
        return res.status(400).json({
          success: false,
          message: "O valor do saque deve ser maior ou igual a R$ 100,00.",
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
      const stripeFee = (amount * 0.0149) + 0.25; // Taxa de 1.49% + R$ 0,25
      const finalAmount = amount - stripeFee;

      // Transfere o valor para a conta do usuário no Stripe
      const transfer = await stripe.transfers.create({
        amount: Math.round(finalAmount * 100), // Valor em centavos
        currency: "brl",
        destination: user.stripe_account,
      });

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
}

module.exports = new UserPayoutsServices();