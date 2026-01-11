"use client";

import { useEffect, useState } from "react";

export default function Home() {
  const [message, setMessage] = useState("Loading...");

  useEffect(() => {
    // 1. Fetch data from our Backend API
    fetch("http://localhost:4000")
      .then((res) => res.json())
      .then((data) => setMessage(data.message))
      .catch((err) => {
        console.error(err);
        setMessage("Error connecting to server 🔴");
      });
  }, []);

  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col gap-8 row-start-2 items-center sm:items-start">
        
        <h1 className="text-4xl font-bold">Job Tracker</h1>
        
        <div className="p-6 bg-gray-100 dark:bg-gray-800 rounded-lg shadow-md">
          <p className="text-lg">
            Backend Status: <span className="font-mono font-bold text-blue-500">{message}</span>
          </p>
        </div>

      </main>
    </div>
  );
}