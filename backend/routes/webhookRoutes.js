const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware.js');
const Webhook = require('../models/webhookModel.js'); // (Model ใหม่... จาก "ภารกิจที่ 2")

// -----------------------------------------------------------------
// ⭐️ GET /api/webhooks
// (ดึง "Webhooks ทั้งหมด" ... "ของเรา" (My))
// -----------------------------------------------------------------
router.get('/', protect, async (req, res) => {
  try {
    const webhooks = await Webhook.find({ owner: req.user._id });
    res.json(webhooks);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
});

// -----------------------------------------------------------------
// ⭐️ POST /api/webhooks
// (สร้าง "Webhook" ... อันใหม่)
// -----------------------------------------------------------------
router.post('/', protect, async (req, res) => {
  const { name, url } = req.body;
  if (!name || !url) {
    return res.status(400).json({ message: 'Please provide name and URL' });
  }
  try {
    const webhook = new Webhook({
      owner: req.user._id,
      name,
      url
    });
    const createdWebhook = await webhook.save();
    res.status(201).json(createdWebhook);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
});

// -----------------------------------------------------------------
// ⭐️ DELETE /api/webhooks/:id
// (ลบ "Webhook")
// -----------------------------------------------------------------
router.delete('/:id', protect, async (req, res) => {
  try {
    const webhook = await Webhook.findById(req.params.id);
    if (!webhook) {
      return res.status(404).json({ message: 'Webhook not found' });
    }
    // (เช็กว่า "เรา" (Token) ... เป็น "เจ้าของ" (Owner) ... Webhook นี้)
    if (webhook.owner.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: 'Not authorized' });
    }
    await webhook.deleteOne();
    res.json({ message: 'Webhook removed' });
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
});

module.exports = router;