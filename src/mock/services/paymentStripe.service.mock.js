    // =============================================
    // INÍCIO DA SEÇÃO DE MOCK (REMOVA APÓS TESTES)
    // =============================================
    
    // Mock dos dados do evento Stripe
    data = {
      id: 'sub_mock123456789',
      object: 'subscription',
      customer: 'cus_mock_orlando123',
      status: 'canceled',
      cancel_at_period_end: true,
      current_period_end: Math.floor(Date.now() / 1000) + 86400, // 1 dia no futuro
      items: {
        data: [{
          price: {
            product: 'prod_premium_mock'
          }
        }]
      }
    };

    // Mock da resposta do Stripe para customer.retrieve()
    const customer = {
      id: 'cus_mock_orlando123',
      object: 'customer',
      email: 'orlandoneto23@gmail.com',
      name: 'Orlando Neto',
      metadata: {}
    };

    // =============================================
    // FIM DA SEÇÃO DE MOCK
    // =============================================