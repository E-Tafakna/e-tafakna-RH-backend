const pool = require('../../database/index');

const getAllDocumentTemplates = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT dt.*, e.full_name as created_by_name 
      FROM document_templates dt
      LEFT JOIN employees e ON dt.created_by = e.id
      ORDER BY dt.created_at DESC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getDocumentTemplateById = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT dt.*, e.full_name as created_by_name 
      FROM document_templates dt
      LEFT JOIN employees e ON dt.created_by = e.id
      WHERE dt.id = ?
    `, [req.params.id]);
    
    if (rows.length === 0) return res.status(404).json({ error: 'Document template not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const createDocumentTemplate = async (req, res) => {
  try {
    const {
      name,
      template_type,
      description,
      file_url,
      output_format = 'pdf',
      status = 'active',
      visible_on_kiosk = true,
      created_by,
      cooldown_months_between_advance = 2,
      signature_image_url = null,
      signature_position = 'bottom_right',
      signature_size = 'medium',
      signature_included = true,
      cachet_image_url = null,
      cachet_position = 'bottom_right',
      cachet_size = 'medium',
      cachet_included = true
    } = req.body;

    const [existing] = await pool.query(
      `SELECT id FROM document_templates WHERE template_type = ? LIMIT 1`,
      [template_type]
    );

    if (existing.length > 0) {
      return res.status(400).json({
        error: `A template with type "${template_type}" already exists. Only one template per type is allowed.`
      });
    }

    const [result] = await pool.query(
      `INSERT INTO document_templates (
        name,
        template_type,
        description,
        file_url,
        output_format,
        status,
        visible_on_kiosk,
        created_by,
        cooldown_months_between_advance,
        signature_image_url,
        signature_position,
        signature_size,
        signature_included,
        cachet_image_url,
        cachet_position,
        cachet_size,
        cachet_included
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name,
        template_type,
        description,
        file_url,
        output_format,
        status,
        visible_on_kiosk,
        created_by,
        cooldown_months_between_advance,
        signature_image_url,
        signature_position,
        signature_size,
        signature_included,
        cachet_image_url,
        cachet_position,
        cachet_size,
        cachet_included
      ]
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
    const id = req.params.id;
    const { name, description, file_url, output_format } = req.body;

    const [result] = await pool.query(
      `UPDATE document_templates SET name = ?, description = ?, file_url = ?, output_format = ?
       WHERE id = ?`,
      [name, description, file_url, output_format, id]
    );

    if (result.affectedRows === 0) return res.status(404).json({ error: 'Document template not found' });

    res.json({ message: 'Document template updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const deleteDocumentTemplate = async (req, res) => {
  try {
    const [result] = await pool.query('DELETE FROM document_templates WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Document template not found' });
    res.json({ message: 'Document template deleted' });
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
      WHERE dt.visible_on_kiosk = true
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