import { useEffect, useRef, useState } from "react";

export default function VideoCallComponent({
  boxId,
  currentUser,
  stompClient: existingStompClient,
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
  const [remoteUserName, setRemoteUserName] = useState("");
  const [isMinimized, setIsMinimized] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const ICE_SERVERS = {
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
    ],
  };

  // Utiliser le WebSocket existant au lieu d'en créer un nouveau
  useEffect(() => {
    if (!existingStompClient?.current?.connected) return;

    console.log("Configuration des abonnements appel vidéo");

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
  }, [boxId, existingStompClient?.current?.connected]);

  const handleCallUsersUpdate = (data) => {
    console.log("Mise à jour des utilisateurs en appel:", data);

    if (data.type === "user-joined" && data.userId !== currentUser?.id) {
      setCallParticipants((prev) => new Set([...prev, data.userId]));

      if (isCallActive) {
        if (
          !peerConnection.current ||
          peerConnection.current.connectionState === "closed"
        ) {
          createPeerConnection().then(() => {
            isInitiator.current = true;
            setTimeout(() => createOffer(), 1500);
          });
        } else if (
          peerConnection.current.connectionState === "new" ||
          peerConnection.current.connectionState === "connecting"
        ) {
          isInitiator.current = true;
          setTimeout(() => createOffer(), 1500);
        }
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

    console.log("Envoi du signal:", data.type, signalWithUser);

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

  const startCall = async () => {
    try {
      setIsConnecting(true);
      setError(null);

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: "user",
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      localStream.current = mediaStream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = mediaStream;
      }

      setIsCallActive(true);
      setIsConnecting(false);
      notifyUserJoined();

      setTimeout(async () => {
        if (callParticipants.size > 0) {
          console.log("Participants détectés, création de la connexion peer");
          await createPeerConnection();
          isInitiator.current = true;
          setTimeout(() => createOffer(), 2000);
        } else {
          console.log("En attente d'autres participants...");
        }
      }, 1000);

      console.log("Appel démarré avec succès");
    } catch (err) {
      console.error("Erreur lors du démarrage de l'appel:", err);
      setError("Impossible d'accéder à la caméra/microphone: " + err.message);
      setIsConnecting(false);
    }
  };

  const createPeerConnection = async () => {
    if (peerConnection.current) {
      peerConnection.current.close();
    }

    peerConnection.current = new RTCPeerConnection(ICE_SERVERS);
    console.log("Nouvelle connexion peer créée");

    if (localStream.current) {
      localStream.current.getTracks().forEach((track) => {
        console.log("Ajout de la piste:", track.kind);
        peerConnection.current.addTrack(track, localStream.current);
      });
    }

    peerConnection.current.ontrack = (event) => {
      console.log("Piste distante reçue:", event.track.kind, event.streams);
      if (remoteVideoRef.current && event.streams[0]) {
        console.log(
          "Configuration du stream distant:",
          event.streams[0].getTracks()
        );
        remoteVideoRef.current.srcObject = event.streams[0];
        setRemoteUserConnected(true);

        remoteVideoRef.current.play().catch((err) => {
          console.error("Erreur de lecture vidéo distante:", err);
        });

        console.log("Vidéo distante configurée");
      }
    };

    peerConnection.current.onicecandidate = (event) => {
      if (event.candidate) {
        console.log("ICE candidate généré:", event.candidate.type);
        sendSignal({
          type: "ice-candidate",
          candidate: event.candidate,
        });
      } else {
        console.log("Fin de la génération des ICE candidates");
      }
    };

    peerConnection.current.onconnectionstatechange = () => {
      const state = peerConnection.current.connectionState;
      console.log("État de connexion changé:", state);

      if (state === "connected") {
        setRemoteUserConnected(true);
        setError(null);
      } else if (state === "disconnected") {
        setRemoteUserConnected(false);
        console.log("Connexion interrompue, tentative de reconnexion...");
      } else if (state === "failed") {
        setRemoteUserConnected(false);
        setError("Connexion échouée");
        console.error("Connexion peer échouée");
      }
    };

    peerConnection.current.oniceconnectionstatechange = () => {
      const iceState = peerConnection.current.iceConnectionState;
      console.log("État ICE:", iceState);

      if (iceState === "connected" || iceState === "completed") {
        setRemoteUserConnected(true);
      } else if (iceState === "disconnected" || iceState === "failed") {
        setRemoteUserConnected(false);
      }
    };
  };

  const createOffer = async () => {
    if (!peerConnection.current) {
      console.error("Pas de connexion peer pour créer l'offre");
      return;
    }

    try {
      console.log("Création d'une offre...");
      const offer = await peerConnection.current.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
      });
      await peerConnection.current.setLocalDescription(offer);
      sendSignal({ type: "offer", offer });
      console.log("Offre créée et envoyée");
    } catch (err) {
      console.error("Erreur lors de la création de l'offre:", err);
      setError("Erreur lors de la création de l'offre");
    }
  };

  const handleSignal = async (data) => {
    if (data.userId === currentUser?.id) return;

    console.log("Signal reçu:", data.type, "de", data.username);
    setRemoteUserName(data.username || "Participant");

    if (
      !peerConnection.current &&
      (data.type === "answer" || data.type === "ice-candidate")
    ) {
      console.log("Création de la connexion peer pour traiter:", data.type);
      await createPeerConnection();
    }

    try {
      switch (data.type) {
        case "offer":
          if (
            !peerConnection.current ||
            peerConnection.current.signalingState === "closed"
          ) {
            await createPeerConnection();
          }

          console.log("Traitement de l'offre reçue");
          await peerConnection.current.setRemoteDescription(
            new RTCSessionDescription(data.offer)
          );

          const answer = await peerConnection.current.createAnswer({
            offerToReceiveAudio: true,
            offerToReceiveVideo: true,
          });
          await peerConnection.current.setLocalDescription(answer);

          sendSignal({ type: "answer", answer });
          console.log("Réponse créée et envoyée");
          break;

        case "answer":
          if (
            peerConnection.current &&
            peerConnection.current.signalingState === "have-local-offer"
          ) {
            await peerConnection.current.setRemoteDescription(
              new RTCSessionDescription(data.answer)
            );
            console.log("Réponse reçue et appliquée");
          } else {
            console.warn(
              "Réponse reçue dans un état incorrect:",
              peerConnection.current?.signalingState
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
              console.log("ICE candidate ajouté:", data.candidate.type);
            } catch (err) {
              console.error("Erreur ICE candidate:", err);
            }
          } else {
            console.warn("ICE candidate reçu mais pas de description distante");
          }
          break;

        case "user-left":
          handleRemoteUserLeft();
          break;
      }
    } catch (err) {
      console.error("Erreur lors du traitement du signal:", err);
      setError("Erreur de connexion: " + err.message);
    }
  };

  const handleRemoteUserLeft = () => {
    console.log("Utilisateur distant parti");
    setRemoteUserConnected(false);
    setRemoteUserName("");
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
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
    console.log("Fin de l'appel");

    notifyUserLeft();

    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }

    if (localStream.current) {
      localStream.current.getTracks().forEach((track) => track.stop());
      localStream.current = null;
    }

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
    setRemoteUserName("");
    isInitiator.current = false;
    setIsMinimized(false);
    setIsExpanded(false);
  };

  // Si pas d'appel actif, afficher le bouton de démarrage flottant
  if (!isCallActive) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <button
          onClick={startCall}
          disabled={
            isConnecting ||
            !currentUser ||
            !existingStompClient?.current?.connected
          }
          className="group bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed p-4 rounded-full shadow-2xl hover:shadow-green-500/50 hover:scale-110 active:scale-95 transition-all duration-300"
        >
          {isConnecting ? (
            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <svg
              className="w-6 h-6 text-white"
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
          )}
          {/* Tooltip */}
          <div className="absolute bottom-full right-0 mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/90 text-white text-sm px-3 py-2 rounded-lg whitespace-nowrap">
            Démarrer l'appel vidéo
            <div className="absolute top-full right-3 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-black/90"></div>
          </div>
        </button>
      </div>
    );
  }

  // Appel actif - Mode Picture-in-Picture
  return (
    <div
      className={`fixed z-50 transition-all duration-500 ease-in-out ${
        isExpanded
          ? "inset-4 md:inset-8"
          : isMinimized
          ? "bottom-6 right-6 w-16 h-16"
          : "bottom-6 right-6 w-80 h-auto"
      }`}
    >
      <div
        className={`bg-black/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 overflow-hidden ${
          isExpanded ? "h-full" : "h-auto"
        }`}
      >
        {/* Header - toujours visible */}
        <div
          className={`flex items-center justify-between p-3 bg-gradient-to-r from-purple-600/20 to-pink-600/20 ${
            isMinimized ? "hidden" : "block"
          }`}
        >
          <div className="flex items-center space-x-2">
            <div
              className={`w-2 h-2 rounded-full animate-pulse ${
                remoteUserConnected ? "bg-green-400" : "bg-yellow-400"
              }`}
            ></div>
            <span className="text-white text-sm font-medium">
              {remoteUserConnected
                ? `📹 ${remoteUserName}`
                : "⏳ En attente..."}
            </span>
          </div>

          <div className="flex items-center space-x-1">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1.5 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
            >
              <svg
                className="w-4 h-4 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                {isExpanded ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
                  />
                )}
              </svg>
            </button>
            <button
              onClick={() => setIsMinimized(!isMinimized)}
              className="p-1.5 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
            >
              <svg
                className="w-4 h-4 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M20 12H4"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Version minimisée */}
        {isMinimized && (
          <div
            onClick={() => setIsMinimized(false)}
            className="w-full h-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center cursor-pointer hover:scale-110 transition-transform"
          >
            <svg
              className="w-8 h-8 text-white"
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
        )}

        {/* Contenu principal - caché si minimisé */}
        {!isMinimized && (
          <>
            {/* Zone vidéo */}
            <div className={`relative ${isExpanded ? "h-full p-4" : "p-3"}`}>
              <div
                className={`grid gap-2 ${
                  isExpanded
                    ? "grid-cols-2 h-full"
                    : remoteUserConnected
                    ? "grid-cols-2"
                    : "grid-cols-1"
                }`}
              >
                {/* Vidéo principale (remote si connecté, sinon local) */}
                <div
                  className={`relative ${isExpanded ? "h-full" : "h-32"} ${
                    !remoteUserConnected && !isExpanded ? "col-span-2" : ""
                  }`}
                >
                  {remoteUserConnected ? (
                    <>
                      <video
                        ref={remoteVideoRef}
                        autoPlay
                        playsInline
                        className="w-full h-full object-cover bg-gray-900 rounded-xl"
                      />
                      <div className="absolute bottom-2 left-2 bg-black/70 rounded-lg px-2 py-1">
                        <span className="text-white text-xs font-medium">
                          {remoteUserName}
                        </span>
                      </div>
                    </>
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl flex items-center justify-center">
                      <div className="text-center text-white">
                        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                        <p className="text-xs opacity-75">Connexion...</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Vidéo locale (picture-in-picture) */}
                {(remoteUserConnected || isExpanded) && (
                  <div className={`relative ${isExpanded ? "h-full" : "h-32"}`}>
                    <video
                      ref={localVideoRef}
                      autoPlay
                      muted
                      playsInline
                      className="w-full h-full object-cover bg-gray-900 rounded-xl"
                    />
                    <div className="absolute bottom-2 left-2 bg-black/70 rounded-lg px-2 py-1">
                      <span className="text-white text-xs font-medium">
                        Vous
                      </span>
                    </div>
                    {isVideoOff && (
                      <div className="absolute inset-0 bg-gray-900 rounded-xl flex items-center justify-center">
                        <div className="w-6 h-6 bg-gray-700 rounded-full flex items-center justify-center">
                          <svg
                            className="w-3 h-3 text-gray-400"
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
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Contrôles */}
            <div className="flex items-center justify-center space-x-2 p-3 bg-black/30">
              <button
                onClick={toggleMute}
                className={`p-2 rounded-full transition-all ${
                  isMuted
                    ? "bg-red-500 hover:bg-red-600"
                    : "bg-white/20 hover:bg-white/30"
                }`}
              >
                <svg
                  className="w-4 h-4 text-white"
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

              <button
                onClick={toggleVideo}
                className={`p-2 rounded-full transition-all ${
                  isVideoOff
                    ? "bg-red-500 hover:bg-red-600"
                    : "bg-white/20 hover:bg-white/30"
                }`}
              >
                <svg
                  className="w-4 h-4 text-white"
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

              <button
                onClick={endCall}
                className="p-2 bg-red-500 hover:bg-red-600 rounded-full transition-colors"
              >
                <svg
                  className="w-4 h-4 text-white"
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
              </button>
            </div>

            {/* Message d'erreur */}
            {error && (
              <div className="mx-3 mb-3 bg-red-500/20 border border-red-500/30 rounded-lg p-2">
                <p className="text-red-300 text-xs">{error}</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
