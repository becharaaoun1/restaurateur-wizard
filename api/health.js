// GET /api/health  ->  which keys are set (never their values)
export default function handler(req, res) {
  res.status(200).json({
    google_key_set: !!process.env.GOOGLE_MAPS_API_KEY,
    anthropic_key_set: !!process.env.ANTHROPIC_API_KEY,
    password_set: !!process.env.APP_PASSWORD,
  });
}
