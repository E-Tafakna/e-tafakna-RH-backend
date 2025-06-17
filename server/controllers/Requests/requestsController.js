const pool = require('../../database/index');

const getAllRequests = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT r.*, e.full_name as employee_name, e.code_employe
      FROM requests r
      LEFT JOIN employees e ON r.employee_id = e.id
      ORDER BY r.submission_date DESC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getRequestById = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT r.*, e.full_name as employee_name, e.code_employe
      FROM requests r
      LEFT JOIN employees e ON r.employee_id = e.id
      WHERE r.id = ?
    `, [req.params.id]);
    
    if (rows.length === 0) return res.status(404).json({ error: 'Request not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getRequestsByEmployee = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT r.*, e.full_name as employee_name, e.code_employe
      FROM requests r
      LEFT JOIN employees e ON r.employee_id = e.id
      WHERE r.employee_id = ?
      ORDER BY r.submission_date DESC
    `, [req.params.employeeId]);
    
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const createRequest = async (req, res) => {
  try {
    const { employee_id, type, service, status, result, confidential } = req.body;
    const [result_] = await pool.query(
      `INSERT INTO requests (employee_id, type, service, status, result, confidential)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [employee_id, type, service, status || 'en_cours', result || 'neant', confidential || false]
    );
    res.status(201).json({ id: result_.insertId, message: 'Request created' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const updateRequest = async (req, res) => {
  try {
    const id = req.params.id;
    const { type, service, status, result, confidential } = req.body;

    // If status is being changed to 'traite', update result_date
    let updateQuery = `UPDATE requests SET type = ?, service = ?, status = ?, result = ?, confidential = ?`;
    let queryParams = [type, service, status, result, confidential];

    if (status === 'traite') {
      updateQuery += `, result_date = CURRENT_TIMESTAMP`;
    }

    updateQuery += ` WHERE id = ?`;
    queryParams.push(id);

    const [result_] = await pool.query(updateQuery, queryParams);

    if (result_.affectedRows === 0) return res.status(404).json({ error: 'Request not found' });

    res.json({ message: 'Request updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const deleteRequest = async (req, res) => {
  try {
    const [result] = await pool.query('DELETE FROM requests WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Request not found' });
    res.json({ message: 'Request deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getRequestsByType = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT r.*, e.full_name as employee_name, e.code_employe
      FROM requests r
      LEFT JOIN employees e ON r.employee_id = e.id
      WHERE r.type = ?
      ORDER BY r.submission_date DESC
    `, [req.params.type]);
    
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getRequestsByStatus = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT r.*, e.full_name as employee_name, e.code_employe
      FROM requests r
      LEFT JOIN employees e ON r.employee_id = e.id
      WHERE r.status = ?
      ORDER BY r.submission_date DESC
    `, [req.params.status]);
    
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  getAllRequests,
  getRequestById,
  getRequestsByEmployee,
  createRequest,
  updateRequest,
  deleteRequest,
  getRequestsByType,
  getRequestsByStatus,
};