const pool = require('../../database/index');

const getAllDocuments = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT d.*, e.full_name as employee_name, e.code_employe,
             r.type as request_type, dt.name as template_name
      FROM documents d
      LEFT JOIN employees e ON d.employee_id = e.id
      LEFT JOIN requests r ON d.request_id = r.id
      LEFT JOIN document_templates dt ON d.template_id = dt.id
      ORDER BY d.created_at DESC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getDocumentById = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT d.*, e.full_name as employee_name, e.code_employe,
             r.type as request_type, dt.name as template_name
      FROM documents d
      LEFT JOIN employees e ON d.employee_id = e.id
      LEFT JOIN requests r ON d.request_id = r.id
      LEFT JOIN document_templates dt ON d.template_id = dt.id
      WHERE d.id = ?
    `, [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Document not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getDocumentsByEmployee = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT d.*, e.full_name as employee_name, e.code_employe,
             r.type as request_type, dt.name as template_name
      FROM documents d
      LEFT JOIN employees e ON d.employee_id = e.id
      LEFT JOIN requests r ON d.request_id = r.id
      LEFT JOIN document_templates dt ON d.template_id = dt.id
      WHERE d.employee_id = ?
      ORDER BY d.created_at DESC
    `, [req.params.employeeId]);

    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getDocumentsByRequest = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT d.*, e.full_name as employee_name, e.code_employe, r.type as request_type, dt.name as template_name FROM documents d
      LEFT JOIN employees e ON d.employee_id = e.id
      LEFT JOIN requests r ON d.request_id = r.id
      LEFT JOIN document_templates dt ON d.template_id = dt.id
      WHERE d.request_id = ?
      ORDER BY d.created_at DESC`, [req.params.requestId]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const axios = require('axios');

const createDocument = async (req, res) => {
  try {
    const {
      employee_id,
      generated,
      uploaded,
      template_id,
      notes
    } = req.body;

    // Fetch employee data
    const [[employee]] = await pool.query(
      `SELECT * FROM employees WHERE id = ?`,
      [employee_id]
    );

    if (!employee) {
      return res.status(400).json({ error: 'Invalid employee ID' });
    }

    // Fetch the template info
    const [[template]] = await pool.query(
      `SELECT * FROM document_templates WHERE id = ?`,
      [template_id]
    );

    if (!template) {
      return res.status(400).json({ error: 'Invalid template ID' });
    }

    // Fetch company data (assuming single company)
    const [[company]] = await pool.query(
      `SELECT * FROM company LIMIT 1`
    );

    if (!company) {
      return res.status(400).json({ error: 'Company data not found' });
    }

    // Cooldown check
    const [[lastGenerated]] = await pool.query(
      `SELECT generated_at 
       FROM documents 
       WHERE employee_id = ? 
         AND template_id = ? 
         AND \`generated\` = TRUE
       ORDER BY generated_at DESC 
       LIMIT 1`,
      [employee_id, template_id]
    );

    if (lastGenerated) {
      const now = new Date();
      const lastDate = new Date(lastGenerated.generated_at);
      const diffMonths = (now.getFullYear() - lastDate.getFullYear()) * 12 + (now.getMonth() - lastDate.getMonth());

      if (diffMonths < template.cooldown_months_between_advance) {
        return res.status(429).json({
          error: `Cooldown period not finished. Please wait ${template.cooldown_months_between_advance - diffMonths} more month(s).`
        });
      }
    }

    // Call external document generation service
    const generationResponse = await axios.post('https://docx2pdf-etafakna-production.up.railway.app/api/borneDoc/createContract', {
      employee,
      template,
      company,
      notes
    });
    console.log(generationResponse.data , "generationResponse")
    const file_url = generationResponse.data.url;

    if (!file_url) {
      return res.status(500).json({ error: 'Document generation failed, no file URL returned' });
    }

    // Create a new request automatically valid for document type requests
    const [requestResult] = await pool.query(
      `INSERT INTO requests (employee_id, type, status, result, submission_date) VALUES (?, 'document', 'traite', 'valide', NOW())`,
      [employee_id]
    );

    const request_id = requestResult.insertId;

    // Insert into document_request_details
    await pool.query(
      `INSERT INTO document_request_details (request_id, document_type, notes) VALUES (?, ?, ?)`,
      [request_id, template.template_type, notes || '']
    );

    // Insert the new document record
    const [documentResult] = await pool.query(
      `INSERT INTO documents (employee_id, request_id, document_type, file_url, \`generated\`, uploaded, template_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [employee_id, request_id, template.template_type, file_url, generated || true, uploaded || false, template_id]
    );

    res.status(201).json({
      id: documentResult.insertId,
      message: 'Document created',
      file_url,
      employee,
      template,
      company
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};





const updateDocument = async (req, res) => {
  try {
    const id = req.params.id;
    const { document_type, file_url, generated, uploaded, template_id } = req.body;

    const [result] = await pool.query(
      `UPDATE documents SET document_type = ?, file_url = ?, generated = ?, uploaded = ?, template_id = ?
       WHERE id = ?`,
      [document_type, file_url, generated, uploaded, template_id, id]
    );

    if (result.affectedRows === 0) return res.status(404).json({ error: 'Document not found' });

    res.json({ message: 'Document updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const deleteDocument = async (req, res) => {
  try {
    const [result] = await pool.query('DELETE FROM documents WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Document not found' });
    res.json({ message: 'Document deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getGeneratedDocuments = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT d.*, e.full_name as employee_name, e.code_employe,
             r.type as request_type, dt.name as template_name
      FROM documents d
      LEFT JOIN employees e ON d.employee_id = e.id
      LEFT JOIN requests r ON d.request_id = r.id
      LEFT JOIN document_templates dt ON d.template_id = dt.id
      WHERE d.generated = TRUE
      ORDER BY d.created_at DESC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getUploadedDocuments = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT d.*, e.full_name as employee_name, e.code_employe,
             r.type as request_type, dt.name as template_name
      FROM documents d
      LEFT JOIN employees e ON d.employee_id = e.id
      LEFT JOIN requests r ON d.request_id = r.id
      LEFT JOIN document_templates dt ON d.template_id = dt.id
      WHERE d.uploaded = TRUE
      ORDER BY d.created_at DESC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  getAllDocuments,
  getDocumentById,
  getDocumentsByEmployee,
  getDocumentsByRequest,
  createDocument,
  updateDocument,
  deleteDocument,
  getGeneratedDocuments,
  getUploadedDocuments,
};