// Render defaults. Anything the pipeline must control (props, output path,
// concurrency) is passed on the command line by RemotionBackend instead, so a
// change here can never silently alter a published reel's encoding.
import { Config } from "@remotion/cli/config";

Config.setVideoImageFormat("jpeg");
Config.setCodec("h264");
Config.setPixelFormat("yuv420p");
Config.setCrf(20);
Config.setOverwriteOutput(true);
// A render that throws is a failed day, not a reel with a blank frame in it.
Config.setChromiumOpenGlRenderer("angle");
