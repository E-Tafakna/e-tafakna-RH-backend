const express = require('express');
const router = express.Router();
const {
  getAllAdvancePolicies,
  getAdvancePolicyById,
  createAdvancePolicy,
  updateAdvancePolicy,
  deleteAdvancePolicy,
  getDepartments,
  checkAdvanceEligibility
} = require('../../controllers/advancePolicy/advancePolicyController');

// Get departments for a specific company
router.get('/departments/:companyId', getDepartments);

// Get all advance policies for a specific company
router.get('/company/:companyId', getAllAdvancePolicies);

// Create new advance policy for a specific company
router.post('/company/:companyId', createAdvancePolicy);

// Get advance policy by ID
router.get('/:id', getAdvancePolicyById);

// Update advance policy by ID
router.put('/:id', updateAdvancePolicy);

// Delete advance policy by ID
router.delete('/:id', deleteAdvancePolicy);

// Check eligibility
router.post('/check-eligibility', checkAdvanceEligibility);



module.exports = router;
