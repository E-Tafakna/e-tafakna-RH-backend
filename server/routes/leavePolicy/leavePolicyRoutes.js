const express = require('express');
const router = express.Router();
const {
  getAllLeavePolicies,
  getLeavePolicyById,
  createLeavePolicy,
  updateLeavePolicy,
  deleteLeavePolicy,
  checkLeaveEligibility,
  getEmployeeLeaveBalance
} = require('../../controllers/leavePolicy/leavePolicyController');

// Get all leave policies for a specific company
router.get('/company/:companyId', getAllLeavePolicies);

// Create new leave policy for a specific company
router.post('/company/:companyId', createLeavePolicy);

// Get leave policy by ID
router.get('/:id', getLeavePolicyById);

// Update leave policy by ID
router.put('/:id', updateLeavePolicy);

// Delete leave policy by ID
router.delete('/:id', deleteLeavePolicy);

// Check leave eligibility
router.post('/check-eligibility', checkLeaveEligibility);

// Get employee leave balance
router.get('/employee-balance/:employeeId', getEmployeeLeaveBalance);

module.exports = router;