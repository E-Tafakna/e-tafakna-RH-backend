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
        e.code_employe,
        e.department as employee_department,
        cd.department_name as policy_department
      FROM requests r
      JOIN leave_request_details lrd ON r.id = lrd.request_id
      JOIN employees e ON r.employee_id = e.id
      LEFT JOIN leave_policy lp ON lrd.policy_id = lp.id
      LEFT JOIN company_departments cd ON lp.department_id = cd.id
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
        e.code_employe,
        e.department as employee_department,
        cd.department_name as policy_department
      FROM requests r
      JOIN leave_request_details lrd ON r.id = lrd.request_id
      JOIN employees e ON r.employee_id = e.id
      LEFT JOIN leave_policy lp ON lrd.policy_id = lp.id
      LEFT JOIN company_departments cd ON lp.department_id = cd.id
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
      is_exceptional = false,
      exception_reason = null
    } = req.body;

    if (!employee_id || !start_date || !end_date || !leave_type || !company_id) {
      return res.status(400).json({
        error: 'Required fields: employee_id, start_date, end_date, leave_type, company_id'
      });
    }

    const [employeeResult] = await pool.query(
      'SELECT id, seniority_in_months, department FROM employees WHERE id = ?',
      [employee_id]
    );

    if (employeeResult.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    const employee = employeeResult[0];
    const startDate = new Date(start_date);
    const endDate = new Date(end_date);

    const [leavePolicyResult] = await pool.query(`
      SELECT lp.*
      FROM leave_policy lp
      JOIN company_departments cd ON lp.department_id = cd.id
      WHERE lp.company_id = ? AND cd.department_name = ?
    `, [company_id, employee.department]);

    if (leavePolicyResult.length === 0) {
      return res.status(400).json({
        error: `No leave policy found for department ${employee.department}`
      });
    }

    const leavePolicy = leavePolicyResult[0];

    // Règles de validation si ce n'est pas une demande exceptionnelle
    if (!is_exceptional) {
      if (startDate > endDate) {
        return res.status(400).json({ error: 'Start date must be before end date' });
      }

      if (startDate < new Date()) {
        return res.status(400).json({ error: 'Start date cannot be in the past' });
      }

      if (
        leavePolicy.min_months_seniority !== null &&
        employee.seniority_in_months < leavePolicy.min_months_seniority
      ) {
        return res.status(400).json({
          error: `Employee must have at least ${leavePolicy.min_months_seniority} months of seniority`
        });
      }

      // Vérifie les chevauchements
      const [overlapping] = await pool.query(`
        SELECT r.id
        FROM requests r
        JOIN leave_request_details lrd ON r.id = lrd.request_id
        WHERE r.employee_id = ? AND r.type = 'leave' AND r.status != 'refused'
        AND (
          (lrd.start_date <= ? AND lrd.end_date >= ?)
          OR (lrd.start_date <= ? AND lrd.end_date >= ?)
          OR (lrd.start_date >= ? AND lrd.end_date <= ?)
        )
      `, [employee_id, start_date, start_date, end_date, end_date, start_date, end_date]);

      if (overlapping.length > 0) {
        return res.status(400).json({
          error: 'Leave request overlaps with existing approved or pending leave'
        });
      }

      // Vérifie le solde annuel
      const duration = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;

      const [leaveBalance] = await pool.query(`
        SELECT COALESCE(SUM(
          CASE 
            WHEN lrd.leave_type = ? AND r.status = 'traite' AND r.result = 'valide'
            THEN DATEDIFF(lrd.end_date, lrd.start_date) + 1 ELSE 0
          END), 0) as used_days
        FROM requests r
        JOIN leave_request_details lrd ON r.id = lrd.request_id
        WHERE r.employee_id = ? AND YEAR(lrd.start_date) = YEAR(?)
      `, [leave_type, employee_id, start_date]);

      const usedDays = leaveBalance[0].used_days || 0;
      if (usedDays + duration > leavePolicy.max_days_per_year) {
        return res.status(400).json({
          error: `Leave request exceeds available balance. Used: ${usedDays}, Max: ${leavePolicy.max_days_per_year}`
        });
      }
    }

    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      const [requestResult] = await connection.query(`
        INSERT INTO requests (
          employee_id, type, service, status, result, is_exceptional, exception_reason
        ) VALUES (?, 'leave', ?, 'en_cours', 'refused', ?, ?)
      `, [employee_id, service, is_exceptional, exception_reason]);

      const requestId = requestResult.insertId;

      await connection.query(`
        INSERT INTO leave_request_details (
          request_id, start_date, end_date, leave_type, reason, policy_id
        ) VALUES (?, ?, ?, ?, ?, ?)
      `, [requestId, start_date, end_date, leave_type, reason, leavePolicy.id]);

      await connection.commit();
      res.status(201).json({ id: requestId, message: 'Leave request created successfully' });

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
        lrd.reason,
        cd.department_name as policy_department
      FROM requests r
      JOIN leave_request_details lrd ON r.id = lrd.request_id
      LEFT JOIN leave_policy lp ON lrd.policy_id = lp.id
      LEFT JOIN company_departments cd ON lp.department_id = cd.id
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
        END) as total_days_approved,
        cd.department_name,
        COUNT(CASE WHEN cd.department_name IS NOT NULL THEN 1 END) as department_count
      FROM requests r
      JOIN leave_request_details lrd ON r.id = lrd.request_id
      LEFT JOIN leave_policy lp ON lrd.policy_id = lp.id
      LEFT JOIN company_departments cd ON lp.department_id = cd.id
      WHERE r.type = 'leave'
      GROUP BY lrd.leave_type, cd.department_name
    `);

    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getHierarchicalLeaveRequests = async (req, res) => {
  try {
    const employeeId = parseInt(req.params.employeeId);
    if (isNaN(employeeId)) {
      return res.status(400).json({ error: 'Invalid employee ID' });
    }

    // 1. Get employee's role and hierarchy
    const [employeeRows] = await pool.query('SELECT id, profession, role FROM employees WHERE id = ?', [employeeId]);
    if (employeeRows.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    const employee = employeeRows[0];
    let employeeIdsToQuery = [employeeId];

    // 2. Determine hierarchy based on role
    if (employee.profession === 'CEO' || employee.role === 'admin') {
      // CEO can see all requests under their hierarchy
      const [subordinates] = await pool.query(`
        WITH RECURSIVE hierarchy AS (
          SELECT id FROM employees WHERE id = ?
          UNION
          SELECT e.id FROM employees e
          JOIN employee_ceos ec ON e.id = ec.employee_id
          JOIN hierarchy h ON ec.ceo_id = h.id
          UNION
          SELECT e.id FROM employees e
          JOIN employee_managers em ON e.id = em.employee_id
          JOIN hierarchy h ON em.manager_id = h.id
        )
        SELECT id FROM hierarchy WHERE id != ?
      `, [employeeId, employeeId]);
      
      employeeIdsToQuery = subordinates.map(s => s.id);
      employeeIdsToQuery.push(employeeId); // Include CEO's own requests
    } else if (employee.profession.includes('Manager')) {
      // Manager can see their own requests and their direct reports' requests
      const [subordinates] = await pool.query(`
        SELECT employee_id as id FROM employee_managers 
        WHERE manager_id = ?
      `, [employeeId]);
      
      employeeIdsToQuery = subordinates.map(s => s.id);
      employeeIdsToQuery.push(employeeId); // Include manager's own requests
    }
    // Regular employees can only see their own requests (default)

    // 3. Fetch leave requests for all relevant employees
    const [rows] = await pool.query(`
      SELECT 
        r.*,
        lrd.start_date,
        lrd.end_date,
        lrd.leave_type,
        lrd.reason,
        e.full_name as employee_name,
        e.code_employe,
        e.department as employee_department,
        cd.department_name as policy_department
      FROM requests r
      JOIN leave_request_details lrd ON r.id = lrd.request_id
      JOIN employees e ON r.employee_id = e.id
      LEFT JOIN leave_policy lp ON lrd.policy_id = lp.id
      LEFT JOIN company_departments cd ON lp.department_id = cd.id
      WHERE r.type = 'leave' AND r.employee_id IN (?)
      ORDER BY r.submission_date DESC
    `, [employeeIdsToQuery]);
    
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
const getRemainingLeaveDays = async (req, res) => {
  try {
    const { employee_id, leave_type, company_id } = req.body;

    if (!employee_id || !leave_type || !company_id) {
      return res.status(400).json({
        error: 'Required fields: employee_id, leave_type, company_id'
      });
    }

    const [employeeResult] = await pool.query(
      'SELECT id FROM employees WHERE id = ?',
      [employee_id]
    );

    if (employeeResult.length === 0) {
      return res.status(400).json({ error: 'Employee not found' });
    }

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

    const start_date = new Date(); // use today's date like in your original logic
    const currentYear = new Date().getFullYear();
    const yearReferenceDate = new Date(`${currentYear}-01-01`);

    const [leaveBalance] = await pool.query(`
  SELECT 
    COALESCE(SUM(
      CASE 
        WHEN r.type = ? AND r.status = 'traite' AND r.result = 'valide'
        THEN DATEDIFF(lrd.end_date, lrd.start_date) + 1
        ELSE 0
      END
    ), 0) as used_days
  FROM requests r
  JOIN leave_request_details lrd ON r.id = lrd.request_id
  WHERE r.employee_id = ?
  AND YEAR(lrd.start_date) = YEAR(?)
`, [leave_type, employee_id, yearReferenceDate]);


    const usedDays = leaveBalance[0].used_days || 0;

    console.log(usedDays, leaveBalance, "usedDays")
    const remainingDays = leavePolicy.max_days_per_year - usedDays;

    return res.status(200).json({
      employee_id,
      leave_type,
      year: start_date.getFullYear(),
      used_days: usedDays,
      max_allowed: leavePolicy.max_days_per_year,
      remaining_days: Math.max(0, remainingDays)
    });
  } catch (err) {
    console.error('[getRemainingLeaveDays] error:', err);
    return res.status(500).json({ error: err.message });
  }
};

module.exports = {
  getAllLeaveRequests,
  getLeaveRequestById,
  createLeaveRequest,
  getEmployeeLeaveRequests,
  getLeaveRequestStats,
  getRemainingLeaveDays,
  getHierarchicalLeaveRequests
};