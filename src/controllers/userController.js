const ApiError =require ('../utils/apiError.js');
const ApiResponse= require ('../utils/apiResponse.js');
const asyncHandler =  require ('../middleware/asyncHandler.js');
const bcrypt = require("bcrypt");
const db=require('../models')
const crypto = require("crypto");
const {generateToken}=require('../middleware/generateToken.js')
const {deleteImage}=require('../config/cloudinary.js');
const sendEmail=require('../utils/nodemailer.js')
const { where } = require('sequelize');



// Helper function to exclude password from user object
const excludePassword = (user) => {
  const { password, ...userWithoutPassword } = user.toJSON();
  return userWithoutPassword;
};

// Helper function to extract Cloudinary public_id from URL

const register=asyncHandler(async (req,res) => {
    try {
        const {firstName,lastName,password,email,role,bio}=req.body
        if(!firstName||!lastName||!password||!email) throw new ApiError(401,"All fields are required")
           const avatarUrl = req.imageIds;
             // Validate email format
    const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid email address",
      });
    }
    const userExist=await db.User.findOne({
        where:{email}
    })
    if(userExist) throw new ApiError(400,"User is already exist with this email")
           // Validate role
    const validRoles = ["student", "instructor", "admin"];
    const userRole = role && validRoles.includes(role) ? role : "student";
  
    const hashedpassword=await bcrypt.hash(password,12)
    const user=await db.User.create({
        firstName,
        lastName,
        email,
        password:hashedpassword,
        avatar:avatarUrl,
    //     avatar: req.imageData.imageUrl,
    //   avatarPublicId: req.imageData.imageId,
        bio:bio||null,
        role:userRole,
        isActive:true
    })
const token=generateToken(user)
res.status(201).json(
    new ApiResponse(200,{
        message:"Register successfully",
        data:{
            user: excludePassword(user),
            token,
        }
    })
)     
        
    } catch (error) {
        return res.status(500).json({message:error.message})
    }
    
})
const login=asyncHandler(async (req,res) => {
    try {
        const {email,password}=req.body;
        if(!email||!password) throw new ApiError(400,"Please provide email and password")
        const user=await db.User.findOne({
            where:{email}
        })
        if(!user.isActive) throw new ApiError(401,"Your account has been deactivated ,Pleas contact support")
        if(!user) throw new ApiError(404,"Invalid Credentialse")

            const ispasswordMatched=await bcrypt.compare(password,user.password)
        if(!ispasswordMatched) throw new ApiError(404,"Invalid credentialse")

            await user.update({lastLoginAt:new Date()})
            const token=generateToken(user)

      res.status(201).json(
    new ApiResponse(200,{
        message:"Login successfully",
         data: {
        user: excludePassword(user),
        token,
      },
    })
) 
        
    } catch (error) {
        
    }
    
})
// @desc    Reset password with token
// @route   POST /api/users/reset-password
// @access  Public
const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Please provide token and new password",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters",
      });
    }

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const user = await db.User.findOne({
      where: {
        passwordResetToken: hashedToken,
        passwordResetExpires: { [db.Sequelize.Op.gt]: new Date() },
      },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired reset token",
      });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    user.password = hashedPassword;
    user.passwordResetToken = null;
    user.passwordResetExpires = null;
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Password reset successful",
    });
  } catch (error) {
    console.error("Reset password error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error resetting password",
    });
  }
};

// @desc    Forgot password - send reset link
// @route   POST /api/users/forgot-password
// @access  Public
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Please provide email address",
      });
    }

    const user = await db.User.findOne({ where: { email } });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found with this email",
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    // Set token expiry (1 hour)
    user.passwordResetToken = hashedToken;
    user.passwordResetExpires = new Date(Date.now() + 3600000);
    await user.save();
    console.log(user);
    

    // Send email with reset link
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    const emailSubject = "Password Reset Request";
    const emailHtml = `
      <h1>Password Reset</h1>
      <p>You requested a password reset. Click the link below to reset your password:</p>
      <a href="${resetUrl}" target="_blank">${resetUrl}</a>
      <p>This link expires in 1 hour.</p>
      <p>If you didn't request this, please ignore this email.</p>
    `;

    //await sendEmail(email, emailSubject, emailHtml);
    await sendEmail({
  email: email,
  subject: emailSubject,
  message: emailHtml,
});

    return res.status(200).json({
      success: true,
      message: "Password reset link sent to your email",
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error processing request",
    });
  }
};
// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
const updateProfile = async (req, res) => {
  try {
    const user = await db.User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const { firstName, lastName, bio } = req.body;

    // Update basic info
    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (bio !== undefined) user.bio = bio;
    const imageUrl=imageIds

    // Handle avatar update
    if (req.file) {
      // Delete old avatar from Cloudinary if exists
      if (user.avatarUrl) {
        const publicId = imageUrl(avatarUrl)
        if (publicId) {
          await deleteImage(publicId);
        }
      }

      // Upload new avatar
      const uploadResult = await uploadImage(req.file.path);
      user.avatar = uploadResult.secure_url;
    }

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: excludePassword(user),
    });
  } catch (error) {
    console.error("Update profile error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error updating profile",
    });
  }
};

const changePassword=asyncHandler(async (req,res) => {
    try {
        const {currentPassword,newPassword}=req.body;
        if(!currentPassword||!newPassword) throw new ApiError(400,"Please provide current and new password")
            if(newPassword.lenght < 6) throw new ApiError(400,"New password must be at least 6 characters")
            const user=await db.User.findByPk(req.user.id)
        if(!user) throw new ApiError(401,"User not found")
            const isPasswordValid=await bcrypt.compare(currentPassword,user.password)
        if(!isPasswordValid) throw new ApiError(401,"Current password is incorrect")
            const hashedpassword=await bcrypt.hash(newPassword,12)
        user.password=hashedpassword
        await user.save()
        res.status(200).json(new ApiResponse(200,{
            message:"Password changed successfully",
        }))
    } catch (error) {
      console.error("Change password error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error changing password",
    });
    }
    
})
const getProfile=asyncHandler(async (req,res) => {
    try {
        const user=await db.User.findByPk(req.user.id)
        if(!user) throw new ApiError(400,"User not found")
              res.status(201).json(
            new ApiResponse(200,{
            data:excludePassword(user)
    })
) 
         
        
    } catch (error) {
    console.error("Get profile error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error fetching profile",
    });
    }
    
})
module.exports={register,login,getProfile,updateProfile,changePassword,forgotPassword,resetPassword}