# Criar índice FULLTEXT na coluna terms
ALTER TABLE user_main_grid ADD FULLTEXT(terms);

# Verificar se o índice foi criado
SHOW INDEX FROM user_main_grids WHERE Key_name = 'terms';
