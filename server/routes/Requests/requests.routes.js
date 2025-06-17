const express = require('express');
const {
  getAllRequests,
  getRequestById,
  getRequestsByEmployee,
  createRequest,
  updateRequest,
  deleteRequest,
  getRequestsByType,
  getRequestsByStatus,
} = require('../../controllers/Requests/requestsController');

const router = express.Router();

router.get('/', getAllRequests);
router.get('/:id', getRequestById);
router.get('/employee/:employeeId', getRequestsByEmployee);
router.get('/type/:type', getRequestsByType);
router.get('/status/:status', getRequestsByStatus);
router.post('/', createRequest);
router.put('/:id', updateRequest);
router.delete('/:id', deleteRequest);

module.exports = router;