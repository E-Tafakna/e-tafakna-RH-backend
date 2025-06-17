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
        e.brut_salary
      FROM requests r
      JOIN advance_request_details ard ON r.id = ard.request_id
      JOIN employees e ON r.employee_id = e.id
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
        e.brut_salary
      FROM requests r
      JOIN advance_request_details ard ON r.id = ard.request_id
      JOIN employees e ON r.employee_id = e.id
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
      is_exceptional = false // default to false
    } = req.body;

    if (!employee_id || !amount) {
      return res.status(400).json({
        error: 'Required fields: employee_id, amount'
      });
    }

    // Check employee exists and get salary
    const [employee] = await pool.query(
      'SELECT id, brut_salary, seniority_in_months FROM employees WHERE id = ?',
      [employee_id]
    );

    if (employee.length === 0) {
      return res.status(400).json({ error: 'Employee not found' });
    }

    const brutSalary = employee[0].brut_salary;
    const employeeSeniority = employee[0].seniority_in_months || 0;

    // Get policy for this company
    const [policy] = await pool.query(
      'SELECT * FROM advance_policy WHERE company_id = ?',
      [company_id]
    );

    if (policy.length === 0) {
      return res.status(400).json({ error: 'No advance policy found for this company' });
    }

    const currentPolicy = policy[0];

    if (!is_exceptional) {
      if (!currentPolicy.is_active) {
        return res.status(400).json({ error: 'Advance policy is not active' });
      }

      // Check seniority eligibility
      if (
        currentPolicy.min_months_seniority !== null &&
        employeeSeniority < currentPolicy.min_months_seniority
      ) {
        return res.status(400).json({
          error: `Employee must have at least ${currentPolicy.min_months_seniority} months of seniority`
        });
      }

      // Calculate max allowed amount
      const maxAdvanceAmount = (brutSalary * currentPolicy.max_percentage_salary) / 100;

      if (amount > maxAdvanceAmount) {
        return res.status(400).json({
          error: `Amount exceeds maximum allowed (${maxAdvanceAmount})`
        });
      }

      // Check if there is an active advance already
      const [activeAdvances] = await pool.query(`
        SELECT r.id
        FROM requests r
        JOIN advance_request_details ard ON r.id = ard.request_id
        WHERE r.employee_id = ? 
          AND r.type = 'advance'
          AND r.status = 'en_cours'
      `, [employee_id]);

      if (activeAdvances.length > 0) {
        return res.status(400).json({
          error: 'Employee already has an active advance request'
        });
      }

      // Cooldown check — get last treated advance
      const [lastAdvance] = await pool.query(`
        SELECT r.submission_date
        FROM requests r
        JOIN advance_request_details ard ON r.id = ard.request_id
        WHERE r.employee_id = ? 
          AND r.type = 'advance'
          AND r.status = 'traite'
        ORDER BY r.submission_date DESC
        LIMIT 1
      `, [employee_id]);

      if (lastAdvance.length > 0) {
        const lastAdvanceDate = new Date(lastAdvance[0].submission_date);
        const monthsSinceLastAdvance =
          (new Date() - lastAdvanceDate) / (1000 * 60 * 60 * 24 * 30);

        if (
          currentPolicy.cooldown_months_between_advance !== null &&
          monthsSinceLastAdvance < currentPolicy.cooldown_months_between_advance
        ) {
          return res.status(400).json({
            error: `Must wait ${currentPolicy.cooldown_months_between_advance} months between advance requests`
          });
        }
      }
    }

    // Create request and details inside a transaction
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      const [requestResult] = await connection.query(
        `INSERT INTO requests (
          employee_id, type, service, status, result
        ) VALUES (?, 'advance', ?, 'en_cours', 'valide')`,
        [employee_id, service]
      );

      const requestId = requestResult.insertId;

      await connection.query(
        `INSERT INTO advance_request_details (
          request_id, amount, reason
        ) VALUES (?, ?, ?)`,
        [requestId, amount, reason]
      );

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
      FROM requests r
      JOIN advance_request_details ard ON r.id = ard.request_id
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
        AVG(ard.repayment_months) as avg_repayment_months
      FROM requests r
      JOIN advance_request_details ard ON r.id = ard.request_id
      WHERE r.type = 'advance'
    `);

    res.json(stats[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  getAllAdvanceRequests,
  getAdvanceRequestById,
  createAdvanceRequest,
  getEmployeeAdvanceRequests,
  getAdvanceRequestStats
}; 