"use client";

import { useEffect, useState } from "react";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 sm:p-20 relative overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/20 blur-[100px] rounded-full pointer-events-none" />
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-gray-900 via-black to-black -z-10" />

      <main className="relative z-10 flex flex-col items-center gap-12 text-center max-w-4xl w-full">

        {/* Hero Section */}
        <div className="space-y-4">
          <div className="inline-block px-4 py-1.5 rounded-full border border-white/10 glass-panel text-xs font-mono tracking-widest text-primary uppercase mb-4">
            Future of Work
          </div>
          <h1 className="text-6xl sm:text-8xl font-bold tracking-tighter leading-none">
            JOB <span className="text-gradient">TRACKER</span>
          </h1>
          <p className="text-xl text-gray-400 max-w-lg mx-auto">
            Dominate your career path. Track applications, analyze stats, and get hired faster with the ultimate edge.
          </p>
        </div>

        {/* Feature / Visual Centerpiece */}
        <div className="relative group perspective-[1000px]">
          <div className="absolute inset-0 bg-gradient-to-r from-primary to-secondary rounded-2xl blur-xl opacity-50 group-hover:opacity-100 transition duration-500 animate-pulse" />
          <div className="glass-panel p-8 rounded-2xl border border-white/10 relative transform transition-transform duration-500 hover:rotate-x-12 hover:scale-105">
            <div className="flex flex-col gap-4 items-center">
              <div className="w-16 h-16 rounded-full bg-linear-to-br from-primary to-secondary flex items-center justify-center shadow-glow-primary">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-8 h-8 text-white">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                </svg>
              </div>
              <div className="text-center">
                <h3 className="text-xl font-bold text-white">Power Tracking</h3>
                <p className="text-sm text-gray-400 mt-1">Real-time status updates & analytics</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto mt-8">
          <button
            className="px-8 py-4 rounded-lg bg-[#00f0ff] text-black font-bold text-lg hover:bg-cyan-300 hover:shadow-glow-primary transition-all uppercase tracking-wide"
            onClick={() => window.location.href = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/auth/login`}
          >
            Sign Up Now
          </button>
          <button className="px-8 py-4 rounded-lg glass-panel text-white font-bold text-lg border border-white/10 hover:bg-white/5 transition-all uppercase tracking-wide hover:border-primary/50">
            Sign In
          </button>
        </div>

      </main>

      {/* Footer / Status */}
      <footer className="absolute bottom-8 text-center text-xs text-gray-600 font-mono">
        SYSTEM STATUS: ONLINE
      </footer>
    </div>
  );
}