import React, { useState, useEffect } from "react";
import {
  Heart,
  Users,
  Zap,
  Globe,
  MessageCircle,
  Video,
  Share2,
  Star,
  Coffee,
  Code,
  Linkedin,
  Mail,
  Github,
  ExternalLink,
  Play,
  Sparkles,
  X,
  Info,
} from "lucide-react";

const AproposComponent = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeFeature, setActiveFeature] = useState(0);
  const [isVisible, setIsVisible] = useState({});

  const features = [
    {
      icon: <Video className="w-8 h-8" />,
      title: "Ajouter un film depuis Youtube ou autre source...",
      description: "Collez simplement le lien de votre film préféré",
      color: "from-red-500 to-pink-500",
      delay: "0s",
    },
    {
      icon: <Users className="w-8 h-8" />,
      title: "Créer une salle privée",
      description: "Lancez votre propre session de visionnage",
      color: "from-emerald-500 to-teal-500",
      delay: "0.2s",
    },
    {
      icon: <Share2 className="w-8 h-8" />,
      title: "Partager avec vos amis",
      description: "Un simple lien ou code pour inviter qui vous voulez",
      color: "from-blue-500 to-cyan-500",
      delay: "0.4s",
    },
    {
      icon: <Zap className="w-8 h-8" />,
      title: "Synchronisation parfaite",
      description: 'Plus jamais de "Tu appuies sur lecture maintenant ?"',
      color: "from-amber-500 to-orange-500",
      delay: "0.6s",
    },
    {
      icon: <MessageCircle className="w-8 h-8" />,
      title: "Chat & Appel vidéo intégré",
      description: "Discutez et riez ensemble pendant le film",
      color: "from-purple-500 to-pink-500",
      delay: "0.8s",
    },
  ];

  const advantages = [
    {
      icon: "🤲🏻",
      title: "Aucune installation requise",
      desc: "Accessible directement depuis votre navigateur",
    },
    {
      icon: "🤲🏻",
      title: "Interface intuitive",
      desc: "Design pensé pour une utilisation simple et agréable",
    },
    {
      icon: "🤲🏻",
      title: "Entièrement gratuit",
      desc: "Profitez de toutes les fonctionnalités sans débourser un centime",
    },
    {
      icon: "🤲🏻",
      title: "Accessible partout",
      desc: "Regardez depuis n'importe où dans le monde",
    },
    {
      icon: "🤲🏻",
      title: "Ultra rapide",
      desc: "Synchronisation en temps réel sans latence",
    },
    {
      icon: "🤲🏻",
      title: "Salles privées",
      desc: "Contrôlez qui peut rejoindre vos sessions",
    },
  ];

  useEffect(() => {
    if (isOpen) {
      const interval = setInterval(() => {
        setActiveFeature((prev) => (prev + 1) % features.length);
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      // Activer les animations après l'ouverture
      const timer = setTimeout(() => {
        setIsVisible({
          hero: true,
          features: true,
          advantages: true,
          founder: true,
          contact: true,
        });
      }, 100);
      return () => clearTimeout(timer);
    } else {
      setIsVisible({});
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  return (
    <>
      {/* Bouton pour ouvrir la modal */}
      <div className="fixed bottom-6 right-6 z-40">
        <button
          onClick={() => setIsOpen(true)}
          className="group bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white p-4 rounded-full shadow-2xl hover:shadow-purple-500/25 transition-all duration-300 hover:scale-110 active:scale-95 animate-pulse hover:animate-none"
          title="À propos de CinéSync"
        >
          <Info className="w-6 h-6" />
          <span className="absolute -top-12 -left-8 bg-black/90 text-white text-sm px-3 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">
            À propos
          </span>
        </button>
      </div>

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 bg-gradient-to-br from-purple-950 via-slate-900 to-indigo-950 text-white overflow-y-auto">
          {/* Background Effects */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(120,119,198,0.3),transparent)] pointer-events-none"></div>
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(168,85,247,0.2),transparent)] pointer-events-none"></div>

          {/* Floating Particles */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {[...Array(20)].map((_, i) => (
              <div
                key={i}
                className="absolute w-2 h-2 bg-purple-400/20 rounded-full animate-pulse"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 5}s`,
                  animationDuration: `${3 + Math.random() * 4}s`,
                }}
              />
            ))}
          </div>

          {/* Header */}
          <header className="relative z-10 p-6 border-b border-white/10 bg-black/20 backdrop-blur-xl sticky top-0">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-lg">
                  <span className="text-2xl">🎬</span>
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-black bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 text-transparent bg-clip-text">
                    CinéSync
                  </h1>
                  <p className="text-sm text-gray-400">À propos du projet</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 px-6 py-2 rounded-xl font-semibold transition-all duration-300 hover:scale-105 flex items-center space-x-2"
              >
                <X className="w-4 h-4" />
                <span>Fermer</span>
              </button>
            </div>
          </header>

          <main className="relative z-10 max-w-7xl mx-auto px-6 py-12">
            {/* Hero Section */}
            <section
              className={`text-center mb-20 transition-all duration-1000 ${
                isVisible.hero
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-10"
              }`}
            >
              <div className="relative">
                <h2 className="text-6xl sm:text-8xl font-black bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 text-transparent bg-clip-text mb-6">
                  CinéSync
                </h2>
                <div className="absolute -top-4 -right-4 animate-spin-slow">
                  <Sparkles className="w-8 h-8 text-yellow-400" />
                </div>
              </div>

              <h3 className="text-3xl font-bold text-white mb-6">
                🎥 Regarder des films ensemble à distance
              </h3>

              <p className="text-xl text-gray-300 max-w-4xl mx-auto leading-relaxed mb-8">
                CinéSync est une application web révolutionnaire qui permet à
                plusieurs utilisateurs de regarder des films ensemble à
                distance, tout en discutant en temps réel via chat ou appel
                vidéo.{" "}
                <span className="text-cyan-400 font-semibold">
                  Fini la frustration des films désynchronisés !
                </span>
              </p>

              <div className="flex justify-center items-center space-x-4 mb-8">
                <div className="flex items-center space-x-2 bg-green-500/20 px-4 py-2 rounded-full border border-green-500/30">
                  <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-green-300 text-sm font-semibold">
                    Version Bêta Active
                  </span>
                </div>
                <div className="flex items-center space-x-2 bg-blue-500/20 px-4 py-2 rounded-full border border-blue-500/30">
                  <Globe className="w-4 h-4 text-blue-300" />
                  <span className="text-blue-300 text-sm font-semibold">
                    Accessible Mondialement
                  </span>
                </div>
              </div>
            </section>

            {/* Features Section */}
            <section
              className={`mb-20 transition-all duration-1000 delay-300 ${
                isVisible.features
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-10"
              }`}
            >
              <div className="text-center mb-12">
                <h3 className="text-4xl font-black text-white mb-4">
                  ✨ Fonctionnalités Principales
                </h3>
                <p className="text-gray-300 text-lg">
                  Découvrez tout ce que CinéSync peut faire pour vous
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                {/* Features List */}
                <div className="space-y-4">
                  {features.map((feature, index) => (
                    <div
                      key={index}
                      className={`group p-6 rounded-2xl border transition-all duration-500 cursor-pointer ${
                        activeFeature === index
                          ? `bg-gradient-to-br ${feature.color}/20 border-current shadow-lg scale-105`
                          : "bg-gray-800/30 border-gray-700/50 hover:border-gray-600/50"
                      }`}
                      style={{ animationDelay: feature.delay }}
                      onClick={() => setActiveFeature(index)}
                    >
                      <div className="flex items-center space-x-4">
                        <div
                          className={`p-3 rounded-xl bg-gradient-to-br ${feature.color} shadow-lg`}
                        >
                          {feature.icon}
                        </div>
                        <div className="flex-1">
                          <h4 className="text-xl font-bold text-white mb-1">
                            {feature.title}
                          </h4>
                          <p className="text-gray-400 text-sm">
                            {feature.description}
                          </p>
                        </div>
                        {activeFeature === index && (
                          <div className="text-green-400">
                            <Play className="w-6 h-6" />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Visual Representation */}
                <div className="relative">
                  <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-xl p-8 rounded-3xl border border-white/10 shadow-2xl">
                    <div className="text-center">
                      <div
                        className={`mb-6 p-6 rounded-2xl bg-gradient-to-br ${features[activeFeature].color}/20 border border-current/30`}
                      >
                        <div className="flex justify-center mb-4">
                          <div
                            className={`p-4 rounded-xl bg-gradient-to-br ${features[activeFeature].color} shadow-lg`}
                          >
                            {features[activeFeature].icon}
                          </div>
                        </div>
                        <h4 className="text-xl font-bold text-white mb-2">
                          {features[activeFeature].title}
                        </h4>
                        <p className="text-gray-300 text-sm">
                          {features[activeFeature].description}
                        </p>
                      </div>

                      <div className="flex justify-center space-x-2">
                        {features.map((_, index) => (
                          <div
                            key={index}
                            className={`h-2 rounded-full transition-all duration-300 ${
                              index === activeFeature
                                ? "w-8 bg-cyan-400"
                                : "w-2 bg-gray-600"
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Advantages Section */}
            <section
              className={`mb-20 transition-all duration-1000 delay-500 ${
                isVisible.advantages
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-10"
              }`}
            >
              <div className="text-center mb-12">
                <h3 className="text-4xl font-black text-white mb-4">
                  🚀 Pourquoi Choisir CinéSync ?
                </h3>
                <p className="text-gray-300 text-lg">
                  Les avantages qui font la différence
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {advantages.map((advantage, index) => (
                  <div
                    key={index}
                    className="group bg-gradient-to-br from-gray-800/40 to-gray-900/40 backdrop-blur-xl p-6 rounded-2xl border border-gray-700/50 hover:border-gray-600/50 transition-all duration-500 hover:scale-105 hover:shadow-xl"
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    <div className="text-4xl mb-4 group-hover:scale-110 transition-transform duration-300">
                      {advantage.icon}
                    </div>
                    <h4 className="text-lg font-bold text-white mb-2">
                      {advantage.title}
                    </h4>
                    <p className="text-gray-400 text-sm">{advantage.desc}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* Founder Section */}
            <section
              className={`mb-20 transition-all duration-1000 delay-700 ${
                isVisible.founder
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-10"
              }`}
            >
              <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-xl p-12 rounded-3xl border border-white/10 shadow-2xl">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                  {/* Founder Info */}
                  <div>
                    <h3 className="text-4xl font-black text-white mb-6">
                      👨‍💻 Le Créateur
                    </h3>
                    <div className="space-y-6">
                      <div>
                        <h4 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 text-transparent bg-clip-text mb-2">
                          Mohamed Belghieti
                        </h4>
                        <p className="text-cyan-300 font-semibold">
                          Étudiant en Génie Informatique
                        </p>
                      </div>

                      <p className="text-gray-300 leading-relaxed">
                        Passionné par le développement web et les expériences
                        collaboratives en ligne, j'ai créé CinéSync pour
                        résoudre un problème que nous avons tous vécu :
                        <span className="text-white font-semibold">
                          {" "}
                          regarder des films ensemble à distance sans se prendre
                          la tête
                        </span>
                        .
                      </p>

                      <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 p-4 rounded-xl border border-purple-500/20">
                        <p className="text-purple-300 text-sm italic">
                          💡 "L'idée est née pendant le confinement, quand
                          regarder un film avec des amis devenait un vrai
                          casse-tête technique. J'ai voulu créer LA solution
                          simple et élégante."
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-3">
                        <span className="bg-blue-500/20 text-blue-300 px-3 py-1 rounded-full text-sm border border-blue-500/30">
                          Next.js
                        </span>
                        <span className="bg-green-500/20 text-green-300 px-3 py-1 rounded-full text-sm border border-green-500/30">
                          Node.js
                        </span>
                        <span className="bg-red-500/20 text-red-300 px-3 py-1 rounded-full text-sm border border-red-500/30">
                          Spring Boot
                        </span>
                        <span className="bg-purple-500/20 text-purple-300 px-3 py-1 rounded-full text-sm border border-purple-500/30">
                          WebSocket
                        </span>
                        <span className="bg-orange-500/20 text-orange-300 px-3 py-1 rounded-full text-sm border border-orange-500/30">
                          MongoDB
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Avatar & Stats */}
                  <div className="text-center">
                    <div className="relative inline-block mb-6">
                      <div className="w-48 h-48 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-6xl shadow-2xl">
                        👨‍💻
                      </div>
                      <div className="absolute -bottom-2 -right-2 bg-green-500 text-white px-3 py-1 rounded-full text-sm font-semibold border-4 border-gray-900">
                        En ligne
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div className="bg-cyan-500/20 p-4 rounded-xl border border-cyan-500/30">
                        <div className="text-2xl font-bold text-cyan-300">
                          2024
                        </div>
                        <div className="text-sm text-gray-400">
                          Année de création
                        </div>
                      </div>
                      <div className="bg-green-500/20 p-4 rounded-xl border border-green-500/30">
                        <div className="text-2xl font-bold text-green-300 flex items-center justify-center">
                          <Coffee className="w-6 h-6 mr-1" />∞
                        </div>
                        <div className="text-sm text-gray-400">Cafés bus</div>
                      </div>
                    </div>

                    <div className="flex justify-center space-x-4">
                      <div className="bg-red-500/20 p-3 rounded-xl border border-red-500/30 text-red-300">
                        <Heart className="w-6 h-6" />
                      </div>
                      <div className="bg-yellow-500/20 p-3 rounded-xl border border-yellow-500/30 text-yellow-300">
                        <Star className="w-6 h-6" />
                      </div>
                      <div className="bg-purple-500/20 p-3 rounded-xl border border-purple-500/30 text-purple-300">
                        <Code className="w-6 h-6" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Contact Section */}
            <section
              className={`text-center transition-all duration-1000 delay-900 ${
                isVisible.contact
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-10"
              }`}
            >
              <div className="bg-gradient-to-r from-cyan-500/10 to-purple-500/10 p-8 rounded-3xl border border-cyan-500/20">
                <h3 className="text-3xl font-black text-white mb-6">
                  📬 Restons en Contact
                </h3>
                <p className="text-gray-300 mb-8">
                  Une question ? Une suggestion ? Une collaboration ? N'hésitez
                  pas !
                </p>

                <div className="flex flex-wrap justify-center gap-4 mb-8">
                  <a
                    href="mailto:mohamedbelghieti1@gmail.com"
                    className="group flex items-center space-x-3 bg-red-500/20 hover:bg-red-500/30 px-6 py-3 rounded-xl border border-red-500/30 hover:border-red-500/50 transition-all duration-300 hover:scale-105"
                  >
                    <Mail className="w-5 h-5 text-red-300" />
                    <span className="text-white font-semibold">Email</span>
                    <ExternalLink className="w-4 h-4 text-red-300 group-hover:translate-x-1 transition-transform" />
                  </a>

                  <a
                    href="https://www.linkedin.com/in/mohamed-belghieti-86b7981a2/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center space-x-3 bg-blue-500/20 hover:bg-blue-500/30 px-6 py-3 rounded-xl border border-blue-500/30 hover:border-blue-500/50 transition-all duration-300 hover:scale-105"
                  >
                    <Linkedin className="w-5 h-5 text-blue-300" />
                    <span className="text-white font-semibold">LinkedIn</span>
                    <ExternalLink className="w-4 h-4 text-blue-300 group-hover:translate-x-1 transition-transform" />
                  </a>

                  <div className="group flex items-center space-x-3 bg-purple-500/20 px-6 py-3 rounded-xl border border-purple-500/30">
                    <Github className="w-5 h-5 text-purple-300" />
                    <span className="text-white font-semibold">
                      GitHub (Privé)
                    </span>
                  </div>
                </div>

                <div className="text-sm text-gray-400">
                  💜 Fait avec passion depuis Casablanca, Maroc
                </div>
              </div>
            </section>
          </main>

          {/* Footer */}
          <footer className="relative z-10 text-center text-sm text-gray-500 py-8 border-t border-white/10 bg-black/20 backdrop-blur-xl">
            <div className="max-w-7xl mx-auto px-6">
              <p className="mb-2">
                🎬 CinéSync • Révolutionner les soirées cinéma à distance
              </p>
              <p>
                © 2024 Mohamed Belghieti • Tous droits réservés • Version Bêta
              </p>
            </div>
          </footer>
        </div>
      )}
    </>
  );
};

export default AproposComponent;
