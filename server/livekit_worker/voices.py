from pydantic import BaseModel


class VoiceSettings(BaseModel):
    model: str
    voice_id: str
    stability: float
    similarity: float
    exaggeration: float
    speaker_boost: bool
    style: float


multilingual = "eleven_multilingual_v2"
turbo = "eleven_turbo_v2_5"

CharlotteSettings = VoiceSettings(
    model=turbo,
    voice_id="XB0fDUnXU5powFXDhCwa",
    stability=0.5,
    similarity=0.75,
    speaker_boost=True,
    style=0.0,
)

AmeliaSettings = VoiceSettings(
    model=turbo,
    voice_id="ZF6FPAbjXT4488VcRRnw",
    stability=0.5,
    similarity=0.75,
    speaker_boost=False,
    style=0.0,
)

DakotaSettings = VoiceSettings(
    model=turbo,
    voice_id="P7x743VjyZEOihNNygQ9",
    stability=0.5,
    similarity=0.75,
    speaker_boost=False,
    style=0.0,
)

MarkSettings = VoiceSettings(
    model=turbo,
    voice_id="UgBBYS2sOqTuMpoF3BR0",
    stability=0.5,
    similarity=0.75,
    speaker_boost=True,
    style=0.0,
)

ArcherSettings = VoiceSettings(
    model=turbo,
    voice_id="L0Dsvb3SLTyegXwtm47J",
    stability=0.5,
    similarity=0.75,
    speaker_boost=False,
    style=0.0,
)

PaulSettings = VoiceSettings(
    model=turbo,
    voice_id="WLKp2jV6nrS8aMkPPDRO",
    stability=0.5,
    similarity=0.75,
    speaker_boost=False,
    style=0.0,
)

VoiceSettingMapping = {
    "voice_1": MarkSettings,
    "voice_2": AmeliaSettings,
    "voice_3": ArcherSettings,
    "voice_4": CharlotteSettings,
    "voice_5": PaulSettings,
    "voice_6": DakotaSettings,
}
