"""Image types shared by the camera, pose detection and the on-screen dashboard."""

import numpy as np
from numpy.typing import NDArray

Frame = NDArray[np.uint8]
"""An 8-bit BGR image, height by width by 3, as OpenCV produces it."""
