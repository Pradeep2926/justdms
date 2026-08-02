const express = require("express");
const router = express.Router();

/**
 * DEV webhook simulator
 * URL: /dev/simulate-comment
 */
router.post("/simulate-comment", (req, res) => {
  const { text } = req.body;

  const mockEvent = {
    comment_id: "DEV_COMMENT_123",
    from: { id: "DEV_USER_999" },
    text,
  };

  req.app.emit("ig-comment", mockEvent);

  res.json({
    success: true,
    simulated: true,
    event: mockEvent,
  });
});

module.exports = router;
