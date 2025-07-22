"use client";

import { useEffect, useRef, useState } from "react";
import { Client } from "@stomp/stompjs";
import ReactPlayer from "react-player";

export default function VideoSyncComponent({ boxId }) {
  const playerRef = useRef(null);
  const stompClient = useRef(null);
  const [connected, setConnected] = useState(false);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const client = new Client({
      brokerURL: `wss://cinemamongo-production.up.railway.app/ws`,
      reconnectDelay: 5000,
      onConnect: () => {
        console.log("✅ Connecté au serveur WebSocket (vidéo)");
        setConnected(true);

        client.subscribe(`/topic/box/${boxId}/video-sync`, (message) => {
          const videoMessage = JSON.parse(message.body);
          console.log("🎬 Action vidéo reçue :", videoMessage);

          if (videoMessage.action === "play") {
            setPlaying(true);
          } else if (videoMessage.action === "pause") {
            setPlaying(false);
          }
        });
      },
      onStompError: (frame) => {
        console.error("❌ Erreur STOMP :", frame.headers["message"]);
      },
    });

    client.activate();
    stompClient.current = client;

    return () => {
      client.deactivate();
    };
  }, [boxId]);

  const handlePlay = () => {
    if (stompClient.current && stompClient.current.connected) {
      stompClient.current.publish({
        destination: `/app/box/${boxId}/video-sync`,
        body: JSON.stringify({ action: "play" }),
      });
    }
    setPlaying(true);
  };

  const handlePause = () => {
    if (stompClient.current && stompClient.current.connected) {
      stompClient.current.publish({
        destination: `/app/box/${boxId}/video-sync`,
        body: JSON.stringify({ action: "pause" }),
      });
    }
    setPlaying(false);
  };

  return (
    <div>
      <h2>🎥 Composant Synchronisation Vidéo</h2>
      <ReactPlayer
        ref={playerRef}
        url="https://varcdn02x16x1-13.bom1bom.online:82/d/nbrsdui5bgeyf3tkump5r2i3m4jxtdl5cyi3fyab46c37ha3ys4tivm7jm7d5tcgczaya7fi/Angel__x27_s.Last_Mission._Love.S01.E05.720p.WeCima.Show.mp4"
        playing={playing}
        controls={true}
        onPlay={handlePlay}
        onPause={handlePause}
        width="100%"
      />
      {!connected && <p>🕐 Connexion au serveur en cours...</p>}
    </div>
  );
}
