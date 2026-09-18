"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AuthPage() {
    const [paso, setPaso] = useState('login'); // Puede ser 'login', 'registro' o 'verificacion'
    const [nombre, setNombre] = useState('');
    const [correo, setCorreo] = useState('');
    const [password, setPassword] = useState('');
    const [codigo, setCodigo] = useState('');
    const router = useRouter();

    const manejarEnvio = async (e) => {
        e.preventDefault();

        if (paso === 'registro') {
            const res = await fetch('http://localhost:3000/api/registro', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nombre, correo, password }),
            });
            const data = await res.json();
            if (!res.ok) return alert(data.error);

            alert(data.mensaje); // "Revisa tu correo..."
            setPaso('verificacion');
        }

        else if (paso === 'verificacion') {
            const res = await fetch('http://localhost:3000/api/verificar', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ correo, codigo }),
            });
            const data = await res.json();
            if (!res.ok) return alert(data.error);

            alert(data.mensaje); // "Verificado con éxito"
            setPaso('login');
            setPassword(''); // Limpiamos la contraseña por seguridad
        }
        else if (paso === 'login') {
            const res = await fetch('http://localhost:3000/api/login', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ correo, password }),
            });
            const data = await res.json();

            if (!res.ok) {
                // === NUEVA LÓGICA INTELIGENTE ===
                if (data.error === 'Debes verificar tu correo primero.') {
                    alert('Aún no has verificado tu cuenta. Te llevaremos a la pantalla para ingresar el código.');
                    setPaso('verificacion'); // Lo pasamos a la pantalla de código automáticamente
                    return;
                }
                return alert(data.error);
            }

            localStorage.setItem('token', data.token);
            localStorage.setItem('usuario', JSON.stringify(data.usuario));

            router.push('/');
        }
    };

    return (
        <main className="min-h-screen flex items-center justify-center bg-gray-50 p-4 font-sans">
            <div className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-md border border-gray-100">
                <div className="text-center mb-6">
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight">CP Store</h1>
                    <p className="text-gray-500 text-sm mt-1">
                        {paso === 'registro' && 'Crea tu cuenta'}
                        {paso === 'verificacion' && 'Ingresa el código que enviamos a tu correo'}
                        {paso === 'login' && 'Inicia sesión'}
                    </p>
                </div>

                <form onSubmit={manejarEnvio} className="space-y-4">
                    {(paso === 'registro') && (
                        <div>
                            <label className="block text-gray-700 font-bold mb-1 text-sm">Nombre completo</label>
                            <input type="text" required value={nombre} onChange={(e) => setNombre(e.target.value)} className="w-full border-2 border-gray-200 p-3 rounded-xl focus:border-black text-sm" />
                        </div>
                    )}

                    {(paso === 'registro' || paso === 'login') && (
                        <>
                            <div>
                                <label className="block text-gray-700 font-bold mb-1 text-sm">Correo electrónico</label>
                                <input type="email" required value={correo} onChange={(e) => setCorreo(e.target.value)} disabled={paso === 'verificacion'} className="w-full border-2 border-gray-200 p-3 rounded-xl focus:border-black text-sm" />
                            </div>
                            <div>
                                <label className="block text-gray-700 font-bold mb-1 text-sm">Contraseña</label>
                                <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full border-2 border-gray-200 p-3 rounded-xl focus:border-black text-sm" />
                            </div>
                        </>
                    )}

                    {paso === 'verificacion' && (
                        <div>
                            <label className="block text-gray-700 font-bold mb-1 text-sm text-center">Código de 6 dígitos</label>
                            <input type="text" required maxLength="6" placeholder="000000" value={codigo} onChange={(e) => setCodigo(e.target.value)} className="w-full border-2 border-gray-200 p-4 rounded-xl focus:border-black text-2xl text-center tracking-widest font-black" />
                        </div>
                    )}

                    <button type="submit" className="w-full bg-black text-white font-bold py-3.5 rounded-xl hover:bg-gray-800 transition shadow-md mt-2">
                        {paso === 'registro' && 'Registrarse'}
                        {paso === 'verificacion' && 'Verificar Código'}
                        {paso === 'login' && 'Iniciar Sesión'}
                    </button>
                </form>

                {paso !== 'verificacion' && (
                    <div className="text-center mt-6">
                        <button onClick={() => setPaso(paso === 'login' ? 'registro' : 'login')} className="text-sm text-gray-600 hover:text-black font-semibold transition">
                            {paso === 'login' ? '¿No tienes cuenta? Regístrate aquí' : '¿Ya tienes cuenta? Inicia sesión'}
                        </button>
                    </div>
                )}
            </div>
        </main>
    );
}