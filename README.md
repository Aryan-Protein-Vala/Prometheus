<p align="center">
  <img src="https://raw.githubusercontent.com/Aryan-Protein-Vala/Prometheus/main/prometheus-ui/public/og-image.png" alt="Prometheus" width="600"/>
</p>

<h1 align="center">Prometheus</h1>

<p align="center">
  <strong>Your OS. Surgically Clean.</strong>
</p>

<p align="center">
  The 100% offline terminal cleaner. Zero data leaves your device.
</p>

<p align="center">
  <a href="https://prometheus-cleaner.vercel.app">Website</a> •
  <a href="#installation">Install</a> •
  <a href="#features">Features</a> •
  <a href="#license">License</a>
</p>

---

## Installation

### macOS / Linux

```bash
curl -sL https://prometheus-cleaner.vercel.app/install.sh | bash
```

### Windows (PowerShell as Admin)

```powershell
irm https://prometheus-cleaner.vercel.app/install.ps1 | iex
```

After installation, run:

```bash
prometheus
```

---

## Features

- **🔒 100% Offline** — Air-gapped. No telemetry. No cloud.
- **🧹 Deep Flush** — Finds hidden cache, phantom duplicates, ad-trackers
- **💻 Cross-Platform** — macOS, Windows, Linux binaries
- **⚡ Fast** — Rust-powered TUI scans thousands of files in seconds
- **🛡️ Safe** — Nothing deleted without confirmation

---

## Project Structure

```
prometheus/
├── prometheus-tui/     # Rust TUI application
│   ├── src/            # Source code
│   └── Cargo.toml      # Rust dependencies
├── prometheus-ui/      # Next.js website
│   ├── app/            # App router
│   ├── components/     # React components
│   └── public/         # Static assets
└── .github/            # CI/CD workflows
```

---

## Development

### TUI (Rust)

```bash
cd prometheus-tui
cargo build --release
./target/release/prometheus
```

### Website (Next.js)

```bash
cd prometheus-ui
npm install
npm run dev
```

---

## License

Prometheus is **FREE**! Get your license key at [prometheus-cleaner.vercel.app](https://prometheus-cleaner.vercel.app)

---

## Support

If you find Prometheus useful, consider supporting:

- ☕ **Ko-fi:** [ko-fi.com/aryantilldusk](https://ko-fi.com/aryantilldusk)
- 🍵 **Buy Me a Coffee:** [buymeacoffee.com/aryantilldusk](https://buymeacoffee.com/aryantilldusk)

### Advertise in Prometheus

Want your ad in Prometheus TUI? Contact: **aryansharma24112003@gmail.com**

---

<p align="center">
  Built with ❤️ by <a href="https://github.com/Aryan-Protein-Vala">Aryan Sharma</a>
</p>
