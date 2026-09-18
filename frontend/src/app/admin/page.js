"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminPanel() {
    const [zapatos, setZapatos] = useState([]);
    const [nombre, setNombre] = useState('');
    const [marca, setMarca] = useState('');
    const [precio, setPrecio] = useState('');
    const [tallas, setTallas] = useState('');
    const [imagenes, setImagenes] = useState([]);
    const [previews, setPreviews] = useState([]);

    // Estado para modal de edición
    const [editando, setEditando] = useState(null);
    const [editNombre, setEditNombre] = useState('');
    const [editMarca, setEditMarca] = useState('');
    const [editPrecio, setEditPrecio] = useState('');

    const router = useRouter();

    useEffect(() => {
        const usuario = JSON.parse(localStorage.getItem('usuario'));
        if (!usuario || usuario.rol !== 'admin') {
            router.push('/');
            return;
        }
        cargarZapatos();
    }, []);

    const cargarZapatos = async () => {
        const res = await fetch('http://localhost:3000/zapatos');
        const data = await res.json();
        setZapatos(data);
    };

    const manejarImagenes = (e) => {
        const files = Array.from(e.target.files);
        if (files.length > 25) {
            alert('Máximo 25 imágenes por producto.');
            return;
        }
        setImagenes(files);
        setPreviews(files.map(file => URL.createObjectURL(file)));
    };

    const guardarZapato = async (e) => {
        e.preventDefault();
        if (imagenes.length === 0) {
            alert('Selecciona al menos una imagen.');
            return;
        }

        const formData = new FormData();
        formData.append('nombre', nombre);
        formData.append('marca', marca);
        formData.append('precio', precio);

        const arregloTallas = tallas.split(',').map(t => t.trim()).filter(t => t !== '');
        formData.append('tallas', JSON.stringify(arregloTallas));
        imagenes.forEach(img => formData.append('imagenes', img));

        const res = await fetch('http://localhost:3000/zapatos', {
            method: 'POST',
            body: formData
        });

        if (res.ok) {
            alert('¡Producto guardado!');
            setNombre(''); setMarca(''); setPrecio(''); setTallas(''); setImagenes([]); setPreviews([]);
            cargarZapatos();
        } else {
            alert('Error al guardar.');
        }
    };

    const abrirEdicion = (zapato) => {
        setEditando(zapato.id);
        setEditNombre(zapato.nombre);
        setEditMarca(zapato.marca);
        setEditPrecio(zapato.precio);
    };

    const guardarEdicion = async (e) => {
        e.preventDefault();
        const res = await fetch(`http://localhost:3000/zapatos/${editando}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nombre: editNombre, marca: editMarca, precio: editPrecio })
        });

        if (res.ok) {
            setEditando(null);
            cargarZapatos();
        } else {
            alert('Error al actualizar.');
        }
    };

    const eliminarZapato = async (id) => {
        if (confirm('¿Eliminar este producto?')) {
            await fetch(`http://localhost:3000/zapatos/${id}`, { method: 'DELETE' });
            cargarZapatos();
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white p-8 font-sans">
            <div className="max-w-6xl mx-auto">
                <header className="flex justify-between items-center mb-10 border-b border-gray-800 pb-6">
                    <div className="flex items-center gap-4">
                        <img src="/logo.png" alt="CP Store" className="h-12 w-12 rounded-full border border-[#C5A059]" />
                        <h1 className="text-3xl font-black text-[#C5A059]">Panel de Control</h1>
                    </div>
                    <button onClick={() => router.push('/')} className="bg-gray-800 text-gray-300 px-5 py-2 rounded-lg font-bold hover:bg-gray-700 transition border border-gray-700">
                        Volver a la Tienda
                    </button>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                    <div className="bg-gray-800/50 p-6 rounded-2xl border border-gray-700 shadow-xl backdrop-blur-sm h-fit">
                        <h2 className="text-xl font-bold mb-6 text-white border-b border-gray-700 pb-2">Agregar Nuevo Zapato</h2>
                        <form onSubmit={guardarZapato} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Nombre Descriptivo</label>
                                <input type="text" placeholder="Ej: Samba" value={nombre} onChange={(e) => setNombre(e.target.value)} required className="w-full bg-gray-900 border border-gray-600 rounded-lg p-3 text-white focus:border-[#C5A059] outline-none" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Marca</label>
                                    <input type="text" placeholder="Ej: Adidas" value={marca} onChange={(e) => setMarca(e.target.value)} required className="w-full bg-gray-900 border border-gray-600 rounded-lg p-3 text-white focus:border-[#C5A059] outline-none" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Precio (COP)</label>
                                    <input type="number" placeholder="Ej: 160000" value={precio} onChange={(e) => setPrecio(e.target.value)} required className="w-full bg-gray-900 border border-gray-600 rounded-lg p-3 text-white focus:border-[#C5A059] outline-none" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Tallas (Separadas por coma)</label>
                                <input type="text" placeholder="Ej: 35, 36, 37, 38, 39" value={tallas} onChange={(e) => setTallas(e.target.value)} className="w-full bg-gray-900 border border-gray-600 rounded-lg p-3 text-white focus:border-[#C5A059] outline-none" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Fotos / Variantes</label>
                                <input type="file" onChange={manejarImagenes} accept="image/*" multiple required className="w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-bold file:bg-[#C5A059] file:text-black hover:file:bg-[#B5952F] cursor-pointer" />
                            </div>
                            {previews.length > 0 && (
                                <div className="flex gap-2 overflow-x-auto pb-2">
                                    {previews.map((prev, i) => (
                                        <img key={i} src={prev} alt="" className="h-16 w-16 object-cover rounded-lg border border-[#C5A059] flex-shrink-0" />
                                    ))}
                                </div>
                            )}
                            <button type="submit" className="w-full bg-[#C5A059] text-black font-black py-3 rounded-xl hover:bg-[#B5952F] transition shadow-lg mt-4">
                                Guardar Producto
                            </button>
                        </form>
                    </div>

                    <div className="lg:col-span-2 bg-gray-800/50 p-6 rounded-2xl border border-gray-700 shadow-xl backdrop-blur-sm">
                        <h2 className="text-xl font-bold mb-6 text-white border-b border-gray-700 pb-2">Inventario ({zapatos.length})</h2>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="text-gray-400 text-sm uppercase tracking-wider border-b border-gray-700">
                                        <th className="pb-3 pl-2">Foto</th>
                                        <th className="pb-3">Nombre</th>
                                        <th className="pb-3">Marca</th>
                                        <th className="pb-3">Precio</th>
                                        <th className="pb-3 text-right pr-2">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {zapatos.map(zapato => (
                                        <tr key={zapato.id} className="border-b border-gray-700/50 hover:bg-gray-700/30 transition">
                                            <td className="py-3 pl-2">
                                                <img src={zapato.imagenes && zapato.imagenes.length > 0 ? zapato.imagenes[0] : zapato.imagen_url} className="w-12 h-12 object-cover rounded-md border border-gray-600" />
                                            </td>
                                            <td className="py-3 font-bold text-white">{zapato.nombre}</td>
                                            <td className="py-3 text-gray-300">{zapato.marca}</td>
                                            <td className="py-3 font-black text-[#C5A059]">${Number(zapato.precio).toLocaleString('es-CO')}</td>
                                            <td className="py-3 text-right pr-2 space-x-2">
                                                <button onClick={() => abrirEdicion(zapato)} className="bg-[#C5A059]/20 text-[#C5A059] px-3 py-1 rounded hover:bg-[#C5A059] hover:text-black transition font-bold text-sm border border-[#C5A059]/40">
                                                    Editar
                                                </button>
                                                <button onClick={() => eliminarZapato(zapato.id)} className="bg-red-500/10 text-red-400 px-3 py-1 rounded hover:bg-red-500 hover:text-white transition font-bold text-sm border border-red-500/20">
                                                    Eliminar
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* MODAL PARA ACTUALIZAR PRECIO */}
                {editando && (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div className="bg-gray-900 border border-gray-700 p-6 rounded-2xl w-full max-w-md shadow-2xl">
                            <h3 className="text-xl font-bold text-[#C5A059] mb-4">Modificar Datos de Producto</h3>
                            <form onSubmit={guardarEdicion} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Nombre</label>
                                    <input type="text" value={editNombre} onChange={(e) => setEditNombre(e.target.value)} required className="w-full bg-gray-800 border border-gray-600 rounded-lg p-3 text-white outline-none focus:border-[#C5A059]" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Marca</label>
                                    <input type="text" value={editMarca} onChange={(e) => setEditMarca(e.target.value)} required className="w-full bg-gray-800 border border-gray-600 rounded-lg p-3 text-white outline-none focus:border-[#C5A059]" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Precio (COP sin puntos)</label>
                                    <input type="number" value={editPrecio} onChange={(e) => setEditPrecio(e.target.value)} required className="w-full bg-gray-800 border border-gray-600 rounded-lg p-3 text-white outline-none focus:border-[#C5A059]" />
                                </div>
                                <div className="flex justify-end gap-3 pt-4 border-t border-gray-800">
                                    <button type="button" onClick={() => setEditando(null)} className="px-4 py-2 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 font-bold text-sm">Cancelar</button>
                                    <button type="submit" className="px-5 py-2 bg-[#C5A059] text-black rounded-lg hover:bg-[#B5952F] font-black text-sm">Guardar Cambios</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}