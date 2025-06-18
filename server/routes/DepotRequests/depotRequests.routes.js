const express = require('express');
const router = express.Router();
const {
  getAllDepotRequests,
  getDepotRequestById,
  getDepotRequestsByEmployee,
  createDepotRequest,
  updateDepotRequest,
  deleteDepotRequest,
  getDepotRequestStats
} = require('../../controllers/DepotRequests/depotRequestsController');

// Get all depot requests
router.get('/', getAllDepotRequests);

// Get depot request by ID
router.get('/:id', getDepotRequestById);

// Get depot requests by employee
router.get('/employee/:employeeId', getDepotRequestsByEmployee);

// Create new depot request
router.post('/', createDepotRequest);

// Update depot request
router.put('/:id', updateDepotRequest);

// Delete depot request
router.delete('/:id', deleteDepotRequest);

// Get depot request statistics
router.get('/stats/overview', getDepotRequestStats);

module.exports = router; 