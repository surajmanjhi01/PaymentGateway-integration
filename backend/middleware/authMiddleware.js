const User = require("../schemas/UserSchema");

const protectCourse = async (req, res, next) => {
  try {
    const userId = req.body?.userId || req.query?.userId || req.headers["x-user-id"];

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated"
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};

module.exports = protectCourse;