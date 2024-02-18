const mysql = require('mysql');

// Crear el pool de conexiones
const connection = mysql.createPool({
    connectionLimit: 10, // Número máximo de conexiones en el pool
    host: "srv1073.hstgr.io",
    user: "u994238429_visionapp",
    password: "r1f13lDJDH10128",
    database: "u994238429_vision"
});

module.exports = connection;
