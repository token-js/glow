// 📍 ./index.ts

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import { Platform } from "react-native";
import TextEncoder from "react-native-fast-encoder";

if (Platform.OS !== "web") {
  const setupPolyfills = async () => {
    const { polyfillGlobal } = await import(
      "react-native/Libraries/Utilities/PolyfillFunctions"
    );
    const { ReadableStream, TransformStream } = await import(
      "web-streams-polyfill/dist/ponyfill"
    );
    const { TextEncoderStream, TextDecoderStream } = await import(
      "@stardazed/streams-text-encoding"
    );
    const { fetch, Headers, Request, Response } = await import(
      "react-native-fetch-api"
    );

    polyfillGlobal("ReadableStream", () => ReadableStream);
    polyfillGlobal("TransformStream", () => TransformStream);
    polyfillGlobal("TextDecoderStream", () => TextDecoderStream);
    polyfillGlobal(
      "fetch",
      () =>
        (...args) =>
          fetch(args[0], { ...args[1], reactNative: { textStreaming: true } })
    );
    polyfillGlobal("TextEncoderStream", () => TextEncoderStream);
    polyfillGlobal("Headers", () => Headers);
    polyfillGlobal("Request", () => Request);
    polyfillGlobal("Response", () => Response);
  };

  setupPolyfills();
}

import "expo-router/entry";

declare global {
  interface RequestInit {
    /**
     * @description Polyfilled to enable text ReadableStream for React Native:
     * @link https://github.com/facebook/react-native/issues/27741#issuecomment-2362901032
     */
    reactNative?: {
      textStreaming: boolean;
    };
  }
}