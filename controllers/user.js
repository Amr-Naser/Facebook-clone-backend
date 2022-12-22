const User = require("../models/user");
const Code = require("../models/Code");
const Post = require("../models/Post");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const {
  validateEmail,
  validateLength,
  validateUserName,
} = require("../helpers/validations");
const { generateToken } = require("../helpers/tokens");
const { sendVerificationEmail, sendResetCode } = require("../helpers/mailer");
const generateCode = require("../helpers/generateCode");

//**** Registration ****//
exports.register = async (req, res) => {
  try {
    const {
      first_name,
      last_name,
      userName,
      email,
      password,
      gender,
      bYear,
      bMonth,
      bDay,
    } = req.body;
    if (!validateEmail(email)) {
      return res.status(400).json({
        message: "Invalid email",
      });
    }
    const check = await User.findOne({ email });
    if (check) {
      return res.status(400).json({
        message: "this email already exist , please try with different email",
      });
    }
    if (!validateLength(first_name, 3, 30)) {
      return res.status(400).json({
        message: "first name must between 3 and 30 characters",
      });
    }
    if (!validateLength(last_name, 3, 30)) {
      return res.status(400).json({
        message: "last name must between 3 and 30 characters",
      });
    }
    if (!validateLength(password, 6, 40)) {
      return res.status(400).json({
        message: "password must at least 6",
      });
    }
    const cryptedPassword = await bcrypt.hash(password, 12);
    const temUserName = first_name + last_name;
    const newUserName = await validateUserName(temUserName);
    const user = await new User({
      first_name,
      last_name,
      userName: newUserName,
      email,
      password: cryptedPassword,
      gender,
      bYear,
      bMonth,
      bDay,
    }).save();
    const emailVerificationToken = generateToken(
      { id: user._id.toString() },
      "7d"
    );
    const url = `${process.env.BASE_URL}/activate/${emailVerificationToken}`;
    sendVerificationEmail(user.email, user.first_name, url);
    const token = generateToken({ id: user._id.toString() }, "7d");
    res.json({
      id: user._id,
      userName: user.userName,
      picture: user.picture,
      first_name: user.first_name,
      last_name: user.last_name,
      token: token,
      verified: user.verified,
      message: "Register Success ! please activate your email to start",
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

//**** Activating an account ****//
exports.activateAccount = async (req, res) => {
  try {
    const validUser = req.user.id;
    const { token } = req.body;
    const user = jwt.verify(token, process.env.TOKEN_SECRET);
    const check = await User.findById(user.id);
    if (validUser !== user.id) {
      return res.status(400).json({
        message: "You don't have the authorization to complete this operation",
      });
    }
    if (check.verified == true) {
      return res
        .status(400)
        .json({ message: "This account is already activated" });
    } else {
      await User.findByIdAndUpdate(user.id, { verified: true });
      return res
        .status(200)
        .json({ message: "Your account has been activated successfully" });
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

//**** Logging in ****//
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res
        .status(400)
        .json({ message: "This email is not connected to an account" });
    }
    const check = await bcrypt.compare(password, user.password);
    if (!check) {
      return res
        .status(400)
        .json({ message: "invalid credentials , please try again" });
    }
    const token = generateToken({ id: user._id.toString() }, "7d");
    res.json({
      id: user._id,
      userName: user.userName,
      picture: user.picture,
      first_name: user.first_name,
      last_name: user.last_name,
      token: token,
      verified: user.verified,
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

//**** Sending verification email ****//
exports.sendVerification = async (req, res) => {
  try {
    const id = req.user.id;
    const user = await User.findById(id);
    if (user.verified == true) {
      return res.status(400).json({
        message: "This account is already activated",
      });
    }
    const emailVerificationToken = generateToken(
      { id: user._id.toString() },
      "7d"
    );
    const url = `${process.env.BASE_URL}/activate/${emailVerificationToken}`;
    sendVerificationEmail(user.email, user.first_name, url);
    const token = generateToken({ id: user._id.toString() }, "7d");
    return res.status(200).json({
      message: "Email verification link has been sent to your email",
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

//**** Getting user information ****//
exports.findUser = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email }).select("-password");
    if (!user) {
      return res.status(400).json({
        message: "Account does not exist",
      });
    }
    return res.status(200).json({
      email: user.email,
      picture: user.picture,
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

//**** Sending reset password code ****//
exports.sendResetPasswordCode = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email }).select("-password");
    await Code.findOneAndRemove({ user: user._id });
    const code = generateCode(5);
    const savedCode = await new Code({
      code,
      user: user._id,
    }).save();
    sendResetCode(user.email, user.first_name, code);
    return res.status(200).json({
      message: "Email reset code has been sent to your email",
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

//**** Validating reset code ****//
exports.validateResetCode = async (req, res) => {
  try {
    const { email, code } = req.body;
    const user = await User.findOne({ email });
    const DbCode = await Code.findOne({ user: user._id });
    if (DbCode.code !== code) {
      return res.status(400).json({
        message: "Verification code is wrong !",
      });
    }
    return res.status(200).json({ message: "Ok" });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

//**** Changing password ****//
exports.changePassword = async (req, res) => {
  try {
    const { email, password } = req.body;
    const cryptedPassword = await bcrypt.hash(password, 12);
    await User.findOneAndUpdate({ email }, { password: cryptedPassword });
    return res.status(200).json({ message: "Ok" });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

//**** Getting profile information ****//
exports.getProfile = async (req, res) => {
  try {
    const { username } = req.params;
    const user = await User.findById(req.user.id);
    const profile = await User.findOne({ userName: username }).select(
      "-password"
    );
    const friendship = {
      friends: false,
      following: false,
      requestSent: false,
      requestReceived: false,
    };
    if (!profile) {
      return res.json({ ok: false });
    }
    if (
      user.friends.includes(profile._id) &&
      profile.friends.includes(user._id)
    ) {
      friendship.friends = true;
    }
    if (user.following.includes(profile._id)) {
      friendship.following = true;
    }
    if (user.requests.includes(profile._id)) {
      friendship.requestReceived = true;
    }
    if (profile.requests.includes(user._id)) {
      friendship.requestSent = true;
    }
    const posts = await Post.find({ user: profile._id })
      .populate({ path: "user", model: "user" })
      .populate(
        "comments.commentBy",
        "first_name last_name picture userName commentAt",
        "user"
      )
      .sort({ createdAt: -1 });
    await profile.populate(
      "friends",
      "first_name last_name userName picture",
      "user"
    );
    return res.json({ ...profile.toObject(), posts, friendship });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

//**** Updating profile picture ****//
exports.updateProfilePicture = async (req, res) => {
  try {
    const { url } = req.body;
    await User.findByIdAndUpdate(req.user.id, {
      picture: url,
    });
    res.json(url);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

//**** Updating cover picture ****//
exports.updateCover = async (req, res) => {
  try {
    const { url } = req.body;
    await User.findByIdAndUpdate(req.user.id, {
      cover: url,
    });
    res.json(url);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

//**** Updating user information ****//
exports.updateDetails = async (req, res) => {
  try {
    const { infos } = req.body;
    const updated = await User.findByIdAndUpdate(
      req.user.id,
      {
        details: infos,
      },
      {
        new: true,
      }
    );
    res.json(updated.details);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

//**** Sending friend request ****//
exports.addFriend = async (req, res) => {
  try {
    if (req.user.id !== req.params.id) {
      const sender = await User.findById(req.user.id);
      const receiver = await User.findById(req.params.id);
      if (
        !receiver.requests.includes(sender._id) &&
        !receiver.friends.includes(sender._id)
      ) {
        await receiver.updateOne({
          $push: { requests: sender._id },
        });
        await receiver.updateOne({
          $push: { followers: sender._id },
        });
        await sender.updateOne({
          $push: { following: receiver._id },
        });
        res.json({ message: "Friend request has been sent" });
      } else {
        return res.status(400).json({ message: "Already sent" });
      }
    } else {
      return res
        .status(400)
        .json({ message: "You can't send a request to yourself." });
    }
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

//**** Cancelling request ****//
exports.cancelRequest = async (req, res) => {
  try {
    if (req.user.id !== req.params.id) {
      const sender = await User.findById(req.user.id);
      const receiver = await User.findById(req.params.id);
      if (
        receiver.requests.includes(sender._id) &&
        !receiver.friends.includes(sender._id)
      ) {
        await receiver.updateOne({
          $pull: { requests: sender._id },
        });
        await receiver.updateOne({
          $pull: { followers: sender._id },
        });
        await sender.updateOne({
          $pull: { following: receiver._id },
        });
        res.json({ message: "You canceled a friend request." });
      } else {
        return res.status(400).json({ message: "Already canceled" });
      }
    } else {
      return res
        .status(400)
        .json({ message: "You can't cancel a request to yourself." });
    }
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

//**** Following account ****//
exports.follow = async (req, res) => {
  try {
    if (req.user.id !== req.params.id) {
      const sender = await User.findById(req.user.id);
      const receiver = await User.findById(req.params.id);
      if (
        !receiver.followers.includes(sender._id) &&
        !sender.following.includes(receiver._id)
      ) {
        await receiver.updateOne({
          $push: { followers: sender._id },
        });
        await sender.updateOne({
          $push: { following: receiver._id },
        });
        res.json({ message: "Follow success." });
      } else {
        return res.status(400).json({ message: "Already following" });
      }
    } else {
      return res.status(400).json({ message: "You can't follow yourself." });
    }
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

//**** Cancelling follow account ****//
exports.unfollow = async (req, res) => {
  try {
    if (req.user.id !== req.params.id) {
      const sender = await User.findById(req.user.id);
      const receiver = await User.findById(req.params.id);
      if (
        receiver.followers.includes(sender._id) &&
        sender.following.includes(receiver._id)
      ) {
        await receiver.updateOne({
          $pull: { followers: sender._id },
        });
        await sender.updateOne({
          $pull: { following: receiver._id },
        });
        res.json({ message: "UnFollow success." });
      } else {
        return res.status(400).json({ message: "Already not following" });
      }
    } else {
      return res.status(400).json({ message: "You can't unfollow yourself." });
    }
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

//**** Accepting request ****//
exports.acceptRequest = async (req, res) => {
  try {
    if (req.user.id !== req.params.id) {
      const receiver = await User.findById(req.user.id);
      const sender = await User.findById(req.params.id);
      if (receiver.requests.includes(sender._id)) {
        await receiver.update({
          $push: { friends: sender._id, following: sender._id },
        });
        await sender.update({
          $push: { friends: receiver._id, followers: receiver._id },
        });
        await receiver.updateOne({
          $pull: { requests: sender._id },
        });
        res.json({ message: "Request has been accepted." });
      } else {
        return res.status(400).json({ message: "Already friends" });
      }
    } else {
      return res
        .status(400)
        .json({ message: "You can't accept request from yourself." });
    }
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

//**** Removing account from friends list ****//
exports.unfriend = async (req, res) => {
  try {
    if (req.user.id !== req.params.id) {
      const sender = await User.findById(req.user.id);
      const receiver = await User.findById(req.params.id);
      if (
        receiver.friends.includes(sender._id) &&
        sender.friends.includes(receiver._id)
      ) {
        await receiver.update({
          $pull: {
            friends: sender._id,
            following: sender._id,
            followers: sender._id,
          },
        });
        await sender.update({
          $pull: {
            friends: receiver._id,
            following: receiver._id,
            followers: receiver._id,
          },
        });
        res.json({ message: "unfriend request has been accepted." });
      } else {
        return res.status(400).json({ message: "Already not friends" });
      }
    } else {
      return res.status(400).json({ message: "You can't unfriend yourself." });
    }
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

//**** Deleting request ****//
exports.deleteRequest = async (req, res) => {
  try {
    if (req.user.id !== req.params.id) {
      const receiver = await User.findById(req.user.id);
      const sender = await User.findById(req.params.id);
      if (receiver.requests.includes(sender._id)) {
        await receiver.update({
          $pull: { requests: sender._id, followers: sender._id },
        });
        await sender.updateOne({
          $pull: { following: receiver._id },
        });
        res.json({ message: "Delete request has been accepted." });
      } else {
        return res.status(400).json({ message: "Already deleted request" });
      }
    } else {
      return res.status(400).json({ message: "You can't delete yourself." });
    }
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

//**** Searching for account ****//
exports.search = async (req, res) => {
  try {
    const searchTerm = req.params.searchTerm;
    const results = await User.find({ $text: { $search: searchTerm } }).select(
      "first_name last_name userName picture"
    );
    res.json(results);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

//**** Adding to search history ****//
exports.addToSearchHistory = async (req, res) => {
  try {
    const { searchUser } = req.body;
    const search = {
      user: searchUser,
      createdAt: new Date(),
    };
    const user = await User.findById(req.user.id);
    const check = user.search.find((x) => x.user.toString() === searchUser);
    if (check) {
      await User.updateOne(
        {
          _id: req.user.id,
          "search._id": check._id,
        },
        {
          $set: { "search.$.createdAt": new Date() },
        }
      );
    } else {
      await User.findByIdAndUpdate(req.user.id, {
        $push: {
          search,
        },
      });
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

//**** Getting all history list ****//
exports.getSearchHistory = async (req, res) => {
  try {
    const results = await User.findById(req.user.id)
      .select("search")
      .populate("search.user", "first_name last_name userName picture", "user");
    res.json(results.search);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

//**** Removing from history list ****//
exports.removeFromSearch = async (req, res) => {
  try {
    const { searchUser } = req.body;
    await User.updateOne(
      {
        _id: req.user.id,
      },
      { $pull: { search: { user: searchUser } } }
    );
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

//**** Getting all friends information ****//
exports.getFriendsPageInfos = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select("friends requests")
      .populate("friends", "first_name last_name picture userName", "user")
      .populate("requests", "first_name last_name picture userName", "user");
    const sentRequests = await User.find({
      requests: mongoose.Types.ObjectId(req.user.id),
    }).select("first_name last_name picture userName");
    res.json({
      friends: user.friends,
      requests: user.requests,
      sentRequests,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// exports.auth = (req ,res) => {
//   console.log(req.user);
//   res.json("welcome from auth");
// };
