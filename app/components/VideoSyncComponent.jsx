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
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [username, setUsername] = useState("Moi");
  const [userId, setUserId] = useState(null);
  const [boxInfo, setBoxInfo] = useState(null);
  const [error, setError] = useState(null);
  const chatContainerRef = useRef(null);
  const suppressEvent = useRef(false);

  // 🔹 1. Charger les infos utilisateur + box
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setError("Token non trouvé");
      return;
    }

    fetch("https://cinemamongo-production.up.railway.app/auth/getUserInfo", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((user) => {
        setUsername(user.username);
        setUserId(user.id);

        return fetch(
          `https://cinemamongo-production.up.railway.app/api/boxes/${boxId}?userId=${user.id}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
      })
      .then((res) => {
        if (!res.ok) throw new Error("Accès refusé à la box");
        return res.json();
      })
      .then((data) => {
        setBoxInfo(data);
      })
      .catch((err) => {
        console.error("Erreur:", err);
        setError("Erreur: " + err.message);
      });
  }, [boxId]);

  // 🔹 2. Connexion WebSocket + synchronisation initiale
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!boxInfo?.id || !token) return;

    const client = new Client({
      webSocketFactory: () =>
        new SockJS("https://cinemamongo-production.up.railway.app/ws"),
      connectHeaders: { Authorization: `Bearer ${token}` },
      reconnectDelay: 5000,
      onConnect: () => {
        console.log("✅ WebSocket connecté");
        setConnected(true);

        // 🔄 Abonnement à la synchronisation vidéo
        client.subscribe(`/topic/box/${boxInfo.id}/video-sync`, (msg) => {
          const data = JSON.parse(msg.body);
          if (!playerRef.current) return;

          suppressEvent.current = true;

          if (data.action === "play") {
            playerRef.current.seekTo(data.time || 0, "seconds");
            setTimeout(() => setPlaying(true), 300);
          } else if (data.action === "pause") {
            playerRef.current.seekTo(data.time || 0, "seconds");
            setTimeout(() => setPlaying(false), 300);
          } else if (data.action === "seek") {
            playerRef.current.seekTo(data.time || 0, "seconds");
          }

          setTimeout(() => {
            suppressEvent.current = false;
          }, 500);
        });

        // 🔄 Abonnement aux messages chat
        client.subscribe(`/topic/box/${boxInfo.id}/chat`, (msg) => {
          const data = JSON.parse(msg.body);
          setMessages((prev) => [...prev, data]);
        });

        // 🔄 Demander état de synchronisation aux autres clients
        client.publish({
          destination: `/app/box/${boxInfo.id}/video-sync`,
          body: JSON.stringify({ action: "sync_request", sender: userId }),
        });
      },
      onDisconnect: () => {
        console.warn("❌ WebSocket déconnecté");
        setConnected(false);
      },
      onStompError: (frame) => {
        console.error("🚨 STOMP Error:", frame.body);
      },
    });

    client.activate();
    stompClient.current = client;

    return () => {
      client.deactivate();
    };
  }, [boxInfo]);

  // 🔹 3. Envoi d'action vidéo
  const sendAction = (action) => {
    if (!stompClient.current?.connected || !playerRef.current) return;
    const time = playerRef.current.getCurrentTime() || 0;

    stompClient.current.publish({
      destination: `/app/box/${boxInfo.id}/video-sync`,
      body: JSON.stringify({ action, time }),
    });
  };

  // 🔹 4. Réactions aux événements locaux
  const handlePlay = () => {
    if (!suppressEvent.current) sendAction("play");
    setPlaying(true);
  };

  const handlePause = () => {
    if (!suppressEvent.current) sendAction("pause");
    setPlaying(false);
  };

  const handleSeek = () => {
    if (!suppressEvent.current) sendAction("seek");
  };

  // 🔹 5. Envoi de message chat
  const sendMessage = () => {
    if (!newMessage.trim()) return;
    const msg = {
      sender: username,
      content: newMessage.trim(),
    };

    stompClient.current?.publish({
      destination: `/app/box/${boxInfo.id}/chat`,
      body: JSON.stringify(msg),
    });

    setNewMessage("");
  };

  // 🔹 6. Scroll automatique du chat
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop =
        chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  if (error) {
    return (
      <div className="text-red-400 text-center p-6">
        <p>{error}</p>
      </div>
    );
  }

  if (!boxInfo) {
    return (
      <div className="text-white text-center p-6">Chargement de la box...</div>
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
            onPlay={handlePlay}
            onPause={handlePause}
            onSeek={handleSeek}
            controls
            width="100%"
            height="500px"
          />
        ) : (
          <p className="text-yellow-400">
            ⚠️ Pas de vidéo disponible pour cette box.
          </p>
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
