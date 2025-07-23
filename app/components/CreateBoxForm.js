"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import InvitationsPage from "./Invitation";

export default function AddBoxForm() {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  const router = useRouter();
  const [token, setToken] = useState("");
  const [movieId, setMovieId] = useState("");
  const [boxName, setBoxName] = useState("");
  const [movies, setMovies] = useState([]);

  useEffect(() => {
    const storedToken = localStorage.getItem("token");

    if (!storedToken) {
      // Si pas de token, rediriger vers la page de connexion
      router.push("/");
      return;
    }

    setToken(storedToken);

    const fetchMovies = async () => {
      try {
        const res = await fetch(`${baseUrl}/api/movies/user`, {
          headers: {
            Authorization: `Bearer ${storedToken}`,
          },
        });

        if (!res.ok) throw new Error("Failed to fetch movies");

        const data = await res.json();
        setMovies(data);
      } catch (error) {
        console.error(error);
        router.push("/");
      }
    };

    fetchMovies();
  }, [router]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // On prépare les données pour la requête
    const params = new URLSearchParams({
      movieId: movieId,
      name: boxName,
    });

    try {
      const res = await fetch(
        `${baseUrl}/api/boxes/create?${params.toString()}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!res.ok) {
        throw new Error("Erreur lors de la création de la box");
      }

      const data = await res.json();

      // Afficher les informations reçues pour déboguer
      console.log("Box créée avec succès :", data);

      // Redirection vers la page de la box nouvellement créée avec le token
      router.push(`/box/${data.id}?token=${token}`);
    } catch (error) {
      alert(error.message);
    }
  };

  return (
    <div className="p-4 max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-4">Créer une nouvelle Box</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="text"
          value={boxName}
          onChange={(e) => setBoxName(e.target.value)}
          placeholder="Nom de la Box"
          className="w-full p-2 border rounded"
          required
        />
        <select
          value={movieId}
          onChange={(e) => setMovieId(e.target.value)}
          className="w-full p-2 rounded bg-slate-800 text-white border border-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
          required
        >
          <option value="">Choisir un film</option>
          {movies.map((movie) => (
            <option key={movie.id} value={movie.id}>
              {movie.title}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700"
        >
          Créer la Box
        </button>
          </form>
          <InvitationsPage/>    
    </div>
  );
}
