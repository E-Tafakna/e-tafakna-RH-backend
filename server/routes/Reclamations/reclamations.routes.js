const express = require('express');
const {
  getAllReclamations,
  getReclamationById,
  getReclamationsByEmployee,
  createReclamation,
  updateReclamation,
  deleteReclamation,
  getReclamationsByCategory,
  getConfidentialReclamations,
  getSensitiveReclamations,
} = require('../../controllers/Reclamations/reclamationsController');

const router = express.Router();

router.get('/', getAllReclamations);
router.get('/confidential', getConfidentialReclamations);
router.get('/sensitive', getSensitiveReclamations);
router.get('/:id', getReclamationById);
router.get('/employee/:employeeId', getReclamationsByEmployee);
router.get('/category/:category', getReclamationsByCategory);
router.post('/', createReclamation);
router.put('/:id', updateReclamation);
router.delete('/:id', deleteReclamation);

module.exports = router;