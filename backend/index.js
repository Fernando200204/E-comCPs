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

// ==========================================
// 2. RUTA POST: GUARDA EL ZAPATO CON TODAS SUS FOTOS
// ==========================================
// ==========================================
// 2. RUTA POST: GUARDA EL ZAPATO CON TODAS SUS FOTOS
// ==========================================
app.post('/zapatos', upload.array('imagenes', 25), async (req, res) => {
    try {
        const { nombre, marca, precio, tallas } = req.body;

        let imagen_url = null;
        let arregloImagenes = [];

        // Atrapamos todas las fotos que subiste desde el panel
        if (req.files && req.files.length > 0) {
            arregloImagenes = req.files.map(file => `http://localhost:3000/uploads/${file.filename}`);
            imagen_url = arregloImagenes[0]; // La primera foto queda como la principal
        }

        // Guardamos el zapato en la base de datos (con la galería de fotos en formato JSON)
        const resultadoZapato = await pool.query(`
            INSERT INTO zapatos (nombre, marca, precio, imagen_url, imagenes) 
            VALUES ($1, $2, $3, $4, $5) RETURNING id
        `, [nombre, marca, precio, imagen_url, JSON.stringify(arregloImagenes)]);

        const zapatoId = resultadoZapato.rows[0].id;

        // Guardamos todas las tallas que escribiste
        if (tallas) {
            const listaTallas = JSON.parse(tallas);
            for (let i = 0; i < listaTallas.length; i++) {
                const tallaLimpia = listaTallas[i];
                await pool.query(`
                    INSERT INTO inventario (zapato_id, talla, color, cantidad) 
                    VALUES ($1, $2, $3, $4)
                `, [zapatoId, tallaLimpia, 'Único', 10]);
            }
        }

        res.send({ mensaje: '¡Zapato y galería guardados con éxito!' });
    } catch (error) {
        // ESTO NOS DIRÁ EXACTAMENTE QUÉ ESTÁ FALLANDO
        console.error('====================================');
        console.error('❌ ERROR GRAVE AL GUARDAR EL ZAPATO:');
        console.error(error);
        console.error('====================================');
        res.status(500).send({ error: 'Hubo un error al guardar.', detalle: error.message });
    }
});

// ==========================================
// 3. RUTA GET: ENVIAR EL INVENTARIO A LA PÁGINA (¡La que faltaba!)
// ==========================================
app.get('/zapatos', async (req, res) => {
    try {
        const resultado = await pool.query('SELECT * FROM zapatos ORDER BY id DESC');

        // Buscamos las tallas de cada zapato para mandarlas completas
        const zapatosConTallas = await Promise.all(resultado.rows.map(async (zapato) => {
            const inventarioRes = await pool.query('SELECT talla FROM inventario WHERE zapato_id = $1', [zapato.id]);
            const tallas = inventarioRes.rows.map(row => row.talla);
            return { ...zapato, tallas };
        }));

        res.json(zapatosConTallas);
    } catch (error) {
        console.error('Error al obtener los zapatos:', error);
        res.status(500).json({ error: 'Hubo un error al obtener los datos.' });
    }
});

// ==========================================
// 4. RUTA DELETE: ELIMINAR UN ZAPATO DESDE EL PANEL
// ==========================================
app.delete('/zapatos/:id', async (req, res) => {
    try {
        const zapatoId = req.params.id;

        // Al borrar el zapato, el 'ON DELETE CASCADE' de la BD borra su inventario automáticamente
        await pool.query('DELETE FROM zapatos WHERE id = $1', [zapatoId]);

        res.json({ mensaje: '¡Zapato y tallas eliminados para siempre!' });
    } catch (error) {
        console.error('Error al eliminar:', error);
        res.status(500).json({ error: 'Hubo un error al eliminar el zapato.' });
    }
});

// ==========================================
// RUTA PUT: EDITAR PRODUCTO (PRECIO, NOMBRE, MARCA)
// ==========================================
app.put('/zapatos/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre, marca, precio } = req.body;

        await pool.query(`
            UPDATE zapatos 
            SET nombre = $1, marca = $2, precio = $3 
            WHERE id = $4
        `, [nombre, marca, precio, id]);

        res.json({ mensaje: 'Producto actualizado con éxito' });
    } catch (error) {
        console.error('Error al actualizar zapato:', error);
        res.status(500).json({ error: 'Hubo un error al actualizar.' });
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

// ==========================================
// 1. AUTO-CREADOR DE TABLAS E INVENTARIO
// ==========================================
const inicializarBaseDeDatos = async () => {
    try {
        await pool.query(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id SERIAL PRIMARY KEY,
        nombre VARCHAR(255),
        correo VARCHAR(255) UNIQUE NOT NULL, 
        password VARCHAR(255) NOT NULL,
        rol VARCHAR(50) DEFAULT 'cliente',
        verificado BOOLEAN DEFAULT false,
        codigo_verificacion VARCHAR(10)
      );

      CREATE TABLE IF NOT EXISTS zapatos (
        id SERIAL PRIMARY KEY,
        nombre VARCHAR(255) NOT NULL,
        marca VARCHAR(255) NOT NULL,
        precio DECIMAL(10, 2) NOT NULL,
        imagen_url TEXT
      );

      CREATE TABLE IF NOT EXISTS inventario (
        id SERIAL PRIMARY KEY,
        zapato_id INTEGER REFERENCES zapatos(id) ON DELETE CASCADE,
        talla VARCHAR(50) NOT NULL,
        color VARCHAR(50) DEFAULT 'Único',
        cantidad INTEGER DEFAULT 0
      );
    `);

        // Curita automática: Si la tabla se creó con "email", la renombramos a "correo"
        try {
            await pool.query(`ALTER TABLE usuarios RENAME COLUMN email TO correo;`);
            console.log('🔧 Corrección aplicada: Columna email cambiada a correo.');
        } catch (e) {
            // Si da error es porque ya se llama correo, lo ignoramos en silencio
        }

        // Agrega la columna de la galería de fotos si aún no existe
        await pool.query(`ALTER TABLE zapatos ADD COLUMN IF NOT EXISTS imagenes JSON DEFAULT '[]'::json;`);

        await pool.query(`UPDATE usuarios SET rol = 'admin' WHERE correo = 'admin@cpstore.com'`);

        console.log('✅ Base de datos verificada y lista.');
    } catch (error) {
        console.error('❌ Error al inicializar la base de datos:', error);
    }
};

inicializarBaseDeDatos();

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});