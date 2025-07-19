const pool = require('../../database/index');

const getAllDocumentRequests = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        r.*,
        drd.document_type,
        drd.reason,
        drd.urgency_level,
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

const getDocumentRequestById = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        r.*,
        drd.document_type,
        drd.reason,
        drd.urgency_level,
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

const createDocumentRequest = async (req, res) => {
  try {
    const {
      employee_id,
      document_type,
      reason,
      urgency_level,
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

    const [documentType] = await pool.query(
      'SELECT id FROM document_types WHERE type = ?',
      [document_type]
    );
    if (documentType.length === 0) {
      return res.status(400).json({ error: 'Invalid document type' });
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
          request_id, document_type, reason, urgency_level
        ) VALUES (?, ?, ?, ?)`,
        [requestId, document_type, reason, urgency_level || 'normal']
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

const getEmployeeDocumentRequests = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        r.*,
        drd.document_type,
        drd.reason,
        drd.urgency_level
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

const getDocumentRequestStats = async (req, res) => {
  try {
    const [stats] = await pool.query(`
      SELECT 
        COUNT(*) as total_requests,
        COUNT(CASE WHEN r.status = 'en_cours' THEN 1 END) as pending_requests,
        COUNT(CASE WHEN r.status = 'traite' AND r.result = 'valide' THEN 1 END) as approved_requests,
        COUNT(CASE WHEN r.status = 'traite' AND r.result = 'refused' THEN 1 END) as rejected_requests,
        drd.document_type,
        drd.urgency_level,
        COUNT(CASE WHEN drd.urgency_level = 'high' THEN 1 END) as high_urgency_count
      FROM requests r
      JOIN document_request_details drd ON r.id = drd.request_id
      WHERE r.type = 'document'
      GROUP BY drd.document_type, drd.urgency_level
    `);
    
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getHierarchicalDocumentRequests = async (req, res) => {
  try {
    const employeeId = parseInt(req.params.employee_id);
    if (isNaN(employeeId)) {
      return res.status(400).json({ error: 'Invalid employee ID' });
    }

    const [employeeRows] = await pool.query('SELECT id, profession, role FROM employees WHERE id = ?', [employeeId]);
    if (employeeRows.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    const employee = employeeRows[0];
    let employeeIdsToQuery = [employeeId];

    if (employee.profession === 'CEO' || employee.role === 'admin') {
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
      employeeIdsToQuery.push(employeeId);
    } else if (employee.profession.includes('Manager')) {
      const [subordinates] = await pool.query(`
        SELECT employee_id as id FROM employee_managers 
        WHERE manager_id = ?
      `, [employeeId]);
      
      employeeIdsToQuery = subordinates.map(s => s.id);
      employeeIdsToQuery.push(employeeId);
    }

    const [rows] = await pool.query(`
      SELECT 
        r.*,
        drd.document_type,
        drd.reason,
        drd.urgency_level,
        e.full_name as employee_name,
        e.code_employe
      FROM requests r
      JOIN document_request_details drd ON r.id = drd.request_id
      JOIN employees e ON r.employee_id = e.id
      WHERE r.type = 'document' AND r.employee_id IN (?)
      ORDER BY r.submission_date DESC
    `, [employeeIdsToQuery]);
    
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  getAllDocumentRequests,
  getDocumentRequestById,
  createDocumentRequest,
  getEmployeeDocumentRequests,
  getDocumentRequestStats,
  getHierarchicalDocumentRequests
}; 