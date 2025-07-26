"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import VideoSyncComponent from "../components/VideoSyncComponent";
import CreateBoxForm from "../components/CreateBoxForm";
import AddMovieForm from "../components/AddMovieForm";
import JoinRoomComponent from "../components/JoinRoomComponent";
import AdBanner from "../components/AdBanner";

export default function Dashboard() {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  const [userInfo, setUserInfo] = useState(null);
  const router = useRouter();

  const handleLogout = async () => {
    const token = localStorage.getItem("token");

    if (!token) {
      alert("Vous n'êtes pas connecté");
      return;
    }

    try {
      const res = await fetch(
        "https://cinemamongo-production.up.railway.app/auth/logout",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!res.ok) {
        alert("Erreur lors de la déconnexion");
        return;
      }

      localStorage.removeItem("token");
      alert("Déconnexion réussie !");
      router.push("/");
    } catch (error) {
      alert("Erreur réseau lors de la déconnexion");
    }
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
    <div className="min-h-screen bg-gradient-to-br from-purple-950 via-slate-900 to-indigo-950 text-white font-inter relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(120,119,198,0.3),transparent)] pointer-events-none"></div>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(168,85,247,0.2),transparent)] pointer-events-none"></div>

      <AdBanner />

      {/* HEADER */}
      <header className="relative z-10 w-full flex justify-between items-center p-6 border-b border-white/10 bg-black/20 backdrop-blur-xl shadow-2xl">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-lg">
            <span className="text-2xl">🎬</span>
          </div>
          <div>
            <h1 className="text-2xl sm:text-4xl font-black bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 text-transparent bg-clip-text">
              CinéSync
            </h1>
            <p className="text-sm text-gray-400 font-light">
              Le cinéma ensemble, même à distance
            </p>
          </div>
        </div>

        {userInfo && (
          <div className="flex items-center gap-6">
            <div className="text-right hidden sm:block">
              <p className="font-semibold text-lg text-white">
                {userInfo.username}
              </p>
              <p className="text-xs text-purple-300">ID: {userInfo.id}</p>
            </div>
            <div className="relative">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center font-bold text-white shadow-lg ring-4 ring-purple-500/20">
                {userInfo.username?.charAt(0).toUpperCase()}
              </div>
              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-gray-900"></div>
            </div>
            <button
              onClick={handleLogout}
              className="group bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-300 shadow-lg hover:shadow-red-500/25 hover:scale-105 active:scale-95"
            >
              <span className="flex items-center space-x-2">
                <span>Déconnexion</span>
                <svg
                  className="w-4 h-4 group-hover:translate-x-1 transition-transform"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  />
                </svg>
              </span>
            </button>
          </div>
        )}
      </header>

      {/* MAIN CONTENT */}
      <main className="relative z-10 flex-1 p-6">
        {!userInfo ? (
          <div className="flex justify-center items-center h-96">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="text-gray-300 text-xl font-light">
                Chargement de votre espace personnel...
              </p>
            </div>
          </div>
        ) : (
          <div className="max-w-7xl mx-auto">
            {/* Hero Section */}
            <div className="text-center mb-12 py-8">
              <h2 className="text-5xl sm:text-6xl font-black bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 text-transparent bg-clip-text mb-4">
                Bienvenue sur CinéSync
              </h2>
              <p className="text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
                Votre plateforme de streaming partagé révolutionnaire. Regardez
                des films entre amis avec une synchronisation parfaite, même à
                distance.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* LEFT PANEL - Actions */}
              <div className="lg:col-span-1 space-y-6">
                {/* Add Movie Card */}
                <div className="group bg-gradient-to-br from-pink-500/10 to-rose-500/10 backdrop-blur-xl p-6 rounded-3xl border border-pink-500/20 hover:border-pink-500/40 transition-all duration-500 hover:scale-[1.02] hover:shadow-2xl hover:shadow-pink-500/10">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-rose-500 rounded-2xl flex items-center justify-center text-2xl shadow-lg">
                      🎞️
                    </div>
                    <h3 className="text-xl font-bold text-pink-400">
                      Ajouter un film
                    </h3>
                  </div>
                  <p className="text-gray-400 text-sm mb-4">
                    Partagez vos films préférés avec vos amis
                  </p>
                  <AddMovieForm onMovieAdded={() => {}} />
                </div>

                {/* Create Room Card */}
                <div className="group bg-gradient-to-br from-emerald-500/10 to-teal-500/10 backdrop-blur-xl p-6 rounded-3xl border border-emerald-500/20 hover:border-emerald-500/40 transition-all duration-500 hover:scale-[1.02] hover:shadow-2xl hover:shadow-emerald-500/10">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-2xl flex items-center justify-center text-2xl shadow-lg">
                      📦
                    </div>
                    <h3 className="text-xl font-bold text-emerald-400">
                      Créer une salle
                    </h3>
                  </div>
                  <p className="text-gray-400 text-sm mb-4">
                    Créez votre espace privé pour vos séances
                  </p>
                  <CreateBoxForm />
                </div>

                {/* Join Room Card */}
                <div className="group bg-gradient-to-br from-amber-500/10 to-orange-500/10 backdrop-blur-xl p-6 rounded-3xl border border-amber-500/20 hover:border-amber-500/40 transition-all duration-500 hover:scale-[1.02] hover:shadow-2xl hover:shadow-amber-500/10">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl flex items-center justify-center text-2xl shadow-lg">
                      🔑
                    </div>
                    <h3 className="text-xl font-bold text-amber-400">
                      Rejoindre une salle
                    </h3>
                  </div>
                  <p className="text-gray-400 text-sm mb-4">
                    Rejoignez vos amis dans leur salle
                  </p>
                  <JoinRoomComponent />
                </div>
              </div>

              {/* RIGHT PANEL - Welcome & Features */}
              <div className="lg:col-span-2 bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-xl p-8 rounded-3xl border border-white/10 shadow-2xl">
                <div className="space-y-8">
                  {/* Welcome Section */}
                  <div className="text-center lg:text-left">
                    <div className="flex items-center justify-center lg:justify-start space-x-3 mb-6">
                      <span className="text-4xl">✨</span>
                      <h2 className="text-4xl font-black text-transparent bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text">
                        Bienvenue !
                      </h2>
                    </div>
                    <p className="text-lg text-gray-300 leading-relaxed mb-8">
                      <span className="text-white font-semibold">CinéSync</span>{" "}
                      révolutionne votre façon de regarder des films.
                      <span className="text-cyan-400 font-semibold">
                        {" "}
                        Synchronisation parfaite, expérience partagée
                      </span>
                      , moments inoubliables garantis.
                    </p>
                  </div>

                  {/* Features Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-gradient-to-br from-purple-500/10 to-blue-500/10 p-6 rounded-2xl border border-purple-500/20">
                      <div className="text-3xl mb-3">📽️</div>
                      <h4 className="font-bold text-white mb-2">
                        Salles Privées
                      </h4>
                      <p className="text-sm text-gray-400">
                        Créez votre espace personnel et invitez qui vous voulez
                      </p>
                    </div>

                    <div className="bg-gradient-to-br from-green-500/10 to-teal-500/10 p-6 rounded-2xl border border-green-500/20">
                      <div className="text-3xl mb-3">🔗</div>
                      <h4 className="font-bold text-white mb-2">
                        Partage Facile
                      </h4>
                      <p className="text-sm text-gray-400">
                        Partagez simplement via un lien ou un code d'accès
                      </p>
                    </div>

                    <div className="bg-gradient-to-br from-pink-500/10 to-red-500/10 p-6 rounded-2xl border border-pink-500/20">
                      <div className="text-3xl mb-3">🎬</div>
                      <h4 className="font-bold text-white mb-2">
                        Sync Parfaite
                      </h4>
                      <p className="text-sm text-gray-400">
                        Synchronisation automatique sur tous les écrans
                      </p>
                    </div>

                    <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 p-6 rounded-2xl border border-amber-500/20">
                      <div className="text-3xl mb-3">💬</div>
                      <h4 className="font-bold text-white mb-2">
                        Chat Intégré
                      </h4>
                      <p className="text-sm text-gray-400">
                        Discutez pendant le film avec vos amis
                      </p>
                    </div>
                  </div>

                  {/* Call to Action */}
                  <div className="bg-gradient-to-r from-cyan-500/10 to-purple-500/10 p-6 rounded-2xl border border-cyan-500/20 text-center">
                    <h4 className="text-xl font-bold text-cyan-400 mb-2">
                      Fini les "Tu appuies sur lecture maintenant ?"
                    </h4>
                    <p className="text-gray-300 mb-4">
                      CinéSync synchronise automatiquement tout pour vous.
                    </p>
                    <div className="flex justify-center space-x-2">
                      <div className="w-3 h-3 bg-cyan-400 rounded-full animate-pulse"></div>
                      <div
                        className="w-3 h-3 bg-purple-400 rounded-full animate-pulse"
                        style={{ animationDelay: "0.5s" }}
                      ></div>
                      <div
                        className="w-3 h-3 bg-pink-400 rounded-full animate-pulse"
                        style={{ animationDelay: "1s" }}
                      ></div>
                    </div>
                  </div>

                  {/* Credits */}
                  <div className="text-center text-sm text-gray-500 pt-6 border-t border-white/10">
                    <p className="mb-2">
                      🎥 Plateforme en version bêta – Testez, invitez, et
                      amusez-vous librement !
                    </p>
                    <p>
                      Créée avec ❤️ par{" "}
                      <span className="text-white font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                        BELGHIETI MOHAMED
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* FOOTER */}
      <footer className="relative z-10 text-center text-sm text-gray-500 py-8 border-t border-white/10 bg-black/20 backdrop-blur-xl">
        <div className="max-w-4xl mx-auto px-6">
          <div className="flex items-center justify-center space-x-2 mb-2">
            <span className="text-2xl">🎥</span>
            <span className="font-semibold">CinéSync</span>
            <span>•</span>
            <span>Une soirée cinéma en ligne avec vos amis</span>
          </div>
          <p>Made with ❤️ by BELGHIETI MOHAMED | Beta version</p>
        </div>
      </footer>
    </div>
  );
}
