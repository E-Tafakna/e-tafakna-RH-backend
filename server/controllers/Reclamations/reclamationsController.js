const pool = require('../../database/index');

const getAllReclamations = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT rec.*, r.employee_id, r.type as request_type, r.status as request_status,
             e.full_name as employee_name, e.code_employe
      FROM reclamations rec
      LEFT JOIN requests r ON rec.request_id = r.id
      LEFT JOIN employees e ON r.employee_id = e.id
      ORDER BY rec.created_at DESC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getReclamationById = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT rec.*, r.employee_id, r.type as request_type, r.status as request_status,
             e.full_name as employee_name, e.code_employe
      FROM reclamations rec
      LEFT JOIN requests r ON rec.request_id = r.id
      LEFT JOIN employees e ON r.employee_id = e.id
      WHERE rec.id = ?
    `, [req.params.id]);
    
    if (rows.length === 0) return res.status(404).json({ error: 'Reclamation not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getReclamationsByEmployee = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT rec.*, r.employee_id, r.type as request_type, r.status as request_status,
             e.full_name as employee_name, e.code_employe
      FROM reclamations rec
      LEFT JOIN requests r ON rec.request_id = r.id
      LEFT JOIN employees e ON r.employee_id = e.id
      WHERE r.employee_id = ?
      ORDER BY rec.created_at DESC
    `, [req.params.employeeId]);
    
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const createReclamation = async (req, res) => {
  try {
    const { request_id, category, description, confidential } = req.body;
    const [result] = await pool.query(
      `INSERT INTO reclamations (request_id, category, description, confidential)
       VALUES (?, ?, ?, ?)`,
      [request_id, category, description, confidential !== undefined ? confidential : true]
    );
    res.status(201).json({ id: result.insertId, message: 'Reclamation created' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const updateReclamation = async (req, res) => {
  try {
    const id = req.params.id;
    const { category, description, confidential } = req.body;

    const [result] = await pool.query(
      `UPDATE reclamations SET category = ?, description = ?, confidential = ?
       WHERE id = ?`,
      [category, description, confidential, id]
    );

    if (result.affectedRows === 0) return res.status(404).json({ error: 'Reclamation not found' });

    res.json({ message: 'Reclamation updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const deleteReclamation = async (req, res) => {
  try {
    const [result] = await pool.query('DELETE FROM reclamations WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Reclamation not found' });
    res.json({ message: 'Reclamation deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getReclamationsByCategory = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT rec.*, r.employee_id, r.type as request_type, r.status as request_status,
             e.full_name as employee_name, e.code_employe
      FROM reclamations rec
      LEFT JOIN requests r ON rec.request_id = r.id
      LEFT JOIN employees e ON r.employee_id = e.id
      WHERE rec.category = ?
      ORDER BY rec.created_at DESC
    `, [req.params.category]);
    
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getConfidentialReclamations = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT rec.*, r.employee_id, r.type as request_type, r.status as request_status,
             e.full_name as employee_name, e.code_employe
      FROM reclamations rec
      LEFT JOIN requests r ON rec.request_id = r.id
      LEFT JOIN employees e ON r.employee_id = e.id
      WHERE rec.confidential = TRUE
      ORDER BY rec.created_at DESC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getSensitiveReclamations = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT rec.*, r.employee_id, r.type as request_type, r.status as request_status,
             e.full_name as employee_name, e.code_employe
      FROM reclamations rec
      LEFT JOIN requests r ON rec.request_id = r.id
      LEFT JOIN employees e ON r.employee_id = e.id
      WHERE rec.category IN ('harcelement_moral', 'agression_sexuelle')
      ORDER BY rec.created_at DESC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  getAllReclamations,
  getReclamationById,
  getReclamationsByEmployee,
  createReclamation,
  updateReclamation,
  deleteReclamation,
  getReclamationsByCategory,
  getConfidentialReclamations,
  getSensitiveReclamations,
};