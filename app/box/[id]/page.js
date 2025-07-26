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
      {/* Atmospheric Background Effects */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(147,51,234,0.3),transparent)] pointer-events-none"></div>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(59,130,246,0.2),transparent)] pointer-events-none"></div>

      {/* Floating Shadows */}
      <div className="absolute top-20 left-10 w-32 h-32 bg-black/20 rounded-full blur-3xl animate-float opacity-60"></div>
      <div className="absolute top-40 right-20 w-48 h-48 bg-red-900/10 rounded-full blur-3xl animate-float-delayed opacity-40"></div>
      <div className="absolute bottom-20 left-1/4 w-40 h-40 bg-purple-900/15 rounded-full blur-3xl animate-pulse opacity-50"></div>

      {/* Animated Mist/Fog Effect */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="mist-layer-1"></div>
        <div className="mist-layer-2"></div>
        <div className="mist-layer-3"></div>
      </div>

      {/* Flickering Light Effect */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
        <div className="flickering-light"></div>
      </div>

      {/* Animated Fireplace in Corner */}
      <div className="fixed bottom-6 right-6 z-50 fireplace-container">
        <div className="fireplace-frame">
          {/* Fireplace Structure */}
          <div className="fireplace-base"></div>
          <div className="fireplace-back"></div>

          {/* Wood Logs */}
          <div className="log log-1"></div>
          <div className="log log-2"></div>
          <div className="log log-3"></div>

          {/* Main Fire Flames */}
          <div className="flame flame-1"></div>
          <div className="flame flame-2"></div>
          <div className="flame flame-3"></div>
          <div className="flame flame-4"></div>
          <div className="flame flame-5"></div>
          <div className="flame flame-6"></div>

          {/* Fire Sparks/Embers */}
          <div className="ember ember-1"></div>
          <div className="ember ember-2"></div>
          <div className="ember ember-3"></div>
          <div className="ember ember-4"></div>
          <div className="ember ember-5"></div>

          {/* Smoke Effect */}
          <div className="smoke smoke-1"></div>
          <div className="smoke smoke-2"></div>
          <div className="smoke smoke-3"></div>

          {/* Fire Glow Effect */}
          <div className="fire-glow"></div>

          {/* Crackling Sound Indicator */}
          <div className="sound-waves">
            <div className="wave wave-1"></div>
            <div className="wave wave-2"></div>
            <div className="wave wave-3"></div>
          </div>
        </div>

        {/* Fireplace Light Reflection */}
        <div className="fireplace-light"></div>
      </div>

      <AdBanner />

      {/* HEADER */}
      <header className="relative z-10 w-full flex justify-between items-center p-6 border-b border-white/10 bg-black/20 backdrop-blur-xl shadow-2xl">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => router.push("/dashboard")}
            className="group flex items-center space-x-3 hover:bg-white/10 p-2 rounded-xl transition-all duration-300"
          >
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
              <span className="text-2xl animate-pulse">🎬</span>
            </div>
            <div>
              <h1 className="text-2xl sm:text-4xl font-black bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 text-transparent bg-clip-text animate-text-glow">
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
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center font-bold text-white shadow-lg ring-4 ring-purple-500/20 shadow-glow">
              {userInfo?.username?.charAt(0).toUpperCase()}
            </div>
            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-gray-900 animate-pulse-glow"></div>
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
            <div className="mb-6 p-6 bg-gradient-to-r from-slate-800/50 to-slate-900/50 backdrop-blur-xl rounded-3xl border border-white/10 shadow-2xl relative overflow-hidden">
              {/* Animated Fire Border Effect */}
              <div className="absolute inset-0 rounded-3xl">
                <div className="fire-border-top"></div>
                <div className="fire-border-right"></div>
                <div className="fire-border-bottom"></div>
                <div className="fire-border-left"></div>
              </div>

              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center text-3xl shadow-lg shadow-fire relative">
                      <span className="animate-bounce">🎥</span>
                      {/* Fire particles around the icon */}
                      <div className="fire-particle fire-particle-1"></div>
                      <div className="fire-particle fire-particle-2"></div>
                      <div className="fire-particle fire-particle-3"></div>
                    </div>
                    <div>
                      <h2 className="text-3xl font-black text-white mb-1 text-shadow-glow">
                        {box?.box?.name}
                      </h2>
                      <div className="flex items-center space-x-3 text-sm text-gray-400">
                        <span className="flex items-center space-x-1">
                          <svg
                            className="w-4 h-4 animate-pulse"
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
                        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse-glow"></span>
                        <span>En ligne</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="flex items-center space-x-2 text-sm text-gray-400 mb-2">
                      <svg
                        className="w-4 h-4 animate-pulse"
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
                          className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-xs font-bold text-white border-2 border-gray-900 shadow-lg shadow-glow animate-float"
                          style={{ animationDelay: `${index * 0.2}s` }}
                        >
                          {user.username.charAt(0).toUpperCase()}
                        </div>
                      ))}
                      {users.length > 3 && (
                        <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center text-xs font-bold text-white border-2 border-gray-900 shadow-lg animate-pulse">
                          +{users.length - 3}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 p-4 rounded-2xl border border-blue-500/20 backdrop-blur-sm relative">
                  {/* Ghostly whispers effect */}
                  <div className="absolute -top-2 -right-2 w-4 h-4 bg-red-500/30 rounded-full animate-ping"></div>
                  <div className="flex items-center space-x-2 text-sm text-blue-300">
                    <svg
                      className="w-4 h-4 animate-spin-slow"
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
                      <code className="px-2 py-1 bg-blue-500/20 rounded text-blue-200 font-mono text-xs animate-pulse">
                        .m3u8
                      </code>
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Video Player Card with Horror Atmosphere */}
            <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-xl rounded-3xl border border-white/10 shadow-2xl overflow-hidden relative">
              {/* Creepy Border Effects */}
              <div className="absolute inset-0 rounded-3xl">
                <div className="creepy-glow"></div>
                {/* Devil eyes in corners */}
                <div className="devil-eyes devil-eyes-top-left"></div>
                <div className="devil-eyes devil-eyes-top-right"></div>
                <div className="devil-eyes devil-eyes-bottom-left"></div>
                <div className="devil-eyes devil-eyes-bottom-right"></div>
              </div>

              {/* Floating souls/ghosts around video */}
              <div className="absolute inset-0 pointer-events-none">
                <div className="ghost ghost-1">👻</div>
                <div className="ghost ghost-2">👹</div>
                <div className="ghost ghost-3">😈</div>
                <div className="soul soul-1"></div>
                <div className="soul soul-2"></div>
                <div className="soul soul-3"></div>
              </div>

              <div className="relative z-10">
                <VideoSyncComponent boxId={id} />
              </div>
            </div>
          </div>

          {/* RIGHT - INVITE USERS SIDEBAR */}
          <div className="w-full xl:w-96">
            <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-xl p-6 rounded-3xl border border-white/10 shadow-2xl sticky top-6 relative overflow-hidden">
              {/* Eerie glow effect */}
              <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-red-500/5 rounded-3xl animate-pulse-slow"></div>

              <div className="relative z-10">
                {/* Header */}
                <div className="flex items-center space-x-3 mb-6">
                  <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl flex items-center justify-center text-2xl shadow-lg shadow-green-glow relative">
                    <span className="animate-bounce">👥</span>
                    {/* Spooky aura */}
                    <div className="spooky-aura"></div>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-green-400 text-shadow-glow">
                      Inviter des amis
                    </h3>
                    <p className="text-sm text-gray-400 animate-pulse">
                      Partagez cette expérience
                    </p>
                  </div>
                </div>

                {/* Search Input */}
                <div className="relative mb-6">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg
                      className="h-5 w-5 text-gray-400 animate-pulse"
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
                    className="w-full pl-10 pr-4 py-3 rounded-2xl bg-white/10 border border-white/20 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent placeholder-gray-400 text-white transition-all duration-300 shadow-inner-glow"
                  />
                  {/* Mystical particles around search */}
                  <div className="search-particles"></div>
                </div>

                {/* Users List */}
                <div className="space-y-3 max-h-96 overflow-y-auto custom-scrollbar">
                  {filteredUsers.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4 relative">
                        <svg
                          className="w-8 h-8 text-gray-400 animate-pulse"
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
                        <div className="lonely-aura"></div>
                      </div>
                      <p className="text-gray-400 text-sm animate-pulse">
                        Aucun utilisateur trouvé
                      </p>
                      <p className="text-gray-500 text-xs mt-1">
                        La solitude règne ici...
                      </p>
                    </div>
                  ) : (
                    filteredUsers.map((user, index) => (
                      <div
                        key={user.id}
                        className="group flex items-center justify-between bg-white/5 hover:bg-white/10 p-4 rounded-2xl border border-white/10 hover:border-green-500/30 transition-all duration-300 relative overflow-hidden user-card"
                        style={{ animationDelay: `${index * 0.1}s` }}
                      >
                        <div className="card-glow"></div>
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center font-bold text-white shadow-lg shadow-glow relative">
                            {user.username.charAt(0).toUpperCase()}
                            <div className="user-aura"></div>
                          </div>
                          <div>
                            <p className="font-medium text-white group-hover:text-green-400 transition-colors">
                              {user.username}
                            </p>
                            <p className="text-xs text-gray-400">
                              ID: {user.id}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleInvite(user.id)}
                          className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 px-3 py-1.5 rounded-xl text-sm font-medium transition-all duration-300 shadow-lg hover:shadow-green-500/25 hover:scale-105 active:scale-95 invite-btn"
                        >
                          Inviter
                        </button>
                      </div>
                    ))
                  )}
                </div>

                {/* Room Info */}
                <div className="mt-6 pt-6 border-t border-white/10">
                  <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 p-4 rounded-2xl border border-purple-500/20 relative overflow-hidden">
                    <div className="mystical-glow"></div>
                    <div className="flex items-center space-x-2 text-sm text-purple-300 mb-2">
                      <svg
                        className="w-4 h-4 animate-spin-slow"
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
                      <code className="flex-1 px-3 py-2 bg-black/30 rounded-lg text-xs font-mono text-gray-300 border border-white/10 animate-pulse">
                        /box/{id}
                      </code>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(
                            `${window.location.origin}/box/${id}`
                          );
                        }}
                        className="p-2 bg-purple-500 hover:bg-purple-600 rounded-lg transition-colors shadow-glow"
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
        </div>
      </main>

      {/* FOOTER */}
      <footer className="relative z-10 text-center text-sm text-gray-500 py-8 border-t border-white/10 bg-black/20 backdrop-blur-xl mt-12">
        <div className="max-w-4xl mx-auto px-6">
          <div className="flex items-center justify-center space-x-2 mb-2">
            <span className="text-2xl animate-pulse">🎥</span>
            <span className="font-semibold">CinéSync</span>
            <span>•</span>
            <span>Une soirée cinéma en ligne avec vos amis</span>
          </div>
          <p>Made with ❤️ by BELGHIETI MOHAMED | Beta version</p>
        </div>
      </footer>

      {/* Enhanced Custom Styles */}
      <style jsx>{`
        /* Custom Scrollbar */
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

        /* Floating Animation */
        @keyframes float {
          0%,
          100% {
            transform: translateY(0px) rotate(0deg);
          }
          50% {
            transform: translateY(-10px) rotate(2deg);
          }
        }
        @keyframes float-delayed {
          0%,
          100% {
            transform: translateY(0px) rotate(0deg);
          }
          50% {
            transform: translateY(-15px) rotate(-3deg);
          }
        }
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
        .animate-float-delayed {
          animation: float-delayed 4s ease-in-out infinite;
        }

        /* Fire Border Effects */
        @keyframes fire-flicker {
          0%,
          100% {
            opacity: 0.8;
            transform: scaleY(1);
          }
          25% {
            opacity: 1;
            transform: scaleY(1.1);
          }
          50% {
            opacity: 0.9;
            transform: scaleY(0.9);
          }
          75% {
            opacity: 1;
            transform: scaleY(1.2);
          }
        }

        .fire-border-top,
        .fire-border-bottom,
        .fire-border-left,
        .fire-border-right {
          position: absolute;
          background: linear-gradient(
            45deg,
            #ff4500,
            #ff6347,
            #ff8c00,
            #ffd700
          );
          animation: fire-flicker 1.5s ease-in-out infinite;
        }

        .fire-border-top {
          top: 0;
          left: 0;
          right: 0;
          height: 2px;
          animation-delay: 0s;
        }

        .fire-border-right {
          top: 0;
          right: 0;
          bottom: 0;
          width: 2px;
          animation-delay: 0.3s;
        }

        .fire-border-bottom {
          bottom: 0;
          left: 0;
          right: 0;
          height: 2px;
          animation-delay: 0.6s;
        }

        .fire-border-left {
          top: 0;
          left: 0;
          bottom: 0;
          width: 2px;
          animation-delay: 0.9s;
        }

        /* Fire Particles */
        @keyframes fire-particle {
          0% {
            transform: translateY(0) scale(1);
            opacity: 1;
          }
          100% {
            transform: translateY(-30px) scale(0);
            opacity: 0;
          }
        }

        .fire-particle {
          position: absolute;
          width: 4px;
          height: 8px;
          background: radial-gradient(circle, #ff4500, #ff6347);
          border-radius: 50% 50% 50% 50% / 60% 60% 40% 40%;
          animation: fire-particle 2s ease-out infinite;
        }

        .fire-particle-1 {
          top: -5px;
          left: 10px;
          animation-delay: 0s;
        }

        .fire-particle-2 {
          top: -5px;
          right: 10px;
          animation-delay: 0.7s;
        }

        .fire-particle-3 {
          bottom: -5px;
          left: 50%;
          animation-delay: 1.4s;
        }

        /* Mist/Fog Layers */
        @keyframes mist-drift {
          0% {
            transform: translateX(-100px) translateY(0px);
            opacity: 0;
          }
          50% {
            opacity: 0.3;
          }
          100% {
            transform: translateX(100vw) translateY(-20px);
            opacity: 0;
          }
        }

        .mist-layer-1,
        .mist-layer-2,
        .mist-layer-3 {
          position: absolute;
          width: 200px;
          height: 100px;
          background: radial-gradient(
            ellipse,
            rgba(255, 255, 255, 0.1),
            transparent
          );
          border-radius: 50%;
          animation: mist-drift 15s linear infinite;
        }

        .mist-layer-1 {
          top: 20%;
          animation-delay: 0s;
        }

        .mist-layer-2 {
          top: 60%;
          animation-delay: 5s;
          animation-duration: 20s;
        }

        .mist-layer-3 {
          top: 80%;
          animation-delay: 10s;
          animation-duration: 18s;
        }

        /* Flickering Light */
        @keyframes flicker {
          0%,
          100% {
            opacity: 0.1;
          }
          5% {
            opacity: 0.3;
          }
          10% {
            opacity: 0.1;
          }
          15% {
            opacity: 0.4;
          }
          20% {
            opacity: 0.1;
          }
          25% {
            opacity: 0.2;
          }
          30% {
            opacity: 0.1;
          }
        }

        .flickering-light {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: radial-gradient(
            circle at 30% 20%,
            rgba(255, 215, 0, 0.1),
            transparent 50%
          );
          animation: flicker 3s ease-in-out infinite;
        }

        /* Text Glow Animation */
        @keyframes text-glow {
          0%,
          100% {
            text-shadow: 0 0 10px rgba(147, 51, 234, 0.5);
          }
          50% {
            text-shadow: 0 0 20px rgba(147, 51, 234, 0.8),
              0 0 30px rgba(147, 51, 234, 0.6);
          }
        }

        .animate-text-glow {
          animation: text-glow 2s ease-in-out infinite;
        }

        /* Shadow Glow Effects */
        .shadow-glow {
          box-shadow: 0 0 20px rgba(147, 51, 234, 0.3);
        }

        .shadow-fire {
          box-shadow: 0 0 25px rgba(255, 69, 0, 0.4);
        }

        .shadow-green-glow {
          box-shadow: 0 0 15px rgba(34, 197, 94, 0.4);
        }

        /* Pulse Glow Animation */
        @keyframes pulse-glow {
          0%,
          100% {
            box-shadow: 0 0 5px rgba(34, 197, 94, 0.5);
          }
          50% {
            box-shadow: 0 0 20px rgba(34, 197, 94, 0.8),
              0 0 30px rgba(34, 197, 94, 0.4);
          }
        }

        .animate-pulse-glow {
          animation: pulse-glow 2s ease-in-out infinite;
        }

        /* Text Shadow Glow */
        .text-shadow-glow {
          text-shadow: 0 0 10px rgba(255, 255, 255, 0.3);
        }

        /* Slow Animations */
        @keyframes spin-slow {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        @keyframes pulse-slow {
          0%,
          100% {
            opacity: 0.4;
          }
          50% {
            opacity: 0.8;
          }
        }

        .animate-spin-slow {
          animation: spin-slow 3s linear infinite;
        }

        .animate-pulse-slow {
          animation: pulse-slow 4s ease-in-out infinite;
        }

        /* Creepy Effects for Video Container */
        @keyframes creepy-glow {
          0%,
          100% {
            box-shadow: inset 0 0 20px rgba(255, 0, 0, 0.1);
          }
          50% {
            box-shadow: inset 0 0 40px rgba(255, 0, 0, 0.3);
          }
        }

        .creepy-glow {
          position: absolute;
          inset: 0;
          border-radius: 24px;
          animation: creepy-glow 3s ease-in-out infinite;
        }

        /* Devil Eyes in Corners */
        @keyframes devil-blink {
          0%,
          90%,
          100% {
            opacity: 0.8;
            transform: scale(1);
          }
          95% {
            opacity: 0;
            transform: scale(0.8);
          }
        }

        .devil-eyes {
          position: absolute;
          width: 12px;
          height: 6px;
          background: radial-gradient(circle, #ff0000, #8b0000);
          border-radius: 50%;
          animation: devil-blink 4s ease-in-out infinite;
        }

        .devil-eyes::before {
          content: "";
          position: absolute;
          right: -8px;
          top: 0;
          width: 12px;
          height: 6px;
          background: radial-gradient(circle, #ff0000, #8b0000);
          border-radius: 50%;
        }

        .devil-eyes-top-left {
          top: 10px;
          left: 10px;
          animation-delay: 0s;
        }

        .devil-eyes-top-right {
          top: 10px;
          right: 10px;
          animation-delay: 1s;
        }

        .devil-eyes-bottom-left {
          bottom: 10px;
          left: 10px;
          animation-delay: 2s;
        }

        .devil-eyes-bottom-right {
          bottom: 10px;
          right: 10px;
          animation-delay: 3s;
        }

        /* Floating Ghosts and Souls */
        @keyframes ghost-float {
          0%,
          100% {
            transform: translateY(0px) translateX(0px) rotate(0deg);
            opacity: 0.6;
          }
          25% {
            transform: translateY(-15px) translateX(10px) rotate(5deg);
            opacity: 0.8;
          }
          50% {
            transform: translateY(-10px) translateX(-5px) rotate(-3deg);
            opacity: 0.4;
          }
          75% {
            transform: translateY(-20px) translateX(15px) rotate(7deg);
            opacity: 0.7;
          }
        }

        @keyframes soul-drift {
          0% {
            transform: translateY(100px) translateX(0px);
            opacity: 0;
          }
          20% {
            opacity: 0.5;
          }
          80% {
            opacity: 0.3;
          }
          100% {
            transform: translateY(-100px) translateX(50px);
            opacity: 0;
          }
        }

        .ghost {
          position: absolute;
          font-size: 24px;
          animation: ghost-float 6s ease-in-out infinite;
          filter: blur(1px);
        }

        .ghost-1 {
          top: 20%;
          left: 5%;
          animation-delay: 0s;
        }

        .ghost-2 {
          top: 60%;
          right: 10%;
          animation-delay: 2s;
        }

        .ghost-3 {
          bottom: 30%;
          left: 15%;
          animation-delay: 4s;
        }

        .soul {
          position: absolute;
          width: 8px;
          height: 8px;
          background: radial-gradient(
            circle,
            rgba(138, 43, 226, 0.6),
            transparent
          );
          border-radius: 50%;
          animation: soul-drift 8s linear infinite;
        }

        .soul-1 {
          left: 20%;
          animation-delay: 0s;
        }

        .soul-2 {
          left: 60%;
          animation-delay: 3s;
        }

        .soul-3 {
          left: 80%;
          animation-delay: 6s;
        }

        /* Spooky Aura Effects */
        @keyframes spooky-aura {
          0%,
          100% {
            transform: scale(1);
            opacity: 0.3;
          }
          50% {
            transform: scale(1.5);
            opacity: 0.1;
          }
        }

        .spooky-aura {
          position: absolute;
          inset: -10px;
          background: radial-gradient(
            circle,
            rgba(34, 197, 94, 0.2),
            transparent
          );
          border-radius: 50%;
          animation: spooky-aura 3s ease-in-out infinite;
        }

        /* Inner Glow for Search */
        .shadow-inner-glow {
          box-shadow: inset 0 0 10px rgba(255, 255, 255, 0.1);
        }

        /* Search Particles */
        @keyframes search-particle {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(-20px) rotate(180deg);
            opacity: 0;
          }
        }

        .search-particles::before,
        .search-particles::after {
          content: "";
          position: absolute;
          width: 4px;
          height: 4px;
          background: rgba(34, 197, 94, 0.6);
          border-radius: 50%;
          animation: search-particle 2s ease-out infinite;
        }

        .search-particles::before {
          top: 10px;
          right: 10px;
          animation-delay: 0s;
        }

        .search-particles::after {
          bottom: 10px;
          right: 15px;
          animation-delay: 1s;
        }

        /* Lonely Aura */
        @keyframes lonely-pulse {
          0%,
          100% {
            transform: scale(1);
            opacity: 0.2;
          }
          50% {
            transform: scale(1.3);
            opacity: 0.4;
          }
        }

        .lonely-aura {
          position: absolute;
          inset: -8px;
          background: radial-gradient(
            circle,
            rgba(75, 85, 99, 0.3),
            transparent
          );
          border-radius: 50%;
          animation: lonely-pulse 4s ease-in-out infinite;
        }

        /* User Card Effects */
        @keyframes user-card-appear {
          0% {
            transform: translateX(-50px);
            opacity: 0;
          }
          100% {
            transform: translateX(0);
            opacity: 1;
          }
        }

        .user-card {
          animation: user-card-appear 0.5s ease-out forwards;
        }

        @keyframes card-glow {
          0%,
          100% {
            opacity: 0;
          }
          50% {
            opacity: 0.3;
          }
        }

        .card-glow {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            45deg,
            transparent,
            rgba(34, 197, 94, 0.1),
            transparent
          );
          border-radius: 16px;
          animation: card-glow 3s ease-in-out infinite;
        }

        /* User Aura */
        @keyframes user-aura {
          0%,
          100% {
            transform: scale(1);
            opacity: 0.4;
          }
          50% {
            transform: scale(1.2);
            opacity: 0.6;
          }
        }

        .user-aura {
          position: absolute;
          inset: -5px;
          background: radial-gradient(
            circle,
            rgba(147, 51, 234, 0.3),
            transparent
          );
          border-radius: 50%;
          animation: user-aura 2s ease-in-out infinite;
        }

        /* Invite Button Effect */
        .invite-btn:hover {
          transform: scale(1.05);
          box-shadow: 0 0 20px rgba(34, 197, 94, 0.4);
        }

        /* Mystical Glow */
        @keyframes mystical-glow {
          0%,
          100% {
            opacity: 0.1;
          }
          50% {
            opacity: 0.3;
          }
        }

        .mystical-glow {
          position: absolute;
          inset: -2px;
          background: linear-gradient(
            45deg,
            rgba(147, 51, 234, 0.2),
            rgba(236, 72, 153, 0.2)
          );
          border-radius: 16px;
          animation: mystical-glow 4s ease-in-out infinite;
        }

        /* Fireplace Styles */
        .fireplace-container {
          width: 200px;
          height: 150px;
          perspective: 1000px;
        }

        .fireplace-frame {
          position: relative;
          width: 100%;
          height: 100%;
          background: linear-gradient(to bottom, #2c1810, #1a0f08);
          border-radius: 15px 15px 5px 5px;
          border: 3px solid #8b4513;
          box-shadow: inset 0 0 20px rgba(0, 0, 0, 0.8),
            0 0 30px rgba(255, 69, 0, 0.3), 0 0 50px rgba(255, 69, 0, 0.1);
          overflow: hidden;
        }

        .fireplace-base {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 20px;
          background: linear-gradient(to top, #654321, #8b4513);
          border-radius: 0 0 12px 12px;
        }

        .fireplace-back {
          position: absolute;
          top: 10px;
          left: 10px;
          right: 10px;
          bottom: 20px;
          background: linear-gradient(to bottom, #1a0f08, #0d0704);
          border-radius: 8px;
        }

        /* Wood Logs */
        .log {
          position: absolute;
          background: linear-gradient(45deg, #8b4513, #654321, #4a2c17);
          border-radius: 20px;
          box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.3);
        }

        .log-1 {
          bottom: 25px;
          left: 20px;
          width: 60px;
          height: 12px;
          transform: rotate(-5deg);
        }

        .log-2 {
          bottom: 30px;
          right: 25px;
          width: 50px;
          height: 10px;
          transform: rotate(8deg);
        }

        .log-3 {
          bottom: 40px;
          left: 35px;
          width: 45px;
          height: 8px;
          transform: rotate(-3deg);
        }

        /* Fire Flames Animation */
        @keyframes flame-dance {
          0%,
          100% {
            transform: scaleY(1) scaleX(1) rotate(-2deg);
            opacity: 0.9;
          }
          25% {
            transform: scaleY(1.3) scaleX(0.8) rotate(3deg);
            opacity: 1;
          }
          50% {
            transform: scaleY(0.8) scaleX(1.2) rotate(-4deg);
            opacity: 0.8;
          }
          75% {
            transform: scaleY(1.4) scaleX(0.7) rotate(2deg);
            opacity: 1;
          }
        }

        .flame {
          position: absolute;
          bottom: 35px;
          background: radial-gradient(
            ellipse at bottom,
            #ff4500 0%,
            #ff6347 30%,
            #ff8c00 60%,
            #ffd700 80%,
            transparent 100%
          );
          border-radius: 50% 50% 50% 50% / 60% 60% 40% 40%;
          filter: blur(1px);
          animation: flame-dance ease-in-out infinite;
        }

        .flame-1 {
          left: 30px;
          width: 25px;
          height: 50px;
          animation-duration: 1.5s;
          animation-delay: 0s;
        }

        .flame-2 {
          left: 50px;
          width: 35px;
          height: 65px;
          animation-duration: 1.8s;
          animation-delay: 0.3s;
        }

        .flame-3 {
          right: 40px;
          width: 30px;
          height: 55px;
          animation-duration: 1.6s;
          animation-delay: 0.6s;
        }

        .flame-4 {
          right: 60px;
          width: 20px;
          height: 40px;
          animation-duration: 1.4s;
          animation-delay: 0.9s;
        }

        .flame-5 {
          left: 70px;
          width: 28px;
          height: 48px;
          animation-duration: 1.7s;
          animation-delay: 1.2s;
        }

        .flame-6 {
          right: 25px;
          width: 15px;
          height: 35px;
          animation-duration: 1.3s;
          animation-delay: 1.5s;
        }

        /* Fire Embers/Sparks */
        @keyframes ember-float {
          0% {
            transform: translateY(0) translateX(0) scale(1);
            opacity: 1;
          }
          50% {
            transform: translateY(-30px) translateX(10px) scale(0.5);
            opacity: 0.7;
          }
          100% {
            transform: translateY(-60px) translateX(-5px) scale(0);
            opacity: 0;
          }
        }

        .ember {
          position: absolute;
          width: 3px;
          height: 3px;
          background: radial-gradient(circle, #ff4500, #ff8c00);
          border-radius: 50%;
          animation: ember-float ease-out infinite;
        }

        .ember-1 {
          bottom: 60px;
          left: 40px;
          animation-duration: 3s;
          animation-delay: 0s;
        }

        .ember-2 {
          bottom: 70px;
          right: 50px;
          animation-duration: 3.5s;
          animation-delay: 1s;
        }

        .ember-3 {
          bottom: 65px;
          left: 80px;
          animation-duration: 2.8s;
          animation-delay: 2s;
        }

        .ember-4 {
          bottom: 55px;
          right: 70px;
          animation-duration: 3.2s;
          animation-delay: 0.5s;
        }

        .ember-5 {
          bottom: 75px;
          left: 60px;
          animation-duration: 2.9s;
          animation-delay: 1.5s;
        }

        /* Smoke Effect */
        @keyframes smoke-rise {
          0% {
            transform: translateY(0) translateX(0) scale(0.5);
            opacity: 0.6;
          }
          50% {
            transform: translateY(-40px) translateX(15px) scale(1);
            opacity: 0.3;
          }
          100% {
            transform: translateY(-80px) translateX(-10px) scale(1.5);
            opacity: 0;
          }
        }

        .smoke {
          position: absolute;
          width: 20px;
          height: 20px;
          background: radial-gradient(
            circle,
            rgba(128, 128, 128, 0.4),
            transparent
          );
          border-radius: 50%;
          filter: blur(3px);
          animation: smoke-rise ease-out infinite;
        }

        .smoke-1 {
          top: 20px;
          left: 60px;
          animation-duration: 4s;
          animation-delay: 0s;
        }

        .smoke-2 {
          top: 15px;
          right: 55px;
          animation-duration: 4.5s;
          animation-delay: 1.5s;
        }

        .smoke-3 {
          top: 25px;
          left: 80px;
          animation-duration: 4.2s;
          animation-delay: 3s;
        }

        /* Fire Glow Effect */
        @keyframes fire-glow {
          0%,
          100% {
            opacity: 0.6;
            transform: scale(1);
          }
          50% {
            opacity: 0.9;
            transform: scale(1.1);
          }
        }

        .fire-glow {
          position: absolute;
          bottom: 20px;
          left: 20px;
          right: 20px;
          height: 60px;
          background: radial-gradient(
            ellipse at center bottom,
            rgba(255, 69, 0, 0.3) 0%,
            rgba(255, 140, 0, 0.2) 40%,
            transparent 80%
          );
          border-radius: 50%;
          animation: fire-glow 2s ease-in-out infinite;
          filter: blur(2px);
        }

        /* Sound Waves Effect */
        @keyframes sound-wave {
          0% {
            transform: scale(0);
            opacity: 1;
          }
          100% {
            transform: scale(3);
            opacity: 0;
          }
        }

        .sound-waves {
          position: absolute;
          top: -10px;
          right: -10px;
          width: 20px;
          height: 20px;
        }

        .wave {
          position: absolute;
          width: 6px;
          height: 6px;
          border: 1px solid rgba(255, 215, 0, 0.6);
          border-radius: 50%;
          animation: sound-wave 2s ease-out infinite;
        }

        .wave-1 {
          animation-delay: 0s;
        }

        .wave-2 {
          animation-delay: 0.7s;
        }

        .wave-3 {
          animation-delay: 1.4s;
        }

        /* Fireplace Light Reflection */
        @keyframes fireplace-light {
          0%,
          100% {
            opacity: 0.1;
            transform: scale(1);
          }
          25% {
            opacity: 0.3;
            transform: scale(1.2);
          }
          50% {
            opacity: 0.2;
            transform: scale(0.9);
          }
          75% {
            opacity: 0.4;
            transform: scale(1.1);
          }
        }

        .fireplace-light {
          position: absolute;
          bottom: -20px;
          right: -30px;
          width: 250px;
          height: 200px;
          background: radial-gradient(
            ellipse at center,
            rgba(255, 140, 0, 0.1) 0%,
            rgba(255, 69, 0, 0.05) 40%,
            transparent 70%
          );
          border-radius: 50%;
          animation: fireplace-light 3s ease-in-out infinite;
          pointer-events: none;
          z-index: -1;
        }

        /* Enhanced Fireplace Responsiveness */
        @media (max-width: 768px) {
          .fireplace-container {
            width: 150px;
            height: 112px;
            bottom: 4px;
            right: 4px;
          }
        }
      `}</style>
    </div>
  );
}
