"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import CardProducto from '../components/CardProducto';
import ModalCarrito from '../components/ModalCarrito';
import Footer from '../components/Footer';

const normalizarTexto = (texto) => {
  return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
};

export default function Home() {
  const [zapatos, setZapatos] = useState([]);
  const [tallaSeleccionada, setTallaSeleccionada] = useState({});
  const [busqueda, setBusqueda] = useState('');
  const [marcaFiltro, setMarcaFiltro] = useState('Todas');
  const [carrito, setCarrito] = useState([]);
  const [carritoAbierto, setCarritoAbierto] = useState(false);

  // ESTO REGISTRA QUÉ FOTO DE COLOR ESTÁ VIENDO EL CLIENTE
  const [imagenActual, setImagenActual] = useState({});
  const [usuarioActual, setUsuarioActual] = useState(null);

  const router = useRouter();

  useEffect(() => {
    fetch('http://localhost:3000/zapatos')
      .then((res) => res.json())
      .then((data) => setZapatos(data));

    const token = localStorage.getItem('token');
    const datosUsuario = localStorage.getItem('usuario');
    if (token && datosUsuario) {
      setUsuarioActual(JSON.parse(datosUsuario));
    }
  }, []);

  const cerrarSesion = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    setUsuarioActual(null);
  };

  const seleccionarTalla = (zapatoId, talla) => {
    setTallaSeleccionada({ ...tallaSeleccionada, [zapatoId]: talla });
  };

  const cambiarImagen = (id, direccion, total) => {
    setImagenActual(prev => {
      const actual = prev[id] || 0;
      let nueva = actual + direccion;
      if (nueva < 0) nueva = total - 1;
      if (nueva >= total) nueva = 0;
      return { ...prev, [id]: nueva };
    });
  };

  // AQUÍ SUCEDE LA MAGIA
  const agregarAlCarrito = (zapato) => {
    const talla = tallaSeleccionada[zapato.id];
    if (zapato.tallas && zapato.tallas.length > 0 && zapato.tallas[0] !== null && !talla) {
      alert('¡Por favor, selecciona una talla antes de agregar al carrito!');
      return;
    }

    // Aquí el sistema mira qué foto estaba viendo el cliente justo al darle click
    const imgs = zapato.imagenes && zapato.imagenes.length > 0 ? zapato.imagenes : [zapato.imagen_url];
    const imgSeleccionada = imgs[imagenActual[zapato.id] || 0];

    // Busca si ya existe ESE mismo color con ESA misma talla en el carrito
    const itemExistenteIndex = carrito.findIndex(item => item.id === zapato.id && item.talla === talla && item.imagen === imgSeleccionada);

    if (itemExistenteIndex >= 0) {
      const nuevoCarrito = [...carrito];
      nuevoCarrito[itemExistenteIndex].cantidad += 1;
      setCarrito(nuevoCarrito);
    } else {
      // Si no existe, lo agrega al carrito CON LA FOTO DEL COLOR QUE ELIGIÓ
      setCarrito([...carrito, {
        id: zapato.id, nombre: zapato.nombre, precio: parseFloat(zapato.precio),
        imagen: imgSeleccionada, talla: talla || 'Única', cantidad: 1
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

  const iniciarPagoWompi = () => {
    if (!usuarioActual) {
      alert('¡Debes iniciar sesión o registrarte para realizar compras!');
      router.push('/auth');
      return;
    }
    const valorEnCentavos = totalCarrito * 100;
    const urlWompi = `https://checkout.wompi.co/p/?public-key=pub_test_Q5yDA9xoKdePzhX8a0x9HAez7HgGO2fH&currency=COP&amount-in-cents=${valorEnCentavos}&reference=CP-STORE-${Date.now()}`;
    window.location.href = urlWompi;
  };

  // ==========================================
  // FUNCIÓN ACTUALIZADA: WHATSAPP CON COLOR/FOTO
  // ==========================================
  const pedirPorWhatsApp = () => {
    if (carrito.length === 0) return;

    let mensaje = `👋 ¡Hola CP Store! Quisiera saber si tienen disponibilidad de:\n\n`;

    carrito.forEach((item) => {
      const cantidad = item.cantidad > 1 ? ` (${item.cantidad} pares)` : '';
      mensaje += `👟 *${item.nombre}* - Talla: ${item.talla}${cantidad}\n`;
      // Aquí agregamos el link a la imagen para que sepas el color exacto
      mensaje += `🎨 Color/Foto: ${item.imagen}\n\n`;
    });

    mensaje += `¡Quedo atento, muchas gracias!`;

    const url = `https://wa.me/573143231821?text=${encodeURIComponent(mensaje)}`;
    window.open(url, '_blank');
  };

  const totalCarrito = carrito.reduce((total, item) => total + (item.precio * item.cantidad), 0);
  const marcasUnicas = ['Todas', ...new Set(zapatos.map(z => z.marca.toUpperCase()))];

  const zapatosFiltrados = zapatos.filter(zapato => {
    const terminoBusqueda = normalizarTexto(busqueda);
    const textoZapato = normalizarTexto(`${zapato.nombre} ${zapato.marca}`);
    const palabrasBusqueda = terminoBusqueda.split(' ').filter(p => p !== '');
    const coincideTexto = palabrasBusqueda.every(palabra => textoZapato.includes(palabra));
    const coincideMarca = marcaFiltro === 'Todas' || zapato.marca.toUpperCase() === marcaFiltro;
    return coincideTexto && coincideMarca;
  });

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-gray-900 to-black text-white font-sans">
      <main className="flex-grow p-8 relative">
        <header className="max-w-7xl mx-auto flex justify-between items-center mb-8 border-b border-gray-800 pb-4">
          <div className="flex items-center gap-4">
            <img src="/logo.png" alt="CP Store Logo" className="h-16 w-16 rounded-full object-cover shadow-lg border-2 border-[#C5A059]" />
            <div>
              {usuarioActual ? (
                <div className="flex items-center gap-4 mt-1 text-sm">
                  <p className="text-gray-300 font-medium">Hola, <span className="font-bold text-white">{usuarioActual.nombre}</span></p>
                  {usuarioActual.rol === 'admin' && (
                    <button onClick={() => router.push('/admin')} className="bg-[#C5A059] text-black px-4 py-1.5 rounded-lg text-sm font-bold shadow-sm hover:bg-[#B5952F] transition">⚙️ Panel</button>
                  )}
                  <button onClick={cerrarSesion} className="text-red-400 hover:text-red-300 font-bold transition">Salir</button>
                </div>
              ) : (
                <div className="mt-1">
                  <button onClick={() => router.push('/auth')} className="bg-transparent text-[#C5A059] px-5 py-2 rounded-lg text-sm font-bold hover:bg-gray-800 border border-[#C5A059]">Iniciar Sesión</button>
                </div>
              )}
            </div>
          </div>
          <button onClick={() => setCarritoAbierto(true)} className="relative bg-gray-800 text-[#C5A059] p-3 rounded-full shadow-sm hover:shadow-md transition border border-[#C5A059]">
            🛒
            {carrito.length > 0 && (
              <span className="absolute -top-2 -right-2 bg-[#C5A059] text-black text-xs font-black w-6 h-6 flex items-center justify-center rounded-full border-2 border-gray-900">
                {carrito.reduce((suma, item) => suma + item.cantidad, 0)}
              </span>
            )}
          </button>
        </header>

        <div className="max-w-7xl mx-auto mb-10 space-y-4">
          <div className="relative max-w-xl mx-auto">
            <input type="text" placeholder="Buscar modelo o marca..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} className="w-full bg-gray-800 border-2 border-gray-700 p-4 pl-12 pr-12 rounded-2xl text-white placeholder-gray-500 focus:outline-none focus:border-[#C5A059] transition shadow-lg text-lg" />
            <span className="absolute left-4 top-4 text-xl text-gray-500">🔍</span>
            {busqueda && <button onClick={() => setBusqueda('')} className="absolute right-4 top-4 text-gray-400 hover:text-white bg-gray-700 hover:bg-gray-600 rounded-full w-7 h-7 flex items-center justify-center font-bold">✕</button>}
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            {marcasUnicas.map((marca, index) => (
              <button key={index} onClick={() => setMarcaFiltro(marca)} className={`px-5 py-2 rounded-full font-bold text-sm transition-all ${marcaFiltro === marca ? 'bg-[#C5A059] text-black shadow-[0_0_15px_rgba(197,160,89,0.4)] border border-[#C5A059]' : 'bg-gray-800 text-gray-300 border border-gray-700'}`}>{marca}</button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
          {zapatosFiltrados.map((zapato) => (
            <CardProducto 
              key={zapato.id} 
              zapato={zapato} 
              idxImagenActual={imagenActual[zapato.id]} 
              cambiarImagen={cambiarImagen} 
              seleccionarTalla={seleccionarTalla} 
              tallaActual={tallaSeleccionada[zapato.id]} 
              agregarAlCarrito={agregarAlCarrito} 
            />
          ))}
        </div>

        {carritoAbierto && (
          <ModalCarrito 
            carrito={carrito} 
            setCarritoAbierto={setCarritoAbierto} 
            eliminarDelCarrito={eliminarDelCarrito} 
            actualizarCantidad={actualizarCantidad} 
            totalCarrito={totalCarrito} 
            pedirPorWhatsApp={pedirPorWhatsApp} 
            iniciarPagoWompi={iniciarPagoWompi} 
          />
        )}
      </main>

      <Footer />
    </div>
  );
}