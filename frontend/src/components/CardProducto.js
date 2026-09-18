export default function CardProducto({
  zapato,
  idxImagenActual,
  cambiarImagen,
  seleccionarTalla,
  tallaActual,
  agregarAlCarrito
}) {
  const imgs = zapato.imagenes && zapato.imagenes.length > 0 ? zapato.imagenes : [zapato.imagen_url];
  const idx = idxImagenActual || 0;

  return (
    <div className="border border-gray-800 rounded-2xl p-5 shadow-lg hover:shadow-2xl transition bg-gray-800/50 flex flex-col group border-b-4 hover:border-b-[#C5A059] backdrop-blur-sm">
      <div className="relative w-full h-56 mb-4 rounded-xl overflow-hidden bg-gray-700">
        <img src={imgs[idx]} alt={zapato.nombre} className="w-full h-full object-cover group-hover:opacity-90 transition" />
        {imgs.length > 1 && (
          <div className="absolute inset-0 flex justify-between items-center px-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={(e) => { e.stopPropagation(); cambiarImagen(zapato.id, -1, imgs.length); }} className="bg-black/60 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-[#C5A059] hover:text-black font-black shadow-md">‹</button>
            <button onClick={(e) => { e.stopPropagation(); cambiarImagen(zapato.id, 1, imgs.length); }} className="bg-black/60 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-[#C5A059] hover:text-black font-black shadow-md">›</button>
          </div>
        )}
      </div>

      <div className="flex justify-between items-start mb-1">
        <h2 className="text-xl font-bold text-white leading-tight">{zapato.nombre}</h2>
        <p className="text-lg font-black text-[#C5A059]">${Number(zapato.precio).toLocaleString('es-CO')}</p>
      </div>
      <p className="text-gray-400 text-xs mb-4 uppercase tracking-wider font-bold">{zapato.marca}</p>

      {zapato.tallas && zapato.tallas.length > 0 && zapato.tallas[0] !== null && (
        <div className="mb-6 flex-grow">
          <p className="text-xs text-gray-400 mb-2 font-bold uppercase tracking-wide">Selecciona tu talla:</p>
          <div className="flex flex-wrap gap-2">
            {zapato.tallas.map((talla, i) => (
              <span key={i} onClick={() => seleccionarTalla(zapato.id, talla)} className={`px-3 py-1 text-sm font-bold border rounded-md cursor-pointer transition ${tallaActual === talla ? 'border-[#C5A059] bg-[#C5A059] text-black shadow-[0_0_10px_rgba(197,160,89,0.3)]' : 'border-gray-600 text-gray-300 hover:border-[#C5A059]'}`}>
                {talla}
              </span>
            ))}
          </div>
        </div>
      )}
      <button onClick={() => agregarAlCarrito(zapato)} className="mt-auto w-full bg-gray-900 text-[#C5A059] border border-[#C5A059] hover:text-black py-3 rounded-xl font-bold hover:bg-[#C5A059] transition shadow-md">Agregar al carrito</button>
    </div>
  );
}
