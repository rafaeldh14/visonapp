const express = require('express');
const app = express();
const port = 3000;

// Middleware para parsear las solicitudes con cuerpo JSON y URL codificada
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use('/public', express.static('public'));//para poder importar imagenes


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
});

app.get('/servicio', (req, res) => {
    res.render('servicio', {
        logb: false,
        name: 'Debe iniciar sesión'
    });
});



app.get('/nuestros_servicios', (req, res) => {
    res.render('nuestros_servicios', {
        logb: false,
        name: 'Debe iniciar sesión'
    });
});

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

// Ruta para agregar parques
app.post('/agregar-parque', async (req, res) => {
    try {
        const { nombre_parque, direccion_parque, telefono_parque, eficiencia_parque, area_parque, capacidad_parque, ob_parque } = req.body;
        const nit_user_parque = req.session.nit;

        const insertParqueQuery = 'INSERT INTO parques (nit_user_parque, nombre_parque, direccion_parque, telefono_parque, eficiencia_parque, area_parque, capacidad_parque, ob_parque) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';
        await queryDatabase(insertParqueQuery, [nit_user_parque, nombre_parque, direccion_parque, telefono_parque, eficiencia_parque, area_parque, capacidad_parque, ob_parque]);

        res.redirect('/parque');
    } catch (error) {
        console.error("Error al agregar parque:", error);
        res.status(500).send("Error en el servidor");
    }
});

//----------------------Tabla de los parques--------------------------------------
app.get('/parque', async (req, res) => {
    try {
        const nit_user_parque = req.session.nit;
        const getParquesQuery = "SELECT * FROM parques WHERE nit_user_parque = ?";
        const parques = await queryDatabase(getParquesQuery, [nit_user_parque]); // respuesta de la base de datos que se guarda en parques

        res.render('parque', { parques });

    } catch (error) {
        console.error("Error al recuperar parques:", error);
        res.status(500).send("Error en el servidor");
    }
});

//---------------------------------Rutas de parque---------------------------------

// Función para obtener los eventos asociados a un parque específico

async function obtenerEventosDelParque(id_del_parque, nit_user_evento) {
    try {
        // Construir la consulta SQL para obtener los eventos del parque
        //const getEventosQuery = 'SELECT * FROM evento WHERE id_parque_evento = ?';
        const getEventosQuery = 'SELECT * FROM evento WHERE id_parque_evento = ? AND nit_user_evento = ?';

        // Ejecutar la consulta SQL
        const eventos = await queryDatabase(getEventosQuery, [id_del_parque, nit_user_evento]);

        // Devolver los eventos obtenidos
        return eventos;
    } catch (error) {
        throw error;
    }
}
//-------------------------------------------------------------------------

let eventosMaster = [];
// Endpoint GET para mostrar la página de eventos del parque
app.get('/eventos-parque/:id_parque', async (req, res) => {

    try {
        let id_del_parque = req.params.id_parque;
        const nit_user_evento = req.session.nit;
        console.log(id_del_parque);
        console.log(nit_user_evento);


        // Verificar si id_del_parque está disponible; si no, buscar en la sesión
        if (!id_del_parque && req.session.id_del_parque) {
            id_del_parque = req.session.id_del_parque;

        } else if (!id_del_parque) {
            // Si no hay id_del_parque ni en la URL ni en la sesión, manejar el error
            return res.status(400).send("ID del parque es requerido.");
        }

        const eventos = await obtenerEventosDelParque(id_del_parque, nit_user_evento);

        // Opcional: Limpieza de id_del_parque en la sesión después de usarlo
        // delete req.session.id_del_parque;

        res.render('eventos_parque', {
            eventos: eventos,
            id_del_parque: id_del_parque
        });

        eventosMaster = res.eventos;

    } catch (error) {

        console.error("Error al obtener los eventos del parque:", error);
        res.status(500).send("Error en el servidor");

    }

});
//-------------------------------------------------------------------------

// Ruta para agregar un nuevo evento

app.post('/agregar-evento', async (req, res) => {
    try {
        // Obtener el id del parque del cuerpo de la solicitud
        const id_parque_evento = req.body.id_parque_evento;

        // Almacenar id_del_parque en la sesión para su uso posterior
        req.session.id_del_parque = id_parque_evento;

        // Obtener el nit del usuario logueado desde la sesión
        const nit_user_evento = req.session.nit;

        // Obtener otros datos del formulario de la solicitud
        const { piloto_evento, testigo_evento, cantpanel_evento, vueloini_evento, vuelofin_evento, ob_evento, tipopanel_evento } = req.body;

        // Construir la consulta SQL para insertar un nuevo evento
        const insertEventoQuery = 'INSERT INTO evento (id_parque_evento, nit_user_evento, piloto_evento, testigo_evento, cantpanel_evento, vueloini_evento, vuelofin_evento, ob_evento, tipopanel_evento) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)';

        // Ejecutar la consulta SQL
        await queryDatabase(insertEventoQuery, [id_parque_evento, nit_user_evento, piloto_evento, testigo_evento, cantpanel_evento, vueloini_evento, vuelofin_evento, ob_evento, tipopanel_evento]);

        // Redirigir a la página de eventos del parque específico después de agregar el evento
        // Usando el id_del_parque almacenado en la sesión para asegurar la consistencia
        res.redirect(`/eventos-parque/${req.session.id_del_parque}`);
    } catch (error) {
        // Manejo de errores
        console.error("Error al agregar evento:", error);
        res.status(500).send("Error en el servidor");
    }
});
//-------------------------------------------------------------------------

// Ruta para mostrar eventos del parque
app.get('/eventos-parque', async (req, res) => {
    try {
        // Aquí debes recuperar los eventos del parque y renderizar la página eventos_parque.ejs
        const nit_user_evento = req.session.nit;
        console.log(nit_user_evento);
        const getEventosQuery = "SELECT * FROM evento WHERE nit_user_evento = ?";
        const eventos = await queryDatabase(getEventosQuery, [nit_user_evento]);

        res.render('eventos_parque', { eventos });
        console.log(eventos);
    } catch (error) {
        console.error("Error al recuperar eventos del parque:", error);
        res.status(500).send("Error en el servidor");
    }
});
//-------------------------------------------------------------------------

// Iniciar el servidor
app.listen(port, () => {
    console.log(`Servidor corriendo en http://localhost:${port}`);
});

//-------------------------------------------------------------------------

// Ruta para filtrar eventos
app.get('/filtrar-eventos', async (req, res) => {

    try {
        // Aquí debes recuperar los eventos del parque y renderizar la página eventos_parque.ejs
        const { filtro_id, filtro_fecha } = req.body;
        console.log(filtro_id);

        const nit_user_evento = req.session.nit;

        const getEventosQuery = "SELECT * FROM evento WHERE id_evento = ?";
        const eventos = await queryDatabase(getEventosQuery, [filtro_id]);

        res.render('eventos_parque', { eventos });
        console.log(eventos);
    } catch (error) {
        console.error("Error al recuperar eventos del parque:", error);
        res.status(500).send("Error en el servidor");
    }
});
