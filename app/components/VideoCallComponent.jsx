import { useEffect, useRef, useState } from "react";
import { Client } from "@stomp/stompjs";

export default function VideoCallComponent({ boxId, currentUser }) {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnection = useRef(null);
  const stompClient = useRef(null);
  const localStream = useRef(null);

  const [isCallActive, setIsCallActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [remoteUserConnected, setRemoteUserConnected] = useState(false);
  const [error, setError] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [connectedUsers, setConnectedUsers] = useState([]);

  const ICE_SERVERS = {
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
    ],
  };

  // Initialisation WebSocket STOMP
  useEffect(() => {
    const client = new Client({
      brokerURL: "wss://cinemamongo-production.up.railway.app/ws",
      reconnectDelay: 5000,
      onConnect: () => {
        console.log("WebSocket connecté pour l'appel vidéo");

        // S'abonner aux signaux WebRTC
        client.subscribe(`/topic/box/${boxId}/video-call`, (message) => {
          const data = JSON.parse(message.body);
          handleSignal(data);
        });

        // S'abonner aux événements d'utilisateurs
        client.subscribe(`/topic/box/${boxId}/call-users`, (message) => {
          const users = JSON.parse(message.body);
          setConnectedUsers(users);
          setRemoteUserConnected(users.length > 1);
        });
      },
      onDisconnect: () => {
        console.log("WebSocket déconnecté");
        setRemoteUserConnected(false);
      },
    });

    client.activate();
    stompClient.current = client;

    return () => {
      client.deactivate();
      endCall();
    };
  }, [boxId]);

  const sendSignal = (data) => {
    if (!stompClient.current?.connected) {
      console.error("WebSocket non connecté");
      return;
    }

    const signalWithUser = {
      ...data,
      userId: currentUser?.id,
      username: currentUser?.username,
    };

    stompClient.current.publish({
      destination: `/app/box/${boxId}/video-call`,
      body: JSON.stringify(signalWithUser),
    });
  };

  const notifyUserJoined = () => {
    if (stompClient.current?.connected) {
      stompClient.current.publish({
        destination: `/app/box/${boxId}/call-users`,
        body: JSON.stringify({
          type: "user-joined",
          userId: currentUser?.id,
          username: currentUser?.username,
        }),
      });
    }
  };

  const startCall = async () => {
    try {
      setIsConnecting(true);
      setError(null);

      // Obtenir le flux média local
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 },
        audio: true,
      });

      localStream.current = mediaStream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = mediaStream;
      }

      setIsCallActive(true);
      setIsConnecting(false);

      // Créer la connexion peer
      await createPeerConnection();

      // Notifier qu'un utilisateur a rejoint
      notifyUserJoined();

      console.log("Appel démarré avec succès");
    } catch (err) {
      console.error("Erreur lors du démarrage de l'appel:", err);
      setError("Impossible d'accéder à la caméra/microphone");
      setIsConnecting(false);
    }
  };

  const createPeerConnection = async () => {
    peerConnection.current = new RTCPeerConnection(ICE_SERVERS);

    // Ajouter les pistes locales
    if (localStream.current) {
      localStream.current.getTracks().forEach((track) => {
        peerConnection.current.addTrack(track, localStream.current);
      });
    }

    // Gérer les pistes distantes
    peerConnection.current.ontrack = (event) => {
      console.log("Piste distante reçue");
      if (remoteVideoRef.current && event.streams[0]) {
        remoteVideoRef.current.srcObject = event.streams[0];
        setRemoteUserConnected(true);
      }
    };

    // Gérer les ICE candidates
    peerConnection.current.onicecandidate = (event) => {
      if (event.candidate) {
        sendSignal({
          type: "ice-candidate",
          candidate: event.candidate,
        });
      }
    };

    // Gérer l'état de connexion
    peerConnection.current.onconnectionstatechange = () => {
      const state = peerConnection.current.connectionState;
      console.log("État de connexion:", state);

      if (state === "connected") {
        setRemoteUserConnected(true);
      } else if (state === "disconnected" || state === "failed") {
        setRemoteUserConnected(false);
      }
    };

    // Créer une offre si c'est le premier utilisateur
    if (connectedUsers.length === 0) {
      const offer = await peerConnection.current.createOffer();
      await peerConnection.current.setLocalDescription(offer);
      sendSignal({ type: "offer", offer });
    }
  };

  const handleSignal = async (data) => {
    // Ignorer ses propres signaux
    if (data.userId === currentUser?.id) return;

    try {
      switch (data.type) {
        case "offer":
          if (!peerConnection.current) {
            await createPeerConnection();
          }

          await peerConnection.current.setRemoteDescription(
            new RTCSessionDescription(data.offer)
          );

          const answer = await peerConnection.current.createAnswer();
          await peerConnection.current.setLocalDescription(answer);

          sendSignal({ type: "answer", answer });
          break;

        case "answer":
          if (peerConnection.current) {
            await peerConnection.current.setRemoteDescription(
              new RTCSessionDescription(data.answer)
            );
          }
          break;

        case "ice-candidate":
          if (
            peerConnection.current &&
            peerConnection.current.remoteDescription
          ) {
            try {
              await peerConnection.current.addIceCandidate(
                new RTCIceCandidate(data.candidate)
              );
            } catch (err) {
              console.error("Erreur ICE candidate:", err);
            }
          }
          break;

        case "user-left":
          setRemoteUserConnected(false);
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = null;
          }
          break;
      }
    } catch (err) {
      console.error("Erreur lors du traitement du signal:", err);
      setError("Erreur de connexion");
    }
  };

  const toggleMute = () => {
    if (localStream.current) {
      const audioTrack = localStream.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleVideo = () => {
    if (localStream.current) {
      const videoTrack = localStream.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
      }
    }
  };

  const endCall = () => {
    // Notifier la déconnexion
    if (stompClient.current?.connected) {
      sendSignal({ type: "user-left" });
    }

    // Fermer la connexion peer
    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }

    // Arrêter le flux local
    if (localStream.current) {
      localStream.current.getTracks().forEach((track) => track.stop());
      localStream.current = null;
    }

    // Reset des refs vidéo
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }

    setIsCallActive(false);
    setRemoteUserConnected(false);
    setIsMuted(false);
    setIsVideoOff(false);
    setError(null);
  };

  return (
    <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-xl p-6 rounded-2xl border border-white/10 shadow-xl space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-pink-500 rounded-xl flex items-center justify-center text-xl shadow-lg">
            📹
          </div>
          <div>
            <h3 className="text-xl font-bold text-red-400">Appel Vidéo</h3>
            <p className="text-sm text-gray-400">
              {remoteUserConnected ? "Connecté" : "En attente..."}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <div
            className={`w-3 h-3 rounded-full ${
              isCallActive ? "bg-green-500" : "bg-gray-500"
            } animate-pulse`}
          ></div>
          <span className="text-sm text-gray-400">
            {isCallActive ? "Actif" : "Inactif"}
          </span>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-500/20 border border-red-500/30 rounded-xl p-4">
          <p className="text-red-300 text-sm">{error}</p>
        </div>
      )}

      {/* Video Containers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Local Video */}
        <div className="relative">
          <video
            ref={localVideoRef}
            autoPlay
            muted
            playsInline
            className="w-full h-48 object-cover bg-gray-900 rounded-xl border border-white/10"
          />
          <div className="absolute bottom-2 left-2 bg-black/70 rounded-lg px-2 py-1">
            <span className="text-white text-xs font-medium">
              {currentUser?.username || "Vous"}
            </span>
          </div>
          {isVideoOff && (
            <div className="absolute inset-0 bg-gray-900 rounded-xl flex items-center justify-center">
              <div className="text-center">
                <div className="w-12 h-12 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-2">
                  <svg
                    className="w-6 h-6 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                </div>
                <p className="text-gray-400 text-sm">Caméra désactivée</p>
              </div>
            </div>
          )}
        </div>

        {/* Remote Video */}
        <div className="relative">
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-48 object-cover bg-gray-900 rounded-xl border border-white/10"
          />
          {!remoteUserConnected && (
            <div className="absolute inset-0 bg-gray-900/90 rounded-xl flex items-center justify-center">
              <div className="text-center">
                <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-300 text-sm">
                  En attente d'un autre utilisateur...
                </p>
              </div>
            </div>
          )}
          {remoteUserConnected && (
            <div className="absolute bottom-2 left-2 bg-black/70 rounded-lg px-2 py-1">
              <span className="text-white text-xs font-medium">
                Participant
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="flex justify-center space-x-3">
        {!isCallActive ? (
          <button
            onClick={startCall}
            disabled={isConnecting || !currentUser}
            className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed px-6 py-3 rounded-xl font-medium transition-all duration-300 shadow-lg hover:shadow-green-500/25 hover:scale-105 active:scale-95 flex items-center space-x-2"
          >
            {isConnecting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Connexion...</span>
              </>
            ) : (
              <>
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
                    d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
                <span>Démarrer l'appel</span>
              </>
            )}
          </button>
        ) : (
          <div className="flex space-x-3">
            {/* Mute Button */}
            <button
              onClick={toggleMute}
              className={`p-3 rounded-xl font-medium transition-all duration-300 shadow-lg hover:scale-105 active:scale-95 ${
                isMuted
                  ? "bg-red-500 hover:bg-red-600 text-white"
                  : "bg-gray-600 hover:bg-gray-700 text-white"
              }`}
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                {isMuted ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
                  />
                )}
              </svg>
            </button>

            {/* Video Toggle Button */}
            <button
              onClick={toggleVideo}
              className={`p-3 rounded-xl font-medium transition-all duration-300 shadow-lg hover:scale-105 active:scale-95 ${
                isVideoOff
                  ? "bg-red-500 hover:bg-red-600 text-white"
                  : "bg-gray-600 hover:bg-gray-700 text-white"
              }`}
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                {isVideoOff ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                )}
              </svg>
            </button>

            {/* End Call Button */}
            <button
              onClick={endCall}
              className="bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 px-6 py-3 rounded-xl font-medium transition-all duration-300 shadow-lg hover:shadow-red-500/25 hover:scale-105 active:scale-95 flex items-center space-x-2"
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
                  d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a2 2 0 00-2 2v1c0 8.284 6.716 15 15 15h1a2 2 0 002-2v-3.28a1 1 0 00-.684-.948l-4.493-1.498a1 1 0 00-1.21.502l-1.13 2.257a11.042 11.042 0 01-5.516-5.517l2.257-1.128a1 1 0 00.502-1.21L9.228 3.683A1 1 0 008.279 3H5z"
                />
              </svg>
              <span>Terminer</span>
            </button>
          </div>
        )}
      </div>

      {/* Connected Users Info */}
      {isCallActive && (
        <div className="text-center">
          <p className="text-gray-400 text-sm">
            {remoteUserConnected
              ? "🟢 Appel en cours avec un autre participant"
              : "🟡 En attente d'autres participants..."}
          </p>
        </div>
      )}
    </div>
  );
}
