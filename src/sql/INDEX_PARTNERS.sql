-- =====================================================
-- Índices para performance
-- =====================================================

-- Índices para Partners
CREATE INDEX idx_partners_code ON partners(code);
CREATE INDEX idx_partners_active ON partners(active);

-- Índices para Users_Partners
CREATE INDEX idx_users_partners_user_id ON users_partners(user_id);
CREATE INDEX idx_users_partners_partner_id ON users_partners(partner_id);
CREATE INDEX idx_users_partners_active ON users_partners(active);
CREATE INDEX idx_users_partners_dates ON users_partners(start_partner, end_partner);

-- =====================================================
-- Exemplos de inserção
-- =====================================================

-- Inserir parceiros de exemplo
INSERT INTO partners (name, code) VALUES 
('Partner Infinity Plans', 'PIP789');
