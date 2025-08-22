CREATE TABLE IF NOT EXISTS register_summaries (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  original_filename VARCHAR(255) NOT NULL,
  company_name VARCHAR(255) NOT NULL,
  seat_city VARCHAR(120) NULL,
  seat_address VARCHAR(255) NULL,               -- 🆕 vollständige Geschäftsanschrift
  purpose_keyword VARCHAR(120) NULL,
  share_capital_eur DECIMAL(18,2) NULL,
  managing_directors JSON NULL,
  last_entry_date DATE NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_company (company_name),
  KEY idx_city (seat_city),
  KEY idx_address (seat_address),               -- 🆕 Index
  KEY idx_keyword (purpose_keyword),
  KEY idx_date (last_entry_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
