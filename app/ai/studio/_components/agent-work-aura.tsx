import { AnimatePresence, motion } from "framer-motion"; // Note: Updated to "framer-motion" package standard unless using experimental React build

// ==========================================
// Animation Variants
// ==========================================
const overlayVariants = {
  initial: { opacity: 0 },
  animate: {
    opacity: 1,
    transition: {
      duration: 0.28,
      ease: [0.16, 1, 0.3, 1],
      when: "beforeChildren",
      staggerChildren: 0.04,
    },
  },
  exit: {
    opacity: 0,
    transition: {
      duration: 0.2,
      ease: [0.4, 0, 1, 1],
      when: "afterChildren",
    },
  },
};

const layerVariants = {
  initial: { opacity: 0, scale: 0.96 },
  animate: {
    opacity: 1,
    scale: 1,
    transition: { type: "spring", damping: 30, stiffness: 200 },
  },
  exit: {
    opacity: 0,
    scale: 0.98,
    transition: { duration: 0.2, ease: [0.4, 0, 1, 1] },
  },
};

// ==========================================
// Main Component
// ==========================================
export function AgentWorkAura({ isWorking }: { isWorking: boolean }) {

  if (!isWorking) return;

  return (
    <AnimatePresence mode="wait">
      {isWorking && (
        <motion.div
          key="agent-work-aura"
          variants={overlayVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          className="pointer-events-none absolute inset-0 z-10 overflow-hidden"
          style={{ transform: "translateZ(0)" }} // Hardware acceleration hint
        >
          <AmbientGlow />
          <LaserScanner />
          {/* <DataParticles /> */}
          <TechBorderRim />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ==========================================
// Sub-Components (Isolates continuous animations)
// ==========================================

function AmbientGlow() {
  return (
    <motion.div variants={layerVariants} className="absolute inset-0 select-none">
      {/* Top Left Glow */}
      <motion.div
        className="absolute left-[-10%] top-[-10%] h-[50%] w-[50%] rounded-full will-change-transform"
        animate={{
          scale: [1, 1.05, 1],
          opacity: [0.4, 0.6, 0.4],
          x: [0, 10, 0],
          y: [0, -10, 0],
        }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        style={{
          background: "radial-gradient(circle, rgba(14,165,233,0.5) 0%, transparent 70%)",
          filter: "blur(60px)",
        }}
      />
      {/* Bottom Right Glow */}
      <motion.div
        className="absolute right-[-10%] bottom-[-10%] h-[50%] w-[50%] will-change-transform"
        animate={{
          scale: [1, 1.1, 1],
          opacity: [0.3, 0.5, 0.3],
          x: [0, -10, 0],
          y: [0, 10, 0],
        }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        style={{
          background: "radial-gradient(circle, rgba(6,182,212,0.4) 0%, transparent 70%)",
          filter: "blur(60px)",
        }}
      />
    </motion.div>
  );
}

function LaserScanner() {
  return (
    <motion.div variants={layerVariants} className="absolute inset-0">
      {/* The Laser Beam */}
      <motion.div
        className="absolute left-0 right-0 z-20 will-change-[top]"
        animate={{ top: ["-10%", "110%", "-10%"] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        style={{
          height: "10px",
          background: "linear-gradient(to bottom, transparent 0%, rgba(14,165,233,0.05) 50%, rgba(14,165,233,0.4) 95%, rgba(255,255,255,0.6) 100%)",
          borderBottom: "1px solid rgba(255,255,255,0.9)",
          boxShadow: "0px 10px 30px rgba(14,165,233,0.7)",
        }}
      >
        {/* Glassmorphic distortion trail */}
        <div className="absolute inset-0 backdrop-blur-[1px] [mask-image:linear-gradient(to_bottom,transparent,black)]" />
      </motion.div>
    </motion.div>
  );
}

function DataParticles() {
  // Array initialized once outside render loop or statically
  const totalParticles = 12;

  return (
    <div className="absolute inset-0 overflow-hidden">
      {Array.from({ length: totalParticles }).map((_, i) => (
        <motion.span
          key={i}
          className="absolute block bg-cyan-400 will-change-transform"
          style={{
            width: i % 3 === 0 ? 3 : 2,
            height: i % 3 === 0 ? 12 : 6,
            borderRadius: "2px",
            left: `${8 + i * 8}%`,
            top: `${15 + (i % 4) * 20}%`,
            boxShadow: "0 0 8px rgba(6,182,212,0.8)",
          }}
          animate={{
            y: [0, -40, 0],
            opacity: [0, 1, 0],
            scaleY: [0.5, 1.5, 0.5],
          }}
          transition={{
            duration: 2 + i * 0.2,
            repeat: Infinity,
            ease: "easeInOut",
            delay: i * 0.15,
          }}
        />
      ))}
    </div>
  );
}

function TechBorderRim() {
  return (
    <motion.div
      className="absolute inset-0 pointer-events-none will-change-[opacity]"
      animate={{ opacity: [0.5, 1, 0.5] }} // Safer alternative to complex multi-step boxShadow looping
      transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
      style={{
        boxShadow: "inset 0 0 0 1.5px rgba(14,165,233,0.6), inset 0 0 30px rgba(14,165,233,0.3)",
      }}
    />
  );
}