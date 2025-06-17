const pool = require('../../database/index');

const getAllCreditRequests = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        r.*,
        crd.amount,
        crd.months,
        crd.description,
        e.full_name as employee_name,
        e.code_employe,
        e.brut_salary
      FROM requests r
      JOIN credit_request_details crd ON r.id = crd.request_id
      JOIN employees e ON r.employee_id = e.id
      WHERE r.type = 'credit'
      ORDER BY r.submission_date DESC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getCreditRequestById = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        r.*,
        crd.amount,
        crd.months,
        crd.description,
        e.full_name as employee_name,
        e.code_employe,
        e.brut_salary
      FROM requests r
      JOIN credit_request_details crd ON r.id = crd.request_id
      JOIN employees e ON r.employee_id = e.id
      WHERE r.id = ? AND r.type = 'credit'
    `, [req.params.id]);
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Credit request not found' });
    }
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const createCreditRequest = async (req, res) => {
  try {
    const {
      employee_id,
      amount,
      months,
      description,
      service,
      is_exceptional = false,   
      exception_reason = null   
    } = req.body;

    if (!employee_id || !amount || !months) {
      return res.status(400).json({
        error: 'Required fields: employee_id, amount, months'
      });
    }

    const [policyRows] = await pool.query(
      'SELECT * FROM credit_policy WHERE is_active = true ORDER BY created_at DESC LIMIT 1'
    );

    if (policyRows.length === 0) {
      return res.status(400).json({ error: 'No active credit policy found' });
    }

    const currentPolicy = policyRows[0];

    const [employeeRows] = await pool.query(
      'SELECT brut_salary, seniority_in_months FROM employees WHERE id = ?',
      [employee_id]
    );
    if (employeeRows.length === 0) {
      return res.status(400).json({ error: 'Employee not found' });
    }
    const employee = employeeRows[0];

    if (!is_exceptional && (employee.seniority_in_months || 0) < currentPolicy.min_months_seniority) {
      return res.status(400).json({
        error: `Employee must have at least ${currentPolicy.min_months_seniority} months of seniority`
      });
    }

    if (!is_exceptional) {
      const maxAmount = employee.brut_salary * currentPolicy.max_salary_multiplier;
      if (amount > maxAmount) {
        return res.status(400).json({
          error: `Amount exceeds maximum allowed (${maxAmount.toFixed(2)})`
        });
      }
    }

    const [activeCredits] = await pool.query(`
      SELECT r.id
      FROM requests r
      JOIN credit_request_details crd ON r.id = crd.request_id
      WHERE r.employee_id = ?
      AND r.type = 'credit'
      AND r.status = 'en_cours'
    `, [employee_id]);

    if (activeCredits.length > 0) {
      return res.status(400).json({
        error: 'Employee already has an active credit request'
      });
    }

    if (!is_exceptional) {
      const [lastCreditRows] = await pool.query(`
        SELECT r.submission_date
        FROM requests r
        JOIN credit_request_details crd ON r.id = crd.request_id
        WHERE r.employee_id = ?
        AND r.type = 'credit'
        AND r.status = 'traite'
        ORDER BY r.submission_date DESC
        LIMIT 1
      `, [employee_id]);

      if (lastCreditRows.length > 0) {
        const monthsSinceLastCredit = (new Date() - new Date(lastCreditRows[0].submission_date)) / (1000 * 60 * 60 * 24 * 30);
        if (monthsSinceLastCredit < currentPolicy.cooldown_months) {
          return res.status(400).json({
            error: `Must wait ${currentPolicy.cooldown_months} months between credit requests`
          });
        }
      }
    }

    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      const [requestResult] = await connection.query(
        `INSERT INTO requests (
          employee_id, type, service, status, result
        ) VALUES (?, 'credit', ?, 'en_cours', 'refused')`,
        [employee_id, service]
      );

      const requestId = requestResult.insertId;

      await connection.query(
        `INSERT INTO credit_request_details (
          request_id, amount, months, description, is_exceptional, exception_reason
        ) VALUES (?, ?, ?, ?, ?, ?)`,
        [requestId, amount, months, description, is_exceptional ? 1 : 0, exception_reason]
      );

      await connection.commit();

      res.status(201).json({
        id: requestId,
        message: 'Credit request created successfully'
      });
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


const getEmployeeCreditRequests = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        r.*,
        crd.amount,
        crd.months,
        crd.description
      FROM requests r
      JOIN credit_request_details crd ON r.id = crd.request_id
      WHERE r.employee_id = ? AND r.type = 'credit'
      ORDER BY r.submission_date DESC
    `, [req.params.employee_id]);
    
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getCreditRequestStats = async (req, res) => {
  try {
    const [stats] = await pool.query(`
      SELECT 
        COUNT(*) as total_requests,
        COUNT(CASE WHEN r.status = 'en_cours' THEN 1 END) as pending_requests,
        COUNT(CASE WHEN r.status = 'traite' AND r.result = 'valide' THEN 1 END) as approved_requests,
        COUNT(CASE WHEN r.status = 'traite' AND r.result = 'refused' THEN 1 END) as rejected_requests,
        SUM(CASE WHEN r.status = 'traite' AND r.result = 'valide' THEN crd.amount ELSE 0 END) as total_approved_amount
      FROM requests r
      JOIN credit_request_details crd ON r.id = crd.request_id
      WHERE r.type = 'credit'
    `);
    
    res.json(stats[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  getAllCreditRequests,
  getCreditRequestById,
  createCreditRequest,
  getEmployeeCreditRequests,
  getCreditRequestStats
}; 