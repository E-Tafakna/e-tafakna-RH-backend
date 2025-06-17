CREATE DATABASE IF NOT EXISTS etafakna_rh DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE etafakna_rh;

DROP TABLE IF EXISTS audit_logs;

DROP TABLE IF EXISTS reclamations;

DROP TABLE IF EXISTS documents;

DROP TABLE IF EXISTS requests;

DROP TABLE IF EXISTS document_templates;

DROP TABLE IF EXISTS employees;

CREATE TABLE IF NOT EXISTS employees (
    id INT AUTO_INCREMENT PRIMARY KEY,
    code_employe VARCHAR(20) UNIQUE NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    cin VARCHAR(20) UNIQUE NOT NULL,
    cin_place VARCHAR(100),
    cin_date VARCHAR(100),
    place_of_birth VARCHAR(100),
    date_of_birth DATE NOT NULL,
    gender ENUM('male', 'female') NOT NULL,
    address TEXT,
    nfc_badge_id VARCHAR(50),
    email VARCHAR(100),
    phone VARCHAR(20),
    profession VARCHAR(100),
    brut_salary DECIMAL(10, 2),
    net_salary DECIMAL(10, 2),
    role ENUM('employee', 'admin') DEFAULT 'employee',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS company (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    address TEXT,
    phone VARCHAR(20),
    email VARCHAR(100),
    logo_url TEXT,
    forme_juridique ENUM(
        'SARL',
        'SA',
        'SUARL'
    ) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    Capital DECIMAL(15, 2) DEFAULT 0.00,
    registration_number VARCHAR(50) UNIQUE NOT NULL,
    tax_id VARCHAR(50) UNIQUE NOT NULL,
    created_by INT NOT NULL,
    owner_name VARCHAR(100) NOT NULL,
    owner_gender ENUM('male', 'female') NOT NULL,
    employee_number INT DEFAULT 0,
) CREATE TABLE IF NOT EXISTS document_templates (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    file_url TEXT,
    output_format ENUM('pdf', 'docx', 'html') DEFAULT 'pdf',
    status ENUM('active', 'archived') DEFAULT 'active',
    visible_on_kiosk BOOLEAN DEFAULT TRUE,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES employees(id)
);

CREATE TABLE IF NOT EXISTS docToPrint (
    id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id INT NOT NULL,
    output_format ENUM('pdf', 'docx', 'html') DEFAULT 'pdf',
    file_url TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES employees(id)
) CREATE TABLE IF NOT EXISTS requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id INT,
    type ENUM(
        'conge',
        'avance',
        'credit',
        'reclamation',
        'document',
        'depot'
    ) NOT NULL,
    service VARCHAR(100),
    status ENUM('en_cours', 'traite') DEFAULT 'en_cours',
    result ENUM('valide', 'refused') DEFAULT 'refused',
    submission_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    result_date TIMESTAMP NULL,
    confidential BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS documents (
    id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id INT,
    request_id INT,
    document_type VARCHAR(100),
    file_url TEXT,
    `generated` BOOLEAN DEFAULT FALSE,
    uploaded BOOLEAN DEFAULT FALSE,
    template_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES employees(id),
    FOREIGN KEY (request_id) REFERENCES requests(id),
    FOREIGN KEY (template_id) REFERENCES document_templates(id)
);

-- add 
CREATE TABLE IF NOT EXISTS reclamations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    request_id INT,
    category ENUM(
        'generale',
        'harcelement_moral',
        'agression_sexuelle'
    ) NOT NULL,
    description TEXT,
    confidential BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (request_id) REFERENCES requests(id)
);

CREATE TABLE IF NOT EXISTS advance_policy (
    id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id INT NOT NULL,
    company_id INT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    min_months_seniority INT DEFAULT 3,
    max_percentage_salary INT DEFAULT 30,
    cooldown_months_between_advance INT DEFAULT 2,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES company(id),
    FOREIGN KEY (employee_id) REFERENCES employees(id)
)

 CREATE TABLE IF NOT EXISTS leave_policy (
    id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id INT NOT NULL,
    company_id INT NOT NULL,
    min_months_seniority INT DEFAULT 3,
    days_per_month_worked DECIMAL(4, 2) DEFAULT 1.5,
    max_days_per_year INT DEFAULT 18,
    policy_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES company(id),
    FOREIGN KEY (employee_id) REFERENCES employees(id)
);

CREATE TABLE IF NOT EXISTS credit_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_id INT NOT NULL,
    employee_id INT NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    request_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    approved_amount DECIMAL(10, 2),
    approved_date TIMESTAMP NULL,
    FOREIGN KEY (company_id) REFERENCES company(id),
    FOREIGN KEY (employee_id) REFERENCES employees(id)
);

CREATE TABLE IF NOT EXISTS credit_policy (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_id INT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    min_months_seniority INT DEFAULT 12,
    max_salary_multiplier DECIMAL(4, 2) DEFAULT 2.0,
    cooldown_months INT DEFAULT 12,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id INT,
    action VARCHAR(255),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES employees(id)
);