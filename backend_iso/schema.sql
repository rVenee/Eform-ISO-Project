-- 1. Tabel USERS
CREATE TABLE USERS (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    section VARCHAR(100) NULL,
    role ENUM('admin_iso', 'admin_it', 'applicator', 'unit_head', 'division_head', 'qmr_emr', 'mr', 'hrd', 'mill_head') NOT NULL
);

-- 2. Tabel DOCUMENTS
CREATE TABLE DOCUMENTS (
    document_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL, 
    creator_name VARCHAR(100) NULL, 
    checked_by VARCHAR(100) NULL,   
    approved_by VARCHAR(100) NULL,  
    category ENUM('WI', 'DOP', 'SOP', 'EII', 'JB', 'QMS', 'TM', 'EMS', 'CM', 'QMS_SP') NOT NULL,
    title VARCHAR(255) NOT NULL,
    document_number VARCHAR(100) NULL,
    revision_number VARCHAR(50) NULL,
    effective_date DATE NULL,
    prepared_date DATE NULL,
    checked_date DATE NULL,
    approved_date DATE NULL,
    status ENUM('Draft', 'Menunggu Unit Head', 'Menunggu Division Head', 'Menunggu ISO', 'Menunggu QMR', 'Menunggu MR', 'Menunggu HRD', 'Menunggu Mill Head', 'Direvisi', 'Disetujui') DEFAULT 'Draft',
    locked_by INT NULL,
    locked_by INT NULL,
    created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES USERS(user_id) ON DELETE CASCADE,
    FOREIGN KEY (locked_by) REFERENCES USERS(user_id) ON DELETE SET NULL
);

-- 3. Tabel DOCUMENTS_CONTENTS
CREATE TABLE DOCUMENTS_CONTENTS (
    content_id INT AUTO_INCREMENT PRIMARY KEY,
    document_id INT NOT NULL,
    form_data JSON NOT NULL,
    FOREIGN KEY (document_id) REFERENCES DOCUMENTS(document_id) ON DELETE CASCADE
);

-- 4. Tabel DOCUMENTS_ATTACHMENTS
CREATE TABLE DOCUMENTS_ATTACHMENTS (
    attachment_id INT AUTO_INCREMENT PRIMARY KEY,
    document_id INT NOT NULL,
    subchapter_reference VARCHAR(100) NOT NULL,
    file_path VARCHAR(255) NOT NULL,
    upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (document_id) REFERENCES DOCUMENTS(document_id) ON DELETE CASCADE
);

-- 5. Tabel REVISION_LOGS
CREATE TABLE REVISION_LOGS (
    log_id INT AUTO_INCREMENT PRIMARY KEY,
    document_id INT NOT NULL,
    reviewer_id INT NOT NULL,
    notes TEXT NOT NULL,
    date_create TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (document_id) REFERENCES DOCUMENTS(document_id) ON DELETE CASCADE,
    FOREIGN KEY (reviewer_id) REFERENCES USERS(user_id) ON DELETE CASCADE
);