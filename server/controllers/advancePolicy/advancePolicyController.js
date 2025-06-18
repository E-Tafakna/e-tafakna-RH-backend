const pool = require('../../database/index');

// Create advance policy
const createAdvancePolicy = async (req, res) => {
    try {
        const {
            company_id,
            is_active,
            min_months_seniority,
            max_percentage_salary,
            cooldown_months_between_advance
        } = req.body;

        if (!company_id) {
            return res.status(400).json({
                success: false,
                message: 'Required fields: company_id'
            });
        }

        const [companyCheck] = await pool.query(
            'SELECT id FROM company WHERE id = ?',
            [company_id]
        );

        if (companyCheck.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Company not found'
            });
        }

        const [existingPolicy] = await pool.query(
            'SELECT id FROM advance_policy WHERE company_id = ?',
            [company_id]
        );

        if (existingPolicy.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Advance policy already exists for this company'
            });
        }

        if (min_months_seniority !== undefined && (min_months_seniority < 0 || min_months_seniority > 60)) {
            return res.status(400).json({
                success: false,
                message: 'min_months_seniority must be between 0 and 60'
            });
        }

        if (max_percentage_salary !== undefined && (max_percentage_salary < 1 || max_percentage_salary > 100)) {
            return res.status(400).json({
                success: false,
                message: 'max_percentage_salary must be between 1 and 100'
            });
        }

        if (cooldown_months_between_advance !== undefined && (cooldown_months_between_advance < 0 || cooldown_months_between_advance > 24)) {
            return res.status(400).json({
                success: false,
                message: 'cooldown_months_between_advance must be between 0 and 24'
            });
        }

        const [result] = await pool.query(
            `INSERT INTO advance_policy (
                company_id, is_active,
                min_months_seniority, max_percentage_salary,
                cooldown_months_between_advance
            ) VALUES (?, ?, ?, ?, ?)`,
            [
                company_id, is_active,
                min_months_seniority, max_percentage_salary,
                cooldown_months_between_advance
            ]
        );

        res.status(201).json({
            id: result.insertId,
            message: 'Advance policy created successfully'
        });
    } catch (error) {
        console.error('Error creating advance policy:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
}

// Delete advance policy
const deleteAdvancePolicy = async (req, res) => {
    try {
        const { id } = req.params;

        const [result] = await pool.query('DELETE FROM advance_policy WHERE id = ?', [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Advance policy not found'
            });
        }

        res.json({
            success: true,
            message: 'Advance policy deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting advance policy:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
}

const getAllAdvancePolicies = async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT * FROM advance_policy 
        `);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

const getAdvancePolicyById = async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT * FROM advance_policy WHERE id = ?
        `, [req.params.id]);

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Advance policy not found' });
        }
        res.json(rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

const getAdvancePolicyByEmployee = async (req, res) => {
    try {
        const { employee_id } = req.params;

        // Check if employee exists
        const [employeeCheck] = await pool.query(
            'SELECT id, full_name FROM employees WHERE id = ?',
            [employee_id]
        );

        if (employeeCheck.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Employee not found'
            });
        }

        const [policies] = await pool.query(`
            SELECT ap.*, e.full_name as employee_name, e.code_employe, c.name as company_name
            FROM advance_policy ap 
            LEFT JOIN employees e ON ap.employee_id = e.id
            LEFT JOIN company c ON ap.company_id = c.id
            WHERE ap.employee_id = ?
            ORDER BY ap.created_at DESC
        `, [employee_id]);

        res.json({
            success: true,
            data: {
                employee: employeeCheck[0],
                policies: policies
            }
        });
    } catch (error) {
        console.error('Error fetching employee advance policies:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
}

const checkAdvanceEligibility = async (req, res) => {
    try {
        const { employee_id, amount } = req.body;

        const [policy] = await pool.query(
            'SELECT * FROM advance_policy WHERE employee_id = ?',
            [employee_id]
        );

        if (policy.length === 0) {
            return res.status(404).json({ error: 'Advance policy not found for this employee' });
        }

        const [employee] = await pool.query(
            'SELECT brut_salary FROM employees WHERE id = ?',
            [employee_id]
        );

        if (employee.length === 0) {
            return res.status(404).json({ error: 'Employee not found' });
        }

        const [lastAdvance] = await pool.query(
            `SELECT ard.*, r.submission_date
             FROM advance_request_details ard
             JOIN requests r ON ard.request_id = r.id
             WHERE r.employee_id = ? AND r.type = 'avance' AND r.result = 'valide'
             ORDER BY r.submission_date DESC
             LIMIT 1`,
            [employee_id]
        );

        const currentPolicy = policy[0];
        const brutSalary = employee[0].brut_salary;
        const maxAdvanceAmount = (brutSalary * currentPolicy.max_percentage_salary) / 100;

        const eligibility = {
            is_eligible: true,
            reasons: []
        };

        if (!currentPolicy.is_active) {
            eligibility.is_eligible = false;
            eligibility.reasons.push('Advance policy is not active');
        }

        if (amount > maxAdvanceAmount) {
            eligibility.is_eligible = false;
            eligibility.reasons.push(`Amount exceeds maximum allowed (${maxAdvanceAmount})`);
        }

        if (lastAdvance.length > 0) {
            const lastAdvanceDate = new Date(lastAdvance[0].submission_date);
            const monthsSinceLastAdvance = (new Date() - lastAdvanceDate) / (1000 * 60 * 60 * 24 * 30);

            if (monthsSinceLastAdvance < currentPolicy.cooldown_months_between_advance) {
                eligibility.is_eligible = false;
                eligibility.reasons.push(`Must wait ${currentPolicy.cooldown_months_between_advance} months between advances`);
            }
        }

        res.json({
            policy: currentPolicy,
            eligibility,
            max_advance_amount: maxAdvanceAmount,
            brut_salary: brutSalary
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

module.exports = {
    createAdvancePolicy,
    deleteAdvancePolicy,
    getAllAdvancePolicies,
    getAdvancePolicyById,
    getAdvancePolicyByEmployee,
    checkAdvanceEligibility,
};





