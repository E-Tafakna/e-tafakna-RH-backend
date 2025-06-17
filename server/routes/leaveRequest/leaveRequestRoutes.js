const express = require('express');
const router = express.Router();
const {
  getAllLeaveRequests,
  getLeaveRequestById,
  createLeaveRequest,
  getEmployeeLeaveRequests,
  getLeaveRequestStats
} = require('../../controllers/leaveRequest/leaveRequestController');

// Get all leave requests
router.get('/', getAllLeaveRequests);

// Get leave request by ID
router.get('/:id', getLeaveRequestById);

// Create new leave request
router.post('/', createLeaveRequest);

// Get leave requests for specific employee
router.get('/employee/:employee_id', getEmployeeLeaveRequests);

// Get leave request statistics
router.get('/stats/overview', getLeaveRequestStats);

module.exports = router; 