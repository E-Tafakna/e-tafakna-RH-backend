CREATE DATABASE IF NOT EXISTS etafakna_rh DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE etafakna_rh;

-- Drop existing tables if they exist (handle foreign key dependencies)
DROP TABLE IF EXISTS audit_logs;

DROP TABLE IF EXISTS credit_request_details;

DROP TABLE IF EXISTS credit_policy;

DROP TABLE IF EXISTS leave_request_details;

DROP TABLE IF EXISTS leave_policy;

DROP TABLE IF EXISTS document_request_details;

DROP TABLE IF EXISTS advance_request_details;

DROP TABLE IF EXISTS advance_policy;

DROP TABLE IF EXISTS reclamations;

DROP TABLE IF EXISTS documents;

DROP TABLE IF EXISTS requests;

DROP TABLE IF EXISTS docToPrint;

DROP TABLE IF EXISTS document_templates;

DROP TABLE IF EXISTS company;

DROP TABLE IF EXISTS employees;

DROP TABLE IF EXISTS depot_requests;

DROP TABLE IF EXISTS notifications;

-- Employees Table
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
    department VARCHAR(100) NOT NULL,
    brut_salary DECIMAL(10, 2),
    net_salary DECIMAL(10, 2),
    work_experience INT DEFAULT 0,
    seniority_in_months INT DEFAULT 0,
    date_of_start DATE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    cnss_number VARCHAR(50),
    nationality VARCHAR(50),
    marital_status ENUM('single', 'married', 'divorced', 'widowed'),
    employment_type ENUM('full_time', 'part_time', 'contract', 'intern') DEFAULT 'full_time',
    contract_type ENUM('CDD', 'CDI', 'CIVP', 'Stage', 'Consultant'),
    role ENUM('employee', 'admin') DEFAULT 'employee',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- Company Table
CREATE TABLE IF NOT EXISTS company (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    address TEXT,
    phone VARCHAR(20),
    email VARCHAR(100),
    logo_url TEXT,
    forme_juridique ENUM('SARL', 'SA', 'SUARL') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    Capital DECIMAL(15, 2) DEFAULT 0.00,
    registration_number VARCHAR(50) UNIQUE NOT NULL,
    tax_id VARCHAR(50) UNIQUE NOT NULL,
    created_by INT NOT NULL,
    owner_name VARCHAR(100) NOT NULL,
    owner_gender ENUM('male', 'female') NOT NULL,
    employee_number INT DEFAULT 0,
    FOREIGN KEY (created_by) REFERENCES employees(id)
);

-- Document Templates
CREATE TABLE IF NOT EXISTS document_templates (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    template_type ENUM('Stage', 'travaile') NOT NULL,
    description TEXT,
    file_url TEXT,
    output_format ENUM('pdf', 'docx', 'html') DEFAULT 'pdf',
    status ENUM('active', 'archived') DEFAULT 'active',
    visible_on_kiosk BOOLEAN DEFAULT TRUE,
    created_by INT,
    cooldown_months_between_advance INT DEFAULT 2,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    signature_image_url TEXT,
    signature_position ENUM('top_left', 'top_right', 'bottom_left', 'bottom_right') DEFAULT 'bottom_right',
    signature_size VARCHAR(20) DEFAULT 'medium',
    signature_included BOOLEAN DEFAULT TRUE,
    cachet_image_url TEXT,
    cachet_position ENUM('top_left', 'top_right', 'bottom_left', 'bottom_right') DEFAULT 'bottom_right',
    cachet_size VARCHAR(20) DEFAULT 'medium',
    cachet_included BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (created_by) REFERENCES employees(id)
);

-- Printed Documents
CREATE TABLE IF NOT EXISTS docToPrint (
    id INT AUTO_INCREMENT PRIMARY KEY,
    output_format ENUM('pdf', 'docx', 'html') DEFAULT 'pdf',
    file_url TEXT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Requests
CREATE TABLE IF NOT EXISTS requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id INT,
    type ENUM(
        'leave',
        'advance',
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

-- Documents
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
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES employees(id),
    FOREIGN KEY (request_id) REFERENCES requests(id),
    FOREIGN KEY (template_id) REFERENCES document_templates(id)
);

-- Reclamations
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

-- Advance Policy
CREATE TABLE IF NOT EXISTS advance_policy (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_id INT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    min_months_seniority INT DEFAULT 3,
    max_percentage_salary INT DEFAULT 30,
    cooldown_months_between_advance INT DEFAULT 2,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES company(id)
);

-- Advance Request Details
CREATE TABLE IF NOT EXISTS advance_request_details (
    request_id INT PRIMARY KEY,
    amount DECIMAL(10, 2) NOT NULL,
    reason TEXT,
    FOREIGN KEY (request_id) REFERENCES requests(id) ON DELETE CASCADE
);

-- Document Request Details
CREATE TABLE IF NOT EXISTS document_request_details (
    request_id INT PRIMARY KEY,
    document_type VARCHAR(100) NOT NULL,
    notes TEXT,
    FOREIGN KEY (request_id) REFERENCES requests(id) ON DELETE CASCADE
);

-- Leave Policy
CREATE TABLE IF NOT EXISTS leave_policy (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_id INT NOT NULL,
    min_months_seniority INT DEFAULT 3,
    days_per_month_worked DECIMAL(4, 2) DEFAULT 1.5,
    max_days_per_year INT DEFAULT 18,
    policy_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES company(id)
);

-- Leave Request Details
CREATE TABLE IF NOT EXISTS leave_request_details (
    request_id INT PRIMARY KEY,
    leave_type ENUM('annuel', 'maladie', 'exceptionnel') NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    reason TEXT,
    FOREIGN KEY (request_id) REFERENCES requests(id) ON DELETE CASCADE
);


-- Credit Policy
CREATE TABLE IF NOT EXISTS credit_policy (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_id INT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    min_months_seniority INT DEFAULT 12,
    max_salary_multiplier DECIMAL(4, 2) DEFAULT 2.0,
    cooldown_months INT DEFAULT 12,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES company(id)
);

-- Credit Request Details
CREATE TABLE IF NOT EXISTS credit_request_details (
    request_id INT PRIMARY KEY,
    amount DECIMAL(10, 2) NOT NULL,
    months INT NOT NULL,
    description TEXT,
    is_exceptional BOOLEAN NOT NULL DEFAULT FALSE,
    exception_reason TEXT NULL,
    FOREIGN KEY (request_id) REFERENCES requests(id) ON DELETE CASCADE
);

-- Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id INT,
    action VARCHAR(255),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES employees(id)
);

CREATE TABLE IF NOT EXISTS notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES employees(id)
);

CREATE TABLE IF NOT EXISTS depot_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id INT NOT NULL,
    document_name VARCHAR(255) NOT NULL,
    description TEXT,
    date_of_deposit DATE, 
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES employees(id)
);


CREATE TABLE IF NOT EXISTS employee_managers (
  employee_id INT NOT NULL,
  manager_id INT NOT NULL,
  PRIMARY KEY (employee_id, manager_id),
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
  FOREIGN KEY (manager_id) REFERENCES employees(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS employee_ceos (
  employee_id INT NOT NULL,
  ceo_id INT NOT NULL,
  PRIMARY KEY (employee_id, ceo_id),
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
  FOREIGN KEY (ceo_id) REFERENCES employees(id) ON DELETE CASCADE
);

-- create table comp_dep 
CREATE TABLE IF NOT EXISTS company_departments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_id INT NOT NULL,
    department_name VARCHAR(255) NOT NULL,
    FOREIGN KEY (company_id) REFERENCES company(id) ON DELETE CASCADE
);


-- liaison entre policies et dep_company 

ALTER TABLE advance_policy ADD COLUMN department_id INT NULL;
ALTER TABLE advance_policy ADD FOREIGN KEY (department_id) REFERENCES company_departments(id) ON DELETE CASCADE;

ALTER TABLE credit_policy ADD COLUMN department_id INT NULL;
ALTER TABLE credit_policy ADD FOREIGN KEY (department_id) REFERENCES company_departments(id) ON DELETE CASCADE;

ALTER TABLE leave_policy ADD COLUMN department_id INT NULL;
ALTER TABLE leave_policy ADD FOREIGN KEY (department_id) REFERENCES company_departments(id) ON DELETE CASCADE;



-- add isExceptional and ExceptionalReason :
ALTER TABLE requests
ADD COLUMN is_exceptional BOOLEAN DEFAULT FALSE,
ADD COLUMN exception_reason TEXT;


-- add reson and urgency to document :

ALTER TABLE document_request_details
ADD COLUMN urgency_level VARCHAR(50);
ADD COLUMN reason TEXT NOT NULL DEFAULT '';


-- Ajout de policy_id à la table leave_request_details
ALTER TABLE leave_request_details
ADD COLUMN policy_id INT NULL;

-- Ajout de policy_id à la table advance_request_details
ALTER TABLE advance_request_details
ADD COLUMN policy_id INT NULL;

-- Ajout de policy_id à la table credit_request_details
ALTER TABLE credit_request_details
ADD COLUMN policy_id INT NULL;