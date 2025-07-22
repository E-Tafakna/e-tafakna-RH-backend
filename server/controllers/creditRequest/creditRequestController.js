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
        e.brut_salary,
        e.department as employee_department,
        cd.department_name as policy_department
      FROM requests r
      JOIN credit_request_details crd ON r.id = crd.request_id
      JOIN employees e ON r.employee_id = e.id
      LEFT JOIN credit_policy cp ON crd.policy_id = cp.id
      LEFT JOIN company_departments cd ON cp.department_id = cd.id
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
        e.brut_salary,
        e.department as employee_department,
        cd.department_name as policy_department
      FROM requests r
      JOIN credit_request_details crd ON r.id = crd.request_id
      JOIN employees e ON r.employee_id = e.id
      LEFT JOIN credit_policy cp ON crd.policy_id = cp.id
      LEFT JOIN company_departments cd ON cp.department_id = cd.id
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
      company_id,
      is_exceptional = false,
      exception_reason = null
    } = req.body;

    if (!employee_id || !amount || !months || !company_id) {
      return res.status(400).json({
        error: 'Required fields: employee_id, amount, months, company_id'
      });
    }

    // Récupérer infos employé (dont son département)
    const [employeeRows] = await pool.query(
      'SELECT brut_salary, seniority_in_months, department FROM employees WHERE id = ?',
      [employee_id]
    );

    if (employeeRows.length === 0) {
      return res.status(400).json({ error: 'Employee not found' });
    }

    const employee = employeeRows[0];
    const employeeDepartment = employee.department;

    // Chercher l'ID du département dans company_departments
    const [departmentRows] = await pool.query(`
      SELECT id FROM company_departments
      WHERE company_id = ? AND department_name = ?
    `, [company_id, employeeDepartment]);

    if (departmentRows.length === 0) {
      return res.status(400).json({ error: `Department '${employeeDepartment}' not found in company_departments` });
    }

    const departmentId = departmentRows[0].id;

    // Chercher la politique active pour ce département
    const [policyRows] = await pool.query(`
      SELECT * FROM credit_policy
      WHERE company_id = ? AND department_id = ? AND is_active = true
    `, [company_id, departmentId]);

    if (policyRows.length === 0) {
      return res.status(400).json({
        error: `No active credit policy found for department '${employeeDepartment}'`
      });
    }

    const currentPolicy = policyRows[0];

    // Vérifier ancienneté si non-exceptionnelle
    if (!is_exceptional && (employee.seniority_in_months || 0) < currentPolicy.min_months_seniority) {
      return res.status(400).json({
        error: `Employee must have at least ${currentPolicy.min_months_seniority} months of seniority`
      });
    }

    // Vérifier montant max autorisé
    if (!is_exceptional) {
      const maxAmount = employee.brut_salary * currentPolicy.max_salary_multiplier;
      if (amount > maxAmount) {
        return res.status(400).json({
          error: `Amount exceeds maximum allowed (${maxAmount.toFixed(2)})`
        });
      }
    }

    // Vérifier s’il a déjà un crédit en cours
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

    // Vérifier le délai depuis le dernier crédit
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

    // Insertion transactionnelle
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      const [requestResult] = await connection.query(
        `INSERT INTO requests (
          employee_id, type, service, status, result , is_exceptional
        ) VALUES (?, 'credit', ?, 'en_cours', 'refused' , ? )`,
        [employee_id, service , is_exceptional]
      );

      const requestId = requestResult.insertId;

      await connection.query(
        `INSERT INTO credit_request_details (
          request_id, amount, months, description, is_exceptional, exception_reason, policy_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          requestId,
          amount,
          months,
          description,
          is_exceptional ? 1 : 0,
          exception_reason,
          currentPolicy.id
        ]
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
        crd.description,
        cd.department_name as policy_department
      FROM requests r
      JOIN credit_request_details crd ON r.id = crd.request_id
      LEFT JOIN credit_policy cp ON crd.policy_id = cp.id
      LEFT JOIN company_departments cd ON cp.department_id = cd.id
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
        SUM(CASE WHEN r.status = 'traite' AND r.result = 'valide' THEN crd.amount ELSE 0 END) as total_approved_amount,
        cd.department_name,
        COUNT(CASE WHEN cd.department_name IS NOT NULL THEN 1 END) as department_count
      FROM requests r
      JOIN credit_request_details crd ON r.id = crd.request_id
      LEFT JOIN credit_policy cp ON crd.policy_id = cp.id
      LEFT JOIN company_departments cd ON cp.department_id = cd.id
      WHERE r.type = 'credit'
      GROUP BY cd.department_name
    `);
    
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
const getHierarchicalCreditRequests = async (req, res) => {
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

    // 3. Fetch credit requests for all relevant employees
    const [rows] = await pool.query(`
      SELECT 
        r.*,
        crd.amount,
        crd.months,
        crd.description,
        e.full_name as employee_name,
        e.code_employe,
        e.brut_salary,
        e.department as employee_department,
        cd.department_name as policy_department
      FROM requests r
      JOIN credit_request_details crd ON r.id = crd.request_id
      JOIN employees e ON r.employee_id = e.id
      LEFT JOIN credit_policy cp ON crd.policy_id = cp.id
      LEFT JOIN company_departments cd ON cp.department_id = cd.id
      WHERE r.type = 'credit' AND r.employee_id IN (?)
      ORDER BY r.submission_date DESC
    `, [employeeIdsToQuery]);
    
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
module.exports = {
  getAllCreditRequests,
  getCreditRequestById,
  createCreditRequest,
  getEmployeeCreditRequests,
  getHierarchicalCreditRequests,
  getCreditRequestStats
};