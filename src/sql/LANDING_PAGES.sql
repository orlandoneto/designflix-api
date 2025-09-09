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
  `user_id` INT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_landing_pages_username` (`username`),
  INDEX `idx_landing_pages_user_id` (`user_id`),
  CONSTRAINT `fk_landing_pages_user`
    FOREIGN KEY (`user_id`) REFERENCES `user`(`id`)
    ON UPDATE CASCADE
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


