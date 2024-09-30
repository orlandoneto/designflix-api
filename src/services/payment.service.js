const stripe = require("../config/stripe");
const { sendEmail } = require("../utils/emailService");

module.exports = class {
  async createSubscription(req, res) {
    try {
      const { userId, planId, planName, email, paymentMethodId } = req.body;
      console.log("paymentMethodId", paymentMethodId);
      const customer = await stripe.customers.create({
        email,
        payment_method: paymentMethodId,
        invoice_settings: {
          default_payment_method: paymentMethodId,
        },
      });
      await stripe.paymentMethods.attach(paymentMethodId, {
        customer: customer.id,
      });

      const subscription = await stripe.subscriptions.create({
        customer: customer.id,
        items: [{ plan: planId }],
        expand: ["latest_invoice.payment_intent"],
      });

      this.handleSendEmail(email);
      res.status(200).json(subscription);
    } catch (error) {
      console.log(error);
      res.status(500).json({
        message: error.message,
      });
    }
  }

  handleWebhook(req, res) {
    console.log(req.body);

    const sig = req.headers["stripe-signature"];

    let event;

    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (error) {
      console.log(error);
      return res.status(400).send(`Webhook Error: ${error.message}`);
    }

    const paymentIntent = event.data.object;

    switch (event.type) {
      case "invoice.payment_succeeded":
        this.handlePaymentSucceeded(paymentIntent);
        break;
      case "invoice.payment_failed":
        this.handlePaymentFailed(paymentIntent);
        break;
      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    res.json({ received: true });
  }

  handlePaymentSucceeded(paymentIntent) {
    console.log("Payment succeeded", paymentIntent);
  }

  handlePaymentFailed(paymentIntent) {
    console.log("Payment failed", paymentIntent);
  }

  handleSendEmail(email) {
    const paramsEmail = {
      email: email,
      name: email.replace(/^[^@]+/, "") || "DesignFlix",
      title: "DesignFlix - Assinatura concluída",
      description: `<p>Sua Assinatura esta: <strong>concluída</strong></p>`,
    };

    const context = {
      name: "DesignFlix",
    };

    sendEmail(paramsEmail, "index", context)
      .then((response) => {
        console.log("Email enviado com sucesso:", response);
      })
      .catch((error) => {
        console.error("Erro ao enviar email:", error);
      });
  }
};
