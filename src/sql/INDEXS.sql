# Criar índice FULLTEXT na coluna terms
ALTER TABLE user_main_grid ADD FULLTEXT(terms);

# Verificar se o índice foi criado

CREATE INDEX idx_tags_name ON tags(name);
CREATE INDEX idx_categories_name ON categories(name);
SHOW INDEX FROM tags;

