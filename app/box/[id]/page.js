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
      <div className="min-h-screen flex items-center justify-center text-white text-lg animate-pulse">
        Chargement de la session...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white p-6 font-sans flex flex-col items-center">
      {/* HEADER */}
      <AdBanner />
      <header className="w-full flex justify-between items-center p-6 bg-white/5 border-b border-white/10 rounded-xl shadow-lg backdrop-blur-md">
        <h1 className="text-3xl font-bold text-blue-400 tracking-tight">
          🎬 CinéSync - Room
        </h1>
        <div className="flex items-center gap-5">
          <div className="text-right">
            <p className="text-sm font-medium">{userInfo.username}</p>
            <p className="text-xs text-gray-400">ID: {userInfo.id}</p>
          </div>
          <div className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold shadow ring-2 ring-white/20">
            {userInfo.username.charAt(0).toUpperCase()}
          </div>
          <button
            onClick={handleLogout}
            className="bg-red-500 hover:bg-red-600 px-3 py-1 rounded-lg text-sm transition"
          >
            Déconnexion
          </button>
        </div>
      </header>

      {/* MAIN */}
      <main className="w-full mt-8 flex flex-col lg:flex-row gap-8">
        {/* LEFT - VIDEO PLAYER */}
        <div className="flex-1 bg-white/5 p-6 rounded-2xl shadow-lg">
          <h2 className="text-2xl font-semibold text-blue-300 mb-4">
            🎥 Room: <span className="text-white">{box.box.name}</span>
          </h2>
          <p className="text-sm text-gray-400 mb-4">
            ID de la room : <code className="text-white">{box.box.id}</code>
          </p>
          <VideoSyncComponent boxId={id} />
        </div>

        {/* RIGHT - INVITE USERS */}
        <div className="w-full lg:w-1/3 bg-white/5 p-6 rounded-2xl shadow-xl space-y-4">
          <h3 className="text-xl font-semibold text-green-400">
            👥 Inviter des amis
          </h3>
          <input
            type="text"
            placeholder="Rechercher un utilisateur..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 focus:outline-none focus:ring-2 focus:ring-green-400 placeholder-gray-400 text-sm"
          />
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {filteredUsers.length === 0 ? (
              <p className="text-sm text-gray-400 italic">
                Aucun utilisateur trouvé.
              </p>
            ) : (
              filteredUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between bg-white/10 p-3 rounded-lg hover:bg-white/20 transition"
                >
                  <span className="font-medium">{user.username}</span>
                 
                </div>
              ))
            )}
          </div>
        </div>
      </main>

      {/* FOOTER */}
      <footer className="w-full text-center text-xs text-gray-500 mt-12 pt-6 border-t border-white/10">
        🎬 CinéSync – Une soirée cinéma en ligne avec vos amis. <br />
        Made with ❤️ by BELGHIETI MOHAMED | Beta version.
      </footer>
    </div>
  );
}
