import { LogIn, ShieldCheck, UserRound, logoEdupose } from '../../imports';

export default function LoginPage({
  loginForm,
  setLoginForm,
  onSubmit,
  error,
  statusMessage,
  isLoading,
}) {
  return (
    <div className="auth-page">
      <div className="auth-shell">
        <section className="auth-visual">
          <div className="auth-badge">
            <img className="auth-logo-image" src={logoEdupose} alt="EduPose logo" />
            <span>EduPose</span>
          </div>

          <h1>Masuk ke dashboard pemantauan kelas</h1>
          <p>
            Pisahkan akses login dari dashboard agar alur masuk lebih jelas, rapi, dan mudah dipahami.
          </p>

          <div className="auth-stats">
            <div className="auth-stat-card">
              <ShieldCheck size={18} />
              <div>
                <strong>Login aman</strong>
                <span>Token disimpan di browser</span>
              </div>
            </div>
            <div className="auth-stat-card">
              <UserRound size={18} />
              <div>
                <strong>Akun terhubung</strong>
                <span>Sinkron dengan sistem</span>
              </div>
            </div>
          </div>
        </section>

        <section className="auth-card">
          <div className="auth-card-header">
            <div className="auth-card-icon">
              <LogIn size={20} />
            </div>
            <div>
              <h2>Login</h2>
              <p>{statusMessage || 'Masukkan akun Anda untuk melanjutkan.'}</p>
            </div>
          </div>

          <form className="auth-form" onSubmit={onSubmit}>
            <label className="auth-field">
              <span>Email Login</span>
              <input
                type="email"
                placeholder="guru@school.com"
                value={loginForm.email}
                onChange={(event) => setLoginForm((previousForm) => ({ ...previousForm, email: event.target.value }))}
              />
            </label>

            <label className="auth-field">
              <span>Password</span>
              <input
                type="password"
                placeholder="password123"
                value={loginForm.password}
                onChange={(event) => setLoginForm((previousForm) => ({ ...previousForm, password: event.target.value }))}
              />
            </label>

            {error ? <div className="auth-error">{error}</div> : null}

            <button type="submit" className="auth-submit" disabled={isLoading}>
              {isLoading ? 'Memproses...' : 'Login'}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
