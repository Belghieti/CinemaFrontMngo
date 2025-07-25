import React, { useState } from "react";

export default function AddMovieForm({ onMovieAdded }) {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem("token");

    if (!token) {
      setError("Token manquant, veuillez vous reconnecter.");
      return;
    }

    try {
      console.log("token:", token);
      const res = await fetch(`${baseUrl}/api/movies`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title,
          description,
          videoUrl,
        }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        setError(`Erreur lors de l'ajout du film: ${errorText}`);
        throw new Error(`Erreur: ${res.status} - ${errorText}`);
      }

      const newMovie = await res.json(); // Le film ajouté
      onMovieAdded(newMovie); // Passer le film ajouté à la fonction onMovieAdded
      setTitle("");
      setDescription("");
      setVideoUrl("");
      setError(""); // Clear error on success
    } catch (err) {
      setError(`Erreur de connexion au serveur: ${err.message}`);
      console.error("Erreur lors de l'ajout du film:", err);
    }
  };



  return (
    <form
      onSubmit={handleSubmit}
      className="bg-slate-900 p-4 rounded-xl shadow-md border border-slate-700 w-full max-w-lg mx-auto mt-4"
    >
      <h3 className="text-lg font-bold mb-4 text-white">🎬 Ajouter un film</h3>

      <div className="space-y-3">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Titre du film"
          className="w-full p-2 rounded bg-slate-800 text-white placeholder-gray-400 border border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        />

        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description"
          className="w-full p-2 rounded bg-slate-800 text-white placeholder-gray-400 border border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        />

        <input
          type="url"
          value={videoUrl}
          onChange={(e) => setVideoUrl(e.target.value)}
          placeholder="URL de la vidéo"
          className="w-full p-2 rounded bg-slate-800 text-white placeholder-gray-400 border border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        />

        <button
          type="submit"
          className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2 px-4 rounded transition"
        >
          ➕ Ajouter le film
        </button>

        {error && (
          <div className="mt-4 text-red-500">
            <p>{error}</p>
          </div>
        )}
      </div>
    </form>
  );
}
