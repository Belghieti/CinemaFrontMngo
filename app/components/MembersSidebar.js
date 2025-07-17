import React, { useEffect, useState } from "react";

export default function MembersSidebar({ onInvite, boxId }) {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  const [members, setMembers] = useState([]);
  const [search, setSearch] = useState(""); // État pour la recherche
  const [filteredMembers, setFilteredMembers] = useState([]); // Membres filtrés selon la recherche

  const getSenderIdFromToken = () => {
    const token = localStorage.getItem("token");
    if (!token) return null;
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.sub;
  };

  const handleInvite = async (receiverId) => {
    const token = localStorage.getItem("token");
    const senderId = getSenderIdFromToken();

    if (!senderId || !boxId || !receiverId) {
      alert("Paramètres d'invitation invalides !");
      return;
    }

    const params = new URLSearchParams({
      senderId,
      receiverId,
      boxId,
    });

    try {
      const res = await fetch(
        `${baseUrl}/api/invitations/send?${params.toString()}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (res.ok) {
        alert("Invitation envoyée 🎉");
      } else {
        alert("Erreur lors de l'envoi de l'invitation");
      }
    } catch (error) {
      console.error("Erreur réseau :", error);
    }
  };

  useEffect(() => {
    const fetchMembers = async () => {
      const token = localStorage.getItem("token");
      const res = await fetch(`${baseUrl}/auth/getAllUsers`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      setMembers(data);
      setFilteredMembers(data); // Initialise les membres filtrés
    };

    fetchMembers();
  }, []);

  useEffect(() => {
    if (search === "") {
      setFilteredMembers(members); // Si la recherche est vide, affiche tous les membres
    } else {
      setFilteredMembers(
        members.filter((member) =>
          member.username.toLowerCase().includes(search.toLowerCase())
        )
      ); // Filtre les membres selon le texte de recherche
    }
  }, [search, members]);

  return (
    <div className="bg-slate-900 text-white rounded-xl p-4 mt-4 shadow-md border border-slate-700 w-full max-w-sm mx-auto">
      <h2 className="text-xl font-bold mb-4 text-center border-b border-slate-700 pb-2">
        👥 Membres disponibles
      </h2>

      {/* Champ de recherche */}
      <div className="mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher un membre..."
          className="w-full p-2 bg-slate-800 text-white rounded-lg border border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-600"
        />
      </div>

      <div className="space-y-3 max-h-80 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-600">
        {filteredMembers.length === 0 ? (
          <p className="text-gray-400 italic text-center">
            Aucun membre trouvé
          </p>
        ) : (
          filteredMembers.map((member) => (
            <div
              key={member.id}
              className="flex items-center justify-between bg-slate-800 px-4 py-2 rounded-lg hover:bg-slate-700 transition"
            >
              <span className="font-medium">{member.username}</span>
              <button
                onClick={() => handleInvite(member.id)}
                className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1 text-sm rounded-lg font-semibold transition"
              >
                Inviter
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
