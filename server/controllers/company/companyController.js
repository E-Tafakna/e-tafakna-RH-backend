const pool = require('../../database/index');

const createCompany = async (req, res) => {
    try {
        const {
            name,
            address,
            phone,
            email,
            logo_url,
            forme_juridique,
            Capital,
            registration_number,
            tax_id,
            created_by,
            owner_name,
            owner_gender,
            employee_number
        } = req.body;

        if (!name || !forme_juridique || !registration_number || !tax_id || !created_by || !owner_name || !owner_gender) {
            return res.status(400).json({
                success: false,
                message: 'Required fields: name, forme_juridique, registration_number, tax_id, created_by, owner_name, owner_gender'
            });
        }

        const validFormes = ['SARL', 'SA', 'SUARL'];
        if (!validFormes.includes(forme_juridique)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid forme_juridique. Must be one of: SARL, SA, SUARL'
            });
        }

        if (!['male', 'female'].includes(owner_gender)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid owner_gender. Must be male or female'
            });
        }

        const [employeeCheck] = await pool.query(
            'SELECT id FROM employees WHERE id = ?',
            [created_by]
        );

        if (employeeCheck.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Employee (created_by) not found'
            });
        }

        const [duplicateCheck] = await pool.query(
            'SELECT id FROM company WHERE registration_number = ? OR tax_id = ?',
            [registration_number, tax_id]
        );

        if (duplicateCheck.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Company with this registration number or tax ID already exists'
            });
        }

        const [result] = await pool.query(
            `INSERT INTO company (
                name, address, phone, email, logo_url, forme_juridique, Capital,
                registration_number, tax_id, created_by, owner_name, owner_gender, employee_number
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                name, address, phone, email, logo_url, forme_juridique, Capital,
                registration_number, tax_id, created_by, owner_name, owner_gender, employee_number
            ]
        );

        res.status(201).json({
            success: true,
            message: 'Company created successfully',
            data: {
                id: result.insertId,
                name,
                forme_juridique,
                registration_number
            }
        });
    } catch (error) {
        console.error('Error creating company:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
}

// Get all companies
const getAllCompanies = async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM company');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

// Get company by ID
const getCompanyById = async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM company WHERE id = ?', [req.params.id]);
        if (rows.length === 0) return res.status(404).json({ error: 'Company not found' });
        res.json(rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

// Update company
const updateCompany = async (req, res) => {
    try {
        const {
            name,
            address,
            phone,
            email,
            logo_url,
            forme_juridique,
            Capital,
            registration_number,
            tax_id,
            owner_name,
            owner_gender,
            employee_number
        } = req.body;

        const [result] = await pool.query(
            `UPDATE company SET 
                name = ?, address = ?, phone = ?, email = ?, logo_url = ?,
                forme_juridique = ?, Capital = ?, registration_number = ?,
                tax_id = ?, owner_name = ?, owner_gender = ?, employee_number = ?
            WHERE id = ?`,
            [
                name, address, phone, email, logo_url, forme_juridique, Capital,
                registration_number, tax_id, owner_name, owner_gender, employee_number,
                req.params.id
            ]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Company not found' });
        }

        res.json({ message: 'Company updated successfully' });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: 'Registration number or tax ID already exists' });
        }
        res.status(500).json({ error: err.message });
    }
}

// Delete company
const deleteCompany = async (req, res) => {
    try {
        const [result] = await pool.query('DELETE FROM company WHERE id = ?', [req.params.id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Company not found' });
        }
        res.json({ message: 'Company deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

const getCompanyStats = async (req, res) => {
    try {
        const [employeeCount] = await pool.query(
            'SELECT COUNT(*) as total_employees FROM employees'
        );
        
        const [activeRequests] = await pool.query(
            'SELECT COUNT(*) as active_requests FROM requests WHERE status = "en_cours"'
        );

        const [totalDocuments] = await pool.query(
            'SELECT COUNT(*) as total_documents FROM documents'
        );

        res.json({
            total_employees: employeeCount[0].total_employees,
            active_requests: activeRequests[0].active_requests,
            total_documents: totalDocuments[0].total_documents
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

module.exports = {
    getAllCompanies,
    getCompanyById,
    createCompany,
    updateCompany,
    deleteCompany,
    getCompanyStats
};