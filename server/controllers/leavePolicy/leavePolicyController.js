const pool = require('../../database/index');

// Get all leave policies for a company (grouped by department)
const getAllLeavePolicies = async (req, res) => {
  try {
    const companyId = req.params.companyId;

    const [rows] = await pool.query(
      `SELECT lp.*, cd.department_name 
       FROM leave_policy lp
       LEFT JOIN company_departments cd ON lp.department_id = cd.id
       WHERE lp.company_id = ?
       ORDER BY cd.department_name, lp.created_at DESC`,
      [companyId]
    );

    // Group by department
    const policiesByDepartment = rows.reduce((acc, policy) => {
      const department = policy.department_name || 'Global';
      if (!acc[department]) acc[department] = [];
      acc[department].push(policy);
      return acc;
    }, {});

    res.json(policiesByDepartment);
  } catch (err) {
    console.error('Erreur getAllLeavePolicies:', err);
    res.status(500).json({ error: err.message });
  }
};

// Get leave policy by ID
const getLeavePolicyById = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT lp.*, cd.department_name 
       FROM leave_policy lp
       LEFT JOIN company_departments cd ON lp.department_id = cd.id
       WHERE lp.id = ?`,
      [req.params.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Leave policy not found' });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error('Erreur getLeavePolicyById:', err);
    res.status(500).json({ error: err.message });
  }
};

// Create new leave policy
const createLeavePolicy = async (req, res) => {
  try {
    const companyId = req.params.companyId;
    const {
      department_id,
      min_months_seniority,
      days_per_month_worked,
      max_days_per_year,
      cooldown_days_between_requests,
      requires_approval = true,
      auto_approve = false,
      is_active = true,
      policy_notes
    } = req.body;

    if (
      min_months_seniority === undefined ||
      days_per_month_worked === undefined ||
      max_days_per_year === undefined ||
      cooldown_days_between_requests === undefined
    ) {
      return res.status(400).json({
        error: 'Required fields: min_months_seniority, days_per_month_worked, max_days_per_year, cooldown_days_between_requests'
      });
    }

    const [result] = await pool.query(
      `INSERT INTO leave_policy (
        company_id,
        department_id,
        min_months_seniority,
        days_per_month_worked,
        max_days_per_year,
        cooldown_days_between_requests,
        requires_approval,
        auto_approve,
        is_active,
        policy_notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        companyId,
        department_id || null,
        min_months_seniority,
        days_per_month_worked,
        max_days_per_year,
        cooldown_days_between_requests,
        requires_approval,
        auto_approve,
        is_active,
        policy_notes || null
      ]
    );

    // Get the newly created policy with department name
    const [newPolicy] = await pool.query(
      `SELECT lp.*, cd.department_name 
       FROM leave_policy lp
       LEFT JOIN company_departments cd ON lp.department_id = cd.id
       WHERE lp.id = ?`,
      [result.insertId]
    );

    res.status(201).json(newPolicy[0]);
  } catch (err) {
    console.error('Erreur createLeavePolicy:', err);
    res.status(500).json({ error: err.message });
  }
};

// Update leave policy
const updateLeavePolicy = async (req, res) => {
  try {
    const {
      department_id,
      min_months_seniority,
      days_per_month_worked,
      max_days_per_year,
      cooldown_days_between_requests,
      requires_approval,
      auto_approve,
      is_active,
      policy_notes
    } = req.body;

    const [policy] = await pool.query(
      'SELECT id FROM leave_policy WHERE id = ?',
      [req.params.id]
    );
    if (policy.length === 0) {
      return res.status(404).json({ error: 'Leave policy not found' });
    }

    await pool.query(
      `UPDATE leave_policy SET
        department_id = ?,
        min_months_seniority = ?,
        days_per_month_worked = ?,
        max_days_per_year = ?,
        cooldown_days_between_requests = ?,
        requires_approval = ?,
        auto_approve = ?,
        is_active = ?,
        policy_notes = ?
      WHERE id = ?`,
      [
        department_id || null,
        min_months_seniority,
        days_per_month_worked,
        max_days_per_year,
        cooldown_days_between_requests,
        requires_approval,
        auto_approve,
        is_active,
        policy_notes || null,
        req.params.id
      ]
    );

    // Get the updated policy with department name
    const [updatedPolicy] = await pool.query(
      `SELECT lp.*, cd.department_name 
       FROM leave_policy lp
       LEFT JOIN company_departments cd ON lp.department_id = cd.id
       WHERE lp.id = ?`,
      [req.params.id]
    );

    res.json(updatedPolicy[0]);
  } catch (err) {
    console.error('Erreur updateLeavePolicy:', err);
    res.status(500).json({ error: err.message });
  }
};

// Delete leave policy
const deleteLeavePolicy = async (req, res) => {
  try {
    const [policy] = await pool.query(
      'SELECT id FROM leave_policy WHERE id = ?',
      [req.params.id]
    );
    if (policy.length === 0) {
      return res.status(404).json({ error: 'Leave policy not found' });
    }

    await pool.query('DELETE FROM leave_policy WHERE id = ?', [req.params.id]);

    res.json({ message: 'Leave policy deleted successfully' });
  } catch (err) {
    console.error('Erreur deleteLeavePolicy:', err);
    res.status(500).json({ error: err.message });
  }
};

// Check leave eligibility for an employee
const checkLeaveEligibility = async (req, res) => {
  try {
    const { employee_id, requested_days } = req.body;

    if (!employee_id || requested_days === undefined) {
      return res.status(400).json({ error: 'employee_id and requested_days are required' });
    }

    // Get employee details
    const [employee] = await pool.query(
      `SELECT e.*, cd.department_name 
       FROM employees e
       LEFT JOIN company_departments cd ON e.department_id = cd.id
       WHERE e.id = ?`,
      [employee_id]
    );

    if (employee.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    // Get applicable leave policy (department-specific or global)
    const [policy] = await pool.query(
      `SELECT lp.* FROM leave_policy lp
       WHERE lp.company_id = ? AND lp.is_active = 1
       AND (lp.department_id IS NULL OR lp.department_id = ?)
       ORDER BY lp.department_id IS NOT NULL DESC
       LIMIT 1`,
      [employee[0].company_id, employee[0].department_id]
    );

    if (policy.length === 0) {
      return res.status(404).json({ error: 'No active leave policy found for this employee' });
    }

    const currentPolicy = policy[0];

    // Calculate months worked
    const startDate = new Date(employee[0].created_at);
    const currentDate = new Date();
    const monthsWorked = (currentDate.getFullYear() - startDate.getFullYear()) * 12 +
      (currentDate.getMonth() - startDate.getMonth());

    // Calculate earned days and available days
    const earnedDays = monthsWorked * currentPolicy.days_per_month_worked;
    const availableDays = Math.min(earnedDays, currentPolicy.max_days_per_year);

    // Get approved leave days used this year
    const [leaveRequests] = await pool.query(
      `SELECT SUM(DATEDIFF(lrd.end_date, lrd.start_date) + 1 as days_used
       FROM leave_request_details lrd
       JOIN requests r ON lrd.request_id = r.id
       WHERE r.employee_id = ? AND YEAR(lrd.start_date) = YEAR(CURRENT_DATE)
       AND r.result = 'valide'`,
      [employee_id]
    );

    const daysUsed = leaveRequests[0].days_used || 0;
    const remainingDays = availableDays - daysUsed;

    // Check eligibility
    const eligibility = {
      is_eligible: true,
      reasons: []
    };

    if (monthsWorked < currentPolicy.min_months_seniority) {
      eligibility.is_eligible = false;
      eligibility.reasons.push(`Minimum ${currentPolicy.min_months_seniority} months seniority required (current: ${monthsWorked} months)`);
    }

    if (requested_days > remainingDays) {
      eligibility.is_eligible = false;
      eligibility.reasons.push(`Requested days (${requested_days}) exceed available days (${remainingDays})`);
    }

    // Check cooldown period if needed
    if (currentPolicy.cooldown_days_between_requests > 0) {
      const [lastLeave] = await pool.query(
        `SELECT MAX(lrd.end_date) as last_end_date
         FROM leave_request_details lrd
         JOIN requests r ON lrd.request_id = r.id
         WHERE r.employee_id = ? AND r.result = 'valide'`,
        [employee_id]
      );

      if (lastLeave[0].last_end_date) {
        const lastEndDate = new Date(lastLeave[0].last_end_date);
        const daysSince = Math.floor((currentDate - lastEndDate) / (1000 * 60 * 60 * 24));
        
        if (daysSince < currentPolicy.cooldown_days_between_requests) {
          eligibility.is_eligible = false;
          eligibility.reasons.push(
            `Must wait ${currentPolicy.cooldown_days_between_requests} days between leave requests (last leave ended ${daysSince} days ago)`
          );
        }
      }
    }

    res.json({
      policy: currentPolicy,
      employee: employee[0],
      eligibility,
      months_worked: monthsWorked,
      earned_days: earnedDays,
      max_days_per_year: currentPolicy.max_days_per_year,
      days_used: daysUsed,
      remaining_days: remainingDays
    });
  } catch (err) {
    console.error('Erreur checkLeaveEligibility:', err);
    res.status(500).json({ error: err.message });
  }
};

// Get employee leave balance
const getEmployeeLeaveBalance = async (req, res) => {
  try {
    const { employee_id } = req.params;

    // Get employee details
    const [employee] = await pool.query(
      `SELECT e.*, cd.department_name 
       FROM employees e
       LEFT JOIN company_departments cd ON e.department_id = cd.id
       WHERE e.id = ?`,
      [employee_id]
    );

    if (employee.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    // Get applicable leave policy
    const [policy] = await pool.query(
      `SELECT lp.* FROM leave_policy lp
       WHERE lp.company_id = ? AND lp.is_active = 1
       AND (lp.department_id IS NULL OR lp.department_id = ?)
       ORDER BY lp.department_id IS NOT NULL DESC
       LIMIT 1`,
      [employee[0].company_id, employee[0].department_id]
    );

    if (policy.length === 0) {
      return res.status(404).json({ error: 'No active leave policy found for this employee' });
    }

    const currentPolicy = policy[0];

    // Calculate months worked
    const startDate = new Date(employee[0].created_at);
    const currentDate = new Date();
    const monthsWorked = (currentDate.getFullYear() - startDate.getFullYear()) * 12 +
      (currentDate.getMonth() - startDate.getMonth());

    // Calculate earned days and available days
    const earnedDays = monthsWorked * currentPolicy.days_per_month_worked;
    const availableDays = Math.min(earnedDays, currentPolicy.max_days_per_year);

    // Get approved leave days used this year
    const [leaveRequests] = await pool.query(
      `SELECT SUM(DATEDIFF(lrd.end_date, lrd.start_date) + 1 as days_used
       FROM leave_request_details lrd
       JOIN requests r ON lrd.request_id = r.id
       WHERE r.employee_id = ? AND YEAR(lrd.start_date) = YEAR(CURRENT_DATE)
       AND r.result = 'valide'`,
      [employee_id]
    );

    const daysUsed = leaveRequests[0].days_used || 0;
    const remainingDays = availableDays - daysUsed;

    res.json({
      policy: currentPolicy,
      employee: employee[0],
      months_worked: monthsWorked,
      earned_days: earnedDays,
      max_days_per_year: currentPolicy.max_days_per_year,
      days_used: daysUsed,
      remaining_days: remainingDays
    });
  } catch (err) {
    console.error('Erreur getEmployeeLeaveBalance:', err);
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  getAllLeavePolicies,
  getLeavePolicyById,
  createLeavePolicy,
  updateLeavePolicy,
  deleteLeavePolicy,
  checkLeaveEligibility,
  getEmployeeLeaveBalance
};