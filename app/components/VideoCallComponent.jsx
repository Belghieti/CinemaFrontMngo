import { useEffect, useRef, useState } from "react";
import { Client } from "@stomp/stompjs";
import ReactPlayer from "react-player";

// Composant VideoCall flottant amélioré
function VideoCallComponent({
  boxId,
  currentUser,
  stompClient: existingStompClient,
  isMinimized,
  onToggleMinimize,
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

  const ICE_SERVERS = {
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
    ],
  };

  // Configuration des abonnements WebSocket
  useEffect(() => {
    if (!existingStompClient?.current?.connected) return;

    const videoCallSub = existingStompClient.current.subscribe(
      `/topic/box/${boxId}/video-call`,
      (message) => {
        const data = JSON.parse(message.body);
        handleSignal(data);
      }
    );

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
    if (!existingStompClient?.current?.connected) return;

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
          await createPeerConnection();
          isInitiator.current = true;
          setTimeout(() => createOffer(), 2000);
        }
      }, 1000);
    } catch (err) {
      setError("Impossible d'accéder à la caméra/microphone: " + err.message);
      setIsConnecting(false);
    }
  };

  const createPeerConnection = async () => {
    if (peerConnection.current) {
      peerConnection.current.close();
    }

    peerConnection.current = new RTCPeerConnection(ICE_SERVERS);

    if (localStream.current) {
      localStream.current.getTracks().forEach((track) => {
        peerConnection.current.addTrack(track, localStream.current);
      });
    }

    peerConnection.current.ontrack = (event) => {
      console.log("🎥 Piste vidéo reçue:", event.track.kind, event.streams);
      if (remoteVideoRef.current && event.streams[0]) {
        console.log(
          "📺 Configuration du stream distant:",
          event.streams[0].getTracks().map((t) => `${t.kind}: ${t.enabled}`)
        );
        remoteVideoRef.current.srcObject = event.streams[0];
        setRemoteUserConnected(true);

        // Forcer la lecture avec gestion d'erreurs améliorée
        const playPromise = remoteVideoRef.current.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              console.log("✅ Lecture vidéo distante démarrée");
            })
            .catch((error) => {
              console.error("❌ Erreur lecture vidéo distante:", error);
              // Réessayer après un court délai
              setTimeout(() => {
                if (remoteVideoRef.current) {
                  remoteVideoRef.current.play().catch(console.error);
                }
              }, 500);
            });
        }
      }
    };

    peerConnection.current.onicecandidate = (event) => {
      if (event.candidate) {
        sendSignal({
          type: "ice-candidate",
          candidate: event.candidate,
        });
      }
    };

    peerConnection.current.onconnectionstatechange = () => {
      const state = peerConnection.current.connectionState;
      if (state === "connected") {
        setRemoteUserConnected(true);
        setError(null);
      } else if (state === "disconnected") {
        setRemoteUserConnected(false);
      } else if (state === "failed") {
        setRemoteUserConnected(false);
        setError("Connexion échouée");
      }
    };
  };

  const createOffer = async () => {
    if (!peerConnection.current) {
      console.error("❌ Pas de connexion peer pour créer l'offre");
      return;
    }

    try {
      console.log("🚀 Création d'une offre...");

      // Vérifier que les tracks locaux sont bien ajoutés
      const senders = peerConnection.current.getSenders();
      console.log(
        "📤 Tracks envoyés:",
        senders.map((s) => s.track?.kind).filter(Boolean)
      );

      const offer = await peerConnection.current.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
      });

      await peerConnection.current.setLocalDescription(offer);
      console.log("📨 Offre créée:", offer.type);

      sendSignal({ type: "offer", offer });
      console.log("✅ Offre envoyée avec succès");
    } catch (err) {
      console.error("❌ Erreur lors de la création de l'offre:", err);
      setError("Erreur lors de la création de l'offre: " + err.message);
    }
  };

  const handleSignal = async (data) => {
    if (data.userId === currentUser?.id) return;

    setRemoteUserName(data.username || "Participant");

    if (
      !peerConnection.current &&
      (data.type === "answer" || data.type === "ice-candidate")
    ) {
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

          await peerConnection.current.setRemoteDescription(
            new RTCSessionDescription(data.offer)
          );

          const answer = await peerConnection.current.createAnswer({
            offerToReceiveAudio: true,
            offerToReceiveVideo: true,
          });
          await peerConnection.current.setLocalDescription(answer);

          sendSignal({ type: "answer", answer });
          break;

        case "answer":
          console.log("📥 Réponse reçue de:", data.username);
          if (
            peerConnection.current &&
            peerConnection.current.signalingState === "have-local-offer"
          ) {
            await peerConnection.current.setRemoteDescription(
              new RTCSessionDescription(data.answer)
            );
            console.log("✅ Réponse acceptée, connexion établie");
          } else {
            console.warn(
              "⚠️ Réponse reçue dans un état incorrect:",
              peerConnection.current?.signalingState
            );
          }
          break;

        case "ice-candidate":
          console.log("🧊 ICE candidate reçu:", data.candidate?.type);
          if (
            peerConnection.current &&
            peerConnection.current.remoteDescription
          ) {
            try {
              await peerConnection.current.addIceCandidate(
                new RTCIceCandidate(data.candidate)
              );
              console.log("✅ ICE candidate ajouté:", data.candidate.type);
            } catch (err) {
              console.error("❌ Erreur ICE candidate:", err);
            }
          } else {
            console.warn(
              "⚠️ ICE candidate reçu mais pas de description distante"
            );
            // Stocker les candidates pour les traiter plus tard
            if (!window.pendingIceCandidates) {
              window.pendingIceCandidates = [];
            }
            window.pendingIceCandidates.push(data.candidate);
            console.log("📦 ICE candidate mis en attente");
          }
          break;

        case "user-left":
          handleRemoteUserLeft();
          break;
      }
    } catch (err) {
      setError("Erreur de connexion: " + err.message);
    }
  };

  const handleRemoteUserLeft = () => {
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
  };

  // Interface minimisée
  if (isMinimized) {
    return (
      <div className="flex items-center space-x-2">
        {/* Mini vidéos côte à côte */}
        <div className="flex space-x-1">
          {/* Vidéo locale mini */}
          <div className="relative w-16 h-12 rounded-lg overflow-hidden border border-white/20">
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-cover"
            />
            {isVideoOff && (
              <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
                <div className="w-6 h-6 bg-gray-600 rounded-full flex items-center justify-center">
                  <span className="text-xs">👤</span>
                </div>
              </div>
            )}
          </div>

          {/* Vidéo distante mini */}
          <div className="relative w-16 h-12 rounded-lg overflow-hidden border border-white/20">
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
              muted={false}
            />
            {!remoteUserConnected && (
              <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
                <div className="w-3 h-3 bg-yellow-500 rounded-full animate-pulse"></div>
              </div>
            )}
            {remoteUserConnected && (
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent">
                <div className="text-xs text-white text-center truncate px-1">
                  {remoteUserName || "Remote"}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Contrôles mini */}
        <div className="flex space-x-1">
          <button
            onClick={toggleMute}
            className={`p-1.5 rounded-lg transition-all ${
              isMuted
                ? "bg-red-500 hover:bg-red-600"
                : "bg-gray-600 hover:bg-gray-700"
            }`}
          >
            <svg
              className="w-3 h-3 text-white"
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
            className={`p-1.5 rounded-lg transition-all ${
              isVideoOff
                ? "bg-red-500 hover:bg-red-600"
                : "bg-gray-600 hover:bg-gray-700"
            }`}
          >
            <svg
              className="w-3 h-3 text-white"
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
          </button>

          <button
            onClick={endCall}
            className="p-1.5 rounded-lg bg-red-500 hover:bg-red-600 transition-all"
          >
            <svg
              className="w-3 h-3 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"
              />
            </svg>
          </button>
        </div>

        {/* Bouton d'agrandissement */}
        <button
          onClick={onToggleMinimize}
          className="p-1.5 rounded-lg bg-purple-500 hover:bg-purple-600 transition-all"
        >
          <svg
            className="w-3 h-3 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
            />
          </svg>
        </button>
      </div>
    );
  }

  // Interface complète
  return (
    <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-xl p-6 rounded-2xl border border-white/10 shadow-xl space-y-4">
      {/* Header avec bouton de minimisation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-pink-500 rounded-xl flex items-center justify-center text-xl shadow-lg">
            📹
          </div>
          <div>
            <h3 className="text-xl font-bold text-red-400">Appel Vidéo</h3>
            <p className="text-sm text-gray-400">
              {remoteUserConnected
                ? `Connecté avec ${remoteUserName}`
                : callParticipants.size > 0
                ? "Connexion en cours..."
                : "En attente..."}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <div
            className={`w-3 h-3 rounded-full ${
              remoteUserConnected
                ? "bg-green-500"
                : isCallActive
                ? "bg-yellow-500"
                : "bg-gray-500"
            } animate-pulse`}
          ></div>

          {isCallActive && (
            <button
              onClick={onToggleMinimize}
              className="p-2 rounded-lg bg-purple-500 hover:bg-purple-600 transition-all"
              title="Minimiser l'appel vidéo"
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
          )}
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
                {callParticipants.size > 0 ? (
                  <>
                    <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-300 text-sm">
                      Connexion avec l'autre utilisateur...
                    </p>
                  </>
                ) : (
                  <>
                    <div className="w-12 h-12 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
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
                    <p className="text-gray-300 text-sm">
                      En attente d'un autre utilisateur...
                    </p>
                  </>
                )}
              </div>
            </div>
          )}
          {remoteUserConnected && (
            <div className="absolute bottom-2 left-2 bg-black/70 rounded-lg px-2 py-1">
              <span className="text-white text-xs font-medium">
                {remoteUserName || "Participant"}
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
                  d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"
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
              ? `🟢 Appel en cours avec ${remoteUserName}`
              : callParticipants.size > 0
              ? `🟡 ${callParticipants.size} participant(s) détecté(s), connexion en cours...`
              : "🔵 En attente d'autres participants..."}
          </p>
        </div>
      )}
    </div>
  );
}

export default function VideoSyncComponent({ boxId }) {
  const playerRef = useRef(null);
  const stompClient = useRef(null);
  const chatContainerRef = useRef(null);
  const invitContainerRef = useRef(null);
  const suppressEvent = useRef(false);
  const seekTimeout = useRef(null);

  const [connected, setConnected] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [invitations, setInvitations] = useState([]);
  const [boxInfo, setBoxInfo] = useState(null);
  const [error, setError] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [isVideoCallMinimized, setIsVideoCallMinimized] = useState(false);
  const [showFloatingCall, setShowFloatingCall] = useState(false);

  // Auto-scroll pour le chat
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop =
        chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  // Auto-scroll pour les invitations
  useEffect(() => {
    if (invitContainerRef.current) {
      invitContainerRef.current.scrollTop =
        invitContainerRef.current.scrollHeight;
    }
  }, [invitations]);

  // Gestion du scroll pour l'appel vidéo flottant
  useEffect(() => {
    const handleScroll = () => {
      const videoPlayerElement = document.getElementById(
        "video-player-section"
      );
      if (videoPlayerElement && isVideoCallMinimized) {
        const rect = videoPlayerElement.getBoundingClientRect();
        const isVideoVisible = rect.bottom > 0 && rect.top < window.innerHeight;

        // Afficher l'appel flottant seulement si la vidéo n'est pas visible
        setShowFloatingCall(!isVideoVisible);
      }
    };

    if (isVideoCallMinimized) {
      window.addEventListener("scroll", handleScroll);
      handleScroll(); // Vérifier immédiatement
    } else {
      setShowFloatingCall(false);
    }

    return () => window.removeEventListener("scroll", handleScroll);
  }, [isVideoCallMinimized]);

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
          .then(setBoxInfo)
          .catch(() => setError("Erreur chargement de la box"));
      })
      .catch(() => setError("Erreur utilisateur"));
  }, [boxId]);

  // Connexion WebSocket
  useEffect(() => {
    if (!boxInfo) return;

    const client = new Client({
      brokerURL: `wss://cinemamongo-production.up.railway.app/ws`,
      reconnectDelay: 5000,
      onConnect: () => {
        console.log("✅ WebSocket connecté dans VideoSyncComponent");
        setConnected(true);

        // Abonnements existants
        client.subscribe(`/topic/box/${boxId}/video-sync`, (msg) => {
          const videoMessage = JSON.parse(msg.body);
          suppressEvent.current = true;

          if (videoMessage.action === "play") setPlaying(true);
          else if (videoMessage.action === "pause") setPlaying(false);
          else if (videoMessage.action === "seek" && playerRef.current) {
            playerRef.current.seekTo(videoMessage.time || 0);
          }

          setTimeout(() => {
            suppressEvent.current = false;
          }, 500);
        });

        client.subscribe(`/topic/box/${boxId}/chat`, (msg) => {
          setMessages((prev) => [...prev, JSON.parse(msg.body)]);
        });

        client.subscribe(`/topic/box/${boxId}/invitations`, (msg) => {
          setInvitations((prev) => [...prev, JSON.parse(msg.body)]);
        });
      },
      onDisconnect: () => {
        console.log("❌ WebSocket déconnecté");
        setConnected(false);
      },
    });

    client.activate();
    stompClient.current = client;
    return () => client.deactivate();
  }, [boxInfo]);

  const sendVideoAction = (action, time = null) => {
    if (!stompClient.current?.connected) return;
    const body = { action };
    if (time !== null) body.time = time;

    stompClient.current.publish({
      destination: `/app/box/${boxId}/video-sync`,
      body: JSON.stringify(body),
    });

    if (action === "play") setPlaying(true);
    if (action === "pause") setPlaying(false);
  };

  const handlePlay = () => {
    if (!suppressEvent.current) sendVideoAction("play");
  };
  const handlePause = () => {
    if (!suppressEvent.current) sendVideoAction("pause");
  };
  const handleSeek = (seconds) => {
    if (!suppressEvent.current) {
      clearTimeout(seekTimeout.current);
      seekTimeout.current = setTimeout(() => {
        sendVideoAction("seek", seconds);
      }, 300);
    }
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

  const toggleVideoCallMinimize = () => {
    setIsVideoCallMinimized(!isVideoCallMinimized);
  };

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900">
        <div className="p-8 text-center max-w-md mx-auto">
          <div className="w-20 h-20 bg-red-500/20 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <svg
              className="w-10 h-10 text-red-400"
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
          <h2 className="text-2xl font-bold text-red-400 mb-2">
            Erreur de chargement
          </h2>
          <p className="text-red-300 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 px-6 py-3 rounded-xl font-medium transition-all duration-300 shadow-lg hover:scale-105"
          >
            Actualiser la page
          </button>
        </div>
      </div>
    );
  }

  if (!boxInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900">
        <div className="p-8 text-center max-w-md mx-auto">
          <div className="relative">
            <div className="w-20 h-20 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
            <div
              className="absolute inset-0 w-20 h-20 border-4 border-pink-500 border-b-transparent rounded-full animate-spin mx-auto opacity-30"
              style={{ animationDirection: "reverse", animationDuration: "3s" }}
            ></div>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">
            Chargement de votre cinéma...
          </h2>
          <p className="text-gray-300 mb-4">
            Préparation de l'expérience parfaite
          </p>
          <div className="flex justify-center space-x-2">
            <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
            <div
              className="w-2 h-2 bg-pink-500 rounded-full animate-pulse"
              style={{ animationDelay: "0.2s" }}
            ></div>
            <div
              className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"
              style={{ animationDelay: "0.4s" }}
            ></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900 relative">
      {/* Appel vidéo flottant */}
      {showFloatingCall && connected && currentUser && (
        <div className="fixed top-4 right-4 z-50 bg-black/80 backdrop-blur-xl p-3 rounded-2xl border border-white/20 shadow-2xl animate-in slide-in-from-top-2 duration-300">
          <VideoCallComponent
            boxId={boxId}
            currentUser={currentUser}
            stompClient={stompClient}
            isMinimized={true}
            onToggleMinimize={toggleVideoCallMinimize}
          />
        </div>
      )}

      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* En-tête du film */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-800/50 via-purple-800/30 to-pink-800/50 backdrop-blur-xl border border-white/10 shadow-2xl">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-600/20 to-pink-600/20 opacity-50"></div>
          <div className="relative p-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-6">
                <div className="relative">
                  <div className="w-16 h-16 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-3xl flex items-center justify-center text-3xl shadow-2xl">
                    🎬
                  </div>
                  <div className="absolute -top-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                    <div
                      className={`w-3 h-3 rounded-full ${
                        connected ? "bg-white animate-pulse" : "bg-gray-300"
                      }`}
                    ></div>
                  </div>
                </div>
                <div>
                  <h1 className="text-4xl font-bold text-white mb-2 bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent">
                    {boxInfo.name}
                  </h1>
                  <div className="flex items-center space-x-6 text-sm">
                    <div className="flex items-center space-x-2 text-gray-300">
                      <div
                        className={`w-3 h-3 rounded-full ${
                          connected
                            ? "bg-green-500 animate-pulse"
                            : "bg-red-500"
                        }`}
                      ></div>
                      <span className="font-medium">
                        {connected ? "Connecté" : "Déconnecté"}
                      </span>
                    </div>
                    {boxInfo.movie && (
                      <div className="flex items-center space-x-2 text-gray-300">
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
                        <span className="font-medium">Film disponible</span>
                      </div>
                    )}
                    <div className="flex items-center space-x-2 text-gray-300">
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
                          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                        />
                      </svg>
                      <span className="font-medium">Séance partagée</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Lecteur vidéo */}
        <div id="video-player-section" className="relative group">
          <div className="relative overflow-hidden rounded-3xl shadow-2xl border-2 border-white/10 bg-black">
            {boxInfo.movie?.videoUrl ? (
              <div className="relative aspect-video">
                <ReactPlayer
                  ref={playerRef}
                  url={boxInfo.movie.videoUrl}
                  playing={playing}
                  controls
                  onPlay={handlePlay}
                  onPause={handlePause}
                  onSeek={handleSeek}
                  width="100%"
                  height="100%"
                  config={{
                    file: {
                      forceHLS: boxInfo.movie?.videoUrl?.includes(".m3u8"),
                    },
                  }}
                />
                {!connected && (
                  <div className="absolute inset-0 bg-black/90 flex items-center justify-center backdrop-blur-sm">
                    <div className="text-center">
                      <div className="relative mb-6">
                        <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                        <div
                          className="absolute inset-0 w-16 h-16 border-4 border-pink-500 border-b-transparent rounded-full animate-spin mx-auto opacity-50"
                          style={{ animationDirection: "reverse" }}
                        ></div>
                      </div>
                      <h3 className="text-2xl font-bold text-white mb-2">
                        Synchronisation en cours...
                      </h3>
                      <p className="text-gray-300">
                        Connexion avec les autres spectateurs
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="aspect-video flex items-center justify-center bg-gradient-to-br from-gray-800 via-purple-900 to-gray-900">
                <div className="text-center max-w-md">
                  <div className="w-32 h-32 bg-gradient-to-br from-gray-700 to-gray-800 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-2xl">
                    <svg
                      className="w-16 h-16 text-gray-400"
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
                  <h3 className="text-3xl font-bold text-white mb-4">
                    Prêt pour le cinéma
                  </h3>
                  <p className="text-gray-300 text-lg">
                    Ajoutez un film pour commencer la séance magique
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Appel vidéo (version complète quand pas minimisé) */}
        {connected && currentUser && !isVideoCallMinimized && (
          <VideoCallComponent
            boxId={boxId}
            currentUser={currentUser}
            stompClient={stompClient}
            isMinimized={false}
            onToggleMinimize={toggleVideoCallMinimize}
          />
        )}

        {/* Chat et Invitations */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          {/* Section Chat */}
          <div className="group">
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-800/50 via-blue-900/30 to-cyan-900/50 backdrop-blur-xl border border-white/10 shadow-2xl transition-all duration-500 group-hover:shadow-blue-500/25">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-cyan-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="relative p-8">
                <div className="flex items-center space-x-4 mb-8">
                  <div className="relative">
                    <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center text-2xl shadow-2xl">
                      💬
                    </div>
                    <div className="absolute -top-1 -right-1 w-6 h-6 bg-cyan-400 rounded-full flex items-center justify-center">
                      <span className="text-xs font-bold text-blue-900">
                        {messages.length}
                      </span>
                    </div>
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-blue-400 mb-1">
                      Chat en direct
                    </h2>
                    <p className="text-gray-400">Discutez pendant le film</p>
                  </div>
                </div>

                {/* Messages Container */}
                <div
                  ref={chatContainerRef}
                  className="h-80 overflow-y-auto mb-6 space-y-4 custom-scrollbar"
                >
                  {messages.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="w-20 h-20 bg-gray-700/30 rounded-2xl flex items-center justify-center mx-auto mb-6">
                        <svg
                          className="w-10 h-10 text-gray-400"
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
                      <p className="text-gray-400 text-lg">
                        La conversation va commencer...
                      </p>
                      <p className="text-gray-500 text-sm mt-2">
                        Soyez le premier à écrire !
                      </p>
                    </div>
                  ) : (
                    messages.map((msg, i) => {
                      const isCurrentUser =
                        currentUser && msg.senderId === currentUser.id;
                      return (
                        <div
                          key={i}
                          className={`group flex ${
                            isCurrentUser ? "justify-end" : "justify-start"
                          } animate-in slide-in-from-bottom-2 duration-300`}
                          style={{ animationDelay: `${i * 50}ms` }}
                        >
                          <div
                            className={`max-w-xs lg:max-w-md p-4 rounded-2xl shadow-lg transition-all duration-300 group-hover:scale-105 ${
                              isCurrentUser
                                ? "bg-gradient-to-br from-blue-500 to-cyan-500 text-white"
                                : "bg-white/10 text-gray-100 border border-white/20"
                            }`}
                          >
                            <div className="flex items-center space-x-2 mb-2">
                              <div
                                className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold text-white shadow-lg ${
                                  isCurrentUser
                                    ? "bg-white/20"
                                    : "bg-gradient-to-br from-purple-500 to-pink-500"
                                }`}
                              >
                                {msg.sender?.charAt(0)?.toUpperCase() || "?"}
                              </div>
                              <span
                                className={`font-semibold text-sm ${
                                  isCurrentUser
                                    ? "text-white/90"
                                    : "text-purple-300"
                                }`}
                              >
                                {isCurrentUser ? "Vous" : msg.sender}
                              </span>
                              <span className="text-xs text-gray-400">•</span>
                              <span className="text-xs text-gray-400">
                                maintenant
                              </span>
                            </div>
                            <p className="text-sm leading-relaxed">
                              {msg.content}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Input de message */}
                <div className="flex space-x-4">
                  <input
                    type="text"
                    value={newMessage}
                    placeholder="Écrivez votre message..."
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                    className="flex-1 px-6 py-4 rounded-2xl bg-white/10 border border-white/20 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent placeholder-gray-400 text-white transition-all duration-300 backdrop-blur-sm"
                  />
                  <button
                    onClick={sendMessage}
                    disabled={!newMessage.trim() || !connected || !currentUser}
                    className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed px-8 py-4 rounded-2xl font-medium transition-all duration-300 shadow-lg hover:shadow-blue-500/25 hover:scale-105 active:scale-95"
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
            </div>
          </div>

          {/* Section Invitations */}
          <div className="group">
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-800/50 via-green-900/30 to-emerald-900/50 backdrop-blur-xl border border-white/10 shadow-2xl transition-all duration-500 group-hover:shadow-green-500/25">
              <div className="absolute inset-0 bg-gradient-to-r from-green-600/10 to-emerald-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="relative p-8">
                <div className="flex items-center space-x-4 mb-8">
                  <div className="relative">
                    <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl flex items-center justify-center text-2xl shadow-2xl">
                      📨
                    </div>
                    <div className="absolute -top-1 -right-1 w-6 h-6 bg-emerald-400 rounded-full flex items-center justify-center">
                      <span className="text-xs font-bold text-green-900">
                        {invitations.length}
                      </span>
                    </div>
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-green-400 mb-1">
                      Invitations
                    </h2>
                    <p className="text-gray-400">Nouveaux spectateurs</p>
                  </div>
                </div>

                <div
                  ref={invitContainerRef}
                  className="h-80 overflow-y-auto space-y-4 custom-scrollbar"
                >
                  {invitations.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="w-20 h-20 bg-gray-700/30 rounded-2xl flex items-center justify-center mx-auto mb-6">
                        <svg
                          className="w-10 h-10 text-gray-400"
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
                      <p className="text-gray-400 text-lg">
                        Aucune invitation pour le moment
                      </p>
                      <p className="text-gray-500 text-sm mt-2">
                        Les nouveaux spectateurs apparaîtront ici
                      </p>
                    </div>
                  ) : (
                    invitations.map((inv, i) => (
                      <div
                        key={i}
                        className="group/item animate-in slide-in-from-right-2 duration-300"
                        style={{ animationDelay: `${i * 100}ms` }}
                      >
                        <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 p-6 rounded-2xl border border-green-500/20 transition-all duration-300 group-hover/item:border-green-400/40 group-hover/item:shadow-lg group-hover/item:shadow-green-500/20">
                          <div className="flex items-center space-x-4">
                            <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl flex items-center justify-center text-lg font-bold text-white shadow-lg">
                              {inv.invitedUsername?.charAt(0)?.toUpperCase() ||
                                "?"}
                            </div>
                            <div className="flex-1">
                              <p className="font-semibold text-green-300 text-lg">
                                {inv.invitedUsername}
                              </p>
                              <p className="text-sm text-gray-400">
                                a rejoint la séance
                              </p>
                            </div>
                            <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Styles pour la scrollbar personnalisée */}
      <style jsx>{`
        .custom-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: rgba(147, 51, 234, 0.5) rgba(255, 255, 255, 0.1);
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: linear-gradient(
            45deg,
            rgba(147, 51, 234, 0.5),
            rgba(236, 72, 153, 0.5)
          );
          border-radius: 10px;
          transition: all 0.3s ease;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(
            45deg,
            rgba(147, 51, 234, 0.8),
            rgba(236, 72, 153, 0.8)
          );
        }

        @keyframes animate-in {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-in {
          animation: animate-in 0.3s ease-out forwards;
        }

        .slide-in-from-bottom-2 {
          animation: slide-in-from-bottom 0.3s ease-out forwards;
        }

        .slide-in-from-right-2 {
          animation: slide-in-from-right 0.3s ease-out forwards;
        }

        .slide-in-from-top-2 {
          animation: slide-in-from-top 0.3s ease-out forwards;
        }

        @keyframes slide-in-from-bottom {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes slide-in-from-right {
          from {
            opacity: 0;
            transform: translateX(20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes slide-in-from-top {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* Effet de glassmorphism amélioré */
        .backdrop-blur-xl {
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
        }

        /* Animation fluide pour les hovers */
        .group:hover .group-hover\\:opacity-100 {
          transition: opacity 0.5s cubic-bezier(0.4, 0, 0.2, 1);
        }

        /* Effet de pulsation pour les indicateurs de connexion */
        @keyframes pulse-glow {
          0%,
          100% {
            opacity: 1;
            box-shadow: 0 0 0 0 currentColor;
          }
          50% {
            opacity: 0.8;
            box-shadow: 0 0 0 4px transparent;
          }
        }

        .animate-pulse {
          animation: pulse-glow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }

        /* Responsive design amélioré */
        @media (max-width: 768px) {
          .container {
            padding-left: 1rem;
            padding-right: 1rem;
          }

          .grid-cols-1.xl\\:grid-cols-2 {
            grid-template-columns: 1fr;
            gap: 1.5rem;
          }

          .text-4xl {
            font-size: 2rem;
          }

          .text-3xl {
            font-size: 1.75rem;
          }

          .h-80 {
            height: 16rem;
          }
        }

        /* Animation pour l'appel vidéo flottant */
        .fixed.top-4.right-4 {
          animation: float-in 0.3s ease-out forwards;
        }

        @keyframes float-in {
          from {
            opacity: 0;
            transform: translateY(-10px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        /* Effet de survol pour les cartes */
        .group:hover {
          transform: translateY(-2px);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        /* Amélioration des transitions pour les boutons */
        button {
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }

        button:active {
          transform: scale(0.98);
        }

        /* Style pour les messages du chat */
        .max-w-xs,
        .max-w-md {
          word-wrap: break-word;
          overflow-wrap: break-word;
        }

        /* Effet de typing pour les messages */
        @keyframes typing-dots {
          0%,
          60%,
          100% {
            transform: translateY(0);
          }
          30% {
            transform: translateY(-10px);
          }
        }

        .typing-indicator {
          animation: typing-dots 1.4s infinite;
        }
      `}</style>
    </div>
  );
}
