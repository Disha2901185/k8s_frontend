import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff } from 'lucide-react';
import loginBg from '../../../assets/login_bg.png';
import opsedgelogo from '../../../assets/opsedge-globe-with-text.svg';

const ParticleField = ({ variant = 'dark' }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');

    if (!canvas || !context) return undefined;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let animationFrameId;
    let particles = [];
    let width = 0;
    let height = 0;

    const resize = () => {
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();

      width = rect.width;
      height = rect.height;
      canvas.width = Math.floor(width * pixelRatio);
      canvas.height = Math.floor(height * pixelRatio);
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

      const particleCount = Math.min(135, Math.max(70, Math.floor((width * height) / 11500)));
      particles = Array.from({ length: particleCount }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: Math.random() * 2.3 + 1,
        vx: (Math.random() - 0.5) * 0.38,
        vy: (Math.random() - 0.5) * 0.38,
        alpha: Math.random() * 0.35 + 0.48,
      }));
    };

    const draw = () => {
      context.clearRect(0, 0, width, height);
      const dotColor = variant === 'light' ? '14, 116, 144' : '255, 255, 255';
      const accentColor = variant === 'light' ? '37, 99, 235' : '56, 189, 248';
      const connectionDistance = variant === 'light' ? 104 : 142;

      particles.forEach((particle, index) => {
        particle.x += particle.vx;
        particle.y += particle.vy;

        if (particle.x < -8) particle.x = width + 8;
        if (particle.x > width + 8) particle.x = -8;
        if (particle.y < -8) particle.y = height + 8;
        if (particle.y > height + 8) particle.y = -8;

        context.beginPath();
        context.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
        context.fillStyle = `rgba(${dotColor}, ${particle.alpha})`;
        context.fill();

        context.beginPath();
        context.arc(particle.x, particle.y, particle.radius + 3, 0, Math.PI * 2);
        context.fillStyle = `rgba(${accentColor}, ${particle.alpha * 0.16})`;
        context.fill();

        for (let nextIndex = index + 1; nextIndex < particles.length; nextIndex += 1) {
          const nextParticle = particles[nextIndex];
          const distanceX = particle.x - nextParticle.x;
          const distanceY = particle.y - nextParticle.y;
          const distance = Math.hypot(distanceX, distanceY);

          if (distance < connectionDistance) {
            context.beginPath();
            context.moveTo(particle.x, particle.y);
            context.lineTo(nextParticle.x, nextParticle.y);
            context.strokeStyle = `rgba(${accentColor}, ${0.42 * (1 - distance / connectionDistance)})`;
            context.lineWidth = 1.15;
            context.stroke();
          }
        }
      });

      if (!reducedMotion.matches) {
        animationFrameId = window.requestAnimationFrame(draw);
      }
    };

    resize();
    draw();
    window.addEventListener('resize', resize);

    return () => {
      window.removeEventListener('resize', resize);
      window.cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return <canvas ref={canvasRef} aria-hidden="true" className="absolute inset-0 h-full w-full" />;
};

export const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const { login, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isAddAccountFlow = Boolean(location.state?.addAccount);
  const from = location.state?.from?.pathname || '/';

  useEffect(() => {
    if (user && !isAddAccountFlow) {
      navigate(from, { replace: true });
    }
  }, [user, from, navigate, isAddAccountFlow]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    if (!email || !password) {
      setError('Please enter both email and password');
      setIsSubmitting(false);
      return;
    }

    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      const errorData = err.response?.data || err.data;
      const errorMessage = typeof errorData?.message === 'string'
        ? errorData.message
        : Array.isArray(errorData?.message)
          ? errorData.message.join(', ')
          : err?.message || 'Invalid credentials. Please check your details and try again.';

      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full p-4 lg:p-6 bg-white dark:bg-white text-slate-900">
      <div className="hidden lg:relative lg:flex lg:w-1/2 flex-col rounded-[40px] overflow-hidden">
        <div className="absolute inset-0 bg-slate-100">
          <img src={loginBg} alt="Cityscape" className="h-full w-full object-cover" loading="lazy" decoding="async" />
        </div>
        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(2,6,23,0.68),rgba(15,23,42,0.36)_42%,rgba(14,165,233,0.18))]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_32%_28%,rgba(14,165,233,0.24),transparent_26%),radial-gradient(circle_at_78%_72%,rgba(255,255,255,0.13),transparent_22%)]" />
        <div className="absolute inset-0 opacity-100 mix-blend-screen">
          <ParticleField />
        </div>
        <div className="relative z-10 p-8 pt-10 pl-10">
          <img src={opsedgelogo} alt="OpsEdge Logo" className="h-8 md:h-9 w-auto brightness-0 invert" loading="lazy" decoding="async" />
        </div>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center overflow-hidden p-8 lg:p-16 xl:p-24 bg-white relative">
        <div className="pointer-events-none absolute inset-0 lg:hidden bg-[radial-gradient(circle_at_50%_0%,rgba(14,165,233,0.14),transparent_36%),linear-gradient(180deg,rgba(248,250,252,1),rgba(255,255,255,1))]" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-56 lg:hidden opacity-45">
          <ParticleField variant="light" />
        </div>

        <div className="lg:hidden absolute top-12 left-0 right-0 flex justify-center z-10">
          <img src={opsedgelogo} alt="OpsEdge Logo" className="h-10 w-auto" loading="lazy" decoding="async" />
        </div>

        <div className="relative z-10 w-full max-w-[440px] space-y-6">
          <div className="space-y-3">
            <h1 className="text-[32px] font-semibold tracking-tight text-slate-900">
              {isAddAccountFlow ? 'Add Another Account' : 'Welcome Back!'}
            </h1>
            <p className="text-slate-500 text-[15px]">
              {isAddAccountFlow ? 'Sign in to add this account to your profile switcher' : 'Secure login to your ERP unified workspace'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-3.5 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm animate-in shake duration-300">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium text-slate-900 ml-1">Email address</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="flex w-full h-12 px-4 rounded-xl text-sm border focus-visible:outline-none focus-visible:ring-2 transition-colors !bg-slate-50 !text-slate-900 !border-slate-200 !placeholder-slate-400 focus-visible:!ring-black focus-visible:!bg-slate-50 selection:!bg-blue-600 selection:!text-white"
                  disabled={isSubmitting}
                  autoComplete="email"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between ml-1">
                  <label htmlFor="password" className="text-sm font-medium text-slate-900">Password</label>
                  <button type="button" className="text-sm font-semibold text-black hover:text-black transition-colors">Forgot Password?</button>
                </div>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password"
                    className="flex w-full h-12 px-4 pr-11 rounded-xl text-sm border focus-visible:outline-none focus-visible:ring-2 transition-colors !bg-slate-50 !text-slate-900 !border-slate-200 !placeholder-slate-400 focus-visible:!ring-black focus-visible:!bg-slate-50 selection:!bg-blue-600 selection:!text-white"
                    disabled={isSubmitting}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 rounded-md transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 ml-1">
              <input
                id="remember"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                disabled={isSubmitting}
                className="w-4 h-4 rounded border-slate-300 text-black focus:ring-black cursor-pointer"
              />
              <label htmlFor="remember" className="text-sm text-slate-500 font-normal cursor-pointer select-none">Remember Me</label>
            </div>

            <button
              type="submit"
              className="w-full h-12 text-base font-medium rounded-xl text-white shadow-lg transition-all duration-300 border-0 flex items-center justify-center !bg-black hover:!bg-black !text-white !shadow-black/20 hover:!shadow-black/30"
              disabled={isSubmitting}
            >
              {isSubmitting ? (isAddAccountFlow ? 'Adding Account...' : 'Logging In...') : (isAddAccountFlow ? 'Add Account' : 'Log In')}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
