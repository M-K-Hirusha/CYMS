const mrService = require("../services/mr.service");

// Create MR
exports.createMR = async (req, res, next) => {
  try {
    const mr = await mrService.createMR({
      user: req.user,
      toLocationCode: req.body.toLocationCode,
      items: req.body.items,
    });

    res.status(201).json(mr);
  } catch (err) {
    next(err);
  }
};

// List MRs
exports.listMRs = async (req, res, next) => {
  try {
    const mrs = await mrService.listMRs({ user: req.user });
    res.json(mrs);
  } catch (err) {
    next(err);
  }
};

// Get MR by ID
exports.getMRById = async (req, res, next) => {
  try {
    const mr = await mrService.getMRById({
      user: req.user,
      mrId: req.params.id,
    });
    res.json(mr);
  } catch (err) {
    next(err);
  }
};

// Approve MR
exports.approveMR = async (req, res, next) => {
  try {
    const mr = await mrService.approveMR({
      user: req.user,
      mrId: req.params.id,
      approvalLines: req.body.approvalLines,
      note: req.body.note,
      dispatchMainYardId: req.body.dispatchMainYardId, // New field for dispatch MAIN yard
    });

    res.json(mr);
  } catch (err) {
    next(err);
  }
};

// Reject MR
exports.rejectMR = async (req, res, next) => {
  try {
    const mr = await mrService.rejectMR({
      user: req.user,
      mrId: req.params.id,
      reason: req.body.reason,
    });

    res.json(mr);
  } catch (err) {
    next(err);
  }
};