const express = require("express");
const app = express();

app.use(express.json());

app.use("/auth", require("./routes/auth.routes"));
app.use("/meta", require("./routes/meta.routes"));
app.use("/automation", require("./routes/automation.routes"));
app.use("/webhook", require("./routes/webhook.routes"));
app.use("/instagram", require("./routes/instagram.routes"));
app.use("/dev", require("./routes/dev.routes"));

module.exports = app;
