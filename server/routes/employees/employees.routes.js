const express = require('express');
const {
  getAllEmployees,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  getManagers,
  getCEOs,
  getEmployeeHierarchy
} = require('../../controllers/employees/employeesController');

const router = express.Router();

router.get('/', getAllEmployees);
router.get('/ceos', getCEOs); 
router.get('/hierarchy', getEmployeeHierarchy); 
router.get('/managers', getManagers);          
router.get('/:id', getEmployeeById);
router.post('/', createEmployee);
router.put('/:id', updateEmployee);
router.delete('/:id', deleteEmployee);

module.exports = router;