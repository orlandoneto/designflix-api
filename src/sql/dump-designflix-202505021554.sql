-- MySQL dump 10.13  Distrib 8.0.19, for Win64 (x86_64)
--
-- Host: localhost    Database: designflix
-- ------------------------------------------------------
-- Server version	9.0.1

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `admin`
--

DROP TABLE IF EXISTS `admin`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `admin` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `is_reset_password` int NOT NULL DEFAULT '0',
  `super_admin` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `admin`
--

LOCK TABLES `admin` WRITE;
/*!40000 ALTER TABLE `admin` DISABLE KEYS */;
INSERT INTO `admin` VALUES (2,'Jose Orlando','orlandoneto23@gmail.com','$2b$10$aKCpNMCT0JUDCHf8TWr1wOohToHFgYKk6GQ6YnIIMw4pugGjItOGa',0,0,'2024-10-23 11:55:13','2024-10-23 11:55:13');
/*!40000 ALTER TABLE `admin` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `categories`
--

DROP TABLE IF EXISTS `categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `categories` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `active` int NOT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=120 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `categories`
--

LOCK TABLES `categories` WRITE;
/*!40000 ALTER TABLE `categories` DISABLE KEYS */;
INSERT INTO `categories` VALUES (1,'ABRIL AZUL',1,'2024-10-21 16:36:56','2024-10-21 16:36:56'),(2,'ABRIL VERDE',1,'2024-10-21 16:36:56','2024-10-21 16:36:56'),(3,'ACADEMIA',1,'2024-10-21 16:36:56','2024-10-21 16:36:56'),(4,'AGOSTO DOURADO',1,'2024-10-21 16:36:56','2024-10-21 16:36:56'),(5,'AGOSTO LILÁS',1,'2024-10-21 16:36:56','2024-10-21 16:36:56'),(6,'AGRONEGÓCIO',1,'2024-10-21 16:36:56','2024-10-21 16:36:56'),(7,'AGÊNCIA DE MARKETING',1,'2024-10-21 16:36:56','2024-10-21 16:36:56'),(8,'AGÊNCIA DE VIAGEM',1,'2024-10-21 16:36:56','2024-10-21 16:36:56'),(9,'ANIMAIS',1,'2024-10-21 16:36:56','2024-10-21 16:36:56'),(10,'ANIVERSÁRIO CIDADE',1,'2024-10-21 16:36:56','2024-10-21 16:36:56'),(11,'ANO NOVO',1,'2024-10-21 16:36:56','2024-10-21 16:36:56'),(12,'ARMAZÉM DE CONSTRUÇÃO',1,'2024-10-21 16:36:56','2024-10-21 16:36:56'),(13,'ARQUITETURA',1,'2024-10-21 16:36:56','2024-10-21 16:36:56'),(14,'ARTISTA',1,'2024-10-21 16:36:56','2024-10-21 16:36:56'),(15,'ASSISTÊNCIA TÉCNICA',1,'2024-10-21 16:36:56','2024-10-21 16:36:56'),(16,'AULAS DE BOXE',1,'2024-10-21 16:36:56','2024-10-21 16:36:56'),(17,'AULAS PARTICULARES',1,'2024-10-21 16:36:56','2024-10-21 16:36:56'),(18,'AUTOESCOLA',1,'2024-10-21 16:36:56','2024-10-21 16:36:56'),(19,'AVISOS E COMUNICADOS',1,'2024-10-21 16:36:56','2024-10-21 16:36:56'),(20,'AÇAÍ',1,'2024-10-21 16:36:56','2024-10-21 16:36:56'),(21,'AÇOUGUE',1,'2024-10-21 16:36:56','2024-10-21 16:36:56'),(22,'BACKGROUNDS',1,'2024-10-21 16:36:56','2024-10-21 16:36:56'),(23,'BAR',1,'2024-10-21 16:36:56','2024-10-21 16:36:56'),(24,'BARBEARIA',1,'2024-10-21 16:36:56','2024-10-21 16:36:56'),(25,'BASQUETE',1,'2024-10-21 16:36:56','2024-10-21 16:36:56'),(26,'BBB',1,'2024-10-21 16:36:56','2024-10-21 16:36:56'),(27,'BICICLETARIA',1,'2024-10-21 16:36:56','2024-10-21 16:36:56'),(28,'BLACK FRIDAY',1,'2024-10-21 16:36:56','2024-10-21 16:36:56'),(29,'BORRACHARIA',1,'2024-10-21 16:36:56','2024-10-21 16:36:56'),(30,'CAFETERIA',1,'2024-10-21 16:36:56','2024-10-21 16:36:56'),(31,'CARNAVAL',1,'2024-10-21 16:36:56','2024-10-21 16:36:56'),(32,'CARTÃO DE VISITA',1,'2024-10-21 16:36:56','2024-10-21 16:36:56'),(33,'CASA DE VINHO',1,'2024-10-21 16:36:56','2024-10-21 16:36:56'),(34,'CERVEJA',1,'2024-10-21 16:36:56','2024-10-21 16:36:56'),(35,'CHAVEIRO',1,'2024-10-21 16:36:56','2024-10-21 16:36:56'),(36,'CHURRASCARIA',1,'2024-10-21 16:36:56','2024-10-21 16:36:56'),(37,'CLUBE DE TIRO',1,'2024-10-21 16:36:56','2024-10-21 16:36:56'),(38,'CLÍNICA MÉDICA',1,'2024-10-21 16:36:56','2024-10-21 16:36:56'),(39,'CLÍNICA VETERINÁRIA',1,'2024-10-21 16:36:56','2024-10-21 16:36:56'),(40,'COMIDA',1,'2024-10-21 16:36:56','2024-10-21 16:36:56'),(41,'COMIDA FITNESS',1,'2024-10-21 16:36:56','2024-10-21 16:36:56'),(42,'COMIDA VEGANA',1,'2024-10-21 16:36:56','2024-10-21 16:36:56'),(43,'CONCESSIONÁRIA',1,'2024-10-21 16:36:56','2024-10-21 16:36:56'),(44,'CONSCIÊNCIA NEGRA',1,'2024-10-21 16:36:56','2024-10-21 16:36:56'),(45,'CONTABILIDADE',1,'2024-10-21 16:36:56','2024-10-21 16:36:56'),(46,'CONVITES',1,'2024-10-21 16:36:56','2024-10-21 16:36:56'),(47,'CORRETOR',1,'2024-10-21 16:36:56','2024-10-21 16:36:56'),(48,'CRIPTOMOEDAS',1,'2024-10-21 16:36:56','2024-10-21 16:36:56'),(49,'CROSS FIT',1,'2024-10-21 16:36:56','2024-10-21 16:36:56'),(50,'DANÇA',1,'2024-10-21 16:36:56','2024-10-21 16:36:56'),(51,'DATAS COMEMORATIVAS',1,'2024-10-21 16:36:56','2024-10-21 16:36:56'),(52,'DELIVERY',1,'2024-10-21 16:36:56','2024-10-21 16:36:56'),(53,'DENGUE',1,'2024-10-21 16:36:56','2024-10-21 16:36:56'),(54,'DENTISTA',1,'2024-10-21 16:36:56','2024-10-21 16:36:56'),(55,'DEPILAÇÃO A LASER',1,'2024-10-21 16:36:56','2024-10-21 16:36:56'),(56,'DEPÓSITO',1,'2024-10-21 16:36:56','2024-10-21 16:36:56'),(57,'DESIGNER GRÁFICO',1,'2024-10-21 16:36:56','2024-10-21 16:36:56'),(58,'DEZEMBRO VERMELHO',1,'2024-10-21 16:36:56','2024-10-21 16:36:56'),(59,'DIA DA MULHER',1,'2024-10-21 16:36:56','2024-10-21 16:36:56'),(60,'DIA DAS CRIANÇAS',1,'2024-10-21 16:36:56','2024-10-21 16:36:56'),(61,'DIA DAS MÃES',1,'2024-10-21 16:36:56','2024-10-21 16:36:56'),(62,'DIA DE FINADOS',1,'2024-10-21 16:36:56','2024-10-21 16:36:56'),(63,'DIA DO CLIENTE',1,'2024-10-21 16:36:56','2024-10-21 16:36:56'),(64,'DIA DO CONSUMIDOR',1,'2024-10-21 16:36:56','2024-10-21 16:36:56'),(65,'DIA DO FOTÓGRAFO',1,'2024-10-21 16:36:56','2024-10-21 16:36:56'),(66,'DIA DO TRABALHADOR',1,'2024-10-21 16:36:56','2024-10-21 16:36:56'),(67,'DOCES',1,'2024-10-21 16:36:56','2024-10-21 16:36:56'),(68,'EDUCAÇÃO',1,'2024-10-21 16:36:56','2024-10-21 16:36:56'),(69,'ELÉTRICA',1,'2024-10-21 16:36:56','2024-10-21 16:36:56'),(70,'ELÉTRICA AUTOMOTIVA',1,'2024-10-21 16:36:56','2024-10-21 16:36:56'),(71,'ELETRICISTA',1,'2024-10-21 16:36:56','2024-10-21 16:36:56'),(72,'ENERGIA SOLAR',1,'2024-10-21 16:36:56','2024-10-21 16:36:56'),(73,'ESTETICISTA',1,'2024-10-21 16:36:56','2024-10-21 16:36:56'),(74,'EVENTOS',1,'2024-10-21 16:36:56','2024-10-21 16:36:56'),(75,'EXTERMINADOR DE PRAGAS',1,'2024-10-21 16:36:56','2024-10-21 16:36:56'),(76,'FACE',1,'2024-10-21 16:36:56','2024-10-21 16:36:56'),(77,'FACULDADE',1,'2024-10-21 16:36:56','2024-10-21 16:36:56'),(78,'FAZENDA',1,'2024-10-21 16:36:56','2024-10-21 16:36:56'),(79,'FESTA',1,'2024-10-21 16:36:56','2024-10-21 16:36:56'),(80,'FINANÇAS',1,'2024-10-21 16:36:56','2024-10-21 16:36:56'),(81,'FITNESS',1,'2024-10-21 16:36:56','2024-10-21 16:36:56'),(82,'FLORES',1,'2024-10-21 16:36:56','2024-10-21 16:36:56'),(83,'FOTÓGRAFO',1,'2024-10-21 16:36:56','2024-10-21 16:36:56'),(84,'FRANGO ASSADO',1,'2024-10-21 16:36:56','2024-10-21 16:36:56'),(85,'FRUTAS',1,'2024-10-21 16:36:56','2024-10-21 16:36:56'),(86,'FUNCIONAL',1,'2024-10-21 16:36:56','2024-10-21 16:36:56'),(87,'FUTEBOL',1,'2024-10-21 16:36:56','2024-10-21 16:36:56'),(88,'GAMES',1,'2024-10-21 16:36:56','2024-10-21 16:36:56'),(89,'GELATERIA',1,'2024-10-21 16:36:56','2024-10-21 16:36:56'),(90,'GUARDA MUNICIPAL',1,'2024-10-21 16:36:56','2024-10-21 16:36:56'),(91,'HAMBURGUERIA',1,'2024-10-21 16:36:56','2024-10-21 16:36:56'),(92,'IMÓVEIS',1,'2024-10-21 16:36:56','2024-10-21 16:36:56'),(93,'IMPRENSA',1,'2024-10-21 16:36:56','2024-10-21 16:36:56'),(94,'INFLUENZA',1,'2024-10-21 16:36:56','2024-10-21 16:36:56'),(95,'INFORMATIVO',1,'2024-10-21 16:36:56','2024-10-21 16:36:56'),(96,'INSTAGRAM',1,'2024-10-21 16:36:56','2024-10-21 16:36:56'),(97,'INSTRUTOR',1,'2024-10-21 16:36:56','2024-10-21 16:36:56'),(98,'JARDINAGEM',1,'2024-10-21 16:36:56','2024-10-21 16:36:56'),(99,'JOGOS',1,'2024-10-21 16:36:56','2024-10-21 16:36:56'),(100,'JOGOS DE AZAR',1,'2024-10-21 16:36:56','2024-10-21 16:36:56'),(101,'JORNAL',1,'2024-10-21 16:36:56','2024-10-21 16:36:56'),(102,'LABORATÓRIO',1,'2024-10-21 16:36:56','2024-10-21 16:36:56'),(103,'LANCHONETE',1,'2024-10-21 16:36:56','2024-10-21 16:36:56'),(104,'LAVANDERIA',1,'2024-10-21 16:36:56','2024-10-21 16:36:56'),(105,'LETRAS DE MÚSICAS',1,'2024-10-21 16:36:56','2024-10-21 16:36:56'),(106,'LOJA DE MÓVEIS',1,'2024-10-21 16:36:56','2024-10-21 16:36:56'),(107,'LOJA DE TINTAS',1,'2024-10-21 16:36:56','2024-10-21 16:36:56'),(108,'LOJA ONLINE',1,'2024-10-21 16:36:56','2024-10-21 16:36:56'),(109,'LOJAS DE CELULARES',1,'2024-10-21 16:36:56','2024-10-21 16:36:56'),(110,'LOJAS DE CONVENIÊNCIA',1,'2024-10-21 16:36:56','2024-10-21 16:36:56'),(111,'LOJAS DE DEPARTAMENTO',1,'2024-10-21 16:36:56','2024-10-21 16:36:56'),(112,'LOJAS DE ROUPAS',1,'2024-10-21 16:36:56','2024-10-21 16:36:56'),(113,'LOJAS DE TÊNIS',1,'2024-10-21 16:36:56','2024-10-21 16:36:56'),(114,'LOJAS ONLINE',1,'2024-10-21 16:36:56','2024-10-21 16:36:56'),(115,'MADEIREIRA',1,'2024-10-21 16:36:56','2024-10-21 16:36:56'),(116,'MAIS QUE UM BAR',1,'2024-10-21 16:36:56','2024-10-21 16:36:56'),(117,'MARATONA',1,'2024-10-21 16:36:56','2024-10-21 16:36:56'),(118,'MARCENEIRO',1,'2024-10-21 16:36:56','2024-10-21 16:36:56'),(119,'MARIA DA PENHA',1,'2024-10-21 16:36:56','2024-10-21 16:36:56');
/*!40000 ALTER TABLE `categories` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `otps`
--

DROP TABLE IF EXISTS `otps`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `otps` (
  `id` int NOT NULL AUTO_INCREMENT,
  `email` varchar(255) NOT NULL,
  `otp` varchar(255) NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=19 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `otps`
--

LOCK TABLES `otps` WRITE;
/*!40000 ALTER TABLE `otps` DISABLE KEYS */;
INSERT INTO `otps` VALUES (14,'teste@gmail.com','858032','2024-12-30 13:26:56','2024-12-30 13:26:56'),(15,'designflixs3@gmail.com','229990','2024-12-30 13:27:43','2024-12-30 13:27:43'),(16,'designflixs3@gmail.com','579764','2024-12-30 13:30:28','2024-12-30 13:30:28'),(17,'designflixs3@gmail.com','340281','2024-12-30 13:36:28','2024-12-30 13:36:28'),(18,'orlandoneto23@gmail.com','454302','2025-01-09 13:18:48','2025-01-09 13:18:48');
/*!40000 ALTER TABLE `otps` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `plans`
--

DROP TABLE IF EXISTS `plans`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `plans` (
  `id` int NOT NULL AUTO_INCREMENT,
  `stripe_price_id` varchar(255) NOT NULL,
  `plan_name` varchar(255) NOT NULL,
  `count_downloads` int NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `type_plans` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `plans`
--

LOCK TABLES `plans` WRITE;
/*!40000 ALTER TABLE `plans` DISABLE KEYS */;
INSERT INTO `plans` VALUES (1,'price_1QUDYw2NtYxAX2BEesXpLqCw','free',1,'2024-10-21 16:36:56','2024-10-21 16:36:56',1),(2,'price_1QUDZj2NtYxAX2BE5NL5u6Dy','monthly',5,'2024-10-21 16:36:56','2024-11-07 14:04:11',1),(3,'price_1QUDaF2NtYxAX2BEKXJa2R5H','semi_annual',10,'2024-10-21 16:36:56','2024-10-21 16:36:56',1),(4,'price_1QUDah2NtYxAX2BEom1775Yr','annual',15,'2024-10-21 16:36:56','2024-10-21 16:36:56',1),(5,'price_1QU7FT2NtYxAX2BEjfkIEzUX','free',1,'2024-10-21 16:36:56','2024-10-21 16:36:56',2),(6,'price_1QU7GA2NtYxAX2BEFWyuKiV5','monthly',5,'2024-10-21 16:36:56','2024-11-07 14:04:11',2),(7,'price_1QU7HG2NtYxAX2BE8tDxRE7B','semi_annual',10,'2024-10-21 16:36:56','2024-10-21 16:36:56',2),(8,'price_1QU7I02NtYxAX2BEu9jKkmfE','annual',15,'2024-10-21 16:36:56','2024-10-21 16:36:56',2);
/*!40000 ALTER TABLE `plans` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `plans_download_limits`
--

DROP TABLE IF EXISTS `plans_download_limits`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `plans_download_limits` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `current_count_downloads` int NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `plans_download_limits_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=18 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `plans_download_limits`
--

LOCK TABLES `plans_download_limits` WRITE;
/*!40000 ALTER TABLE `plans_download_limits` DISABLE KEYS */;
INSERT INTO `plans_download_limits` VALUES (10,5,10,'2024-11-13 12:53:23','2024-11-13 12:54:06'),(11,6,1,'2024-11-14 19:36:52','2024-11-14 19:36:52'),(13,7,7,'2024-11-19 11:41:15','2024-11-19 13:26:26'),(14,4,10,'2024-11-19 11:42:11','2024-11-19 13:11:16'),(17,3,1,'2025-02-21 20:56:19','2025-02-21 21:39:30');
/*!40000 ALTER TABLE `plans_download_limits` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sequelizemeta`
--

DROP TABLE IF EXISTS `sequelizemeta`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sequelizemeta` (
  `name` varchar(255) COLLATE utf8mb3_unicode_ci NOT NULL,
  PRIMARY KEY (`name`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sequelizemeta`
--

LOCK TABLES `sequelizemeta` WRITE;
/*!40000 ALTER TABLE `sequelizemeta` DISABLE KEYS */;
/*!40000 ALTER TABLE `sequelizemeta` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tags`
--

DROP TABLE IF EXISTS `tags`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tags` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=74 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tags`
--

LOCK TABLES `tags` WRITE;
/*!40000 ALTER TABLE `tags` DISABLE KEYS */;
INSERT INTO `tags` VALUES (25,'teste','2024-11-11 12:06:11','2024-11-11 12:06:11'),(26,'teste','2024-11-12 16:43:42','2024-11-12 16:43:42'),(27,'teste a','2024-11-12 16:44:41','2024-11-12 16:44:41'),(28,'teste bb','2024-11-12 16:45:07','2024-11-12 16:45:07'),(29,'sdfs','2024-11-12 16:45:45','2024-11-12 16:45:45'),(30,'maria','2024-11-12 16:46:19','2024-11-12 16:46:19'),(31,'dfgdfgd','2024-11-12 16:46:38','2024-11-12 16:46:38'),(32,'teste','2025-01-08 19:48:46','2025-01-08 19:48:46'),(33,'teste 02','2025-01-09 13:35:49','2025-01-09 13:35:49'),(34,'teste 03','2025-01-09 13:37:42','2025-01-09 13:37:42'),(35,'teste 04','2025-01-09 13:40:48','2025-01-09 13:40:48'),(36,'teste 05','2025-01-09 13:43:16','2025-01-09 13:43:16'),(37,'teste 02','2025-01-14 17:40:35','2025-01-14 17:40:35'),(38,'teste','2025-01-14 17:41:37','2025-01-14 17:41:37'),(39,'teste','2025-01-14 17:43:10','2025-01-14 17:43:10'),(40,'teste','2025-01-14 21:24:15','2025-01-14 21:24:15'),(41,'teste','2025-01-14 21:40:24','2025-01-14 21:40:24'),(42,'sdfsd','2025-01-14 23:06:59','2025-01-14 23:06:59'),(43,'asda','2025-01-14 23:16:29','2025-01-14 23:16:29'),(44,'teste','2025-01-29 12:00:44','2025-01-29 12:00:44'),(45,'teste','2025-01-29 12:05:48','2025-01-29 12:05:48'),(46,'teste','2025-01-31 11:03:26','2025-01-31 11:03:26'),(47,'teste','2025-01-31 17:29:54','2025-01-31 17:29:54'),(48,'teste','2025-01-31 17:33:39','2025-01-31 17:33:39'),(49,'teste','2025-01-31 17:45:20','2025-01-31 17:45:20'),(50,'teste','2025-01-31 17:47:38','2025-01-31 17:47:38'),(51,'teste','2025-02-06 17:46:05','2025-02-06 17:46:05'),(52,'teste','2025-02-06 17:49:50','2025-02-06 17:49:50'),(53,'teste','2025-02-06 17:50:47','2025-02-06 17:50:47'),(54,'teste','2025-02-06 17:52:54','2025-02-06 17:52:54'),(55,'teste','2025-02-06 17:56:39','2025-02-06 17:56:39'),(56,'teste01','2025-02-19 17:17:01','2025-02-19 17:17:01'),(57,'teste 02','2025-02-19 17:51:37','2025-02-19 17:51:37'),(58,'teste','2025-02-19 17:56:27','2025-02-19 17:56:27'),(59,'asdas','2025-02-19 20:07:28','2025-02-19 20:07:28'),(60,'sdfs','2025-02-19 20:07:47','2025-02-19 20:07:47'),(61,'Teste','2025-02-19 20:23:52','2025-02-19 20:23:52'),(62,'teste','2025-02-27 17:55:57','2025-02-27 17:55:57'),(63,'Teste','2025-02-28 11:58:22','2025-02-28 11:58:22'),(64,'teste','2025-02-28 12:19:54','2025-02-28 12:19:54'),(65,'teste','2025-02-28 12:25:13','2025-02-28 12:25:13'),(66,'teste psd','2025-04-06 20:54:54','2025-04-06 20:54:54'),(67,'Teste PNG','2025-04-06 21:01:49','2025-04-06 21:01:49'),(68,'TESTE eps','2025-04-06 21:03:11','2025-04-06 21:03:11'),(69,'Teste SVG','2025-04-06 21:04:21','2025-04-06 21:04:21'),(70,'teste cdr','2025-04-06 21:04:55','2025-04-06 21:04:55'),(71,'teste jpeg','2025-04-06 21:05:36','2025-04-06 21:05:36'),(72,'teste canva','2025-04-06 21:07:09','2025-04-06 21:07:09'),(73,'canvas','2025-04-06 21:11:08','2025-04-06 21:11:08');
/*!40000 ALTER TABLE `tags` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user`
--

DROP TABLE IF EXISTS `user`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `contributor` int NOT NULL DEFAULT '0',
  `photo` varchar(255) DEFAULT NULL,
  `cpf` varchar(255) DEFAULT NULL,
  `phone` varchar(255) NOT NULL,
  `country_code` int NOT NULL DEFAULT '0',
  `privacy_policy` int NOT NULL DEFAULT '0',
  `accept_terms` int NOT NULL DEFAULT '0',
  `status` varchar(255) NOT NULL,
  `is_reset_password` int NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `balance` decimal(10,2) DEFAULT NULL,
  `last_payout` datetime DEFAULT NULL,
  `stripe_account_id` varchar(255) DEFAULT NULL,
  `chave_pix` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user`
--

LOCK TABLES `user` WRITE;
/*!40000 ALTER TABLE `user` DISABLE KEYS */;
INSERT INTO `user` VALUES (3,'Jose Orlando','orlandoneto23@gmail.com','$2b$10$t26D2Au9KnNRe08J.O2wVufBi0Wi05HVcIPSlYXk.l.L0Rhymw0ae',1,'',NULL,'5585987747221',55,1,1,'CACTIVE',0,'2024-10-22 14:03:17','2025-02-26 16:40:39',0.60,NULL,'acct_1QwndyRuv8zin2aY','85987747221'),(4,'Mayara Alves','mayara@gmail.com','$2b$10$t26D2Au9KnNRe08J.O2wVufBi0Wi05HVcIPSlYXk.l.L0Rhymw0ae',0,'',NULL,'45454545454',55,0,0,'CACTIVE',0,'2024-11-08 12:13:49','2024-11-11 11:54:03',NULL,NULL,NULL,NULL),(5,'Paulo Alves','paulo@gmail.com','$2b$10$a3GnLDHB0mDjI/cCQh0F9e8p9/rSgKi49FniT4kK8/r3NXUDNlNku',1,'',NULL,'45454545454',55,0,1,'CACTIVE',0,'2024-11-08 12:15:24','2024-11-11 11:54:18',NULL,NULL,NULL,NULL),(6,'Marjorie Alves','marjorie@gmail.com','$2b$10$uZVjLq.KV7X.2In/x.a6aeGurERN.U9nRME3OnzvDb0XAdTn1EReq',0,'',NULL,'45454545454',55,0,0,'CACTIVE',0,'2024-11-12 14:47:38','2024-11-12 14:58:14',NULL,NULL,NULL,NULL),(7,'teste Pix','maria@gmail.com','$2b$10$QphDngyas08Hz6.fuzxesOCdXhTGI1BYXclvqzl2mHPspYc8f2vIa',0,NULL,NULL,'45454545454',55,0,0,'CACTIVE',0,'2024-11-19 11:27:54','2024-11-19 11:27:54',NULL,NULL,NULL,NULL);
/*!40000 ALTER TABLE `user` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_address`
--

DROP TABLE IF EXISTS `user_address`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_address` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) DEFAULT NULL,
  `user_id` int NOT NULL,
  `postal_code` varchar(255) NOT NULL,
  `is_principal` int DEFAULT NULL,
  `street` varchar(255) NOT NULL,
  `number` int NOT NULL,
  `complement` varchar(255) DEFAULT NULL,
  `district` varchar(255) NOT NULL,
  `city` varchar(255) NOT NULL,
  `state` varchar(255) NOT NULL,
  `country` varchar(255) NOT NULL DEFAULT 'BR',
  `lat` varchar(255) DEFAULT NULL,
  `long` varchar(255) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `user_address_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_address`
--

LOCK TABLES `user_address` WRITE;
/*!40000 ALTER TABLE `user_address` DISABLE KEYS */;
/*!40000 ALTER TABLE `user_address` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_bug_reports`
--

DROP TABLE IF EXISTS `user_bug_reports`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_bug_reports` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `description` varchar(255) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `title` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `user_bug_reports_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_bug_reports`
--

LOCK TABLES `user_bug_reports` WRITE;
/*!40000 ALTER TABLE `user_bug_reports` DISABLE KEYS */;
INSERT INTO `user_bug_reports` VALUES (3,4,'Teste bug','2024-11-11 12:11:46','2024-11-11 12:11:46','Teste bug');
/*!40000 ALTER TABLE `user_bug_reports` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_commissions`
--

DROP TABLE IF EXISTS `user_commissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_commissions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `status` varchar(255) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `user_commissions_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_commissions`
--

LOCK TABLES `user_commissions` WRITE;
/*!40000 ALTER TABLE `user_commissions` DISABLE KEYS */;
INSERT INTO `user_commissions` VALUES (3,3,0.30,'2025-02-21 21:38:58','pending'),(4,3,0.30,'2025-02-21 21:39:37','pending');
/*!40000 ALTER TABLE `user_commissions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_complaints`
--

DROP TABLE IF EXISTS `user_complaints`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_complaints` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `description` varchar(255) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `title` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `user_complaints_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_complaints`
--

LOCK TABLES `user_complaints` WRITE;
/*!40000 ALTER TABLE `user_complaints` DISABLE KEYS */;
INSERT INTO `user_complaints` VALUES (3,4,'teste erro','2024-11-11 12:11:57','2024-11-11 12:11:57','Teste erro');
/*!40000 ALTER TABLE `user_complaints` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_credit_card`
--

DROP TABLE IF EXISTS `user_credit_card`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_credit_card` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `user_id` int NOT NULL,
  `number` int NOT NULL,
  `month` varchar(255) NOT NULL,
  `year` varchar(255) NOT NULL,
  `type` varchar(255) NOT NULL DEFAULT 'VISA',
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `user_credit_card_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_credit_card`
--

LOCK TABLES `user_credit_card` WRITE;
/*!40000 ALTER TABLE `user_credit_card` DISABLE KEYS */;
/*!40000 ALTER TABLE `user_credit_card` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_downloads`
--

DROP TABLE IF EXISTS `user_downloads`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_downloads` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `user_main_grid_id` int DEFAULT NULL,
  `contributor_image_admin_id` int DEFAULT NULL,
  `contributor_image_user_id` int DEFAULT NULL,
  `total_downloads` int DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `user_main_grid_id` (`user_main_grid_id`),
  CONSTRAINT `user_downloads_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`),
  CONSTRAINT `user_downloads_ibfk_2` FOREIGN KEY (`user_main_grid_id`) REFERENCES `user_main_grid` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_downloads`
--

LOCK TABLES `user_downloads` WRITE;
/*!40000 ALTER TABLE `user_downloads` DISABLE KEYS */;
INSERT INTO `user_downloads` VALUES (10,3,59,NULL,3,9,'2025-02-21 21:01:01','2025-02-21 21:38:31'),(11,3,58,NULL,3,1,'2025-02-21 21:39:30','2025-02-21 21:39:30');
/*!40000 ALTER TABLE `user_downloads` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_favorites`
--

DROP TABLE IF EXISTS `user_favorites`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_favorites` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `user_main_grid_id` int NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `user_main_grid_id` (`user_main_grid_id`),
  CONSTRAINT `user_favorites_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON DELETE CASCADE,
  CONSTRAINT `user_favorites_ibfk_2` FOREIGN KEY (`user_main_grid_id`) REFERENCES `user_main_grid` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_favorites`
--

LOCK TABLES `user_favorites` WRITE;
/*!40000 ALTER TABLE `user_favorites` DISABLE KEYS */;
/*!40000 ALTER TABLE `user_favorites` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_follows`
--

DROP TABLE IF EXISTS `user_follows`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_follows` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `contributor_image_admin_id` int DEFAULT NULL,
  `contributor_image_user_id` int DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `user_follows_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_follows`
--

LOCK TABLES `user_follows` WRITE;
/*!40000 ALTER TABLE `user_follows` DISABLE KEYS */;
INSERT INTO `user_follows` VALUES (6,4,NULL,5,'2024-11-11 12:25:12','2024-11-11 12:25:12'),(7,4,NULL,5,'2024-11-11 12:29:27','2024-11-11 12:29:27');
/*!40000 ALTER TABLE `user_follows` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_main_grid`
--

DROP TABLE IF EXISTS `user_main_grid`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_main_grid` (
  `id` int NOT NULL AUTO_INCREMENT,
  `admin_id` int DEFAULT NULL,
  `user_id` int DEFAULT NULL,
  `name` varchar(255) NOT NULL,
  `format` varchar(255) NOT NULL,
  `url_cover` varchar(255) DEFAULT NULL,
  `url` varchar(255) DEFAULT NULL,
  `favorite` int DEFAULT NULL,
  `follow_design` int DEFAULT NULL,
  `count_download` int DEFAULT NULL,
  `terms` text,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `admin_id` (`admin_id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `user_main_grid_ibfk_1` FOREIGN KEY (`admin_id`) REFERENCES `admin` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `user_main_grid_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=73 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_main_grid`
--

LOCK TABLES `user_main_grid` WRITE;
/*!40000 ALTER TABLE `user_main_grid` DISABLE KEYS */;
INSERT INTO `user_main_grid` VALUES (55,NULL,3,'Teste 01','CANVA','https://designflix-storage.s3.amazonaws.com/covers_dev/da8f32827488911c79bda4b762eb99a1-36e48d11-c64a-4c0f-8929-9fc9ea948699.jpg','https://www.pcprofessionale.it/wp-content/uploads/2017/11/Google-foto.jpg',NULL,NULL,NULL,'Teste 01, CANVA, ABRIL AZUL, teste01','2025-02-19 17:17:01','2025-02-19 17:17:01'),(56,NULL,3,'teste 02','PSD','https://designflix-storage.s3.amazonaws.com/covers_dev/ef9b32cdbff0c3813073821bbf100956-WhatsApp Image 2025-02-11 at 14.39.38.jpeg','https://designflix-storage.s3.sa-east-1.amazonaws.com/images_dev/a134fc0ad5c8c70c96bb9beaf2a953f3-comentarios+fakes.zip',NULL,NULL,NULL,'teste 02, PSD, ABRIL VERDE, teste 02','2025-02-19 17:51:37','2025-02-19 17:51:37'),(57,NULL,3,'teste','PNG','https://designflix-storage.s3.amazonaws.com/covers_dev/827debeccf70e4178321ee92e274e493-WhatsApp Image 2025-02-11 at 14.39.38.jpeg','https://designflix-storage.s3.sa-east-1.amazonaws.com/images_dev/c4978b8ec295bbbe2ac2a4cbcbbe919f-comentarios+fakes.zip',NULL,NULL,NULL,'teste, PNG, ABRIL AZUL, teste','2025-02-19 17:56:27','2025-02-19 17:56:27'),(58,NULL,3,'asdas','PNG','https://designflix-storage.s3.amazonaws.com/covers_dev/d1582b29974f82eb5e8d213c00744c0a-WhatsApp Image 2025-02-11 at 14.39.38.jpeg','https://designflix-storage.s3.sa-east-1.amazonaws.com/images_dev/b6e822fae95d13ff3e1c8b5bf6667f40-comentarios+fakes.zip',NULL,NULL,NULL,'asdas, PNG, ABRIL VERDE, asdas','2025-02-19 20:07:28','2025-02-19 20:07:28'),(59,NULL,3,'sdfsdf','PSD','https://designflix-storage.s3.amazonaws.com/covers_dev/8acaa086253aa77bba06600a3844a18e-WhatsApp Image 2025-02-11 at 14.39.38.jpeg','https://designflix-storage.s3.sa-east-1.amazonaws.com/images_dev/37d2c94c60572f4635d531502feb44f6-comentarios+fakes.zip',NULL,NULL,NULL,'sdfsdf, PSD, ABRIL AZUL, sdfs','2025-02-19 20:07:47','2025-02-19 20:07:47'),(60,NULL,3,'Teste','CANVA','https://designflix-storage.s3.amazonaws.com/covers_dev/b5569f6dc5520aadaf1f769c926a5652-kickoff_d2-4317.jpg','https://maisgeek.com/wp-content/uploads/2022/05/shutterstock_1992038288.png',NULL,NULL,NULL,'Teste, CANVA, ABRIL AZUL, Teste','2025-02-19 20:23:52','2025-02-19 20:23:52'),(61,NULL,3,'teste','PSD','https://designflix-storage.s3.amazonaws.com/covers_dev/f92e7e2059596d5526d1acf26e0f68b6-WhatsApp Image 2025-02-20 at 12.43.01.jpeg','https://designflix-storage.s3.sa-east-1.amazonaws.com/images_dev/79ddb615d937cac9237c9aa3c4c1a57c-comentarios+fakes.zip',NULL,NULL,NULL,'teste, PSD, ABRIL VERDE, teste','2025-02-27 17:55:57','2025-02-27 17:55:57'),(62,NULL,3,'Teste','PSD','https://designflix-storage.s3.amazonaws.com/covers_dev/c3b99572352143d1408d520894cdad8a-WhatsApp Image 2025-02-20 at 12.43.00.jpeg','https://designflix-storage.s3.sa-east-1.amazonaws.com/images_dev/2523baec68d902806496b6d5fd2785c3-comentarios+fakes.zip',NULL,NULL,NULL,'Teste, PSD, ABRIL AZUL, Teste','2025-02-28 11:58:22','2025-02-28 11:58:22'),(63,NULL,3,'Teste','PSD','https://designflix-storage.s3.amazonaws.com/covers_dev/51c38076d9cbf227acd240b9781d6b99-WhatsApp Image 2025-02-20 at 12.42.59.jpeg','https://designflix-storage.s3.sa-east-1.amazonaws.com/images_dev/a089505ee4be6f0e8099311bf43ac928-comentarios+fakes.zip',NULL,NULL,NULL,'Teste, PSD, ABRIL AZUL, teste','2025-02-28 12:19:54','2025-02-28 12:19:54'),(64,NULL,3,'Teste','PSD','https://designflix-storage.s3.amazonaws.com/covers_dev/a21a08f1dddcfbd2460454efc1f1cafc-1740745511215.webp','https://designflix-storage.s3.sa-east-1.amazonaws.com/images_dev/9cd55f48efa86e787fdbf7bb89df6522-comentarios+fakes.zip',NULL,NULL,NULL,'Teste, PSD, ABRIL AZUL, teste','2025-02-28 12:25:13','2025-02-28 12:25:13'),(65,NULL,3,'Teste PSD','PSD','https://designflix-storage.s3.amazonaws.com/covers_dev/4529da07a1c5d96e7fcde7b68ccc4f6a-1743972892354.webp','https://designflix-storage.s3.sa-east-1.amazonaws.com/images_dev/1ffa5c7f1de6730e45ed1ddacd7070de-comentarios+fakes.zip',NULL,NULL,NULL,'Teste PSD, PSD, ABRIL VERDE, teste psd','2025-04-06 20:54:54','2025-04-06 20:54:54'),(66,NULL,3,'Teste PNG','PNG','https://designflix-storage.s3.amazonaws.com/covers_dev/30a9e6038dbf72ad729e7598afa15827-1743973307369.webp','https://designflix-storage.s3.sa-east-1.amazonaws.com/images_dev/1e819ce235aaa80f82a94c56091764e7-comentarios+fakes.zip',NULL,NULL,NULL,'Teste PNG, PNG, ABRIL AZUL, Teste PNG','2025-04-06 21:01:49','2025-04-06 21:01:49'),(67,NULL,3,'TESTE eps','EPS','https://designflix-storage.s3.amazonaws.com/covers_dev/cbe2bf6e37dfd102276aaff780b4f2b3-1743973389127.webp','https://designflix-storage.s3.sa-east-1.amazonaws.com/images_dev/5c9fc5f8987ce711ab86a58d93c18b7e-comentarios+fakes.zip',NULL,NULL,NULL,'TESTE eps, EPS, ABRIL VERDE, TESTE eps','2025-04-06 21:03:11','2025-04-06 21:03:11'),(68,NULL,3,'Teste SVG','SVG','https://designflix-storage.s3.amazonaws.com/covers_dev/e6e9c1edd4a96d4493265ecbec90710d-1743973459453.webp','https://designflix-storage.s3.sa-east-1.amazonaws.com/images_dev/fdcfc5183c2c9b5d63a806eb459cb09c-comentarios+fakes.zip',NULL,NULL,NULL,'Teste SVG, SVG, ABRIL AZUL, Teste SVG','2025-04-06 21:04:21','2025-04-06 21:04:21'),(69,NULL,3,'teste cdr','CDR','https://designflix-storage.s3.amazonaws.com/covers_dev/2ce56a090fc78525257a155504804ba0-1743973494035.webp','https://designflix-storage.s3.sa-east-1.amazonaws.com/images_dev/91898d06a86b74801670ef7a5c335fd3-comentarios+fakes.zip',NULL,NULL,NULL,'teste cdr, CDR, ABRIL AZUL, teste cdr','2025-04-06 21:04:55','2025-04-06 21:04:55'),(70,NULL,3,'teste jpeg','JPEG','https://designflix-storage.s3.amazonaws.com/covers_dev/d5f32580cd649399df5261b962f317e6-1743973535721.webp','https://designflix-storage.s3.sa-east-1.amazonaws.com/images_dev/34a8a761c28c4454373eafcae9d67471-WhatsApp%20Image%202025-02-20%20at%2012.42.59%20%282%29.jpeg',NULL,NULL,NULL,'teste jpeg, JPEG, ABRIL VERDE, teste jpeg','2025-04-06 21:05:36','2025-04-06 21:05:36'),(71,NULL,3,'teste canva','CANVA','https://designflix-storage.s3.amazonaws.com/covers_dev/6385de840544cfb0109633c6ec494b1e-1743973629305.webp','https://www.filhao.com.br/noticia/adicionais/90-62-criando-arte-com-inteligencia-artificial-midjourney-e-outras.png',NULL,NULL,NULL,'teste canva, CANVA, AGOSTO DOURADO, teste canva','2025-04-06 21:07:09','2025-04-06 21:07:09'),(72,NULL,3,'canvas','CANVA','https://designflix-storage.s3.amazonaws.com/covers_dev/d49cf51d9b4a41da5139741f14d06263-1743973868328.webp','https://www.filhao.com.br/noticia/adicionais/90-62-criando-arte-com-inteligencia-artificial-midjourney-e-outras.png',NULL,NULL,NULL,'canvas, CANVA, ABRIL VERDE, canvas','2025-04-06 21:11:08','2025-04-06 21:11:08');
/*!40000 ALTER TABLE `user_main_grid` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_main_grid_categories`
--

DROP TABLE IF EXISTS `user_main_grid_categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_main_grid_categories` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_main_grid_id` int NOT NULL,
  `category_id` int NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `user_main_grid_id` (`user_main_grid_id`),
  KEY `category_id` (`category_id`),
  CONSTRAINT `user_main_grid_categories_ibfk_1` FOREIGN KEY (`user_main_grid_id`) REFERENCES `user_main_grid` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `user_main_grid_categories_ibfk_2` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=74 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_main_grid_categories`
--

LOCK TABLES `user_main_grid_categories` WRITE;
/*!40000 ALTER TABLE `user_main_grid_categories` DISABLE KEYS */;
INSERT INTO `user_main_grid_categories` VALUES (56,55,1,'2025-02-19 17:17:01','2025-02-19 17:17:01'),(57,56,2,'2025-02-19 17:51:37','2025-02-19 17:51:37'),(58,57,1,'2025-02-19 17:56:27','2025-02-19 17:56:27'),(59,58,2,'2025-02-19 20:07:28','2025-02-19 20:07:28'),(60,59,1,'2025-02-19 20:07:47','2025-02-19 20:07:47'),(61,60,1,'2025-02-19 20:23:52','2025-02-19 20:23:52'),(62,61,2,'2025-02-27 17:55:57','2025-02-27 17:55:57'),(63,62,1,'2025-02-28 11:58:22','2025-02-28 11:58:22'),(64,63,1,'2025-02-28 12:19:54','2025-02-28 12:19:54'),(65,64,1,'2025-02-28 12:25:13','2025-02-28 12:25:13'),(66,65,2,'2025-04-06 20:54:54','2025-04-06 20:54:54'),(67,66,1,'2025-04-06 21:01:49','2025-04-06 21:01:49'),(68,67,2,'2025-04-06 21:03:11','2025-04-06 21:03:11'),(69,68,1,'2025-04-06 21:04:21','2025-04-06 21:04:21'),(70,69,1,'2025-04-06 21:04:55','2025-04-06 21:04:55'),(71,70,2,'2025-04-06 21:05:36','2025-04-06 21:05:36'),(72,71,4,'2025-04-06 21:07:09','2025-04-06 21:07:09'),(73,72,2,'2025-04-06 21:11:08','2025-04-06 21:11:08');
/*!40000 ALTER TABLE `user_main_grid_categories` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_main_grid_tags`
--

DROP TABLE IF EXISTS `user_main_grid_tags`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_main_grid_tags` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_main_grid_id` int NOT NULL,
  `tag_id` int NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `user_main_grid_id` (`user_main_grid_id`),
  KEY `tag_id` (`tag_id`),
  CONSTRAINT `user_main_grid_tags_ibfk_1` FOREIGN KEY (`user_main_grid_id`) REFERENCES `user_main_grid` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `user_main_grid_tags_ibfk_2` FOREIGN KEY (`tag_id`) REFERENCES `tags` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=74 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_main_grid_tags`
--

LOCK TABLES `user_main_grid_tags` WRITE;
/*!40000 ALTER TABLE `user_main_grid_tags` DISABLE KEYS */;
INSERT INTO `user_main_grid_tags` VALUES (56,55,56,'2025-02-19 17:17:01','2025-02-19 17:17:01'),(57,56,57,'2025-02-19 17:51:37','2025-02-19 17:51:37'),(58,57,58,'2025-02-19 17:56:27','2025-02-19 17:56:27'),(59,58,59,'2025-02-19 20:07:28','2025-02-19 20:07:28'),(60,59,60,'2025-02-19 20:07:47','2025-02-19 20:07:47'),(61,60,61,'2025-02-19 20:23:52','2025-02-19 20:23:52'),(62,61,62,'2025-02-27 17:55:57','2025-02-27 17:55:57'),(63,62,63,'2025-02-28 11:58:22','2025-02-28 11:58:22'),(64,63,64,'2025-02-28 12:19:54','2025-02-28 12:19:54'),(65,64,65,'2025-02-28 12:25:13','2025-02-28 12:25:13'),(66,65,66,'2025-04-06 20:54:54','2025-04-06 20:54:54'),(67,66,67,'2025-04-06 21:01:49','2025-04-06 21:01:49'),(68,67,68,'2025-04-06 21:03:11','2025-04-06 21:03:11'),(69,68,69,'2025-04-06 21:04:21','2025-04-06 21:04:21'),(70,69,70,'2025-04-06 21:04:55','2025-04-06 21:04:55'),(71,70,71,'2025-04-06 21:05:36','2025-04-06 21:05:36'),(72,71,72,'2025-04-06 21:07:09','2025-04-06 21:07:09'),(73,72,73,'2025-04-06 21:11:08','2025-04-06 21:11:08');
/*!40000 ALTER TABLE `user_main_grid_tags` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_payouts`
--

DROP TABLE IF EXISTS `user_payouts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_payouts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `requested_at` datetime NOT NULL,
  `paid_at` datetime DEFAULT NULL,
  `status` varchar(255) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `user_payouts_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_payouts`
--

LOCK TABLES `user_payouts` WRITE;
/*!40000 ALTER TABLE `user_payouts` DISABLE KEYS */;
/*!40000 ALTER TABLE `user_payouts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_pix_payment_mercadopago`
--

DROP TABLE IF EXISTS `user_pix_payment_mercadopago`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_pix_payment_mercadopago` (
  `auto_id` int NOT NULL AUTO_INCREMENT,
  `id` varchar(255) NOT NULL,
  `action` varchar(255) NOT NULL,
  `api_version` varchar(255) NOT NULL,
  `data_id` varchar(255) NOT NULL,
  `date_created` datetime NOT NULL,
  `live_mode` tinyint(1) NOT NULL DEFAULT '0',
  `type` varchar(255) NOT NULL,
  `user_id` int NOT NULL,
  `is_check` int DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`auto_id`)
) ENGINE=InnoDB AUTO_INCREMENT=65 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_pix_payment_mercadopago`
--

LOCK TABLES `user_pix_payment_mercadopago` WRITE;
/*!40000 ALTER TABLE `user_pix_payment_mercadopago` DISABLE KEYS */;
INSERT INTO `user_pix_payment_mercadopago` VALUES (8,'123456','payment.updated','v1','123456','2021-11-01 02:02:02',0,'payment',381890567,1,'2024-11-18 17:37:39','2024-11-18 17:49:50'),(9,'123456','payment.updated','v1','123456','2021-11-01 02:02:02',0,'payment',381890567,1,'2024-11-18 17:38:18','2024-11-18 18:00:42'),(10,'123456','payment.updated','v1','123456','2021-11-01 02:02:02',0,'payment',381890567,1,'2024-11-18 18:05:23','2024-11-18 18:05:26'),(11,'123456','payment.updated','v1','123456','2021-11-01 02:02:02',0,'payment',381890567,1,'2024-11-18 18:05:56','2024-11-18 18:05:56'),(12,'123456','payment.updated','v1','123456','2021-11-01 02:02:02',0,'payment',381890567,1,'2024-11-18 19:29:44','2024-11-18 19:30:29'),(13,'123456','payment.updated','v1','123456','2021-11-01 02:02:02',0,'payment',381890567,1,'2024-11-18 19:34:02','2024-11-18 19:34:13'),(14,'123456','payment.updated','v1','123456','2021-11-01 02:02:02',0,'payment',381890567,1,'2024-11-18 19:39:09','2024-11-18 19:39:27'),(15,'123456','payment.updated','v1','123456','2021-11-01 02:02:02',0,'payment',381890567,1,'2024-11-19 11:32:07','2024-11-19 11:32:07'),(16,'123456','payment.updated','v1','123456','2021-11-01 02:02:02',0,'payment',381890567,1,'2024-11-19 11:35:17','2024-11-19 11:35:31'),(17,'123456','payment.updated','v1','123456','2021-11-01 02:02:02',0,'payment',381890567,1,'2024-11-19 11:37:14','2024-11-19 11:38:12'),(18,'123456','payment.updated','v1','1234567','2021-11-01 02:02:02',0,'payment',174052836,1,'2025-03-17 17:15:57','2025-03-17 19:24:49'),(19,'123456','payment.updated','v1','1234567','2021-11-01 02:02:02',0,'payment',174052836,1,'2025-03-17 17:50:03','2025-03-17 19:27:36'),(20,'123456','payment.updated','v1','1234567','2021-11-01 02:02:02',0,'payment',174052836,1,'2025-03-17 17:50:58','2025-03-17 19:47:44'),(21,'123456','payment.updated','v1','1234567','2021-11-01 02:02:02',0,'payment',174052836,0,'2025-03-17 17:52:50','2025-03-17 17:52:50'),(22,'123456','payment.updated','v1','1234567','2021-11-01 02:02:02',0,'payment',174052836,0,'2025-03-17 17:54:45','2025-03-17 17:54:45'),(23,'123456','payment.updated','v1','1234567','2021-11-01 02:02:02',0,'payment',174052836,0,'2025-03-17 17:56:33','2025-03-17 17:56:33'),(24,'123456','payment.updated','v1','1234567','2021-11-01 02:02:02',0,'payment',174052836,0,'2025-03-17 17:57:47','2025-03-17 17:57:47'),(25,'123456','payment.updated','v1','1234567','2021-11-01 02:02:02',0,'payment',174052836,0,'2025-03-17 17:59:52','2025-03-17 17:59:52'),(26,'123456','payment.updated','v1','1234567','2021-11-01 02:02:02',0,'payment',174052836,0,'2025-03-17 18:00:14','2025-03-17 18:00:14'),(27,'123456','payment.updated','v1','1234567','2021-11-01 02:02:02',0,'payment',174052836,0,'2025-03-17 18:01:15','2025-03-17 18:01:15'),(28,'123456','payment.updated','v1','1234567','2021-11-01 02:02:02',0,'payment',174052836,0,'2025-03-17 18:03:45','2025-03-17 18:03:45'),(29,'123456','payment.updated','v1','1234567','2021-11-01 02:02:02',0,'payment',174052836,0,'2025-03-17 18:04:14','2025-03-17 18:04:14'),(30,'123456','payment.updated','v1','1234567','2021-11-01 02:02:02',0,'payment',174052836,0,'2025-03-17 18:09:52','2025-03-17 18:09:52'),(31,'123456','payment.updated','v1','1234567','2021-11-01 02:02:02',0,'payment',174052836,0,'2025-03-17 18:11:06','2025-03-17 18:11:06'),(32,'123456','payment.updated','v1','1234567','2021-11-01 02:02:02',0,'payment',174052836,0,'2025-03-17 18:13:59','2025-03-17 18:13:59'),(33,'123456','payment.updated','v1','1234567','2021-11-01 02:02:02',0,'payment',174052836,0,'2025-03-17 18:14:29','2025-03-17 18:14:29'),(34,'123456','payment.updated','v1','1234567','2021-11-01 02:02:02',0,'payment',174052836,0,'2025-03-17 18:18:49','2025-03-17 18:18:49'),(35,'123456','payment.updated','v1','123456','2021-11-01 02:02:02',0,'payment',174052836,0,'2025-03-21 21:17:57','2025-03-21 21:17:57'),(36,'123456','payment.updated','v1','123456','2021-11-01 02:02:02',0,'payment',174052836,0,'2025-03-21 21:18:50','2025-03-21 21:18:50'),(37,'123456','payment.updated','v1','123456','2021-11-01 02:02:02',0,'payment',174052836,0,'2025-03-21 21:19:12','2025-03-21 21:19:12'),(38,'123456','payment.updated','v1','123456','2021-11-01 02:02:02',0,'payment',174052836,0,'2025-03-21 21:19:23','2025-03-21 21:19:23'),(39,'123456','payment.updated','v1','123456','2021-11-01 02:02:02',0,'payment',174052836,0,'2025-03-23 17:59:07','2025-03-23 17:59:07'),(40,'123456','payment.updated','v1','123456','2021-11-01 02:02:02',0,'payment',174052836,0,'2025-03-23 17:59:58','2025-03-23 17:59:58'),(41,'123456','payment.updated','v1','123456','2021-11-01 02:02:02',0,'payment',174052836,0,'2025-03-23 18:01:44','2025-03-23 18:01:44'),(42,'123456','payment.updated','v1','123456','2021-11-01 02:02:02',0,'payment',174052836,0,'2025-03-23 18:02:48','2025-03-23 18:02:48'),(43,'123456','payment.updated','v1','123456','2021-11-01 02:02:02',0,'payment',174052836,0,'2025-03-23 18:03:26','2025-03-23 18:03:26'),(44,'123456','payment.updated','v1','123456','2021-11-01 02:02:02',0,'payment',174052836,0,'2025-03-23 18:05:27','2025-03-23 18:05:27'),(45,'123456','payment.updated','v1','123456','2021-11-01 02:02:02',0,'payment',174052836,0,'2025-03-23 18:08:52','2025-03-23 18:08:52'),(46,'123456','payment.updated','v1','123456','2021-11-01 02:02:02',0,'payment',174052836,0,'2025-03-23 18:09:09','2025-03-23 18:09:09'),(47,'123456','payment.updated','v1','123456','2021-11-01 02:02:02',0,'payment',174052836,0,'2025-03-23 18:09:53','2025-03-23 18:09:53'),(48,'123456','payment.updated','v1','123456','2021-11-01 02:02:02',0,'payment',174052836,0,'2025-03-23 18:10:20','2025-03-23 18:10:20'),(49,'123456','payment.updated','v1','123456','2021-11-01 02:02:02',0,'payment',174052836,0,'2025-03-23 18:12:34','2025-03-23 18:12:34'),(50,'123456','payment.updated','v1','123456','2021-11-01 02:02:02',0,'payment',174052836,0,'2025-03-23 18:18:07','2025-03-23 18:18:07'),(51,'123456','payment.updated','v1','123456','2021-11-01 02:02:02',0,'payment',174052836,0,'2025-03-23 18:18:23','2025-03-23 18:18:23'),(52,'123456','payment.updated','v1','123456','2021-11-01 02:02:02',0,'payment',174052836,0,'2025-03-23 18:19:03','2025-03-23 18:19:03'),(53,'123456','payment.updated','v1','123456','2021-11-01 02:02:02',0,'payment',174052836,0,'2025-03-23 18:19:26','2025-03-23 18:19:26'),(54,'123456','payment.updated','v1','123456','2021-11-01 02:02:02',0,'payment',174052836,0,'2025-03-23 18:20:39','2025-03-23 18:20:39'),(55,'123456','payment.updated','v1','123456','2021-11-01 02:02:02',0,'payment',174052836,0,'2025-03-23 18:26:08','2025-03-23 18:26:08'),(56,'123456','payment.updated','v1','123456','2021-11-01 02:02:02',0,'payment',174052836,0,'2025-03-23 18:34:50','2025-03-23 18:34:50'),(57,'123456','payment.updated','v1','123456','2021-11-01 02:02:02',0,'payment',174052836,0,'2025-03-23 18:35:14','2025-03-23 18:35:14'),(58,'120748056458','payment.created','v1','108970150022','2025-04-20 14:42:02',1,'payment',174052836,0,'2025-04-20 14:42:02','2025-04-20 14:42:02'),(59,'120681146947','payment.created','v1','108970150022','2025-04-20 14:42:02',1,'payment',174052836,0,'2025-04-20 14:43:03','2025-04-20 14:43:03'),(60,'120748059446','payment.created','v1','108970150022','2025-04-20 14:42:02',1,'payment',174052836,0,'2025-04-20 14:43:04','2025-04-20 14:43:04'),(61,'120681168343','payment.updated','v1','108970150022','2025-04-20 14:42:02',1,'payment',174052836,0,'2025-04-20 14:44:44','2025-04-20 14:44:44'),(62,'120681168439','payment.updated','v1','108970150022','2025-04-20 14:42:02',1,'payment',174052836,0,'2025-04-20 14:44:48','2025-04-20 14:44:48'),(63,'120681187451','payment.updated','v1','108970150022','2025-04-20 14:42:02',1,'payment',174052836,0,'2025-04-20 14:46:39','2025-04-20 14:46:39'),(64,'120681542453','payment.updated','v1','108970150022','2025-04-20 14:42:02',1,'payment',174052836,0,'2025-04-20 15:06:25','2025-04-20 15:06:25');
/*!40000 ALTER TABLE `user_pix_payment_mercadopago` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_plans`
--

DROP TABLE IF EXISTS `user_plans`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_plans` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `plan_id` int NOT NULL,
  `stripe_customer_id` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `mercadopago_customer_id` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `plan_id` (`plan_id`),
  CONSTRAINT `user_plans_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `user_plans_ibfk_2` FOREIGN KEY (`plan_id`) REFERENCES `plans` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=56 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_plans`
--

LOCK TABLES `user_plans` WRITE;
/*!40000 ALTER TABLE `user_plans` DISABLE KEYS */;
INSERT INTO `user_plans` VALUES (55,3,3,'cus_S9x4Uy5na35LsQ','2025-04-19 15:18:59','2025-04-19 15:19:52',NULL);
/*!40000 ALTER TABLE `user_plans` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_uploads`
--

DROP TABLE IF EXISTS `user_uploads`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_uploads` (
  `id` int NOT NULL AUTO_INCREMENT,
  `admin_id` int DEFAULT NULL,
  `user_id` int DEFAULT NULL,
  `total_uploads` int DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `admin_id` (`admin_id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `user_uploads_ibfk_1` FOREIGN KEY (`admin_id`) REFERENCES `admin` (`id`),
  CONSTRAINT `user_uploads_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_uploads`
--

LOCK TABLES `user_uploads` WRITE;
/*!40000 ALTER TABLE `user_uploads` DISABLE KEYS */;
INSERT INTO `user_uploads` VALUES (6,NULL,3,25,'2025-02-19 17:17:01','2025-04-06 21:11:08');
/*!40000 ALTER TABLE `user_uploads` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping routines for database 'designflix'
--
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-05-02 15:54:54
