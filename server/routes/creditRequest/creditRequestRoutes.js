const express = require('express');
const router = express.Router();
const {
  getAllCreditRequests,
  getCreditRequestById,
  createCreditRequest,
  getEmployeeCreditRequests,
  getHierarchicalCreditRequests,
  getCreditRequestStats
} = require('../../controllers/creditRequest/creditRequestController');

// Get all credit requests
router.get('/', getAllCreditRequests);

// Get credit request by ID
router.get('/:id', getCreditRequestById);

// Create new credit request
router.post('/', createCreditRequest);

// Get credit requests for specific employee
router.get('/employee/:employee_id', getEmployeeCreditRequests);

// Get credit request statistics
router.get('/stats/overview', getCreditRequestStats);

router.get('/hierarchy/:employee_id', getHierarchicalCreditRequests);


module.exports = router; 