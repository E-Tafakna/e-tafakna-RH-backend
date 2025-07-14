const pool = require('../../database/index');

const getAllEmployees = async (req, res) => {
  try {
    const [employees] = await pool.query(`SELECT * FROM employees`);

    for (let employee of employees) {
      const [ceos] = await pool.query(`
        SELECT e.id, e.full_name
        FROM employee_ceos ec
        JOIN employees e ON ec.ceo_id = e.id
        WHERE ec.employee_id = ?
      `, [employee.id]);

      const [managers] = await pool.query(`
        SELECT e.id, e.full_name
        FROM employee_managers em
        JOIN employees e ON em.manager_id = e.id
        WHERE em.employee_id = ?
      `, [employee.id]);

      employee.ceos = ceos;
      employee.managers = managers;
    }

    res.json(employees);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getEmployeeById = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM employees WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Employee not found' });

    const employee = rows[0];

    const [ceos] = await pool.query(`
      SELECT e.id, e.full_name
      FROM employee_ceos ec
      JOIN employees e ON ec.ceo_id = e.id
      WHERE ec.employee_id = ?
    `, [employee.id]);

    const [managers] = await pool.query(`
      SELECT e.id, e.full_name
      FROM employee_managers em
      JOIN employees e ON em.manager_id = e.id
      WHERE em.employee_id = ?
    `, [employee.id]);

    employee.ceos = ceos;
    employee.managers = managers;

    res.json(employee);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getManagers = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT id, full_name, profession 
      FROM employees 
      WHERE profession LIKE '%Manager%' 
      ORDER BY full_name
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getCEOs = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT id, full_name, profession 
      FROM employees 
      WHERE profession = 'CEO'
      ORDER BY full_name
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const createEmployee = async (req, res) => {
  try {
    let {
      code_employe,
      full_name,
      cin,
      cin_place,
      cin_date,
      place_of_birth,
      date_of_birth,
      gender,
      address,
      email,
      phone,
      profession,
      department,
      brut_salary,
      net_salary,
      date_of_start,
      cnss_number,
      nationality,
      marital_status,
      employment_type,
      contract_type,
      role,
      manager_ids = [],
      ceo_ids = []
    } = req.body;

    if (!Array.isArray(manager_ids)) manager_ids = manager_ids ? [manager_ids] : [];
    if (!Array.isArray(ceo_ids)) ceo_ids = ceo_ids ? [ceo_ids] : [];

    // Validation
    if (profession === 'CEO') {
      manager_ids = [];
      ceo_ids = [];
    } 
     if (profession.includes('Manager')) {
      manager_ids = [];
      
    } 

    // Insert employé
    const [result] = await pool.query(
      `INSERT INTO employees (
        code_employe, full_name, cin, cin_place, cin_date, place_of_birth, 
        date_of_birth, gender, address, email, phone, 
        profession, department, brut_salary, net_salary, date_of_start, 
        cnss_number, nationality, marital_status, 
        employment_type, contract_type, role
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        code_employe, full_name, cin, cin_place, cin_date, place_of_birth,
        date_of_birth, gender, address, email, phone,
        profession, department, brut_salary, net_salary, date_of_start,
        cnss_number, nationality, marital_status,
        employment_type || 'full_time', contract_type, role || 'employee'
      ]
    );

    const employeeId = result.insertId;

    // Insert relations
    for (const managerId of manager_ids) {
      await pool.query(
        'INSERT INTO employee_managers (employee_id, manager_id) VALUES (?, ?)',
        [employeeId, managerId]
      );
    }

    for (const ceoId of ceo_ids) {
      await pool.query(
        'INSERT INTO employee_ceos (employee_id, ceo_id) VALUES (?, ?)',
        [employeeId, ceoId]
      );
    }

    res.status(201).json({
      id: employeeId,
      message: 'Employee created successfully'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const updateEmployee = async (req, res) => {
  try {
    const id = req.params.id;
    const {
      code_employe, full_name, cin, cin_place, cin_date,
      place_of_birth, date_of_birth, gender, address, email, phone,
      profession, brut_salary, net_salary, date_of_start,
      cnss_number, nationality, marital_status,
      employment_type, contract_type, role,
      manager_ids = [], ceo_ids = []
    } = req.body;

    const [existingEmployee] = await pool.query('SELECT * FROM employees WHERE id = ?', [id]);
    if (existingEmployee.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    // Validation
    let managerList = Array.isArray(manager_ids) ? manager_ids : [manager_ids];
    let ceoList = Array.isArray(ceo_ids) ? ceo_ids : [ceo_ids];

    if (profession === 'CEO') {
      managerList = [];
      ceoList = [];
    } 
    if  (profession.includes('Manager')) {
      managerList = [];
      
    } 

    // Mise à jour employé
    await pool.query( 
      `UPDATE employees SET 
        code_employe = ?, full_name = ?, cin = ?, cin_place = ?, cin_date = ?, 
        place_of_birth = ?, date_of_birth = ?, gender = ?, address = ?, 
        email = ?, phone = ?, profession = ?, brut_salary = ?, 
        net_salary = ?, date_of_start = ?, cnss_number = ?, 
        nationality = ?, marital_status = ?, employment_type = ?,
        contract_type = ?, role = ?
       WHERE id = ?`,
      [
        code_employe, full_name, cin, cin_place, cin_date,
        place_of_birth, date_of_birth, gender, address,
        email, phone, profession, brut_salary,
        net_salary, date_of_start, cnss_number,
        nationality, marital_status, employment_type,
        contract_type, role, id
      ]
    );

    // Nettoyer les anciennes relations
    await pool.query('DELETE FROM employee_managers WHERE employee_id = ?', [id]);
    await pool.query('DELETE FROM employee_ceos WHERE employee_id = ?', [id]);

    // Réinsérer les relations
    for (const managerId of managerList) {
      await pool.query('INSERT INTO employee_managers (employee_id, manager_id) VALUES (?, ?)', [id, managerId]);
    }

    for (const ceoId of ceoList) {
      await pool.query('INSERT INTO employee_ceos (employee_id, ceo_id) VALUES (?, ?)', [id, ceoId]);
    }

    res.json({ message: 'Employee updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const deleteEmployee = async (req, res) => {
  try {
    const id = req.params.id;

    const [managed] = await pool.query('SELECT COUNT(*) as count FROM employee_managers WHERE manager_id = ?', [id]);
    const [ceod] = await pool.query('SELECT COUNT(*) as count FROM employee_ceos WHERE ceo_id = ?', [id]);

    if (managed[0].count > 0 || ceod[0].count > 0) {
      return res.status(400).json({
        error: 'Impossible de supprimer cet employé : il est encore manager ou CEO d’autres employés.'
      });
    }

    await pool.query('DELETE FROM employee_managers WHERE employee_id = ?', [id]);
    await pool.query('DELETE FROM employee_ceos WHERE employee_id = ?', [id]);
    const [result] = await pool.query('DELETE FROM employees WHERE id = ?', [id]);

    if (result.affectedRows === 0) return res.status(404).json({ error: 'Employé introuvable' });

    res.json({ message: 'Employé supprimé avec succès' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getEmployeeHierarchy = async (req, res) => {
  try {
    const [ceos] = await pool.query(`
      SELECT id, full_name, profession 
      FROM employees 
      WHERE profession = 'CEO'
    `);

    const hierarchy = await Promise.all(ceos.map(async ceo => {
      const [managerLinks] = await pool.query(`
        SELECT em.manager_id AS id
        FROM employee_managers em
        JOIN employees e ON em.manager_id = e.id
        WHERE em.employee_id IN (
          SELECT employee_id FROM employee_ceos WHERE ceo_id = ?
        )
        GROUP BY em.manager_id
      `, [ceo.id]);

      const managersWithEmployees = await Promise.all(managerLinks.map(async ({ id: managerId }) => {
        const [[manager]] = await pool.query(`SELECT * FROM employees WHERE id = ?`, [managerId]);

        const [employeeLinks] = await pool.query(`
          SELECT employee_id FROM employee_managers WHERE manager_id = ?
        `, [managerId]);

        const employees = await Promise.all(employeeLinks.map(async ({ employee_id }) => {
          const [[emp]] = await pool.query(`SELECT * FROM employees WHERE id = ?`, [employee_id]);
          return emp;
        }));

        return { ...manager, employees };
      }));

      const [directEmployeesLinks] = await pool.query(`
        SELECT employee_id FROM employee_ceos WHERE ceo_id = ?
      `, [ceo.id]);

      const directEmployees = await Promise.all(directEmployeesLinks.map(async ({ employee_id }) => {
        const [[emp]] = await pool.query(`SELECT * FROM employees WHERE id = ?`, [employee_id]);
        return emp;
      }));

      return {
        ...ceo,
        managers: managersWithEmployees,
        directEmployees
      };
    }));

    res.json(hierarchy);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  getAllEmployees,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  getManagers,
  getCEOs,
  getEmployeeHierarchy
};
