import { createClient } from '@segment/analytics-react-native';

export const segmentClient = createClient({
  writeKey: process.env.EXPO_PUBLIC_SEGMENT_WRITE_KEY!
});

export const segmentTrackLoadedAuthPage = async () => {
  await segmentClient.track('Loaded Auth Page')
}

export const segmentTrackOpened = async (userId: string) => {
  await segmentClient.identify(userId)
  await segmentClient.track('Opened')
}

export const segmentTrackSignedIn = async (userId: string) => {
  await segmentClient.identify(userId)
  await segmentClient.track('Signed In')
}

export const segmentTrackFinishedSignup = async () => {
  await segmentClient.track('Finished Signup')
}

export const segmentTrackStartChat = async () => {
  await segmentClient.track('Start Chat')
}

export const segmentTrackEndChat = async () => {
  await segmentClient.track('End Chat')
}