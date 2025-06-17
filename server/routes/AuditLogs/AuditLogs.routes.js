const express = require('express');
const {
  getAllAuditLogs,
  getAuditLogById,
  getAuditLogsByEmployee,
  createAuditLog,
  deleteAuditLog,
  getAuditLogsByDateRange,
  getAuditLogsByAction,
} = require('../../controllers/AuditLogs/auditLogsController');

const router = express.Router();

router.get('/', getAllAuditLogs);
router.get('/date-range', getAuditLogsByDateRange);
router.get('/:id', getAuditLogById);
router.get('/employee/:employeeId', getAuditLogsByEmployee);
router.get('/action/:action', getAuditLogsByAction);
router.post('/', createAuditLog);
router.delete('/:id', deleteAuditLog);

module.exports = router;