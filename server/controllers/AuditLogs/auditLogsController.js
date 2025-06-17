const pool = require('../../database/index');

const getAllAuditLogs = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT al.*, e.full_name as employee_name, e.code_employe
      FROM audit_logs al
      LEFT JOIN employees e ON al.employee_id = e.id
      ORDER BY al.timestamp DESC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getAuditLogById = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT al.*, e.full_name as employee_name, e.code_employe
      FROM audit_logs al
      LEFT JOIN employees e ON al.employee_id = e.id
      WHERE al.id = ?
    `, [req.params.id]);
    
    if (rows.length === 0) return res.status(404).json({ error: 'Audit log not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getAuditLogsByEmployee = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT al.*, e.full_name as employee_name, e.code_employe
      FROM audit_logs al
      LEFT JOIN employees e ON al.employee_id = e.id
      WHERE al.employee_id = ?
      ORDER BY al.timestamp DESC
    `, [req.params.employeeId]);
    
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const createAuditLog = async (req, res) => {
  try {
    const { employee_id, action } = req.body;
    const [result] = await pool.query(
      `INSERT INTO audit_logs (employee_id, action)
       VALUES (?, ?)`,
      [employee_id, action]
    );
    res.status(201).json({ id: result.insertId, message: 'Audit log created' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const deleteAuditLog = async (req, res) => {
  try {
    const [result] = await pool.query('DELETE FROM audit_logs WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Audit log not found' });
    res.json({ message: 'Audit log deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getAuditLogsByDateRange = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    let query = `
      SELECT al.*, e.full_name as employee_name, e.code_employe
      FROM audit_logs al
      LEFT JOIN employees e ON al.employee_id = e.id
    `;
    let queryParams = [];

    if (startDate && endDate) {
      query += ` WHERE al.timestamp BETWEEN ? AND ?`;
      queryParams = [startDate, endDate];
    } else if (startDate) {
      query += ` WHERE al.timestamp >= ?`;
      queryParams = [startDate];
    } else if (endDate) {
      query += ` WHERE al.timestamp <= ?`;
      queryParams = [endDate];
    }

    query += ` ORDER BY al.timestamp DESC`;

    const [rows] = await pool.query(query, queryParams);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getAuditLogsByAction = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT al.*, e.full_name as employee_name, e.code_employe
      FROM audit_logs al
      LEFT JOIN employees e ON al.employee_id = e.id
      WHERE al.action LIKE ?
      ORDER BY al.timestamp DESC
    `, [`%${req.params.action}%`]);
    
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Helper function to log actions automatically
const logAction = async (employee_id, action) => {
  try {
    await pool.query(
      `INSERT INTO audit_logs (employee_id, action)
       VALUES (?, ?)`,
      [employee_id, action]
    );
  } catch (err) {
    console.error('Error logging action:', err);
  }
};

module.exports = {
  getAllAuditLogs,
  getAuditLogById,
  getAuditLogsByEmployee,
  createAuditLog,
  deleteAuditLog,
  getAuditLogsByDateRange,
  getAuditLogsByAction,
  logAction,
};