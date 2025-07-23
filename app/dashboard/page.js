"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import VideoSyncComponent from "../components/VideoSyncComponent";
import CreateBoxForm from "../components/CreateBoxForm";
import AddMovieForm from "../components/AddMovieForm";
import JoinRoomComponent from "../components/JoinRoomComponent";
export default function Dashboard() {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  const [userInfo, setUserInfo] = useState(null);
  const [boxId, setBoxId] = useState(null); // État pour stocker l'ID de la box
  const router = useRouter();

  const handleMovieAdded = (newMovie) => {
    console.log("Film ajouté :", newMovie);
  };

  const joinBox = async (boxId) => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/");
      return;
    }

    try {
      const userId = userInfo.id; // ID de l'utilisateur (assumé comme étant déjà récupéré)

      const response = await fetch(
        `${baseUrl}/api/boxes/${boxId}/join?userId=${userId}`,
        {
          method: "GET",
          headers: {
            Authorization: "Bearer " + token,
          },
        }
      );

      const data = await response.json();

      if (response.ok && data.status === "success") {
        // Rediriger vers la page de la box
        router.push(`/box/${data.boxId}?token=${token}`);
      } else {
        alert(data.message || "Accès refusé");
      }
    } catch (error) {
      console.error("Erreur lors de la tentative de rejoindre la box :", error);
    }
  };

  const handleLogout = () => {
    // Supprimer le token de session et rediriger vers la page d'accueil
    localStorage.removeItem("token");
    router.push("/");
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/");
      return;
    }

    fetch(`${baseUrl}/auth/getUserInfo`, {
      headers: {
        Authorization: "Bearer " + token,
      },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Non autorisé");
        return res.json();
      })
      .then((data) => setUserInfo(data))
      .catch((err) => {
        console.error(err);
        router.push("/");
      });
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-tr from-slate-900 via-slate-800 to-slate-900 text-white flex flex-col font-sans">
      {/* HEADER */}
      <header className="w-full flex justify-between items-center p-6 border-b border-white/10 backdrop-blur bg-white/5 shadow-md">
        <h1 className="text-2xl sm:text-3xl font-extrabold bg-gradient-to-r from-blue-400 to-blue-600 text-transparent bg-clip-text">
          🎬 Cinema en ligne
        </h1>
        {userInfo && (
          <div className="flex items-center gap-4">
            <div className="flex flex-col text-right">
              <span className="text-sm font-medium text-gray-200">
                {userInfo.username}
              </span>
              <span className="text-xs text-gray-400">ID: {userInfo.id}</span>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-blue-500 flex items-center justify-center text-lg font-bold shadow-md ring-2 ring-blue-300">
              {userInfo.username?.charAt(0).toUpperCase()}
            </div>
            {/* Button to Logout */}
            <button
              onClick={handleLogout}
              className="px-1 py-1 bg-bleu-400 text-white rounded-xl hover:bg-red-600 transition duration-200 ease-in-out"
            >
              Déconnexion
            </button>
          </div>
        )}
      </header>

      {/* MAIN */}
      <main className="flex-1 p-4 sm:p-6 overflow-y-auto">
        {!userInfo ? (
          <div className="flex items-center justify-center h-full animate-pulse">
            <p className="text-gray-400 text-lg">
              Chargement de votre session...
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
            {/* LEFT SIDE: Forms */}
            <div className="col-span-1 md:col-span-1 space-y-6">
              <div className="bg-white/10 rounded-2xl shadow-md p-5 backdrop-blur hover:scale-105 transition duration-300">
                <h2 className="text-xl font-semibold mb-4 text-blue-300">
                  🎥 Ajouter un film
                </h2>
                <AddMovieForm onMovieAdded={handleMovieAdded} />
              </div>
              <div className="bg-white/10 rounded-2xl shadow-md p-5 backdrop-blur hover:scale-105 transition duration-300">
                <h2 className="text-xl font-semibold mb-4 text-blue-300">
                  📦 Créer une box
                </h2>
                <CreateBoxForm />
              </div>
              {/* Bouton pour rejoindre la box */}
              <div className="bg-white/10 rounded-2xl shadow-md p-5 backdrop-blur hover:scale-105 transition duration-300">
                <h2 className="text-xl font-semibold mb-4 text-blue-300">
                  🔗 Rejoindre une box
                </h2>
                <input
                  type="number"
                  placeholder="Entrez l'ID de la box"
                  className="w-full p-2 mb-3 rounded bg-slate-800 text-white border border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={boxId || ""}
                  onChange={(e) => setBoxId(e.target.value)}
                />
                <button
                  onClick={() => joinBox(boxId)}
                  className="w-full px-4 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition duration-200 ease-in-out transform hover:scale-105"
                >
                  Rejoindre la box
                </button>

                <div>
                  <JoinRoomComponent />
                </div>
              </div>
            </div>

            {/* RIGHT SIDE: Placeholder pour VideoSyncComponent ou autre */}
            <div className="md:col-span-2">
              <div className="bg-white/5 p-6 rounded-2xl h-full border border-white/10 shadow-inner flex items-center justify-center text-gray-400 italic">
                🎬 Vidéo à venir... (Composant VideoSyncComponent)
              </div>
              {/* Tu peux décommenter la ligne ci-dessous quand tu veux intégrer le composant */}
              {/* <VideoSyncComponent /> */}
            </div>
          </div>
        )}
      </main>

      {/* FOOTER */}
      <footer className="text-center text-xs text-gray-400 py-4 border-t border-white/10">
        Ma9 Ma9 Harira
      </footer>
    </div>
  );
}
