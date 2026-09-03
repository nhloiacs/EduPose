import { logoEdupose } from '../../imports';

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
            <span>EduPose</span>
          </div>

          <h1>Masuk ke dashboard pemantauan kelas</h1>
          <h4>
            Login untuk mengakses dashboard EduPose!
          </h4>

        </section>

        <section className="auth-card">
          <div className="auth-card-header auth-card-header--stacked">
            <img className="auth-card-logo" src={logoEdupose} alt="EduPose" />
            <h2>Login</h2>
            <p>{statusMessage || 'Masukkan akun Anda untuk melanjutkan.'}</p>
          </div>

          <form className="auth-form" onSubmit={onSubmit}>
            <label className="auth-field">
              <span>Email Login</span>
              <input
                type="email"
                placeholder="bambang@school.com"
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
