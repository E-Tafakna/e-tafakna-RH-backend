const express = require('express');
const router = express.Router();
const companyController = require('../../controllers/company/companyController');

// Get all companies
router.get('/', companyController.getAllCompanies);

// Get company by ID
router.get('/:id', companyController.getCompanyById);

// Create new company
router.post('/', companyController.createCompany);

// Update company
router.put('/:id', companyController.updateCompany);

// Delete company
router.delete('/:id', companyController.deleteCompany);

// Get company statistics
router.get('/stats/overview', companyController.getCompanyStats);

module.exports = router; 