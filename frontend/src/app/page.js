"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const [zapatos, setZapatos] = useState([]);
  const [tallaSeleccionada, setTallaSeleccionada] = useState({});
  const [busqueda, setBusqueda] = useState('');
  const [marcaFiltro, setMarcaFiltro] = useState('Todas');
  const [carrito, setCarrito] = useState([]);
  const [carritoAbierto, setCarritoAbierto] = useState(false);

  const [usuarioActual, setUsuarioActual] = useState(null);
  const router = useRouter();

  useEffect(() => {
    // 1. SIEMPRE cargamos los zapatos para que todos (invitados o registrados) puedan ver la vitrina
    fetch('http://localhost:3000/zapatos')
      .then((res) => res.json())
      .then((data) => setZapatos(data));

    // 2. Verificamos silenciosamente si hay alguien logueado para cambiar la interfaz
    const token = localStorage.getItem('token');
    const datosUsuario = localStorage.getItem('usuario');

    if (token && datosUsuario) {
      setUsuarioActual(JSON.parse(datosUsuario));
    }
  }, []); // Se ejecuta solo una vez al cargar la página

  const cerrarSesion = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    setUsuarioActual(null); // Actualiza la pantalla instantáneamente a modo "invitado"
  };

  const seleccionarTalla = (zapatoId, talla) => {
    setTallaSeleccionada({ ...tallaSeleccionada, [zapatoId]: talla });
  };

  const agregarAlCarrito = (zapato) => {
    const talla = tallaSeleccionada[zapato.id];
    if (zapato.tallas && zapato.tallas.length > 0 && zapato.tallas[0] !== null && !talla) {
      alert('¡Por favor, selecciona una talla antes de agregar al carrito!');
      return;
    }
    const color = zapato.colores && zapato.colores.length > 0 && zapato.colores[0] !== null ? zapato.colores[0] : 'Único';
    const itemExistenteIndex = carrito.findIndex(item => item.id === zapato.id && item.talla === talla);

    if (itemExistenteIndex >= 0) {
      const nuevoCarrito = [...carrito];
      nuevoCarrito[itemExistenteIndex].cantidad += 1;
      setCarrito(nuevoCarrito);
    } else {
      setCarrito([...carrito, {
        id: zapato.id, nombre: zapato.nombre, precio: parseFloat(zapato.precio),
        imagen: zapato.imagen_url, talla: talla || 'Única', color: color, cantidad: 1
      }]);
    }
    setCarritoAbierto(true);
  };

  const eliminarDelCarrito = (index) => {
    setCarrito(carrito.filter((_, i) => i !== index));
  };

  const actualizarCantidad = (index, cambio) => {
    const nuevoCarrito = [...carrito];
    const nuevaCantidad = nuevoCarrito[index].cantidad + cambio;
    if (nuevaCantidad > 0) {
      nuevoCarrito[index].cantidad = nuevaCantidad;
      setCarrito(nuevoCarrito);
    } else {
      eliminarDelCarrito(index);
    }
  };

  // === PROTECCIÓN EN LA CAJA REGISTRADORA ===
  const iniciarPagoWompi = () => {
    // Si no está registrado, le avisamos los beneficios y lo mandamos a crear cuenta
    if (!usuarioActual) {
      alert('¡Debes iniciar sesión o registrarte para realizar compras, acceder a promociones y acumular beneficios en CP Store!');
      router.push('/auth');
      return;
    }

    // Si ya está registrado, procede el pago normalmente
    const valorEnCentavos = totalCarrito * 100;
    const referenciaPedido = `CP-STORE-${Date.now()}`;
    const publicKey = "pub_test_Q5yDA9xoKdePzhX8a0x9HAez7HgGO2fH";
    const urlWompi = `https://checkout.wompi.co/p/?public-key=${publicKey}&currency=COP&amount-in-cents=${valorEnCentavos}&reference=${referenciaPedido}`;
    window.location.href = urlWompi;
  };

  const totalCarrito = carrito.reduce((total, item) => total + (item.precio * item.cantidad), 0);
  const marcasUnicas = ['Todas', ...new Set(zapatos.map(z => z.marca.toUpperCase()))];
  const zapatosFiltrados = zapatos.filter(zapato => {
    const coincideTexto = zapato.nombre.toLowerCase().includes(busqueda.toLowerCase()) || zapato.marca.toLowerCase().includes(busqueda.toLowerCase());
    const coincideMarca = marcaFiltro === 'Todas' || zapato.marca.toUpperCase() === marcaFiltro;
    return coincideTexto && coincideMarca;
  });

  return (
    <main className="p-8 font-sans bg-gray-50 min-h-screen relative">

      {/* ENCABEZADO INTELIGENTE (Cambia si es invitado o cliente) */}
      <header className="max-w-7xl mx-auto flex justify-between items-center mb-8 border-b border-gray-200 pb-4">
        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight">CP Store</h1>

          {usuarioActual ? (
            <div className="flex items-center gap-4 mt-2 text-sm">
              <p className="text-gray-600 font-medium">Hola, <span className="font-bold text-black">{usuarioActual.nombre}</span> 👋</p>
              {usuarioActual.rol === 'admin' && (
                <button onClick={() => router.push('/admin')} className="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-sm font-bold shadow-sm hover:bg-blue-700 mr-2">
                  ⚙️ Panel de Control
                </button>
              )}
              <button onClick={cerrarSesion} className="text-red-500 hover:text-red-700 font-bold transition">Cerrar sesión</button>
            </div>
          ) : (
            <div className="mt-2">
              <button onClick={() => router.push('/auth')} className="bg-black text-white px-5 py-1.5 rounded-lg text-sm font-bold hover:bg-gray-800 transition shadow-sm">
                Iniciar Sesión / Registrarse
              </button>
            </div>
          )}
        </div>

        <button onClick={() => setCarritoAbierto(true)} className="relative bg-white p-3 rounded-full shadow-sm hover:shadow-md transition border border-gray-200 text-2xl">
          🛒
          {carrito.length > 0 && (
            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full">
              {carrito.reduce((suma, item) => suma + item.cantidad, 0)}
            </span>
          )}
        </button>
      </header>

      {/* SECCIÓN DE BÚSQUEDA Y FILTROS */}
      <div className="max-w-7xl mx-auto mb-10 space-y-4">
        <div className="relative max-w-xl mx-auto">
          <input type="text" placeholder="Buscar por modelo o marca..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} className="w-full border-2 border-gray-200 p-4 pl-12 rounded-2xl text-gray-700 focus:outline-none focus:border-black transition shadow-sm" />
          <span className="absolute left-4 top-4 text-xl text-gray-400">🔍</span>
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          {marcasUnicas.map((marca, index) => (
            <button key={index} onClick={() => setMarcaFiltro(marca)} className={`px-5 py-2 rounded-full font-bold text-sm transition-all ${marcaFiltro === marca ? 'bg-black text-white shadow-md transform scale-105' : 'bg-white text-gray-600 border border-gray-200 hover:border-black'}`}>{marca}</button>
          ))}
        </div>
      </div>

      {/* CUADRÍCULA DE PRODUCTOS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
        {zapatosFiltrados.map((zapato) => (
          <div key={zapato.id} className="border border-gray-200 rounded-2xl p-5 shadow-sm hover:shadow-xl transition bg-white flex flex-col">
            {zapato.imagen_url && <img src={zapato.imagen_url} alt={zapato.nombre} className="w-full h-56 object-cover rounded-xl mb-4 bg-gray-100" />}
            <div className="flex justify-between items-start mb-1">
              <h2 className="text-xl font-bold text-gray-800 leading-tight">{zapato.nombre}</h2>
              <p className="text-lg font-black text-green-600">${zapato.precio}</p>
            </div>
            <p className="text-gray-400 text-xs mb-4 uppercase tracking-wider font-bold">{zapato.marca}</p>

            {zapato.tallas && zapato.tallas.length > 0 && zapato.tallas[0] !== null && (
              <div className="mb-6 flex-grow">
                <p className="text-xs text-gray-400 mb-2">Tallas</p>
                <div className="flex flex-wrap gap-2">
                  {zapato.tallas.map((talla, i) => (
                    <span key={i} onClick={() => seleccionarTalla(zapato.id, talla)} className={`px-3 py-1 text-xs font-semibold border rounded-md cursor-pointer transition ${tallaSeleccionada[zapato.id] === talla ? 'border-black bg-black text-white' : 'border-gray-300 text-gray-600 hover:border-black'}`}>{talla}</span>
                  ))}
                </div>
              </div>
            )}
            <button onClick={() => agregarAlCarrito(zapato)} className="mt-auto w-full bg-black text-white py-3 rounded-xl font-bold hover:bg-gray-800 transition shadow-md">Agregar al carrito</button>
          </div>
        ))}
      </div>

      {/* PANEL LATERAL DEL CARRITO */}
      {carritoAbierto && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-end">
          <div className="bg-white w-full max-w-md h-full flex flex-col shadow-2xl animate-slide-in">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-2xl font-black text-gray-800">Tu Carrito ({carrito.reduce((suma, item) => suma + item.cantidad, 0)})</h2>
              <button onClick={() => setCarritoAbierto(false)} className="text-gray-500 hover:text-red-500 font-bold text-xl">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {carrito.length === 0 ? (
                <div className="text-center text-gray-400 mt-20 font-bold">Tu carrito está vacío 🛒</div>
              ) : (
                carrito.map((item, index) => (
                  <div key={index} className="flex gap-4 items-center bg-gray-50 p-3 rounded-xl border border-gray-100 relative">
                    <button onClick={() => eliminarDelCarrito(index)} className="absolute top-2 right-2 text-gray-400 hover:text-red-500 text-sm font-bold p-1">🗑</button>
                    {item.imagen && <img src={item.imagen} alt={item.nombre} className="w-20 h-20 object-cover rounded-lg border border-gray-200" />}
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-800 leading-tight pr-6">{item.nombre}</h3>
                      <p className="text-xs text-gray-500 mt-1">Talla: {item.talla} | Color: {item.color}</p>
                      <div className="flex justify-between items-center mt-3">
                        <p className="font-black text-green-600">${item.precio}</p>
                        <div className="flex items-center gap-3 bg-white border border-gray-300 rounded-lg px-2 py-1 shadow-sm">
                          <button onClick={() => actualizarCantidad(index, -1)} className="text-gray-500 hover:text-black font-black text-lg px-1">-</button>
                          <span className="text-sm font-bold text-gray-800 w-4 text-center">{item.cantidad}</span>
                          <button onClick={() => actualizarCantidad(index, 1)} className="text-gray-500 hover:text-black font-black text-lg px-1">+</button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            {carrito.length > 0 && (
              <div className="p-6 border-t border-gray-200 bg-gray-50">
                <div className="flex justify-between items-center mb-6">
                  <span className="text-lg font-bold text-gray-600">Total a pagar:</span>
                  <span className="text-3xl font-black text-gray-900">${totalCarrito.toLocaleString()}</span>
                </div>
                <button onClick={iniciarPagoWompi} className="w-full bg-green-600 text-white font-black py-4 rounded-xl hover:bg-green-700 transition shadow-lg text-lg">Proceder al Pago</button>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}