const express = require('express');
const router = express.Router();
const {
  getAllDocumentRequests,
  getDocumentRequestById,
  createDocumentRequest,
  getEmployeeDocumentRequests,
  getDocumentRequestStats
} = require('../../controllers/documentRequest/documentRequestController');

// Get all document requests
router.get('/', getAllDocumentRequests);

// Get document request by ID
router.get('/:id', getDocumentRequestById);

// Create new document request
router.post('/', createDocumentRequest);

// Get document requests for specific employee
router.get('/employee/:employee_id', getEmployeeDocumentRequests);

// Get document request statistics
router.get('/stats/overview', getDocumentRequestStats);

module.exports = router; 