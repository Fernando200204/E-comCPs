const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const multer = require('multer'); // <-- El cartero que recibe las fotos
const path = require('path');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');

const app = express();
app.use(cors());
app.use(express.json());

// Le decimos a Node que la carpeta 'uploads' es pública, para que el frontend pueda ver las fotos
app.use('/uploads', express.static('uploads'));

// Configuramos cómo y dónde guardará Multer las fotos
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/') // La carpeta que acabas de crear
    },
    filename: function (req, file, cb) {
        // Le ponemos la fecha exacta al nombre para que nunca haya dos fotos con el mismo nombre
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

const pool = new Pool({
    user: 'admin',
    host: 'localhost',
    database: 'tiendazapatos',
    password: 'password123',
    port: 5433,
});

// RUTA TEMPORAL PARA ACTUALIZAR LA BASE DE DATOS
app.get('/actualizar-bd', async (req, res) => {
    try {
        await pool.query(`ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS verificado BOOLEAN DEFAULT FALSE;`);
        await pool.query(`ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS codigo_verificacion VARCHAR(6);`);
        res.send('¡Base de datos lista para recibir códigos de correo!');
    } catch (error) {
        console.error(error);
        res.status(500).send('Error actualizando BD.');
    }
});

// Ruta para crear la tabla de usuarios si no existe
app.get('/crear-tabla-usuarios', async (request, response) => {
    try {
        await pool.query(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id SERIAL PRIMARY KEY,
        nombre VARCHAR(100) NOT NULL,
        correo VARCHAR(150) UNIQUE NOT NULL,
        password TEXT NOT NULL,
        rol VARCHAR(20) DEFAULT 'cliente' -- Puede ser 'cliente' o 'admin'
      );
    `);
        response.send('¡Tabla de usuarios creada con éxito en la base de datos!');
    } catch (error) {
        console.error(error);
        response.status(500).send('Hubo un error al crear la tabla de usuarios.');
    }
});

// RUTA TEMPORAL PARA CREAR UN ADMIN
app.get('/crear-admin-maestro', async (req, res) => {
    try {
        const salt = await bcrypt.genSalt(10);
        // Cambia el correo y la contraseña por los que prefieras para tu amigo
        const passwordHash = await bcrypt.hash('admin123', salt);

        await pool.query(`
      INSERT INTO usuarios (nombre, correo, password, rol) 
      VALUES ('Administrador CP', 'admin@cpstore.com', $1, 'admin')
      ON CONFLICT (correo) DO NOTHING;
    `, [passwordHash]);

        res.send('¡Administrador creado con éxito! Correo: admin@cpstore.com / Contraseña: admin123');
    } catch (error) {
        console.error(error);
        res.status(500).send('Error al crear el admin.');
    }
});

// Ruta para ver la lista de todos los zapatos CON su inventario
app.get('/zapatos', async (req, res) => {
    try {
        // Buscamos los zapatos y, al mismo tiempo, buscamos sus tallas y colores en la otra tabla
        const resultado = await pool.query(`
      SELECT 
        z.*,
        ARRAY(SELECT DISTINCT talla FROM inventario WHERE zapato_id = z.id) as tallas,
        ARRAY(SELECT DISTINCT color FROM inventario WHERE zapato_id = z.id) as colores
      FROM zapatos z
      ORDER BY z.id DESC; -- Esto ordena para que los zapatos más nuevos salgan de primero
    `);
        res.json(resultado.rows);
    } catch (error) {
        console.error(error);
        res.status(500).send('Error al obtener zapatos');
    }
});

// NUEVA RUTA POST: Guarda el zapato y también su inventario
app.post('/zapatos', upload.single('imagen'), async (req, res) => {
    try {
        // 1. Recibimos los datos del zapato y los nuevos datos de inventario
        const { nombre, marca, precio, color, tallas } = req.body;
        const imagen_url = req.file ? `http://localhost:3000/uploads/${req.file.filename}` : null;

        // 2. Guardamos el zapato y usamos RETURNING id para saber qué número de identificación le dio la base de datos
        const resultadoZapato = await pool.query(`
      INSERT INTO zapatos (nombre, marca, precio, imagen_url) 
      VALUES ($1, $2, $3, $4) RETURNING id
    `, [nombre, marca, precio, imagen_url]);

        const zapatoId = resultadoZapato.rows[0].id; // ¡Atrapamos el ID nuevo!

        // 3. Si tu amigo escribió tallas, las desmenuzamos y las guardamos
        if (tallas && color) {
            const listaTallas = tallas.split(','); // Convierte "38, 39" en una lista [38, 39]

            for (let i = 0; i < listaTallas.length; i++) {
                const tallaLimpia = listaTallas[i].trim(); // Limpiamos espacios accidentales

                // Guardamos cada talla en la tabla inventario. Asumimos 10 pares por talla para arrancar.
                await pool.query(`
          INSERT INTO inventario (zapato_id, talla, color, cantidad) 
          VALUES ($1, $2, $3, $4)
        `, [zapatoId, tallaLimpia, color, 10]);
            }
        }

        res.send({ mensaje: '¡Zapato y su inventario guardados con éxito!' });
    } catch (error) {
        console.error(error);
        res.status(500).send({ error: 'Hubo un error al guardar.' });
    }
});

// NUEVA RUTA DELETE: Para eliminar un zapato definitivamente
app.delete('/zapatos/:id', async (req, res) => {
    try {
        const zapatoId = req.params.id; // Atrapamos el número de ID que queremos borrar

        // 1. Primero quemamos el inventario asociado (las tallas y colores)
        await pool.query('DELETE FROM inventario WHERE zapato_id = $1', [zapatoId]);

        // 2. Luego borramos el zapato principal de la vitrina
        await pool.query('DELETE FROM zapatos WHERE id = $1', [zapatoId]);

        res.send({ mensaje: '¡Zapato eliminado para siempre!' });
    } catch (error) {
        console.error(error);
        res.status(500).send({ error: 'Hubo un error al eliminar el zapato.' });
    }
});

// Configuración del mensajero de correos (Gmail)
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'tucorreo@gmail.com', // Aquí pondrás el correo de CP Store
        pass: 'tu_contraseña'       // Más adelante te enseñaré a sacar una "Contraseña de Aplicación" de Google
    }
});

// NUEVA RUTA DE REGISTRO CON CÓDIGO
app.post('/api/registro', async (req, res) => {
    try {
        const { nombre, correo, password } = req.body;

        const usuarioExistente = await pool.query('SELECT * FROM usuarios WHERE correo = $1', [correo]);
        if (usuarioExistente.rows.length > 0) {
            return res.status(400).json({ error: 'Este correo ya está registrado.' });
        }

        const salt = await bcrypt.genSalt(10);
        const passwordEncriptada = await bcrypt.hash(password, salt);

        // Generamos un código aleatorio de 6 dígitos
        const codigoSecreto = Math.floor(100000 + Math.random() * 900000).toString();

        // Guardamos al usuario como NO verificado y le asignamos el código
        await pool.query(
            `INSERT INTO usuarios (nombre, correo, password, rol, verificado, codigo_verificacion) 
       VALUES ($1, $2, $3, 'cliente', false, $4)`,
            [nombre, correo, passwordEncriptada, codigoSecreto]
        );

        // Intentamos enviar el correo (si falla por falta de credenciales, igual mostramos el código en la consola para que puedas probar)
        try {
            await transporter.sendMail({
                from: '"CP Store" <tucorreo@gmail.com>',
                to: correo,
                subject: "Código de Verificación - CP Store",
                text: `Hola ${nombre}, tu código de verificación es: ${codigoSecreto}`
            });
        } catch (emailError) {
            console.log('⚠️ No se pudo enviar el correo real aún. El código de prueba es:', codigoSecreto);
        }

        res.status(201).json({ mensaje: 'Revisa tu correo, te enviamos un código de 6 dígitos.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error en el servidor.' });
    }
});

// NUEVA RUTA: VERIFICAR EL CÓDIGO
app.post('/api/verificar', async (req, res) => {
    try {
        const { correo, codigo } = req.body;

        const resultado = await pool.query('SELECT * FROM usuarios WHERE correo = $1', [correo]);
        const usuario = resultado.rows[0];

        if (!usuario) return res.status(400).json({ error: 'Usuario no encontrado.' });
        if (usuario.codigo_verificacion !== codigo) return res.status(400).json({ error: 'Código incorrecto.' });

        // Si el código es correcto, lo marcamos como verificado y borramos el código
        await pool.query('UPDATE usuarios SET verificado = true, codigo_verificacion = NULL WHERE correo = $1', [correo]);

        res.json({ mensaje: '¡Correo verificado con éxito! Ya puedes iniciar sesión.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error verificando código.' });
    }
});

// RUTA DE LOGIN: Valida credenciales y entrega un token seguro
app.post('/api/login', async (req, res) => {
    try {
        const { correo, password } = req.body;

        // 1. Buscamos al usuario por su correo
        const resultado = await pool.query('SELECT * FROM usuarios WHERE correo = $1', [correo]);
        if (resultado.rows.length === 0) {
            return res.status(400).json({ error: 'Correo o contraseña incorrectos.' });
        }

        const usuario = resultado.rows[0];

        // Verificamos si ya puso el código que llegó a su correo
        if (!usuario.verificado) {
            return res.status(403).json({ error: 'Debes verificar tu correo primero.' });
        }

        // 2. Comparamos la contraseña escrita con la contraseña encriptada de la base de datos
        const passwordValida = await bcrypt.compare(password, usuario.password);
        if (!passwordValida) {
            return res.status(400).json({ error: 'Correo o contraseña incorrectos.' });
        }

        // 3. Generamos un Token de seguridad que expira en 24 horas
        const token = jwt.sign(
            { id: usuario.id, correo: usuario.correo, rol: usuario.rol },
            'CLAVE_SECRETA_SUPER_SEGURA', // En un entorno profesional esto va oculto, para prácticas va perfecto
            { expiresIn: '24h' }
        );

        // 4. Respondemos con el token y los datos básicos del usuario
        res.json({
            mensaje: '¡Inicio de sesión exitoso!',
            token,
            usuario: {
                id: usuario.id,
                nombre: usuario.nombre,
                correo: usuario.correo,
                rol: usuario.rol
            }
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error en el servidor al iniciar sesión.' });
    }
});

// RUTA TEMPORAL PARA DESCONGELAR AL ADMIN
app.get('/descongelar-admin', async (req, res) => {
    try {
        // Marcamos como verificados a todos los administradores (o usuarios antiguos)
        await pool.query("UPDATE usuarios SET verificado = true WHERE rol = 'admin'");
        res.send('¡Tu usuario Administrador ya está verificado y descongelado!');
    } catch (error) {
        console.error(error);
        res.status(500).send('Error');
    }
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});