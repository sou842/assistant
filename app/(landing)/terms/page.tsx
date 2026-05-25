import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import BackgroundGrid from '@/components/BackgroundGrid';

export default function TermsOfService() {
  return (
    <main className="app-page-shell">
      <Navbar />
      <BackgroundGrid />

      <div className="relative z-10 pt-32 pb-24 min-h-screen">
        <div className="w-full max-w-4xl mx-auto px-4 md:px-8">
          <div className="mb-12">
            <h1 className="text-4xl md:text-5xl font-medium tracking-tight text-app-text-primary mb-4">
              Terms of Service
            </h1>
            <p className="text-app-text-secondary">Last Updated: October 2023</p>
          </div>

          <div className="prose prose-invert max-w-none text-app-text-secondary">
            <p className="lead text-lg mb-8 text-app-text-primary">
              Welcome to Jarvis AI. These Terms of Service ("Terms") govern your access to and use of the Jarvis AI website, platform, and services (collectively, the "Services"). By accessing or using our Services, you agree to be bound by these Terms.
            </p>

            <section className="mb-10">
              <h2 className="text-2xl font-medium text-app-text-primary mb-4">1. Scope of Services and License</h2>
              <p className="mb-4">Subject to your compliance with these Terms, Jarvis AI Inc. grants you a limited, non-exclusive, non-transferable, and revocable license to access and use the Services for your internal business or personal use. You may not reproduce, distribute, or create derivative works of our software without explicit permission.</p>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-medium text-app-text-primary mb-4">2. User Accounts and Responsibilities</h2>
              <p className="mb-4">To use certain features, you must register for an account. You agree to:</p>
              <ul className="list-disc pl-6 space-y-2 mb-4">
                <li>Provide accurate, current, and complete account information.</li>
                <li>Maintain the security of your password and accept responsibility for all activities that occur under your account.</li>
                <li>Notify us immediately of any unauthorized use or security breaches.</li>
              </ul>
              <p className="mb-4">We reserve the right to suspend or terminate your account if you violate these Terms.</p>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-medium text-app-text-primary mb-4">3. Subscription, Pricing, and Renewal</h2>
              <p className="mb-4">Access to certain parts of the Services requires payment of subscription fees. By selecting a paid tier, you agree to pay Jarvis AI the monthly or annual subscription fees indicated for that service.</p>
              <ul className="list-disc pl-6 space-y-2 mb-4">
                <li><strong>Billing:</strong> Fees are billed in advance on a recurring basis (monthly or annually).</li>
                <li><strong>Auto-Renewal:</strong> Subscriptions automatically renew unless canceled before the end of the current billing period.</li>
                <li><strong>Refunds:</strong> Payments are non-refundable unless otherwise required by law.</li>
              </ul>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-medium text-app-text-primary mb-4">4. Data Ownership and Security</h2>
              <p className="mb-4">You retain all rights to the data you upload or generate using our Services ("Customer Data"). You grant Jarvis AI a license to host, copy, transmit, and display Customer Data strictly as necessary to provide the Services. We implement standard security measures to protect your data, but we cannot guarantee absolute security against all threats.</p>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-medium text-app-text-primary mb-4">5. Intellectual Property Rights</h2>
              <p className="mb-4">All rights, title, and interest in and to the Services, including all intellectual property rights therein (such as software, code, designs, and trademarks), remain the exclusive property of Jarvis AI Inc. and its licensors. You are not granted any rights other than the limited access license outlined in Section 1.</p>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-medium text-app-text-primary mb-4">6. Limitation of Liability</h2>
              <p className="mb-4">To the maximum extent permitted by applicable law, in no event shall Jarvis AI Inc., its affiliates, agents, directors, or employees be liable for any indirect, punitive, incidental, special, consequential, or exemplary damages, including without limitation damages for loss of profits, goodwill, use, data, or other intangible losses, arising out of or relating to the use of, or inability to use, this Service. Our aggregate liability will not exceed the amount you paid us in the twelve (12) months preceding the claim.</p>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-medium text-app-text-primary mb-4">7. Indemnification</h2>
              <p className="mb-4">You agree to defend, indemnify, and hold harmless Jarvis AI Inc. from and against any claims, damages, obligations, losses, liabilities, costs, or debt, and expenses (including attorney's fees) arising from your use of and access to the Services, or your violation of any term of these Terms.</p>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-medium text-app-text-primary mb-4">8. Governing Law</h2>
              <p className="mb-4">These Terms shall be governed and construed in accordance with the laws of the State of California, without regard to its conflict of law provisions. Any legal actions must be brought in the state or federal courts located in San Francisco, California.</p>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-medium text-app-text-primary mb-4">9. Modifications</h2>
              <p className="mb-4">We reserve the right to modify or replace these Terms at any time. If a revision is material, we will try to provide at least 30 days' notice prior to any new terms taking effect. By continuing to access or use our Services after those revisions become effective, you agree to be bound by the revised terms.</p>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-medium text-app-text-primary mb-4">10. Contact Information</h2>
              <p className="mb-4">If you have any questions about these Terms, please contact us at:</p>
            </section>
          </div>
        </div>
      </div>

      <Footer />
    </main>
  );
}
