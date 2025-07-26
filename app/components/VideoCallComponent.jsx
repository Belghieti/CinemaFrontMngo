"use client";

import { useEffect, useRef, useState } from "react";
import { Client } from "@stomp/stompjs";

export default function VideoCallComponent({ boxId }) {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnection = useRef(null);
  const stompClient = useRef(null);

  const [isCallStarted, setIsCallStarted] = useState(false);
  const [stream, setStream] = useState(null);

  const ICE_SERVERS = {
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" }, // Serveur STUN public
    ],
  };

  // Initialisation WebSocket STOMP
  useEffect(() => {
    const client = new Client({
      brokerURL: "wss://cinemamongo-production.up.railway.app/ws",
      reconnectDelay: 5000,
      onConnect: () => {
        client.subscribe(`/topic/box/${boxId}/video-call`, (message) => {
          const data = JSON.parse(message.body);
          handleSignal(data);
        });
      },
    });

    client.activate();
    stompClient.current = client;

    return () => {
      client.deactivate();
      stopCall();
    };
  }, [boxId]);

  const sendSignal = (data) => {
    if (!stompClient.current?.connected) return;
    stompClient.current.publish({
      destination: `/app/box/${boxId}/video-call`,
      body: JSON.stringify(data),
    });
  };

  const startCall = async () => {
    const mediaStream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });

    localVideoRef.current.srcObject = mediaStream;
    setStream(mediaStream);
    setIsCallStarted(true);

    peerConnection.current = new RTCPeerConnection(ICE_SERVERS);

    // Ajouter les pistes locales à la connexion
    mediaStream.getTracks().forEach((track) => {
      peerConnection.current.addTrack(track, mediaStream);
    });

    // Réception des pistes distantes
    peerConnection.current.ontrack = (event) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    // ICE candidates
    peerConnection.current.onicecandidate = (event) => {
      if (event.candidate) {
        sendSignal({ type: "ice-candidate", candidate: event.candidate });
      }
    };

    // Créer une offre
    const offer = await peerConnection.current.createOffer();
    await peerConnection.current.setLocalDescription(offer);

    sendSignal({ type: "offer", offer });
  };

  const handleSignal = async (data) => {
    switch (data.type) {
      case "offer":
        if (!peerConnection.current) {
          await preparePeerConnection();
        }

        await peerConnection.current.setRemoteDescription(
          new RTCSessionDescription(data.offer)
        );
        const answer = await peerConnection.current.createAnswer();
        await peerConnection.current.setLocalDescription(answer);
        sendSignal({ type: "answer", answer });
        break;

      case "answer":
        await peerConnection.current.setRemoteDescription(
          new RTCSessionDescription(data.answer)
        );
        break;

      case "ice-candidate":
        if (peerConnection.current) {
          try {
            await peerConnection.current.addIceCandidate(data.candidate);
          } catch (err) {
            console.error("Erreur ICE", err);
          }
        }
        break;
    }
  };

  const preparePeerConnection = async () => {
    peerConnection.current = new RTCPeerConnection(ICE_SERVERS);

    if (stream) {
      stream.getTracks().forEach((track) => {
        peerConnection.current.addTrack(track, stream);
      });
    }

    peerConnection.current.ontrack = (event) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    peerConnection.current.onicecandidate = (event) => {
      if (event.candidate) {
        sendSignal({ type: "ice-candidate", candidate: event.candidate });
      }
    };
  };

  const stopCall = () => {
    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }

    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }

    setIsCallStarted(false);
  };

  return (
    <div className="space-y-4 bg-slate-800 p-6 rounded-2xl border border-white/10 shadow-lg">
      <h3 className="text-white text-xl font-bold mb-4">📞 Appel vidéo</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <video
          ref={localVideoRef}
          autoPlay
          muted
          className="w-full rounded-xl border border-white/10"
        ></video>
        <video
          ref={remoteVideoRef}
          autoPlay
          className="w-full rounded-xl border border-white/10"
        ></video>
      </div>

      <div className="flex space-x-4">
        {!isCallStarted ? (
          <button
            onClick={startCall}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl transition-all"
          >
            🎬 Démarrer l’appel
          </button>
        ) : (
          <button
            onClick={stopCall}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl transition-all"
          >
            ❌ Terminer l’appel
          </button>
        )}
      </div>
    </div>
  );
}
