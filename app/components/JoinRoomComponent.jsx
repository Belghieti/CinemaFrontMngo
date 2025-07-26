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
    <div className="space-y-4">
      <div>
        <label
          htmlFor="roomId"
          className="block text-sm font-medium text-amber-300 mb-2"
        >
          ID de la salle
        </label>
        <input
          id="roomId"
          type="text"
          value={roomId}
          onChange={(e) => setRoomId(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Entrez l'ID de la salle..."
          className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent placeholder-gray-400 text-white transition-all duration-300"
        />
      </div>

      <button
        onClick={handleJoinRoom}
        disabled={!roomId.trim()}
        className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed px-6 py-3 rounded-xl font-semibold transition-all duration-300 shadow-lg hover:shadow-amber-500/25 hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center space-x-2"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M11 16l-4-4m0 0l4-4m-4 4h14m-6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
          />
        </svg>
        <span>Rejoindre</span>
      </button>

      <div className="text-center">
        <p className="text-xs text-gray-400">
          💡 Demandez l'ID à votre ami ou utilisez le lien partagé
        </p>
      </div>
    </div>
  );
}
