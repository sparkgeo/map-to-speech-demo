import base64
import os
import random

from enum import Enum
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from io import BytesIO
from openai import OpenAI
from pydantic import BaseModel

OPENAI_API_KEY = os.environ["OPENAI_API_KEY"]
ALLOW_ORIGINS = os.environ["ALLOW_ORIGINS"]

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOW_ORIGINS.split(","),
    allow_credentials=True,
    allow_methods=["OPTIONS", "POST"],
    allow_headers=["*"],
)


class Voices(str, Enum):
    random = "random"
    alloy = "alloy"
    echo = "echo"
    fable = "fable"
    onyx = "onyx"
    nove = "nova"
    shimmer = "shimmer"


class MapParams(BaseModel):
    data_url: str
    speed: float = 1.0
    voice: Voices = "random"
    response_type: str = "audio"
    skip_openai: bool = False


@app.post("/description/")
async def post_description(request_params: MapParams):
    client = OpenAI(api_key=OPENAI_API_KEY)

    if not request_params.skip_openai:
        if request_params.voice == "random":
            request_params.voice = random.choice(list(Voices)[1:])

        text_response = client.chat.completions.create(
            model="gpt-4-vision-preview",
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": "Using no more than 100 words, tell me what is found in this area.",
                        },
                        {
                            "type": "image_url",
                            "image_url": {"url": request_params.data_url},
                        },
                    ],
                }
            ],
            max_tokens=200,
        )

        text_data = {"message": text_response.choices[0].message.content}

        if request_params.response_type == "text":
            audio_data = None
        if request_params.response_type == "audio":
            audio_response = client.audio.speech.create(
                model="tts-1",
                speed=request_params.speed,
                voice=request_params.voice,
                input=text_data["message"],
            )
            audio_data = base64.b64encode(audio_response.content).decode("utf-8")
    else:
        text_data = None
        audio_data = None

    response_content = {
        "text_data": text_data,
        "audio_data": audio_data,
    }
    return JSONResponse(content=response_content)
