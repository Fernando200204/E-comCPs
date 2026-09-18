"use client";

import { useState, useEffect } from 'react';

export default function AdminMasivo() {
    const [listaZapatos, setListaZapatos] = useState([]);
    const [guardando, setGuardando] = useState(false);
    const [catalogo, setCatalogo] = useState([]); // Memoria para los zapatos que ya están en la tienda

    // Pedimos el catálogo actual al cargar la página
    const cargarCatalogo = async () => {
        const res = await fetch('http://localhost:3000/zapatos');
        const data = await res.json();
        setCatalogo(data);
    };

    useEffect(() => {
        cargarCatalogo();
    }, []);

    // Función para subir zapatos nuevos (la que ya teníamos)
    const manejarFotos = (e) => {
        const archivos = Array.from(e.target.files);
        const nuevosZapatos = archivos.map((archivo) => ({
            archivo: archivo, preview: URL.createObjectURL(archivo),
            nombre: '', marca: '', precio: '', color: '', tallas: ''
        }));
        setListaZapatos([...listaZapatos, ...nuevosZapatos]);
    };

    const actualizarDato = (index, campo, valor) => {
        const nuevaLista = [...listaZapatos];
        nuevaLista[index][campo] = valor;
        setListaZapatos(nuevaLista);
    };

    const eliminarDeSeleccion = (indexAEliminar) => {
        setListaZapatos(listaZapatos.filter((_, index) => index !== indexAEliminar));
    };

    const guardarTodo = async (e) => {
        e.preventDefault();
        setGuardando(true);
        let cantidadSubidos = 0;

        for (const zapato of listaZapatos) {
            if (!zapato.nombre || !zapato.precio) continue;
            const formData = new FormData();
            formData.append('nombre', zapato.nombre);
            formData.append('marca', zapato.marca);
            formData.append('precio', zapato.precio);
            formData.append('color', zapato.color);
            formData.append('tallas', zapato.tallas);
            formData.append('imagen', zapato.archivo);

            const respuesta = await fetch('http://localhost:3000/zapatos', { method: 'POST', body: formData });
            if (respuesta.ok) cantidadSubidos++;
        }

        alert(`¡Éxito! Se subieron ${cantidadSubidos} zapatos.`);
        setListaZapatos([]);
        document.getElementById('input-fotos').value = '';
        setGuardando(false);
        cargarCatalogo(); // Recargamos el catálogo de abajo para que muestre los nuevos inmediatamente
    };

    // NUEVA FUNCIÓN: Eliminar definitivamente de la base de datos
    const borrarDeLaTienda = async (id, nombre) => {
        // Le preguntamos si está seguro para evitar accidentes
        const confirmacion = window.confirm(`¿Estás 100% seguro de que quieres eliminar "${nombre}" de la tienda?`);

        if (confirmacion) {
            const respuesta = await fetch(`http://localhost:3000/zapatos/${id}`, {
                method: 'DELETE'
            });

            if (respuesta.ok) {
                cargarCatalogo(); // Actualizamos la lista visual
            } else {
                alert('Hubo un error al intentar borrar el zapato.');
            }
        }
    };

    return (
        <main className="p-8 font-sans max-w-5xl mx-auto bg-gray-50 min-h-screen rounded-xl">
            <h1 className="text-3xl font-black mb-6 text-center text-gray-800">Panel de Control: CP Store</h1>

            {/* SECCIÓN 1: SUBIR ZAPATOS */}
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm mb-10 text-center">
                <label className="block text-gray-700 font-bold mb-4 text-lg">1. Subir Nuevos Zapatos</label>
                <input id="input-fotos" type="file" accept="image/*" multiple onChange={manejarFotos} className="w-full max-w-sm mx-auto block file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
            </div>

            {listaZapatos.length > 0 && (
                <form onSubmit={guardarTodo} className="space-y-6 mb-12">
                    <h2 className="text-xl font-bold text-gray-700 flex justify-between items-center">2. Completar Datos <span className="text-sm font-normal text-gray-500 bg-gray-200 px-3 py-1 rounded-full">{listaZapatos.length} seleccionados</span></h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {listaZapatos.map((zapato, index) => (
                            <div key={index} className="relative flex gap-4 bg-gray-50 p-4 rounded-xl border border-gray-200">
                                <button type="button" onClick={() => eliminarDeSeleccion(index)} className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white w-7 h-7 rounded-full font-bold text-sm flex items-center justify-center shadow-md">✕</button>
                                <img src={zapato.preview} alt="preview" className="w-24 h-24 object-cover rounded-lg border border-gray-300 shadow-sm" />
                                <div className="flex-1 space-y-3">
                                    <input type="text" placeholder="Nombre" required value={zapato.nombre} onChange={(e) => actualizarDato(index, 'nombre', e.target.value)} className="w-full border border-gray-300 p-1.5 rounded-lg text-sm" />
                                    <div className="flex gap-2">
                                        <input type="text" placeholder="Marca" required value={zapato.marca} onChange={(e) => actualizarDato(index, 'marca', e.target.value)} className="w-1/2 border border-gray-300 p-1.5 rounded-lg text-sm" />
                                        <input type="number" step="0.01" placeholder="Precio" required value={zapato.precio} onChange={(e) => actualizarDato(index, 'precio', e.target.value)} className="w-1/2 border border-gray-300 p-1.5 rounded-lg text-sm" />
                                    </div>
                                    <div className="flex gap-2">
                                        <input type="text" placeholder="Color" required value={zapato.color} onChange={(e) => actualizarDato(index, 'color', e.target.value)} className="w-1/3 border border-gray-300 p-1.5 rounded-lg text-sm" />
                                        <input type="text" placeholder="Tallas (Ej: 38, 39)" required value={zapato.tallas} onChange={(e) => actualizarDato(index, 'tallas', e.target.value)} className="w-2/3 border border-gray-300 p-1.5 rounded-lg text-sm" />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                    <button type="submit" disabled={guardando} className={`mt-4 w-full text-white py-3 rounded-lg font-bold text-lg transition ${guardando ? 'bg-gray-400' : 'bg-green-600 hover:bg-green-700 shadow-lg'}`}>{guardando ? 'Guardando...' : `Guardar ${listaZapatos.length} zapatos en la Tienda`}</button>
                </form>
            )}

            <hr className="my-10 border-gray-300" />

            {/* SECCIÓN 2: CATÁLOGO ACTUAL PARA BORRAR */}
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Gestión del Catálogo Actual</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                {catalogo.map((zapato) => (
                    <div key={zapato.id} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex flex-col items-center text-center">
                        {zapato.imagen_url ? (
                            <img src={zapato.imagen_url} alt={zapato.nombre} className="w-full h-32 object-cover rounded-lg mb-3 bg-gray-100" />
                        ) : (
                            <div className="w-full h-32 bg-gray-100 rounded-lg mb-3 flex items-center justify-center text-gray-400 text-xs">Sin foto</div>
                        )}
                        <h3 className="font-bold text-sm text-gray-800 line-clamp-1">{zapato.nombre}</h3>
                        <p className="text-green-600 font-black text-sm mb-4">${zapato.precio}</p>

                        <button
                            onClick={() => borrarDeLaTienda(zapato.id, zapato.nombre)}
                            className="mt-auto w-full bg-red-100 text-red-600 hover:bg-red-600 hover:text-white py-1.5 rounded-lg font-bold text-sm transition"
                        >
                            Eliminar
                        </button>
                    </div>
                ))}
            </div>
        </main>
    );
}