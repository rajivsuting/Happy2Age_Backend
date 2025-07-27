const Joi = require("joi");

const domainSchema = Joi.object({
  name: Joi.string().required().trim().min(2).max(100),
  category: Joi.string().required().valid("General", "Special Need"),
  subTopics: Joi.array().items(
    Joi.object({
      content: Joi.string().required().trim(),
      score: Joi.number().min(0).max(100).default(0),
    })
  ),
  observation: Joi.string().trim(),
  activity: Joi.string()
    .regex(/^[0-9a-fA-F]{24}$/)
    .allow(null),
  average: Joi.number().min(0).max(100).default(0),
});

const validateDomain = (data) => {
  return domainSchema.validate(data, { abortEarly: false });
};

module.exports = {
  validateDomain,
};
