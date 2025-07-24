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
        <h1 className="text-xl sm:text-3xl font-extrabold bg-gradient-to-r from-fuchsia-500 to-cyan-400 text-transparent bg-clip-text">
          🎬 CinéSync – Le cinéma ensemble, même à distance
        </h1>
        {userInfo && (
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="font-semibold text-sm">{userInfo.username}</p>
              <p className="text-xs text-gray-400">ID: {userInfo.id}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-cyan-600 flex items-center justify-center font-bold text-white ring-2 ring-cyan-300">
              {userInfo.username?.charAt(0).toUpperCase()}
            </div>
            <button
              onClick={handleLogout}
              className="bg-red-600 hover:bg-red-700 px-3 py-1 rounded-lg text-sm font-medium transition"
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
              <div className="bg-white/10 p-5 rounded-2xl shadow-xl backdrop-blur transition hover:scale-[1.02]">
                <h2 className="text-lg font-semibold text-pink-400 mb-3">
                  🎞️ Ajouter un film
                </h2>
                <AddMovieForm onMovieAdded={() => {}} />
              </div>
              <div className="bg-white/10 p-5 rounded-2xl shadow-xl backdrop-blur transition hover:scale-[1.02]">
                <h2 className="text-lg font-semibold text-emerald-400 mb-3">
                  📦 Créer une salle
                </h2>
                <CreateBoxForm />
              </div>
              <div className="bg-white/10 p-5 rounded-2xl shadow-xl backdrop-blur transition hover:scale-[1.02]">
                <h2 className="text-lg font-semibold text-yellow-300 mb-3">
                  🔑 Rejoindre une salle
                </h2>
                <JoinRoomComponent />
              </div>
            </div>

            {/* RIGHT PANEL – WELCOME */}
            <div className="md:col-span-2 bg-white/5 p-6 rounded-2xl border border-white/10 shadow-inner text-gray-200 space-y-4">
              <h2 className="text-3xl font-extrabold text-cyan-400 mb-2">
                ✨ Bienvenue sur CinéSync
              </h2>
              <p className="leading-relaxed">
                <span className="text-white font-semibold">CinéSync</span> est
                votre plateforme de streaming partagé :{" "}
                <span className="text-green-400 font-semibold">
                  regardez des films entre amis, même à distance
                </span>
                , avec une synchronisation automatique parfaite.
              </p>

              <ul className="list-disc pl-6 space-y-1">
                <li>📽️ Créez une salle (box) privée</li>
                <li>🔗 Invitez vos amis via un lien ou un ID</li>
                <li>🎬 Lancez le film et profitez ensemble, synchronisés</li>
                <li>💬 Ambiance conviviale garantie, à distance !</li>
              </ul>

              <div className="bg-cyan-600/10 p-4 rounded-xl text-sm text-cyan-300 mt-4">
                🎯 <strong>Plus besoin de dire :</strong>{" "}
                <em>« T'appuies sur lecture maintenant ? »</em>
                <br />
                CinéSync synchronise automatiquement la vidéo sur tous les
                écrans.
              </div>

              <div className="text-sm text-gray-400 mt-6 italic">
                💡 Plateforme en version bêta – Testez, invitez, et amusez-vous
                librement !
                <br />
                Créée avec ❤️ par{" "}
                <span className="text-white font-bold">BELGHIETI MOHAMED</span>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* FOOTER */}
      <footer className="text-center text-xs text-gray-500 py-4 border-t border-white/10">
        🎥 CinéSync – Vivez le cinéma ensemble, même à distance | Ma9 Ma9 Harira
        😄
      </footer>
    </div>
  );
}
