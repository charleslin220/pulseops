# Start PulseOps

Try the public demo at https://pulseops-nine.vercel.app. No account is required.

For local development use the instructions in [README.md](README.md). The recommended Windows folder is `C:\Users\charl\repos\pulseops`.

Do not double-click `frontend/index.html`: Vite must compile and serve the app over HTTP. Docker Compose starts PostgreSQL, migrates the schema, seeds the public synthetic dataset and starts the backend/frontend. Visit http://localhost:5173 after startup.

Private demo accounts are optional and require the separate seed command in the README. Keep your existing `.env`; never upload it or database credentials to GitHub.

This repository includes a Vercel Go adapter and deployment instructions in [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md). GitHub Pages alone cannot run the Go API or PostgreSQL.
