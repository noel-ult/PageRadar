import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import localFont from "next/font/local";
const body = localFont({
  src: "./fonts/SourceSans3.ttf",
  variable: "--font-body",
  display: "swap",
  weight: "200 900",
});
const heading = localFont({
  src: "./fonts/Manrope.ttf",
  variable: "--font-heading",
  display: "swap",
  weight: "200 800",
});
// Static application code only; no source-page content or user input enters this script.
const themeScript = `(()=>{let t='system';try{t=localStorage.getItem('pageradar-theme-v1')||t}catch{}document.documentElement.dataset.theme=t==='light'||t==='dark'?t:(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light')})()`;

export const metadata: Metadata = {
  title: "PageRadar — Your personal radar for the web",
  description:
    "Monitor webpages for meaningful changes. See what changed, before vs after, importance and explanation.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`h-full ${body.variable} ${heading.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
