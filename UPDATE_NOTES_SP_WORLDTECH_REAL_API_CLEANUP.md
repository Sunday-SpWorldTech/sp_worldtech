# SP WorldTech Real API Cleanup

- Removed hardcoded/unverified Strowallet product endpoint values from `.env`, `.env.example`, `render.yaml`, and README.
- Removed Strowallet service fallback routes so the backend will not call guessed provider paths.
- Strowallet now requires real keys and official product endpoint mapping in Render before live provider submission.
- Kept frontend keys clean: no provider secret keys are exposed in frontend files.
- Removed static job preview items from the homepage and replaced them with real API workflow wording.
- OpenWeb Ninja jobs remain backend-driven and use `OPENWEBNINJA_API_KEY` from Render.
- Gift card pages remain API-ready and do not create successful transactions until a real provider API is connected.
