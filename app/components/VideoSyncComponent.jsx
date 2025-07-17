"use client";

import { useEffect, useRef, useState } from "react";
import SockJS from "sockjs-client";
import { Client } from "@stomp/stompjs";
import ReactPlayer from "react-player";
import MembersSidebar from "../components/MembersSidebar";
import AddMovieForm from "../components/AddMovieForm";
import CreateBoxForm from "./CreateBoxForm";
import InvitationsModal from "./InvitationsModal";
import InvitationsPage from "./Invitation";

export default function VideoSyncComponent({ boxId }) {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
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

  const chatContainerRef = useRef(null);

  const handleMovieAdded = (newMovie) => {
    setMovies((prevMovies) => [...prevMovies, newMovie]);
  };

  // 🔐 Auth + Rejoindre la box
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setError("Token non trouvé.");
      return;
    }

    fetch(`${baseUrl}/auth/getUserInfo`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => res.json())
      .then((data) => {
        setUsername(data.username || "Moi");
        setUserId(data.id);

        fetch(`${baseUrl}/api/boxes/${boxId}?userId=${data.id}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + token,
          },
        })
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
        setError("Erreur de récupération utilisateur: " + err.message);
      });
  }, [baseUrl, boxId]);

  // 🔌 WebSocket - Version alternative sans SockJS
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!boxInfo?.id || !token) return;

    // Fonction pour construire l'URL WebSocket correcte
  const wsUrl = `${baseUrl}/ws`; // Exemple: https://cinema-backend-production.up.railway.app/ws


    // Option 1: Utiliser WebSocket natif si SockJS pose problème
    if (window.location.protocol === 'https:' && !wsUrl.startsWith('wss:')) {
      setError('Configuration WebSocket incorrecte pour HTTPS');
      return;
    }

    // Configuration du client STOMP
    const client = new Client({
      // Option A: Utiliser SockJS
      webSocketFactory: () => new SockJS(wsUrl),
      
      // Option B: Alternative avec WebSocket natif (décommentez si SockJS ne fonctionne pas)
      // brokerURL: wsUrl.replace('/ws', '/websocket'),
      
      connectHeaders: { Authorization: "Bearer " + token },
      
      // Paramètres de reconnexion
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
      
      onConnect: () => {
        console.log('✅ WebSocket connecté');
        setConnected(true);
        setError(null); // Réinitialiser l'erreur

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
        console.log('❌ WebSocket déconnecté');
        setConnected(false);
      },
      
      onWebSocketError: (error) => {
        console.error('❌ Erreur WebSocket:', error);
        setError(`Erreur de connexion WebSocket. Vérifiez que votre serveur supporte WSS sur ${wsUrl}`);
      },
      
      onStompError: (frame) => {
        console.error('❌ Erreur STOMP:', frame.headers.message);
        setError('Erreur de connexion STOMP: ' + frame.headers.message);
      },
    });

    try {
      client.activate();
      stompClient.current = client;
    } catch (error) {
      console.error('❌ Erreur lors de l\'activation:', error);
      setError('Impossible d\'établir la connexion WebSocket');
    }

    return () => {
      try {
        if (client && client.connected) {
          client.deactivate();
        }
      } catch (error) {
        console.error('Erreur lors de la déconnexion:', error);
      }
    };
  }, [boxInfo, baseUrl]);

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
        body: JSON.stringify({ action, time: currentTime }),
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

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop =
        chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-black text-white flex items-center justify-center">
        <div className="text-center p-6 bg-red-900/20 border border-red-500 rounded-lg">
          <p className="text-red-400 text-lg mb-4">❌ {error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
          >
            Recharger la page
          </button>
        </div>
      </div>
    );
  }

  if (!boxInfo) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-black text-white flex items-center justify-center">
        <div className="text-center p-6">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-lg">Chargement de la salle...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-black text-white p-8 flex flex-col items-center font-sans">
      <div className="w-full max-w-6xl bg-gray-800 rounded-2xl overflow-hidden shadow-xl border border-gray-700">
        {/* Header */}
        <div className="p-6 flex flex-col sm:flex-row items-center justify-between gap-6 border-b border-gray-700">
          <div className="flex items-center gap-4">
            <h2 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-yellow-500">
              {boxInfo.name}
            </h2>
            <div className={`w-3 h-3 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} title={connected ? 'Connecté' : 'Déconnecté'} />
          </div>
          {!syncStarted && (
            <button
              onClick={startSync}
              disabled={!connected}
              className="px-8 py-3 bg-gradient-to-r from-teal-500 to-blue-600 hover:from-teal-600 hover:to-blue-700 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white font-semibold rounded-xl shadow-lg transition-transform transform hover:scale-105 hover:shadow-xl disabled:hover:scale-100"
            >
              ▶️ Démarrer la synchronisation
            </button>
          )}
        </div>

        {/* Contenu */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-black rounded-xl">
          <div className="md:col-span-2 bg-black rounded-xl overflow-hidden shadow-lg border border-gray-700">
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
                className="rounded-xl transition-all duration-300"
              />
            ) : (
              <div className="w-full h-96 bg-gray-900 flex items-center justify-center text-gray-400">
                <p>Aucune vidéo disponible</p>
              </div>
            )}
          </div>
        </div>

        {/* Chat */}
        <div className="p-6 bg-gray-800 border-t border-gray-700 w-full rounded-xl shadow-lg">
          <div
            ref={chatContainerRef}
            className="w-full h-64 overflow-y-auto bg-gray-900 border border-gray-700 rounded-lg p-4 mb-4 space-y-4 scroll-smooth"
          >
            {messages.length === 0 ? (
              <p className="text-gray-400 italic">
                Aucun message pour l'instant...
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
              disabled={!connected}
            />
            <button
              onClick={sendMessage}
              disabled={!connected || !newMessage.trim()}
              className="px-6 py-3 bg-teal-600 hover:bg-teal-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-all duration-300 ease-in-out transform hover:scale-105 text-white rounded-lg shadow-lg"
            >
              💬 Envoyer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
