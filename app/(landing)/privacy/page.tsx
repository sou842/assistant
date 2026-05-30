import type { Metadata } from 'next'

import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import BackgroundGrid from '@/components/BackgroundGrid';
import { OG_IMAGE_URL, SITE_NAME } from '@/lib/seo'

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description:
    'Read how Jarvis collects, uses, and protects your data.',
  alternates: {
    canonical: '/privacy',
  },
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    title: 'Privacy Policy | Jarvis',
    description: 'Read how Jarvis collects, uses, and protects your data.',
    url: '/privacy',
    images: [
      {
        url: OG_IMAGE_URL,
        width: 1200,
        height: 630,
        alt: `${SITE_NAME} preview image`,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Privacy Policy | Jarvis',
    description: 'Read how Jarvis collects, uses, and protects your data.',
    images: [OG_IMAGE_URL],
  },
}

export default function PrivacyPolicy() {
  return (
    <main className="app-page-shell">
      <Navbar />
      <BackgroundGrid />

      <div className="relative z-10 pt-32 pb-24 min-h-screen">
        <div className="w-full max-w-4xl mx-auto px-4 md:px-8">
          <div className="mb-12">
            <h1 className="text-4xl md:text-5xl font-medium tracking-tight text-app-text-primary mb-4">
              Privacy Policy
            </h1>
            <p className="text-app-text-secondary">Last Updated: October 2023</p>
          </div>

          <div className="prose prose-invert max-w-none text-app-text-secondary">
            <p className="lead text-lg mb-8 text-app-text-primary">
              At Jarvis AI ("we," "our," or "us"), we are committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website or use our Software-as-a-Service (SaaS) platform.
            </p>

            <section className="mb-10">
              <h2 className="text-2xl font-medium text-app-text-primary mb-4">1. Information We Collect</h2>
              <p className="mb-4">We collect information that you provide directly to us, as well as data gathered automatically when you use our services.</p>

              <h3 className="text-xl font-medium text-app-text-primary mb-3 mt-6">Personal Information</h3>
              <p className="mb-4">We may collect personal information such as your name, email address, phone number, and billing information when you register for an account, subscribe to our newsletter, or contact our support team.</p>

              <h3 className="text-xl font-medium text-app-text-primary mb-3 mt-6">Usage Data</h3>
              <p className="mb-4">We automatically collect data on how you interact with our platform, including features used, time spent on pages, and clickstream data, to help us improve our services.</p>

              <h3 className="text-xl font-medium text-app-text-primary mb-3 mt-6">Technical Data</h3>
              <p className="mb-4">This includes your IP address, browser type, operating system, and device identifiers collected through server logs and tracking technologies.</p>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-medium text-app-text-primary mb-4">2. How We Use Your Information</h2>
              <ul className="list-disc pl-6 space-y-2 mb-4">
                <li><strong>To Provide Services:</strong> Manage your account, process payments, and deliver the core functionality of Jarvis AI.</li>
                <li><strong>To Improve the Product:</strong> Analyze usage trends to optimize performance and develop new features.</li>
                <li><strong>For Security:</strong> Detect and prevent fraudulent activities, unauthorized access, and other security incidents.</li>
                <li><strong>For Communication:</strong> Send administrative updates, technical notices, and promotional materials (which you can opt out of at any time).</li>
              </ul>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-medium text-app-text-primary mb-4">3. Data Sharing and Disclosure</h2>
              <p className="mb-4">We do not sell your personal data. We may share your information with:</p>
              <ul className="list-disc pl-6 space-y-2 mb-4">
                <li><strong>Service Providers:</strong> Third-party vendors (like Stripe for payments or AWS for hosting) who assist us in operating our platform.</li>
                <li><strong>Legal Requirements:</strong> Authorities if required by law or in response to valid legal requests (e.g., subpoenas).</li>
                <li><strong>Business Transfers:</strong> In connection with a merger, acquisition, or sale of assets.</li>
              </ul>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-medium text-app-text-primary mb-4">4. Data Retention and Security</h2>
              <p className="mb-4">We retain your data for as long as your account is active or as needed to provide you services and comply with legal obligations. We implement industry-standard technical and organizational measures (such as encryption at rest and in transit) to protect your data against accidental or unlawful destruction, loss, or alteration.</p>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-medium text-app-text-primary mb-4">5. Your Privacy Rights</h2>
              <p className="mb-4">Depending on your jurisdiction (such as under the GDPR or CCPA), you may have the following rights:</p>
              <ul className="list-disc pl-6 space-y-2 mb-4">
                <li><strong>Access:</strong> Request a copy of the personal data we hold about you.</li>
                <li><strong>Rectification:</strong> Request correction of inaccurate or incomplete data.</li>
                <li><strong>Erasure:</strong> Request the deletion of your personal data ("Right to be forgotten").</li>
                <li><strong>Opt-Out:</strong> Object to the processing of your data for marketing purposes.</li>
              </ul>
              <p className="mt-4">To exercise these rights, please contact us at the email address provided below.</p>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-medium text-app-text-primary mb-4">6. Cookies and Tracking</h2>
              <p className="mb-4">We use cookies and similar tracking technologies to track activity on our platform and hold certain information. You can instruct your browser to refuse all cookies or to indicate when a cookie is being sent.</p>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-medium text-app-text-primary mb-4">7. Changes to This Policy</h2>
              <p className="mb-4">We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last Updated" date.</p>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-medium text-app-text-primary mb-4">8. Contact Us</h2>
              <p className="mb-4">If you have any questions or concerns about this Privacy Policy, please contact us at:</p>
            </section>
          </div>
        </div>
      </div>

      <Footer />
    </main>
  );
}
