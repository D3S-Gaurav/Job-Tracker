"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

// ─── TYPES ──────────────────────────────────────────────────────────────────
interface User {
    id: string;
    email: string;
    name: string | null;
    role: string;
}

interface Job {
    id: string;
    title: string;
    company: string;
    description: string | null;
    location: string | null;
    salary: string | null;
    url: string | null;
    notes: string | null;
    status: string;
    jobType: string;
    priority: string;
    appliedDate: string | null;
    interviewDate: string | null;
    offerDeadline: string | null;
    contactName: string | null;
    contactEmail: string | null;
    createdAt: string;
    updatedAt: string;
}

interface Stats {
    total: number;
    byStatus: Record<string, number>;
    byType: Record<string, number>;
    byPriority: Record<string, number>;
    recentJobs: { id: string; title: string; company: string; status: string; createdAt: string }[];
}

const STATUS_OPTIONS = ['SAVED', 'APPLIED', 'PHONE_SCREEN', 'INTERVIEW', 'TECHNICAL', 'OFFER', 'ACCEPTED', 'REJECTED', 'WITHDRAWN', 'GHOSTED'];
const JOB_TYPES = ['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERNSHIP', 'FREELANCE', 'REMOTE'];
const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

const STATUS_COLORS: Record<string, string> = {
    SAVED: 'bg-gray-500/20 text-gray-300 border-gray-500/30',
    APPLIED: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    PHONE_SCREEN: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
    INTERVIEW: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    TECHNICAL: 'bg-violet-500/20 text-violet-300 border-violet-500/30',
    OFFER: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    ACCEPTED: 'bg-green-500/20 text-green-300 border-green-500/30',
    REJECTED: 'bg-red-500/20 text-red-300 border-red-500/30',
    WITHDRAWN: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
    GHOSTED: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
};

const PRIORITY_COLORS: Record<string, string> = {
    LOW: 'text-gray-400',
    MEDIUM: 'text-blue-400',
    HIGH: 'text-orange-400',
    CRITICAL: 'text-red-400',
};

// ─── API HELPER ─────────────────────────────────────────────────────────────
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

async function apiFetch(path: string, options: RequestInit = {}) {
    const token = localStorage.getItem("accessToken");
    const res = await fetch(`${API_URL}${path}`, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...options.headers,
        },
    });

    const data = await res.json();

    if (res.status === 401) {
        // Try to refresh token
        const refreshToken = localStorage.getItem("refreshToken");
        if (refreshToken) {
            const refreshRes = await fetch(`${API_URL}/api/auth/refresh`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ refreshToken }),
            });
            const refreshData = await refreshRes.json();
            if (refreshRes.ok) {
                localStorage.setItem("accessToken", refreshData.data.accessToken);
                localStorage.setItem("refreshToken", refreshData.data.refreshToken);
                // Retry original request
                return apiFetch(path, options);
            }
        }
        // Redirect to login
        localStorage.clear();
        window.location.href = "/login";
        throw new Error("Session expired");
    }

    if (!res.ok) {
        throw new Error(data.error?.message || "Request failed");
    }

    return data;
}

// ─── COMPONENTS ─────────────────────────────────────────────────────────────

function StatCard({ label, value, icon, color }: { label: string; value: number | string; icon: string; color: string }) {
    return (
        <div className="glass-panel rounded-xl p-5 border border-white/5 hover:border-white/10 transition-all group">
            <div className="flex items-center justify-between mb-3">
                <span className="text-2xl">{icon}</span>
                <span className={`text-xs font-mono uppercase tracking-wider ${color}`}>{label}</span>
            </div>
            <p className="text-3xl font-bold text-white group-hover:text-gradient transition-all">{value}</p>
        </div>
    );
}

function JobModal({ job, onClose, onSave }: {
    job: Partial<Job> | null;
    onClose: () => void;
    onSave: (data: any) => void;
}) {
    const [form, setForm] = useState({
        title: job?.title || '',
        company: job?.company || '',
        description: job?.description || '',
        location: job?.location || '',
        salary: job?.salary || '',
        url: job?.url || '',
        notes: job?.notes || '',
        status: job?.status || 'APPLIED',
        jobType: job?.jobType || 'FULL_TIME',
        priority: job?.priority || 'MEDIUM',
        contactName: job?.contactName || '',
        contactEmail: job?.contactEmail || '',
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError('');
        try {
            await onSave(form);
            onClose();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
            <div className="glass-panel rounded-2xl border border-white/10 w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-2xl font-bold">
                        {job?.id ? 'Edit' : 'Add'} <span className="text-gradient">Job</span>
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl">&times;</button>
                </div>

                {error && (
                    <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded mb-4 text-sm">{error}</div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-mono text-gray-400 mb-1">JOB TITLE *</label>
                            <input required className="w-full bg-black/50 border border-white/10 rounded p-2.5 text-white text-sm focus:outline-none focus:border-primary transition-colors" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
                        </div>
                        <div>
                            <label className="block text-xs font-mono text-gray-400 mb-1">COMPANY *</label>
                            <input required className="w-full bg-black/50 border border-white/10 rounded p-2.5 text-white text-sm focus:outline-none focus:border-primary transition-colors" value={form.company} onChange={e => setForm({ ...form, company: e.target.value })} />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-xs font-mono text-gray-400 mb-1">STATUS</label>
                            <select className="w-full bg-black/50 border border-white/10 rounded p-2.5 text-white text-sm focus:outline-none focus:border-primary transition-colors" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                                {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-mono text-gray-400 mb-1">JOB TYPE</label>
                            <select className="w-full bg-black/50 border border-white/10 rounded p-2.5 text-white text-sm focus:outline-none focus:border-primary transition-colors" value={form.jobType} onChange={e => setForm({ ...form, jobType: e.target.value })}>
                                {JOB_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-mono text-gray-400 mb-1">PRIORITY</label>
                            <select className="w-full bg-black/50 border border-white/10 rounded p-2.5 text-white text-sm focus:outline-none focus:border-primary transition-colors" value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}>
                                {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-mono text-gray-400 mb-1">LOCATION</label>
                            <input className="w-full bg-black/50 border border-white/10 rounded p-2.5 text-white text-sm focus:outline-none focus:border-primary transition-colors" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} />
                        </div>
                        <div>
                            <label className="block text-xs font-mono text-gray-400 mb-1">SALARY</label>
                            <input className="w-full bg-black/50 border border-white/10 rounded p-2.5 text-white text-sm focus:outline-none focus:border-primary transition-colors" value={form.salary} onChange={e => setForm({ ...form, salary: e.target.value })} />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-mono text-gray-400 mb-1">URL</label>
                        <input type="url" className="w-full bg-black/50 border border-white/10 rounded p-2.5 text-white text-sm focus:outline-none focus:border-primary transition-colors" value={form.url} onChange={e => setForm({ ...form, url: e.target.value })} placeholder="https://..." />
                    </div>

                    <div>
                        <label className="block text-xs font-mono text-gray-400 mb-1">DESCRIPTION</label>
                        <textarea rows={3} className="w-full bg-black/50 border border-white/10 rounded p-2.5 text-white text-sm focus:outline-none focus:border-primary transition-colors resize-none" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
                    </div>

                    <div>
                        <label className="block text-xs font-mono text-gray-400 mb-1">NOTES</label>
                        <textarea rows={2} className="w-full bg-black/50 border border-white/10 rounded p-2.5 text-white text-sm focus:outline-none focus:border-primary transition-colors resize-none" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-mono text-gray-400 mb-1">CONTACT NAME</label>
                            <input className="w-full bg-black/50 border border-white/10 rounded p-2.5 text-white text-sm focus:outline-none focus:border-primary transition-colors" value={form.contactName} onChange={e => setForm({ ...form, contactName: e.target.value })} />
                        </div>
                        <div>
                            <label className="block text-xs font-mono text-gray-400 mb-1">CONTACT EMAIL</label>
                            <input type="email" className="w-full bg-black/50 border border-white/10 rounded p-2.5 text-white text-sm focus:outline-none focus:border-primary transition-colors" value={form.contactEmail} onChange={e => setForm({ ...form, contactEmail: e.target.value })} />
                        </div>
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={onClose} className="flex-1 py-3 rounded-lg glass-panel text-gray-400 font-semibold border border-white/10 hover:bg-white/5 transition-all">
                            Cancel
                        </button>
                        <button type="submit" disabled={saving} className="flex-1 py-3 rounded-lg bg-primary text-black font-bold hover:bg-cyan-300 transition-all uppercase tracking-wide disabled:opacity-50">
                            {saving ? "Saving..." : (job?.id ? "Update" : "Create")}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ─── MAIN DASHBOARD ─────────────────────────────────────────────────────────
export default function DashboardPage() {
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);
    const [stats, setStats] = useState<Stats | null>(null);
    const [jobs, setJobs] = useState<Job[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalJob, setModalJob] = useState<Partial<Job> | null | undefined>(undefined);
    const [filter, setFilter] = useState({ status: '', search: '', page: 1 });
    const [totalPages, setTotalPages] = useState(1);
    const [activeTab, setActiveTab] = useState<'overview' | 'jobs'>('overview');

    const fetchData = useCallback(async () => {
        try {
            const [meRes, statsRes, jobsRes] = await Promise.all([
                apiFetch('/api/auth/me'),
                apiFetch('/api/jobs/stats'),
                apiFetch(`/api/jobs?page=${filter.page}&limit=20${filter.status ? `&status=${filter.status}` : ''}${filter.search ? `&search=${filter.search}` : ''}`),
            ]);
            setUser(meRes.data);
            setStats(statsRes.data);
            setJobs(jobsRes.data);
            setTotalPages(jobsRes.meta?.totalPages || 1);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [filter]);

    useEffect(() => {
        const token = localStorage.getItem("accessToken");
        if (!token) {
            router.push("/login");
            return;
        }
        fetchData();
    }, [fetchData, router]);

    const handleSaveJob = async (data: any) => {
        if (modalJob?.id) {
            await apiFetch(`/api/jobs/${modalJob.id}`, { method: 'PUT', body: JSON.stringify(data) });
        } else {
            await apiFetch('/api/jobs', { method: 'POST', body: JSON.stringify(data) });
        }
        fetchData();
    };

    const handleDeleteJob = async (id: string) => {
        if (!confirm('Are you sure you want to delete this job?')) return;
        await apiFetch(`/api/jobs/${id}`, { method: 'DELETE' });
        fetchData();
    };

    const handleLogout = () => {
        const refreshToken = localStorage.getItem("refreshToken");
        if (refreshToken) {
            apiFetch('/api/auth/logout', { method: 'POST', body: JSON.stringify({ refreshToken }) }).catch(() => {});
        }
        localStorage.clear();
        router.push("/login");
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-gray-400 font-mono text-sm">LOADING DASHBOARD...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background text-foreground">
            {/* ─── Header ─────────────────────────────────────────────── */}
            <header className="sticky top-0 z-40 glass-panel border-b border-white/5">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/" className="text-xl font-bold tracking-tighter">
                            JOB <span className="text-gradient">TRACKER</span>
                        </Link>
                        <nav className="hidden sm:flex items-center gap-1 ml-8">
                            <button onClick={() => setActiveTab('overview')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'overview' ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white'}`}>
                                Overview
                            </button>
                            <button onClick={() => setActiveTab('jobs')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'jobs' ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white'}`}>
                                Jobs
                            </button>
                        </nav>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="hidden sm:block text-right">
                            <p className="text-sm font-medium text-white">{user?.name || user?.email}</p>
                            <p className="text-xs text-gray-500 font-mono">{user?.role}</p>
                        </div>
                        <button onClick={handleLogout} className="px-4 py-2 rounded-lg text-sm text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-all font-mono">
                            LOGOUT
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* ─── Mobile Tabs ─────────────────────────────────────── */}
                <div className="flex sm:hidden gap-2 mb-6">
                    <button onClick={() => setActiveTab('overview')} className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'overview' ? 'bg-white/10 text-white' : 'text-gray-400'}`}>
                        Overview
                    </button>
                    <button onClick={() => setActiveTab('jobs')} className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'jobs' ? 'bg-white/10 text-white' : 'text-gray-400'}`}>
                        Jobs
                    </button>
                </div>

                {/* ─── Overview Tab ────────────────────────────────────── */}
                {activeTab === 'overview' && (
                    <div className="space-y-8 animate-in">
                        {/* Stats Grid */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            <StatCard label="Total Jobs" value={stats?.total || 0} icon="📋" color="text-primary" />
                            <StatCard label="Applied" value={stats?.byStatus?.APPLIED || 0} icon="📤" color="text-blue-400" />
                            <StatCard label="Interviews" value={(stats?.byStatus?.INTERVIEW || 0) + (stats?.byStatus?.PHONE_SCREEN || 0) + (stats?.byStatus?.TECHNICAL || 0)} icon="🎯" color="text-purple-400" />
                            <StatCard label="Offers" value={(stats?.byStatus?.OFFER || 0) + (stats?.byStatus?.ACCEPTED || 0)} icon="🏆" color="text-emerald-400" />
                        </div>

                        {/* Status Breakdown */}
                        <div className="glass-panel rounded-xl p-6 border border-white/5">
                            <h3 className="text-lg font-bold mb-4">Status <span className="text-gradient">Breakdown</span></h3>
                            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                                {STATUS_OPTIONS.map(status => (
                                    <div key={status} className={`rounded-lg p-3 border text-center ${STATUS_COLORS[status]}`}>
                                        <p className="text-2xl font-bold">{stats?.byStatus?.[status] || 0}</p>
                                        <p className="text-xs font-mono mt-1">{status.replace(/_/g, ' ')}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Recent Jobs */}
                        <div className="glass-panel rounded-xl p-6 border border-white/5">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-bold">Recent <span className="text-gradient">Applications</span></h3>
                                <button onClick={() => { setActiveTab('jobs'); setModalJob(null); }} className="text-primary text-sm hover:text-cyan-300 transition-colors font-mono">
                                    + ADD JOB
                                </button>
                            </div>
                            {stats?.recentJobs?.length ? (
                                <div className="space-y-3">
                                    {stats.recentJobs.map(job => (
                                        <div key={job.id} className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
                                            <div>
                                                <p className="font-medium text-white">{job.title}</p>
                                                <p className="text-sm text-gray-400">{job.company}</p>
                                            </div>
                                            <span className={`px-3 py-1 rounded-full text-xs font-mono border ${STATUS_COLORS[job.status]}`}>
                                                {job.status.replace(/_/g, ' ')}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-gray-500 text-center py-8 font-mono text-sm">No jobs yet. Start tracking!</p>
                            )}
                        </div>
                    </div>
                )}

                {/* ─── Jobs Tab ────────────────────────────────────────── */}
                {activeTab === 'jobs' && (
                    <div className="space-y-6 animate-in">
                        {/* Toolbar */}
                        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                                <input
                                    id="search-jobs"
                                    type="text"
                                    placeholder="Search jobs..."
                                    className="bg-black/50 border border-white/10 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-primary transition-colors w-full sm:w-64"
                                    value={filter.search}
                                    onChange={e => setFilter({ ...filter, search: e.target.value, page: 1 })}
                                    onKeyDown={e => { if (e.key === 'Enter') fetchData(); }}
                                />
                                <select
                                    id="filter-status"
                                    className="bg-black/50 border border-white/10 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-primary transition-colors"
                                    value={filter.status}
                                    onChange={e => setFilter({ ...filter, status: e.target.value, page: 1 })}
                                >
                                    <option value="">All Statuses</option>
                                    {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
                                </select>
                            </div>
                            <button
                                id="add-job-btn"
                                onClick={() => setModalJob(null)}
                                className="px-6 py-2.5 rounded-lg bg-primary text-black font-bold text-sm hover:bg-cyan-300 transition-all uppercase tracking-wide whitespace-nowrap"
                            >
                                + Add Job
                            </button>
                        </div>

                        {/* Jobs List */}
                        {jobs.length > 0 ? (
                            <div className="space-y-3">
                                {jobs.map(job => (
                                    <div key={job.id} className="glass-panel rounded-xl p-5 border border-white/5 hover:border-white/10 transition-all group">
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-3 mb-1">
                                                    <h4 className="font-bold text-white text-lg truncate">{job.title}</h4>
                                                    <span className={`text-xs font-mono ${PRIORITY_COLORS[job.priority]}`}>● {job.priority}</span>
                                                </div>
                                                <p className="text-sm text-gray-400 mb-2">{job.company}{job.location ? ` • ${job.location}` : ''}{job.salary ? ` • ${job.salary}` : ''}</p>
                                                <div className="flex flex-wrap gap-2">
                                                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-mono border ${STATUS_COLORS[job.status]}`}>
                                                        {job.status.replace(/_/g, ' ')}
                                                    </span>
                                                    <span className="px-2.5 py-0.5 rounded-full text-xs font-mono bg-white/5 text-gray-400 border border-white/10">
                                                        {job.jobType.replace(/_/g, ' ')}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                                                {job.url && (
                                                    <a href={job.url} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 rounded-lg text-xs text-gray-400 hover:text-primary hover:bg-primary/10 transition-all font-mono">
                                                        LINK ↗
                                                    </a>
                                                )}
                                                <button onClick={() => setModalJob(job)} className="px-3 py-1.5 rounded-lg text-xs text-gray-400 hover:text-white hover:bg-white/10 transition-all font-mono">
                                                    EDIT
                                                </button>
                                                <button onClick={() => handleDeleteJob(job.id)} className="px-3 py-1.5 rounded-lg text-xs text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-all font-mono">
                                                    DEL
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="glass-panel rounded-xl p-12 border border-white/5 text-center">
                                <p className="text-4xl mb-4">📋</p>
                                <p className="text-gray-400 font-mono text-sm">No jobs found. Add your first application!</p>
                            </div>
                        )}

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="flex items-center justify-center gap-2">
                                <button disabled={filter.page <= 1} onClick={() => setFilter({ ...filter, page: filter.page - 1 })} className="px-4 py-2 rounded-lg glass-panel text-sm text-gray-400 hover:text-white transition-all disabled:opacity-30">
                                    Prev
                                </button>
                                <span className="text-sm text-gray-500 font-mono px-4">
                                    {filter.page} / {totalPages}
                                </span>
                                <button disabled={filter.page >= totalPages} onClick={() => setFilter({ ...filter, page: filter.page + 1 })} className="px-4 py-2 rounded-lg glass-panel text-sm text-gray-400 hover:text-white transition-all disabled:opacity-30">
                                    Next
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </main>

            {/* ─── Job Modal ──────────────────────────────────────────── */}
            {modalJob !== undefined && (
                <JobModal
                    job={modalJob}
                    onClose={() => setModalJob(undefined)}
                    onSave={handleSaveJob}
                />
            )}
        </div>
    );
}
