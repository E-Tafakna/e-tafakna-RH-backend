const pool = require('../../database/index');

const getAllLeaveRequests = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        r.*,
        lrd.start_date,
        lrd.end_date,
        lrd.leave_type,
        lrd.reason,
        e.full_name as employee_name,
        e.code_employe
      FROM requests r
      JOIN leave_request_details lrd ON r.id = lrd.request_id
      JOIN employees e ON r.employee_id = e.id
      WHERE r.type = 'leave'
      ORDER BY r.submission_date DESC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getLeaveRequestById = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        r.*,
        lrd.start_date,
        lrd.end_date,
        lrd.leave_type,
        lrd.reason,
        e.full_name as employee_name,
        e.code_employe
      FROM requests r
      JOIN leave_request_details lrd ON r.id = lrd.request_id
      JOIN employees e ON r.employee_id = e.id
      WHERE r.id = ? AND r.type = 'leave'
    `, [req.params.id]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Leave request not found' });
    }
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const createLeaveRequest = async (req, res) => {
  try {
    const {
      employee_id,
      start_date,
      end_date,
      leave_type,
      reason,
      service,
      company_id,
      is_exceptional = false // default is false
    } = req.body;

    if (!employee_id || !start_date || !end_date || !leave_type) {
      return res.status(400).json({
        error: 'Required fields: employee_id, start_date, end_date, leave_type'
      });
    }

    const [employeeResult] = await pool.query(
      'SELECT id, seniority_in_months FROM employees WHERE id = ?',
      [employee_id]
    );

    if (employeeResult.length === 0) {
      return res.status(400).json({ error: 'Employee not found' });
    }

    const employeeSeniority = employeeResult[0].seniority_in_months || 0;

    const startDate = new Date(start_date);
    const endDate = new Date(end_date);

    const [leavePolicyResult] = await pool.query(
      'SELECT * FROM leave_policy WHERE company_id = ?',
      [company_id]
    );

    if (!leavePolicyResult.length) {
      return res.status(400).json({
        error: 'No leave policy found for this company'
      });
    }

    const leavePolicy = leavePolicyResult[0];

    if (!is_exceptional) {
      if (startDate > endDate) {
        return res.status(400).json({ error: 'Start date must be before end date' });
      }

      if (startDate < new Date()) {
        return res.status(400).json({ error: 'Start date cannot be in the past' });
      }

      if (
        leavePolicy.min_months_seniority !== null &&
        employeeSeniority < leavePolicy.min_months_seniority
      ) {
        return res.status(400).json({
          error: `Employee must have at least ${leavePolicy.min_months_seniority} months of seniority`
        });
      }

      const [overlapping] = await pool.query(`
        SELECT r.id
        FROM requests r
        JOIN leave_request_details lrd ON r.id = lrd.request_id
        WHERE r.employee_id = ?
        AND r.type = 'leave'
        AND r.status != 'refused'
        AND (
          (lrd.start_date <= ? AND lrd.end_date >= ?)
          OR (lrd.start_date <= ? AND lrd.end_date >= ?)
          OR (lrd.start_date >= ? AND lrd.end_date <= ?)
        )
      `, [
        employee_id,
        start_date, start_date,
        end_date, end_date,
        start_date, end_date
      ]);

      if (overlapping.length > 0) {
        return res.status(400).json({
          error: 'Leave request overlaps with existing approved or pending leave'
        });
      }

      const duration = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;

      const [leaveBalance] = await pool.query(`
        SELECT 
          COALESCE(SUM(
            CASE 
              WHEN lrd.leave_type = ? AND r.status = 'traite' AND r.result = 'valide'
              THEN DATEDIFF(lrd.end_date, lrd.start_date) + 1
              ELSE 0
            END
          ), 0) as used_days
        FROM requests r
        JOIN leave_request_details lrd ON r.id = lrd.request_id
        WHERE r.employee_id = ?
        AND YEAR(lrd.start_date) = YEAR(?)
      `, [leave_type, employee_id, start_date]);

      const usedDays = leaveBalance[0].used_days || 0;

      if (usedDays + duration > leavePolicy.max_days_per_year) {
        return res.status(400).json({
          error: `Leave request exceeds available balance. You have used ${usedDays} days. Max allowed is ${leavePolicy.max_days_per_year}.`
        });
      }
    }

    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      const [requestResult] = await connection.query(
        `INSERT INTO requests (
          employee_id, type, service, status, result
        ) VALUES (?, 'leave', ?, 'en_cours', 'refused')`,
        [employee_id, service]
      );

      const requestId = requestResult.insertId;

      await connection.query(
        `INSERT INTO leave_request_details (
          request_id, start_date, end_date, leave_type, reason
        ) VALUES (?, ?, ?, ?, ?)`,
        [requestId, start_date, end_date, leave_type, reason]
      );

      await connection.commit();
      res.status(201).json({
        id: requestId,
        message: 'Leave request created successfully'
      });
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};



const getEmployeeLeaveRequests = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        r.*,
        lrd.start_date,
        lrd.end_date,
        lrd.leave_type,
        lrd.reason
      FROM requests r
      JOIN leave_request_details lrd ON r.id = lrd.request_id
      WHERE r.employee_id = ? AND r.type = 'leave'
      ORDER BY r.submission_date DESC
    `, [req.params.employee_id]);

    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getLeaveRequestStats = async (req, res) => {
  try {
    const [stats] = await pool.query(`
      SELECT 
        COUNT(*) as total_requests,
        COUNT(CASE WHEN r.status = 'en_cours' THEN 1 END) as pending_requests,
        COUNT(CASE WHEN r.status = 'traite' AND r.result = 'valide' THEN 1 END) as approved_requests,
        COUNT(CASE WHEN r.status = 'traite' AND r.result = 'refused' THEN 1 END) as rejected_requests,
        lrd.leave_type,
        SUM(CASE WHEN r.status = 'traite' AND r.result = 'valide' 
          THEN DATEDIFF(lrd.end_date, lrd.start_date) + 1 
          ELSE 0 
        END) as total_days_approved
      FROM requests r
      JOIN leave_request_details lrd ON r.id = lrd.request_id
      WHERE r.type = 'leave'
      GROUP BY lrd.leave_type
    `);

    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  getAllLeaveRequests,
  getLeaveRequestById,
  createLeaveRequest,
  getEmployeeLeaveRequests,
  getLeaveRequestStats
}; 