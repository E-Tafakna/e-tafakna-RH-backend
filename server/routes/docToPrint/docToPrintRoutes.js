const express = require('express');
const router = express.Router();
const {
  getAllDocsToPrint,
  getDocToPrintById,
  createDocToPrint,
  updateDocToPrint,
  deleteDocToPrint
} = require('../../controllers/docToPrint/docToPrintController');

router.get('/', getAllDocsToPrint);

router.get('/:id', getDocToPrintById);

router.post('/', createDocToPrint);

router.put('/:id', updateDocToPrint);

router.delete('/delete/:id', deleteDocToPrint);



module.exports = router; 