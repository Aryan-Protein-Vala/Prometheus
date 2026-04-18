import { useState, useEffect } from 'react';
import { Shield, Network, ListTree, X, Plus, Terminal, Monitor } from 'lucide-react';

const API_URL = 'http://localhost:4444/api/config';

export default function App() {
  const [activeTab, setActiveTab] = useState<'access' | 'logs'>('access');
  const [blockedDomains, setBlockedDomains] = useState<string[]>([]);
  const [blockedApps, setBlockedApps] = useState<string[]>([]);
  const [newDomain, setNewDomain] = useState('');
  const [newApp, setNewApp] = useState('');
  const [loading, setLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const getAuthHeader = () => {
    return localStorage.getItem('prometheus_local_auth') || '';
  };

  const fetchConfig = async () => {
    const auth = getAuthHeader();
    if (!auth) {
      setIsAuthorized(false);
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(API_URL, {
        headers: { 'Authorization': auth }
      });
      if (res.ok) {
        const data = await res.json();
        setBlockedDomains(data.blocked_domains || []);
        setBlockedApps(data.blocked_apps || []);
        setIsAuthorized(true);
      } else if (res.status === 401) {
        setIsAuthorized(false);
        localStorage.removeItem('prometheus_local_auth');
      }
    } catch (err) {
      console.error("Failed to connect to Prometheus Enforcer daemon.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;
    localStorage.setItem('prometheus_local_auth', password);
    fetchConfig();
  };

  const logout = () => {
    localStorage.removeItem('prometheus_local_auth');
    setIsAuthorized(false);
    setPassword('');
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const updateConfig = async (domains: string[], apps: string[]) => {
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': getAuthHeader()
        },
        body: JSON.stringify({ 
          blocked_domains: domains,
          blocked_apps: apps 
        })
      });
      if (res.ok) {
        setBlockedDomains(domains);
        setBlockedApps(apps);
      } else if (res.status === 401) {
        setIsAuthorized(false);
        setError("Session expired or invalid key.");
      } else {
        const err = await res.text();
        alert(`Error: ${err}`);
      }
    } catch (err) {
      alert("Network Error: Could not reach daemon.");
    }
  };

  const sanitizeDomain = (input: string): string => {
    try {
      let cleaned = input.trim().toLowerCase();
      if (!cleaned.includes('://')) cleaned = 'https://' + cleaned;
      const url = new URL(cleaned);
      let hostname = url.hostname;
      if (hostname.startsWith('www.')) hostname = hostname.substring(4);
      return hostname;
    } catch {
      return input.trim().toLowerCase();
    }
  };

  const sanitizeAppName = (input: string): string => {
    return input.trim().toLowerCase().replace(/\.exe$/, '').replace(/\.app$/, '');
  };

  const addDomain = (e: React.FormEvent) => {
    e.preventDefault();
    const domain = sanitizeDomain(newDomain);
    if (!domain || blockedDomains.includes(domain)) return;
    updateConfig([...blockedDomains, domain], blockedApps);
    setNewDomain('');
  };

  const addApp = (e: React.FormEvent) => {
    e.preventDefault();
    const app = sanitizeAppName(newApp);
    if (!app || blockedApps.includes(app)) return;
    updateConfig(blockedDomains, [...blockedApps, app]);
    setNewApp('');
  };

  const removeDomain = (domain: string) => {
    updateConfig(blockedDomains.filter(d => d !== domain), blockedApps);
  };

  const removeApp = (app: string) => {
    updateConfig(blockedDomains, blockedApps.filter(a => a !== app));
  };

  if (!isAuthorized) {
    return (
      <div className="flex h-screen bg-[#0a0a0a] text-white items-center justify-center font-mono">
        <div className="max-w-md w-full p-12 border border-white/5 bg-white/[0.02] space-y-8 text-center animate-in fade-in zoom-in duration-700">
           <div className="flex justify-center mb-4">
             <Shield className="w-12 h-12 text-emerald-500 animate-pulse" />
           </div>
           <div className="space-y-2">
             <h1 className="text-xl uppercase tracking-[0.4em]">Safeguard Mode</h1>
             <p className="text-[10px] text-neutral-500 tracking-widest uppercase">Admin Terminal Access Encrypted</p>
           </div>
           <form onSubmit={handleLogin} className="space-y-4">
             <input
               type="password"
               value={password}
               onChange={(e) => setPassword(e.target.value)}
               placeholder="ENTER MASTER KEY"
               className="w-full bg-transparent border border-[#262626] px-4 py-4 text-center text-xs focus:border-white outline-none transition-all placeholder:text-neutral-700 uppercase"
               autoFocus
             />
             <button type="submit" className="w-full bg-white text-black py-4 text-xs font-bold uppercase tracking-[0.2em] hover:bg-neutral-200 transition-all">
               Access Fleet Node
             </button>
           </form>
           {error && <p className="text-[10px] text-red-500 uppercase tracking-widest">{error}</p>}
           <div className="pt-4 border-t border-white/5">
             <p className="text-[8px] text-neutral-600 uppercase tracking-widest leading-relaxed">
               Hardware Identity: Verified<br/>
               Network Sync: Active
             </p>
           </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#0a0a0a] text-white">
      {/* Pulse System Indicator */}
      <div className="fixed top-8 right-8 flex items-center gap-6 z-50">
        <button onClick={logout} className="text-[9px] uppercase tracking-widest text-neutral-500 hover:text-white transition-all flex items-center gap-2">
           <LogOut className="w-3 h-3" />
           Disconnect
        </button>
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-500">System Active</span>
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse-slow shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
        </div>
      </div>

      {/* Sidebar */}
      <aside className="w-64 border-r border-[#1a1a1a] flex flex-col pt-8">
        <div className="px-8 mb-12 flex items-center gap-3">
          <Shield className="w-6 h-6" />
          <span className="font-mono text-sm tracking-[0.4em] uppercase">Prometheus</span>
        </div>

        <nav className="flex-1 space-y-1 px-4">
          <button
            onClick={() => setActiveTab('access')}
            className={`w-full flex items-center gap-3 px-4 py-3 text-xs font-mono uppercase tracking-widest transition-all ${
              activeTab === 'access' ? 'bg-white text-black' : 'text-neutral-500 hover:text-white hover:bg-white/5'
            }`}
          >
            <Shield className="w-4 h-4" />
            Access Policies
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
        <div className="max-w-5xl">
          {activeTab === 'access' ? (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-700">
              <header className="mb-12">
                <h1 className="text-3xl font-light tracking-tight mb-2">Access Policies</h1>
                <p className="text-neutral-500 text-sm">Synchronize web and application restrictions across the enterprise fleet.</p>
                <div className="mt-4 p-3 border border-emerald-500/10 bg-emerald-500/5 flex items-center gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <p className="text-[10px] font-mono text-emerald-500 uppercase tracking-widest">
                    Policy Engine: Unified Enforcement Active
                  </p>
                </div>
              </header>

              <div className="grid md:grid-cols-2 gap-8">
                {/* Network Blocklist */}
                <section>
                  <div className="flex items-center gap-2 mb-6">
                    <Network className="w-4 h-4 text-neutral-500" />
                    <h2 className="text-xs font-mono uppercase tracking-[0.2em] text-neutral-400">Web Domains</h2>
                  </div>
                  
                  <form onSubmit={addDomain} className="flex gap-2 mb-6">
                    <input
                      type="text"
                      value={newDomain}
                      onChange={(e) => setNewDomain(e.target.value)}
                      placeholder="DOMAIN (E.G. FACEBOOK.COM)"
                      className="flex-1 bg-transparent border border-[#262626] px-4 py-3 text-xs font-mono focus:border-white outline-none transition-all placeholder:text-neutral-700 uppercase"
                    />
                    <button type="submit" className="bg-white text-black px-4 py-3 text-[10px] font-mono font-bold uppercase tracking-widest hover:bg-neutral-200 transition-all">
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </form>

                  <div className="border border-[#1a1a1a] bg-black/40">
                    <div className="px-4 py-2 border-b border-[#1a1a1a] bg-[#111] flex items-center justify-between">
                      <span className="text-[8px] font-mono text-neutral-500 uppercase tracking-widest">DNS Blocklist</span>
                      <span className="text-[8px] font-mono text-neutral-500">{blockedDomains.length} Targets</span>
                    </div>
                    <div className="divide-y divide-[#1a1a1a] max-h-[400px] overflow-y-auto">
                      {loading ? (
                        <div className="px-6 py-8 text-center text-xs font-mono text-neutral-600 animate-pulse">Scanning...</div>
                      ) : blockedDomains.length === 0 ? (
                        <div className="px-6 py-12 text-center text-[10px] font-mono text-neutral-700 uppercase">DNS Filter Empty</div>
                      ) : (
                        blockedDomains.map((domain) => (
                          <div key={domain} className="px-4 py-3 flex items-center justify-between group hover:bg-white/[0.02] transition-all">
                            <span className="text-xs font-mono tracking-tight text-neutral-300">{domain}</span>
                            <button onClick={() => removeDomain(domain)} className="opacity-0 group-hover:opacity-100 p-1 text-neutral-500 hover:text-white transition-all">
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </section>

                {/* Application Blocklist */}
                <section>
                  <div className="flex items-center gap-2 mb-6">
                    <Monitor className="w-4 h-4 text-neutral-500" />
                    <h2 className="text-xs font-mono uppercase tracking-[0.2em] text-neutral-400">Desktop Applications</h2>
                  </div>
                  
                  <form onSubmit={addApp} className="flex gap-2 mb-6">
                    <input
                      type="text"
                      value={newApp}
                      onChange={(e) => setNewApp(e.target.value)}
                      placeholder="APP NAME (E.G. DISCORD)"
                      className="flex-1 bg-transparent border border-[#262626] px-4 py-3 text-xs font-mono focus:border-white outline-none transition-all placeholder:text-neutral-700 uppercase"
                    />
                    <button type="submit" className="bg-white text-black px-4 py-3 text-[10px] font-mono font-bold uppercase tracking-widest hover:bg-neutral-200 transition-all">
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </form>

                  <div className="border border-[#1a1a1a] bg-black/40">
                    <div className="px-4 py-2 border-b border-[#1a1a1a] bg-[#111] flex items-center justify-between">
                      <span className="text-[8px] font-mono text-neutral-500 uppercase tracking-widest">Process Killer</span>
                      <span className="text-[8px] font-mono text-neutral-500">{blockedApps.length} Targets</span>
                    </div>
                    <div className="divide-y divide-[#1a1a1a] max-h-[400px] overflow-y-auto">
                      {loading ? (
                        <div className="px-6 py-8 text-center text-xs font-mono text-neutral-600 animate-pulse">Scanning...</div>
                      ) : blockedApps.length === 0 ? (
                        <div className="px-6 py-12 text-center text-[10px] font-mono text-neutral-700 uppercase">No Apps Blocked</div>
                      ) : (
                        blockedApps.map((app) => (
                          <div key={app} className="px-4 py-3 flex items-center justify-between group hover:bg-white/[0.02] transition-all">
                            <span className="text-xs font-mono tracking-tight text-neutral-300">{app}</span>
                            <button onClick={() => removeApp(app)} className="opacity-0 group-hover:opacity-100 p-1 text-neutral-500 hover:text-white transition-all">
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </section>
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
