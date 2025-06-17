const express = require('express');
const router = express.Router();
const leavePolicyController = require('../../controllers/leavePolicy/leavePolicyController');

// Get all leave policies
router.get('/', leavePolicyController.getAllLeavePolicies);

// Get leave policy by ID
router.get('/:id', leavePolicyController.getLeavePolicyById);

// Create new leave policy
router.post('/', leavePolicyController.createLeavePolicy);

// Update leave policy
router.put('/:id', leavePolicyController.updateLeavePolicy);

// Delete leave policy
router.delete('/:id', leavePolicyController.deleteLeavePolicy);

// Get employee leave balance
router.get('/employee/:employee_id/balance', leavePolicyController.getEmployeeLeaveBalance);

module.exports = router; 