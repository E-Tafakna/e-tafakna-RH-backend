const pool = require('../../database/index');

const getAllCreditPolicies = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT * FROM credit_policy
      ORDER BY created_at DESC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getCreditPolicyById = async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM credit_policy WHERE id = ?',
      [req.params.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Credit policy not found' });
    }
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const createCreditPolicy = async (req, res) => {
  try {
    const {
      company_id,
      max_salary_multiplier,
      min_months_seniority,
      cooldown_months,
      is_active = true 
    } = req.body;

    if (
      !company_id ||
      max_salary_multiplier === undefined ||
      min_months_seniority === undefined ||
      cooldown_months === undefined
    ) {
      return res.status(400).json({
        error: 'Required fields: company_id, max_salary_multiplier, min_months_seniority, cooldown_months'
      });
    }

    const [result] = await pool.query(
      `INSERT INTO credit_policy (
        company_id,
        max_salary_multiplier,
        min_months_seniority,
        cooldown_months,
        is_active
      ) VALUES (?, ?, ?, ?, ?)`,
      [
        company_id,
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
    res.status(500).json({ error: err.message });
  }
};


const updateCreditPolicy = async (req, res) => {
  try {
    const {
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
        max_salary_multiplier = ?,
        min_months_seniority = ?,
        cooldown_months = ?,
        is_active = ?
      WHERE id = ?`,
      [
        max_salary_multiplier,
        min_months_seniority,
        cooldown_months,
        is_active,
        req.params.id
      ]
    );

    res.json({ message: 'Credit policy updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

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
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  getAllCreditPolicies,
  getCreditPolicyById,
  createCreditPolicy,
  updateCreditPolicy,
  deleteCreditPolicy
}; 