import React, { createContext, useContext, useState } from "react";

type AudioPlayerContextProps = {
  currentlyPlayingId: string | null;
  setCurrentlyPlayingId: React.Dispatch<React.SetStateAction<string | null>>;
  currentlyLoadingId: string | null;
  setCurrentlyLoadingId: React.Dispatch<React.SetStateAction<string | null>>;
};

const AudioPlayerContext = createContext<AudioPlayerContextProps | undefined>(
  undefined
);

export const AudioPlayerProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [currentlyPlayingId, setCurrentlyPlayingId] = useState<string | null>(
    null
  );
  const [currentlyLoadingId, setCurrentlyLoadingId] = useState<string | null>(
    null
  );

  return (
    <AudioPlayerContext.Provider
      value={{
        currentlyPlayingId,
        setCurrentlyPlayingId,
        currentlyLoadingId,
        setCurrentlyLoadingId,
      }}
    >
      {children}
    </AudioPlayerContext.Provider>
  );
};

export const useAudioPlayerContext = () => {
  const context = useContext(AudioPlayerContext);
  if (!context) {
    throw new Error(
      "useAudioPlayerContext must be used within an AudioPlayerProvider"
    );
  }
  return context;
};
