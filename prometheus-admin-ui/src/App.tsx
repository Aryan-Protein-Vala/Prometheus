import { useState, useEffect } from 'react';
import { Lock, Shield, Server, Terminal, Key, ShieldAlert } from 'lucide-react';

const API_URL = 'http://127.0.0.1:4444/api/config';

type SecurityLog = {
  path: string;
  size: number;
  type: string;
};

type ConfigData = {
  blocked_domains: string[];
  security_logs: SecurityLog[];
};

export default function App() {
  const [token, setToken] = useState<string>('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  
  const [config, setConfig] = useState<ConfigData | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'network' | 'audit'>('network');
  const [newDomain, setNewDomain] = useState('');

  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch(API_URL, {
        headers: {
          'Authorization': `Bearer ${password}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setConfig(data);
        setToken(password);
      } else {
        setError('Invalid IT Admin credentials.');
      }
    } catch (err) {
      setError('Cannot connect to Prometheus-Enforcer daemon.');
    }
    setLoading(false);
  };

  const updateConfig = async (newDomains: string[]) => {
    if (!token) return;
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ blocked_domains: newDomains })
      });
      if (res.ok) {
        setConfig(prev => prev ? { ...prev, blocked_domains: newDomains } : null);
        setNewDomain('');
      } else {
        alert('Failed to update enforcement config.');
      }
    } catch {
      alert('Network error.');
    }
  };

  const addDomain = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDomain || !config) return;
    const cleanDomain = newDomain.trim().toLowerCase();
    if (config.blocked_domains.includes(cleanDomain)) return;
    updateConfig([...config.blocked_domains, cleanDomain]);
  };

  const removeDomain = (domain: string) => {
    if (!config) return;
    updateConfig(config.blocked_domains.filter(d => d !== domain));
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
        <div className="absolute inset-0 z-0 opacity-20 pointer-events-none" style={{
          backgroundImage: 'radial-gradient(circle at 50% -20%, #38bdf8 0%, transparent 40%)'
        }} />
        <div className="w-full max-w-sm border border-muted bg-black/50 backdrop-blur pb-8 pt-10 px-8 z-10">
          <div className="flex flex-col items-center mb-8">
            <Shield className="w-8 h-8 text-accent mb-4 opacity-80" />
            <h1 className="font-mono text-sm uppercase tracking-[0.3em] text-muted-foreground mb-1">PROMETHEUS</h1>
            <h2 className="text-xl font-medium tracking-tight">ENFORCER</h2>
          </div>
          
          <form onSubmit={login} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Admin Protocol</label>
              <div className="relative">
                <Key className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full bg-muted/30 border border-muted text-sm px-10 py-2 outline-none focus:border-accent/50 transition-colors placeholder:text-muted-foreground/30 font-mono"
                  placeholder="MASTER PASSWORD"
                  autoFocus
                />
              </div>
            </div>
            {error && <div className="text-red-500 text-xs font-mono">{error}</div>}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-white text-black font-medium text-xs font-mono uppercase tracking-widest py-3 hover:bg-accent hover:text-black transition-colors"
            >
              {loading ? 'Authenticating...' : 'Unlock Console'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col md:flex-row font-sans">
      {/* Sidebar */}
      <aside className="w-full md:w-64 border-r border-muted bg-black/40 flex flex-col shrink-0">
        <div className="p-6 border-b border-muted flex items-center gap-3">
          <Shield className="w-5 h-5 text-accent" />
          <div className="flex flex-col">
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Prometheus</span>
            <span className="font-medium text-sm tracking-tight">IT ENFORCER</span>
          </div>
        </div>
        <nav className="p-4 space-y-2 flex-1">
          <button
            onClick={() => setActiveTab('network')}
            className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors ${
              activeTab === 'network' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
            }`}
          >
            <Server className="w-4 h-4" />
            Network Enforcement
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors ${
              activeTab === 'audit' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
            }`}
          >
            <ShieldAlert className="w-4 h-4" />
            Security Audit Logs
          </button>
        </nav>
        <div className="p-4 border-t border-muted">
          <button 
            onClick={() => setToken('')}
            className="flex items-center gap-2 text-xs font-mono text-muted-foreground hover:text-red-400 transition-colors"
          >
            <Lock className="w-3 h-3" />
            Lock Console
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 lg:p-10 max-h-screen overflow-y-auto">
        <div className="max-w-4xl mx-auto">
          {activeTab === 'network' && (
            <div className="animate-in fade-in duration-500">
              <header className="mb-8">
                <h1 className="text-2xl font-medium tracking-tight mb-2">Network Enforcement</h1>
                <p className="text-sm text-muted-foreground">Manage the global blocklist. Changes sync instantly to the OS hosts file across all deployed nodes.</p>
              </header>

              <div className="border border-muted bg-black/20 p-6 mb-8">
                <form onSubmit={addDomain} className="flex gap-4">
                  <div className="flex-1">
                    <input
                      type="text"
                      value={newDomain}
                      onChange={e => setNewDomain(e.target.value)}
                      placeholder="e.g. reddit.com"
                      className="w-full bg-background border border-muted px-4 py-2 text-sm outline-none focus:border-accent/50 font-mono"
                    />
                  </div>
                  <button type="submit" className="bg-white text-black px-6 py-2 text-xs font-mono uppercase font-medium hover:bg-accent hover:text-black transition-colors shrink-0">
                    Enforce Rule
                  </button>
                </form>
              </div>

              <div className="border border-muted bg-black/40">
                <div className="grid grid-cols-12 gap-4 px-6 py-3 border-b border-muted bg-muted/20 text-xs font-mono text-muted-foreground uppercase tracking-wider">
                  <div className="col-span-1">Status</div>
                  <div className="col-span-9">Target Domain</div>
                  <div className="col-span-2 text-right">Actions</div>
                </div>
                <div className="divide-y divide-muted">
                  {config?.blocked_domains.length === 0 && (
                    <div className="px-6 py-8 text-center text-sm text-muted-foreground">No active enforcement rules.</div>
                  )}
                  {config?.blocked_domains.map(domain => (
                    <div key={domain} className="grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-muted/10 transition-colors">
                      <div className="col-span-1 flex items-center justify-center">
                        <div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]" />
                      </div>
                      <div className="col-span-9 font-mono text-sm">
                        {domain}
                      </div>
                      <div className="col-span-2 text-right">
                        <button 
                          onClick={() => removeDomain(domain)}
                          className="text-xs text-muted-foreground hover:text-red-400 font-mono"
                        >
                          [REVOKE]
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'audit' && (
            <div className="animate-in fade-in duration-500">
              <header className="mb-8">
                <h1 className="text-2xl font-medium tracking-tight mb-2">Security Audit Logs</h1>
                <p className="text-sm text-muted-foreground">Exposed keys, environmental secrets, and database dumps detected across endpoints.</p>
              </header>

              <div className="border border-muted bg-black/40">
                <div className="grid grid-cols-12 gap-4 px-6 py-3 border-b border-muted bg-muted/20 text-xs font-mono text-muted-foreground uppercase tracking-wider">
                  <div className="col-span-2">Severity</div>
                  <div className="col-span-3">Leak Type</div>
                  <div className="col-span-7">Absolute Path</div>
                </div>
                <div className="divide-y divide-muted">
                  {(!config?.security_logs || config.security_logs.length === 0) && (
                    <div className="px-6 py-12 text-center flex flex-col items-center">
                      <Terminal className="w-8 h-8 text-muted-foreground/30 mb-3" />
                      <span className="text-sm text-muted-foreground">No security leaks detected on this endpoint.</span>
                    </div>
                  )}
                  {config?.security_logs?.map((log, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-muted/10 transition-colors">
                      <div className="col-span-2 flex items-center gap-2">
                        <ShieldAlert className="w-4 h-4 text-red-500" />
                        <span className="text-xs uppercase tracking-widest text-red-500 font-medium">CRITICAL</span>
                      </div>
                      <div className="col-span-3 text-sm text-foreground">
                        {log.type}
                      </div>
                      <div className="col-span-7 font-mono text-xs text-muted-foreground truncate" title={log.path}>
                        {log.path}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
