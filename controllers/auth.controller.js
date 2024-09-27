const redis = require("../libs/redis");
const User = require("../models/user.model");
const jwt = require("jsonwebtoken");
const { sendVerificationEmail } = require("../mailtrap/email.js");
const { VERIFICATION_EMAIL_TEMPLATE } = require("../mailtrap/emailTemplate.js");
const {
  generateToken,
  storeRefreshToken,
} = require("../services/token.services");

// const signUp = async (req, res) => {
//   const { email, password, name } = req.body;
//   try {
//     const userExists = await User.findOne({ email });
//     if (userExists) {
//       return res.status(400).json({ message: "User already exists" });
//     }

//     const user = await User.create({ name, email, password });

//     const { accessToken, refreshToken } = generateToken(user._id);
//     res.cookie("refreshToken", refreshToken, {
//       httpOnly: true,
//       sameSite: "strict",
//       maxAge: 7 * 24 * 60 * 60 * 1000,
//       secure: process.env.NODE_ENV === "production",
//     });
//     await storeRefreshToken(user._id, refreshToken);
//     await sendVerificationEmail(user.email, refreshToken)
//     res
//       .status(200)
//       .json({ accessToken: accessToken, message: "Sign up success" });
//   } catch (error) {
//     console.log("Error in signup controller: ", error.message);
//     res.status(500).json({ message: error.message });
//   }
// };

const signUp = async (req, res) => {
  const { email, password, name } = req.body;
  try {
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: "User already exists" });
    }

    const user = await User.create({ name, email, password });

    const { accessToken, refreshToken } = generateToken(user._id);
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
      secure: process.env.NODE_ENV === "production",
    });
    // await storeRefreshToken(user._id, refreshToken);
    
    

    
    // Generate a verification code (You can replace this with your logic)
    const verificationCode = Math.floor(100000 + Math.random() * 900000); // Example: Generate a 6-digit code
    await redis.set(
          `verificationCode:${user._id}`,
          verificationCode,
          "EX",
          60 * 60 * 24 * 7
        )
        console.log(verificationCode)
    await sendVerificationEmail(user.email, verificationCode);  // Pass the verification code

    res.status(200).json({ otp: verificationCode, message: "Check your email" });
  } catch (error) {
    console.log("Error in signup controller: ", error.message);
    res.status(500).json({ message: error.message });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (user && (await user.comparePassword(password))) {
      const { accessToken, refreshToken } = generateToken(user._id);
      res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60 * 1000,
        secure: process.env.NODE_ENV === "production",
      });
      await storeRefreshToken(user._id, refreshToken);

      res.status(200).json({ accessToken, message: "Login success" });
    } else {
      res.status(400).json({ message: "Invalid email or password" });
    }
  } catch (error) {
    console.log("Error in login controller: ", error.message);
    res.status(500).json({ message: error.message });
  }
};

const logout = async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    if (refreshToken) {
      const decoded = jwt.verify(
        refreshToken,
        process.env.REFRESH_TOKEN_SECRET
      );
      await redis.del(`refresh_token:${decoded.userId}`);
    }
    res.clearCookie("refreshToken");
    res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    console.log("Error in logout controller: ", error.message);
    res.status(500).json({ message: error.message });
  }
};

const refreshToken = async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) {
      return res.status(401).json({ message: "No refresh token provided" });
    }

    const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
    const storedToken = await redis.get(`refresh_token:${decoded.userId}`);

    if (storedToken !== refreshToken) {
      return res.status(401).json({ message: "Invalid refresh token" });
    }

    const accessToken = jwt.sign(
      { userId: decoded.userId },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: "15m" }
    );
    const newRefreshToken = jwt.sign(
      { userId: decoded.userId },
      process.env.REFRESH_TOKEN_SECRET
    );
    await storeRefreshToken(decoded.userId, newRefreshToken);
    res.cookie("refreshToken", newRefreshToken, {
      httpOnly: true,
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
      secure: process.env.NODE_ENV === "production",
    });
    res
      .status(200)
      .json({ accessToken, message: "Token refreshed successfully" });
  } catch (error) {
    console.log("Error in refreshToken", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

module.exports = { signUp, login, logout, refreshToken };
