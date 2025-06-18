const pool = require('../../database/index');

const createLeavePolicy = async (req, res) => {
    try {
        const {
            company_id,
            min_months_seniority,
            days_per_month_worked,
            max_days_per_year,
            policy_notes
        } = req.body;

        const [companyCheck] = await pool.query(
            'SELECT id FROM company WHERE id = ?',
            [company_id]
        );
        if (companyCheck.length === 0) {
            return res.status(400).json({ error: 'Company not found' });
        }

        const [existingPolicy] = await pool.query(
            'SELECT id FROM leave_policy WHERE company_id = ?',
            [company_id]
        );
        if (existingPolicy.length > 0) {
            return res.status(400).json({ error: 'Leave policy already exists for this company' });
        }

        const [result] = await pool.query(
            `INSERT INTO leave_policy (
                company_id, min_months_seniority,
                days_per_month_worked, max_days_per_year, policy_notes
            ) VALUES (?, ?, ?, ?, ?)`,
            [
               company_id, min_months_seniority,
                days_per_month_worked, max_days_per_year, policy_notes
            ]
        );

        res.status(201).json({
            id: result.insertId,
            message: 'Leave policy created successfully'
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

// Get all leave policies
const getAllLeavePolicies = async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT * FROM leave_policy
        `);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

// Get leave policy by ID
const getLeavePolicyById = async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT * FROM leave_policy WHERE id = ?
        `, [req.params.id]);
        
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Leave policy not found' });
        }
        res.json(rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

// Get leave policy by employee
const getLeavePolicyByEmployee = async (req, res) => {
    try {
        const { employee_id } = req.params;

        // Check if employee exists
        const [employeeCheck] = await pool.query(
            'SELECT id, full_name, created_at FROM employees WHERE id = ?',
            [employee_id]
        );

        if (employeeCheck.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Employee not found'
            });
        }

        const [policies] = await pool.query(`
                SELECT lp.*, e.full_name as employee_name, e.code_employe, c.name as company_name
                FROM leave_policy lp 
                LEFT JOIN employees e ON lp.employee_id = e.id
                LEFT JOIN company c ON lp.company_id = c.id
                WHERE lp.employee_id = ?
                ORDER BY lp.created_at DESC
            `, [employee_id]);

        res.json({
            success: true,
            data: {
                employee: employeeCheck[0],
                policies: policies
            }
        });
    } catch (error) {
        console.error('Error fetching employee leave policies:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
}

// Calculate available leave days for employee
const calculateAvailableLeave = async (req, res) => {
    try {
        const { employee_id, company_id } = req.params;

        // Get employee details
        const [employee] = await pool.query(
            'SELECT id, full_name, created_at FROM employees WHERE id = ?',
            [employee_id]
        );

        if (employee.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Employee not found'
            });
        }

        // Get leave policy (first try employee-specific, then company-wide)
        let [policy] = await pool.query(
            'SELECT * FROM leave_policy WHERE employee_id = ? AND company_id = ?',
            [employee_id, company_id]
        );

        if (policy.length === 0) {
            [policy] = await pool.query(
                'SELECT * FROM leave_policy WHERE employee_id IS NULL AND company_id = ?',
                [company_id]
            );
        }

        if (policy.length === 0) {
            return res.json({
                success: true,
                data: {
                    available_days: 0,
                    reason: 'No leave policy found for this employee or company'
                }
            });
        }

        const policyData = policy[0];
        const employeeData = employee[0];

        // Calculate months worked
        const startDate = new Date(employeeData.created_at);
        const currentDate = new Date();
        const monthsWorked = (currentDate.getFullYear() - startDate.getFullYear()) * 12 +
            (currentDate.getMonth() - startDate.getMonth());

        // Check if employee meets minimum seniority
        if (monthsWorked < policyData.min_months_seniority) {
            return res.json({
                success: true,
                data: {
                    available_days: 0,
                    reason: `Employee needs ${policyData.min_months_seniority} months of seniority. Current: ${monthsWorked} months`,
                    months_worked: monthsWorked,
                    required_months: policyData.min_months_seniority
                }
            });
        }

        // Calculate earned days
        const earnedDays = Math.floor(monthsWorked * policyData.days_per_month_worked);
        const availableDays = Math.min(earnedDays, policyData.max_days_per_year);

        res.json({
            success: true,
            data: {
                available_days: availableDays,
                earned_days: earnedDays,
                max_days_per_year: policyData.max_days_per_year,
                months_worked: monthsWorked,
                days_per_month_worked: policyData.days_per_month_worked,
                policy: policyData
            }
        });
    } catch (error) {
        console.error('Error calculating available leave:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
}

// Update leave policy
const updateLeavePolicy = async (req, res) => {
    try {
        const {
            min_months_seniority,
            days_per_month_worked,
            max_days_per_year,
            policy_notes
        } = req.body;

        const [result] = await pool.query(
            `UPDATE leave_policy SET
                min_months_seniority = ?,
                days_per_month_worked = ?,
                max_days_per_year = ?,
                policy_notes = ?
            WHERE id = ?`,
            [
                min_months_seniority,
                days_per_month_worked,
                max_days_per_year,
                policy_notes,
                req.params.id
            ]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Leave policy not found' });
        }

        res.json({ message: 'Leave policy updated successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

// Delete leave policy
const deleteLeavePolicy = async (req, res) => {
    try {
        const [result] = await pool.query(
            'DELETE FROM leave_policy WHERE id = ?',
            [req.params.id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Leave policy not found' });
        }

        res.json({ message: 'Leave policy deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

const getEmployeeLeaveBalance = async (req, res) => {
    try {
        const { employee_id } = req.params;
        const currentYear = new Date().getFullYear();

        // Get employee's leave policy
        const [policy] = await pool.query(
            'SELECT * FROM leave_policy WHERE employee_id = ?',
            [employee_id]
        );

        if (policy.length === 0) {
            return res.status(404).json({ error: 'Leave policy not found for this employee' });
        }

        // Get employee's leave requests for the current year
        const [leaveRequests] = await pool.query(
            `SELECT lrd.*, r.status, r.result
             FROM leave_request_details lrd
             JOIN requests r ON lrd.request_id = r.id
             WHERE r.employee_id = ? AND YEAR(lrd.start_date) = ?
             AND r.type = 'conge' AND r.result = 'valide'`,
            [employee_id, currentYear]
        );

        // Calculate total days taken
        const totalDaysTaken = leaveRequests.reduce((total, request) => {
            const start = new Date(request.start_date);
            const end = new Date(request.end_date);
            const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
            return total + days;
        }, 0);

        // Calculate remaining days
        const remainingDays = policy[0].max_days_per_year - totalDaysTaken;

        res.json({
            policy: policy[0],
            total_days_taken: totalDaysTaken,
            remaining_days: remainingDays,
            max_days_per_year: policy[0].max_days_per_year
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

module.exports = {
    getAllLeavePolicies,
    getLeavePolicyById,
    createLeavePolicy,
    updateLeavePolicy,
    deleteLeavePolicy,
    getEmployeeLeaveBalance
};