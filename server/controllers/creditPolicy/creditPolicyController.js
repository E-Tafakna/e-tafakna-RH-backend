const pool = require('../../database/index');

// Get all credit policies for a company
const getAllCreditPolicies = async (req, res) => {
  try {
    const companyId = req.params.companyId;

    const [rows] = await pool.query(
      `SELECT cp.*, cd.department_name 
       FROM credit_policy cp
       LEFT JOIN company_departments cd ON cp.department_id = cd.id
       WHERE cp.company_id = ?
       ORDER BY cd.department_name, cp.created_at DESC`,
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
    console.error('Erreur getAllCreditPolicies:', err);
    res.status(500).json({ error: err.message });
  }
};

// Get credit policy by ID
const getCreditPolicyById = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT cp.*, cd.department_name 
       FROM credit_policy cp
       LEFT JOIN company_departments cd ON cp.department_id = cd.id
       WHERE cp.id = ?`,
      [req.params.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Credit policy not found' });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error('Erreur getCreditPolicyById:', err);
    res.status(500).json({ error: err.message });
  }
};

// Create new credit policy for a company
const createCreditPolicy = async (req, res) => {
  try {
    const companyId = req.params.companyId;
    const {
      department_id,
      max_salary_multiplier,
      min_months_seniority,
      cooldown_months,
      is_active = true
    } = req.body;

    if (
      max_salary_multiplier === undefined ||
      min_months_seniority === undefined ||
      cooldown_months === undefined
    ) {
      return res.status(400).json({
        error: 'Required fields: max_salary_multiplier, min_months_seniority, cooldown_months'
      });
    }

    const [result] = await pool.query(
      `INSERT INTO credit_policy (
        company_id,
        department_id,
        max_salary_multiplier,
        min_months_seniority,
        cooldown_months,
        is_active
      ) VALUES (?, ?, ?, ?, ?, ?)`,
      [
        companyId,
        department_id || null,
        max_salary_multiplier,
        min_months_seniority,
        cooldown_months,
        is_active
      ]
    );

    res.status(201).json({
      id: result.insertId,
      message: 'Credit policy created successfully'
    });
  } catch (err) {
    console.error('Erreur createCreditPolicy:', err);
    res.status(500).json({ error: err.message });
  }
};

// Update credit policy
const updateCreditPolicy = async (req, res) => {
  try {
    const {
      department_id,
      max_salary_multiplier,
      min_months_seniority,
      cooldown_months,
      is_active
    } = req.body;

    const [policy] = await pool.query(
      'SELECT id FROM credit_policy WHERE id = ?',
      [req.params.id]
    );
    if (policy.length === 0) {
      return res.status(404).json({ error: 'Credit policy not found' });
    }

    await pool.query(
      `UPDATE credit_policy SET
        department_id = ?,
        max_salary_multiplier = ?,
        min_months_seniority = ?,
        cooldown_months = ?,
        is_active = ?
      WHERE id = ?`,
      [
        department_id || null,
        max_salary_multiplier,
        min_months_seniority,
        cooldown_months,
        is_active,
        req.params.id
      ]
    );

    res.json({ message: 'Credit policy updated successfully' });
  } catch (err) {
    console.error('Erreur updateCreditPolicy:', err);
    res.status(500).json({ error: err.message });
  }
};

// Delete credit policy
const deleteCreditPolicy = async (req, res) => {
  try {
    const [policy] = await pool.query(
      'SELECT id FROM credit_policy WHERE id = ?',
      [req.params.id]
    );
    if (policy.length === 0) {
      return res.status(404).json({ error: 'Credit policy not found' });
    }

    await pool.query('DELETE FROM credit_policy WHERE id = ?', [req.params.id]);

    res.json({ message: 'Credit policy deleted successfully' });
  } catch (err) {
    console.error('Erreur deleteCreditPolicy:', err);
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

module.exports = {
  getAllCreditPolicies,
  getCreditPolicyById,
  createCreditPolicy,
  updateCreditPolicy,
  deleteCreditPolicy,
  getDepartments
};
