"use client";

import { useEffect, useState } from "react";
import { Client } from "@stomp/stompjs";
import { useRouter } from "next/navigation";

export default function InvitationsPage() {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  const [token, setToken] = useState("");
  const [invitations, setInvitations] = useState([]);
  const [inviteUsername, setInviteUsername] = useState(""); // 🔥 nouveau champ
  const [stompClient, setStompClient] = useState(null); // 🔥 pour envoyer
  const router = useRouter();

  useEffect(() => {
    const storedToken = localStorage.getItem("token");
    if (!storedToken) return;

    setToken(storedToken);

    // 🔄 Chargement initial des invitations REST
    fetch(`${baseUrl}/api/invitations/received`, {
      headers: {
        Authorization: `Bearer ${storedToken}`,
      },
    })
      .then((res) => res.json())
      .then((data) => {
        const pendingInvitations = data.filter(
          (inv) => inv.status === "pending"
        );
        setInvitations(pendingInvitations);
      })
      .catch((err) =>
        console.error("Erreur lors du chargement des invitations :", err)
      );

    // 🔌 Connexion WebSocket STOMP
    const client = new Client({
      brokerURL: `wss://cinemamongo-production.up.railway.app/ws`,
      onConnect: () => {
        client.subscribe("/topic/invitations", (message) => {
          const data = JSON.parse(message.body);
          if (data.type === "invitation") {
            setInvitations((prev) => [...prev, data.invitation]);
          }
        });
      },
      onStompError: (frame) => {
        console.error("Erreur STOMP : ", frame.headers["message"]);
      },
    });

    client.activate();
    setStompClient(client); // 🔥 pour envoyer ensuite

    return () => {
      client.deactivate();
    };
  }, [baseUrl]);

  // ✅ Envoyer une invitation
  const handleSendInvitation = () => {
    if (!inviteUsername.trim() || !stompClient?.connected) return;

    const payload = {
      invitedUsername: inviteUsername.trim(),
      boxId: "123", // à remplacer dynamiquement si nécessaire
    };

    stompClient.publish({
      destination: `/app/box/${payload.boxId}/invitations`,
      body: JSON.stringify(payload),
    });

    setInviteUsername(""); // reset champ
  };

  const handleAccept = async (invitationId) => {
    try {
      const res = await fetch(
        `${baseUrl}/api/invitations/${invitationId}/accept`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (res.ok) {
        const invitation = invitations.find((inv) => inv.id === invitationId);
        const boxId = invitation?.box?.id;

        if (boxId) {
          router.push(`/box/${boxId}`);
        } else {
          alert("Box introuvable pour cette invitation.");
        }

        setInvitations((prev) => prev.filter((inv) => inv.id !== invitationId));
      } else {
        alert("Erreur lors de l'acceptation");
      }
    } catch (error) {
      console.error("Erreur réseau :", error);
      alert("Erreur lors de la requête");
    }
  };

  if (!token) return <p>Vous devez être connecté</p>;

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Mes invitations</h1>

      {/* 🔽 Section Envoi d'invitation */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Inviter un ami</h2>
        <input
          type="text"
          placeholder="Nom d'utilisateur"
          value={inviteUsername}
          onChange={(e) => setInviteUsername(e.target.value)}
          className="border p-2 rounded mr-2"
        />
        <button
          onClick={handleSendInvitation}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Envoyer invitation
        </button>
      </div>

      {/* 🔽 Liste des invitations */}
      {invitations.length === 0 ? (
        <p>Aucune invitation en attente.</p>
      ) : (
        <ul className="overflow-y-auto max-h-96 space-y-4">
          {invitations.map((invitation) => (
            <li key={invitation.id} className="border p-4 rounded shadow">
              <p>
                <strong>Envoyé par :</strong> {invitation.sender.username}
              </p>
              <p>
                <strong>Box :</strong> {invitation.box?.name || "Non spécifiée"}
              </p>
              <button
                onClick={() => handleAccept(invitation.id)}
                className="mt-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                Accepter l'invitation
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
