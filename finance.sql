-- Create the database if it doesn't exist
CREATE DATABASE IF NOT EXISTS finance;
USE finance;

-- Drop the tables if they already exist to ensure a clean slate
DROP TABLE IF EXISTS `stock_transaction`;
DROP TABLE IF EXISTS `shareholding`;
DROP TABLE IF EXISTS `user`;

-- Create the `user` table
CREATE TABLE `user` (
  `id` CHAR(36) NOT NULL PRIMARY KEY,
  `username` VARCHAR(50) NOT NULL,
  `email` VARCHAR(100) NOT NULL UNIQUE,
  `password` VARCHAR(255) NOT NULL,
  `balance` DECIMAL(15, 2) NOT NULL DEFAULT '100000.00'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Create the `stock_transaction` table
CREATE TABLE `stock_transaction` (
  `transaction_id` CHAR(36) NOT NULL PRIMARY KEY,
  `user_id` CHAR(36) NOT NULL,
  `stock_name` VARCHAR(100) NOT NULL,
  `quantity` INT NOT NULL,  -- Number of stocks bought or sold, can be negative for SELL transactions
  `total_amount` DECIMAL(15, 2) NOT NULL,  -- Total transaction amount (quantity * price_per_unit)
  `transaction_type` ENUM('BUY', 'SELL') NOT NULL,
  `transaction_time` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `user`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Create the `shareholding` table
CREATE TABLE `shareholding` (
  `id` CHAR(36) NOT NULL PRIMARY KEY,
  `user_id` CHAR(36) NOT NULL,
  `stock_name` VARCHAR(100) NOT NULL,
  `shares` INT NOT NULL,  -- Number of shares held by the user
  FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
