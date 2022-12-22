const User = require("../models/user");
const Post = require("../models/Post");
//**** Creating post ****//
exports.createPost = async (req, res) => {
  try {
    const post = await new Post(req.body).save();
    await post.populate(
      "user",
      "first_name last_name cover picture userName",
      "user"
    );
    res.json(post);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};
//**** getting all posts from database ****//
exports.getAllPosts = async (req, res) => {
  try {
    // const posts = await Post.find()
    //   .populate("user", "first_name last_name userName gender picture cover", "user")
    //   .sort({ createdAt: -1 });
    // return res.json(posts);

    const followingTemp = await User.findById(req.user.id).select("following");
    const following = followingTemp.following;
    const promises = following.map(async (user) => {
      return await Post.find({ user: user })
        .populate("user", "first_name last_name userName picture cover", "user")
        .populate(
          "comments.commentBy",
          "first_name last_name userName picture",
          "user"
        )
        .sort({ createdAt: -1 });
      // .limit(10);
    });
    const followingPosts = await (await Promise.all(promises)).flat();
    const userPost = await Post.find({ user: req.user.id })
      .populate("user", "first_name last_name userName picture cover", "user")
      .populate(
        "comments.commentBy",
        "first_name last_name userName picture",
        "user"
      )
      .sort({ createdAt: -1 });
    // .limit(10);
    followingPosts.push(...[...userPost]);
    followingPosts.sort((a, b) => {
      return b.createdAt - a.createdAt;
    });
    return res.json(followingPosts);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};
//**** Adding comment ****//
exports.comment = async (req, res) => {
  try {
    const { comment, image, postId } = req.body;
    let newComments = await Post.findByIdAndUpdate(
      postId,
      {
        $push: {
          comments: {
            comment: comment,
            image: image,
            commentBy: req.user.id,
            commentAt: new Date(),
          },
        },
      },
      {
        new: true,
      }
    ).populate(
      "comments.commentBy",
      "picture first_name last_name userName",
      "user"
    );
    res.json(newComments.comments);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};
//**** Adding post or removing post from saved list ****//
exports.savePost = async (req, res) => {
  try {
    const postId = req.params.id;
    const user = await User.findById(req.user.id);
    const check = user?.savedPosts.find(
      (post) => post.post.toString() == postId
    );
    if (check) {
      await User.findByIdAndUpdate(req.user.id, {
        $pull: {
          savedPosts: {
            _id: check._id,
          },
        },
      });
    } else {
      await User.findByIdAndUpdate(req.user.id, {
        $push: {
          savedPosts: {
            post: postId,
            savedAt: new Date(),
          },
        },
      });
    }
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};
//**** Deleting post ****//
exports.deletePost = async (req, res) => {
  try {
    await Post.findByIdAndRemove(req.params.id);
    res.json({ status: "ok" });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};
