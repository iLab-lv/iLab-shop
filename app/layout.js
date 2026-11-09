import { Geologica, IBM_Plex_Mono, Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const geologica = Geologica({
  variable: "--font-geologica",
  weight: "variable",
  subsets: ["latin", "latin-ext"],
  axes: ["CRSV", "SHRP", "slnt"],
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600"],
});

export const metadata = {
  title: "iLab Shop",
  description: "iLab Shop",
  metadataBase: new URL('https://ilab.lv'),
  openGraph: { siteName: 'iLab Shop', type: 'website' },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${inter.variable} ${geologica.variable} ${ibmPlexMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
