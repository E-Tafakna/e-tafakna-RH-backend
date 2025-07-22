const express = require('express');
const {
  getAllEmployees,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  getManagers,
  getEmployeeByCode,
  checkEmployeeCodeExists,
  getCEOs,
  getEmployeeHierarchy
} = require('../../controllers/employees/employeesController');

const router = express.Router();

router.get('/', getAllEmployees);
router.get('/ceos', getCEOs); 
router.get('/hierarchy', getEmployeeHierarchy); 
router.get('/managers', getManagers); 
router.get('/check-code', checkEmployeeCodeExists);
router.get('/:id', getEmployeeById);
router.post('/', createEmployee);
router.put('/:id', updateEmployee);
router.get('/code/:code_employe', getEmployeeByCode);
router.delete('/:id', deleteEmployee);


module.exports = router;
