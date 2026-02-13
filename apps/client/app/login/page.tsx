"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

export default function LoginPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const registered = searchParams.get('registered');

    const [formData, setFormData] = useState({ email: "", password: "" });
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
            const res = await fetch(`${apiUrl}/api/auth/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.message || "Login failed");
            }

            // Store token (in real app, use HTTP-only cookies or secure storage)
            localStorage.setItem("token", data.token);
            localStorage.setItem("user", JSON.stringify(data.user));

            // Redirect to dashboard (mock) or home
            router.push("/");
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-background text-foreground relative overflow-hidden">
            {/* Background Ambience */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-secondary/10 blur-[100px] rounded-full pointer-events-none" />

            <div className="glass-panel p-8 rounded-2xl border border-white/10 w-full max-w-md relative z-10">
                <h2 className="text-3xl font-bold text-center mb-6 tracking-tight">
                    Welcome <span className="text-gradient">Back</span>
                </h2>

                {registered && (
                    <div className="bg-green-500/10 border border-green-500/50 text-green-400 p-3 rounded mb-4 text-sm text-center">
                        Account created! Please sign in.
                    </div>
                )}

                {error && (
                    <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded mb-4 text-sm text-center">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-mono text-gray-400 mb-1">EMAIL</label>
                        <input
                            type="email"
                            required
                            className="w-full bg-black/50 border border-white/10 rounded p-3 text-white focus:outline-none focus:border-primary transition-colors"
                            placeholder="you@example.com"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-mono text-gray-400 mb-1">PASSWORD</label>
                        <input
                            type="password"
                            required
                            className="w-full bg-black/50 border border-white/10 rounded p-3 text-white focus:outline-none focus:border-primary transition-colors"
                            placeholder="••••••••"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 rounded-lg bg-primary text-black font-bold hover:bg-cyan-300 transition-all uppercase tracking-wide disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? "Signing In..." : "Sign In"}
                    </button>
                </form>

                <p className="text-center text-gray-500 text-sm mt-6">
                    Don't have an account?{" "}
                    <Link href="/signup" className="text-primary hover:text-cyan-300 transition-colors">
                        Sign Up Now
                    </Link>
                </p>
            </div>
        </div>
    );
}
