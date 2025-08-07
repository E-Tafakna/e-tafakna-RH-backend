const pool = require('../../database/index');

const getAllDepotRequests = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT dr.*, e.full_name as employee_name, e.code_employe
      FROM depot_requests dr
      JOIN employees e ON dr.employee_id = e.id
      ORDER BY dr.created_at DESC
    `);
    res.json(rows);
  } catch (err) { 
    res.status(500).json({ error: err.message });
  }
};

const getDepotRequestById = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT dr.*, e.full_name as employee_name, e.code_employe
      FROM depot_requests dr
      JOIN employees e ON dr.employee_id = e.id
      WHERE dr.id = ?
    `, [req.params.id]);
    
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Depot request not found' });
    }
    
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getDepotRequestsByEmployee = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT dr.*, e.full_name as employee_name, e.code_employe
      FROM depot_requests dr
      JOIN employees e ON dr.employee_id = e.id
      WHERE dr.employee_id = ?
      ORDER BY dr.created_at DESC
    `, [req.params.employeeId]);
    
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const createDepotRequest = async (req, res) => {
  try {
    const { employee_id, document_name, description, file_url, date_of_deposit } = req.body;

    if (!employee_id || !document_name) {
      return res.status(400).json({ 
        message: 'Required fields: employee_id, document_name' 
      });
    }

    const [result] = await pool.query(
      `INSERT INTO depot_requests (employee_id, document_name, description, file_url, date_of_deposit)
       VALUES (?, ?, ?, ?, ?)`,
      [employee_id, document_name, description || null, file_url || null, date_of_deposit || new Date()]
    );

    res.status(201).json({ 
      id: result.insertId, 
      message: 'Depot request created successfully' 
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const updateDepotRequest = async (req, res) => {
  try {
    const { document_name, description, file_url, date_of_deposit } = req.body;
    const { id } = req.params;

    const [result] = await pool.query(
      `UPDATE depot_requests 
       SET document_name = ?, description = ?, file_url = ? ,date_of_deposit = ?
       WHERE id = ?`,
      [document_name, description, date_of_deposit, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Depot request not found' });
    }

    res.json({ message: 'Depot request updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const deleteDepotRequest = async (req, res) => {
  try {
    const [result] = await pool.query(
      'DELETE FROM depot_requests WHERE id = ?',
      [req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Depot request not found' });
    }

    res.json({ message: 'Depot request deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getDepotRequestStats = async (req, res) => {
  try {
    const [stats] = await pool.query(`
      SELECT 
        COUNT(*) as total_requests,
        COUNT(DISTINCT employee_id) as total_employees,
        COUNT(DISTINCT document_name) as unique_documents,
        file_url,
        DATE_FORMAT(MIN(created_at), '%Y-%m-%d') as first_request_date,
        DATE_FORMAT(MAX(created_at), '%Y-%m-%d') as last_request_date
      FROM depot_requests
    `);
    
    res.json(stats[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  getAllDepotRequests,
  getDepotRequestById,
  getDepotRequestsByEmployee,
  createDepotRequest,
  updateDepotRequest,
  deleteDepotRequest,
  getDepotRequestStats
}; 