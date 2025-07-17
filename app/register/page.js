"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  console.log("BASE URL =", baseUrl);
  if (!baseUrl) {
    console.error("NEXT_PUBLIC_API_BASE_URL is not defined");
    return <div>Error: API base URL is not defined.</div>;
  }
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();
  const [message, setMessage] = useState(null);

  const handleRegister = async () => {
    setMessage(null);
    try {
      const res = await fetch(`${baseUrl}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password }),
      });

      const text = await res.text();
      if (res.ok) {
        setMessage("✅ Inscription réussie !");
        setTimeout(() => router.push("/"), 1500); // Rediriger vers login après succès
      } else {
        setMessage("❌ " + text);
      }
    } catch (error) {
      console.error(error);
      setMessage("❌ Une erreur s’est produite.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-4">
      <div className="w-full max-w-sm bg-white/10 p-8 rounded-2xl shadow-md backdrop-blur text-white">
        <h2 className="text-2xl font-bold text-center mb-6 text-blue-400">
          📝 Créer un compte
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
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Adresse email"
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
            onClick={handleRegister}
            className="w-full bg-blue-600 hover:bg-blue-700 transition-all text-white font-semibold py-2 rounded-lg shadow-md"
          >
            S'inscrire
          </button>
        </div>

        {/* Message de feedback */}
        {message && (
          <p className="text-sm text-center mt-4 text-yellow-300">{message}</p>
        )}

        {/* Lien vers Login */}
        <p className="text-sm text-center text-gray-300 mt-6">
          Déjà un compte ?{" "}
          <span
            onClick={() => router.push("/")}
            className="text-blue-400 hover:underline cursor-pointer"
          >
            Se connecter
          </span>
        </p>
      </div>
    </div>
  );
}
