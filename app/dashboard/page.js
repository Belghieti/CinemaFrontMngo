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
  const router = useRouter();

  const handleLogout = () => {
    localStorage.removeItem("token");
    router.push("/");
  };

  const fetchUserInfo = () => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/");
      return;
    }

    fetch(`${baseUrl}/auth/getUserInfo`, {
      headers: { Authorization: "Bearer " + token },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Unauthorized");
        return res.json();
      })
      .then(setUserInfo)
      .catch((err) => {
        console.error(err);
        router.push("/");
      });
  };

  useEffect(() => {
    fetchUserInfo();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-tr from-slate-900 via-slate-800 to-slate-900 text-white font-sans flex flex-col">
      {/* HEADER */}
      <header className="w-full flex justify-between items-center p-6 border-b border-white/10 bg-white/5 backdrop-blur shadow-md">
        <h1 className="text-xl sm:text-3xl font-extrabold bg-gradient-to-r from-pink-400 to-blue-500 text-transparent bg-clip-text">
          🎬 CinéSync – Cinéma partagé, à distance !
        </h1>
        {userInfo && (
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="font-semibold text-sm text-white">
                {userInfo.username}
              </p>
              <p className="text-xs text-gray-400">ID: {userInfo.id}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold ring-2 ring-blue-300">
              {userInfo.username?.charAt(0).toUpperCase()}
            </div>
            <button
              onClick={handleLogout}
              className="bg-red-600 hover:bg-red-700 px-3 py-1 rounded-lg text-sm font-medium"
            >
              Déconnexion
            </button>
          </div>
        )}
      </header>

      {/* MAIN CONTENT */}
      <main className="flex-1 p-6">
        {!userInfo ? (
          <div className="flex justify-center items-center h-full">
            <p className="text-gray-400 animate-pulse text-lg">
              Chargement de votre espace personnel...
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
            {/* LEFT PANEL */}
            <div className="space-y-6">
              <div className="bg-white/10 p-5 rounded-2xl shadow-lg backdrop-blur transition hover:scale-[1.02]">
                <h2 className="text-lg font-semibold text-pink-400 mb-3">
                  🎞️ Ajouter un film
                </h2>
                <AddMovieForm onMovieAdded={() => {}} />
              </div>
              <div className="bg-white/10 p-5 rounded-2xl shadow-lg backdrop-blur transition hover:scale-[1.02]">
                <h2 className="text-lg font-semibold text-emerald-400 mb-3">
                  📦 Créer une salle (Box)
                </h2>
                <CreateBoxForm />
              </div>
              <div className="bg-white/10 p-5 rounded-2xl shadow-lg backdrop-blur transition hover:scale-[1.02]">
                <h2 className="text-lg font-semibold text-yellow-300 mb-3">
                  🔑 Rejoindre une room
                </h2>
                <JoinRoomComponent />
              </div>
            </div>

            {/* RIGHT PANEL */}
            <div className="md:col-span-2 bg-white/5 p-6 rounded-2xl border border-white/10 shadow-inner text-gray-200 space-y-4">
              <h2 className="text-2xl font-bold text-blue-300">
                Bienvenue sur CinéSync 🎉
              </h2>
              <p>
                <strong>CinéSync</strong> est une plateforme qui vous permet de{" "}
                <span className="text-green-400 font-semibold">
                  regarder des films avec vos amis à distance
                </span>
                , tout en restant synchronisés !
              </p>

              <ul className="list-disc pl-5 space-y-1">
                <li>Créer une salle (box) pour démarrer une session</li>
                <li>Inviter des amis via un lien ou un ID</li>
                <li>Regarder le film ensemble, synchronisé</li>
                <li>Partage, plaisir, et ambiance cinéma à distance 🎬</li>
              </ul>

              <p className="mt-4">
                Plus besoin de dire "t'appuies sur lecture maintenant ?" 😅
                Grâce à notre système de synchronisation en temps réel,{" "}
                <span className="text-purple-400 font-semibold">
                  tout le monde voit le même moment du film
                </span>{" "}
                sans aucun effort !
              </p>

              <div className="text-sm text-gray-400 mt-6 italic">
                💡 En version bêta – Amusez-vous à tester, inviter et partager !
                <br />
                Créé avec ❤️ par{" "}
                <span className="text-white font-bold">BELGHIETI MOHAMED</span>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* FOOTER */}
      <footer className="text-center text-xs text-gray-400 py-4 border-t border-white/10">
        🎥 CinéSync – Une expérience cinéma 100% connectée. | Ma9 Ma9 Harira 😄
      </footer>
    </div>
  );
}
