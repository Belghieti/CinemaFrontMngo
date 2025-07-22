import { useEffect, useRef, useState } from "react";
import { Client } from "@stomp/stompjs";
import ReactPlayer from "react-player";

export default function VideoSyncComponent({ boxId, boxInfo }) {
  const playerRef = useRef(null);
  const stompClient = useRef(null);
  const chatContainerRef = useRef(null);
  const invitContainerRef = useRef(null);
  const suppressEvent = useRef(false); // Pour ignorer les événements causés par réception WS
  const seekTimeout = useRef(null); // Pour debounce du seek

  const [connected, setConnected] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [invitations, setInvitations] = useState([]);

  useEffect(() => {
    const client = new Client({
      brokerURL: `wss://cinemamongo-production.up.railway.app/ws`,
      reconnectDelay: 5000,
      onConnect: () => {
        console.log("✅ Connecté au serveur WebSocket");
        setConnected(true);

        client.subscribe(`/topic/box/${boxId}/video-sync`, (msg) => {
          const videoMessage = JSON.parse(msg.body);
          console.log("🎬 Action vidéo reçue :", videoMessage);

          suppressEvent.current = true; // Bloquer les événements locaux pendant la sync

          if (videoMessage.action === "play") {
            setPlaying(true);
          } else if (videoMessage.action === "pause") {
            setPlaying(false);
          } else if (videoMessage.action === "seek" && playerRef.current) {
            playerRef.current.seekTo(videoMessage.time || 0);
          }

          // Réactiver les événements locaux après un délai (500ms)
          setTimeout(() => {
            suppressEvent.current = false;
          }, 500);
        });

        client.subscribe(`/topic/box/${boxId}/chat`, (msg) => {
          const chatMsg = JSON.parse(msg.body);
          setMessages((prev) => [...prev, chatMsg]);
        });

        client.subscribe(`/topic/box/${boxId}/invitations`, (msg) => {
          const invMsg = JSON.parse(msg.body);
          setInvitations((prev) => [...prev, invMsg]);
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

  const sendVideoAction = (action, time = null) => {
    if (!stompClient.current || !stompClient.current.connected) return;

    const payload = { action };
    if (time !== null) payload.time = time;

    stompClient.current.publish({
      destination: `/app/box/${boxId}/video-sync`,
      body: JSON.stringify(payload),
    });

    if (action === "play") setPlaying(true);
    else if (action === "pause") setPlaying(false);
  };

  const handlePlay = () => {
    if (suppressEvent.current) return; // Ne rien faire si c'est une sync distante
    sendVideoAction("play");
  };

  const handlePause = () => {
    if (suppressEvent.current) return;
    sendVideoAction("pause");
  };

  // Debounce : envoie le seek seulement 300ms après le dernier mouvement utilisateur
  const handleSeek = (seconds) => {
    if (suppressEvent.current) return;

    if (seekTimeout.current) clearTimeout(seekTimeout.current);
    seekTimeout.current = setTimeout(() => {
      sendVideoAction("seek", seconds);
    }, 300);
  };

  // Envoi message chat
  const sendMessage = () => {
    if (!newMessage.trim()) return;
    if (!stompClient.current || !stompClient.current.connected) return;

    const msg = {
      sender: "Moi",
      content: newMessage.trim(),
    };

    stompClient.current.publish({
      destination: `/app/box/${boxId}/chat`,
      body: JSON.stringify(msg),
    });

    setNewMessage("");
  };

  return (
    <div>
      <h2>🎥 Composant Synchronisation Vidéo</h2>

      <ReactPlayer
        ref={playerRef}
        url={boxInfo?.movie?.videoUrl || ""}
        //url="https://varcdn02x16x1-13.bom1bom.online:82/d/nbrsdui5bgeyf3tkump5r2i3m4jxtdl5cyi3fyab46c37ha3ys4tivm7jm7d5tcgczaya7fi/Angel__x27_s.Last_Mission._Love.S01.E05.720p.WeCima.Show.mp4"
        playing={playing}
        controls={true}
        onPlay={handlePlay}
        onPause={handlePause}
        onSeek={handleSeek}
        width="100%"
      />

      {!connected && <p>🕐 Connexion au serveur en cours...</p>}

      <section style={{ marginTop: 20 }}>
        <h3>💬 Chat</h3>
        <div
          ref={chatContainerRef}
          style={{
            height: 200,
            overflowY: "auto",
            background: "#222",
            padding: 10,
            marginBottom: 10,
            color: "#eee",
          }}
        >
          {messages.length === 0 && <p>Aucun message</p>}
          {messages.map((msg, i) => (
            <div key={i}>
              <strong>{msg.sender}:</strong> {msg.content}
            </div>
          ))}
        </div>
        <input
          type="text"
          value={newMessage}
          placeholder="Écris un message..."
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          style={{ width: "80%", padding: 6, marginRight: 10 }}
        />
        <button onClick={sendMessage} style={{ padding: "6px 12px" }}>
          Envoyer
        </button>
      </section>

      <section style={{ marginTop: 20 }}>
        <h3>📨 Invitations</h3>
        <div
          ref={invitContainerRef}
          style={{
            maxHeight: 150,
            overflowY: "auto",
            background: "#222",
            padding: 10,
            color: "#eee",
          }}
        >
          {invitations.length === 0 && <p>Aucune invitation</p>}
          {invitations.map((inv, i) => (
            <div key={i}>
              <strong>{inv.invitedUsername}</strong> vous a invité
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
