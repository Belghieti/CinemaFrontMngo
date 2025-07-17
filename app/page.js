"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

  const [username, setUsername] = useState("TestPFA");
  const [password, setPassword] = useState("1234");
  const router = useRouter();

  const handleLogin = async () => {
    const res = await fetch(`${baseUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    if (res.ok) {
      const data = await res.json();
      localStorage.setItem("token", data.token);
      router.push("/dashboard");
    } else {
      alert("Login échoué");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-4">
      <div className="w-full max-w-sm bg-white/10 p-8 rounded-2xl shadow-md backdrop-blur text-white">
        <h2 className="text-2xl font-bold text-center mb-6 text-blue-400">
          🔐 Connexion
        </h2>
        <div className="space-y-4">
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Nom d'utilisateur"
            className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 placeholder-gray-300 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mot de passe"
            className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 placeholder-gray-300 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleLogin}
            className="w-full bg-blue-600 hover:bg-blue-700 transition-all text-white font-semibold py-2 rounded-lg shadow-md"
          >
            Se connecter
          </button>

          {/* Lien vers Register */}
          <p className="text-sm text-center text-gray-300 mt-4">
            Pas encore de compte ?{" "}
            <span
              onClick={() => router.push("/register")}
              className="text-blue-400 hover:underline cursor-pointer"
            >
              S'inscrire ici
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
