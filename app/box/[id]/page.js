"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import VideoSyncComponent from "../../components/VideoSyncComponent";
import AdBanner from "@/app/components/AdBanner";

export default function BoxPage() {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  const { id } = useParams();
  const router = useRouter();

  const [token, setToken] = useState("");
  const [box, setBox] = useState(null);
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [userInfo, setUserInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const storedToken =
        new URLSearchParams(window.location.search).get("token") ||
        localStorage.getItem("token");

      if (!storedToken) {
        router.push("/");
        return;
      }

      setToken(storedToken);

      try {
        const [userRes, boxRes, usersRes] = await Promise.all([
          fetch(`${baseUrl}/auth/getUserInfo`, {
            headers: { Authorization: `Bearer ${storedToken}` },
          }),
          fetch(`${baseUrl}/api/boxes/${id}`, {
            headers: { Authorization: `Bearer ${storedToken}` },
          }),
          fetch(`${baseUrl}/auth/getBoxUsers/${id}`, {
            headers: { Authorization: `Bearer ${storedToken}` },
          }),
        ]);

        if (!userRes.ok || !boxRes.ok || !usersRes.ok)
          throw new Error("Erreur lors du chargement des données.");

        setUserInfo(await userRes.json());
        setBox(await boxRes.json());
        setUsers(await usersRes.json());
        setLoading(false);
      } catch (error) {
        alert(error.message);
        router.push("/");
      }
    }

    fetchData();
  }, [id, router, baseUrl]);

  const handleInvite = async (userId) => {
    if (!box?.box?.hostId) {
      alert("Données de la box incomplètes.");
      return;
    }

    try {
      const res = await fetch(`${baseUrl}/api/invitations/send`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          senderId: box.box.hostId,
          receiverId: userId,
          boxId: id,
        }),
      });

      res.ok
        ? alert("Invitation envoyée avec succès !")
        : alert("Échec de l'envoi.");
    } catch (error) {
      alert("Erreur réseau.");
    }
  };

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

  const filteredUsers = users
    .filter((u) => u.id !== userInfo?.id)
    .filter((u) => u.username.toLowerCase().includes(search.toLowerCase()));

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-950 via-slate-900 to-indigo-950 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-20 h-20 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-white text-xl font-light animate-pulse">
            Chargement de la session...
          </p>
          <div className="flex justify-center space-x-2">
            <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"></div>
            <div
              className="w-2 h-2 bg-pink-400 rounded-full animate-bounce"
              style={{ animationDelay: "0.1s" }}
            ></div>
            <div
              className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce"
              style={{ animationDelay: "0.2s" }}
            ></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-950 via-slate-900 to-indigo-950 text-white font-inter relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(147,51,234,0.3),transparent)] pointer-events-none"></div>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(59,130,246,0.2),transparent)] pointer-events-none"></div>

      <AdBanner />

      {/* HEADER */}
      <header className="relative z-10 w-full flex justify-between items-center p-6 border-b border-white/10 bg-black/20 backdrop-blur-xl shadow-2xl">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => router.push("/dashboard")}
            className="group flex items-center space-x-3 hover:bg-white/10 p-2 rounded-xl transition-all duration-300"
          >
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
              <span className="text-2xl">🎬</span>
            </div>
            <div>
              <h1 className="text-2xl sm:text-4xl font-black bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 text-transparent bg-clip-text">
                CinéSync
              </h1>
              <p className="text-sm text-gray-400 font-light">
                Salle de cinéma
              </p>
            </div>
          </button>
        </div>

        <div className="flex items-center gap-6">
          <div className="text-right hidden sm:block">
            <p className="font-semibold text-lg text-white">
              {userInfo?.username}
            </p>
            <p className="text-xs text-purple-300">ID: {userInfo?.id}</p>
          </div>
          <div className="relative">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center font-bold text-white shadow-lg ring-4 ring-purple-500/20">
              {userInfo?.username?.charAt(0).toUpperCase()}
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
      </header>

      {/* MAIN CONTENT */}
      <main className="relative z-10 w-full p-6 max-w-7xl mx-auto">
        <div className="flex flex-col xl:flex-row gap-8">
          {/* LEFT - VIDEO PLAYER */}
          <div className="flex-1">
            {/* Room Info Header */}
            <div className="mb-6 p-6 bg-gradient-to-r from-slate-800/50 to-slate-900/50 backdrop-blur-xl rounded-3xl border border-white/10 shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center text-3xl shadow-lg">
                    🎥
                  </div>
                  <div>
                    <h2 className="text-3xl font-black text-white mb-1">
                      {box?.box?.name}
                    </h2>
                    <div className="flex items-center space-x-3 text-sm text-gray-400">
                      <span className="flex items-center space-x-1">
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.99 1.99 0 013 12V7a4 4 0 014-4z"
                          />
                        </svg>
                        <span>ID: {box?.box?.id}</span>
                      </span>
                      <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                      <span>En ligne</span>
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="flex items-center space-x-2 text-sm text-gray-400 mb-2">
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z"
                      />
                    </svg>
                    <span>
                      {users.length} participant{users.length > 1 ? "s" : ""}
                    </span>
                  </div>
                  <div className="flex -space-x-2">
                    {users.slice(0, 3).map((user, index) => (
                      <div
                        key={user.id}
                        className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-xs font-bold text-white border-2 border-gray-900 shadow-lg"
                      >
                        {user.username.charAt(0).toUpperCase()}
                      </div>
                    ))}
                    {users.length > 3 && (
                      <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center text-xs font-bold text-white border-2 border-gray-900 shadow-lg">
                        +{users.length - 3}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 p-4 rounded-2xl border border-blue-500/20">
                <div className="flex items-center space-x-2 text-sm text-blue-300">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <span className="font-medium">Astuce :</span>
                  <span>
                    Les liens valides doivent se terminer par{" "}
                    <code className="px-2 py-1 bg-blue-500/20 rounded text-blue-200 font-mono text-xs">
                      .m3u8
                    </code>
                  </span>
                </div>
              </div>
            </div>

            {/* Video Player Card */}
            <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-xl rounded-3xl border border-white/10 shadow-2xl overflow-hidden">
              <VideoSyncComponent boxId={id} />
            </div>
          </div>

          {/* RIGHT - INVITE USERS SIDEBAR */}
          <div className="w-full xl:w-96">
            <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-xl p-6 rounded-3xl border border-white/10 shadow-2xl sticky top-6">
              {/* Header */}
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl flex items-center justify-center text-2xl shadow-lg">
                  👥
                </div>
                <div>
                  <h3 className="text-xl font-bold text-green-400">
                    Inviter des amis
                  </h3>
                  <p className="text-sm text-gray-400">
                    Partagez cette expérience
                  </p>
                </div>
              </div>

              {/* Search Input */}
              <div className="relative mb-6">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg
                    className="h-5 w-5 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="Rechercher un utilisateur..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-2xl bg-white/10 border border-white/20 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent placeholder-gray-400 text-white transition-all duration-300"
                />
              </div>

              {/* Users List */}
              <div className="space-y-3 max-h-96 overflow-y-auto custom-scrollbar">
                {filteredUsers.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg
                        className="w-8 h-8 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                        />
                      </svg>
                    </div>
                    <p className="text-gray-400 text-sm">
                      Aucun utilisateur trouvé
                    </p>
                    <p className="text-gray-500 text-xs mt-1">
                      Essayez un autre terme de recherche
                    </p>
                  </div>
                ) : (
                  filteredUsers.map((user) => (
                    <div
                      key={user.id}
                      className="group flex items-center justify-between bg-white/5 hover:bg-white/10 p-4 rounded-2xl border border-white/10 hover:border-green-500/30 transition-all duration-300"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center font-bold text-white shadow-lg">
                          {user.username.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-white group-hover:text-green-400 transition-colors">
                            {user.username}
                          </p>
                          <p className="text-xs text-gray-400">ID: {user.id}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleInvite(user.id)}
                        className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 px-3 py-1.5 rounded-xl text-sm font-medium transition-all duration-300 shadow-lg hover:shadow-green-500/25 hover:scale-105 active:scale-95"
                      >
                        Inviter
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* Room Info */}
              <div className="mt-6 pt-6 border-t border-white/10">
                <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 p-4 rounded-2xl border border-purple-500/20">
                  <div className="flex items-center space-x-2 text-sm text-purple-300 mb-2">
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z"
                      />
                    </svg>
                    <span className="font-medium">Partager cette salle</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <code className="flex-1 px-3 py-2 bg-black/30 rounded-lg text-xs font-mono text-gray-300 border border-white/10">
                      /box/{id}
                    </code>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(
                          `${window.location.origin}/box/${id}`
                        );
                        // Vous pouvez ajouter une notification de succès ici
                      }}
                      className="p-2 bg-purple-500 hover:bg-purple-600 rounded-lg transition-colors"
                      title="Copier le lien"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* FOOTER */}
      <footer className="relative z-10 text-center text-sm text-gray-500 py-8 border-t border-white/10 bg-black/20 backdrop-blur-xl mt-12">
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

      {/* Custom Scrollbar Styles */}
      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(147, 51, 234, 0.5);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(147, 51, 234, 0.7);
        }
      `}</style>
    </div>
  );
}
