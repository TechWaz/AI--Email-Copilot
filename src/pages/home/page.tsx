import { Link } from "react-router-dom";

export default function Home() {
  return (
    <div className="relative min-h-screen bg-background-50 flex flex-col">
      <nav className="absolute top-0 left-0 right-0 z-50 px-6 md:px-10 py-5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link
            to="/"
            className="flex items-center gap-2 group"
          >
            <span className="text-2xl md:text-3xl font-bold text-white tracking-tight font-heading">
              Alwaz
            </span>
            <span className="w-2 h-2 rounded-full bg-primary-500 mt-1"></span>
          </Link>

          <Link
            to="/login"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-white/10 backdrop-blur-sm text-white text-sm font-medium hover:bg-white/20 transition-colors whitespace-nowrap border border-white/15"
          >
            <i className="ri-lock-unlock-line text-base"></i>
            Workspace Login
          </Link>
        </div>
      </nav>

      <div className="relative flex-1 flex flex-col items-center justify-center min-h-[700px] overflow-hidden">
        <img
          src="https://readdy.ai/api/search-image?query=Iconic%20Tower%20Bridge%20London%20at%20golden%20hour%20sunset%20with%20warm%20amber%20and%20golden%20light%20washing%20over%20the%20Thames%20river%2C%20modern%20city%20skyline%20with%20the%20Shard%20in%20the%20background%2C%20dramatic%20orange%20and%20warm%20pink%20sky%2C%20soft%20golden%20reflections%20on%20the%20water%2C%20professional%20business%20consultancy%20feel%2C%20elegant%20and%20sophisticated%20atmosphere%2C%20no%20text%20no%20people%2C%20cinematic%20wide%20angle%2C%20high%20quality%20editorial%20photography%2C%20warm%20inviting%20tones&width=1920&height=1080&seq=hero-london-golden-01&orientation=landscape"
          width={1920}
          height={1080}
          className="absolute inset-0 w-full h-full object-cover object-center"
          alt="Tower Bridge London at golden hour"
        />

        <div className="absolute inset-0 bg-gradient-to-b from-foreground-950/40 via-foreground-950/20 to-foreground-950/55"></div>

        <div className="relative z-10 text-center px-6 max-w-3xl mx-auto">
          <div className="mb-10">
            <div className="inline-flex items-center gap-2 mb-6 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-sm border border-white/15">
              <span className="w-2 h-2 rounded-full bg-primary-400 animate-pulse"></span>
              <span className="text-white/70 text-xs tracking-widest uppercase">London &middot; UK</span>
            </div>
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white tracking-tight mb-5 font-heading leading-tight drop-shadow-lg">
              Welcome Alwaz<br />London Consultants
            </h1>
            <p className="text-base md:text-lg text-white/80 max-w-xl mx-auto leading-relaxed font-light drop-shadow-md">
              Strategic business consultancy rooted in the heart of London, delivering tailored solutions for growth and success.
            </p>
          </div>

          <div className="flex items-center justify-center gap-4 flex-wrap">
            <a
              href="mailto:contact@alwaz.uk"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-white/10 backdrop-blur-sm text-white text-sm font-medium hover:bg-white/20 transition-colors whitespace-nowrap border border-white/15"
            >
              <i className="ri-mail-line text-base"></i>
              contact@alwaz.uk
            </a>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-primary-500 text-white text-sm font-medium hover:bg-primary-600 transition-colors whitespace-nowrap"
            >
              <i className="ri-lock-unlock-line text-base"></i>
              Workspace Login
            </Link>
          </div>
        </div>
      </div>

      <div className="relative bg-foreground-950 py-6 px-6 border-t border-white/5">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-foreground-400">
            <i className="ri-copyright-line text-base"></i>
            <span>2026 Alwaz London Consultants. All rights reserved.</span>
          </div>

          <div className="flex items-center gap-6 text-sm text-foreground-400">
            <a
              href="mailto:contact@alwaz.uk"
              className="hover:text-primary-400 transition-colors whitespace-nowrap flex items-center gap-1.5"
            >
              <i className="ri-mail-line text-base"></i>
              contact@alwaz.uk
            </a>
            <span className="text-foreground-600">|</span>
            <span className="whitespace-nowrap">London, United Kingdom</span>
          </div>
        </div>
      </div>
    </div>
  );
}