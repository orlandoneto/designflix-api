# Rode primeiro para remover a função se existir
DROP FUNCTION IF EXISTS levenshtein;

# Crie a função
CREATE FUNCTION levenshtein(s1 VARCHAR(255), s2 VARCHAR(255))
RETURNS INT
DETERMINISTIC
BEGIN
  DECLARE s1_len, s2_len, i, j, c, c_temp, cost INT;
  DECLARE s1_char CHAR(1);
  DECLARE cv0 VARBINARY(256);
  DECLARE cv1 VARBINARY(256);

  SET s1_len = CHAR_LENGTH(s1);
  SET s2_len = CHAR_LENGTH(s2);
  SET cv1 = 0x00;

  IF s1 = s2 THEN
    RETURN 0;
  ELSEIF s1_len = 0 THEN
    RETURN s2_len;
  ELSEIF s2_len = 0 THEN
    RETURN s1_len;
  END IF;

  SET j = 1;
  WHILE j <= s2_len DO
    SET cv1 = CONCAT(cv1, CHAR(j));
    SET j = j + 1;
  END WHILE;

  SET i = 1;
  WHILE i <= s1_len DO
    SET s1_char = SUBSTRING(s1, i, 1);
    SET c = i;
    SET cv0 = CHAR(i);
    SET j = 1;

    WHILE j <= s2_len DO
      SET cost = IF(s1_char = SUBSTRING(s2, j, 1), 0, 1);
      SET c_temp = ORD(SUBSTRING(cv1, j, 1)) + 1;
      SET c = LEAST(c + 1, c_temp, ORD(SUBSTRING(cv1, j, 1)) + cost);
      SET cv0 = CONCAT(cv0, CHAR(c));
      SET j = j + 1;
    END WHILE;

    SET cv1 = cv0;
    SET i = i + 1;
  END WHILE;

  RETURN c;
END;

# Mostre a função criada
SHOW CREATE FUNCTION levenshtein;

# Teste a função
SELECT levenshtein('pasco', 'páscoa') AS dist;
