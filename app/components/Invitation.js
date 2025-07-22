"use client";

import { useEffect, useState } from "react";
import { Client } from "@stomp/stompjs";
import { useRouter } from "next/navigation";

export default function InvitationsPage() {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  const [token, setToken] = useState("");
  const [invitations, setInvitations] = useState([]);
  const router = useRouter();

  useEffect(() => {
    const storedToken = localStorage.getItem("token");
    if (!storedToken) return;

    setToken(storedToken);

    // Chargement initial des invitations via REST
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

    // Connexion WebSocket via STOMP.js avec token en header
    const client = new Client({
      brokerURL: `wss://cinemamongo-production.up.railway.app/ws`,
      //connectHeaders: {
        //Authorization: `Bearer ${storedToken}`,
      //},
      //reconnectDelay: 5000,
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

    return () => {
      client.deactivate();
    };
  }, [baseUrl]);

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

        // Supprimer l'invitation acceptée de la liste
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
      {invitations.length === 0 ? (
        <p>Aucune invitation en attente.</p>
      ) : (
        <ul className="overflow-y-auto max-h-96">
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
