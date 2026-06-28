"use client";

import React, { useEffect, useState } from "react";
import { motion } from "motion/react";
import JarvisCore from "@/components/jarvis/JarvisCore";

export default function JarvisHUD() {
  const [time, setTime] = useState("");

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      setTime(now.toLocaleTimeString("en-US", { hour12: false }) + ":" + now.getMilliseconds().toString().padStart(3, "0"));
    }, 50);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 bg-black text-[#FF3300] font-mono overflow-hidden select-none">
      {/* Background Grid */}
      <div className="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-orange-900 to-black pointer-events-none" />

      {/* Main Container */}
      <div className="relative w-full h-full flex items-center justify-center z-10">
        
        <JarvisCore />

        {/* Center Rings (Placeholder for WebGL) */}
        <div className="relative w-[600px] h-[600px] rounded-full border border-[#FF3300]/30 flex items-center justify-center">
          <motion.div 
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 20, ease: "linear" }}
            className="absolute w-[500px] h-[500px] rounded-full border-2 border-dashed border-[#FF3300]/50"
          />
          <motion.div 
            animate={{ rotate: -360 }}
            transition={{ repeat: Infinity, duration: 15, ease: "linear" }}
            className="absolute w-[400px] h-[400px] rounded-full border border-[#FF3300]/80"
          >
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2 h-4 bg-[#FF3300]" />
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-2 h-4 bg-[#FF3300]" />
          </motion.div>
          
          <div className="text-center">
            <h1 className="text-4xl font-bold tracking-widest uppercase opacity-90 drop-shadow-[0_0_10px_rgba(255,51,0,0.8)]">J.A.R.V.I.S.</h1>
            <p className="text-sm mt-2 opacity-70 tracking-widest">SYSTEM ONLINE</p>
          </div>
        </div>

        {/* Left Panel: Audio / Diagnostics */}
        <div className="absolute left-10 top-1/2 -translate-y-1/2 flex flex-col gap-8 w-64">
          <div>
            <h2 className="text-xs tracking-widest opacity-60 mb-2">SUIT DIAGNOSTICS</h2>
            <div className="h-1 bg-[#FF3300]/20 w-full mb-4">
              <div className="h-full bg-[#FF3300] w-[76%] shadow-[0_0_10px_rgba(255,51,0,0.8)]" />
            </div>
            <div className="h-1 bg-[#FF3300]/20 w-full mb-4">
              <div className="h-full bg-[#FF3300] w-[92%] shadow-[0_0_10px_rgba(255,51,0,0.8)]" />
            </div>
          </div>
          
          <div>
            <h2 className="text-xs tracking-widest opacity-60 mb-2">EKG / EEG</h2>
            <div className="h-24 w-full border border-[#FF3300]/30 rounded flex items-center justify-center bg-[#FF3300]/5 overflow-hidden relative">
               <motion.div
                 className="w-[200%] h-full flex"
                 animate={{ x: "-50%" }}
                 transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
               >
                 {/* Mock Waveform */}
                 <svg className="h-full w-full stroke-[#FF3300] fill-none stroke-2 opacity-80" preserveAspectRatio="none" viewBox="0 0 100 100">
                    <path d="M0,50 L10,50 L15,20 L25,80 L35,10 L45,90 L50,50 L100,50" />
                 </svg>
                 <svg className="h-full w-full stroke-[#FF3300] fill-none stroke-2 opacity-80" preserveAspectRatio="none" viewBox="0 0 100 100">
                    <path d="M0,50 L10,50 L15,20 L25,80 L35,10 L45,90 L50,50 L100,50" />
                 </svg>
               </motion.div>
            </div>
          </div>
        </div>

        {/* Right Panel: Environmentals */}
        <div className="absolute right-10 top-1/2 -translate-y-1/2 flex flex-col gap-8 w-64 text-right">
          <div>
            <h2 className="text-xs tracking-widest opacity-60 mb-2">SYS CLOCK</h2>
            <div className="text-2xl font-bold drop-shadow-[0_0_8px_rgba(255,51,0,0.8)]">{time}</div>
          </div>

          <div>
            <h2 className="text-xs tracking-widest opacity-60 mb-2">ENVIRONMENTALS</h2>
            <ul className="text-sm flex flex-col gap-2">
              <li className="flex justify-between"><span>CORE TEMP</span> <span>34°C</span></li>
              <li className="flex justify-between"><span>EXTERNAL</span> <span>18°C</span></li>
              <li className="flex justify-between"><span>PRESSURE</span> <span>1.0 ATM</span></li>
            </ul>
          </div>
          
          <div className="border border-[#FF3300]/30 p-2 mt-4 bg-[#FF3300]/5">
            <h2 className="text-[10px] tracking-widest opacity-60 mb-1 text-left">STATUS LOG</h2>
            <div className="h-32 overflow-hidden text-[10px] text-left opacity-80 flex flex-col justify-end">
              <p>{">"} INIT PROTOCOL ALFA...</p>
              <p>{">"} CHECKING NEURAL UPLINK... OK</p>
              <p>{">"} AWAITING VOICE INPUT...</p>
              <p className="animate-pulse">{">"} _</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
