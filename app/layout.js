export const metadata = {
  title: "Flashire — Say it once. Get found.",
  description: "Share your CV once and get found by hiring teams. AI-powered candidate matching for Indonesia.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  );
}
