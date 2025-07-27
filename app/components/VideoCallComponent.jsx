import { useEffect, useRef, useState } from "react";

export default function VideoCallComponent({
  boxId,
  currentUser,
  stompClient: existingStompClient,
  isWebSocketConnected,
}) {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnection = useRef(null);
  const localStream = useRef(null);
  const isInitiator = useRef(false);

  const [isCallActive, setIsCallActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [remoteUserConnected, setRemoteUserConnected] = useState(false);
  const [error, setError] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [callParticipants, setCallParticipants] = useState(new Set());

  const ICE_SERVERS = {
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
    ],
  };

  // Utiliser le WebSocket existant au lieu d'en créer un nouveau
  useEffect(() => {
    // ⚠️ ATTENDRE que tout soit prêt
    if (
      !existingStompClient?.current?.connected ||
      !isWebSocketConnected ||
      !currentUser
    ) {
      console.log("⏳ En attente de la connexion WebSocket...", {
        client: !!existingStompClient?.current,
        connected: existingStompClient?.current?.connected,
        wsState: isWebSocketConnected,
        user: !!currentUser,
      });
      return;
    }

    console.log("✅ Configuration des abonnements appel vidéo");

    // S'abonner aux signaux WebRTC
    const videoCallSub = existingStompClient.current.subscribe(
      `/topic/box/${boxId}/video-call`,
      (message) => {
        const data = JSON.parse(message.body);
        handleSignal(data);
      }
    );

    // S'abonner aux événements d'utilisateurs en appel
    const callUsersSub = existingStompClient.current.subscribe(
      `/topic/box/${boxId}/call-users`,
      (message) => {
        const data = JSON.parse(message.body);
        handleCallUsersUpdate(data);
      }
    );

    return () => {
      videoCallSub.unsubscribe();
      callUsersSub.unsubscribe();
      endCall();
    };
  }, [
    boxId,
    existingStompClient?.current?.connected,
    isWebSocketConnected,
    currentUser,
  ]);

  const handleCallUsersUpdate = async (data) => {
    console.log("Mise à jour des utilisateurs en appel:", data);

    if (data.type === "user-joined" && data.userId !== currentUser?.id) {
      setCallParticipants((prev) => new Set([...prev, data.userId]));

      // 🔥 AUTO-START : Si on n'est pas encore en appel, démarrer automatiquement
      if (!isCallActive) {
        console.log(
          "🚀 Un utilisateur a rejoint, démarrage automatique de l'appel"
        );
        try {
          await startCall(false); // false = ne pas notifier car on répond à une notification
        } catch (err) {
          console.error("Erreur lors du démarrage automatique:", err);
        }
        return; // Sortir ici pour éviter de créer une offre tout de suite
      }

      // Si on est déjà en appel et qu'un nouvel utilisateur rejoint, devenir l'initiateur
      if (isCallActive && !isInitiator.current) {
        console.log("👑 Devenir l'initiateur car nouvel utilisateur rejoint");
        isInitiator.current = true;
        setTimeout(() => createOffer(), 1000);
      }
    } else if (data.type === "user-left") {
      setCallParticipants((prev) => {
        const newSet = new Set(prev);
        newSet.delete(data.userId);
        return newSet;
      });

      if (data.userId !== currentUser?.id) {
        handleRemoteUserLeft();
      }
    }
  };

  const sendSignal = (data) => {
    if (!existingStompClient?.current?.connected) {
      console.error("WebSocket non connecté");
      return;
    }

    const signalWithUser = {
      ...data,
      userId: currentUser?.id,
      username: currentUser?.username,
    };

    existingStompClient.current.publish({
      destination: `/app/box/${boxId}/video-call`,
      body: JSON.stringify(signalWithUser),
    });
  };

  const notifyUserJoined = () => {
    if (existingStompClient?.current?.connected) {
      existingStompClient.current.publish({
        destination: `/app/box/${boxId}/call-users`,
        body: JSON.stringify({
          type: "user-joined",
          userId: currentUser?.id,
          username: currentUser?.username,
        }),
      });
    }
  };

  const notifyUserLeft = () => {
    if (existingStompClient?.current?.connected) {
      existingStompClient.current.publish({
        destination: `/app/box/${boxId}/call-users`,
        body: JSON.stringify({
          type: "user-left",
          userId: currentUser?.id,
          username: currentUser?.username,
        }),
      });
    }
  };

  const startCall = async (shouldNotify = true) => {
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

      // Notifier qu'un utilisateur a rejoint (seulement si c'est un démarrage manuel)
      if (shouldNotify) {
        notifyUserJoined();
      }

      // Logique d'initiateur améliorée
      const currentParticipants = Array.from(callParticipants);

      if (shouldNotify) {
        // Si on démarre manuellement et qu'il y a déjà des participants, on devient l'initiateur
        if (currentParticipants.length > 0) {
          isInitiator.current = true;
          console.log(
            "👑 Je suis l'initiateur (démarrage manuel avec participants existants)"
          );
          setTimeout(() => createOffer(), 1500);
        }
      } else {
        // Si on démarre automatiquement, on n'est pas l'initiateur
        isInitiator.current = false;
        console.log("👤 Je suis le récepteur (démarrage automatique)");
      }

      console.log("✅ Appel démarré avec succès");
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
      console.log("📹 Piste distante reçue");
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
      console.log("🔄 État de connexion:", state);

      if (state === "connected") {
        setRemoteUserConnected(true);
      } else if (state === "disconnected" || state === "failed") {
        setRemoteUserConnected(false);
      }
    };
  };

  const createOffer = async () => {
    if (!peerConnection.current) return;

    try {
      console.log("📞 Création d'une offre...");
      const offer = await peerConnection.current.createOffer();
      await peerConnection.current.setLocalDescription(offer);
      sendSignal({ type: "offer", offer });
    } catch (err) {
      console.error("Erreur lors de la création de l'offre:", err);
    }
  };

  const handleSignal = async (data) => {
    // Ignorer ses propres signaux
    if (data.userId === currentUser?.id) return;

    console.log("📡 Signal reçu:", data.type, "de", data.username);

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
          console.log("✅ Réponse envoyée");
          break;

        case "answer":
          if (peerConnection.current) {
            await peerConnection.current.setRemoteDescription(
              new RTCSessionDescription(data.answer)
            );
            console.log("✅ Réponse reçue et appliquée");
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
              console.log("🧊 ICE candidate ajouté");
            } catch (err) {
              console.error("Erreur ICE candidate:", err);
            }
          }
          break;

        case "user-left":
          handleRemoteUserLeft();
          break;
      }
    } catch (err) {
      console.error("Erreur lors du traitement du signal:", err);
      setError("Erreur de connexion");
    }
  };

  const handleRemoteUserLeft = () => {
    setRemoteUserConnected(false);
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
    // Réinitialiser la connexion peer pour une nouvelle connexion
    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }
    isInitiator.current = false;
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
    notifyUserLeft();

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
    setCallParticipants(new Set());
    isInitiator.current = false;
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
              {remoteUserConnected
                ? "Connecté"
                : callParticipants.size > 0
                ? "Connexion en cours..."
                : "En attente..."}
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

      {/* Debug Info */}
      <div className="text-xs text-gray-500 bg-gray-800/50 p-2 rounded">
        Participants: {callParticipants.size} | Initiateur:{" "}
        {isInitiator.current ? "Oui" : "Non"} | WebSocket:{" "}
        {existingStompClient?.current?.connected && isWebSocketConnected
          ? "✅"
          : "❌"}{" "}
        | User: {currentUser ? "✅" : "❌"}
        {isCallActive && (
          <span className="ml-2 text-green-400">
            | 🚀 Auto-Start: {isInitiator.current ? "Initiateur" : "Récepteur"}
          </span>
        )}
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
                  {callParticipants.size > 0
                    ? "Connexion avec l'autre utilisateur..."
                    : isCallActive
                    ? "En attente d'un autre utilisateur..."
                    : "Cliquez pour démarrer l'appel"}
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
            onClick={() => startCall()} // Démarrage manuel avec notification
            disabled={
              isConnecting ||
              !currentUser ||
              !existingStompClient?.current?.connected
            }
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
              : `🟡 ${callParticipants.size} participant(s) détecté(s), connexion en cours...`}
          </p>
          {callParticipants.size > 0 && !remoteUserConnected && (
            <p className="text-blue-300 text-xs mt-1">
              ✨ Auto-start activé - L'autre utilisateur se connecte
              automatiquement
            </p>
          )}
        </div>
      )}
    </div>
  );
}
