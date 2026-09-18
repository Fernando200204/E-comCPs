export default function ModalCarrito({
  carrito,
  setCarritoAbierto,
  eliminarDelCarrito,
  actualizarCantidad,
  totalCarrito,
  pedirPorWhatsApp,
  iniciarPagoWompi
}) {
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex justify-end">
      <div className="bg-gray-900 w-full max-w-md h-full flex flex-col shadow-2xl border-l border-gray-800">
        <div className="p-6 border-b border-gray-800 flex justify-between items-center bg-black">
          <h2 className="text-2xl font-black text-[#C5A059]">Tu Carrito</h2>
          <button onClick={() => setCarritoAbierto(false)} className="text-gray-400 hover:text-red-500 font-bold text-xl transition">✕</button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {carrito.length === 0 ? (
            <div className="text-center text-gray-500 mt-20 font-bold">Tu carrito está vacío.</div>
          ) : (
            carrito.map((item, index) => (
              <div key={index} className="flex gap-4 items-center bg-gray-800 p-3 rounded-xl border border-gray-700 relative">
                <button onClick={() => eliminarDelCarrito(index)} className="absolute top-2 right-2 text-gray-500 hover:text-red-400 text-sm font-bold p-1">✕</button>
                <img src={item.imagen} alt={item.nombre} className="w-20 h-20 object-cover rounded-lg border border-gray-600 bg-gray-700" />
                <div className="flex-1">
                  <h3 className="font-bold text-white leading-tight pr-6">{item.nombre}</h3>
                  <p className="text-xs text-[#C5A059] mt-1 font-bold">Talla: <span className="text-white">{item.talla}</span></p>
                  <div className="flex justify-between items-center mt-3">
                    <p className="font-black text-[#C5A059]">${Number(item.precio).toLocaleString('es-CO')}</p>
                    <div className="flex items-center gap-3 bg-gray-900 border border-gray-600 rounded-lg px-2 py-1">
                      <button onClick={() => actualizarCantidad(index, -1)} className="text-gray-400 hover:text-white font-black text-lg px-1">-</button>
                      <span className="text-sm font-bold text-white w-4 text-center">{item.cantidad}</span>
                      <button onClick={() => actualizarCantidad(index, 1)} className="text-gray-400 hover:text-white font-black text-lg px-1">+</button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
        {carrito.length > 0 && (
          <div className="p-6 border-t border-gray-800 bg-black space-y-3">
            <div className="flex justify-between items-center mb-2">
              <span className="text-lg font-bold text-gray-400">Total a pagar:</span>
              <span className="text-3xl font-black text-white">${totalCarrito.toLocaleString('es-CO')}</span>
            </div>

            <button
              onClick={pedirPorWhatsApp}
              className="w-full flex items-center justify-center gap-2 bg-[#25D366] text-black font-black py-3 rounded-xl hover:bg-[#20ba5a] transition shadow-md text-base"
            >
              <svg fill="currentColor" viewBox="0 0 24 24" className="w-5 h-5">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 00-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
              </svg>
              Pedir por WhatsApp
            </button>

            <button
              onClick={iniciarPagoWompi}
              className="w-full bg-[#C5A059] text-black font-black py-3 rounded-xl hover:bg-[#B5952F] transition shadow-lg text-base border border-[#B5952F]"
            >
              Pagar con Tarjeta / PSE
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
