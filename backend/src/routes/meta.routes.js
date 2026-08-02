const express = require("express");
const axios = require("axios");
const router = express.Router();

const META_AUTH_URL = "https://www.facebook.com/v18.0/dialog/oauth";

// STEP 1: start login
router.get("/", (req, res) => {
  const params = new URLSearchParams({
    client_id: process.env.META_APP_ID,
    redirect_uri: process.env.META_REDIRECT_URI,
    response_type: "code",
    scope: "public_profile",
  });

  res.redirect(`${META_AUTH_URL}?${params.toString()}`);
});

// STEP 2: callback (THIS MATCHES META SETTINGS)
router.get("/callback", async (req, res) => {
  const { code } = req.query;

  try {
    const tokenRes = await axios.get(
      "https://graph.facebook.com/v18.0/oauth/access_token",
      {
        params: {
          client_id: process.env.META_APP_ID,
          client_secret: process.env.META_APP_SECRET,
          redirect_uri: process.env.META_REDIRECT_URI,
          code,
        },
      }
    );

    res.json({
      success: true,
      tokenData: tokenRes.data,
    });
  } catch (err) {
    res.status(500).json({
      error: "OAuth failed",
      details: err.response?.data || err.message,
    });
  }
});

module.exports = router;
