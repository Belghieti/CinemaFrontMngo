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
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [invitedUser, setInvitedUser] = useState("");

  // === Connexion WebSocket ===
  useEffect(() => {
    const socket = new SockJS(
      "https://cinemamongo-production.up.railway.app/ws"
    );
    const client = new Client({
      webSocketFactory: () => socket,
      reconnectDelay: 5000,
      debug: (str) => console.log("[STOMP DEBUG]:", str),
    });

    client.onConnect = () => {
      console.log("✅ WebSocket connecté");
      setConnected(true);

      // Souscription aux messages vidéo
      client.subscribe(`/topic/box/${boxId}/video-sync`, (message) => {
        const msg = JSON.parse(message.body);
        console.log("🎬 Message vidéo reçu :", msg);

        if (msg.action === "play") {
          setPlaying(true);
        } else if (msg.action === "pause") {
          setPlaying(false);
        }
      });

      // Souscription aux messages de chat
      client.subscribe(`/topic/box/${boxId}/chat`, (message) => {
        const msg = JSON.parse(message.body);
        setMessages((prev) => [...prev, msg]);
      });

      // Souscription aux invitations
      client.subscribe(`/topic/box/${boxId}/invitations`, (message) => {
        const invite = JSON.parse(message.body);
        alert(`📨 Invitation reçue pour: ${invite.invitedUsername}`);
      });
    };

    client.activate();
    stompClient.current = client;

    return () => {
      if (stompClient.current) stompClient.current.deactivate();
    };
  }, [boxId]);

  // === Contrôle de lecture vidéo ===
  const handlePlay = () => {
    stompClient.current.publish({
      destination: `/app/box/${boxId}/video-sync`,
      body: JSON.stringify({ action: "play" }),
    });
    setPlaying(true);
  };

  const handlePause = () => {
    stompClient.current.publish({
      destination: `/app/box/${boxId}/video-sync`,
      body: JSON.stringify({ action: "pause" }),
    });
    setPlaying(false);
  };

  // === Envoi d'un message chat ===
  const sendMessage = () => {
    if (!newMessage.trim()) return;

    stompClient.current.publish({
      destination: `/app/box/${boxId}/chat`,
      body: JSON.stringify({ sender: "Moi", content: newMessage }),
    });
    setNewMessage("");
  };

  // === Envoi d'une invitation ===
  const sendInvite = () => {
    if (!invitedUser.trim()) return;

    stompClient.current.publish({
      destination: `/app/box/${boxId}/invite`,
      body: JSON.stringify({ invitedUsername: invitedUser }),
    });
    setInvitedUser("");
  };

  return (
    <div className="p-4 space-y-6">
      <h1 className="text-2xl font-bold text-white">🎥 Lecture synchronisée</h1>

      <ReactPlayer
        ref={playerRef}
        url="https://www.learningcontainer.com/wp-content/uploads/2020/05/sample-mp4-file.mp4"
        controls
        playing={playing}
        onPlay={handlePlay}
        onPause={handlePause}
        width="100%"
        height="auto"
      />

      {/* === Chat === */}
      <div className="mt-6 p-4 bg-gray-900 rounded-xl text-white">
        <h2 className="text-xl font-semibold">💬 Chat</h2>
        <div className="h-40 overflow-y-auto border border-gray-600 p-2 mb-2 rounded">
          {messages.map((msg, index) => (
            <div key={index}>
              <strong>{msg.sender}:</strong> {msg.content}
            </div>
          ))}
        </div>
        <div className="flex space-x-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            className="flex-1 p-2 rounded bg-gray-800 text-white"
            placeholder="Écris un message..."
          />
          <button
            onClick={sendMessage}
            className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-700"
          >
            Envoyer
          </button>
        </div>
      </div>

      {/* === Invitation === */}
      <div className="mt-6 p-4 bg-gray-900 rounded-xl text-white">
        <h2 className="text-xl font-semibold">📨 Invitation</h2>
        <div className="flex space-x-2">
          <input
            type="text"
            value={invitedUser}
            onChange={(e) => setInvitedUser(e.target.value)}
            className="flex-1 p-2 rounded bg-gray-800 text-white"
            placeholder="Nom d'utilisateur à inviter"
          />
          <button
            onClick={sendInvite}
            className="px-4 py-2 bg-green-600 rounded hover:bg-green-700"
          >
            Inviter
          </button>
        </div>
      </div>
    </div>
  );
}
