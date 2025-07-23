"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function JoinRoomComponent() {
  const [roomId, setRoomId] = useState("");
  const router = useRouter();

  const handleJoinRoom = () => {
    if (roomId.trim() !== "") {
      router.push(`/box/${roomId}`);
    } else {
      alert("Veuillez entrer un ID de room !");
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      handleJoinRoom();
    }
  };

  return (
    <div style={{ textAlign: "center", marginTop: "50px" }}>
      <h2>🎥 Rejoindre une Room</h2>
      <input
        type="text"
        value={roomId}
        onChange={(e) => setRoomId(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Entrez l'ID de la room"
        style={{
          padding: "10px",
          fontSize: "16px",
          width: "300px",
          borderRadius: "5px",
          marginRight: "10px",
        }}
      />
      <button
        onClick={handleJoinRoom}
        style={{
          padding: "10px 20px",
          fontSize: "16px",
          borderRadius: "5px",
          backgroundColor: "#0070f3",
          color: "white",
          cursor: "pointer",
        }}
      >
        Go
      </button>
    </div>
  );
}
