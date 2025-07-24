"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import VideoSyncComponent from "../../components/VideoSyncComponent";

export default function BoxPage() {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  const { id } = useParams();
  const router = useRouter();

  const [token, setToken] = useState("");
  const [box, setBox] = useState(null); // Contient { box: {...}, movie: {...} }
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
        // User info
        const userRes = await fetch(`${baseUrl}/auth/getUserInfo`, {
          headers: { Authorization: `Bearer ${storedToken}` },
        });
        if (!userRes.ok)
          throw new Error("Impossible de récupérer les infos utilisateur");
        const userData = await userRes.json();
        setUserInfo(userData);

        // Box data
        const boxRes = await fetch(`${baseUrl}/api/boxes/${id}`, {
          headers: { Authorization: `Bearer ${storedToken}` },
        });
        if (!boxRes.ok) throw new Error("Box non trouvée");
        const boxData = await boxRes.json();
        setBox(boxData);

        // Users list
        const usersRes = await fetch(`${baseUrl}/auth/getAllUsers`, {
          headers: { Authorization: `Bearer ${storedToken}` },
        });
        if (!usersRes.ok)
          throw new Error("Erreur lors de la récupération des utilisateurs");
        const usersData = await usersRes.json();
        setUsers(usersData);

        setLoading(false);
      } catch (error) {
        alert(error.message);
        router.push("/");
      }
    }

    fetchData();
  }, [id, router, baseUrl]);

  const handleInvite = async (userId) => {
    if (!box || !box.box.hostId) {
      alert("Erreur : les données de la box ne sont pas encore chargées.");
      return;
    }

    const senderId = box.box.hostId;

    try {
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
    } catch (error) {
      alert("Erreur réseau lors de l'envoi de l'invitation");
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

  if (loading) {
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
        <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-blue-400 via-blue-500 to-blue-700 text-transparent bg-clip-text">
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
            {userInfo.username.charAt(0).toUpperCase()}
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
        {/* Affichage du nom de la box */}
        <h2 className="text-4xl font-bold text-center text-blue-500">
          🎥 Room: {box.box.name}
          {box.box.id && <span className="text-sm text-gray-400"> (Id: {box.box.id}) tu peux inviter des utilisateurs à rejoindre cette room.</span>}
        </h2>
    
        <div className="flex flex-col md:flex-row gap-8">
          {/* Video component */}
          <div className="flex-1 bg-white/5 p-6 rounded-2xl shadow-lg">
            <VideoSyncComponent boxId={id} />
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
