-- Drop the existing stock_transaction table if it exists
DROP TABLE IF EXISTS `stock_transaction`;

-- Create the new stock_transaction table with the updated schema
CREATE TABLE `stock_transaction` (
  `transaction_id` CHAR(36) NOT NULL PRIMARY KEY,
  `user_id` CHAR(36) NOT NULL,
  `stock_name` VARCHAR(100) NOT NULL,
  `quantity` INT NOT NULL,  -- Number of stocks bought or sold
  `total_amount` DECIMAL(15, 2) NOT NULL,  -- Total transaction amount (quantity * price_per_unit)
  `transaction_type` ENUM('BUY', 'SELL') NOT NULL,
  FOREIGN KEY (`user_id`) REFERENCES `user`(`id`)
);