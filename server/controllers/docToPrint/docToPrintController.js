const db = require('../../database/index');

const createDocToPrint = async (req, res) => {
    try {
        const { output_format, file_url, file_name , doc_description } = req.body;

        if (!file_url) {
            return res.status(400).json({
                success: false,
                message: 'Required field: file_url'
            });
        }

        const validFormats = ['pdf', 'docx', 'html'];
        if (output_format && !validFormats.includes(output_format)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid output_format. Must be one of: pdf, docx, html'
            });
        }

        const [result] = await db.execute(
            'INSERT INTO docToPrint (output_format, file_url , file_name , doc_description) VALUES (?, ? , ? ,?)',
            [output_format || 'pdf', file_url, file_name , doc_description]
        );

        res.status(201).json({
            success: true,
            message: 'Document to print created successfully',
            data: {
                id: result.insertId,
                output_format: output_format || 'pdf',
                file_url
            }
        });
    } catch (error) {
        console.error('Error creating document to print:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

const getAllDocsToPrint = async (req, res) => {
    try {
        const { output_format, } = req.query;
        let query = 'SELECT * FROM docToPrint WHERE 1=1';
        const params = [];

        if (output_format) {
            query += ' AND output_format = ?';
            params.push(output_format);
        }

        query += ' ORDER BY created_at DESC';

        const [docs] = await db.execute(query, params);
        res.json({ success: true, data: docs });
    } catch (error) {
        console.error('Error fetching documents to print:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

const getDocToPrintById = async (req, res) => {
    try {
        const { id } = req.params;
        const [doc] = await db.execute(
            'SELECT * FROM docToPrint WHERE id = ?',
            [id]
        );

        if (doc.length === 0) {
            return res.status(404).json({ success: false, message: 'Document not found' });
        }

        res.json({ success: true, data: doc[0] });
    } catch (error) {
        console.error('Error fetching document:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

const updateDocToPrint = async (req, res) => {
    try {
        const { id } = req.params;
        const { output_format, file_url  } = req.body;

        const [check] = await db.execute('SELECT id FROM docToPrint WHERE id = ?', [id]);
        if (check.length === 0) {
            return res.status(404).json({ success: false, message: 'Document not found' });
        }

        const validFormats = ['pdf', 'docx', 'html'];
        if (output_format && !validFormats.includes(output_format)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid output_format. Must be one of: pdf, docx, html'
            });
        }

        await db.execute(
            `UPDATE docToPrint SET 
                output_format = COALESCE(?, output_format),
                file_url = COALESCE(?, file_url)
             WHERE id = ?`,
            [output_format, file_url, id]
        );

        res.json({ success: true, message: 'Document updated successfully' });
    } catch (error) {
        console.error('Error updating document:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

const deleteDocToPrint = async (req, res) => {
    try {
        const { id } = req.params;
        const [result] = await db.execute('DELETE FROM docToPrint WHERE id = ?', [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Document not found' });
        }

        res.json({ success: true, message: 'Document deleted successfully' });
    } catch (error) {
        console.error('Error deleting document:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

module.exports = {
    createDocToPrint,
    getAllDocsToPrint,
    getDocToPrintById,
    updateDocToPrint,
    deleteDocToPrint
};
