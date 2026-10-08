const express = require("express");
const app = express();

app.use(express.json({ limit: "4mb" }));

app.use("/auth", require("./routes/auth.routes"));
app.use("/meta", require("./routes/meta.routes"));
app.use("/automation", require("./routes/automation.routes"));
app.use("/webhook", require("./routes/webhook.routes"));
app.use("/instagram", require("./routes/instagram.routes"));
app.use("/dev", require("./routes/dev.routes"));
app.use("/bio", require("./routes/bio.routes"));
app.use("/booking", require("./routes/booking.routes"));

module.exports = app;
