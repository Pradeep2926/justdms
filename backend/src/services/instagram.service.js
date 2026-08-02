const { DEV_MODE } = require("../config/devMode");

exports.replyToComment = async (commentId, message) => {
  if (DEV_MODE) {
    console.log("🟡 DEV MODE: Reply to comment");
    console.log("Comment ID:", commentId);
    console.log("Message:", message);
    return;
  }

  // REAL API WILL GO HERE LATER
};

exports.sendDM = async (userId, message) => {
  if (DEV_MODE) {
    console.log("🟡 DEV MODE: Sending DM");
    console.log("User ID:", userId);
    console.log("Message:", message);
    return;
  }

  // REAL API WILL GO HERE LATER
};
