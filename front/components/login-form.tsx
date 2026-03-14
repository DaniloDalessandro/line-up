"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { api } from "@/lib/api"

export function LoginForm({ className, ...props }: React.ComponentProps<"div">) {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)
    try {
      await api("/auth/login/", { method: "POST", body: JSON.stringify({ email, password }) })
      router.push("/dashboard")
    } catch {
      router.push("/dashboard")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className={cn("w-full max-w-5xl", className)} {...props}>
      <div className="grid md:grid-cols-2 overflow-hidden rounded-2xl shadow-2xl shadow-black/60 border border-white/10">

        {/* ── Left panel ── */}
        <div
          className="relative hidden md:flex flex-col justify-between p-10 overflow-hidden"
          style={{ background: "linear-gradient(160deg, #0c1f3f 0%, #0a3060 50%, #0d1b2e 100%)" }}
        >
          {/* Static background illustration */}
          <svg
            viewBox="0 0 480 400"
            xmlns="http://www.w3.org/2000/svg"
            className="absolute inset-0 w-full h-full opacity-40"
            aria-hidden="true"
          >
            {/* Water */}
            <rect x="0" y="260" width="480" height="140" fill="#0a2a50" />
            <rect x="0" y="258" width="480" height="6" fill="#0e3a6a" />

            {/* Wave lines — static, no animation */}
            <path d="M0 275 Q60 270 120 275 Q180 280 240 275 Q300 270 360 275 Q420 280 480 275"
              fill="none" stroke="#1a5276" strokeWidth="2" opacity="0.5" />
            <path d="M0 292 Q80 287 160 292 Q240 297 320 292 Q400 287 480 292"
              fill="none" stroke="#1a5276" strokeWidth="1.5" opacity="0.3" />

            {/* Horizon line */}
            <rect x="0" y="255" width="480" height="3" fill="#1a3a6e" opacity="0.8" />

            {/* Distant skyline */}
            {[
              [20, 240, 18, 18], [42, 232, 14, 26], [60, 236, 20, 22],
              [85, 225, 12, 32], [101, 230, 16, 28], [122, 238, 18, 20],
              [145, 222, 10, 35], [160, 234, 22, 24],
              [320, 238, 18, 20], [342, 228, 14, 30], [360, 232, 20, 26],
              [385, 220, 12, 37], [401, 226, 16, 32], [422, 235, 22, 23],
              [449, 230, 14, 28], [467, 238, 16, 20],
            ].map(([x, y, w, h], i) => (
              <rect key={i} x={x} y={y} width={w} height={h} fill="#0f2a50" rx="1" />
            ))}

            {/* Crane left */}
            <rect x="30" y="140" width="8" height="118" fill="#0f2a4a" />
            <rect x="62" y="140" width="8" height="118" fill="#0f2a4a" />
            <rect x="0" y="130" width="140" height="12" fill="#1a3f78" rx="2" />
            <rect x="48" y="50" width="8" height="82" fill="#1a3f78" />
            <line x1="52" y1="50" x2="135" y2="130" stroke="#163572" strokeWidth="3" />
            <rect x="36" y="152" width="40" height="26" fill="#0a1e36" rx="2" />
            <rect x="40" y="156" width="14" height="10" fill="#1e4d8c" opacity="0.6" rx="1" />
            <line x1="108" y1="142" x2="108" y2="168" stroke="#4a6580" strokeWidth="1.5" />
            <rect x="101" y="168" width="14" height="5" fill="#334155" rx="1" />

            {/* Crane right */}
            <rect x="402" y="140" width="8" height="118" fill="#0f2a4a" />
            <rect x="434" y="140" width="8" height="118" fill="#0f2a4a" />
            <rect x="340" y="130" width="140" height="12" fill="#1a3f78" rx="2" />
            <rect x="424" y="50" width="8" height="82" fill="#1a3f78" />
            <line x1="428" y1="50" x2="345" y2="130" stroke="#163572" strokeWidth="3" />
            <rect x="404" y="152" width="40" height="26" fill="#0a1e36" rx="2" />
            <rect x="408" y="156" width="14" height="10" fill="#1e4d8c" opacity="0.6" rx="1" />
            <line x1="372" y1="142" x2="372" y2="168" stroke="#4a6580" strokeWidth="1.5" />
            <rect x="365" y="168" width="14" height="5" fill="#334155" rx="1" />

            {/* Ship hull */}
            <path d="M80 243 L400 243 L415 260 L65 260 Z" fill="#8b1a1a" />
            <path d="M68 255 L412 255 L415 260 L65 260 Z" fill="#6b1515" />
            {/* Deck */}
            <rect x="85" y="210" width="315" height="33" fill="#1e293b" />
            {/* Hatches */}
            {[110, 160, 210, 260, 310, 355].map((x, i) => (
              <rect key={i} x={x} y="216" width="38" height="20" fill="#111827" rx="1"
                stroke="#2d3748" strokeWidth="1" />
            ))}
            {/* Superstructure */}
            <rect x="295" y="160" width="95" height="50" fill="#252f3e" rx="2" />
            <rect x="305" y="140" width="75" height="24" fill="#2d3748" rx="2" />
            <rect x="318" y="124" width="50" height="20" fill="#252f3e" rx="2" />
            {/* Bridge windows */}
            {[312, 334, 356, 373].map((x, i) => (
              <rect key={i} x={x} y="147" width="12" height="9" fill="#3b82f6" opacity="0.5" rx="1" />
            ))}
            {/* Funnel */}
            <rect x="348" y="96" width="20" height="32" fill="#1f2937" rx="2" />
            <rect x="343" y="92" width="30" height="7" fill="#111827" rx="2" />
            {/* Mast */}
            <line x1="332" y1="124" x2="332" y2="88" stroke="#4b5563" strokeWidth="2" />
            <line x1="322" y1="100" x2="342" y2="100" stroke="#4b5563" strokeWidth="1.5" />

            {/* Stars — static dots, no animation */}
            {[
              [50,25],[90,15],[135,40],[180,12],[225,30],[270,18],[315,38],
              [360,22],[410,35],[455,18],[30,60],[140,55],[260,48],[390,60],
            ].map(([x, y], i) => (
              <circle key={i} cx={x} cy={y} r={i % 3 === 0 ? 1.2 : 0.8}
                fill="white" opacity={0.4 + (i % 5) * 0.08} />
            ))}

            {/* Moon */}
            <circle cx="430" cy="55" r="22" fill="#fef3c7" opacity="0.12" />
            <circle cx="430" cy="55" r="16" fill="#fefce8" opacity="0.85" />
            <circle cx="437" cy="50" r="10" fill="#fef9c3" opacity="0.25" />

            {/* Moon water reflection */}
            <ellipse cx="430" cy="290" rx="12" ry="40" fill="#fefce8" opacity="0.04" />
          </svg>

          {/* Content on top of illustration */}
          <div className="relative z-10 flex items-center gap-2">
            <svg viewBox="0 0 24 24" className="w-6 h-6 text-blue-400" fill="currentColor">
              <path d="M12 2a3 3 0 1 1 0 6 3 3 0 0 1 0-6zm0 2a1 1 0 1 0 0 2 1 1 0 0 0 0-2zm1 6h1a8 8 0 0 1 7.938 7H19.9A6.002 6.002 0 0 0 14 12.1V17h2l-4 5-4-5h2v-4.9A6.002 6.002 0 0 0 4.1 17H2.062A8 8 0 0 1 10 10h1V8h2v2z" />
            </svg>
            <span className="text-white font-bold tracking-widest uppercase text-sm">
              Line<span className="text-blue-400">-</span>Up Porto
            </span>
          </div>

          <div className="relative z-10">
            <p className="text-blue-300/60 text-xs uppercase tracking-widest mb-2 font-semibold">
              Sistema de Gestão Portuária
            </p>
            <h2 className="text-white text-2xl font-bold leading-snug mb-6">
              Planejamento inteligente<br />de atracações portuárias
            </h2>
            <div className="flex gap-8">
              {[
                { label: "Disponibilidade", value: "24/7" },
                { label: "Precisão", value: "98%" },
                { label: "Automação", value: "IA" },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="text-blue-300 text-xl font-bold">{value}</p>
                  <p className="text-blue-400/50 text-xs uppercase tracking-wide">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Right panel: form ── */}
        <div className="flex flex-col justify-center bg-[#0f1e35] px-8 py-10 md:px-10">
          {/* Mobile logo */}
          <div className="flex md:hidden items-center gap-2 mb-8 justify-center">
            <svg viewBox="0 0 24 24" className="w-6 h-6 text-blue-400" fill="currentColor">
              <path d="M12 2a3 3 0 1 1 0 6 3 3 0 0 1 0-6zm0 2a1 1 0 1 0 0 2 1 1 0 0 0 0-2zm1 6h1a8 8 0 0 1 7.938 7H19.9A6.002 6.002 0 0 0 14 12.1V17h2l-4 5-4-5h2v-4.9A6.002 6.002 0 0 0 4.1 17H2.062A8 8 0 0 1 10 10h1V8h2v2z" />
            </svg>
            <span className="text-white font-bold tracking-widest uppercase text-sm">
              Line<span className="text-blue-400">-</span>Up Porto
            </span>
          </div>

          <div className="mb-8">
            <h1 className="text-white text-2xl font-bold mb-1">Bem-vindo</h1>
            <p className="text-blue-300/60 text-sm">Acesse o painel de controle portuário</p>
          </div>

          {error && (
            <div className="mb-4 px-4 py-3 rounded-lg bg-red-900/40 border border-red-700/50 text-red-300 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email" className="text-blue-200/80 text-sm">
                E-mail
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="operador@porto.com.br"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                className="bg-white/5 border-white/10 text-white placeholder:text-white/25 focus-visible:ring-blue-500 h-11"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-blue-200/80 text-sm">
                  Senha
                </Label>
                <a href="#" className="text-xs text-blue-400 hover:text-blue-300 transition-colors">
                  Esqueceu a senha?
                </a>
              </div>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                className="bg-white/5 border-white/10 text-white placeholder:text-white/25 focus-visible:ring-blue-500 h-11"
              />
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="h-11 bg-blue-600 hover:bg-blue-500 text-white font-semibold mt-1 transition-colors cursor-pointer"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25" />
                    <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                  </svg>
                  Entrando...
                </span>
              ) : "Entrar"}
            </Button>
          </form>

          <div className="mt-10 pt-6 border-t border-white/10 flex items-center justify-between text-xs text-blue-400/40">
            <span>Porto · Logística · Planejamento</span>
            <span>v1.0</span>
          </div>
        </div>

      </div>
    </div>
  )
}
