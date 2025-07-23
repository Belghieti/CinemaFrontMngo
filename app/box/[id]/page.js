"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import VideoSyncComponent from "../../components/VideoSyncComponent";

export default function BoxPage() {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  const { id } = useParams();
  const router = useRouter();
  const [token, setToken] = useState("");
  const [box, setBox] = useState(null);
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [userInfo, setUserInfo] = useState(null);

  useEffect(() => {
    const storedToken =
      new URLSearchParams(window.location.search).get("token") ||
      localStorage.getItem("token");

    if (!storedToken) {
      router.push("/");
      return;
    }

    setToken(storedToken);

    // Get user info
    fetch(`${baseUrl}/auth/getUserInfo`, {
      headers: { Authorization: `Bearer ${storedToken}` },
    })
      .then((res) => res.json())
      .then(setUserInfo);
    console.log("User info:", userInfo);
    // Get box data
    fetch(`${baseUrl}/api/boxes/${id}`, {
      headers: { Authorization: `Bearer ${storedToken}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Box non trouvée");
        return res.json();
      })
      .then(setBox)
      .catch(() => router.push("/"));

    // Get all users
    fetch(`${baseUrl}/auth/getAllUsers`, {
      headers: { Authorization: `Bearer ${storedToken}` },
    })
      .then((res) => res.json())
      .then(setUsers);
  }, [id, router]);

  const handleInvite = async (userId) => {
     if (!box || !box.hostId) {
       alert("Erreur : les données de la box ne sont pas encore chargées.");
       return;
     }
    const senderId = box.box.hostId

    if (!senderId) {
      alert("Erreur : hostId est manquant.");
      return;
    }

    const res = await fetch(`${baseUrl}/api/invitations/send`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        senderId,
        receiverId: userId,
        boxId: id,
      }),
    });

    if (res.ok) {
      alert("Invitation envoyée !");
    } else {
      alert("Erreur lors de l'envoi de l'invitation");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    router.push("/");
  };

  const filteredUsers = users
    .filter((user) => user.id !== userInfo?.id)
    .filter((user) =>
      user.username.toLowerCase().includes(search.toLowerCase())
    );

  if (!box || !userInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white text-lg animate-pulse">
        Chargement de votre session...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-tr from-slate-900 via-slate-800 to-slate-900 text-white p-6 md:p-8 flex flex-col items-center font-sans">
      {/* HEADER */}
      <header className="w-full flex justify-between items-center p-6 border-b border-white/20 backdrop-blur-md bg-white/5 shadow-xl z-50 rounded-xl">
        <h1 className="text-3xl font-extrabold tracking-tight text-gradient-to-r from-blue-400 via-blue-500 to-blue-700">
          🎬 Cinema en ligne
        </h1>
        <div className="flex items-center gap-6">
          <div className="flex flex-col items-end text-right">
            <p className="text-sm text-gray-300 font-medium">
              {userInfo.username}
            </p>
            <p className="text-xs text-gray-400">ID: {userInfo.id}</p>
          </div>
          <div className="w-14 h-14 rounded-full bg-gradient-to-r from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold shadow-lg ring-4 ring-offset-2 ring-blue-200">
            {userInfo.username?.charAt(0).toUpperCase()}
          </div>
          <button
            onClick={handleLogout}
            className="px-3 py-2 bg-blue-400 text-white rounded-xl hover:bg-red-600 transition duration-200 ease-in-out"
          >
            Déconnexion
          </button>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="w-full flex-1 p-8 flex flex-col gap-8">
        <h2 className="text-4xl font-bold text-center text-blue-500">
          🎥 Room: {box.box.username}
        </h2>

        <div className="flex flex-col md:flex-row gap-8">
          {/* Video component */}
          <div className="flex-1 bg-white/5 p-6 rounded-2xl shadow-lg">
            <VideoSyncComponent boxId={id} />
          </div>

          {/* Invitation block */}
          <div className="w-full md:w-1/3 bg-white/5 p-6 max-h-[400px] rounded-2xl shadow-lg">
            <h3 className="text-xl font-semibold text-blue-500 mb-4">
              👥 Inviter un ami
            </h3>
            <input
              type="text"
              placeholder="Rechercher un utilisateur..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="mb-6 w-full p-3 rounded-lg bg-slate-700 border border-white/20 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex flex-col gap-4 max-h-[200px] overflow-y-auto">
              {filteredUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between bg-slate-800 p-4 rounded-lg border border-white/20"
                >
                  <div
                    className={`w-4 h-4 rounded-full ${
                      user.isConnected ? "bg-green-500" : "bg-red-500"
                    }`}
                  />
                  <span className="text-white font-medium">
                    {user.username}
                  </span>
                  <button
                    onClick={() => handleInvite(user.id)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-all duration-200"
                  >
                    Inviter
                  </button>
                </div>
              ))}
              {filteredUsers.length === 0 && (
                <p className="text-sm text-gray-400">
                  Aucun utilisateur trouvé
                </p>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* FOOTER */}
      <footer className="w-full p-6 border-t border-white/20 text-center text-gray-300 mt-8">
        <p className="text-xs">Ma9 Ma9 Harira</p>
      </footer>
    </div>
  );
}
