"""Catalog of posture findings the rules can raise."""

from physio_assistant.domain.models import Finding

SHOULDER_HEIGHT = Finding(
    title="Shoulder height difference is visible",
    correction="Stand comfortably; avoid deliberately forcing one shoulder down.",
    exercise="Gentle shoulder rolls; ask a physiotherapist if this is persistent or painful.",
    caveat="Check camera is level and body faces camera.",
)

HIP_HEIGHT = Finding(
    title="Hip height difference is visible",
    correction="Stand naturally with weight shared comfortably across both feet.",
    exercise="Gentle supported weight shifts, only if comfortable and approved.",
    caveat="Check camera is level and feet are equally positioned.",
)

TRUNK_SHIFT = Finding(
    title="Possible sideways trunk shift",
    correction="Try standing comfortably without leaning to one side.",
    exercise="Gentle posture awareness and supported standing practice.",
    caveat="Make sure the camera is directly in front.",
)

KNEE_ALIGNMENT = Finding(
    title="Knee-to-ankle alignment needs a closer look",
    correction="During a bend, keep each knee generally tracking in the direction of its foot.",
    exercise="Supported mini-squat practice only if cleared and pain-free.",
    caveat="A front camera view can suggest alignment but cannot assess joint mechanics fully.",
)

HEAD_FORWARD = Finding(
    title="Head appears forward of shoulder line",
    correction="Gently bring your head back over your shoulders; keep your gaze level.",
    exercise="Gentle chin-tuck practice: 5 comfortable repetitions.",
    caveat="This is a 2-D visual estimate, not a diagnosis.",
)

TRUNK_INCLINE = Finding(
    title="Upper body appears inclined",
    correction="Find a comfortable upright position without forcing your back.",
    exercise="Gentle supported standing and relaxed breathing.",
    caveat="Camera angle and natural body shape can affect this estimate.",
)

KNEE_BENT = Finding(
    title="Knee is currently bent",
    correction=(
        "If you are standing for posture assessment, stand comfortably and avoid locking the knees."
    ),
    exercise="No corrective exercise is inferred from one still frame.",
    caveat="This may simply be a normal movement or stance.",
)
