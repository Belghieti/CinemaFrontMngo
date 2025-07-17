"use client";

import React, { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import SockJS from "sockjs-client";
import { Client } from "@stomp/stompjs";

const ReactPlayer = dynamic(() => import("react-player"), { ssr: false });

let stompClient = null;

const VideoSync = () => {
  const playerRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [url] = useState("https://www.youtube.com/watch?v=dQw4w9WgXcQ");

  useEffect(() => {
    const token = localStorage.getItem("authToken");

    const socket = new SockJS("http://localhost:8080/ws");
    stompClient = new Client({
      webSocketFactory: () => socket,
      reconnectDelay: 5000,
      connectHeaders: {
        Authorization: token,
      },
      onConnect: () => {
        console.log("✅ WebSocket connecté");
        stompClient.subscribe("/topic/video", (message) => {
          const data = JSON.parse(message.body);
          handleRemoteControl(data);
        });
      },
      onStompError: (frame) => {
        console.error("Erreur STOMP : ", frame.headers["message"]);
      },
      onDisconnect: () => {
        console.log("❌ Déconnecté");
      },
    });

    stompClient.activate();

    return () => {
      if (stompClient) stompClient.deactivate();
    };
  }, []);

  const sendControl = (type, currentTime) => {
    if (stompClient && stompClient.connected) {
      stompClient.publish({
        destination: "/app/video-control",
        body: JSON.stringify({ type, currentTime }),
      });
    }
  };

  const handleRemoteControl = (data) => {
    if (!playerRef.current) return;

    if (data.type === "play") {
      playerRef.current.seekTo(data.currentTime);
      setPlaying(true);
    } else if (data.type === "pause") {
      playerRef.current.seekTo(data.currentTime);
      setPlaying(false);
    } else if (data.type === "seek") {
      playerRef.current.seekTo(data.currentTime);
    }
  };

  const handlePlayClick = () => {
    const time = playerRef.current?.getCurrentTime() || 0;
    sendControl("play", time);
    setPlaying(true);
  };

  const handlePauseClick = () => {
    const time = playerRef.current?.getCurrentTime() || 0;
    sendControl("pause", time);
    setPlaying(false);
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">🎬 Vidéo synchronisée</h2>
      <ReactPlayer
        ref={playerRef}
        url={url}
        playing={playing}
        controls={true}
        width="100%"
        height="100%"
        onPlay={() => {
          const time = playerRef.current?.getCurrentTime() || 0;
          sendControl("play", time);
        }}
        onPause={() => {
          const time = playerRef.current?.getCurrentTime() || 0;
          sendControl("pause", time);
        }}
        onSeek={(e) => {
          sendControl("seek", e);
        }}
      />

      {/* Ajout des boutons */}
      <div className="mt-4">
        <button
          onClick={handlePlayClick}
          className="bg-blue-500 text-white p-2 rounded mr-2"
        >
          Lire
        </button>
        <button
          onClick={handlePauseClick}
          className="bg-red-500 text-white p-2 rounded"
        >
          Pause
        </button>
      </div>
    </div>
  );
};

export default VideoSync;
