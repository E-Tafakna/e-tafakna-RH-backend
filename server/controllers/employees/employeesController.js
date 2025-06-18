const pool = require('../../database/index');

const getAllEmployees = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM employees');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getEmployeeById = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM employees WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Employee not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const createEmployee = async (req, res) => {
  try {
    const {
      code_employe,
      full_name,
      cin,
      cin_place,
      cin_date,
      place_of_birth,
      date_of_birth,
      gender,
      address,
      nfc_badge_id,
      email,
      phone,
      profession,
      brut_salary,
      net_salary,
      work_experience,
      date_of_start,
      is_active,
      cnss_number,
      nationality,
      marital_status,
      employment_type,
      contract_type,
      role,
      seniority_in_months
    } = req.body;

    const [result] = await pool.query(
      `INSERT INTO employees (
        code_employe, full_name, cin, cin_place, cin_date, place_of_birth, 
        date_of_birth, gender, address, nfc_badge_id, email, phone, 
        profession, brut_salary, net_salary, work_experience, date_of_start, 
        is_active, cnss_number, nationality, marital_status, employment_type,seniority_in_months, 
        contract_type, role
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,?)`,
      [
        code_employe,
        full_name,
        cin,
        cin_place,
        cin_date,
        place_of_birth,
        date_of_birth,
        gender,
        address,
        nfc_badge_id,
        email,
        phone,
        profession,
        brut_salary,
        net_salary,
        work_experience || 0,
        date_of_start,
        is_active !== undefined ? is_active : true,
        cnss_number,
        nationality,
        marital_status,
        employment_type || 'full_time',
        seniority_in_months,
        contract_type,
        role || 'employee',
       
      ]
    );

    res.status(201).json({
      id: result.insertId,
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
      code_employe,
      full_name,
      cin,
      cin_place,
      cin_date,
      place_of_birth,
      date_of_birth,
      gender,
      address,
      nfc_badge_id,
      email,
      phone,
      profession,
      brut_salary,
      net_salary,
      work_experience,
      date_of_start,
      is_active,
      cnss_number,
      nationality,
      marital_status,
      employment_type,
      contract_type,
      role,
      seniority_in_months
    } = req.body;

    const [result] = await pool.query(
      `UPDATE employees SET 
        code_employe = ?, full_name = ?, cin = ?, cin_place = ?, cin_date = ?, 
        place_of_birth = ?, date_of_birth = ?, gender = ?, address = ?, 
        nfc_badge_id = ?, email = ?, phone = ?, profession = ?, brut_salary = ?, 
        net_salary = ?, work_experience = ?, date_of_start = ?, is_active = ?, 
        cnss_number = ?, nationality = ?, marital_status = ?, employment_type = ?, seniority_in_months = ?,
        contract_type = ?, role = ?
       WHERE id = ?`,
      [
        code_employe,
        full_name,
        cin,
        cin_place,
        cin_date,
        place_of_birth,
        date_of_birth,
        gender,
        address,
        nfc_badge_id,
        email,
        phone,
        profession,
        brut_salary,
        net_salary,
        work_experience,
        date_of_start,
        is_active,
        cnss_number,
        nationality,
        marital_status,
        employment_type,
        seniority_in_months,
        contract_type,
        role,
        id,
      
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    res.json({ message: 'Employee updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const deleteEmployee = async (req, res) => {
  try {
    const [result] = await pool.query('DELETE FROM employees WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Employee not found' });
    res.json({ message: 'Employee deleted' });
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
};