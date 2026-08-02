const automations = []; // TEMP (DB later)

exports.createAutomation = (req, res) => {
  const automation = {
    id: Date.now(),
    ...req.body,
    isActive: true,
  };

  automations.push(automation);

  res.json({ success: true, automation });
};

exports.getAutomations = (req, res) => {
  res.json({ automations });
};

exports.findMatchingAutomation = (commentText) => {
  return automations.find(a =>
    a.keywords.some(k =>
      commentText.toLowerCase().includes(k.toLowerCase())
    )
  );
};
