import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
const TermsPage: React.FC = () => {
  const navigate = useNavigate();
  const sections = [
    {
      title: 'Acceptance of Terms',
      content:
        'By using Lit Studios, you agree to be bound by these Terms of Service. If you do not agree, do not use the platform.',
    },
    {
      title: 'User Content & Copyright',
      content:
        'All content uploaded to Lit Studios, including but not limited to audio files, cover art, lyrics, metadata, and song tokens, must be original work or content for which you own all applicable rights, licenses, and permissions. This includes rights to any beats, samples, vocals, or other incorporated material. By uploading content, you represent and warrant that you hold all necessary rights to such content. Lit Studios does not verify the originality or copyright status of user-uploaded content.',
    },
    {
      title: 'DMCA Safe Harbor',
      content:
        'Lit Studios operates as a platform for user-generated content and claims protection under the Digital Millennium Copyright Act (DMCA) safe harbor provisions (17 U.S.C. § 512). We reserve the right to remove any content alleged to be infringing upon third-party intellectual property rights without prior notice, at our sole discretion, and to terminate the accounts of repeat infringers.',
    },
    {
      title: 'Takedown Policy',
      content:
        'If you believe your copyrighted work has been copied or made available on Lit Studios in a way that constitutes infringement, please contact us with: (1) a description of the copyrighted work, (2) the location on our platform, (3) your contact information, and (4) a good-faith statement. We will respond to valid notices within 48 hours.',
    },
    {
      title: 'Platform Liability Disclaimer',
      content:
        'Lit Studios is provided "as is" without warranties of any kind. We are not responsible for: any losses or damages arising from trading song tokens; the accuracy or completeness of content uploaded by users; any intellectual property disputes between users; or technical interruptions or downtime. Song token trading involves risk — past performance is not indicative of future results.',
    },
    {
      title: 'User Representations',
      content:
        'By using Lit Studios, you represent that you: (a) have the legal capacity to enter into these terms; (b) will not use the platform for any unlawful purpose; (c) are solely responsible for the content you upload; and (d) accept full responsibility for any copyright or IP claims arising from your content.',
    },
    {
      title: 'Indemnification',
      content:
        'You agree to indemnify, defend, and hold harmless Lit Studios, its operators, and affiliated parties from any claims, damages, losses, or expenses (including legal fees) arising from your upload of content, your violation of these terms, or your infringement of any third-party rights.',
    },
    {
      title: 'Platform Discretion',
      content:
        'Lit Studios reserves the right to remove content, suspend accounts, or terminate access at any time for any reason, including suspected copyright violations or violations of these terms.',
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
            Terms of Service
          </h1>
          <p className="text-sm" style={{ color: 'rgba(220,214,240,0.45)' }}>
            Last updated: April 6, 2026
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
              <h2
                className="text-lg font-bold mb-2"
                style={{ color: '#e0d7ff' }}
              >
                {section.title}
              </h2>
              <p
                className="text-sm leading-relaxed"
                style={{ color: 'rgba(220,214,240,0.6)' }}
              >
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
            style={{
              color: 'rgba(220,214,240,0.5)',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            <ArrowLeft size={14} />
            Back
          </button>
        </div>
      </div>
    </div>
  );
};

export default TermsPage;
