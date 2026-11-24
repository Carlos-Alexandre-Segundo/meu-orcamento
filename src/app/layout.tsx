import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "Meu orçamento | Plano morar sozinho", description: "Planeje suas despesas mensais e prepare sua mudança. Dados salvos no seu navegador." };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="pt-BR"><body>{children}</body></html>; }
