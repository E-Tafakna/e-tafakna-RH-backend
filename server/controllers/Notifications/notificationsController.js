const pool = require('../../database/index');

const getAllNotifications = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT n.*, e.full_name as creator_name
      FROM notifications n
      JOIN employees e ON n.created_by = e.id
      ORDER BY n.created_at DESC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getNotificationById = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT n.*, e.full_name as creator_name
      FROM notifications n
      JOIN employees e ON n.created_by = e.id
      WHERE n.id = ?
    `, [req.params.id]);
    
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Notification not found' });
    }
    
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getNotificationsByCreator = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT n.*, e.full_name as creator_name
      FROM notifications n
      JOIN employees e ON n.created_by = e.id
      WHERE n.created_by = ?
      ORDER BY n.created_at DESC
    `, [req.params.creatorId]);
    
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const createNotification = async (req, res) => {
  try {
    const { title, message, created_by } = req.body;

    if (!title || !message || !created_by) {
      return res.status(400).json({ 
        message: 'Required fields: title, message, created_by' 
      });
    }

    // Verify that the creator exists
    const [employeeCheck] = await pool.query(
      'SELECT id FROM employees WHERE id = ?',
      [created_by]
    );

    if (employeeCheck.length === 0) {
      return res.status(400).json({ 
        message: 'Employee (created_by) not found' 
      });
    }

    const [result] = await pool.query(
      `INSERT INTO notifications (title, message, created_by)
       VALUES (?, ?, ?)`,
      [title, message, created_by]
    );

    res.status(201).json({ 
      id: result.insertId, 
      message: 'Notification created successfully' 
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const updateNotification = async (req, res) => {
  try {
    const { title, message } = req.body;
    const { id } = req.params;

    const [result] = await pool.query(
      `UPDATE notifications 
       SET title = ?, message = ?
       WHERE id = ?`,
      [title, message, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    res.json({ message: 'Notification updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const deleteNotification = async (req, res) => {
  try {
    const [result] = await pool.query(
      'DELETE FROM notifications WHERE id = ?',
      [req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    res.json({ message: 'Notification deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getRecentNotifications = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const [rows] = await pool.query(`
      SELECT n.*, e.full_name as creator_name
      FROM notifications n
      JOIN employees e ON n.created_by = e.id
      ORDER BY n.created_at DESC
      LIMIT ?
    `, [limit]);
    
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getNotificationStats = async (req, res) => {
  try {
    const [stats] = await pool.query(`
      SELECT 
        COUNT(*) as total_notifications,
        COUNT(DISTINCT created_by) as total_creators,
        DATE_FORMAT(MIN(created_at), '%Y-%m-%d') as first_notification_date,
        DATE_FORMAT(MAX(created_at), '%Y-%m-%d') as last_notification_date,
        COUNT(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR) THEN 1 END) as notifications_last_24h
      FROM notifications
    `);
    
    res.json(stats[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  getAllNotifications,
  getNotificationById,
  getNotificationsByCreator,
  createNotification,
  updateNotification,
  deleteNotification,
  getRecentNotifications,
  getNotificationStats
}; 