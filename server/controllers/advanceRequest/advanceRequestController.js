const pool = require('../../database/index');

const getAllAdvanceRequests = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        r.*,
        ard.amount,
        ard.reason,
        e.full_name as employee_name,
        e.code_employe,
        e.brut_salary,
        e.department as employee_department,
        cd.department_name as policy_department
      FROM requests r
      JOIN advance_request_details ard ON r.id = ard.request_id
      JOIN employees e ON r.employee_id = e.id
      LEFT JOIN advance_policy ap ON ard.policy_id = ap.id
      LEFT JOIN company_departments cd ON ap.department_id = cd.id
      WHERE r.type = 'advance'
      ORDER BY r.submission_date DESC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getAdvanceRequestById = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        r.*,
        ard.amount,
        ard.reason,
        e.full_name as employee_name,
        e.code_employe,
        e.brut_salary,
        e.department as employee_department,
        cd.department_name as policy_department
      FROM requests r
      JOIN advance_request_details ard ON r.id = ard.request_id
      JOIN employees e ON r.employee_id = e.id
      LEFT JOIN advance_policy ap ON ard.policy_id = ap.id
      LEFT JOIN company_departments cd ON ap.department_id = cd.id
      WHERE r.id = ? AND r.type = 'advance'
    `, [req.params.id]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Advance request not found' });
    }
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const createAdvanceRequest = async (req, res) => {
  try {
    const {
      employee_id,
      amount,
      reason,
      service,
      company_id,
      is_exceptional = false,
      exception_reason = null
    } = req.body;

    if (!employee_id || !amount) {
      return res.status(400).json({
        error: 'Required fields: employee_id, amount'
      });
    }

    const [employee] = await pool.query(
      'SELECT id, brut_salary, seniority_in_months, department FROM employees WHERE id = ?',
      [employee_id]
    );

    if (employee.length === 0) {
      return res.status(400).json({ error: 'Employee not found' });
    }

    const { brut_salary, seniority_in_months, department } = employee[0];

    const [policyResult] = await pool.query(`
      SELECT ap.*
      FROM advance_policy ap
      JOIN company_departments cd ON ap.department_id = cd.id
      WHERE ap.company_id = ? AND cd.department_name = ?
    `, [company_id, department]);

    if (policyResult.length === 0) {
      return res.status(400).json({ error: `No advance policy found for department ${department}` });
    }

    const policy = policyResult[0];

    if (!is_exceptional) {
      if (!policy.is_active) {
        return res.status(400).json({ error: 'Advance policy is not active' });
      }

      if (policy.min_months_seniority !== null && seniority_in_months < policy.min_months_seniority) {
        return res.status(400).json({
          error: `Employee must have at least ${policy.min_months_seniority} months of seniority`
        });
      }

      const maxAdvanceAmount = (brut_salary * policy.max_percentage_salary) / 100;
      if (amount > maxAdvanceAmount) {
        return res.status(400).json({
          error: `Amount exceeds maximum allowed (${maxAdvanceAmount})`
        });
      }

      const [activeAdvances] = await pool.query(`
        SELECT r.id FROM requests r
        JOIN advance_request_details ard ON r.id = ard.request_id
        WHERE r.employee_id = ? AND r.type = 'advance' AND r.status = 'en_cours'
      `, [employee_id]);

      if (activeAdvances.length > 0) {
        return res.status(400).json({
          error: 'Employee already has an active advance request'
        });
      }

      const [lastAdvance] = await pool.query(`
        SELECT r.submission_date
        FROM requests r
        JOIN advance_request_details ard ON r.id = ard.request_id
        WHERE r.employee_id = ? AND r.type = 'advance' AND r.status = 'traite'
        ORDER BY r.submission_date DESC
        LIMIT 1
      `, [employee_id]);

      if (lastAdvance.length > 0) {
        const lastDate = new Date(lastAdvance[0].submission_date);
        const monthsSince = (new Date() - lastDate) / (1000 * 60 * 60 * 24 * 30);

        if (policy.cooldown_months_between_advance !== null &&
          monthsSince < policy.cooldown_months_between_advance) {
          return res.status(400).json({
            error: `Must wait ${policy.cooldown_months_between_advance} months between advance requests`
          });
        }
      }
    }

    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      const [requestResult] = await connection.query(`
        INSERT INTO requests (
          employee_id, type, service, status, result, is_exceptional, exception_reason
        ) VALUES (?, 'advance', ?, 'en_cours', 'valide', ?, ?)
      `, [employee_id, service, is_exceptional, exception_reason]);

      const requestId = requestResult.insertId;

      await connection.query(`
        INSERT INTO advance_request_details (
          request_id, amount, reason, policy_id
        ) VALUES (?, ?, ?, ?)
      `, [requestId, amount, reason, policy.id]);

      await connection.commit();
      res.status(201).json({
        id: requestId,
        message: 'Advance request created successfully'
      });
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  } catch (err) {
    console.error('Error creating advance request:', err);
    res.status(500).json({ error: err.message });
  }
};


const getEmployeeAdvanceRequests = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        r.*,
        ard.amount,
        ard.reason,
        cd.department_name as policy_department
      FROM requests r
      JOIN advance_request_details ard ON r.id = ard.request_id
      LEFT JOIN advance_policy ap ON ard.policy_id = ap.id
      LEFT JOIN company_departments cd ON ap.department_id = cd.id
      WHERE r.employee_id = ? AND r.type = 'advance'
      ORDER BY r.submission_date DESC
    `, [req.params.employee_id]);

    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getAdvanceRequestStats = async (req, res) => {
  try {
    const [stats] = await pool.query(`
      SELECT 
        COUNT(*) as total_requests,
        COUNT(CASE WHEN r.status = 'en_cours' THEN 1 END) as pending_requests,
        COUNT(CASE WHEN r.status = 'traite' AND r.result = 'valide' THEN 1 END) as approved_requests,
        COUNT(CASE WHEN r.status = 'traite' AND r.result = 'refused' THEN 1 END) as rejected_requests,
        SUM(CASE WHEN r.status = 'traite' AND r.result = 'valide' THEN ard.amount ELSE 0 END) as total_approved_amount,
        cd.department_name,
        COUNT(CASE WHEN cd.department_name IS NOT NULL THEN 1 END) as department_count
      FROM requests r
      JOIN advance_request_details ard ON r.id = ard.request_id
      LEFT JOIN advance_policy ap ON ard.policy_id = ap.id
      LEFT JOIN company_departments cd ON ap.department_id = cd.id
      WHERE r.type = 'advance'
      GROUP BY cd.department_name
    `);

    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
const getHierarchicalAdvanceRequests = async (req, res) => {
  try {
    const employeeId = parseInt(req.params.employee_id);
    if (isNaN(employeeId)) {
      return res.status(400).json({ error: 'Invalid employee ID' });
    }

    // 1. Get employee's role and hierarchy
    const [employeeRows] = await pool.query('SELECT id, profession, role FROM employees WHERE id = ?', [employeeId]);
    if (employeeRows.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    const employee = employeeRows[0];
    let employeeIdsToQuery = [employeeId];

    // 2. Determine hierarchy based on role
    if (employee.profession === 'CEO' || employee.role === 'admin') {
      // CEO can see all requests under their hierarchy
      const [subordinates] = await pool.query(`
        WITH RECURSIVE hierarchy AS (
          SELECT id FROM employees WHERE id = ?
          UNION
          SELECT e.id FROM employees e
          JOIN employee_ceos ec ON e.id = ec.employee_id
          JOIN hierarchy h ON ec.ceo_id = h.id
          UNION
          SELECT e.id FROM employees e
          JOIN employee_managers em ON e.id = em.employee_id
          JOIN hierarchy h ON em.manager_id = h.id
        )
        SELECT id FROM hierarchy WHERE id != ?
      `, [employeeId, employeeId]);
      
      employeeIdsToQuery = subordinates.map(s => s.id);
      employeeIdsToQuery.push(employeeId); // Include CEO's own requests
    } else if (employee.profession.includes('Manager')) {
      // Manager can see their own requests and their direct reports' requests
      const [subordinates] = await pool.query(`
        SELECT employee_id as id FROM employee_managers 
        WHERE manager_id = ?
      `, [employeeId]);
      
      employeeIdsToQuery = subordinates.map(s => s.id);
      employeeIdsToQuery.push(employeeId); // Include manager's own requests
    }
    // Regular employees can only see their own requests (default)

    // 3. Fetch advance requests for all relevant employees
    const [rows] = await pool.query(`
      SELECT 
        r.*,
        ard.amount,
        ard.reason,
        e.full_name as employee_name,
        e.code_employe,
        e.brut_salary,
        e.department as employee_department,
        cd.department_name as policy_department
      FROM requests r
      JOIN advance_request_details ard ON r.id = ard.request_id
      JOIN employees e ON r.employee_id = e.id
      LEFT JOIN advance_policy ap ON ard.policy_id = ap.id
      LEFT JOIN company_departments cd ON ap.department_id = cd.id
      WHERE r.type = 'advance' AND r.employee_id IN (?)
      ORDER BY r.submission_date DESC
    `, [employeeIdsToQuery]);
    
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
module.exports = {
  getAllAdvanceRequests,
  getAdvanceRequestById,
  createAdvanceRequest,
  getEmployeeAdvanceRequests,
  getAdvanceRequestStats,
  getHierarchicalAdvanceRequests
};