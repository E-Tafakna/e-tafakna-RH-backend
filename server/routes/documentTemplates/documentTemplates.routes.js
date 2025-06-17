const express = require('express');
const {
  getAllDocumentTemplates,
  getDocumentTemplateById,
  createDocumentTemplate,
  updateDocumentTemplate,
  deleteDocumentTemplate,
} = require('../../controllers/DocumentTemplates/documentTemplates');

const router = express.Router();

router.get('/', getAllDocumentTemplates);
router.get('/:id', getDocumentTemplateById);
router.post('/', createDocumentTemplate);
router.put('/:id', updateDocumentTemplate);
router.delete('/:id', deleteDocumentTemplate);

module.exports = router;