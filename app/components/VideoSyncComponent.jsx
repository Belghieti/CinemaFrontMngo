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
  const [username, setUsername] = useState("Moi");
  const [userId, setUserId] = useState(null);
  const [boxInfo, setBoxInfo] = useState(null);
  const [error, setError] = useState(null);
  const chatContainerRef = useRef(null);
  const lastSeekTime = useRef(0);
  const suppressEvent = useRef(false);

  // ✅ 1. Charger infos utilisateur + box
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
        console.log("👤 Utilisateur:", user);
        setUsername(user.username);
        setUserId(user.id);

        return fetch(
          `https://cinemamongo-production.up.railway.app/api/boxes/${boxId}?userId=${user.id}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
      })
      .then((res) => {
        if (!res.ok) throw new Error("Accès refusé à la box");
        return res.json();
      })
      .then((data) => {
        console.log("📦 Box reçue:", data);
        setBoxInfo(data);
      })
      .catch((err) => {
        console.error("Erreur:", err);
        setError("Erreur: " + err.message);
      });
  }, [boxId]);

  // ✅ 2. Connexion WebSocket
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

        client.subscribe(`/topic/box/${boxInfo.id}/video-sync`, (msg) => {
          const data = JSON.parse(msg.body);
          console.log("🎬 Reçu:", data);

          if (!playerRef.current) return;
          suppressEvent.current = true;

          if (data.action === "play") {
            playerRef.current.seekTo(data.time || 0);
            setPlaying(true);
          } else if (data.action === "pause") {
            playerRef.current.seekTo(data.time || 0);
            setPlaying(false);
          } else if (data.action === "seek") {
            playerRef.current.seekTo(data.time || 0);
          }

          setTimeout(() => {
            suppressEvent.current = false;
          }, 500);
        });

        client.subscribe(`/topic/box/${boxInfo.id}/chat`, (msg) => {
          const data = JSON.parse(msg.body);
          console.log("💬 Message reçu:", data);
          setMessages((prev) => [...prev, data]);
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
      console.log("🛑 WS déconnecté");
    };
  }, [boxInfo]);

  // ✅ 3. Événements vidéo (locaux → envoi WS)
  const sendAction = (action) => {
    if (!stompClient.current?.connected || !playerRef.current) return;
    const time = playerRef.current.getCurrentTime() || 0;

    console.log("📤 Envoi:", action, "@", time.toFixed(2));

    stompClient.current.publish({
      destination: `/app/box/${boxInfo.id}/video-sync`,
      body: JSON.stringify({ action, time }),
    });
  };

  // ✅ 4. Contrôle de ReactPlayer
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

  // ✅ 5. Envoyer un message chat
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

        {!syncStarted && (
          <button
            onClick={() => {
              setSyncStarted(true);
              sendAction("play");
            }}
            className="bg-teal-600 hover:bg-teal-700 px-6 py-3 rounded"
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
