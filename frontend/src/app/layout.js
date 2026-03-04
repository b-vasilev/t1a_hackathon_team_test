import './globals.css';

export const metadata = {
  title: 'PolicyLens — Know what you\'re agreeing to',
  description: 'Analyze the privacy policies of online services and get your digital risk profile.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-950 text-slate-100 antialiased">
        {children}
      </body>
    </html>
  );
}
