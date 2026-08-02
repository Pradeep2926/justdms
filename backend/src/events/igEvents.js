const { replyToComment, sendDM } = require("../services/instagram.service");
const { findMatchingAutomation } = require("../controllers/automation.controller");

module.exports = (app) => {
  app.on("ig-comment", async (event) => {
    console.log("📩 IG COMMENT RECEIVED:", event.text);

    const automation = findMatchingAutomation(event.text);
    if (!automation) {
      console.log("⚠️ No matching automation");
      return;
    }

    await replyToComment(event.comment_id, automation.publicReply);
    await sendDM(event.from.id, automation.dmMessage);

    console.log("✅ Automation executed");
  });
};
