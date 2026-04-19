// src/controllers/reportController.js

const reportService = require("../services/report.service");

exports.getStockSummary = async (req, res, next) => {
  try {
    const data = await reportService.stockSummary(req.user, req.query);
    return res.json(data);
  } catch (err) {
    return next(err);
  }
};

exports.getToolsSummary = async (req, res, next) => {
  try {
    const data = await reportService.toolsSummary(req.user, req.query);
    return res.json(data);
  } catch (err) {
    return next(err);
  }
};

exports.getMRSummary = async (req, res, next) => {
  try {
    const data = await reportService.mrSummary(req.user, req.query);
    return res.json(data);
  } catch (err) {
    return next(err);
  }
};

exports.getToolMovements = async (req, res, next) => {
  try {
    const data = await reportService.toolMovements(req.user, req.query);
    return res.json(data);
  } catch (err) {
    return next(err);
  }
};