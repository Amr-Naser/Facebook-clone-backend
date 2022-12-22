const User = require("../models/user");

exports.validateEmail = (email) => {
  return String(email)
    .toLowerCase()
    .match(
      /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
    );
};

exports.validateLength = (text, min, max) => {
  if (text.length > max || text.length < min) {
    return false;
  }
  return true;
};

exports.validateUserName = async (userName) => {
  let a = false;

  do {
    let check = await User.findOne({ userName });
    if (check) {
      userName += new Date() * Math.random().toString().substring(0, 1);
      a = true;
    } else {
      a = false;
    }
  } while (a);

  return userName;
};
