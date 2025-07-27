import React, { useState, useEffect } from "react";
import {
  X,
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  Sparkles,
  HelpCircle,
} from "lucide-react";

const GuideComponent = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [completedSteps, setCompletedSteps] = useState(new Set());

  const steps = [
    {
      id: "welcome",
      title: "🎬 Bienvenue dans CinéSync !",
      description:
        "Découvrez comment regarder des films avec vos amis, synchronisés parfaitement !",
      content:
        "Votre plateforme révolutionnaire pour des soirées cinéma partagées",
      target: null,
      position: "center",
      icon: "🎭",
      color: "from-purple-500 to-pink-500",
    },
    {
      id: "add-movie",
      title: "🎞️ Étape 1: Ajouter un film",
      description:
        "Commencez par ajouter le lien de votre film depuis YouTube ou autre plateforme",
      content:
        'Copiez le lien de votre film et collez-le dans le formulaire "Ajouter un film"',
      target: "add-movie-card",
      position: "right",
      icon: "🎬",
      color: "from-pink-500 to-rose-500",
    },
    {
      id: "create-room",
      title: "📦 Étape 2: Créer une salle",
      description: "Créez votre espace privé pour votre séance de visionnage",
      content:
        'Cliquez sur "Créer une salle" pour lancer votre session personnalisée',
      target: "create-room-card",
      position: "right",
      icon: "🏠",
      color: "from-emerald-500 to-teal-500",
    },
    {
      id: "share-link",
      title: "🔗 Étape 3: Inviter vos amis",
      description: "Partagez le lien ou le code de votre salle avec vos amis",
      content:
        "Une fois la salle créée, vous obtiendrez un lien à partager facilement",
      target: "features-grid",
      position: "left",
      icon: "👥",
      color: "from-cyan-500 to-blue-500",
    },
    {
      id: "join-room",
      title: "🔑 Étape 4: Rejoindre une salle",
      description: "Vos amis peuvent vous rejoindre avec le code ou le lien",
      content: 'Ils entrent simplement le code dans "Rejoindre une salle"',
      target: "join-room-card",
      position: "right",
      icon: "🚪",
      color: "from-amber-500 to-orange-500",
    },
    {
      id: "enjoy",
      title: "🎉 Étape 5: Profitez ensemble !",
      description:
        "Chat intégré, synchronisation parfaite, expérience magique !",
      content:
        'Fini les "Tu appuies sur lecture maintenant ?" - Tout est automatique !',
      target: null,
      position: "center",
      icon: "✨",
      color: "from-green-500 to-emerald-500",
    },
  ];

  const currentStepData = steps[currentStep];

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCompletedSteps((prev) => new Set([...prev, currentStep]));
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const closeGuide = () => {
    setIsVisible(false);
  };

  const startGuide = () => {
    setCurrentStep(0);
    setCompletedSteps(new Set());
    setIsVisible(true);
  };

  // Auto-show guide on first visit (you can customize this logic)
  useEffect(() => {
    const hasSeenGuide = localStorage.getItem("cinesync-guide-seen");
    if (!hasSeenGuide) {
      setTimeout(() => {
        setIsVisible(true);
        localStorage.setItem("cinesync-guide-seen", "true");
      }, 1000);
    }
  }, []);

  return (
    <>
      {/* Bouton d'aide flottant */}
      {!isVisible && (
        <button
          onClick={startGuide}
          className="fixed bottom-6 right-6 z-40 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white p-4 rounded-full shadow-2xl hover:scale-110 transition-all duration-300 group"
        >
          <HelpCircle className="w-6 h-6 group-hover:rotate-12 transition-transform" />
          <div className="absolute -top-12 right-0 bg-black/80 text-white px-3 py-1 rounded-lg text-sm opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
            Guide d'utilisation
          </div>
        </button>
      )}

      {/* Overlay sombre quand le guide est actif */}
      {isVisible && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 transition-all duration-500" />
      )}

      {/* Guide Tooltip */}
      {isVisible && (
        <div className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center p-4">
          <div
            className={`relative transition-all duration-700 ease-out transform pointer-events-auto ${
              currentStepData.position === "center"
                ? "mx-auto"
                : currentStepData.position === "right"
                ? "mr-auto ml-8"
                : "ml-auto mr-8"
            }`}
          >
            {/* Carte du guide */}
            <div
              className={`relative bg-gradient-to-br ${currentStepData.color} p-1 rounded-3xl shadow-2xl max-w-md animate-pulse`}
            >
              <div className="bg-gray-900/95 backdrop-blur-xl rounded-[1.3rem] p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <span className="text-3xl animate-bounce">
                      {currentStepData.icon}
                    </span>
                    <div className="text-xs text-gray-400">
                      Étape {currentStep + 1}/{steps.length}
                    </div>
                  </div>
                  <button
                    onClick={closeGuide}
                    className="text-gray-400 hover:text-white transition-colors p-1 hover:bg-red-500/20 rounded-lg"
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* Content */}
                <div className="space-y-4">
                  <h3 className="text-xl font-bold text-white">
                    {currentStepData.title}
                  </h3>
                  <p className="text-gray-300 text-sm leading-relaxed">
                    {currentStepData.description}
                  </p>
                  <div className="bg-gradient-to-r from-cyan-500/10 to-purple-500/10 p-3 rounded-xl border border-cyan-500/20">
                    <p className="text-cyan-300 text-xs">
                      💡 {currentStepData.content}
                    </p>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mt-6 mb-4">
                  <div className="flex space-x-2 mb-2">
                    {steps.map((_, index) => (
                      <div
                        key={index}
                        className={`h-2 flex-1 rounded-full transition-all duration-300 ${
                          index === currentStep
                            ? "bg-gradient-to-r from-cyan-400 to-purple-400"
                            : completedSteps.has(index)
                            ? "bg-green-500"
                            : "bg-gray-600"
                        }`}
                      />
                    ))}
                  </div>
                  <div className="text-xs text-gray-400 text-center">
                    {Math.round(((currentStep + 1) / steps.length) * 100)}%
                    complété
                  </div>
                </div>

                {/* Navigation */}
                <div className="flex justify-between items-center">
                  <button
                    onClick={prevStep}
                    disabled={currentStep === 0}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-xl transition-all duration-300 ${
                      currentStep === 0
                        ? "text-gray-500 cursor-not-allowed opacity-50"
                        : "text-white bg-gray-700 hover:bg-gray-600 hover:scale-105"
                    }`}
                  >
                    <ArrowLeft size={16} />
                    <span>Précédent</span>
                  </button>

                  {currentStep === steps.length - 1 ? (
                    <button
                      onClick={closeGuide}
                      className="flex items-center space-x-2 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 px-6 py-2 rounded-xl font-semibold transition-all duration-300 hover:scale-105 active:scale-95"
                    >
                      <CheckCircle size={16} />
                      <span>C'est parti !</span>
                      <Sparkles size={16} className="animate-pulse" />
                    </button>
                  ) : (
                    <button
                      onClick={nextStep}
                      className="flex items-center space-x-2 bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 px-6 py-2 rounded-xl font-semibold transition-all duration-300 hover:scale-105 active:scale-95"
                    >
                      <span>Suivant</span>
                      <ArrowRight
                        size={16}
                        className="group-hover:translate-x-1 transition-transform"
                      />
                    </button>
                  )}
                </div>

                {/* Bouton "Passer le guide" */}
                <div className="mt-4 text-center">
                  <button
                    onClick={closeGuide}
                    className="text-xs text-gray-400 hover:text-gray-300 transition-colors underline"
                  >
                    Passer le guide
                  </button>
                </div>
              </div>
            </div>

            {/* Flèche pointant vers l'élément ciblé */}
            {currentStepData.target && (
              <div
                className={`absolute pointer-events-none ${
                  currentStepData.position === "right"
                    ? "-right-6 top-1/2 -translate-y-1/2"
                    : currentStepData.position === "left"
                    ? "-left-6 top-1/2 -translate-y-1/2"
                    : "bottom-0 left-1/2 -translate-x-1/2 translate-y-6"
                }`}
              >
                <div
                  className={`w-0 h-0 animate-pulse ${
                    currentStepData.position === "right"
                      ? "border-l-[24px] border-l-gray-900 border-t-[12px] border-t-transparent border-b-[12px] border-b-transparent"
                      : currentStepData.position === "left"
                      ? "border-r-[24px] border-r-gray-900 border-t-[12px] border-t-transparent border-b-[12px] border-b-transparent"
                      : "border-t-[24px] border-t-gray-900 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent"
                  } drop-shadow-lg`}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Style pour highlighter les éléments ciblés */}
      {isVisible && currentStepData.target && (
        <style jsx global>{`
          [id="${currentStepData.target}"] {
            position: relative;
            z-index: 45;
            box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.4),
              0 0 0 8px rgba(99, 102, 241, 0.2);
            animation: guidePulse 2s infinite;
            border-radius: 1.5rem;
          }

          @keyframes guidePulse {
            0%,
            100% {
              box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.4),
                0 0 0 8px rgba(99, 102, 241, 0.2);
            }
            50% {
              box-shadow: 0 0 0 8px rgba(99, 102, 241, 0.5),
                0 0 0 16px rgba(99, 102, 241, 0.2);
            }
          }
        `}</style>
      )}
    </>
  );
};

export default GuideComponent;
