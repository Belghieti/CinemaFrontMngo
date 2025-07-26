import { useEffect, useRef, useState } from "react";
import { Client } from "@stomp/stompjs";
import ReactPlayer from "react-player";

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

  // Récupération de la box + film
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return setError("Token manquant");

    fetch("https://cinemamongo-production.up.railway.app/auth/getUserInfo", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((user) => {
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
        setConnected(true);

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
    if (!newMessage.trim() || !stompClient.current?.connected) return;

    stompClient.current.publish({
      destination: `/app/box/${boxId}/chat`,
      body: JSON.stringify({ sender: "Moi", content: newMessage }),
    });

    setNewMessage("");
  };

  if (error) return <p style={{ color: "red" }}>{error}</p>;
  if (!boxInfo) return <p>Chargement...</p>;

  return (
    <div style={{ padding: 20 }}>
      <h2>🎥 {boxInfo.name}</h2>

      {boxInfo.movie?.videoUrl ? (
        <ReactPlayer
          ref={playerRef}
          // url="https://1bnpkpnpqghq0.acek-cdn.com/hls2/01/03502/nvhrxg58s34o_n/index-v1-a1.m3u8?t=JNgnoL_8zLvnY-qjsfIFIU2gkOvKUhU5qRA6WgW9XME&s=1753461100&e=129600&f=17512328&srv=LFDu7HStkKAt&i=0.4&sphttps://1bnpkpnpqghq0.acek-cdn.com/hls2/01/03502/nvhrxg58s34o_n/index-v1-a1.m3u8?t=JNgnoL_8zLvnY-qjsfIFIU2gkOvKUhU5qRA6WgW9XME&s=1753461100&e=129600&f=17512328&srv=LFDu7HStkKAt&i=0.4&sp=500&p1=LFDu7HStkKAt&p2=LFDu7HStkKAt&asn=36903=500&p1=LFDu7HStkKAt&p2=LFDu7HStkKAt&asn=36903"
          //url={boxInfo.movie.videoUrl} // ✅ Lien vidéo dynamique ici !
          // url="https://varcdn02x16x1-13.bom1bom.online:82/d/nbrvzui5bgeyf3tkumpyb6awnva3dsynqgsg5ht2dqoxltkboulpsmxmmm4wintkjh2b5vfj/Angel__x27_s.Last_Mission._Love.S01.E06.720p.WeCima.Show.mp4"
          // url="https://varcdn02x16x1-13.bom1bom.online:82/d/nbrvzui5bgeyf3tkumpyb6awnva3dsynqgsg5ht2dqoxltkbovtrvsdlu7twccqcyln2ooie/Angel__x27_s.Last_Mission._Love.S01.E06.720p.WeCima.Show.mp4"
          url="https://s.drslayer.com/Angels_Last_Mission_Love/1_v2/m.mp4?token=DrEcTtPhtEFn1chUx4IzPA&expires=1753503778"
          playing={playing}
          controls
          onPlay={handlePlay}
          onPause={handlePause}
          onSeek={handleSeek}
          width="100%"
          config={{
            file: {
              forceHLS: true,
              hlsOptions: {
                liveSyncDurationCount: 3,
                maxBufferLength: 30,
                maxMaxBufferLength: 60,
              },
              attributes: {
                crossOrigin: "anonymous",
              },

            },
          }}
        />
      ) : (
        <p>Pas de film disponible dans cette box.</p>
      )}

      {!connected && <p>Connexion en cours...</p>}

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
