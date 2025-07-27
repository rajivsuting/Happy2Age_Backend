const Domain = require("../models/domainSchema");
const mongoose = require("mongoose");

const createDomain = async (req, res) => {
  try {
    const { name, category, subTopics, happinessParameter } = req.body;

    const domain = new Domain({
      name,
      category,
      subTopics,
      happinessParameter,
    });
    const savedDomain = await domain.save();

    res.status(201).json({
      success: true,
      message: "Domain added succescfully",
      data: savedDomain,
    });
  } catch (error) {
    console.error("Error creating domain:", error.message);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const getAllDomains = async (req, res) => {
  try {
    const { category = "All", name = "", page = 1, limit = 10 } = req.query;

    const query = {};

    // Filter by category if not "All"
    if (category !== "All") {
      query.category = category;
    }

    // Case-insensitive name search
    if (name) {
      query.name = { $regex: name, $options: "i" };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [domains, total] = await Promise.all([
      Domain.find(query).skip(skip).limit(parseInt(limit)),
      Domain.countDocuments(query),
    ]);

    if (domains.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "No domains found" });
    }

    res.status(200).json({
      success: true,
      message: "Domains fetched successfully",
      data: domains,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching domains:", error);

    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const getDomainById = async (req, res) => {
  try {
    const { id } = req.params;

    // Check for valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid domain ID" });
    }

    const domain = await Domain.findById(id);

    if (!domain) {
      return res
        .status(404)
        .json({ success: false, message: "Domain not found" });
    }

    res.status(200).json({
      success: true,
      message: "Domain fetched successfully",
      data: domain,
    });
  } catch (error) {
    console.error("Error fetching domain:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const updateDomain = async (req, res) => {
  try {
    const id = req.params.id;
    const { name, subTopics, category, happinessParameter } = req.body;

    const domain = await Domain.findById(id);
    if (!domain) {
      return res
        .status(404)
        .json({ success: false, message: "Domain not found" });
    }

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (subTopics !== undefined) updateData.subTopics = subTopics;
    if (category !== undefined) updateData.category = category;
    if (happinessParameter !== undefined)
      updateData.happinessParameter = happinessParameter;

    const updatedDomain = await Domain.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({ success: true, data: updatedDomain });
  } catch (error) {
    console.error("Error updating domain:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const deleteDomain = async (req, res) => {
  const { id } = req.params;

  try {
    // Find the domain by ID
    const domain = await Domain.findById(id);
    if (!domain) {
      return res.status(404).json({ message: "Domain not found" });
    }

    // Delete the domain
    await Domain.findByIdAndDelete(id);

    res.status(200).json({ message: "Domain deleted successfully" });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  createDomain,
  getAllDomains,
  getDomainById,
  updateDomain,
  deleteDomain,
};
