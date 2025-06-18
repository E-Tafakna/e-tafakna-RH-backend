const express = require('express');
const {
  getAllDocumentTemplates,
  getDocumentTemplateById,
  createDocumentTemplate,
  updateDocumentTemplate,
  deleteDocumentTemplate,
  getDocumentTemplateStats
} = require('../../controllers/DocumentTemplates/documentTemplates');

const router = express.Router();

router.get('/', getAllDocumentTemplates);
router.get('/:id', getDocumentTemplateById);
router.post('/', createDocumentTemplate);
router.put('/:id', updateDocumentTemplate);
router.delete('/:id', deleteDocumentTemplate);
// Get document template statistics
router.get('/stats/overview', getDocumentTemplateStats);
module.exports = router;