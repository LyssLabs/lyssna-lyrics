import * as channels from "../../../builds/shared/channels.mjs";
export { TEST_BUILD_VERSION } from "../../../builds/shared/build-paths.mjs";

export type ChannelHosts = [string, string] | [string, string, string];
export const CHANNEL_PREFIX = channels.CHANNEL_PREFIX;
export const CHANNELS_CHANGED_EVENT = channels.CHANNELS_CHANGED_EVENT;
export const DEFAULT_CHANNEL = channels.DEFAULT_CHANNEL;
export const DEFAULT_BUILD_HOST = channels.DEFAULT_BUILD_HOST;
export const BUILT_IN_CHANNELS = channels.BUILT_IN_CHANNELS as Record<string, ChannelHosts>;
export const isAllowedBuildHost = channels.isAllowedBuildHost;
export const isReservedChannelName = channels.isReservedChannelName;
export const readCustomChannels = channels.readCustomChannels as () => Record<string, ChannelHosts>;
export const saveCustomChannels = channels.saveCustomChannels;
export const getCurrentChannel = channels.getCurrentChannel;
export const setCurrentChannel = channels.setCurrentChannel;
export const selectedChannel = channels.selectedChannel;
