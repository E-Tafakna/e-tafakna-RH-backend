const express = require('express');
const router = express.Router();
const {
  getAllNotifications,
  getNotificationById,
  getNotificationsByCreator,
  createNotification,
  updateNotification,
  deleteNotification,
  getRecentNotifications,
  getNotificationStats
} = require('../../controllers/Notifications/notificationsController');


router.get('/', getAllNotifications);


router.get('/:id', getNotificationById);

router.get('/creator/:creatorId', getNotificationsByCreator);

router.get('/recent', getRecentNotifications);

router.post('/', createNotification);

router.put('/:id', updateNotification);

router.delete('/:id', deleteNotification);

router.get('/stats/overview', getNotificationStats);

module.exports = router; 