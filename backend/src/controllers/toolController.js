const toolService = require("../services/tool.service");

exports.createTool = async (req, res, next) => {
  try {
    const tool = await toolService.createTool(req.body, req.user);
    return res.status(201).json({ message: "Tool created", tool });
  } catch (err) {
    return next(err);
  }
};

exports.listTools = async (req, res, next) => {
  try {
    const result = await toolService.listTools(req.user, req.query);
    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
};

exports.getToolById = async (req, res, next) => {
  try {
    const tool = await toolService.getToolById(req.params.id, req.user);
    return res.status(200).json({ tool });
  } catch (err) {
    return next(err);
  }
};

exports.getMovements = async (req, res, next) => {
  try {
    const result = await toolService.getMovements(
      req.params.id,
      req.user,
      req.query
    );
    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
};

exports.issueTool = async (req, res, next) => {
  try {
    const tool = await toolService.issueTool(
      req.params.id,
      req.body,
      req.user
    );
    return res.status(200).json({ message: "Tool issued", tool });
  } catch (err) {
    return next(err);
  }
};

exports.returnTool = async (req, res, next) => {
  try {
    const tool = await toolService.returnTool(
      req.params.id,
      req.body,
      req.user
    );
    return res.status(200).json({ message: "Tool returned", tool });
  } catch (err) {
    return next(err);
  }
};

exports.transferTool = async (req, res, next) => {
  try {
    const tool = await toolService.transferTool(req.params.id, req.body, req.user);
    return res.status(200).json({ message: "Tool transferred", tool });
  } catch (err) {
    return next(err);
  }
};