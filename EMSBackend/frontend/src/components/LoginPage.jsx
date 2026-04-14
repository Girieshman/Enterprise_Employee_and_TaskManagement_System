function LoginPage({ form, error, loading, onChange, onSubmit }) {
  return (
    <main className="auth-shell">
      <section className="auth-hero">
        <p className="eyebrow">EMS Workspace</p>
        <h1>Sign in</h1>
        <p className="hero-text">
          Access your workspace with your username and password.
        </p>
      </section>

      <section className="auth-card">
        <div className="auth-card-head">
          <h2>Login</h2>
          <p>Enter your credentials to continue.</p>
        </div>

        <form className="login-form" onSubmit={onSubmit}>
          <label htmlFor="username">
            Username
            <input
              id="username"
              name="username"
              type="text"
              value={form.username}
              onChange={onChange}
              placeholder="Enter your username"
              autoComplete="username"
            />
          </label>

          <label htmlFor="password">
            Password
            <input
              id="password"
              name="password"
              type="password"
              value={form.password}
              onChange={onChange}
              placeholder="Enter your password"
              autoComplete="current-password"
            />
          </label>

          {error ? <p className="form-error">{error}</p> : null}

          <button className="primary-button login-button" type="submit" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </section>
    </main>
  )
}

export default LoginPage
