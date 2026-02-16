import Link from "next/link";
import Image from "next/image";
import { Upload, Lock, Link2 } from "lucide-react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export default async function Home() {

  const session = await getServerSession(authOptions);
  const deployLink = session ? "/dashboard" : "/login";

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-zinc-900 to-black text-white overflow-hidden">
      {/* Subtle particle background */}
      <div className="fixed inset-0 opacity-20">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,#ff6200_0%,transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,#ffb347_0%,transparent_50%)]" />
      </div>

      {/* NAVBAR SPACE - Reserve */}
      <div className="h-20" />

      {/* MAIN */}
      <main className="mx-auto max-w-6xl px-6 py-24 space-y-32 relative z-10">
        {/* HERO - Corporate Senior Grade */}
        <section className="text-center space-y-8">

          <h1 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-[-0.05em] bg-gradient-to-r from-white via-orange-100 to-orange-200 bg-clip-text text-transparent leading-tight">
            Rollback-proof<br />static site deployments
          </h1>

          <p className="mx-auto max-w-3xl text-xl md:text-2xl text-zinc-300 leading-relaxed font-medium">
            Upload a ZIP. Bob freezes it <span className="text-orange-400 font-semibold">forever</span>. 
            No overwrites. No broken production.
          </p>

          <div className="flex items-center justify-center gap-8 pt-12">
            {/* ✅ UPDATED: Deploy button now goes to /deploy if logged in, /login if not */}
            <Link
              href={deployLink}  // ✅ CHANGED: Uses dynamic link
              className="group relative px-8 py-4 text-lg font-semibold bg-gradient-to-r from-orange-500/90 via-orange-600/95 to-orange-700/90 text-white rounded-2xl shadow-xl hover:shadow-2xl hover:shadow-orange-500/60 border border-orange-500/40 hover:border-orange-600/60 backdrop-blur-sm transition-all duration-400 hover:-translate-y-1 hover:scale-[1.02] inline-flex items-center gap-3 overflow-hidden"
            >
              <span className="relative z-10 tracking-wide">Deploy a site</span>
              <span className="w-3 h-3 bg-white/40 rounded-full group-hover:animate-ping shadow-md" />
              <div className="absolute inset-0 bg-gradient-to-r from-orange-400/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            </Link>

            <div className="flex justify-center">
              <div className="w-px h-24 bg-gradient-to-b from-zinc-600/50 to-transparent" />
            </div>

            <Link
              href="/docs"
              className="group px-8 py-4 text-lg font-semibold border-2 border-zinc-700/70 hover:border-orange-500/80 bg-zinc-900/60 hover:bg-zinc-800/70 backdrop-blur-xl hover:backdrop-blur-2xl rounded-2xl shadow-lg hover:shadow-xl hover:shadow-orange-400/30 transition-all duration-400 hover:-translate-y-1 hover:scale-[1.02] inline-flex items-center gap-3"
            >
              <span className="relative tracking-wide">View docs</span>
              <div className="w-2.5 h-2.5 bg-gradient-to-r from-orange-400 to-orange-500 rounded-full shadow-lg group-hover:scale-110 transition-transform duration-300 glow" />
            </Link>
          </div>


        </section>

        {/* HOW IT WORKS - Glassmorphism Cards */}
        <section className="grid md:grid-cols-3 gap-8">
          <div className="card backdrop-blur-xl bg-black/20 border border-zinc-800/50 hover:border-orange-500/40 hover:bg-black/30 transition-all duration-500 group hover:shadow-2xl hover:shadow-orange-500/20 rounded-3xl p-10">
            <Upload className="w-16 h-16 text-orange-400 mb-6 group-hover:scale-110 transition-transform duration-300 glow" />
            <h3 className="text-2xl font-black mb-4 bg-gradient-to-r from-white to-zinc-200 bg-clip-text text-transparent group-hover:from-orange-400">
              Upload ZIP
            </h3>
            <p className="text-zinc-400 leading-relaxed">
              Pure HTML, CSS, JS. No builds. No frameworks. Just your static site.
            </p>
          </div>

          <div className="card backdrop-blur-xl bg-black/20 border border-zinc-800/50 hover:border-orange-500/40 hover:bg-black/30 transition-all duration-500 group hover:shadow-2xl hover:shadow-orange-500/20 rounded-3xl p-10">
            <Lock className="w-16 h-16 text-orange-400 mb-6 group-hover:scale-110 transition-transform duration-300 glow" />
            <h3 className="text-2xl font-black mb-4 bg-gradient-to-r from-white to-zinc-200 bg-clip-text text-transparent group-hover:from-orange-400">
              Immutable Artifact
            </h3>
            <p className="text-zinc-400 leading-relaxed">
              SHA256 hashed. Content-addressed. Stored permanently. Never modified.
            </p>
          </div>

          <div className="card backdrop-blur-xl bg-black/20 border border-zinc-800/50 hover:border-orange-500/40 hover:bg-black/30 transition-all duration-500 group hover:shadow-2xl hover:shadow-orange-500/20 rounded-3xl p-10">
            <Link2 className="w-16 h-16 text-orange-400 mb-6 group-hover:scale-110 transition-transform duration-300 glow" />
            <h3 className="text-2xl font-black mb-4 bg-gradient-to-r from-white to-zinc-200 bg-clip-text text-transparent group-hover:from-orange-400">
              Permanent URL
            </h3>
            <p className="text-zinc-400 leading-relaxed">
              Every version gets its own stable, CDN-ready URL. Forever.
            </p>
          </div>
        </section>

        {/* WHY BOB - Statement Card */}
        <section className="card backdrop-blur-xl bg-gradient-to-b from-black/30 to-zinc-950/40 border border-orange-500/20 max-w-5xl mx-auto shadow-2xl glow-lg p-12 rounded-3xl">
          <div className="absolute inset-0 bg-gradient-to-r from-orange-500/5 to-orange-600/5 rounded-3xl -m-1 glow" />
          <div className="relative z-10 text-center">
            <h2 className="text-4xl lg:text-5xl font-black mb-8 bg-gradient-to-r from-orange-400 via-orange-200 to-white bg-clip-text text-transparent leading-tight">
              Why Bob never overwrites files
            </h2>
            <p className="text-xl md:text-2xl text-zinc-300 leading-relaxed max-w-4xl mx-auto">
              Mutable deployments cause broken rollouts, cache bugs, and trust issues.{" "}
              <span className="font-bold text-white">Bob treats every site version as permanent infrastructure.</span>
            </p>
          </div>
        </section>

        {/* WHAT IT IS / IS NOT - Split Cards */}
        <section className="grid lg:grid-cols-2 gap-8">
          <div className="card backdrop-blur-xl bg-black/20 border border-zinc-800/50 hover:border-orange-500/40 hover:shadow-2xl hover:shadow-orange-500/20 p-10 rounded-3xl group hover:bg-black/30 transition-all duration-500">
            <h3 className="text-3xl font-black mb-8 bg-gradient-to-r from-white to-zinc-200 bg-clip-text text-transparent">
              Bob <span className="text-orange-400">IS</span>
            </h3>
            <ul className="space-y-4 text-lg text-zinc-300">
              <li className="flex items-center gap-4 group-hover:translate-x-4 transition-transform duration-300">
                <div className="w-3 h-3 bg-orange-500 rounded-full glow" /> Immutable static artifact publisher
              </li>
              <li className="flex items-center gap-4 group-hover:translate-x-4 transition-transform duration-300 delay-100">
                <div className="w-3 h-3 bg-orange-500 rounded-full glow" /> Deterministic & auditable
              </li>
              <li className="flex items-center gap-4 group-hover:translate-x-4 transition-transform duration-300 delay-200">
                <div className="w-3 h-3 bg-orange-500 rounded-full glow" /> Rollback-safe by design
              </li>
            </ul>
          </div>

          <div className="card backdrop-blur-xl bg-black/20 border border-zinc-800/50 hover:border-orange-500/40 hover:shadow-2xl hover:shadow-orange-500/20 p-10 rounded-3xl group hover:bg-black/30 transition-all duration-500">
            <h3 className="text-3xl font-black mb-8 bg-gradient-to-r from-white to-zinc-200 bg-clip-text text-transparent">
              Bob <span className="text-orange-400">IS NOT</span>
            </h3>
            <ul className="space-y-4 text-lg text-zinc-300">
              <li className="flex items-center gap-4 group-hover:translate-x-4 transition-transform duration-300">
                <div className="w-3 h-3 bg-zinc-500 rounded-full" /> A GitHub deployment tool
              </li>
              <li className="flex items-center gap-4 group-hover:translate-x-4 transition-transform duration-300 delay-100">
                <div className="w-3 h-3 bg-zinc-500 rounded-full" /> A build platform
              </li>
            </ul>
          </div>
        </section>

        {/* FOOTER - Corporate Clean */}
        <footer className="pt-24 pb-12 border-t border-zinc-800/50">
          <div className="flex flex-col md:flex-row justify-between items-center text-sm text-zinc-500 gap-6">
            <div className="flex items-center gap-3">
              <Image
                src="/bob-badger-logo.png"
                alt="Bob the Deployer"
                width={32}
                height={32}
                className="rounded-xl glow"
              />
              <span className="font-semibold text-white">Bob the Deployer</span>
            </div>
            <div className="flex gap-6">
              <Link href="/docs" className="hover:text-orange-400 transition-colors font-medium">Docs</Link>
              <a href="#" target="_blank" rel="noopener noreferrer" className="hover:text-orange-400 transition-colors font-medium">GitHub</a>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
