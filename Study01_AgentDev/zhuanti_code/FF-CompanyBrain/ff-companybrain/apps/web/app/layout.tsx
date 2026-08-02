import type { Metadata } from "next";
import "./globals.css";
import "./site.css";
import { ThemeProvider } from "../components/theme-provider";
import { ParticleField } from "../components/particle-field";
import { AuthProvider } from "../lib/auth-context";

export const metadata: Metadata = {
  title: "赋范 · 企业知识中台",
  description:
    "把散落在文档、对话和业务系统里的企业知识，变成员工随时能问、答案带依据、管理员管得住的统一知识中台。"
};

const noFlash = `(function(){try{var t=localStorage.getItem('ff-theme');if(!t){t='light';}document.documentElement.setAttribute('data-theme',t);}catch(e){document.documentElement.setAttribute('data-theme','light');}})();`;

export default function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: noFlash }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700&family=Hanken+Grotesk:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <ThemeProvider>
          <AuthProvider>
            <ParticleField />
            <div className="grain" aria-hidden />
            <div className="app-shell">{children}</div>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
