const express = require('express');
const router = express.Router();
const {
  getAllDocumentTemplates,
  getDocumentTemplateById,
  createDocumentTemplate,
  updateDocumentTemplate,
  deleteDocumentTemplate,
  getDocumentTemplateStats
} = require('../../controllers/documentTemplates/documentTemplatesController');

// Get all document templates
router.get('/', getAllDocumentTemplates);

// Get document template by ID
router.get('/:id', getDocumentTemplateById);

// Create new document template
router.post('/', createDocumentTemplate);

// Update document template
router.put('/:id', updateDocumentTemplate);

// Delete document template
router.delete('/:id', deleteDocumentTemplate);

// Get document template statistics
router.get('/stats/overview', getDocumentTemplateStats);

module.exports = router; 