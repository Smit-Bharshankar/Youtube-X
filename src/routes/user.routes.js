import { Router } from "express";
import {registerUser,
     loginUser,
     logoutUser,
     refreshAccessToken,
     changeCurrentPassword,
     getCurrentUser,
     updateAccountDetails,
     updateAvatar,
     updateUserCoverImage,
     getUserChannelProfile,
     getWatchHistory
      } from "../controllers/user.controller.js";
import {upload} from "../middlewares/multer.middleware.js";
import { verifyJwt } from "../middlewares/auth.middleware.js"

const router = Router();

//router.route("/register").post(upload.fields([{name:"avatar" , maxCount: 1},{name:"coverImage", maxCount: 1}]) , registerUser)

router.route("/register").post(
  upload.fields([
    {
      name: "avatar",
      maxCount: 1,
    },
    { name: "coverImage", maxCount: 1 },
  ]),
  registerUser
);

router.route("/login").post(loginUser)

// secured routes
router.route("/logout").post(verifyJwt , logoutUser)
router.route("/refreshtoken").post(refreshAccessToken)

router.route("/current-user").get(verifyJwt, getCurrentUser)
router.route("/update-account").patch(verifyJwt, updateAccountDetails)
router.route("change-password").post(verifyJwt, changeCurrentPassword)

router.route("/channel/:username").get(verifyJwt , getUserChannelProfile)
router.route("/watch-history").get(verifyJwt , getWatchHistory)

router.route("/avatar").patch(verifyJwt , upload.single("avatar") , updateAvatar)
router.route("/cover-image").patch(verifyJwt , upload.single("coverImage") , updateUserCoverImage)


export default router;