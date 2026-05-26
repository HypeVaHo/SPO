import 'dotenv/config';
import mysql from 'mysql2/promise';

const config = {
  host: process.env.MYSQL_HOST,
  port: parseInt(process.env.MYSQL_PORT) || 3306,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  multipleStatements: true
};

const migrations = `
-- Create database if not exists
CREATE DATABASE IF NOT EXISTS ${process.env.MYSQL_DATABASE};
USE ${process.env.MYSQL_DATABASE};

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  vk_id BIGINT UNIQUE NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  photo_url VARCHAR(500),
  role ENUM('customer', 'baker', 'admin') DEFAULT 'customer',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_vk_id (vk_id),
  INDEX idx_role (role)
);

-- Categories table
CREATE TABLE IF NOT EXISTS categories (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  sort_order INT DEFAULT 0,
  INDEX idx_slug (slug)
);

-- Products table
CREATE TABLE IF NOT EXISTS products (
  id INT PRIMARY KEY AUTO_INCREMENT,
  category_id INT,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  image_url VARCHAR(500),
  is_available BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
  INDEX idx_category (category_id),
  INDEX idx_available (is_available)
);

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  status ENUM('new', 'preparing', 'ready', 'completed', 'cancelled') DEFAULT 'new',
  total DECIMAL(10,2) NOT NULL,
  comment TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user (user_id),
  INDEX idx_status (status),
  INDEX idx_created (created_at)
);

-- Order items table
CREATE TABLE IF NOT EXISTS order_items (
  id INT PRIMARY KEY AUTO_INCREMENT,
  order_id INT NOT NULL,
  product_id INT,
  product_name VARCHAR(200) NOT NULL,
  quantity INT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL,
  INDEX idx_order (order_id)
);

-- Insert default categories
INSERT IGNORE INTO categories (id, name, slug, sort_order) VALUES
(1, 'Выпечка', 'bakery', 1),
(2, 'Напитки', 'drinks', 2),
(3, 'Десерты', 'desserts', 3);

-- Insert sample products
INSERT IGNORE INTO products (id, category_id, name, description, price, is_available) VALUES
(1, 1, 'Круассан', 'Классический французский круассан со сливочным маслом', 120.00, TRUE),
(2, 1, 'Булочка с корицей', 'Ароматная булочка с корицей и сахарной глазурью', 95.00, TRUE),
(3, 2, 'Капучино', 'Классический капучино с молочной пенкой', 180.00, TRUE),
(4, 2, 'Латте', 'Нежный латте с ванильным сиропом', 200.00, TRUE),
(5, 3, 'Чизкейк', 'Нью-Йоркский чизкейк с ягодным топингом', 280.00, TRUE),
(6, 3, 'Тирамису', 'Итальянский десерт с маскарпоне и кофе', 320.00, TRUE);
`;

async function runMigrations() {
  let connection;
  
  try {
    console.log('Connecting to MySQL...');
    connection = await mysql.createConnection(config);
    
    console.log('Running migrations...');
    await connection.query(migrations);
    
    console.log('Migrations completed successfully!');
    console.log('Database tables created:');
    console.log('  - users');
    console.log('  - categories');
    console.log('  - products');
    console.log('  - orders');
    console.log('  - order_items');
    console.log('Sample data inserted for categories and products.');
    
  } catch (error) {
    console.error('Migration failed:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

runMigrations();
