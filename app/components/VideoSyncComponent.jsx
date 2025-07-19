"use client";

import { useEffect, useRef, useState } from "react";
import * as SockJS from "sockjs-client";
import { Client } from "@stomp/stompjs";
import ReactPlayer from "react-player";

export default function VideoSyncComponent({ boxId }) {
  const playerRef = useRef(null);
  const stompClient = useRef(null);
  const [connected, setConnected] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [syncStarted, setSyncStarted] = useState(false);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const lastSeekTime = useRef(null);

  const [username, setUsername] = useState("Moi");
  const [userId, setUserId] = useState(null);
  const [boxInfo, setBoxInfo] = useState(null);
  const [error, setError] = useState(null);

  const chatContainerRef = useRef(null);

  // 1. Récupération info utilisateur + box
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setError("Token non trouvé.");
      console.error("Token non trouvé.");
      return;
    }

    fetch("https://cinemamongo-production.up.railway.app/auth/getUserInfo", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        console.log("👤 Utilisateur récupéré:", data);
        setUsername(data.username || "Moi");
        setUserId(data.id);

        return fetch(
          `https://cinemamongo-production.up.railway.app/api/boxes/${boxId}?userId=${data.id}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: "Bearer " + token,
            },
          }
        );
      })
      .then((response) => {
        if (!response.ok) throw new Error("Accès refusé à la box");
        return response.json();
      })
      .then((boxData) => {
        console.log("📦 Infos box reçues :", boxData);
        setBoxInfo(boxData);
      })
      .catch((err) => {
        setError("Erreur lors de l'accès à la box: " + err.message);
        console.error("Erreur lors de l'accès à la box:", err);
      });
  }, [boxId]);

  // 2. Connexion WebSocket et abonnements
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!boxInfo?.id || !token) return;

    console.log("🌐 Tentative connexion WebSocket...");

    const client = new Client({
      webSocketFactory: () =>
        new SockJS("https://cinemamongo-production.up.railway.app/ws"),
      connectHeaders: { Authorization: `Bearer ${token}` },
      reconnectDelay: 5000,
      onConnect: () => {
        setConnected(true);
        console.log("✅ WebSocket connecté");

        client.subscribe(`/topic/box/${boxInfo.id}/video-sync`, (message) => {
          console.log("🎬 Reçu VIDEO-SYNC :", message.body);
          const data = JSON.parse(message.body);
          if (!playerRef.current) return;

          switch (data.action) {
            case "play":
              console.log("▶️ Play reçu, seek à", data.time);
              playerRef.current.seekTo(data.time);
              setPlaying(true);
              break;
            case "pause":
              console.log("⏸️ Pause reçu, seek à", data.time);
              playerRef.current.seekTo(data.time);
              setPlaying(false);
              break;
            case "seek":
              console.log("⏩ Seek reçu à", data.time);
              lastSeekTime.current = data.time;
              playerRef.current.seekTo(data.time);
              break;
            default:
              console.warn("Action inconnue reçue:", data.action);
          }
        });

        client.subscribe(`/topic/box/${boxInfo.id}/chat`, (message) => {
          console.log("💬 Reçu MESSAGE :", message.body);
          const data = JSON.parse(message.body);
          setMessages((prev) => [...prev, data]);
        });
      },
      onDisconnect: () => {
        setConnected(false);
        console.warn("❌ Déconnecté WebSocket");
      },
      onStompError: (frame) => {
        console.error("🚨 STOMP error:", frame.headers["message"]);
        console.error("Détails :", frame.body);
      },
    });

    client.activate();
    stompClient.current = client;

    return () => {
      console.log("🛑 Déconnexion WebSocket");
      client.deactivate();
    };
  }, [boxInfo]);

  // 3. Envoyer actions vidéo
  const sendAction = (action) => {
    if (
      stompClient.current &&
      stompClient.current.connected &&
      playerRef.current
    ) {
      const currentTime = playerRef.current.getCurrentTime?.() || 0;

      if (action === "seek" && lastSeekTime.current !== null) {
        const diff = Math.abs(currentTime - lastSeekTime.current);
        if (diff < 0.1) {
          console.log("⏩ Ignorer seek très proche");
          return;
        }
      }

      if (action === "seek") lastSeekTime.current = currentTime;

      console.log("📤 Envoi action vidéo:", action, "à", currentTime);

      stompClient.current.publish({
        destination: `/app/box/${boxInfo.id}/video-sync`,
        body: JSON.stringify({ action, time: currentTime }),
      });
    } else {
      console.warn(
        "🚫 Impossible d'envoyer action, pas connecté ou player manquant"
      );
    }
  };

  // 4. Démarrer la synchro
  const startSync = () => {
    setSyncStarted(true);
    console.log("▶️ Démarrage synchronisation vidéo");
    sendAction("play");
  };

  // 5. Envoyer un message chat
  const sendMessage = () => {
    if (!newMessage.trim()) {
      console.warn("⚠️ Message vide, non envoyé");
      return;
    }
    if (!stompClient.current?.connected) {
      console.warn("🚫 WebSocket non connecté, message non envoyé");
      return;
    }

    const msg = {
      sender: username,
      content: newMessage.trim(),
    };

    console.log("📤 Envoi message chat:", msg);

    stompClient.current.publish({
      destination: `/app/box/${boxInfo.id}/chat`,
      body: JSON.stringify(msg),
    });

    setNewMessage("");
  };

  // 6. Scroll automatique chat
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop =
        chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  if (error) {
    return (
      <div className="text-center text-white p-6">
        <p>{error}</p>
      </div>
    );
  }

  if (!boxInfo) {
    return (
      <div className="text-center text-white p-6">
        Chargement de la salle...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-6 flex flex-col items-center">
      <div className="w-full max-w-6xl space-y-6">
        <h1 className="text-3xl font-bold">{boxInfo.name}</h1>

        {boxInfo.movie?.videoUrl ? (
          <ReactPlayer
            ref={playerRef}
            url={boxInfo.movie.videoUrl}
            playing={playing}
            onPlay={() => sendAction("play")}
            onPause={() => sendAction("pause")}
            onSeek={() => sendAction("seek")}
            controls
            width="100%"
            height="500px"
          />
        ) : (
          <p className="text-red-400">
            ⚠️ Pas de vidéo disponible pour cette box.
          </p>
        )}

        {!syncStarted && (
          <button
            onClick={startSync}
            className="bg-teal-600 hover:bg-teal-700 px-6 py-3 rounded text-white"
          >
            ▶️ Démarrer la synchronisation
          </button>
        )}

        <div className="bg-gray-800 p-4 rounded-lg space-y-4">
          <div
            ref={chatContainerRef}
            className="h-64 overflow-y-auto bg-gray-900 rounded p-3 space-y-2"
          >
            {messages.length === 0 ? (
              <p className="text-gray-400 italic">Aucun message</p>
            ) : (
              messages.map((msg, i) => (
                <div key={i} className="text-sm">
                  <strong>{msg.sender}:</strong> {msg.content}
                </div>
              ))
            )}
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              className="flex-1 bg-gray-700 text-white px-4 py-2 rounded"
              placeholder="Écris un message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            />
            <button
              onClick={sendMessage}
              className="bg-teal-600 hover:bg-teal-700 px-4 py-2 rounded text-white"
            >
              Envoyer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
