const express = require('express');
const app = express();
const port = 3000;

// Middleware para parsear las solicitudes con cuerpo JSON y URL codificada
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

const dotenv = require('dotenv');
dotenv.config({ path: './env/.env' });

// Middleware para servir archivos estáticos desde la carpeta 'public'
app.use('/resources', express.static(__dirname + '/public'));

// Configuración del motor de vistas EJS
app.set('view engine', 'ejs');

const bcryptjs = require('bcrypt');

// Middleware de sesión
const session = require('express-session');
app.use(session({
    secret: 'secret',
    resave: true,
    saveUninitialized: true
}));

// Conexión a la base de datos
const connection = require('./database/db');


// Ruta de inicio de sesión
app.get('/login', (req, res) => {
    res.render('login', {
        logb: false,
        name: 'Debe iniciar sesión'
    });
});

// Ruta de registro de usuario
app.get('/register', (req, res) => {
    res.render('register', {
        logb: false,
        name: 'Debe iniciar sesión'
    });
});

app.get('/chat', (req, res) => {
    res.render('chat', {
        logb: false,
        name: 'Debe iniciar sesión'
    });
}
);

app.get('/servicio', (req, res) => {
    res.render('servicio', {
        logb: false,
        name: 'Debe iniciar sesión'
    });
}
);

// Controlador de registro de usuario
app.post('/register', async (req, res) => {
    try {
        const { nit, razonsocial, direccion, telefono, email, pass, encargado } = req.body;
        const passHash = await bcryptjs.hash(pass, 8);

        const checkUserQuery = "SELECT * FROM user WHERE nit_user = ?";
        const existingUser = await queryDatabase(checkUserQuery, [nit]);

        if (existingUser.length > 0) {
            return res.render('register', {
                alert: true,
                alertTitle: "Registro",
                alertMessage: "¡El usuario ya existe!",
                alertIcon: "error",
                showConfirmButton: true,
                timer: null,
                ruta: ''
            });
        }

        const insertUserQuery = 'INSERT INTO user SET ?';
        await queryDatabase(insertUserQuery, { nit_user: nit, razonsocial_user: razonsocial, direccion_user: direccion, telefono_user: telefono, email_user: email, pass_user: passHash, encargado_user: encargado });

        res.render('register', {
            alert: true,
            alertTitle: "Registro",
            alertMessage: "¡Registro exitoso!",
            alertIcon: "success",
            showConfirmButton: false,
            timer: 1500,
            ruta: ''
        });
    } catch (error) {
        console.error("Error en el registro:", error);
        res.status(500).send("Error en el servidor");
    }
});

// Función para realizar consultas a la base de datos
async function queryDatabase(sqlQuery, values) {
    return new Promise((resolve, reject) => {
        connection.query(sqlQuery, values, (err, rows) => {
            if (err) {
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
}

// Iniciar el servidor
app.listen(port, () => {
    console.log(`Servidor corriendo en http://localhost:${port}`);
});

// Ruta de inicio de sesión
app.post('/auth', async (req, res) => {
    try {
        const { nit, pass } = req.body;
        let passHash = await bcryptjs.hash(pass, 8);

        const checkUserQuery = "SELECT * FROM user WHERE nit_user = ?";
        const user = await queryDatabase(checkUserQuery, [nit]);

        if (user.length === 0 || !(await bcryptjs.compare(pass, user[0].pass_user))) {
            res.render('login', {
                alert: true,
                alertTitle: "Error",
                alertMessage: "¡Usuario y/o contraseña incorrectos!",
                alertIcon: "error",
                showConfirmButton: true,
                timer: null,
                ruta: 'login'
            });
        } else {
            req.session.loggedin = true;
            req.session.nit = nit;
            req.session.razonsocial = user[0].razonsocial_user;
            res.render('login', {
                alert: true,
                alertTitle: "Conexión",
                alertMessage: "¡Conexión exitosa!",
                alertIcon: "success",
                showConfirmButton: false,
                timer: 1500,
                ruta: ''
            });
        }
    } catch (error) {
        console.error("Error en la autenticación:", error);
        res.status(500).send("Error en el servidor");
    }
});

// autenticación de usuario
app.get('/', (req, res) => {
    if (req.session.loggedin) {
        res.render('index', {
            logb: true,
            name: req.session.razonsocial
        });
    } else {
        res.render('index', {
            logb: false,
            name: 'Debe iniciar sesión'
        });
    }
});

// Cerrar sesión
app.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/');
    });
});