"use client";

import { useEffect, useRef, useState } from "react";
import * as SockJS from "sockjs-client";
import { Client } from "@stomp/stompjs";
import ReactPlayer from "react-player";
import MembersSidebar from "../components/MembersSidebar";
import AddMovieForm from "../components/AddMovieForm";
import CreateBoxForm from "./CreateBoxForm";
import InvitationsModal from "./InvitationsModal";
import InvitationsPage from "./Invitation";

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
  const [movies, setMovies] = useState([]);

  const chatContainerRef = useRef(null); // Référence au container de chat pour le scroll

  // ajouter un film
  const handleMovieAdded = (newMovie) => {
    setMovies((prevMovies) => [...prevMovies, newMovie]);
  };

  // 🔐 Auth + rejoindre la box
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setError("Token non trouvé.");
      return;
    }

    fetch("http://192.168.1.122:8080/auth/getUserInfo", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => res.json())
      .then((data) => {
        setUsername(data.username || "Moi");
        setUserId(data.id);

        // Étape 1: Rejoindre la box
        fetch(
          `http://192.168.1.122:8080/api/boxes/${boxId}?userId=${data.id}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: "Bearer " + token,
            },
          }
        )
          .then((response) => {
            if (!response.ok) {
              throw new Error("Accès refusé à la box");
            }
            return response.json();
          })
          .then((boxData) => {
            setBoxInfo(boxData);
          })
          .catch((err) => {
            setError("Erreur lors de l'accès à la box: " + err.message);
          });
      })
      .catch((err) => {
        setError("❌ Erreur de récupération utilisateur: " + err.message);
      });
  }, []);

  // 🔌 WebSocket
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!boxInfo?.id || !token) return;

    const socket = new WebSocket(`wss://cinemamongo-production.up.railway.app/ws`);
    const client = new Client({
      webSocketFactory: () => socket,
      onConnect: () => {
        setConnected(true);

        client.subscribe(`/topic/box/${boxInfo.id}/video-sync`, (message) => {
          const data = JSON.parse(message.body);
          if (!playerRef.current) return;

          switch (data.action) {
            case "play":
              playerRef.current.seekTo(data.time);
              setPlaying(true);
              break;
            case "pause":
              playerRef.current.seekTo(data.time);
              setPlaying(false);
              break;
            case "seek":
              lastSeekTime.current = data.time;
              playerRef.current.seekTo(data.time);
              break;
          }
        });

        client.subscribe(`/topic/box/${boxInfo.id}/chat`, (message) => {
          const data = JSON.parse(message.body);
          setMessages((prev) => [...prev, data]);
        });
      },
      onDisconnect: () => {
        setConnected(false);
        console.log("❌ Déconnecté WebSocket");
      },
    });

    client.activate();
    stompClient.current = client;

    return () => {
      client.deactivate();
    };
  }, [boxInfo]);

  // ▶️ Envoyer action vidéo
  const sendAction = (action) => {
    if (
      stompClient.current &&
      stompClient.current.connected &&
      playerRef.current
    ) {
      const currentTime = playerRef.current.getCurrentTime?.() || 0;

      if (action === "seek" && lastSeekTime.current !== null) {
        const diff = Math.abs(currentTime - lastSeekTime.current);
        if (diff < 0.1) return;
      }

      if (action === "seek") {
        lastSeekTime.current = currentTime;
      }

      stompClient.current.publish({
        destination: `/app/box/${boxInfo.id}/video-sync`,
        body: JSON.stringify({
          action,
          time: currentTime,
        }),
      });

      console.log("📤 [SYNC]", action, "@", currentTime);
    }
  };

  const startSync = () => {
    setSyncStarted(true);
    sendAction("play");
  };

  const sendMessage = () => {
    if (!newMessage.trim() || !stompClient.current?.connected) return;

    const msg = {
      sender: username,
      content: newMessage.trim(),
    };

    stompClient.current.publish({
      destination: `/app/box/${boxInfo.id}/chat`,
      body: JSON.stringify(msg),
    });

    setNewMessage("");
  };

  // Scrolling automatique vers le bas lorsque un message est ajouté
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
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-black text-white p-8 flex flex-col items-center font-sans">
      <div className="w-full max-w-6xl bg-gray-800 rounded-2xl overflow-hidden shadow-xl border border-gray-700">
        {/* HEADER */}
        <div className="p-6 flex flex-col sm:flex-row items-center justify-between gap-6 border-b border-gray-700">
          <h2 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-yellow-500">
            {boxInfo.name}
          </h2>
          {!syncStarted && (
            <button
              onClick={startSync}
              className="px-8 py-3 bg-gradient-to-r from-teal-500 to-blue-600 hover:from-teal-600 hover:to-blue-700 text-white font-semibold rounded-xl shadow-lg transition-transform transform hover:scale-105 hover:shadow-xl"
            >
              ▶️ Démarrer la synchronisation
            </button>
          )}
        </div>

        {/* CONTENU PRINCIPAL */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-black rounded-xl">
          {/* VIDEO */}
          <div className="md:col-span-2 bg-black rounded-xl overflow-hidden shadow-lg border border-gray-700">
            {boxInfo.movie?.videoUrl && (
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
                className="rounded-xl transition-all duration-300"
              />
            )}
          </div>
        </div>

        {/* CHAT */}
        <div className="p-6 bg-gray-800 border-t border-gray-700 w-full rounded-xl shadow-lg">
          <div
            ref={chatContainerRef}
            className="w-full h-64 overflow-y-auto bg-gray-900 border border-gray-700 rounded-lg p-4 mb-4 space-y-4 scroll-smooth"
          >
            {messages.length === 0 ? (
              <p className="text-gray-400 italic">
                Aucun message pour l’instant...
              </p>
            ) : (
              messages.map((msg, idx) => {
                const isMine = msg.sender === username;
                return (
                  <div
                    key={idx}
                    className={`flex ${
                      isMine ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-xs md:max-w-sm break-words px-4 py-3 rounded-lg shadow-md transition-all duration-300 ease-in-out transform ${
                        isMine
                          ? "bg-teal-500 text-white rounded-br-none"
                          : "bg-gray-300 text-black rounded-bl-none"
                      }`}
                    >
                      <p className="text-xs font-semibold mb-1">{msg.sender}</p>
                      <p className="text-sm">{msg.content}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full">
            <input
              type="text"
              className="flex-1 bg-gray-700 text-white px-6 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all duration-300 ease-in-out transform"
              placeholder="Écris un message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            />
            <button
              onClick={sendMessage}
              className="px-6 py-3 bg-teal-600 hover:bg-teal-700 transition-all duration-300 ease-in-out transform hover:scale-105 text-white rounded-lg shadow-lg"
            >
              💬 Envoyer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
