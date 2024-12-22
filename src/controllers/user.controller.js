import {asyncHandler} from '../utils/asyncHandler.js';
import {ApiError} from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { User } from '../models/user.model.js';
import { uploadOnCloudinary } from '../utils/cloudinary.js';
import   jwt    from "jsonwebtoken"


const genAccessAndRefreshTokens = async (userId) => {
    try {
        const user = await User.findById(userId)
        const accesstoken = user.generateAccessTokens()
        const refreshtoken = user.generateRefreshTokens()

        user.refreshToken = refreshtoken
       await user.save({ validateBeforeSave: false })
       
       return { accesstoken , refreshtoken}
       
    } catch (error) {
        throw new ApiError(500 , "Something went wrong while generating Refresh and Access Tokens")
    }
}

const registerUser = asyncHandler(async ( req , res ) => {
    
    // get user details from req.body from frontend
    // validate user details
    // check if user already exists: username and email
    // check for images and avatar
    // upload images to cloudinary
    // create new user object - create entry in db
    // remove password and refreshToken from response
    // check for user creation
    // return res

    const { username, email, fullname, password } = req.body;
// console.log("User Details: ", username, email, fullname, password);

// Helper function to check if a string is valid email
const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

// Helper function to check if the password meets complexity requirements
const isStrongPassword = (password) => {
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    return passwordRegex.test(password);
};
///////////////////////////////////////////

// some method will return true if any of the field is empty
if (([username , email , fullname , password].some( (field) => field?.trim() === ""))) { 
    throw new ApiError(400 , "All fields are required")
}

// Validate email format
if (!isValidEmail(email)) {
    throw new ApiError(400, "Invalid email format");
}

// Validate password strength
if (!isStrongPassword(password)) {
    throw new ApiError(400, "Password must be at least 8 characters long, include at least one letter, one number, and one special character");
}

// Validate username length
if (username.length < 3 || username.length > 15) {
    throw new ApiError(400, "Username must be between 3 and 15 characters long");
}

// Validate fullname (no numbers or special characters allowed)
if (!/^[a-zA-Z\s]+$/.test(fullname)) {
    throw new ApiError(400, "Full name must only contain alphabets and spaces");
}

// console.log("All Validations Passed")

// check if user already exits
const existingUser = await User.findOne({
    $or: [{ username }, { email }],
})
// console.log("Existing User: ", existingUser) 

if (existingUser) {
    throw new ApiError(409, "User already exists with this email or username");
}

// check for images and avatar
// const avatarLovalPath = req.files?.avatar[0]?.path;
// const coverImageLocalPath = req.files?.coverImage[0]?.path;
let avatarLovalPath;
if (req.files && Array.isArray(req.files.avatar) && req.files.avatar.length > 0) {
    avatarLovalPath = req.files.avatar[0].path;
}

let coverImageLocalPath;
if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
    coverImageLocalPath = req.files.coverImage[0].path;
}

// console.log(req.files); 

 if (!avatarLovalPath) {
    throw new ApiError(400, "Avatar is required") 
 }

// upload images to cloudinary
const avatar = await uploadOnCloudinary(avatarLovalPath);
const coverImage = await uploadOnCloudinary(coverImageLocalPath);

if (!avatar) {
    throw new ApiError(500, "Failed to upload avatar image to Cloudinary");
}



// create new user object - create entry in db
const user = await User.create({
    fullname, 
    username,
    email,
    password,
    avatar: avatar.url,
    coverImage: coverImage?.url || null,  
})

//check for user creation and return user details without password and refreshToken
const createdUser = await User.findById(user._id).select("-password -refreshToken");

if (!createdUser) {
    throw new ApiError(500, "Failed to create user");
}

// return res
return res.status(201).json(
    new ApiResponse(201 , createdUser , "User created successfully")
)

})

const loginUser = asyncHandler( async (req , res ) => {

    // get user details from req.body from frontend
    // login based on email or username
    // check if user exists
    // check if password is correct
    // access and refresh token generation
    // send cookies with tokens

    const { email , username , password } = req.body

    if ( !(username || email)) {
        throw new ApiError(400 , "Username or Email is required")
    }

    // user data from db
    const user = await User.findOne({
        $or: [{username} , {email}]
    })

    if (!user) {
        throw new ApiError(404 , "User does not exists")
    }

    const isPasswordValid = await user.isPasswordCorrect(password)

    if (!isPasswordValid) {
        throw new ApiError(401 , "Invalid User Credentials")
    }

    const { accesstoken , refreshtoken } = await genAccessAndRefreshTokens(user._id)

    user.refreshToken = refreshtoken

    console.log(user) // check for refreshToken in user

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
      .status(200)
      .cookie("accessToken", accesstoken, options)
      .cookie("refreshToken", refreshtoken, options)
      .json(
        new ApiResponse(200, {
            user: user,
            accesstoken,
            refreshtoken,
        } ,
        "User logged-in successfully"
    ) 
    )

})

const logoutUser = asyncHandler( async (req , res) => {
    // get User from cookies
    // clear cookies of user
    
    const userId = req.user._id
    
   await User.findByIdAndUpdate(
        userId,
        {
            $set: {
                refreshToken: null
            }
        },
        {
            new: true
        }
    )

    const options = {
        httpOnly: true,
        secure: true
    }

    return res.status(200)
    .clearCookie("accessToken" , options)
    .clearCookie("refreshToken" , options)
    .json( 
        new ApiResponse(200 ,{} , "User Logout Successfull")
    )
})

const refreshAccessToken = asyncHandler( async ( req , res) => {
    const incommingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if (!incommingRefreshToken) {
        throw new ApiError(401 , "Unauthorised user request")
    }

    try {
        const decodedToken = jwt.verify(incommingRefreshToken , process.env.REFRESH_TOKEN_SECRET )
        const user = await User.findById(decodedToken?._id)
    
        if (!user) {
            throw new ApiError(401 , "Invalid Refresh Token")
        }
    
        if (incommingRefreshToken !== user?.refreshToken) {
            throw new ApiError(401 , "Refresh token is expired or used")
        }
    
        const { accesstoken , newrefreshtoken } = await genAccessAndRefreshTokens(user._id)
    
        const options = {
            httpOnly: true,
            secure: true
        }
    
        return res
          .status(200)
          .cookie("accessToken", accesstoken, options)
          .cookie("refreshToken", newrefreshtoken, options)
          .json(
            new ApiResponse(200, {
                user: user,
                accesstoken,
                refreshtoken: newrefreshtoken,
            } , "User logged-in successfully"
    ) )
    } catch (error) {
        new ApiError(401 , error?.message || "Invalid Refresh Token")
    }
    
    
    
})

export {
    registerUser,
     loginUser,
     logoutUser,
     refreshAccessToken
    };