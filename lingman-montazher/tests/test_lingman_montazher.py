import json
import sys
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

import lingman_montazher as montazher


class LingmanMontazherTests(unittest.TestCase):
    def test_default_preset_loads_director_thresholds(self):
        preset = montazher.load_preset(ROOT / "presets" / "default_director.json")

        self.assertEqual(preset.name, "lingman_director_default")
        self.assertAlmostEqual(preset.pause_cut_seconds, 0.75)
        self.assertAlmostEqual(preset.intentional_pause_max_seconds, 1.6)
        self.assertEqual(preset.min_take_words, 5)
        self.assertEqual(preset.text_position, "lower_third")
        self.assertGreaterEqual(preset.min_screen_text_duration, 1.2)


if __name__ == "__main__":
    unittest.main()
