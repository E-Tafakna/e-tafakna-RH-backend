const express = require('express');
const {
  getAllDocuments,
  getDocumentById,
  getDocumentsByEmployee,
  getDocumentsByRequest,
  createDocument,
  updateDocument,
  deleteDocument,
  getGeneratedDocuments,
  getUploadedDocuments,
} = require('../../controllers/Documents/DocumentsController');

const router = express.Router();

router.get('/', getAllDocuments);
router.get('/generated', getGeneratedDocuments);
router.get('/uploaded', getUploadedDocuments);
router.get('/:id', getDocumentById);
router.get('/employee/:employeeId', getDocumentsByEmployee);
router.get('/request/:requestId', getDocumentsByRequest);
router.post('/', createDocument);
router.put('/:id', updateDocument);
router.delete('/:id', deleteDocument);

module.exports = router;