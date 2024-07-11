const Domain = require("../models/domainSchema");

const createDomain = async (req, res) => {
  try {
    const { name, category, subTopics } = req.body;

    const domain = new Domain({ name, category, subTopics });
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
    const { category } = req.query;
    if (category === "All") {
      const domains = await Domain.find();

      if (domains.length === 0) {
        return res
          .status(404)
          .json({ success: false, message: "No domains found" });
      }

      res.status(200).json({ success: true, message: domains });
    } else if (category === "General") {
      const domains = await Domain.find({ category: category });
      if (domains.length === 0) {
        return res
          .status(404)
          .json({ success: false, message: "No domains found" });
      }

      res.status(200).json({ success: true, message: domains });
    } else if (category === "Special Need") {
      const domains = await Domain.find({ category: category });
      if (domains.length === 0) {
        return res
          .status(404)
          .json({ success: false, message: "No domains found" });
      }

      res.status(200).json({ success: true, message: domains });
    }
  } catch (error) {
    console.error("Error fetching domains:", error);

    if (error.name === "CastError") {
      return res
        .status(400)
        .json({ success: false, message: "Invalid ID format" });
    }

    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const getDomainById = async (req, res) => {
  try {
    const id = req.params.id;
    const domain = await Domain.findById(id);
    if (!domain) {
      return res
        .status(404)
        .json({ success: false, message: "Domain not found" });
    }
    res.status(200).json({ success: true, message: domain });
  } catch (error) {
    res.starus(500).json({ success: false, message: error.message });
  }
};

const updateDomain = async (req, res) => {
  try {
    const id = req.params.id;
    const { name, subTopics, category } = req.body;

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
