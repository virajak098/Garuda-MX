from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import base64
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI(title="Garuda API")
api_router = APIRouter(prefix="/api")

logger = logging.getLogger("garuda")
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')


# ---------- Models ----------
class StatusCheck(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class StatusCheckCreate(BaseModel):
    client_name: str

class AIEditRequest(BaseModel):
    image_base64: str  # raw base64 (no data: prefix) OR data URL
    prompt: str = ""
    mode: Optional[str] = "edit"  # "edit" or "remove_bg"

class AIEditResponse(BaseModel):
    image_base64: str  # raw base64 PNG
    mime_type: str = "image/png"
    text: Optional[str] = None

class AIEnhanceRequest(BaseModel):
    image_base64: str
    mode: str = "auto"  # auto|hdr|sharpen|denoise|upscale|color_pop|lowlight

class AIFaceRetouchRequest(BaseModel):
    image_base64: str
    feature: str  # skin_natural|teeth_whiten|smile_lift|eye_enhance|face_reshape|skin_tone|blemish_remove
    intensity: int = 50  # 0-100
    params: Optional[dict] = None  # feature-specific: smooth/texture/glow for skin etc

class AIBackgroundBlurRequest(BaseModel):
    image_base64: str
    blur: int = 60        # 0-100
    smoothness: int = 60  # 0-100

class AIMagicEraseRequest(BaseModel):
    image_base64: str
    mask_base64: Optional[str] = None  # PNG mask, white = remove (same size as image)
    description: Optional[str] = None  # OR describe what to remove

class ProjectCreate(BaseModel):
    name: str
    image_base64: str  # data URL or raw base64
    thumbnail_base64: Optional[str] = None
    adjustments: Optional[dict] = None

class Project(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    image_base64: str
    thumbnail_base64: Optional[str] = None
    adjustments: Optional[dict] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ProjectSummary(BaseModel):
    id: str
    name: str
    thumbnail_base64: Optional[str] = None
    created_at: datetime
    updated_at: datetime


# ---------- Helpers ----------
def _strip_data_url(b64: str) -> str:
    if b64.startswith("data:"):
        return b64.split(",", 1)[1]
    return b64


# ---------- Routes ----------
@api_router.get("/")
async def root():
    return {"message": "Garuda API is flying.", "version": "1.0"}

@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_obj = StatusCheck(**input.model_dump())
    doc = status_obj.model_dump()
    doc['timestamp'] = doc['timestamp'].isoformat()
    await db.status_checks.insert_one(doc)
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    rows = await db.status_checks.find({}, {"_id": 0}).to_list(1000)
    for r in rows:
        if isinstance(r.get('timestamp'), str):
            r['timestamp'] = datetime.fromisoformat(r['timestamp'])
    return rows


# ---------- AI Editing via Gemini Nano Banana ----------
@api_router.post("/ai/edit", response_model=AIEditResponse)
async def ai_edit(req: AIEditRequest):
    """Edit an image using Gemini Nano Banana with a text prompt."""
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent
    except ImportError as e:
        raise HTTPException(status_code=500, detail=f"AI library not installed: {e}")

    api_key = os.getenv("EMERGENT_LLM_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="EMERGENT_LLM_KEY not configured")

    clean_b64 = _strip_data_url(req.image_base64)
    if not clean_b64:
        raise HTTPException(status_code=400, detail="image_base64 is empty")

    if req.mode == "remove_bg":
        prompt_text = (
            "Remove the background from this image completely. "
            "Replace the background with solid pure white (#FFFFFF). "
            "Keep the main subject perfectly intact, preserving its edges, hair, and details. "
            "Return only the edited image."
        )
    else:
        prompt_text = req.prompt or "Enhance this image — improve lighting, sharpness and colors."

    session_id = f"garuda-{uuid.uuid4().hex[:12]}"
    chat = LlmChat(api_key=api_key, session_id=session_id, system_message="You are Garuda, a precise image editing AI.")
    chat.with_model("gemini", "gemini-3.1-flash-image-preview").with_params(modalities=["image", "text"])

    msg = UserMessage(text=prompt_text, file_contents=[ImageContent(clean_b64)])

    try:
        text, images = await chat.send_message_multimodal_response(msg)
    except Exception as e:
        logger.error(f"Nano Banana error: {e}")
        raise HTTPException(status_code=502, detail=f"AI edit failed: {str(e)[:200]}")

    if not images:
        raise HTTPException(status_code=502, detail="AI returned no image. Try a different prompt.")

    first = images[0]
    return AIEditResponse(
        image_base64=first['data'],
        mime_type=first.get('mime_type', 'image/png'),
        text=text if isinstance(text, str) else None,
    )


# ---------- AI Helpers ----------
async def _run_nano_banana(prompt_text: str, image_b64: str, max_retries: int = 2) -> AIEditResponse:
    """Shared helper: calls Gemini Nano Banana with prompt + image, returns AIEditResponse.
    Retries with exponential backoff on transient failures."""
    import asyncio
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent
    except ImportError as e:
        raise HTTPException(status_code=500, detail=f"AI library not installed: {e}")

    api_key = os.getenv("EMERGENT_LLM_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="EMERGENT_LLM_KEY not configured")

    clean_b64 = _strip_data_url(image_b64)
    if not clean_b64:
        raise HTTPException(status_code=400, detail="image_base64 is empty")

    last_err = None
    for attempt in range(max_retries + 1):
        try:
            session_id = f"garuda-{uuid.uuid4().hex[:12]}"
            chat = LlmChat(
                api_key=api_key, session_id=session_id,
                system_message="You are Garuda, a precise photorealistic image editing AI. Always preserve subject identity and natural texture.",
            )
            chat.with_model("gemini", "gemini-3.1-flash-image-preview").with_params(modalities=["image", "text"])
            msg = UserMessage(text=prompt_text, file_contents=[ImageContent(clean_b64)])
            text, images = await chat.send_message_multimodal_response(msg)

            if not images:
                raise RuntimeError("Empty image response")

            first = images[0]
            return AIEditResponse(
                image_base64=first['data'],
                mime_type=first.get('mime_type', 'image/png'),
                text=text if isinstance(text, str) else None,
            )
        except Exception as e:
            last_err = e
            logger.warning(f"Nano Banana attempt {attempt + 1}/{max_retries + 1} failed: {e}")
            if attempt < max_retries:
                await asyncio.sleep(1.0 + attempt * 1.2)
                continue
            break

    raise HTTPException(status_code=502, detail=f"AI call failed after {max_retries + 1} attempts: {str(last_err)[:180]}")


def _intensity_word(val: int) -> str:
    if val <= 15: return "extremely subtle and barely perceptible"
    if val <= 35: return "subtle and natural"
    if val <= 60: return "moderate and natural-looking"
    if val <= 80: return "strong but still realistic"
    return "very strong and pronounced (still photorealistic, not cartoonish)"


# ---------- AI Enhance ----------
ENHANCE_PROMPTS = {
    "auto": (
        "Automatically enhance this photo professionally: improve exposure, white balance, "
        "contrast, dynamic range, subtle sharpness and natural color vibrancy. Preserve all "
        "original content, textures, and skin tones. No stylization. Return the enhanced image."
    ),
    "hdr": (
        "Apply a natural HDR enhancement: recover shadow details, tame highlights, increase "
        "local contrast and micro-detail. Keep colors realistic — do not oversaturate. "
        "Preserve the original composition exactly."
    ),
    "sharpen": (
        "Sharpen this image with professional clarity. Enhance fine details, edges and texture "
        "without introducing noise, halos or artifacts. Keep colors and composition identical."
    ),
    "denoise": (
        "Remove noise and grain from this photo while preserving fine texture and detail. "
        "Do not smooth out important features. Output should look clean but natural."
    ),
    "upscale": (
        "Upscale this image with AI super-resolution: produce sharper, cleaner detail at "
        "higher perceived resolution. Preserve composition, colors and subject identity."
    ),
    "color_pop": (
        "Give this photo a vibrant 'color pop' grade: rich but realistic saturation, slightly "
        "punchy contrast, cinematic color balance. Skin tones must remain natural. No cartoonishness."
    ),
    "lowlight": (
        "Fix this low-light photo: brighten shadows, recover detail, reduce noise, correct "
        "white balance. Image should look like it was shot in better light — natural, not HDR-flat."
    ),
}


@api_router.post("/ai/enhance", response_model=AIEditResponse)
async def ai_enhance(req: AIEnhanceRequest):
    prompt = ENHANCE_PROMPTS.get(req.mode, ENHANCE_PROMPTS["auto"])
    return await _run_nano_banana(prompt, req.image_base64)


# ---------- AI Face Retouch ----------
def _build_face_prompt(feature: str, intensity: int, params: Optional[dict]) -> str:
    params = params or {}
    strength = _intensity_word(intensity)
    pct = max(0, min(100, intensity))
    base = (
        "Retouch the face(s) in this photograph. Preserve the person's identity, "
        "bone structure, unique features, natural skin texture and pores. "
        "Absolutely no plastic, waxy, airbrushed or over-smoothed look. "
        "Keep the edit photorealistic. "
    )
    if feature == "skin_natural":
        smooth = params.get("smooth", pct)
        texture = params.get("texture", 70)
        glow = params.get("glow", 30)
        return base + (
            f"Apply natural skin retouching at {smooth}% smoothness. "
            f"Retain {texture}% of natural skin texture and pores (do NOT erase them). "
            f"Add {glow}% soft healthy glow. "
            f"Overall intensity: {strength}. Keep freckles and character marks unless they are blemishes."
        )
    if feature == "teeth_whiten":
        return base + (
            f"Whiten the teeth {strength}. Remove yellow/stain cast. Keep teeth shape and gums "
            "natural — do not make them glowing white or unrealistic."
        )
    if feature == "smile_lift":
        return base + (
            f"Slightly lift the corners of the mouth to produce a gentle, natural smile. "
            f"Intensity: {strength}. Do not distort the face or change identity."
        )
    if feature == "eye_enhance":
        brightness = params.get("brightness", pct)
        sharpness = params.get("sharpness", pct)
        color = params.get("color", "")
        col = f" Subtly shift iris color toward {color}." if color else ""
        return base + (
            f"Enhance the eyes: increase eye brightness by {brightness}%, sharpen iris and "
            f"catchlights by {sharpness}%.{col} Keep eyes realistic — no glowing anime look."
        )
    if feature == "face_reshape":
        jaw = params.get("jawline", 0)
        face = params.get("face_slim", 0)
        nose = params.get("nose", 0)
        chin = params.get("chin", 0)
        return base + (
            f"Very subtly reshape the face: jawline contour {jaw}% slimmer, face width {face}% "
            f"slimmer, nose refinement {nose}%, chin adjustment {chin}%. "
            "All adjustments must be extremely subtle and photorealistic — the person must still "
            "clearly look like themselves. No caricature, no meme-like distortion."
        )
    if feature == "skin_tone":
        return base + (
            f"Even out the skin tone {strength}: reduce redness, dark patches and uneven pigmentation. "
            "Preserve ethnicity and natural undertone. Do NOT lighten or change the person's complexion."
        )
    if feature == "blemish_remove":
        return base + (
            "Remove pimples, acne, temporary blemishes, and stray dust/flyaway hairs. "
            "Keep permanent features (freckles, moles, beauty marks, scars) exactly as they are."
        )
    return base + f"Perform the requested face retouch ({feature}) at {strength} intensity."


@api_router.post("/ai/face-retouch", response_model=AIEditResponse)
async def ai_face_retouch(req: AIFaceRetouchRequest):
    prompt = _build_face_prompt(req.feature, req.intensity, req.params)
    return await _run_nano_banana(prompt, req.image_base64)


# ---------- AI Background Blur ----------
@api_router.post("/ai/background-blur", response_model=AIEditResponse)
async def ai_background_blur(req: AIBackgroundBlurRequest):
    blur = max(0, min(100, req.blur))
    smooth = max(0, min(100, req.smoothness))
    # Map 0-100 blur to descriptive strength for the prompt
    if blur <= 20:
        strength_desc = "very light, just a hint of depth of field (f/5.6-equivalent)"
    elif blur <= 45:
        strength_desc = "moderate background blur (f/2.8-equivalent), subject clearly pops"
    elif blur <= 70:
        strength_desc = "strong creamy bokeh (f/1.8-equivalent), clearly out-of-focus background"
    else:
        strength_desc = "extreme, heavy bokeh (f/1.2-equivalent portrait mode), background dissolved into soft blur"

    prompt = (
        "Apply professional portrait-mode depth-of-field blur to this photograph. "
        "STEP 1: Precisely detect the main subject(s) — person, object, animal — including fine details like hair strands, fur, jewelry and fabric edges. "
        "STEP 2: Keep the subject tack-sharp, in perfect focus, with all original detail, colors and lighting preserved. "
        f"STEP 3: Blur the background heavily. Strength: {strength_desc}. "
        f"STEP 4: Feather the subject-to-background transition smoothly (smoothness ~{smooth}%) so edges look natural, not cut-out. No halo, no double-edges, no artifacts. "
        "STEP 5: Preserve the original lighting direction, color grade and overall composition. "
        "The final image must look exactly like a DSLR portrait shot — professional, photorealistic shallow depth of field. "
        "IMPORTANT: The effect MUST be visible and strong; do NOT return an unmodified image."
    )
    return await _run_nano_banana(prompt, req.image_base64)


# ---------- AI Magic Eraser (object remove + inpaint) ----------
def _composite_mask_highlight(image_b64: str, mask_b64: str) -> str:
    """Overlay the mask on the image as bright magenta highlighting — AI reads this as
    'target area to remove'. Returns base64 PNG of composited image."""
    from PIL import Image
    import io as _io
    img_bytes = base64.b64decode(_strip_data_url(image_b64))
    mask_bytes = base64.b64decode(_strip_data_url(mask_b64))
    img = Image.open(_io.BytesIO(img_bytes)).convert("RGBA")
    mask = Image.open(_io.BytesIO(mask_bytes)).convert("L")
    if mask.size != img.size:
        mask = mask.resize(img.size)
    overlay = Image.new("RGBA", img.size, (255, 0, 255, 0))
    magenta = Image.new("RGBA", img.size, (255, 0, 255, 210))
    overlay.paste(magenta, (0, 0), mask)
    composited = Image.alpha_composite(img, overlay)
    buf = _io.BytesIO()
    composited.convert("RGB").save(buf, format="PNG")
    return base64.b64encode(buf.getvalue()).decode("utf-8")


@api_router.post("/ai/magic-erase", response_model=AIEditResponse)
async def ai_magic_erase(req: AIMagicEraseRequest):
    if not req.mask_base64 and not req.description:
        raise HTTPException(status_code=400, detail="Provide either mask_base64 or description")

    if req.mask_base64:
        try:
            composite = _composite_mask_highlight(req.image_base64, req.mask_base64)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Mask processing failed: {e}")
        prompt = (
            "The image contains bright magenta/pink highlighted regions marking unwanted objects. "
            "Completely remove everything inside the magenta areas and seamlessly inpaint the "
            "background using surrounding pixels, matching texture, lighting, shadows and perspective. "
            "Output a photorealistic image with NO magenta, NO visible patches or seams, "
            "NO trace of the removed objects. Everything outside the highlighted areas must be preserved exactly."
        )
        return await _run_nano_banana(prompt, composite)

    # description-only path
    prompt = (
        f"Remove the following from this photograph: {req.description}. "
        "Carefully inpaint the background using surrounding context — match textures, lighting, "
        "colors, shadows and perspective. The result must look completely natural with no visible "
        "patch, no artifacts, and no trace that the object was ever there. Preserve everything else "
        "in the image exactly."
    )
    return await _run_nano_banana(prompt, req.image_base64)


# ---------- Projects CRUD ----------
@api_router.post("/projects", response_model=Project)
async def create_project(input: ProjectCreate):
    proj = Project(**input.model_dump())
    doc = proj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    await db.projects.insert_one(doc)
    return proj

@api_router.get("/projects", response_model=List[ProjectSummary])
async def list_projects():
    rows = await db.projects.find(
        {},
        {"_id": 0, "id": 1, "name": 1, "thumbnail_base64": 1, "created_at": 1, "updated_at": 1}
    ).sort("updated_at", -1).to_list(200)
    for r in rows:
        for k in ('created_at', 'updated_at'):
            if isinstance(r.get(k), str):
                r[k] = datetime.fromisoformat(r[k])
    return rows

@api_router.get("/projects/{project_id}", response_model=Project)
async def get_project(project_id: str):
    row = await db.projects.find_one({"id": project_id}, {"_id": 0})
    if not row:
        raise HTTPException(status_code=404, detail="Project not found")
    for k in ('created_at', 'updated_at'):
        if isinstance(row.get(k), str):
            row[k] = datetime.fromisoformat(row[k])
    return row

@api_router.delete("/projects/{project_id}")
async def delete_project(project_id: str):
    res = await db.projects.delete_one({"id": project_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Project not found")
    return {"ok": True, "deleted": project_id}


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
