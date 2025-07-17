// components/InvitationsModal.js
import React, { useEffect, useState } from "react";

export default function InvitationsModal({ userId, isOpen, onClose }) {
  const [invitations, setInvitations] = useState([]);

  useEffect(() => {
    if (!isOpen) return;

    const fetchInvitations = async () => {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/users/${userId}/invitations`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      setInvitations(data);
    };

    fetchInvitations();
  }, [isOpen, userId]);

  const handleAccept = async (invitationId) => {
    const token = localStorage.getItem("token");
    await fetch(`/api/invitations/${invitationId}/accept`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    setInvitations(invitations.filter((inv) => inv.id !== invitationId));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white rounded-lg p-6 w-96 shadow-lg">
        <h2 className="text-xl font-semibold mb-4">📨 Invitations</h2>
        {invitations.length === 0 ? (
          <p>Aucune invitation.</p>
        ) : (
          invitations.map((inv) => (
            <div key={inv.id} className="flex justify-between items-center mb-2">
              <span>Box: {inv.boxName}</span>
              <button
                onClick={() => handleAccept(inv.id)}
                className="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600"
              >
                Accepter
              </button>
            </div>
          ))
        )}
        <button onClick={onClose} className="mt-4 text-sm text-gray-600 hover:underline">
          Fermer
        </button>
      </div>
    </div>
  );
}
