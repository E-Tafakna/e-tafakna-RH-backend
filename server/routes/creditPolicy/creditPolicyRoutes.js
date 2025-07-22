const express = require('express');
const router = express.Router();
const {
  getAllCreditPolicies,
  getCreditPolicyById,
  createCreditPolicy,
  updateCreditPolicy,
  deleteCreditPolicy,
  getDepartments
} = require('../../controllers/creditPolicy/creditPolicyController');

// Get departments for a specific company
router.get('/departments/:companyId', getDepartments);

// Get all credit policies for a specific company
router.get('/company/:companyId', getAllCreditPolicies);

// Create new credit policy for a specific company
router.post('/company/:companyId', createCreditPolicy);

// Get credit policy by ID
router.get('/:id', getCreditPolicyById);

// Update credit policy by ID
router.put('/:id', updateCreditPolicy);

// Delete credit policy by ID
router.delete('/:id', deleteCreditPolicy);

module.exports = router;
