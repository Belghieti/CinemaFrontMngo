import { useEffect, useRef, useState } from "react";
import { Client } from "@stomp/stompjs";
import ReactPlayer from "react-player";

export default function VideoSyncComponent({ boxId }) {
  const playerRef = useRef(null);
  const stompClient = useRef(null);
  const chatContainerRef = useRef(null);
  const invitContainerRef = useRef(null);
  const suppressEvent = useRef(false);
  const seekTimeout = useRef(null);
  const lastSyncTime = useRef(0);

  const [connected, setConnected] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [invitations, setInvitations] = useState([]);
  const [boxInfo, setBoxInfo] = useState(null);
  const [error, setError] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [isHost, setIsHost] = useState(false);

  // Fonction pour détecter le type de vidéo et optimiser la configuration
  const getVideoConfig = (url) => {
    if (!url) return {};

    const urlLower = url.toLowerCase();

    // Configuration spécifique selon le type de fichier
    if (urlLower.includes("youtube.com") || urlLower.includes("youtu.be")) {
      return {
        youtube: {
          playerVars: {
            showinfo: 0,
            controls: 1,
            disablekb: 0,
            enablejsapi: 1,
            fs: 1,
            modestbranding: 1,
            rel: 0,
            iv_load_policy: 3,
          },
        },
      };
    } else if (urlLower.includes(".m3u8")) {
      return {
        file: {
          forceHLS: true,
          forceVideo: true,
          attributes: {
            crossOrigin: "anonymous",
            controlsList: "nodownload",
            preload: "metadata",
          },
        },
      };
    } else if (
      urlLower.includes(".mp4") ||
      urlLower.includes(".webm") ||
      urlLower.includes(".ogg") ||
      urlLower.includes(".mov")
    ) {
      return {
        file: {
          forceVideo: true,
          forceHLS: false,
          attributes: {
            crossOrigin: "anonymous",
            controlsList: "nodownload",
            preload: "metadata",
            playsInline: true,
          },
        },
      };
    } else {
      // Configuration générale pour autres formats
      return {
        file: {
          forceVideo: true,
          attributes: {
            crossOrigin: "anonymous",
            controlsList: "nodownload",
            preload: "metadata",
            playsInline: true,
          },
        },
      };
    }
  };

  // Récupération de la box + film
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return setError("Token manquant");

    fetch("https://cinemamongo-production.up.railway.app/auth/getUserInfo", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((user) => {
        setCurrentUser(user);
        fetch(
          `https://cinemamongo-production.up.railway.app/api/boxes/${boxId}?userId=${user.id}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        )
          .then((res) => res.json())
          .then((boxData) => {
            setBoxInfo(boxData);
            // Vérifier si l'utilisateur est le créateur
            setIsHost(boxData.createdBy === user.id);
          })
          .catch(() => setError("Erreur chargement de la box"));
      })
      .catch(() => setError("Erreur utilisateur"));
  }, [boxId]);

  // Fonction pour demander la synchronisation
  const requestSync = () => {
    if (!stompClient.current?.connected || !currentUser) return;

    // Envoyer une demande de synchronisation via le chat (utilisation créative du système existant)
    stompClient.current.publish({
      destination: `/app/box/${boxId}/chat`,
      body: JSON.stringify({
        sender: "SYSTEM",
        senderId: "SYNC_REQUEST",
        content: `SYNC_REQUEST:${currentUser.id}`,
      }),
    });
  };

  // Fonction pour envoyer l'état actuel
  const sendCurrentState = () => {
    if (!stompClient.current?.connected || !playerRef.current) return;

    const currentPlayerTime = playerRef.current.getCurrentTime();

    // Envoyer l'état via video-sync
    stompClient.current.publish({
      destination: `/app/box/${boxId}/video-sync`,
      body: JSON.stringify({
        action: "sync-state",
        time: currentPlayerTime,
        playing: playing,
      }),
    });
  };

  // Connexion WebSocket
  useEffect(() => {
    if (!boxInfo || !currentUser) return;

    const client = new Client({
      brokerURL: `wss://cinemamongo-production.up.railway.app/ws`,
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
      onConnect: () => {
        setConnected(true);
        console.log("🟢 WebSocket connecté");

        // Demander la synchronisation après connexion
        setTimeout(() => {
          requestSync();
        }, 1500);

        // Écouter les synchronisations vidéo
        client.subscribe(`/topic/box/${boxId}/video-sync`, (msg) => {
          const videoMessage = JSON.parse(msg.body);
          console.log("📺 Message vidéo reçu:", videoMessage);

          suppressEvent.current = true;

          if (videoMessage.action === "play") {
            setPlaying(true);
            if (playerRef.current && videoMessage.time) {
              playerRef.current.seekTo(videoMessage.time, "seconds");
            }
          } else if (videoMessage.action === "pause") {
            setPlaying(false);
            if (playerRef.current && videoMessage.time) {
              playerRef.current.seekTo(videoMessage.time, "seconds");
            }
          } else if (videoMessage.action === "seek" && playerRef.current) {
            const seekTime = videoMessage.time || 0;
            playerRef.current.seekTo(seekTime, "seconds");
            lastSyncTime.current = seekTime;
          } else if (
            videoMessage.action === "sync-state" &&
            playerRef.current
          ) {
            // Synchroniser avec l'état reçu
            const syncTime = videoMessage.time || 0;
            playerRef.current.seekTo(syncTime, "seconds");
            setPlaying(videoMessage.playing || false);
            lastSyncTime.current = syncTime;
          }

          setTimeout(() => {
            suppressEvent.current = false;
          }, 1000);
        });

        // Écouter le chat (pour les demandes de sync)
        client.subscribe(`/topic/box/${boxId}/chat`, (msg) => {
          const chatMessage = JSON.parse(msg.body);

          // Vérifier si c'est une demande de synchronisation
          if (
            chatMessage.senderId === "SYNC_REQUEST" &&
            chatMessage.content.includes("SYNC_REQUEST:") &&
            !chatMessage.content.includes(currentUser.id)
          ) {
            // Si je suis l'hôte ou si je regarde actuellement, envoyer l'état
            if (isHost || playing || playerRef.current?.getCurrentTime() > 0) {
              setTimeout(() => {
                sendCurrentState();
              }, 500);
            }
          } else if (chatMessage.senderId !== "SYNC_REQUEST") {
            // Message de chat normal
            setMessages((prev) => [...prev, chatMessage]);
          }
        });

        client.subscribe(`/topic/box/${boxId}/invitations`, (msg) => {
          setInvitations((prev) => [...prev, JSON.parse(msg.body)]);
        });
      },
      onDisconnect: () => {
        setConnected(false);
        console.log("🔴 WebSocket déconnecté");
      },
      onStompError: (frame) => {
        console.error("❌ Erreur STOMP:", frame);
      },
    });

    client.activate();
    stompClient.current = client;

    return () => {
      client.deactivate();
    };
  }, [boxInfo, currentUser, isHost, playing]);

  const sendVideoAction = (action, time = null) => {
    if (!stompClient.current?.connected) return;

    const currentPlayerTime = time || playerRef.current?.getCurrentTime() || 0;
    const body = { action, time: currentPlayerTime };

    console.log("📤 Envoi action vidéo:", body);

    stompClient.current.publish({
      destination: `/app/box/${boxId}/video-sync`,
      body: JSON.stringify(body),
    });

    if (action === "play") setPlaying(true);
    if (action === "pause") setPlaying(false);
  };

  const handlePlay = () => {
    if (!suppressEvent.current) {
      console.log("▶️ Play déclenché");
      sendVideoAction("play");
    }
  };

  const handlePause = () => {
    if (!suppressEvent.current) {
      console.log("⏸️ Pause déclenché");
      sendVideoAction("pause");
    }
  };

  const handleSeek = (seconds) => {
    if (!suppressEvent.current) {
      console.log("⏩ Seek vers:", seconds);
      clearTimeout(seekTimeout.current);
      seekTimeout.current = setTimeout(() => {
        sendVideoAction("seek", seconds);
      }, 300);
    }
  };

  const handleProgress = (progress) => {
    setCurrentTime(progress.playedSeconds);
  };

  // Fonction de synchronisation manuelle
  const handleManualSync = () => {
    console.log("🔄 Synchronisation manuelle demandée");
    requestSync();
  };

  const sendMessage = () => {
    if (!newMessage.trim() || !stompClient.current?.connected || !currentUser)
      return;

    stompClient.current.publish({
      destination: `/app/box/${boxId}/chat`,
      body: JSON.stringify({
        sender: currentUser.username,
        senderId: currentUser.id,
        content: newMessage,
      }),
    });

    setNewMessage("");
  };

  // Auto-scroll pour les messages
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop =
        chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  if (error) {
    return (
      <div className="p-8 text-center">
        <div className="w-16 h-16 bg-red-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <svg
            className="w-8 h-8 text-red-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <p className="text-red-400 font-medium">{error}</p>
        <p className="text-gray-400 text-sm mt-2">
          Veuillez actualiser la page
        </p>
      </div>
    );
  }

  if (!boxInfo) {
    return (
      <div className="p-8 text-center">
        <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-300 font-medium">Chargement du contenu...</p>
        <p className="text-gray-400 text-sm mt-2">
          Préparation de votre expérience cinéma
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Movie Title Header */}
      <div className="p-6 bg-gradient-to-r from-slate-800/50 to-slate-700/50 rounded-2xl border border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-2xl flex items-center justify-center text-2xl shadow-lg">
              🎬
            </div>
            <div>
              <h3 className="text-2xl font-bold text-white mb-1">
                {boxInfo.name}
              </h3>
              <div className="flex items-center space-x-4 text-sm text-gray-400">
                <div className="flex items-center space-x-2">
                  <div
                    className={`w-3 h-3 rounded-full ${
                      connected ? "bg-green-500" : "bg-red-500"
                    } animate-pulse`}
                  ></div>
                  <span>{connected ? "Connecté" : "Déconnecté"}</span>
                </div>
                {isHost && (
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                    <span>Hôte</span>
                  </div>
                )}
                {boxInfo.movie && (
                  <div className="flex items-center space-x-2">
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2m-9 0h10m-10 0l1 16h8l1-16"
                      />
                    </svg>
                    <span>Film disponible</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Bouton de synchronisation */}
          <button
            onClick={handleManualSync}
            disabled={!connected}
            className="bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed px-4 py-2 rounded-xl font-medium transition-all duration-300 shadow-lg hover:shadow-purple-500/25 hover:scale-105 active:scale-95 flex items-center space-x-2"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            <span>Synchroniser</span>
          </button>
        </div>
      </div>

      {/* Video Player */}
      <div className="relative bg-black rounded-2xl overflow-hidden shadow-2xl border-2 border-white/10">
        {boxInfo.movie?.videoUrl ? (
          <div className="relative aspect-video">
            <ReactPlayer
              ref={playerRef}
              url={boxInfo.movie.videoUrl}
              playing={playing}
              controls={true}
              onPlay={handlePlay}
              onPause={handlePause}
              onSeek={handleSeek}
              onProgress={handleProgress}
              width="100%"
              height="100%"
              config={getVideoConfig(boxInfo.movie.videoUrl)}
              // Props supplémentaires pour améliorer la compatibilité
              playsinline={true}
              pip={false}
              stopOnUnmount={false}
              onReady={() => {
                console.log("🎬 Player prêt pour:", boxInfo.movie.videoUrl);
                console.log(
                  "🔧 Configuration utilisée:",
                  getVideoConfig(boxInfo.movie.videoUrl)
                );
              }}
              onError={(error) => {
                console.error("❌ Erreur player:", error);
                console.log("🔍 URL problématique:", boxInfo.movie.videoUrl);
                console.log(
                  "🔧 Configuration utilisée:",
                  getVideoConfig(boxInfo.movie.videoUrl)
                );
              }}
              onBuffer={() => {
                console.log("⏳ Mise en mémoire tampon...");
              }}
              onBufferEnd={() => {
                console.log("✅ Mise en mémoire tampon terminée");
              }}
            />
            {!connected && (
              <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-white font-medium">
                    Connexion en cours...
                  </p>
                  <p className="text-gray-400 text-sm">
                    Synchronisation avec les autres spectateurs
                  </p>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="aspect-video flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
            <div className="text-center">
              <div className="w-24 h-24 bg-gray-700 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <svg
                  className="w-12 h-12 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <h4 className="text-xl font-bold text-white mb-2">
                Aucun film disponible
              </h4>
              <p className="text-gray-400">
                Ajoutez un film pour commencer la séance
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Chat and Invitations Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chat Section */}
        <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-xl p-6 rounded-2xl border border-white/10 shadow-xl">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center text-xl shadow-lg">
              💬
            </div>
            <h3 className="text-xl font-bold text-blue-400">Chat en direct</h3>
          </div>

          {/* Messages Container */}
          <div
            ref={chatContainerRef}
            className="h-64 overflow-y-auto mb-4 space-y-3 custom-scrollbar"
          >
            {messages.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-gray-700/50 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <svg
                    className="w-8 h-8 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                    />
                  </svg>
                </div>
                <p className="text-gray-400 text-sm">
                  Aucun message pour le moment
                </p>
              </div>
            ) : (
              messages.map((msg, i) => {
                const isCurrentUser =
                  currentUser && msg.senderId === currentUser.id;
                return (
                  <div
                    key={i}
                    className={`p-3 rounded-xl border ${
                      isCurrentUser
                        ? "bg-blue-500/20 border-blue-500/30 ml-8"
                        : "bg-white/5 border-white/10 mr-8"
                    }`}
                  >
                    <div className="flex items-center space-x-2 mb-1">
                      <div
                        className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold text-white ${
                          isCurrentUser
                            ? "bg-gradient-to-br from-blue-500 to-cyan-500"
                            : "bg-gradient-to-br from-purple-500 to-pink-500"
                        }`}
                      >
                        {msg.sender?.charAt(0)?.toUpperCase() || "?"}
                      </div>
                      <span
                        className={`font-semibold text-sm ${
                          isCurrentUser ? "text-blue-300" : "text-purple-300"
                        }`}
                      >
                        {isCurrentUser ? "Vous" : msg.sender}
                      </span>
                      <span className="text-xs text-gray-500">•</span>
                      <span className="text-xs text-gray-500">maintenant</span>
                    </div>
                    <p
                      className={`text-sm ${
                        isCurrentUser
                          ? "ml-8 text-blue-100"
                          : "ml-8 text-gray-200"
                      }`}
                    >
                      {msg.content}
                    </p>
                  </div>
                );
              })
            )}
          </div>

          {/* Message Input */}
          <div className="flex space-x-3">
            <input
              type="text"
              value={newMessage}
              placeholder="Tapez votre message..."
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              className="flex-1 px-4 py-3 rounded-xl bg-white/10 border border-white/20 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent placeholder-gray-400 text-white transition-all duration-300"
            />
            <button
              onClick={sendMessage}
              disabled={!newMessage.trim() || !connected || !currentUser}
              className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed px-6 py-3 rounded-xl font-medium transition-all duration-300 shadow-lg hover:shadow-blue-500/25 hover:scale-105 active:scale-95"
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
                  d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Invitations Section */}
        <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-xl p-6 rounded-2xl border border-white/10 shadow-xl">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center text-xl shadow-lg">
              📨
            </div>
            <h3 className="text-xl font-bold text-green-400">Invitations</h3>
          </div>

          <div
            ref={invitContainerRef}
            className="h-64 overflow-y-auto space-y-3 custom-scrollbar"
          >
            {invitations.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-gray-700/50 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <svg
                    className="w-8 h-8 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <p className="text-gray-400 text-sm">Aucune invitation reçue</p>
              </div>
            ) : (
              invitations.map((inv, i) => (
                <div
                  key={i}
                  className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 p-4 rounded-xl border border-green-500/20"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg flex items-center justify-center text-sm font-bold text-white">
                      {inv.invitedUsername?.charAt(0)?.toUpperCase() || "?"}
                    </div>
                    <div>
                      <p className="font-medium text-green-300">
                        {inv.invitedUsername}
                      </p>
                      <p className="text-xs text-gray-400">
                        vous a invité à regarder
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Custom Scrollbar Styles */}
      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(147, 51, 234, 0.5);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(147, 51, 234, 0.7);
        }
      `}</style>
    </div>
  );
}
