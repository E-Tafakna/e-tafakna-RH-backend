const express = require('express');
const router = express.Router();
const {
  getAllAdvanceRequests,
  getAdvanceRequestById,
  createAdvanceRequest,
  getEmployeeAdvanceRequests,
  getAdvanceRequestStats
} = require('../../controllers/advanceRequest/advanceRequestController');

// Get all advance requests
router.get('/', getAllAdvanceRequests);

// Get advance request by ID
router.get('/:id', getAdvanceRequestById);

// Create new advance request
router.post('/', createAdvanceRequest);

// Get advance requests for specific employee
router.get('/employee/:employee_id', getEmployeeAdvanceRequests);

// Get advance request statistics
router.get('/stats/overview', getAdvanceRequestStats);

module.exports = router; 