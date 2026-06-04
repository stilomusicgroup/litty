import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const PrivacyPage: React.FC = () => {
  const navigate = useNavigate();
  const sections = [
    {
      title: 'Introduction',
      content:
        'Lit Studios ("we," "us," or "our") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our platform, including our website, mobile applications, and related services (collectively, the "Platform").',
    },
    {
      title: 'Information We Collect',
      content:
        'We collect information you provide directly to us, such as when you create an account, upload content, make purchases, or communicate with us. This may include your name, email address, wallet address, and any content you upload. We also automatically collect certain information about your device and usage of the Platform, including IP address, browser type, and operating system.',
    },
    {
      title: 'Wallet Information',
      content:
        'To interact with the Platform, you connect a Solana wallet. We collect and store your public wallet address to facilitate transactions, display your holdings, and verify ownership of tokens. We do not have access to your private keys or seed phrases. All blockchain transactions are public and permanent by design.',
    },
    {
      title: 'Cookies & Tracking',
      content:
        'We use cookies and similar tracking technologies to enhance your experience, analyze usage patterns, and improve our services. You can control cookie settings through your browser preferences. We may use third-party analytics services that employ cookies to collect aggregated data about Platform usage.',
    },
    {
      title: 'Third-Party Services',
      content:
        'We integrate with third-party services including Solana blockchain infrastructure, payment processors (such as Ramp Network), and analytics providers. These services may collect information subject to their own privacy policies. We are not responsible for the privacy practices of third-party services.',
    },
    {
      title: 'How We Use Your Information',
      content:
        'We use your information to: provide and maintain the Platform; process transactions and send related notices; verify content ownership and rights; communicate with you about updates and promotions; detect and prevent fraud and abuse; and comply with legal obligations.',
    },
    {
      title: 'Data Sharing & Disclosure',
      content:
        'We do not sell your personal information. We may share information with: service providers who perform services on our behalf; other users as necessary for Platform functionality (e.g., displaying your artist profile); law enforcement or regulatory authorities when required by law; and in connection with a merger, sale, or acquisition.',
    },
    {
      title: 'Data Security',
      content:
        'We implement reasonable security measures to protect your information. However, no method of transmission over the internet or electronic storage is 100% secure. Blockchain transactions are immutable and publicly visible — please consider this before transacting.',
    },
    {
      title: 'Your Rights',
      content:
        'Depending on your jurisdiction, you may have rights to: access, correct, or delete your personal information; object to or restrict certain processing; and receive a copy of your data in a portable format. To exercise these rights, contact us using the information below.',
    },
    {
      title: 'Children\'s Privacy',
      content:
        'The Platform is not intended for individuals under 18 years of age. We do not knowingly collect personal information from children. If we become aware that we have collected information from a child, we will take steps to delete it.',
    },
    {
      title: 'Changes to This Policy',
      content:
        'We may update this Privacy Policy from time to time. We will notify you of material changes by posting the updated policy on the Platform with a revised "Last updated" date. Your continued use of the Platform after changes constitutes acceptance of the updated policy.',
    },
    {
      title: 'Contact Us',
      content:
        'If you have questions or concerns about this Privacy Policy or our data practices, please contact us at privacy@litstudios.online or through our support channels on the Platform.',
    },
  ];

  return (
    <div className="min-h-screen" style={{ background: 'transparent' }}>
      <div className="container pt-24 pb-32 max-w-3xl">
        {/* Header */}
        <div className="mb-10">
          <h1
            className="text-4xl font-black mb-2"
            style={{
              background: 'linear-gradient(135deg, #e0d7ff, #a78bfa, #f472b6)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Privacy Policy
          </h1>
          <p className="text-sm" style={{ color: 'rgba(220,214,240,0.45)' }}>
            Last updated: May 28, 2026
          </p>
        </div>

        {/* Content */}
        <div
          className="rounded-2xl p-8 space-y-8"
          style={{
            background: 'linear-gradient(145deg, rgba(30,20,60,0.9) 0%, rgba(15,10,30,0.95) 100%)',
            border: '1px solid rgba(139,92,246,0.2)',
          }}
        >
          {sections.map((section) => (
            <div key={section.title}>
              <h2 className="text-lg font-bold mb-2" style={{ color: '#e0d7ff' }}>
                {section.title}
              </h2>
              <p className="text-sm leading-relaxed" style={{ color: 'rgba(220,214,240,0.6)' }}>
                {section.content}
              </p>
            </div>
          ))}
        </div>

        {/* Back Link */}
        <div className="mt-8 flex justify-center">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-sm font-semibold transition-all"
            style={{ color: 'rgba(220,214,240,0.5)', background: 'transparent', border: 'none', cursor: 'pointer' }}
          >
            <ArrowLeft size={14} />
            Back
          </button>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPage;
