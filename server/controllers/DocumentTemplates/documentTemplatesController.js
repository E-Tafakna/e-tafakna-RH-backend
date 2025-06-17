const pool = require('../../database/index');

const getAllDocumentTemplates = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT * FROM document_templates
      WHERE is_active = true
      ORDER BY name
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getDocumentTemplateById = async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM document_templates WHERE id = ?',
      [req.params.id]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Document template not found' });
    }
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const createDocumentTemplate = async (req, res) => {
  try {
    const {
      name,
      description,
      template_path,
      required_fields,
      is_active
    } = req.body;

    // Validate required fields
    if (!name || !template_path) {
      return res.status(400).json({
        error: 'Required fields: name, template_path'
      });
    }

    // Check if template with same name exists
    const [existingTemplate] = await pool.query(
      'SELECT id FROM document_templates WHERE name = ?',
      [name]
    );
    if (existingTemplate.length > 0) {
      return res.status(400).json({ error: 'Document template with this name already exists' });
    }

    // Create template
    const [result] = await pool.query(
      `INSERT INTO document_templates (
        name,
        description,
        template_path,
        required_fields,
        is_active
      ) VALUES (?, ?, ?, ?, ?)`,
      [name, description, template_path, JSON.stringify(required_fields || []), is_active || true]
    );

    res.status(201).json({
      id: result.insertId,
      message: 'Document template created successfully'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const updateDocumentTemplate = async (req, res) => {
  try {
    const {
      name,
      description,
      template_path,
      required_fields,
      is_active
    } = req.body;

    // Check if template exists
    const [template] = await pool.query(
      'SELECT id FROM document_templates WHERE id = ?',
      [req.params.id]
    );
    if (template.length === 0) {
      return res.status(404).json({ error: 'Document template not found' });
    }

    // Check if new name conflicts with existing template
    if (name) {
      const [nameConflict] = await pool.query(
        'SELECT id FROM document_templates WHERE name = ? AND id != ?',
        [name, req.params.id]
      );
      if (nameConflict.length > 0) {
        return res.status(400).json({ error: 'Document template with this name already exists' });
      }
    }

    // Update template
    await pool.query(
      `UPDATE document_templates SET
        name = COALESCE(?, name),
        description = COALESCE(?, description),
        template_path = COALESCE(?, template_path),
        required_fields = COALESCE(?, required_fields),
        is_active = COALESCE(?, is_active)
      WHERE id = ?`,
      [
        name,
        description,
        template_path,
        required_fields ? JSON.stringify(required_fields) : null,
        is_active,
        req.params.id
      ]
    );

    res.json({ message: 'Document template updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const deleteDocumentTemplate = async (req, res) => {
  try {
    // Check if template exists
    const [template] = await pool.query(
      'SELECT id FROM document_templates WHERE id = ?',
      [req.params.id]
    );
    if (template.length === 0) {
      return res.status(404).json({ error: 'Document template not found' });
    }

    // Check if template is being used in any active requests
    const [activeRequests] = await pool.query(`
      SELECT r.id
      FROM requests r
      JOIN document_request_details drd ON r.id = drd.request_id
      WHERE drd.document_type = (SELECT name FROM document_templates WHERE id = ?)
      AND r.status = 'en_cours'
    `, [req.params.id]);

    if (activeRequests.length > 0) {
      return res.status(400).json({
        error: 'Cannot delete template while it has active requests'
      });
    }

    // Soft delete by setting is_active to false
    await pool.query(
      'UPDATE document_templates SET is_active = false WHERE id = ?',
      [req.params.id]
    );

    res.json({ message: 'Document template deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getDocumentTemplateStats = async (req, res) => {
  try {
    const [stats] = await pool.query(`
      SELECT 
        dt.name as template_name,
        COUNT(r.id) as total_requests,
        COUNT(CASE WHEN r.status = 'en_cours' THEN 1 END) as pending_requests,
        COUNT(CASE WHEN r.status = 'traite' AND r.result = 'valide' THEN 1 END) as approved_requests,
        COUNT(CASE WHEN r.status = 'traite' AND r.result = 'refused' THEN 1 END) as rejected_requests
      FROM document_templates dt
      LEFT JOIN document_request_details drd ON dt.name = drd.document_type
      LEFT JOIN requests r ON drd.request_id = r.id
      WHERE dt.is_active = true
      GROUP BY dt.name
    `);
    
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  getAllDocumentTemplates,
  getDocumentTemplateById,
  createDocumentTemplate,
  updateDocumentTemplate,
  deleteDocumentTemplate,
  getDocumentTemplateStats
}; 