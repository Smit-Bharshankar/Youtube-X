import mongoose ,  {isValidObjectId}from "mongoose";
import { User } from '../models/user.model.js';
import { Video } from '../models/video.model.js';
import {asyncHandler} from '../utils/asyncHandler.js';
import {ApiError} from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { uploadOnCloudinary , deleteInCloudinary } from '../utils/cloudinary.js';

const getAllVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, query, sortBy = "createdBy", sortType = "desc", userId } = req.query
    //TODO: get all videos based on query, sort, pagination
    const videos = await Video.aggregate([
        query
          ? {
              $match: {
                $or: [
                  { title: { $regex: query, $options: "i" } },
                  { description: { $regex: query, $options: "i" } },
                ],
              },
            }
          : null,
        {
          $lookup: {
            from: "users",
            localField: "owner",
            foreignField: "_id",
            as: "createdBy",
          },
        },
        {
          $unwind: {
            path: "$createdBy",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $project: {
            thumbnail: 1,
            videoFile: 1,
            title: 1,
            description: 1,
            createdBy: {
              fullName: 1,
              username: 1,
              avatar: 1,
            },
          },
        },
        {
          $facet: {
            metadata: [{ $count: "total" }],
            data: [
              { $sort: { [sortBy]: sortType === "asc" ? 1 : -1 } },
              { $skip: (page - 1) * limitValue },
              { $limit: limitValue },
            ],
          },
        },
      ].filter(Boolean)); // Removes null stages
      
      const metadata = videos[0]?.metadata[0] || { total: 0 };
      const videoData = videos[0]?.data || [];
      
      return res
      .status(200)
      .json(
        new ApiResponse(200, {
            videos: videoData, ,
            totalVideos : metadata.total, page
            limit : limitValue,
        } ,
        "Videos fetched successfully"
    ) 
    )
      

})

const publishAVideo = asyncHandler(async (req, res) => {
    const { title, description} = req.body
    // TODO: get video, upload to cloudinary, create video
    
    if (!title || !description) {
        throw new ApiError(400, "Please provide title and description")
    }

    if (!req.file) {
        throw new ApiError(400, "Please upload a video file")
    }

    // checking for video 
    // const videoLocalPath = req.files?.video[0]?.path;
    let videoLovalPath;
if (req.files && Array.isArray(req.files.video) && req.files.video.length > 0) {
    videoLovalPath = req.files.video[0].path;
    }

if (!videoLovalPath) {
    throw new ApiError(400, "Avatar is required") 
 }

 const videoFile = await uploadOnCloudinary(videoLovalPath);
 if (!video) {
    throw new ApiError(500, "Failed to upload avatar image to Cloudinary");
}

    //checking for thumbnail
    const thumbnailLocalPath = req.files?.thumbnail[0]?.path;
    if (!thumbnailLocalPath) {
        throw new ApiError(400 , "Thumbnail is required")
    }

    const thumbnailFile = await uploadOnCloudinary(thumbnailLocalPath);
    if (!thumbnailFile) {
        throw new ApiError(500, "Failed to upload thumbnail image to Cloudinary")
    }

    const savedVideo = await Video.create({
        videoFile:videoFile.url,
        thumbnail:thumbnail.url,
        title,
        description,
        duration:videoFile.duration,
        owner:req.user?._id,
    }) 

    if (!savedVideo) {
        throw new ApiError(500,"Error while saving video")
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                {savedVideo},
                "Video uploaded successfully"
            )
        )



})

const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: get video by id
    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video id")
    }

    const video = await Video.findById(videoId)
    if (!video) {
        throw new ApiError(404, "Video not found")
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                {video},
                "Video fetched successfully"
            )
        )
})

const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: update video details like title, description, thumbnail
    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video id")
    }

    const { title, description } = req.body

    if (!title || !description) {
        throw new ApiError(400, "Please provide title and description")
    }

    const video = await Video.findById(videoId)

    if (!((video?.owner).equals(req.user?._id))) {
        throw new ApiError(400,"You cannot Update the details")
    }

    const deleteOldThumbnail = await deleteInCloudinary(video.thumbnail)

        if (deleteOldThumbnail.result !== 'ok' ) {
            throw new ApiError(400,"old thumbnail not deleted")
        }

    //checking for thumbnail
    const thumbnailLocalPath = req.files?.thumbnail[0]?.path;
    if (!thumbnailLocalPath) {
        throw new ApiError(400 , "Thumbnail is required")
    }

    const newThumbnail = await uploadOnCloudinary(thumbnailLocalPath);
    if (!newThumbnail) {
        throw new ApiError(500, "Failed to upload thumbnail image to Cloudinary")
    }

    const videoToupdate = await Video.findByIdAndUpdate(
        videoId,
        {
            $set:{
                title,
                description,
                thumbnail:newThumbnail.url
            }
        },
        {
            new:true
        }
    )
    return res
    .status(200)
    .json(new ApiResponse(
        200,
        videoToupdate,
        "Updated Details of vedio"
    ))

})

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: delete video
    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video id")
    }

    const video = await Video.findById(videoId)
        if (!((video?.owner).equals(req.user?._id))) {
            throw new ApiError(400,"You cannot Update the details")
        }
        const videoDelete = await deleteInCloudinary(video.videoFile)
        if (videoDelete.result !== 'ok') {
            throw new ApiError(400,"Not able to delete video file")
        }
        const thumdDelete = await deleteInCloudinary(video.thumbnail)
        if (thumdDelete.result !== 'ok') {
            throw new ApiError(400,"Not able to delete thumbnail file")
        }
        const deletedVideo = await Video.findByIdAndDelete(videoId)
        return res.status(204).json(new ApiResponse(204,{deletedVideo},"video and details deleted"))
})

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params
     
    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video id")
    }

    const video = await Video.findById(videoId)
    if (!((video?.owner).equals(req.user?._id))) {
        throw new ApiError(400,"You cannot Update the details")
    }
    const videoChanged = await Video.findByIdAndUpdate(
        videoId,
        {
            $set:{
                isPublished:!video.isPublished
            }
        },  
        {
            new:true
        }
    )
    return res
    .status(200)
    .json(new ApiResponse(
        200,
        videoChanged,
        "Changed View of the Publication"
    ))
})

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
}