const pool = require('../../database/index');

// Get all advance policies for a company
const getAllAdvancePolicies = async (req, res) => {
  try {
    const companyId = req.params.companyId;

    const [rows] = await pool.query(
      `SELECT ap.*, cd.department_name 
       FROM advance_policy ap
       LEFT JOIN company_departments cd ON ap.department_id = cd.id
       WHERE ap.company_id = ?
       ORDER BY cd.department_name, ap.created_at DESC`,
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
    console.error('Erreur getAllAdvancePolicies:', err);
    res.status(500).json({ error: err.message });
  }
};

// Get advance policy by ID
const getAdvancePolicyById = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT ap.*, cd.department_name 
       FROM advance_policy ap
       LEFT JOIN company_departments cd ON ap.department_id = cd.id
       WHERE ap.id = ?`,
      [req.params.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Advance policy not found' });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error('Erreur getAdvancePolicyById:', err);
    res.status(500).json({ error: err.message });
  }
};

// Create new advance policy
const createAdvancePolicy = async (req, res) => {
  try {
    const companyId = req.params.companyId;
    const {
      department_id,
      min_months_seniority,
      max_percentage_salary,
      cooldown_months_between_advance,
      is_active = true
    } = req.body;

    if (
      min_months_seniority === undefined ||
      max_percentage_salary === undefined ||
      cooldown_months_between_advance === undefined
    ) {
      return res.status(400).json({
        error: 'Required fields: min_months_seniority, max_percentage_salary, cooldown_months_between_advance'
      });
    }

    const [result] = await pool.query(
      `INSERT INTO advance_policy (
        company_id,
        department_id,
        min_months_seniority,
        max_percentage_salary,
        cooldown_months_between_advance,
        is_active
      ) VALUES (?, ?, ?, ?, ?, ?)`,
      [
        companyId,
        department_id || null,
        min_months_seniority,
        max_percentage_salary,
        cooldown_months_between_advance,
        is_active
      ]
    );

    res.status(201).json({
      id: result.insertId,
      message: 'Advance policy created successfully'
    });
  } catch (err) {
    console.error('Erreur createAdvancePolicy:', err);
    res.status(500).json({ error: err.message });
  }
};

// Update advance policy
const updateAdvancePolicy = async (req, res) => {
  try {
    const {
      department_id,
      min_months_seniority,
      max_percentage_salary,
      cooldown_months_between_advance,
      is_active
    } = req.body;

    const [policy] = await pool.query(
      'SELECT id FROM advance_policy WHERE id = ?',
      [req.params.id]
    );
    if (policy.length === 0) {
      return res.status(404).json({ error: 'Advance policy not found' });
    }

    await pool.query(
      `UPDATE advance_policy SET
        department_id = ?,
        min_months_seniority = ?,
        max_percentage_salary = ?,
        cooldown_months_between_advance = ?,
        is_active = ?
      WHERE id = ?`,
      [
        department_id || null,
        min_months_seniority,
        max_percentage_salary,
        cooldown_months_between_advance,
        is_active,
        req.params.id
      ]
    );

    res.json({ message: 'Advance policy updated successfully' });
  } catch (err) {
    console.error('Erreur updateAdvancePolicy:', err);
    res.status(500).json({ error: err.message });
  }
};

// Delete advance policy
const deleteAdvancePolicy = async (req, res) => {
  try {
    const [policy] = await pool.query(
      'SELECT id FROM advance_policy WHERE id = ?',
      [req.params.id]
    );
    if (policy.length === 0) {
      return res.status(404).json({ error: 'Advance policy not found' });
    }

    await pool.query('DELETE FROM advance_policy WHERE id = ?', [req.params.id]);

    res.json({ message: 'Advance policy deleted successfully' });
  } catch (err) {
    console.error('Erreur deleteAdvancePolicy:', err);
    res.status(500).json({ error: err.message });
  }
};

// Get departments for a company
const getDepartments = async (req, res) => {
  try {
    const companyId = req.params.companyId;

    const [rows] = await pool.query(
      'SELECT id, department_name FROM company_departments WHERE company_id = ?',
      [companyId]
    );

    res.json(rows);
  } catch (err) {
    console.error('Erreur getDepartments:', err);
    res.status(500).json({ error: err.message });
  }
};

// Check advance eligibility
const checkAdvanceEligibility = async (req, res) => {
  try {
    const { employee_id, amount } = req.body;

    if (!employee_id || amount === undefined) {
      return res.status(400).json({ error: 'employee_id and amount are required' });
    }

    // Récupérer la policy active de l’employé
    const [policy] = await pool.query(
      `SELECT ap.* FROM advance_policy ap
       JOIN employees e ON ap.company_id = e.company_id
       WHERE e.id = ? AND (ap.department_id IS NULL OR ap.department_id = e.department_id)
       ORDER BY ap.department_id IS NOT NULL DESC
       LIMIT 1`,
      [employee_id]
    );

    if (policy.length === 0) {
      return res.status(404).json({ error: 'Advance policy not found for this employee' });
    }

    // Récupérer salaire brut
    const [employee] = await pool.query(
      'SELECT brut_salary FROM employees WHERE id = ?',
      [employee_id]
    );
    if (employee.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    const brutSalary = employee[0].brut_salary;
    const currentPolicy = policy[0];
    const maxAdvanceAmount = (brutSalary * currentPolicy.max_percentage_salary) / 100;

    // Dernière avance validée
    const [lastAdvance] = await pool.query(
      `SELECT r.submission_date
       FROM requests r
       JOIN advance_request_details ard ON ard.request_id = r.id
       WHERE r.employee_id = ? AND r.type = 'avance' AND r.result = 'valide'
       ORDER BY r.submission_date DESC
       LIMIT 1`,
      [employee_id]
    );

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
      const monthsSince = (new Date() - lastAdvanceDate) / (1000 * 60 * 60 * 24 * 30);
      if (monthsSince < currentPolicy.cooldown_months_between_advance) {
        eligibility.is_eligible = false;
        eligibility.reasons.push(
          `Must wait ${currentPolicy.cooldown_months_between_advance} months between advances`
        );
      }
    }

    res.json({
      policy: currentPolicy,
      eligibility,
      max_advance_amount: maxAdvanceAmount,
      brut_salary: brutSalary
    });
  } catch (err) {
    console.error('Erreur checkAdvanceEligibility:', err);
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  getAllAdvancePolicies,
  getAdvancePolicyById,
  createAdvancePolicy,
  updateAdvancePolicy,
  deleteAdvancePolicy,
  getDepartments,
  checkAdvanceEligibility
};
