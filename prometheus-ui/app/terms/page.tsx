import Link from "next/link"

export default function TermsPage() {
  return (
    <main className="relative min-h-screen bg-background">
      <div className="grain-overlay" />
      
      <div className="mx-auto max-w-3xl px-6 py-20">
        <Link 
          href="/" 
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Back to Home
        </Link>
        
        <h1 className="mt-8 text-3xl font-bold tracking-tight">Terms of Service</h1>
        <p className="mt-2 text-muted-foreground">Last updated: February 4, 2026</p>
        
        <div className="mt-12 space-y-8 text-muted-foreground">
          <section>
            <h2 className="text-xl font-semibold text-foreground">1. Acceptance of Terms</h2>
            <p className="mt-3">
              By downloading, installing, or using Prometheus ("the Software"), you agree to be bound 
              by these Terms of Service. If you do not agree to these terms, do not use the Software.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">2. License</h2>
            <p className="mt-3">
              Upon purchase, you are granted a non-exclusive, non-transferable license to use Prometheus 
              on your personal devices. Each license key is valid for a single user and may not be shared, 
              resold, or distributed.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">3. Software Description</h2>
            <p className="mt-3">
              Prometheus is a system cleaning utility that helps identify and remove unnecessary files 
              from your computer. The Software operates entirely offline and does not transmit any of 
              your personal data to external servers.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">4. User Responsibilities</h2>
            <p className="mt-3">
              You are solely responsible for any files you choose to delete using Prometheus. We recommend 
              reviewing items before deletion. The Software moves files to your system's Trash/Recycle Bin 
              by default, allowing recovery if needed.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">5. Disclaimer of Warranties</h2>
            <p className="mt-3">
              THE SOFTWARE IS PROVIDED "AS IS" WITHOUT WARRANTY OF ANY KIND. WE DO NOT GUARANTEE THAT 
              THE SOFTWARE WILL BE ERROR-FREE OR UNINTERRUPTED. USE AT YOUR OWN RISK.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">6. Limitation of Liability</h2>
            <p className="mt-3">
              IN NO EVENT SHALL THE DEVELOPERS BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, OR 
              CONSEQUENTIAL DAMAGES ARISING FROM THE USE OF THE SOFTWARE, INCLUDING BUT NOT LIMITED 
              TO DATA LOSS.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">7. Updates</h2>
            <p className="mt-3">
              We may release updates to the Software from time to time. Your license includes access 
              to all updates during the license period. We reserve the right to modify these terms 
              with reasonable notice.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">8. Governing Law</h2>
            <p className="mt-3">
              These terms shall be governed by and construed in accordance with the laws of India. 
              Any disputes shall be subject to the exclusive jurisdiction of the courts in India.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">9. Contact</h2>
            <p className="mt-3">
              For questions about these Terms, please contact us at{" "}
              <a href="mailto:support@prometheus-cleaner.com" className="text-foreground underline underline-offset-4">
                support@prometheus-cleaner.com
              </a>
            </p>
          </section>
        </div>
        
        <div className="mt-16 pt-8 border-t border-border/50">
          <p className="text-sm text-muted-foreground">
            By using Prometheus, you acknowledge that you have read, understood, and agree to these Terms of Service.
          </p>
        </div>
      </div>
    </main>
  )
}
