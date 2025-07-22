const pool = require('../../database/index');

// GET all document requests
const getAllDocumentRequests = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        r.*,
        drd.document_type,
        drd.notes,
        e.full_name as employee_name,
        e.code_employe
      FROM requests r
      JOIN document_request_details drd ON r.id = drd.request_id
      JOIN employees e ON r.employee_id = e.id
      WHERE r.type = 'document'
      ORDER BY r.submission_date DESC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET one document request by ID
const getDocumentRequestById = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        r.*,
        drd.document_type,
        drd.notes,
        e.full_name as employee_name,
        e.code_employe
      FROM requests r
      JOIN document_request_details drd ON r.id = drd.request_id
      JOIN employees e ON r.employee_id = e.id
      WHERE r.id = ? AND r.type = 'document'
    `, [req.params.id]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Document request not found' });
    }
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST create document request
const createDocumentRequest = async (req, res) => {
  try {
    const {
      employee_id,
      document_type,
      notes,
      service
    } = req.body;

    if (!employee_id || !document_type) {
      return res.status(400).json({
        error: 'Required fields: employee_id, document_type'
      });
    }

    const [employee] = await pool.query(
      'SELECT id FROM employees WHERE id = ?',
      [employee_id]
    );
    if (employee.length === 0) {
      return res.status(400).json({ error: 'Employee not found' });
    }

    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      const [requestResult] = await connection.query(
        `INSERT INTO requests (
          employee_id, type, service, status, result
        ) VALUES (?, 'document', ?, 'en_cours', 'refused')`,
        [employee_id, service]
      );

      const requestId = requestResult.insertId;

      await connection.query(
        `INSERT INTO document_request_details (
          request_id, document_type, notes
        ) VALUES (?, ?, ?)`,
        [requestId, document_type, notes || null]
      );

      await connection.commit();
      res.status(201).json({
        id: requestId,
        message: 'Document request created successfully'
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

// GET document requests by employee ID
const getEmployeeDocumentRequests = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        r.*,
        drd.document_type,
        drd.notes
      FROM requests r
      JOIN document_request_details drd ON r.id = drd.request_id
      WHERE r.employee_id = ? AND r.type = 'document'
      ORDER BY r.submission_date DESC
    `, [req.params.employee_id]);

    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET stats for document requests
const getDocumentRequestStats = async (req, res) => {
  try {
    const [stats] = await pool.query(`
      SELECT 
        COUNT(*) as total_requests,
        COUNT(CASE WHEN r.status = 'en_cours' THEN 1 END) as pending_requests,
        COUNT(CASE WHEN r.status = 'traite' AND r.result = 'valide' THEN 1 END) as approved_requests,
        COUNT(CASE WHEN r.status = 'traite' AND r.result = 'refused' THEN 1 END) as rejected_requests,
        drd.document_type
      FROM requests r
      JOIN document_request_details drd ON r.id = drd.request_id
      WHERE r.type = 'document'
      GROUP BY drd.document_type
    `);

    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  getAllDocumentRequests,
  getDocumentRequestById,
  createDocumentRequest,
  getEmployeeDocumentRequests,
  getDocumentRequestStats
};
