const { validationResult } = require("express-validator");

function validateData(data) {
  const errors = validationResult(data);
  if (!errors.isEmpty()) {
    return errors.array();
  }
  return null;
}

module.exports = { validateData };
