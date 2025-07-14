var mysql = require("mysql2/promise");
const dotenv = require("dotenv");
dotenv.config();

var connection = mysql.createPool({
    connectionLimit: process.env.CONNECTIONLIMIT || 100,
    host: process.env.MYSQL_HOST || 3306,
    user: process.env.MYSQL_USER || "root",
    password: process.env.MYSQL_PASSWORD || "Root",
    database: process.env.MYSQL_DATABASE || "etafakna_rh",
    charset: 'utf8mb4', // Ensure UTF-8 encoding
    port: process.env.DB_PORT || 3306
});



connection.getConnection((err, success) => {
    if (err) {
        console.log(err);
    } else {
        console.log("Connected");
    }
});
module.exports = connection;






