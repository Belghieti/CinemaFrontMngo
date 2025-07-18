"use client";

import { useEffect, useRef, useState } from "react";
import { Client } from "@stomp/stompjs";
import ReactPlayer from "react-player";
import MembersSidebar from "../components/MembersSidebar";
import AddMovieForm from "../components/AddMovieForm";
import CreateBoxForm from "./CreateBoxForm";
import InvitationsModal from "./InvitationsModal";
import InvitationsPage from "./Invitation";
import SockJS from "sockjs-client";


export default function VideoSyncComponent({ boxId }) {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ;
  
  // WebSocket URL configuration for different environments
 const getSockJsUrl = () => {
  return process.env.NEXT_PUBLIC_SOCKJS_URL || "https://cinemamongo-production.up.railway.app/websocket";
};

  const playerRef = useRef(null);
  const stompClient = useRef(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
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

  // Test WebSocket connection
  const testWebSocketConnection = async (wsUrl) => {
    return new Promise((resolve, reject) => {
      try {
        const testSocket = new WebSocket(wsUrl);
        
        testSocket.onopen = () => {
          console.log('✅ WebSocket connection test successful');
          testSocket.close();
          resolve(true);
        };
        
        testSocket.onerror = (error) => {
          console.error('❌ WebSocket connection test failed:', error);
          reject(error);
        };
        
        testSocket.onclose = (event) => {
          if (event.code !== 1000) {
            console.error('❌ WebSocket closed unexpectedly:', event);
            reject(new Error(`WebSocket closed with code: ${event.code}`));
          }
        };
        
        // Timeout after 10 seconds
        setTimeout(() => {
          if (testSocket.readyState === WebSocket.CONNECTING) {
            testSocket.close();
            reject(new Error('WebSocket connection timeout'));
          }
        }, 10000);
      } catch (error) {
        reject(error);
      }
    });
  };

  // 🔐 Auth + Rejoindre la box
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setError("Token non trouvé. Veuillez vous reconnecter.");
      return;
    }

    const fetchUserAndBox = async () => {
      try {
        // Get user info
        const userResponse = await fetch(`${baseUrl}/auth/getUserInfo`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!userResponse.ok) {
          throw new Error('Erreur d\'authentification');
        }

        const userData = await userResponse.json();
        setUsername(userData.username || "Moi");
        setUserId(userData.id);

        // Get box info
        const boxResponse = await fetch(`${baseUrl}/api/boxes/${boxId}?userId=${userData.id}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        if (!boxResponse.ok) {
          throw new Error("Accès refusé à la box");
        }

        const boxData = await boxResponse.json();
        setBoxInfo(boxData);

      } catch (err) {
        console.error('Error fetching user/box data:', err);
        setError(`Erreur: ${err.message}`);
      }
    };

    fetchUserAndBox();
  }, [baseUrl, boxId]);
   const sockJsUrl = getSockJsUrl();

  // WebSocket connection with retry logic
  const connectWebSocket = async () => {
    const token = localStorage.getItem("token");
    if (!boxInfo?.id || !token) return;

    if (connecting) return; // Prevent multiple connection attempts
    
    setConnecting(true);
    setError(null);

    const wsUrl = getWebSocketUrl();
    console.log(`🔌 Attempting to connect to WebSocket: ${wsUrl}`);

    try {
      // Test basic WebSocket connection first
      await testWebSocketConnection(wsUrl);
      
      const client = new Client({
         webSocketFactory: () => new SockJS(sockJsUrl),
        connectHeaders: {
          Authorization: `Bearer ${token}`,
        },
        reconnectDelay: 5000,
        heartbeatIncoming: 4000,
        heartbeatOutgoing: 4000,
        connectionTimeout: 15000,
        debug: function (str) {
          console.log("[STOMP DEBUG]:", str);
        },
        onConnect: (frame) => {
          console.log("✅ STOMP WebSocket connected successfully");
          setConnected(true);
          setConnecting(false);
          setError(null);
          reconnectAttempts.current = 0;

          // Subscribe to video sync
          client.subscribe(`/topic/box/${boxInfo.id}/video-sync`, (message) => {
            try {
              const data = JSON.parse(message.body);
              if (!playerRef.current) return;

              console.log("📨 Received video sync:", data);

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
                default:
                  console.warn("Unknown video sync action:", data.action);
              }
            } catch (error) {
              console.error("Error processing video sync message:", error);
            }
          });

          // Subscribe to chat
          client.subscribe(`/topic/box/${boxInfo.id}/chat`, (message) => {
            try {
              const data = JSON.parse(message.body);
              console.log("📨 Received chat message:", data);
              setMessages((prev) => [...prev, data]);
            } catch (error) {
              console.error("Error processing chat message:", error);
            }
          });
        },
        onDisconnect: (frame) => {
          console.log("❌ STOMP WebSocket disconnected");
          setConnected(false);
          setConnecting(false);
          
          // Attempt to reconnect if not intentional
          if (reconnectAttempts.current < maxReconnectAttempts) {
            reconnectAttempts.current++;
            console.log(`🔄 Attempting to reconnect (${reconnectAttempts.current}/${maxReconnectAttempts})`);
            setTimeout(() => {
              connectWebSocket();
            }, 3000 * reconnectAttempts.current); // Exponential backoff
          } else {
            setError("Connection perdue. Veuillez recharger la page.");
          }
        },
        onWebSocketError: (error) => {
          console.error("❌ WebSocket Error:", error);
          setConnecting(false);
          setError(`Erreur WebSocket: Impossible de se connecter au serveur. Vérifiez votre connexion internet.`);
        },
        onStompError: (frame) => {
          console.error("❌ STOMP Error:", frame.headers.message);
          setConnecting(false);
          setError(`Erreur STOMP: ${frame.headers.message}`);
        },
      });

      // Activate the client
      await client.activate();
      stompClient.current = client;

    } catch (error) {
      console.error("❌ Failed to connect WebSocket:", error);
      setConnecting(false);
      setError(`Impossible de se connecter au serveur WebSocket: ${error.message}`);
      
      // Retry connection
      if (reconnectAttempts.current < maxReconnectAttempts) {
        reconnectAttempts.current++;
        setTimeout(() => {
          connectWebSocket();
        }, 5000 * reconnectAttempts.current);
      }
    }
  };

  // 🔌 WebSocket Connection Management
  useEffect(() => {
    if (boxInfo?.id) {
      connectWebSocket();
    }

    // Cleanup on unmount
    return () => {
      if (stompClient.current) {
        try {
          console.log("🔌 Cleaning up WebSocket connection");
          stompClient.current.deactivate();
          stompClient.current = null;
        } catch (error) {
          console.error("Error during WebSocket cleanup:", error);
        }
      }
    };
  }, [boxInfo?.id]);

  // Manual reconnection function
  const handleReconnect = () => {
    reconnectAttempts.current = 0;
    connectWebSocket();
  };

  const sendAction = (action) => {
    if (!stompClient.current?.connected || !playerRef.current) {
      console.warn("Cannot send action: WebSocket not connected or player not ready");
      return;
    }

    try {
      const currentTime = playerRef.current.getCurrentTime?.() || 0;

      // Prevent rapid seek events
      if (action === "seek" && lastSeekTime.current !== null) {
        const diff = Math.abs(currentTime - lastSeekTime.current);
        if (diff < 0.1) return;
      }

      if (action === "seek") {
        lastSeekTime.current = currentTime;
      }

      const payload = {
        action,
        time: currentTime,
        userId: userId,
        username: username
      };

      stompClient.current.publish({
        destination: `/app/box/${boxInfo.id}/video-sync`,
        body: JSON.stringify(payload),
      });

      console.log("📤 [SYNC] Sent:", action, "@", currentTime);
    } catch (error) {
      console.error("Error sending action:", error);
      setError("Erreur lors de l'envoi de l'action");
    }
  };

  const startSync = () => {
    if (!connected) {
      setError("Connexion WebSocket requise pour démarrer la synchronisation");
      return;
    }
    setSyncStarted(true);
    sendAction("play");
  };

  const sendMessage = () => {
    if (!newMessage.trim()) return;
    
    if (!stompClient.current?.connected) {
      setError("Impossible d'envoyer le message: connexion WebSocket fermée");
      return;
    }

    try {
      const msg = {
        sender: username,
        content: newMessage.trim(),
        timestamp: new Date().toISOString(),
        userId: userId
      };

      stompClient.current.publish({
        destination: `/app/box/${boxInfo.id}/chat`,
        body: JSON.stringify(msg),
      });

      setNewMessage("");
    } catch (error) {
      console.error("Error sending message:", error);
      setError("Erreur lors de l'envoi du message");
    }
  };

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.key === 'Escape') {
        setError(null);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-black text-white flex items-center justify-center p-4">
        <div className="text-center p-6 bg-red-900/20 border border-red-500 rounded-lg max-w-md">
          <h2 className="text-red-400 text-xl font-bold mb-4">❌ Erreur de connexion</h2>
          <p className="text-red-300 text-sm mb-6">{error}</p>
          <div className="flex flex-col gap-3">
            <button 
              onClick={handleReconnect}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
            >
              🔄 Reconnecter
            </button>
            <button 
              onClick={() => window.location.reload()} 
              className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
            >
              🔄 Recharger la page
            </button>
            <button 
              onClick={() => setError(null)} 
              className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg transition-colors text-sm"
            >
              Fermer
            </button>
          </div>
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
          <p className="text-sm text-gray-400 mt-2">Connexion au serveur en cours</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-black text-white p-4 sm:p-8 flex flex-col items-center font-sans">
      <div className="w-full max-w-6xl bg-gray-800 rounded-2xl overflow-hidden shadow-xl border border-gray-700">
        {/* Header */}
        <div className="p-6 flex flex-col sm:flex-row items-center justify-between gap-6 border-b border-gray-700">
          <div className="flex items-center gap-4">
            <h2 className="text-2xl sm:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-yellow-500">
              {boxInfo.name}
            </h2>
            <div className="flex items-center gap-2">
              <div 
                className={`w-3 h-3 rounded-full ${
                  connected ? 'bg-green-500' : connecting ? 'bg-yellow-500' : 'bg-red-500'
                }`} 
                title={connected ? 'Connecté' : connecting ? 'Connexion...' : 'Déconnecté'} 
              />
              <span className="text-xs text-gray-400">
                {connected ? 'Connecté' : connecting ? 'Connexion...' : 'Déconnecté'}
              </span>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3">
            {!connected && !connecting && (
              <button
                onClick={handleReconnect}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors text-sm"
              >
                🔄 Reconnecter
              </button>
            )}
            
            {!syncStarted && (
              <button
                onClick={startSync}
                disabled={!connected || connecting}
                className="px-6 py-3 bg-gradient-to-r from-teal-500 to-blue-600 hover:from-teal-600 hover:to-blue-700 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white font-semibold rounded-xl shadow-lg transition-all duration-300 transform hover:scale-105 hover:shadow-xl disabled:hover:scale-100"
              >
                {connecting ? '🔄 Connexion...' : '▶️ Démarrer la synchronisation'}
              </button>
            )}
          </div>
        </div>

        {/* Video Player */}
        <div className="p-6 bg-black">
          <div className="bg-black rounded-xl overflow-hidden shadow-lg border border-gray-700">
            {boxInfo.movie?.videoUrl ? (
              <ReactPlayer
                ref={playerRef}
                url={boxInfo.movie.videoUrl}
                playing={playing}
                onPlay={() => {
                  console.log("🎬 Video played");
                  sendAction("play");
                }}
                onPause={() => {
                  console.log("⏸️ Video paused");
                  sendAction("pause");
                }}
                onSeek={() => {
                  console.log("⏩ Video seeked");
                  sendAction("seek");
                }}
                controls
                width="100%"
                height="400px"
                className="rounded-xl"
                config={{
                  file: {
                    attributes: {
                      crossOrigin: "anonymous",
                    },
                  },
                }}
              />
            ) : (
              <div className="w-full h-96 bg-gray-900 flex items-center justify-center text-gray-400 rounded-xl">
                <div className="text-center">
                  <p className="text-lg mb-2">Aucune vidéo disponible</p>
                  <p className="text-sm">Ajoutez une vidéo pour commencer</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Chat Section */}
        <div className="p-6 bg-gray-800 border-t border-gray-700">
          <div className="flex items-center gap-3 mb-4">
            <h3 className="text-lg font-semibold text-gray-200">💬 Chat</h3>
            <span className="text-sm text-gray-400">
              {messages.length} message{messages.length !== 1 ? 's' : ''}
            </span>
          </div>
          
          <div
            ref={chatContainerRef}
            className="w-full h-64 overflow-y-auto bg-gray-900 border border-gray-700 rounded-lg p-4 mb-4 space-y-3 scroll-smooth"
          >
            {messages.length === 0 ? (
              <div className="text-center text-gray-400 italic py-8">
                <p>Aucun message pour l'instant...</p>
                <p className="text-sm mt-2">Soyez le premier à envoyer un message !</p>
              </div>
            ) : (
              messages.map((msg, idx) => {
                const isMine = msg.sender === username;
                const timestamp = msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString() : '';
                
                return (
                  <div
                    key={idx}
                    className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-xs md:max-w-sm break-words px-4 py-3 rounded-lg shadow-md transition-all duration-200 ${
                        isMine
                          ? "bg-teal-500 text-white rounded-br-none"
                          : "bg-gray-300 text-black rounded-bl-none"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-xs font-semibold opacity-75">{msg.sender}</p>
                        {timestamp && (
                          <p className="text-xs opacity-50">{timestamp}</p>
                        )}
                      </div>
                      <p className="text-sm">{msg.content}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              className="flex-1 bg-gray-700 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all duration-200 placeholder-gray-400"
              placeholder={connected ? "Écris un message..." : "Connexion requise pour envoyer des messages"}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              disabled={!connected}
              maxLength={500}
            />
            <button
              onClick={sendMessage}
              disabled={!connected || !newMessage.trim()}
              className="px-6 py-3 bg-teal-600 hover:bg-teal-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-all duration-200 text-white rounded-lg shadow-lg hover:shadow-xl transform hover:scale-105 disabled:hover:scale-100"
            >
              💬 Envoyer
            </button>
          </div>
          
          <div className="mt-2 text-xs text-gray-400">
            Appuyez sur Entrée pour envoyer • {newMessage.length}/500 caractères
          </div>
        </div>
      </div>
    </div>
  );
}
