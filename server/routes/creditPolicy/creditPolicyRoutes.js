const express = require('express');
const router = express.Router();
const {
  getAllCreditPolicies,
  getCreditPolicyById,
  createCreditPolicy,
  updateCreditPolicy,
  deleteCreditPolicy
} = require('../../controllers/creditPolicy/creditPolicyController');

// Get all credit policies
router.get('/', getAllCreditPolicies);

// Get credit policy by ID
router.get('/:id', getCreditPolicyById);

// Create new credit policy
router.post('/', createCreditPolicy);

// Update credit policy
router.put('/:id', updateCreditPolicy);

// Delete credit policy
router.delete('/:id', deleteCreditPolicy);

module.exports = router; 