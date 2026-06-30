const Message = require('../models/Message');

exports.getMyMessages = async (_req, res) => {
  const messages = await Message.find().sort({ createdAt: 1 }).limit(50);
  res.json({ messages });
};

exports.sendUserMessage = async (req, res) => {
  const message = await Message.create({
    sender: req.user._id,
    senderName: req.user.fullName,
    senderRole: 'user',
    message: req.body.message
  });
  if (req.io) req.io.emit('chat:new', message);
  res.status(201).json({ message: 'Message sent', data: message });
};

exports.sendStaffReply = async (req, res) => {
  const message = await Message.create({
    sender: req.user._id,
    senderName: req.user.fullName,
    senderRole: 'staff',
    message: req.body.message
  });
  if (req.io) req.io.emit('chat:new', message);
  res.status(201).json({ message: 'Reply sent', data: message });
};
