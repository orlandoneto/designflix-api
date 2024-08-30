/*!40101 SET NAMES utf8 */;
/*!40014 SET FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET SQL_NOTES=0 */;
CREATE DATABASE /*!32312 IF NOT EXISTS*/ designflix /*!40100 DEFAULT CHARACTER SET utf8mb4 */;
USE designflix;

DROP TABLE IF EXISTS admin;
CREATE TABLE `admin` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `email` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `name` varchar(255) NOT NULL,
  `type` varchar(45) DEFAULT 'DEFAULT',
  `is_reset_password` int(11) DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `super_admin` tinyint(1) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email_UNIQUE` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8;

DROP TABLE IF EXISTS installer;
CREATE TABLE `installer` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `photo` text,
  `name` varchar(250) NOT NULL,
  `fantasy` varchar(250) DEFAULT NULL,
  `email` varchar(250) NOT NULL,
  `document_photo` text,
  `state_registration` varchar(250) NOT NULL,
  `phone` varchar(250) NOT NULL,
  `password` varchar(250) NOT NULL,
  `is_reset_password` int(11) NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `documento` varchar(255) NOT NULL,
  `status` enum('APEND','BFIX','CACTIVE') NOT NULL,
  `postal_code` text NOT NULL,
  `street` text NOT NULL,
  `number` text NOT NULL,
  `complement` text,
  `district` text NOT NULL,
  `city` text NOT NULL,
  `state` text NOT NULL,
  `country` varchar(255) DEFAULT NULL,
  `statusMessage` varchar(255) DEFAULT NULL,
  `bank_bank` varchar(255) DEFAULT NULL,
  `bank_agency` varchar(255) DEFAULT NULL,
  `bank_number` varchar(255) DEFAULT NULL,
  `bank_name` varchar(255) DEFAULT NULL,
  `bank_documento` varchar(250) DEFAULT NULL,
  `razao_social` varchar(250) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email_UNIQUE` (`email`),
  UNIQUE KEY `id_UNIQUE` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=83 DEFAULT CHARSET=utf8;

DROP TABLE IF EXISTS installer_training;
CREATE TABLE `installer_training` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `installer_id` int(11) NOT NULL,
  `training_id` int(11) NOT NULL,
  `is_default` tinyint(4) DEFAULT '0',
  `date` datetime DEFAULT NULL,
  `period` varchar(45) DEFAULT NULL,
  `status` varchar(250) DEFAULT 'PEND',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_user_credit_card_copy1_installer1_idx` (`installer_id`),
  KEY `fk_installer_trainings_training1_idx` (`training_id`),
  CONSTRAINT `fk_installer_trainings_training1` FOREIGN KEY (`training_id`) REFERENCES `training` (`id`),
  CONSTRAINT `fk_user_credit_card_copy1_installer10` FOREIGN KEY (`installer_id`) REFERENCES `installer` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

DROP TABLE IF EXISTS installer_transactions;
CREATE TABLE `installer_transactions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `installer_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `date` datetime DEFAULT NULL,
  `value` varchar(45) DEFAULT NULL,
  `date_transaction` datetime DEFAULT NULL,
  `status` varchar(250) DEFAULT 'PEND',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_user_credit_card_copy1_installer1_idx` (`installer_id`),
  KEY `fk_installer_transactions_user1_idx` (`user_id`),
  CONSTRAINT `fk_installer_transactions_user1` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`),
  CONSTRAINT `fk_user_credit_card_copy1_installer100` FOREIGN KEY (`installer_id`) REFERENCES `installer` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

DROP TABLE IF EXISTS product;
CREATE TABLE `product` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(250) NOT NULL,
  `description` varchar(250) NOT NULL,
  `serie` varchar(250) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8;

DROP TABLE IF EXISTS product_category;
CREATE TABLE `product_category` (
  `id` int(11) NOT NULL AUTO_INCREMENT COMMENT 'primary key',
  `name` varchar(255) DEFAULT NULL,
  `url_icon` varchar(255) DEFAULT NULL,
  `created_at` datetime DEFAULT NULL COMMENT 'create time',
  `updated_at` datetime DEFAULT NULL COMMENT 'update time',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8;

DROP TABLE IF EXISTS product_faq;
CREATE TABLE `product_faq` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `product_id` int(11) NOT NULL,
  `question` varchar(250) NOT NULL,
  `answer` varchar(250) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_table1_product1_idx` (`product_id`),
  CONSTRAINT `fk_table1_product10` FOREIGN KEY (`product_id`) REFERENCES `product` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

DROP TABLE IF EXISTS product_manual;
CREATE TABLE `product_manual` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `product_id` int(11) NOT NULL,
  `name` varchar(250) NOT NULL,
  `description` varchar(250) NOT NULL,
  `photo` varchar(250) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_table1_product1_idx` (`product_id`),
  CONSTRAINT `fk_table1_product1` FOREIGN KEY (`product_id`) REFERENCES `product` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8;

DROP TABLE IF EXISTS product_video;
CREATE TABLE `product_video` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `product_manual_id` int(11) NOT NULL,
  `url` varchar(250) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_product_video_product_manual1_idx` (`product_manual_id`),
  CONSTRAINT `fk_product_video_product_manual1` FOREIGN KEY (`product_manual_id`) REFERENCES `product_manual` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8;

DROP TABLE IF EXISTS schedule;
CREATE TABLE `schedule` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `installer_id` int(11) NOT NULL,
  `user_address_id` int(11) NOT NULL,
  `date` datetime NOT NULL,
  `status` varchar(250) NOT NULL DEFAULT 'PEND',
  `period` varchar(250) NOT NULL,
  `is_active` tinyint(4) DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_schedule_user1_idx` (`user_id`),
  KEY `fk_schedule_installer1_idx` (`installer_id`),
  KEY `fk_schedule_user_address1_idx` (`user_address_id`),
  CONSTRAINT `fk_schedule_installer1` FOREIGN KEY (`installer_id`) REFERENCES `installer` (`id`),
  CONSTRAINT `fk_schedule_user1` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`),
  CONSTRAINT `fk_schedule_user_address1` FOREIGN KEY (`user_address_id`) REFERENCES `user_address` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

DROP TABLE IF EXISTS schedule_chat;
CREATE TABLE `schedule_chat` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `description` text NOT NULL,
  `installer_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_schedule_chat_installer1_idx` (`installer_id`),
  KEY `fk_schedule_chat_user1_idx` (`user_id`),
  CONSTRAINT `fk_schedule_chat_installer1` FOREIGN KEY (`installer_id`) REFERENCES `installer` (`id`),
  CONSTRAINT `fk_schedule_chat_user1` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

DROP TABLE IF EXISTS SequelizeMeta;
CREATE TABLE `SequelizeMeta` (
  `name` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  PRIMARY KEY (`name`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

DROP TABLE IF EXISTS training;
CREATE TABLE `training` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(250) NOT NULL,
  `description` varchar(250) NOT NULL,
  `local` varchar(250) DEFAULT NULL,
  `status` varchar(250) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

DROP TABLE IF EXISTS user;
CREATE TABLE `user` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(250) NOT NULL,
  `photo` text,
  `email` varchar(250) NOT NULL,
  `cpf` varchar(11) NOT NULL,
  `phone` varchar(11) NOT NULL,
  `password` varchar(250) NOT NULL,
  `is_reset_password` int(11) NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email_UNIQUE` (`email`),
  UNIQUE KEY `cpf_UNIQUE` (`cpf`)
) ENGINE=InnoDB AUTO_INCREMENT=77 DEFAULT CHARSET=utf8;

DROP TABLE IF EXISTS user_address;
CREATE TABLE `user_address` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `name` text,
  `postal_code` text NOT NULL,
  `street` text NOT NULL,
  `number` text NOT NULL,
  `complement` text,
  `district` text NOT NULL,
  `state` varchar(45) NOT NULL,
  `city` text NOT NULL,
  `is_principal` tinyint(4) NOT NULL DEFAULT '0',
  `country` varchar(5) DEFAULT 'BR',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_user_address_user_idx` (`user_id`),
  CONSTRAINT `fk_user_address_user` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=28 DEFAULT CHARSET=utf8;

DROP TABLE IF EXISTS user_credit_card;
CREATE TABLE `user_credit_card` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `name` varchar(250) NOT NULL,
  `number` varchar(250) NOT NULL,
  `month` varchar(250) NOT NULL,
  `year` varchar(250) NOT NULL,
  `type` varchar(250) DEFAULT 'VISA',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_user_credit_card_user1_idx` (`user_id`),
  CONSTRAINT `fk_user_credit_card_user1` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=35 DEFAULT CHARSET=utf8;

DROP TABLE IF EXISTS user_invoice;
CREATE TABLE `user_invoice` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `cnpj` varchar(250) NOT NULL,
  `invoice_number` varchar(250) NOT NULL,
  `invoice_date` datetime NOT NULL,
  `motor_quantity` int(11) NOT NULL,
  `remote_control_quantity` int(11) NOT NULL,
  `photo` text,
  `is_active` tinyint(4) NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_user_invoice_user1_idx` (`user_id`),
  CONSTRAINT `fk_user_invoice_user1` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8;

DROP TABLE IF EXISTS user_invoice_product;
CREATE TABLE `user_invoice_product` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `quantity` int(11) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `user_invoice_id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_user_invoice_product_user_invoice1_idx` (`user_invoice_id`),
  KEY `fk_user_invoice_product_product1_idx` (`product_id`),
  CONSTRAINT `fk_user_invoice_product_product1` FOREIGN KEY (`product_id`) REFERENCES `product` (`id`),
  CONSTRAINT `fk_user_invoice_product_user_invoice1` FOREIGN KEY (`user_invoice_id`) REFERENCES `user_invoice` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

INSERT INTO admin(id,email,password,name,type,is_reset_password,created_at,updated_at,super_admin) VALUES(1,'konarthur@gmail.com','$2b$10$E/d4SRt.1bSJFPHDcpKNSOkUOSWPeaQbdDR5GlzzheNXvWKRBgV5a','Arthur Konrath','DEFAULT',0,'2021-06-17 15:10:40','2021-07-13 18:16:00',1);
INSERT INTO SequelizeMeta(name) VALUES('202107131400-alter-installer-table.js'),('202107131421-alter-installer-bank.js');