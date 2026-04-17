import { useState, useEffect } from 'react';
import { Shield, Network, ListTree, X, Plus, Terminal } from 'lucide-react';

const API_URL = 'http://localhost:4444/api/config';

export default function App() {
  const [activeTab, setActiveTab] = useState<'network' | 'logs'>('network');
  const [blockedDomains, setBlockedDomains] = useState<string[]>([]);
  const [newDomain, setNewDomain] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchConfig = async () => {
    try {
      const res = await fetch(API_URL);
      if (res.ok) {
        const data = await res.json();
        setBlockedDomains(data.blocked_domains);
      }
    } catch (err) {
      console.error("Failed to connect to Prometheus Enforcer daemon.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const updateConfig = async (updatedList: string[]) => {
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blocked_domains: updatedList })
      });
      if (res.ok) {
        setBlockedDomains(updatedList);
      } else {
        const err = await res.text();
        alert(`Error: ${err}`);
      }
    } catch (err) {
      alert("Network Error: Could not reach daemon.");
    }
  };

  const addDomain = (e: React.FormEvent) => {
    e.preventDefault();
    const domain = newDomain.trim().toLowerCase();
    if (!domain || blockedDomains.includes(domain)) return;
    const newList = [...blockedDomains, domain];
    updateConfig(newList);
    setNewDomain('');
  };

  const removeDomain = (domain: string) => {
    const newList = blockedDomains.filter(d => d !== domain);
    updateConfig(newList);
  };

  return (
    <div className="flex h-screen bg-[#0a0a0a] text-white">
      {/* Pulse System Indicator */}
      <div className="fixed top-8 right-8 flex items-center gap-3 z-50">
        <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-500">System Active</span>
        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse-slow shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
      </div>

      {/* Sidebar */}
      <aside className="w-64 border-r border-[#1a1a1a] flex flex-col pt-8">
        <div className="px-8 mb-12 flex items-center gap-3">
          <Shield className="w-6 h-6" />
          <span className="font-mono text-sm tracking-[0.4em] uppercase">Prometheus</span>
        </div>

        <nav className="flex-1 space-y-1 px-4">
          <button
            onClick={() => setActiveTab('network')}
            className={`w-full flex items-center gap-3 px-4 py-3 text-xs font-mono uppercase tracking-widest transition-all ${
              activeTab === 'network' ? 'bg-white text-black' : 'text-neutral-500 hover:text-white hover:bg-white/5'
            }`}
          >
            <Network className="w-4 h-4" />
            Network Policy
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`w-full flex items-center gap-3 px-4 py-3 text-xs font-mono uppercase tracking-widest transition-all ${
              activeTab === 'logs' ? 'bg-white text-black' : 'text-neutral-500 hover:text-white hover:bg-white/5'
            }`}
          >
            <ListTree className="w-4 h-4" />
            Security Logs
          </button>
        </nav>

        <div className="p-8">
          <div className="text-[8px] font-mono text-neutral-600 uppercase tracking-widest leading-relaxed">
            Enterprise Enforcement Protocol<br />V1.0.0 Stable
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto pt-16 px-12 pb-12">
        <div className="max-w-3xl">
          {activeTab === 'network' ? (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-700">
              <header className="mb-12">
                <h1 className="text-3xl font-light tracking-tight mb-2">Network Policy</h1>
                <p className="text-neutral-500 text-sm">Synchronize domain blocklists across all enterprise endpoints via zero-route protocol.</p>
              </header>

              {/* Add Input */}
              <section className="mb-12">
                <form onSubmit={addDomain} className="flex gap-2">
                  <input
                    type="text"
                    value={newDomain}
                    onChange={(e) => setNewDomain(e.target.value)}
                    placeholder="ENTER DOMAIN (E.G. YOUTUBE.COM)"
                    className="flex-1 bg-transparent border border-[#262626] px-5 py-3 text-sm font-mono focus:border-white outline-none transition-all placeholder:text-neutral-700 uppercase"
                  />
                  <button type="submit" className="bg-white text-black px-8 py-3 text-[10px] font-mono font-bold uppercase tracking-widest hover:bg-neutral-200 transition-all flex items-center gap-2">
                    <Plus className="w-3.5 h-3.5" />
                    Enforce Policy
                  </button>
                </form>
              </section>

              {/* List */}
              <div className="border border-[#1a1a1a] bg-black/40">
                <div className="px-6 py-3 border-b border-[#1a1a1a] bg-[#111] flex items-center justify-between">
                  <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest">Global Policy List</span>
                  <span className="text-[10px] font-mono text-neutral-500">{blockedDomains.length} Active Targets</span>
                </div>
                <div className="divide-y divide-[#1a1a1a]">
                  {loading ? (
                    <div className="px-6 py-12 text-center text-xs font-mono text-neutral-600 animate-pulse">Initializing Data Stream...</div>
                  ) : blockedDomains.length === 0 ? (
                    <div className="px-6 py-16 text-center text-xs font-mono text-neutral-700">No active network enforcement rules found.</div>
                  ) : (
                    blockedDomains.map((domain) => (
                      <div key={domain} className="px-6 py-4 flex items-center justify-between group hover:bg-white/[0.02] transition-all">
                        <div className="flex items-center gap-4">
                          <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                          <span className="text-sm font-mono tracking-tight">{domain}</span>
                        </div>
                        <button
                          onClick={() => removeDomain(domain)}
                          className="opacity-0 group-hover:opacity-100 p-2 text-neutral-500 hover:text-white transition-all"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-700 flex flex-col items-center justify-center pt-32 opacity-30">
              <Terminal className="w-12 h-12 mb-6" />
              <h2 className="text-sm font-mono uppercase tracking-[0.5em]">Waiting for Feed...</h2>
              <p className="mt-4 text-[10px] font-mono uppercase tracking-widest">Security Audit Logs Will Appear Here After Endpoint Scan</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
