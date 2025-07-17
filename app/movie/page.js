"use client";

import { useEffect, useState } from "react";
import axios from "axios";

export default function MoviePage() {
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Récupérer le token du localStorage
    const token = localStorage.getItem("token"); // Remplace 'authToken' par la clé exacte de ton token dans localStorage

    // Vérifier si le token est présent
    if (token) {
      axios
        .get("http://localhost:8080/movie", {
          headers: {
            Authorization: `Bearer ${token}`, // Ajouter le token dans l'en-tête de la requête
          },
        })
        .then((response) => {
          setMovies(response.data);
          setError(null);
        })
        .catch((err) => {
          console.error(err);
          setError("Erreur lors du chargement des films.");
        })
        .finally(() => setLoading(false));
    } else {
      setError("Token d'authentification non trouvé.");
      setLoading(false);
    }
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <h1 className="text-3xl font-bold text-center mb-8 text-blue-600">
        Liste des Films
      </h1>

      {loading && (
        <p className="text-center text-gray-500">Chargement en cours...</p>
      )}

      {error && <p className="text-center text-red-500">{error}</p>}

      {!loading && !error && movies.length === 0 && (
        <p className="text-center text-gray-500">Aucun film trouvé.</p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {movies.map((movie) => (
          <div
            key={movie.id}
            className="bg-white rounded-xl shadow-md p-4 hover:shadow-lg transition-all duration-300"
          >
            <h2 className="text-xl font-semibold text-gray-800">
              {movie.title}
            </h2>
            <p className="text-gray-600 mt-2">{movie.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
