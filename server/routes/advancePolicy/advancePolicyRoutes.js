const express = require('express');
const router = express.Router();
const advancePolicyController = require('../../controllers/advancePolicy/advancePolicyController');

// Get all advance policies
router.get('/', advancePolicyController.getAllAdvancePolicies);

// Get advance policy by ID
router.get('/:id', advancePolicyController.getAdvancePolicyById);

// Create new advance policy
router.post('/', advancePolicyController.createAdvancePolicy);

// Update advance policy
// router.put('/:id', advancePolicyController.updateAdvancePolicy);

// Delete advance policy
router.delete('/:id', advancePolicyController.deleteAdvancePolicy);

// Check advance eligibility
router.post('/check-eligibility', advancePolicyController.checkAdvanceEligibility);

module.exports = router; 