-- Tabela de Landing Pages
CREATE TABLE IF NOT EXISTS `landing_pages` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `username` VARCHAR(255) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `video_url` VARCHAR(255) NULL,
  `image_url` VARCHAR(255) NULL,
  `cta_text` VARCHAR(255) NULL,
  `cta_link` VARCHAR(255) NULL,
  `tracking_code` TEXT NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Índice recomendado para busca por username
CREATE INDEX `idx_landing_pages_username` ON `landing_pages` (`username`);


